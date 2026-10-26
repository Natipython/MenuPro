<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { cart, cartTotals } from '$lib/stores/cartStore';
  import { soundFX, addToast } from '$lib/utils/feedback';

  export let data: any;
  const businessSlug = $page.params.businessSlug || 'demo-restaurant';
  const branchSlug = $page.params.branchSlug || 'main-branch';
  const tableParam = $page.url.searchParams.get('table') || data?.tableId || '4';

  let orderType = 'DINE_IN';
  let tableNumber = tableParam;
  let customerName = '';
  let customerPhone = '';
  let customerNote = '';

  // Ethiopian Payment Methods
  type PaymentProvider = 'telebirr' | 'cbe' | 'awash' | 'cash' | 'card';
  let selectedMethod: PaymentProvider = 'telebirr';
  let transactionId = '';
  let copiedField = false;

  const paymentProviders = [
    {
      id: 'telebirr',
      name: 'telebirr',
      badge: 'Fast & Instant',
      color: 'var(--telebirr)',
      accountName: 'MenuApp Pro Restaurant',
      accountNumber: '0911234567',
      instructions: 'Scan with telebirr. Put Table Number in the transaction memo.',
      qrData: 'telebirr://pay?to=0911234567&amount=450',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Telebirr_logo.png/600px-Telebirr_logo.png'
    },
    {
      id: 'cbe',
      name: 'CBE Birr',
      badge: 'Bank of Ethiopia',
      color: 'var(--cbe-birr)',
      accountName: 'MenuApp Pro Hospitality PLC',
      accountNumber: '1000123456789',
      instructions: 'Transfer via CBE Mobile Banking. Note: Table Number in reference.',
      qrData: 'cbebirr://pay?account=1000123456789&amount=450',
      logo: ''
    },
    {
      id: 'awash',
      name: 'Awash Birr',
      badge: 'Awash Bank',
      color: 'var(--awash-birr)',
      accountName: 'MenuApp Pro Food',
      accountNumber: '01423456789000',
      instructions: 'Pay through Awash Wallet or Internet Banking.',
      qrData: 'awash://pay?account=01423456789000',
      logo: ''
    },
    {
      id: 'cash',
      name: 'Cash / Pay Waiter',
      badge: 'At Table',
      color: 'var(--amber-500)',
      accountName: 'Pay upon delivery',
      accountNumber: 'Cash or POS terminal at table',
      instructions: 'Our staff will bring the bill and POS terminal to your table.',
      qrData: '',
      logo: ''
    }
  ];

  $: activeProvider = paymentProviders.find(p => p.id === selectedMethod) || paymentProviders[0];
  $: subtotal = $cartTotals.subtotal || 450.00;
  $: taxAmount = (subtotal * 0.15); // 15% VAT
  $: grandTotal = subtotal + taxAmount;

  let isSubmitting = false;

  function copyToClipboard(text: string) {
    soundFX.playTap();
    navigator.clipboard.writeText(text);
    copiedField = true;
    addToast({
      type: 'info',
      title: 'Copied to Clipboard',
      message: text
    });
    setTimeout(() => { copiedField = false; }, 2000);
  }

  async function handleConfirmOrder() {
    if (orderType === 'DINE_IN' && !tableNumber) {
      soundFX.playError();
      addToast({ type: 'warning', title: 'Table Required', message: 'Please enter your table number.' });
      return;
    }

    if ((selectedMethod === 'telebirr' || selectedMethod === 'cbe' || selectedMethod === 'awash') && !transactionId) {
      soundFX.playError();
      addToast({
        type: 'warning',
        title: 'Transaction ID Needed',
        message: 'Please enter the transaction reference / SMS code from your bank app.'
      });
      return;
    }

    isSubmitting = true;
    soundFX.playPop();

    // Generate mock order number
    const mockOrderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    setTimeout(() => {
      soundFX.playSuccess();
      cart.clear();
      isSubmitting = false;
      addToast({
        type: 'success',
        title: 'Order Confirmed!',
        message: 'Your kitchen ticket has been sent to our chefs.'
      });
      goto(`/${businessSlug}/${branchSlug}/order/${mockOrderId}?table=${tableNumber}`);
    }, 1200);
  }
</script>

<svelte:head>
  <title>Checkout | Payment Portal</title>
</svelte:head>

<div class="checkout-layout">
  <div class="checkout-container">
    <!-- Top Back Bar -->
    <header class="checkout-nav">
      <a href="/{businessSlug}/{branchSlug}" class="btn-back">
        <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Menu</span>
      </a>
      <h1 class="checkout-title">Review & Pay</h1>
      <div class="table-tag">Table {tableNumber || '1'}</div>
    </header>

    <div class="checkout-grid">
      <!-- Left Column: Dining Details & Payment -->
      <div class="checkout-main-flow">
        <!-- 1. Dining Details -->
        <section class="section-card">
          <div class="section-card-header">
            <span class="step-badge">1</span>
            <h2 class="card-heading">Dining Details</h2>
          </div>

          <div class="dining-type-selector">
            <button 
              type="button" 
              class="type-btn"
              class:selected={orderType === 'DINE_IN'}
              on:click={() => { soundFX.playTap(); orderType = 'DINE_IN'; }}
            >
              <span class="type-icon">🍽️</span>
              <span class="type-label">Dine-In</span>
            </button>
            <button 
              type="button" 
              class="type-btn"
              class:selected={orderType === 'TAKEAWAY'}
              on:click={() => { soundFX.playTap(); orderType = 'TAKEAWAY'; }}
            >
              <span class="type-icon">🛍️</span>
              <span class="type-label">Takeaway</span>
            </button>
          </div>

          <div class="inputs-row">
            {#if orderType === 'DINE_IN'}
              <div class="form-group table-input-group">
                <label for="table-num" class="input-label">Table Number *</label>
                <input 
                  id="table-num"
                  type="text" 
                  bind:value={tableNumber} 
                  placeholder="e.g. 4" 
                  class="form-input font-mono"
                  required
                />
              </div>
            {/if}

            <div class="form-group">
              <label for="cust-name" class="input-label">Your Name (Optional)</label>
              <input 
                id="cust-name"
                type="text" 
                bind:value={customerName} 
                placeholder="e.g. Abebe" 
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="cust-note" class="input-label">Order Notes for Server</label>
            <input 
              id="cust-note"
              type="text" 
              bind:value={customerNote} 
              placeholder="e.g. Bring food together, extra napkins..." 
              class="form-input"
            />
          </div>
        </section>

        <!-- 2. Ethiopian Payment Hub -->
        <section class="section-card">
          <div class="section-card-header">
            <span class="step-badge">2</span>
            <h2 class="card-heading">Select Payment Method</h2>
          </div>

          <!-- Provider Tabs -->
          <div class="provider-tabs">
            {#each paymentProviders as provider}
              {@const isSelected = selectedMethod === provider.id}
              <button 
                type="button" 
                class="provider-pill"
                class:selected={isSelected}
                on:click={() => { soundFX.playTap(); selectedMethod = provider.id as PaymentProvider; }}
              >
                <span class="provider-pill-title">{provider.name}</span>
                <span class="provider-pill-badge">{provider.badge}</span>
              </button>
            {/each}
          </div>

          <!-- Active Provider Showcase -->
          <div class="provider-showcase-panel">
            {#if activeProvider.qrData}
              <div class="qr-showcase-box">
                <div class="qr-frame">
                  <!-- Fallback Reliable SVG QR API -->
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={encodeURIComponent(activeProvider.qrData)}&color={activeProvider.id === 'telebirr' ? '005BBB' : activeProvider.id === 'cbe' ? '6B21A8' : 'C2410C'}" 
                    alt="{activeProvider.name} QR Code"
                    class="qr-image"
                  />
                  <div class="qr-scan-hint">Scan with {activeProvider.name} app</div>
                </div>

                <div class="account-details-box">
                  <div class="account-line">
                    <span class="acc-label">Account Name:</span>
                    <span class="acc-val">{activeProvider.accountName}</span>
                  </div>
                  <div class="account-line highlight">
                    <span class="acc-label">Account / Phone:</span>
                    <div class="acc-copy-row">
                      <span class="acc-val font-mono">{activeProvider.accountNumber}</span>
                      <button 
                        type="button" 
                        class="btn-copy-chip" 
                        on:click={() => copyToClipboard(activeProvider.accountNumber)}
                      >
                        {copiedField ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div class="instructions-bubble">
                    <span class="info-icon">💡</span>
                    <span>{activeProvider.instructions}</span>
                  </div>
                </div>
              </div>

              <!-- Transaction ID Input (Crucial for Kitchen Verification) -->
              <div class="txn-input-container">
                <label for="txn-id" class="txn-label">
                  <span>Enter Bank Transaction ID (TXN Ref)</span>
                  <span class="required-star">*</span>
                </label>
                <div class="txn-input-wrapper">
                  <input 
                    id="txn-id"
                    type="text" 
                    bind:value={transactionId} 
                    placeholder="e.g. 7DF89432 or paste SMS ref" 
                    class="txn-input font-mono"
                  />
                </div>
                <p class="txn-helper">Found in the SMS receipt sent by {activeProvider.name}.</p>
              </div>
            {:else}
              <!-- Cash / Counter Option -->
              <div class="cash-option-box">
                <div class="cash-icon-wrap">💵</div>
                <h3 class="cash-title">Pay with Cash or Terminal at Table</h3>
                <p class="cash-desc">Place your order now. Our waiter will bring your prepared order along with the paper bill and wireless card terminal to Table {tableNumber || '1'}.</p>
              </div>
            {/if}
          </div>
        </section>
      </div>

      <!-- Right Column: Order Summary & Place Order CTA -->
      <div class="checkout-summary-column">
        <div class="summary-card">
          <h3 class="summary-heading">Order Summary</h3>

          <div class="summary-items-list">
            {#if $cart.length > 0}
              {#each $cart as item}
                <div class="summary-item-row">
                  <div class="sum-item-name">
                    <span class="sum-qty">{item.quantity}x</span>
                    <span>{item.name}</span>
                  </div>
                  <span class="sum-price font-mono">
                    {((item.basePrice + (item.optionsTotal || 0)) * item.quantity).toFixed(2)} ETB
                  </span>
                </div>
              {/each}
            {:else}
              <!-- Preview default if testing without cart -->
              <div class="summary-item-row">
                <div class="sum-item-name">
                  <span class="sum-qty">1x</span>
                  <span>Signature Chef's Platter</span>
                </div>
                <span class="sum-price font-mono">450.00 ETB</span>
              </div>
            {/if}
          </div>

          <div class="summary-totals-box">
            <div class="sum-line">
              <span>Subtotal</span>
              <span class="font-mono">{subtotal.toFixed(2)} ETB</span>
            </div>
            <div class="sum-line">
              <span>VAT (15%)</span>
              <span class="font-mono">+{taxAmount.toFixed(2)} ETB</span>
            </div>
            <div class="sum-line grand-line">
              <span>Total Amount</span>
              <span class="font-mono grand-val">{grandTotal.toFixed(2)} ETB</span>
            </div>
          </div>

          <button 
            type="button" 
            class="btn-tactile btn-primary btn-submit-order"
            on:click={handleConfirmOrder}
            disabled={isSubmitting}
          >
            {#if isSubmitting}
              <div class="spinner"></div>
              <span>Transmitting Order...</span>
            {:else}
              <span>Confirm & Send to Kitchen</span>
              <span class="dot-sep">•</span>
              <span class="font-mono">{grandTotal.toFixed(2)} ETB</span>
            {/if}
          </button>

          <p class="security-guarantee">
            🔒 Zero transaction markup. Directly verified by restaurant management.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .checkout-layout {
    min-height: 100vh;
    background: var(--bg-dark);
    padding: 1.5rem 1rem 4rem 1rem;
    color: var(--text-primary);
  }

  .checkout-container {
    max-width: 980px;
    margin: 0 auto;
  }

  /* Nav */
  .checkout-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .btn-back {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    transition: color 120ms ease;
  }

  .btn-back:hover {
    color: #FFFFFF;
  }

  .back-icon {
    width: 18px;
    height: 18px;
  }

  .checkout-title {
    font-family: var(--font-serif);
    font-size: 1.5rem;
    color: #FFFFFF;
    margin: 0;
  }

  .table-tag {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    background: rgba(245, 158, 11, 0.15);
    color: var(--amber-400);
    border-radius: var(--radius-full);
  }

  /* Grid Layout */
  .checkout-grid {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  /* Section Cards */
  .section-card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .section-card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .step-badge {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: var(--amber-500);
    color: #090A0F;
    font-weight: 800;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-heading {
    font-size: 1.15rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  /* Dining Selector */
  .dining-type-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .type-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.85rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 140ms ease;
  }

  .type-btn:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .type-btn.selected {
    background: rgba(245, 158, 11, 0.12);
    border-color: var(--amber-500);
    color: var(--amber-400);
  }

  .type-icon {
    font-size: 1.2rem;
  }

  .inputs-row {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.85rem;
  }

  .input-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 0.92rem;
    outline: none;
    transition: border-color 140ms ease;
  }

  .form-input:focus {
    border-color: var(--amber-500);
  }

  /* Provider Tabs */
  .provider-tabs {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.65rem;
    margin-bottom: 1.25rem;
  }

  .provider-pill {
    padding: 0.85rem 1rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    transition: all 140ms ease;
  }

  .provider-pill:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .provider-pill.selected {
    background: rgba(245, 158, 11, 0.12);
    border-color: var(--amber-500);
  }

  .provider-pill-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #FFFFFF;
  }

  .provider-pill-badge {
    font-size: 0.7rem;
    color: var(--text-tertiary);
  }

  .provider-pill.selected .provider-pill-badge {
    color: var(--amber-400);
  }

  /* Provider Showcase */
  .provider-showcase-panel {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }

  .qr-showcase-box {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1.25rem;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .qr-frame {
    background: #FFFFFF;
    padding: 0.75rem;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .qr-image {
    width: 140px;
    height: 140px;
    display: block;
  }

  .qr-scan-hint {
    font-size: 0.68rem;
    font-weight: 700;
    color: #111827;
  }

  .account-details-box {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .account-line {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .acc-label {
    font-size: 0.78rem;
    color: var(--text-tertiary);
  }

  .acc-val {
    font-size: 0.95rem;
    font-weight: 700;
    color: #FFFFFF;
  }

  .acc-copy-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .btn-copy-chip {
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-xs);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .btn-copy-chip:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.15);
  }

  .instructions-bubble {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--amber-400);
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.75rem;
    line-height: 1.35;
  }

  /* TXN Ref Input */
  .txn-input-container {
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .txn-label {
    display: flex;
    gap: 0.25rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 0.4rem;
  }

  .required-star {
    color: var(--color-danger);
  }

  .txn-input {
    width: 100%;
    padding: 0.85rem 1rem;
    background: var(--card-bg);
    border: 2px solid var(--amber-500);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    outline: none;
    box-shadow: 0 0 15px -3px var(--amber-glow);
  }

  .txn-helper {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 0.35rem;
  }

  /* Cash Box */
  .cash-option-box {
    text-align: center;
    padding: 1.5rem;
  }

  .cash-icon-wrap {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .cash-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 0.35rem;
  }

  .cash-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
    max-width: 380px;
    margin: 0 auto;
  }

  /* Summary Card */
  .summary-card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    position: sticky;
    top: 1.5rem;
  }

  .summary-heading {
    font-family: var(--font-serif);
    font-size: 1.3rem;
    color: #FFFFFF;
    margin: 0 0 1rem 0;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  .summary-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    max-height: 240px;
    overflow-y: auto;
  }

  .summary-item-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.88rem;
  }

  .sum-item-name {
    display: flex;
    gap: 0.5rem;
    color: var(--text-secondary);
  }

  .sum-qty {
    color: #FFFFFF;
    font-weight: 700;
  }

  .sum-price {
    font-weight: 600;
    color: #FFFFFF;
  }

  .summary-totals-box {
    border-top: 1px solid var(--border);
    padding-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .sum-line {
    display: flex;
    justify-content: space-between;
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  .grand-line {
    font-size: 1.15rem;
    font-weight: 800;
    color: #FFFFFF;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .grand-val {
    color: var(--amber-400);
    font-size: 1.35rem;
  }

  .btn-submit-order {
    width: 100%;
    padding: 1.1rem;
    font-size: 1.05rem;
    gap: 0.5rem;
  }

  .dot-sep {
    opacity: 0.6;
  }

  .security-guarantee {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    text-align: center;
    margin-top: 1rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(9, 10, 15, 0.2);
    border-top-color: #090A0F;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .checkout-grid {
      grid-template-columns: 1fr;
    }

    .qr-showcase-box {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .qr-frame {
      max-width: 180px;
      margin: 0 auto;
    }

    .account-line {
      align-items: center;
    }
  }
</style>
