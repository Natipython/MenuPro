<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { cart, cartTotals } from '$lib/stores/cartStore';
  import { soundFX } from '$lib/utils/feedback';

  export let isOpen: boolean = false;
  export let currency: string = 'ETB';
  export let tableNumber: string = '';

  const dispatch = createEventDispatcher();

  // Tip calculation
  let selectedTipPercent: number = 10;
  const tipOptions = [0, 5, 10, 15, 20];

  $: subtotal = $cartTotals?.subtotal || 0;
  $: tipAmount = (subtotal * selectedTipPercent) / 100;
  $: grandTotal = subtotal + tipAmount;

  function close() {
    isOpen = false;
    dispatch('close');
  }

  function handleCheckout() {
    soundFX.playSuccess();
    dispatch('checkout', {
      subtotal,
      tipAmount,
      grandTotal,
      selectedTipPercent
    });
    close();
  }

  function updateItemQty(itemId: string, delta: number) {
    soundFX.playTap();
    cart.updateQuantity(itemId, delta);
  }

  function removeItem(itemId: string) {
    soundFX.playTap();
    cart.removeItem(itemId);
  }
</script>

{#if isOpen}
  <div class="cart-backdrop" on:click={close} role="dialog" aria-modal="true">
    <div class="cart-drawer" on:click|stopPropagation>
      <!-- Header -->
      <header class="cart-header">
        <div class="header-title-box">
          <h2 class="cart-title">Your Dining Order</h2>
          <span class="table-badge">Table {tableNumber || '1'}</span>
        </div>
        <button class="cart-close-btn" on:click={close} aria-label="Close cart">&times;</button>
      </header>

      <!-- Cart Items List -->
      <div class="cart-body">
        {#if $cart.length === 0}
          <div class="empty-cart-state">
            <div class="empty-icon-circle">
              <span class="empty-icon">🍽️</span>
            </div>
            <h3 class="empty-title">Your tray is empty</h3>
            <p class="empty-desc">Explore the menu and select your favorite dishes to begin your order.</p>
            <button class="btn-tactile btn-secondary btn-browse" on:click={close}>
              Browse Menu
            </button>
          </div>
        {:else}
          <div class="items-list">
            {#each $cart as item (item.id)}
              <div class="cart-item-card">
                <div class="item-primary-info">
                  <h4 class="item-name">{item.name}</h4>
                  <span class="item-line-price">
                    {((item.basePrice + (item.optionsTotal || 0)) * item.quantity).toFixed(2)} {currency}
                  </span>
                </div>

                <!-- Customizations summary -->
                {#if item.selectedOptions && Object.keys(item.selectedOptions).length > 0}
                  <div class="item-modifiers">
                    {#each Object.values(item.selectedOptions) as opt}
                      {#if opt && (typeof opt === 'string' || Array.isArray(opt))}
                        <span class="modifier-tag">{Array.isArray(opt) ? opt.join(', ') : opt}</span>
                      {/if}
                    {/each}
                  </div>
                {/if}

                {#if item.specialInstructions}
                  <p class="item-note">Note: {item.specialInstructions}</p>
                {/if}

                <div class="item-actions-row">
                  <div class="cart-stepper">
                    <button 
                      class="step-btn" 
                      on:click={() => updateItemQty(item.id, -1)}
                      aria-label="Decrease quantity"
                    >-</button>
                    <span class="step-num">{item.quantity}</span>
                    <button 
                      class="step-btn" 
                      on:click={() => updateItemQty(item.id, 1)}
                      aria-label="Increase quantity"
                    >+</button>
                  </div>

                  <button 
                    class="remove-action-btn" 
                    on:click={() => removeItem(item.id)}
                    aria-label="Remove item"
                  >
                    <svg class="trash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            {/each}
          </div>

          <!-- Tip Selector -->
          <div class="tip-section">
            <span class="tip-title">Add Staff Appreciation Tip</span>
            <div class="tip-pills">
              {#each tipOptions as tip}
                <button 
                  type="button" 
                  class="tip-pill" 
                  class:selected={selectedTipPercent === tip}
                  on:click={() => { soundFX.playTap(); selectedTipPercent = tip; }}
                >
                  {tip === 0 ? 'None' : `${tip}%`}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Totals & CTA -->
      {#if $cart.length > 0}
        <footer class="cart-footer">
          <div class="totals-breakdown">
            <div class="total-line">
              <span>Subtotal</span>
              <span class="font-mono">{subtotal.toFixed(2)} {currency}</span>
            </div>
            {#if tipAmount > 0}
              <div class="total-line">
                <span>Staff Tip ({selectedTipPercent}%)</span>
                <span class="font-mono text-amber">+{tipAmount.toFixed(2)} {currency}</span>
              </div>
            {/if}
            <div class="total-line grand-total">
              <span>Total to Pay</span>
              <span class="font-mono grand-price">{grandTotal.toFixed(2)} {currency}</span>
            </div>
          </div>

          <button 
            type="button" 
            class="btn-tactile btn-primary btn-checkout" 
            on:click={handleCheckout}
          >
            <span>Confirm & Proceed to Payment</span>
            <svg class="arrow-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .cart-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(9, 10, 15, 0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 950;
    display: flex;
    justify-content: flex-end;
    animation: fadeIn 200ms ease forwards;
  }

  .cart-drawer {
    width: 100%;
    max-width: 480px;
    height: 100vh;
    background: var(--surface-dark);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6);
    animation: slideInRight 260ms var(--ease-spring) forwards;
  }

  .cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .header-title-box {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .cart-title {
    font-family: var(--font-serif);
    font-size: 1.4rem;
    color: #FFFFFF;
    margin: 0;
  }

  .table-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.6rem;
    background: rgba(245, 158, 11, 0.15);
    color: var(--amber-400);
    border-radius: var(--radius-full);
  }

  .cart-close-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .cart-close-btn:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.15);
  }

  .cart-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem 1.5rem;
  }

  /* Empty State */
  .empty-cart-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 2rem;
  }

  .empty-icon-circle {
    width: 80px;
    height: 80px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
    border: 1px solid var(--border);
  }

  .empty-icon {
    font-size: 2.5rem;
  }

  .empty-title {
    font-family: var(--font-serif);
    font-size: 1.35rem;
    color: #FFFFFF;
    margin-bottom: 0.5rem;
  }

  .empty-desc {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 1.5rem;
    max-width: 280px;
  }

  .btn-browse {
    padding: 0.75rem 1.5rem;
  }

  /* Cart Items */
  .items-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    margin-bottom: 1.5rem;
  }

  .cart-item-card {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .item-primary-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .item-name {
    font-size: 1rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  .item-line-price {
    font-family: var(--font-mono);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--amber-400);
  }

  .item-modifiers {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .modifier-tag {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-xs);
    color: var(--text-secondary);
  }

  .item-note {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-style: italic;
    margin: 0;
  }

  .item-actions-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .cart-stepper {
    display: flex;
    align-items: center;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.15rem;
    gap: 0.4rem;
  }

  .step-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-xs);
    background: transparent;
    border: none;
    color: #FFFFFF;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .step-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .step-num {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    font-weight: 700;
    color: #FFFFFF;
    min-width: 20px;
    text-align: center;
  }

  .remove-action-btn {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    transition: color 120ms ease;
  }

  .remove-action-btn:hover {
    color: var(--color-danger);
  }

  .trash-icon {
    width: 18px;
    height: 18px;
  }

  /* Tip Section */
  .tip-section {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .tip-title {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
  }

  .tip-pills {
    display: flex;
    gap: 0.4rem;
  }

  .tip-pill {
    flex: 1;
    padding: 0.5rem 0;
    border-radius: var(--radius-md);
    background: var(--card-bg);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .tip-pill:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .tip-pill.selected {
    background: rgba(245, 158, 11, 0.15);
    border-color: var(--amber-500);
    color: var(--amber-400);
  }

  /* Footer */
  .cart-footer {
    padding: 1.25rem 1.5rem;
    background: var(--surface-dark);
    border-top: 1px solid var(--border);
  }

  .totals-breakdown {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1.25rem;
  }

  .total-line {
    display: flex;
    justify-content: space-between;
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  .text-amber {
    color: var(--amber-400);
  }

  .grand-total {
    font-size: 1.15rem;
    font-weight: 700;
    color: #FFFFFF;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .grand-price {
    color: var(--amber-400);
    font-size: 1.25rem;
  }

  .btn-checkout {
    width: 100%;
    padding: 1rem;
    font-size: 1.05rem;
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }

  .arrow-right {
    width: 20px;
    height: 20px;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  @media (max-width: 640px) {
    .cart-drawer {
      max-width: 100%;
    }
  }
</style>
