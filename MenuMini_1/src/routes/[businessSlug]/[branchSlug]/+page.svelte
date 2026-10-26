<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { miniStore, type MiniDish } from '$lib/services/miniStore';
  import { indexedDbService, type DiningSession, type PersistentCartItem } from '$lib/services/indexedDbStore';
  import { miniNotificationService, type MiniOrderNotification } from '$lib/services/miniNotificationService';
  import { soundFX, addToast } from '$lib/audio/feedback';
  import { MINI_MENU_TEMPLATES, type MiniMenuTemplate } from '$lib/types/miniTemplates';
  import MenuCatalog from '$lib/menu/MenuCatalog.svelte';
  import DishDetails from '$lib/menu/DishDetails.svelte';
  import { prototypeCatalogView } from '$lib/menu/catalog-view';

  // URL route parameters
  $: businessSlug = $page.params.businessSlug || 'menu';
  $: branchSlug = $page.params.branchSlug || 'table-1';
  
  // Table detection from query param ?table=X or fallback to URL slug
  let tableNumber = '1';
  $: {
    const qTable = $page.url.searchParams.get('table');
    if (qTable) {
      tableNumber = qTable;
    } else if (branchSlug.startsWith('table-')) {
      tableNumber = branchSlug.replace('table-', '');
    } else {
      tableNumber = '1';
    }
  }

  // Reactive store bindings
  const { venue: venueStore, sections: sectionsStore, dishes: dishesStore } = miniStore;
  $: venue = $venueStore;
  $: sections = $sectionsStore;
  $: allDishes = $dishesStore;

  // Active theme calculation
  let activeTemplate: MiniMenuTemplate;
  $: {
    const templateOverride = $page.url.searchParams.get('template');
    const targetId = templateOverride || venue.activeTemplateId;
    activeTemplate = MINI_MENU_TEMPLATES.find(t => t.id === targetId) || MINI_MENU_TEMPLATES[1];
  }

  $: catalog = prototypeCatalogView(venue, sections, allDishes, activeTemplate, tableNumber);
  $: quantities = Object.fromEntries(allDishes.map(dish => [dish.id, cart.find(item => item.id === dish.id)?.quantity || 0]));
  $: customizerView = catalog.dishes.find(dish => dish.id === customizerDish?.id);

  // Cart & IndexedDB Session Management
  let cart: PersistentCartItem[] = [];
  let customerNote: string = '';
  let sessionKey: string = '';
  let isSessionLoaded = false;

  $: sessionKey = `${businessSlug}_${branchSlug}_${tableNumber}`;

  onMount(async () => {
    try {
      const savedSession = await indexedDbService.loadSession(sessionKey);
      if (savedSession && savedSession.cart && savedSession.cart.length > 0) {
        cart = savedSession.cart;
        customerNote = savedSession.customerNote || '';
        addToast({
          type: 'info',
          title: 'Session Restored',
          message: `Restored ${cart.length} item(s) in your dining session.`
        });
      }
    } catch (e) {
      console.warn('Could not load session from IndexedDB:', e);
    } finally {
      isSessionLoaded = true;
    }
  });

  // Save session reactively when cart or customerNote changes
  $: if (isSessionLoaded) {
    const sessionData: DiningSession = {
      businessSlug,
      branchSlug,
      tableNumber,
      cart,
      customerNote,
      lastUpdated: Date.now()
    };
    indexedDbService.saveSession(sessionKey, sessionData);
  }

  // Cart helper calculations
  $: cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  $: cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  $: cartTotal = cartSubtotal;

  function addToCart(dish: MiniDish, instructions: string = '') {
    soundFX.playPop();
    const existing = cart.find(c => c.id === dish.id && c.specialInstructions === instructions);
    if (existing) {
      cart = cart.map(c => c === existing ? { ...c, quantity: c.quantity + 1 } : c);
    } else {
      cart = [...cart, {
        id: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
        specialInstructions: instructions
      }];
    }
    addToast({
      type: 'success',
      title: 'Added to Order',
      message: `${dish.name} added.`
    });
  }

  function updateQuantity(item: PersistentCartItem, delta: number) {
    soundFX.playTap();
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      cart = cart.filter(c => c !== item);
    } else {
      cart = cart.map(c => c === item ? { ...c, quantity: newQty } : c);
    }
  }

  function removeFromCart(item: PersistentCartItem) {
    soundFX.playTap();
    cart = cart.filter(c => c !== item);
  }

  // Modals state
  let isCustomizerOpen = false;
  let customizerDish: MiniDish | null = null;
  let customizerInstructions = '';
  let customizerQty = 1;

  function openDishDetails(dish: MiniDish) {
    soundFX.playTap();
    customizerDish = dish;
    customizerInstructions = '';
    customizerQty = 1;
    isCustomizerOpen = true;
  }

  function submitCustomizer() {
    if (!customizerDish) return;
    soundFX.playPop();
    for (let i = 0; i < customizerQty; i++) {
      addToCart(customizerDish, customizerInstructions);
    }
    isCustomizerOpen = false;
  }

  // Cart Drawer & Checkout Sheet
  let isCartDrawerOpen = false;
  let isCheckoutOpen = false;
  let selectedPaymentMethod: 'telebirr' | 'cbe_birr' | 'awash_birr' | 'cash' = 'telebirr';
  let transactionReference: string = '';
  let orderPlacedSuccess: MiniOrderNotification | null = null;

  function proceedToCheckout() {
    if (cart.length === 0) return;
    soundFX.playSuccess();
    isCartDrawerOpen = false;
    isCheckoutOpen = true;
  }

  function copyToClipboard(text: string, label: string) {
    soundFX.playTap();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      addToast({
        type: 'success',
        title: 'Copied!',
        message: `${label} copied to clipboard.`
      });
    }
  }

  function buildOrderNotification(): MiniOrderNotification {
    return {
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      tableNumber,
      businessName: venue.name,
      items: cart.map(c => ({
        name: c.name,
        quantity: c.quantity,
        price: c.price,
        options: c.specialInstructions
      })),
      subtotal: cartSubtotal,
      total: cartTotal,
      currency: venue.currency,
      paymentMethod: selectedPaymentMethod.toUpperCase().replace('_', ' '),
      customerNote,
      timestamp: new Date().toISOString()
    };
  }

  function handleSendWhatsApp() {
    const order = buildOrderNotification();
    soundFX.playSuccess();
    const link = miniNotificationService.createWhatsAppLink(venue.phone, order);
    window.open(link, '_blank');
    finalizeOrder(order);
  }

  async function handleDirectConfirm() {
    const order = buildOrderNotification();
    soundFX.playSuccess();
    finalizeOrder(order);
  }

  async function finalizeOrder(order: MiniOrderNotification) {
    orderPlacedSuccess = order;
    isCheckoutOpen = false;
    cart = [];
    customerNote = '';
    await indexedDbService.clearSession(sessionKey);
    addToast({
      type: 'success',
      title: 'Order Placed!',
      message: `Your order #${order.orderId.slice(-6)} was received.`
    });
  }

  function resetNewOrder() {
    orderPlacedSuccess = null;
    soundFX.playTap();
  }
</script>

<svelte:head>
  <title>{venue.name} | Table {tableNumber} | MenuMini</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<MenuCatalog {catalog} {quantities}
  onCategoryChange={() => soundFX.playTap()}
  onDetails={(dish) => {
    const original = allDishes.find(value => value.id === dish.id);
    if (original) openDishDetails(original);
  }}
  orderActions={{
    add: (id) => { const dish = allDishes.find(value => value.id === id); if (dish) addToCart(dish); },
    decrease: (id) => { const item = cart.find(value => value.id === id); if (item) updateQuantity(item, -1); }
  }}
>
  <!-- STICKY FLOATING CART BAR -->
  {#if cartCount > 0}
    <footer class="cart-floating-dock">
      <div class="dock-inner">
        <div class="dock-meta" on:click={() => { soundFX.playTap(); isCartDrawerOpen = true; }}>
          <div class="dock-badge">
            <span>🛒</span>
            <span class="dock-counter">{cartCount}</span>
          </div>
          <div>
            <div class="dock-lbl">Table {tableNumber} Order</div>
            <div class="dock-total">{cartTotal.toFixed(2)} {venue.currency}</div>
          </div>
        </div>

        <button class="dock-cta" on:click={() => { soundFX.playTap(); isCartDrawerOpen = true; }}>
          View Order & Pay →
        </button>
      </div>
    </footer>
  {/if}

  <!-- The same item-detail presentation is used by published menus. -->
  {#if isCustomizerOpen && customizerDish && customizerView}
    <DishDetails dish={customizerView} onClose={() => isCustomizerOpen = false}>
      <label class="custom-lbl">
        Special Instructions / ለየት ያለ ትእዛዝ (Optional):
        <input type="text" bind:value={customizerInstructions} placeholder="e.g. No sugar, extra spicy, hot water..." class="custom-input" />
      </label>
      <div class="modal-qty-row">
        <span>Quantity:</span>
        <div class="qty-stepper">
          <button type="button" class="stepper-btn" aria-label="Decrease quantity" on:click={() => { if (customizerQty > 1) customizerQty--; }}>–</button>
          <span class="stepper-val">{customizerQty}</span>
          <button type="button" class="stepper-btn" aria-label="Increase quantity" on:click={() => customizerQty++}>+</button>
        </div>
      </div>
      <svelte:fragment slot="footer">
        <button type="button" class="btn-cancel" on:click={() => isCustomizerOpen = false}>Cancel</button>
        <button type="button" class="btn-confirm" disabled={!customizerDish.isAvailable} on:click={submitCustomizer}>
          Add {(customizerDish.price * customizerQty).toFixed(2)} {customizerDish.currency}
        </button>
      </svelte:fragment>
    </DishDetails>
  {/if}

  <!-- CART DRAWER / ORDER REVIEW -->
  {#if isCartDrawerOpen}
    <div class="drawer-backdrop" on:click|self={() => isCartDrawerOpen = false}>
      <div class="drawer-sheet">
        <div class="drawer-header">
          <div>
            <h3>Your Order Review</h3>
            <p class="drawer-sub">Table #{tableNumber} • {cartCount} items</p>
          </div>
          <button class="drawer-close" on:click={() => isCartDrawerOpen = false}>✕</button>
        </div>

        <div class="drawer-items-list">
          {#each cart as item}
            <div class="cart-row">
              <div class="cart-row-info">
                <strong class="cart-row-title">{item.name}</strong>
                {#if item.specialInstructions}
                  <p class="cart-row-note">📝 {item.specialInstructions}</p>
                {/if}
                <div class="cart-row-price">{(item.price * item.quantity).toFixed(2)} {venue.currency}</div>
              </div>
              <div class="cart-row-controls">
                <div class="qty-stepper compact">
                  <button class="stepper-btn" on:click={() => updateQuantity(item, -1)}>–</button>
                  <span class="stepper-val">{item.quantity}</span>
                  <button class="stepper-btn" on:click={() => updateQuantity(item, 1)}>+</button>
                </div>
                <button class="btn-del" on:click={() => removeFromCart(item)}>🗑️</button>
              </div>
            </div>
          {/each}
        </div>

        <div class="drawer-note-section">
          <label class="custom-lbl">
            Order Note for Kitchen/Barista:
            <input 
              type="text" 
              bind:value={customerNote} 
              placeholder="e.g. Please bring water first..." 
              class="custom-input"
            />
          </label>
        </div>

        <div class="drawer-summary">
          <div class="sum-line">
            <span>Subtotal</span>
            <span>{cartSubtotal.toFixed(2)} {venue.currency}</span>
          </div>
          <div class="sum-line">
            <span>Service & Platform Fee</span>
            <span class="free-tag">0.00 ETB (Free)</span>
          </div>
          <div class="sum-line total">
            <strong>Total Amount</strong>
            <strong>{cartTotal.toFixed(2)} {venue.currency}</strong>
          </div>
        </div>

        <div class="drawer-actions">
          <button class="btn-checkout" on:click={proceedToCheckout}>
            Proceed to Payment & Confirmation →
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ZERO-COMMISSION ETHIOPIAN PAYMENT HUB SHEET -->
  {#if isCheckoutOpen}
    <div class="drawer-backdrop" on:click|self={() => isCheckoutOpen = false}>
      <div class="drawer-sheet payment-sheet">
        <div class="drawer-header">
          <div>
            <h3>Ethiopian Payment Hub</h3>
            <p class="drawer-sub">Direct 0% Commission Payment</p>
          </div>
          <button class="drawer-close" on:click={() => isCheckoutOpen = false}>✕</button>
        </div>

        <!-- PAYMENT METHOD SELECTOR -->
        <div class="payment-tabs">
          <button 
            class="pay-tab" 
            class:active={selectedPaymentMethod === 'telebirr'}
            on:click={() => { soundFX.playTap(); selectedPaymentMethod = 'telebirr'; }}
          >
            <span class="pay-icon">📱</span> telebirr
          </button>
          <button 
            class="pay-tab" 
            class:active={selectedPaymentMethod === 'cbe_birr'}
            on:click={() => { soundFX.playTap(); selectedPaymentMethod = 'cbe_birr'; }}
          >
            <span class="pay-icon">🏦</span> CBE Birr
          </button>
          <button 
            class="pay-tab" 
            class:active={selectedPaymentMethod === 'awash_birr'}
            on:click={() => { soundFX.playTap(); selectedPaymentMethod = 'awash_birr'; }}
          >
            <span class="pay-icon">🦅</span> Awash Birr
          </button>
          <button 
            class="pay-tab" 
            class:active={selectedPaymentMethod === 'cash'}
            on:click={() => { soundFX.playTap(); selectedPaymentMethod = 'cash'; }}
          >
            <span class="pay-icon">💵</span> Cash
          </button>
        </div>

        <!-- PAYMENT DETAILS DISPLAY -->
        <div class="payment-card-body">
          {#if selectedPaymentMethod === 'telebirr'}
            <div class="bank-card telebirr-card">
              <div class="bank-top">
                <span class="bank-name">telebirr Direct Transfer</span>
                <span class="bank-pill">Instant</span>
              </div>
              <div class="bank-number-box">
                <span class="num-lbl">Merchant / Account Number:</span>
                <div class="num-row">
                  <span class="num-code">{venue.paymentAccounts.telebirr.number}</span>
                  <button 
                    class="btn-copy" 
                    on:click={() => copyToClipboard(venue.paymentAccounts.telebirr.number, 'telebirr number')}
                  >Copy</button>
                </div>
              </div>
              <p class="bank-owner">Till / Account Name: <strong>{venue.paymentAccounts.telebirr.tillName}</strong></p>
              <div class="instruction-box">
                Open telebirr App → Send Money / Pay Merchant → Enter <strong>{cartTotal.toFixed(2)} ETB</strong>.
              </div>
            </div>
          {:else if selectedPaymentMethod === 'cbe_birr'}
            <div class="bank-card cbe-card">
              <div class="bank-top">
                <span class="bank-name">Commercial Bank of Ethiopia (CBE)</span>
                <span class="bank-pill">Verified</span>
              </div>
              <div class="bank-number-box">
                <span class="num-lbl">CBE Account Number:</span>
                <div class="num-row">
                  <span class="num-code">{venue.paymentAccounts.cbeBirr.accountNumber}</span>
                  <button 
                    class="btn-copy" 
                    on:click={() => copyToClipboard(venue.paymentAccounts.cbeBirr.accountNumber, 'CBE account')}
                  >Copy</button>
                </div>
              </div>
              <p class="bank-owner">Account Name: <strong>{venue.paymentAccounts.cbeBirr.holderName}</strong></p>
              <div class="instruction-box">
                Open CBE Mobile Banking / CBE Birr → Transfer <strong>{cartTotal.toFixed(2)} ETB</strong>.
              </div>
            </div>
          {:else if selectedPaymentMethod === 'awash_birr'}
            <div class="bank-card awash-card">
              <div class="bank-top">
                <span class="bank-name">Awash Bank / Awash Birr</span>
                <span class="bank-pill">Direct</span>
              </div>
              <div class="bank-number-box">
                <span class="num-lbl">Awash Account Number:</span>
                <div class="num-row">
                  <span class="num-code">{venue.paymentAccounts.awashBirr.accountNumber}</span>
                  <button 
                    class="btn-copy" 
                    on:click={() => copyToClipboard(venue.paymentAccounts.awashBirr.accountNumber, 'Awash account')}
                  >Copy</button>
                </div>
              </div>
              <p class="bank-owner">Account Name: <strong>{venue.paymentAccounts.awashBirr.holderName}</strong></p>
              <div class="instruction-box">
                Open Awash Birr App → Transfer <strong>{cartTotal.toFixed(2)} ETB</strong>.
              </div>
            </div>
          {:else}
            <div class="bank-card cash-card">
              <div class="bank-top">
                <span class="bank-name">Cash On Delivery</span>
                <span class="bank-pill">Table #{tableNumber}</span>
              </div>
              <p class="cash-desc">
                Your waiter will bring the paper receipt to your table. You can pay cash directly upon order arrival.
              </p>
              <div class="cash-total-box">
                Exact Total to Pay: <strong>{cartTotal.toFixed(2)} {venue.currency}</strong>
              </div>
            </div>
          {/if}

          <!-- OPTIONAL TX REFERENCE INPUT -->
          {#if selectedPaymentMethod !== 'cash'}
            <label class="custom-lbl mt-3">
              Transfer Reference / Transaction ID (Optional):
              <input 
                type="text" 
                bind:value={transactionReference} 
                placeholder="e.g. TXN-84729184" 
                class="custom-input"
              />
            </label>
          {/if}
        </div>

        <!-- DUAL CONFIRMATION BUTTONS -->
        <div class="checkout-footer-buttons">
          <button class="btn-whatsapp" on:click={handleSendWhatsApp}>
            <span>💬 Send via WhatsApp</span>
            <small>Dispatch to {venue.phone}</small>
          </button>

          <button class="btn-direct-confirm" on:click={handleDirectConfirm}>
            <span>⚡ Place Order Directly</span>
            <small>Instant Table #{tableNumber} Ticket</small>
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ORDER SUCCESS CELEBRATION MODAL -->
  {#if orderPlacedSuccess}
    <div class="modal-backdrop">
      <div class="modal-card success-card">
        <div class="success-icon-bubble">🎉</div>
        <h2>Order Received!</h2>
        <p class="success-sub">Order #{orderPlacedSuccess.orderId.slice(-6)} has been dispatched.</p>

        <div class="success-ticket">
          <div class="ticket-row">
            <span>Table</span>
            <strong>#{orderPlacedSuccess.tableNumber}</strong>
          </div>
          <div class="ticket-row">
            <span>Payment</span>
            <strong>{orderPlacedSuccess.paymentMethod}</strong>
          </div>
          <div class="ticket-row">
            <span>Total Amount</span>
            <strong>{orderPlacedSuccess.total.toFixed(2)} {orderPlacedSuccess.currency}</strong>
          </div>
          <div class="ticket-items">
            {#each orderPlacedSuccess.items as it}
              <div class="ticket-item-line">
                <span>{it.quantity}x {it.name}</span>
                <span>{(it.price * it.quantity).toFixed(2)}</span>
              </div>
            {/each}
          </div>
        </div>

        <p class="prep-note">Our kitchen & baristas are preparing your items fresh. Thank you!</p>

        <button class="btn-done" on:click={resetNewOrder}>
          Back to Menu / አዲስ ትእዛዝ
        </button>
      </div>
    </div>
  {/if}
</MenuCatalog>

<style>
  .qty-stepper {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 2px 4px;
    gap: 0.5rem;
  }

  .qty-stepper.compact {
    padding: 1px 3px;
  }

  .stepper-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-primary);
    color: #000000;
    border: none;
    font-weight: 800;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stepper-val {
    font-weight: 800;
    font-size: 0.95rem;
    min-width: 20px;
    text-align: center;
    color: #FFFFFF;
  }

  /* FLOATING CART DOCK */
  .cart-floating-dock {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0.75rem 1rem 1.25rem;
    background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.98) 100%);
    z-index: 50;
  }

  .dock-inner {
    max-width: 600px;
    margin: 0 auto;
    background: var(--color-primary);
    color: #000000;
    border-radius: 16px;
    padding: 0.75rem 1.1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  }

  .dock-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .dock-badge {
    position: relative;
    font-size: 1.4rem;
  }

  .dock-counter {
    position: absolute;
    top: -6px;
    right: -8px;
    background: #000000;
    color: #FFFFFF;
    font-size: 0.65rem;
    font-weight: 900;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dock-lbl {
    font-size: 0.75rem;
    font-weight: 700;
    opacity: 0.8;
  }

  .dock-total {
    font-size: 1.1rem;
    font-weight: 900;
  }

  .dock-cta {
    background: #000000;
    color: #FFFFFF;
    border: none;
    font-size: 0.88rem;
    font-weight: 700;
    padding: 0.55rem 1rem;
    border-radius: 10px;
    cursor: pointer;
  }

  /* MODALS & BOTTOM SHEETS */
  .modal-backdrop, .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .drawer-backdrop {
    align-items: flex-end;
    padding: 0;
  }

  .modal-card {
    background: #181B26;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    width: 100%;
    max-width: 440px;
    padding: 1.25rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  }

  .drawer-sheet {
    background: #181B26;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 1.25rem;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.7);
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .drawer-close {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: #CBD5E1;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .drawer-sub {
    font-size: 0.8rem;
    color: #94A3B8;
    margin: 0.2rem 0 0;
  }

  .custom-lbl {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: #CBD5E1;
    margin-bottom: 0.85rem;
  }

  .custom-input {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #FFFFFF;
    padding: 0.6rem 0.85rem;
    font-size: 0.88rem;
    outline: none;
  }

  .custom-input:focus {
    border-color: var(--color-primary);
  }

  .modal-qty-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1rem 0;
    color: #CBD5E1;
    font-size: 0.9rem;
  }

  .btn-cancel {
    flex: 1;
    background: rgba(255, 255, 255, 0.06);
    border: none;
    color: #CBD5E1;
    padding: 0.7rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-confirm {
    flex: 2;
    background: var(--color-primary);
    color: #000000;
    border: none;
    padding: 0.7rem;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
  }

  /* CART DRAWER ROWS */
  .drawer-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .cart-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.04);
    padding: 0.75rem;
    border-radius: 10px;
    gap: 0.5rem;
  }

  .cart-row-title {
    font-size: 0.9rem;
    color: #FFFFFF;
  }

  .cart-row-note {
    font-size: 0.75rem;
    color: #F59E0B;
    margin: 0.15rem 0;
  }

  .cart-row-price {
    font-size: 0.85rem;
    font-weight: 700;
    color: #94A3B8;
  }

  .cart-row-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-del {
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    opacity: 0.7;
  }

  .drawer-summary {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
  }

  .sum-line {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #94A3B8;
    margin-bottom: 0.4rem;
  }

  .sum-line.total {
    font-size: 1.05rem;
    color: #FFFFFF;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .free-tag {
    color: #10B981;
    font-weight: 700;
  }

  .btn-checkout {
    width: 100%;
    background: var(--color-primary);
    color: #000000;
    border: none;
    font-size: 1rem;
    font-weight: 800;
    padding: 0.85rem;
    border-radius: 12px;
    cursor: pointer;
  }

  /* PAYMENT SHEET */
  .payment-tabs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .pay-tab {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94A3B8;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.6rem 0.3rem;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .pay-tab.active {
    background: rgba(255, 255, 255, 0.15);
    color: #FFFFFF;
    border-color: var(--color-primary);
  }

  .bank-card {
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1rem;
  }

  .telebirr-card {
    background: linear-gradient(135deg, #005CB9 0%, #00366E 100%);
    color: #FFFFFF;
  }

  .cbe-card {
    background: linear-gradient(135deg, #581845 0%, #300824 100%);
    color: #FFFFFF;
  }

  .awash-card {
    background: linear-gradient(135deg, #0054A6 0%, #F7931E 180%);
    color: #FFFFFF;
  }

  .cash-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #FFFFFF;
  }

  .bank-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .bank-name {
    font-size: 0.9rem;
    font-weight: 700;
  }

  .bank-pill {
    background: rgba(255, 255, 255, 0.2);
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: 800;
  }

  .bank-number-box {
    background: rgba(0, 0, 0, 0.25);
    padding: 0.65rem 0.85rem;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .num-lbl {
    font-size: 0.7rem;
    opacity: 0.8;
    display: block;
  }

  .num-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.2rem;
  }

  .num-code {
    font-size: 1.15rem;
    font-family: monospace;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  .btn-copy {
    background: #FFFFFF;
    color: #000000;
    border: none;
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .bank-owner {
    font-size: 0.8rem;
    margin: 0.3rem 0 0.6rem;
    opacity: 0.9;
  }

  .instruction-box {
    font-size: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    line-height: 1.4;
  }

  .cash-desc {
    font-size: 0.85rem;
    color: #CBD5E1;
    line-height: 1.4;
  }

  .cash-total-box {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.65rem;
    border-radius: 8px;
    font-size: 0.95rem;
    margin-top: 0.5rem;
  }

  .checkout-footer-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .btn-whatsapp {
    background: #25D366;
    color: #000000;
    border: none;
    padding: 0.85rem;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-weight: 800;
    font-size: 0.95rem;
  }

  .btn-whatsapp small {
    font-size: 0.75rem;
    opacity: 0.85;
    font-weight: 600;
  }

  .btn-direct-confirm {
    background: var(--color-primary);
    color: #000000;
    border: none;
    padding: 0.85rem;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-weight: 800;
    font-size: 0.95rem;
  }

  .btn-direct-confirm small {
    font-size: 0.75rem;
    opacity: 0.85;
    font-weight: 600;
  }

  /* ORDER SUCCESS MODAL */
  .success-card {
    text-align: center;
    padding: 1.75rem 1.25rem;
  }

  .success-icon-bubble {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .success-card h2 {
    font-size: 1.4rem;
    margin: 0;
    color: #FFFFFF;
  }

  .success-sub {
    font-size: 0.85rem;
    color: #94A3B8;
    margin: 0.3rem 0 1.25rem;
  }

  .success-ticket {
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 1rem;
    text-align: left;
    margin-bottom: 1rem;
  }

  .ticket-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.88rem;
    margin-bottom: 0.4rem;
  }

  .ticket-items {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin-top: 0.6rem;
    padding-top: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .ticket-item-line {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #94A3B8;
  }

  .prep-note {
    font-size: 0.82rem;
    color: #CBD5E1;
    margin-bottom: 1.25rem;
  }

  .btn-done {
    width: 100%;
    background: var(--color-primary);
    color: #000000;
    border: none;
    padding: 0.85rem;
    border-radius: 10px;
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
  }


  .modal-qty-row .stepper-btn { width:44px; height:44px; }
  .btn-cancel, .btn-confirm { min-height:44px; }
</style>
