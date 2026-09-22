<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { cart, cartTotals } from '$lib/stores/cartStore';

  export let isOpen = false;
  const dispatch = createEventDispatcher();

  function close() {
    isOpen = false;
    dispatch('close');
  }

  function handleCheckout() {
    dispatch('checkout');
    close();
  }
</script>

{#if isOpen}
  <div class="cart-backdrop" on:click={close}>
    <div class="cart-drawer" on:click|stopPropagation class:open={isOpen}>
      <header class="cart-header">
        <h2>Your Order ({$cartTotals.totalItems})</h2>
        <button class="close-btn" on:click={close}>&times;</button>
      </header>

      <div class="cart-items">
        {#if $cart.length === 0}
          <div class="empty-state">
            <span class="empty-icon">🛒</span>
            <p>Your cart is empty</p>
          </div>
        {:else}
          {#each $cart as item (item.id)}
            <div class="cart-item">
              <div class="item-details">
                <h4>{item.name}</h4>
                <!-- Quick summary of options could go here -->
                <div class="price">
                  ${((item.basePrice + item.optionsTotal) * item.quantity).toFixed(2)}
                </div>
              </div>
              
              <div class="item-actions">
                <div class="qty-control">
                  <button on:click={() => cart.updateQuantity(item.id, -1)} disabled={item.quantity <= 1}>-</button>
                  <span>{item.quantity}</span>
                  <button on:click={() => cart.updateQuantity(item.id, 1)}>+</button>
                </div>
                <button class="remove-btn" on:click={() => cart.removeItem(item.id)}>🗑️</button>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      {#if $cart.length > 0}
        <footer class="cart-footer">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${$cartTotals.subtotal.toFixed(2)}</span>
          </div>
          <div class="totals-row tax">
            <span>Tax (15%)</span>
            <span>${$cartTotals.tax.toFixed(2)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Total</span>
            <span>${$cartTotals.total.toFixed(2)}</span>
          </div>
          
          <button class="checkout-btn" on:click={handleCheckout}>
            Proceed to Checkout
          </button>
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .cart-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 2000;
    display: flex;
    justify-content: flex-end;
  }

  .cart-drawer {
    background: white;
    width: 100%;
    max-width: 400px;
    height: 100%;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    animation: slideIn 0.3s forwards ease-out;
  }

  @keyframes slideIn {
    to { transform: translateX(0); }
  }

  .cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .cart-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .close-btn {
    background: none; border: none;
    font-size: 1.5rem; cursor: pointer;
    color: var(--text-muted);
  }

  .cart-items {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .cart-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--surface);
  }

  .item-details h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
  }

  .price {
    font-weight: 600;
    color: var(--primary);
  }

  .item-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .qty-control {
    display: flex;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .qty-control button {
    background: var(--surface);
    border: none;
    width: 28px; height: 28px;
    cursor: pointer;
  }

  .qty-control button:disabled {
    opacity: 0.5; cursor: not-allowed;
  }

  .qty-control span {
    width: 32px;
    text-align: center;
    font-size: 0.875rem;
  }

  .remove-btn {
    background: none; border: none;
    font-size: 1rem; cursor: pointer;
    opacity: 0.7;
  }

  .cart-footer {
    padding: 1.5rem;
    background: var(--surface);
    border-top: 1px solid var(--border);
  }

  .totals-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    color: var(--text-muted);
  }

  .totals-row.grand-total {
    color: var(--text-main);
    font-size: 1.25rem;
    font-weight: 700;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed var(--border);
    margin-bottom: 1.5rem;
  }

  .checkout-btn {
    width: 100%;
    padding: 1rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .checkout-btn:hover {
    background: var(--primary-hover);
  }
</style>
