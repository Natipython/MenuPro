<script lang="ts">
  import { cart, cartTotals } from '$lib/stores/cartStore';
  import { onMount } from 'svelte';

  export let data;
  
  let orderType = 'DINE_IN';
  let tableNumber = data?.tableId || '';
  let customerName = '';
  let customerPhone = '';
  let paymentMethod = 'CARD';

  let isProcessing = false;

  async function placeOrder() {
    isProcessing = true;
    
    // In real app: create order via API -> get Stripe Client Secret -> confirm payment
    // Mock processing delay
    await new Promise(r => setTimeout(r, 1500));
    
    alert('Order placed successfully! Redirecting to confirmation...');
    
    cart.clear();
    // goto(`/${businessSlug}/${branchSlug}/order/12345`)
    isProcessing = false;
  }
</script>

<div class="checkout-container">
  <header class="checkout-header">
    <a href=".." class="back-link">← Back to Menu</a>
    <h1>Checkout</h1>
  </header>

  <div class="checkout-content">
    <div class="left-col">
      <!-- Order Type -->
      <section class="checkout-section">
        <h3>1. Order Type</h3>
        <div class="type-selector">
          <label class="radio-card" class:active={orderType === 'DINE_IN'}>
            <input type="radio" bind:group={orderType} value="DINE_IN" />
            <span class="icon">🍽️</span>
            <span>Dine-In</span>
          </label>
          <label class="radio-card" class:active={orderType === 'TAKEAWAY'}>
            <input type="radio" bind:group={orderType} value="TAKEAWAY" />
            <span class="icon">🛍️</span>
            <span>Takeaway</span>
          </label>
        </div>

        {#if orderType === 'DINE_IN'}
          <div class="input-group">
            <label for="table">Table Number</label>
            <input type="text" id="table" bind:value={tableNumber} placeholder="E.g., 12" />
          </div>
        {/if}
      </section>

      <!-- Customer Info -->
      <section class="checkout-section">
        <h3>2. Your Details</h3>
        <div class="input-group">
          <label for="name">Name</label>
          <input type="text" id="name" bind:value={customerName} placeholder="John Doe" />
        </div>
        <div class="input-group">
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" bind:value={customerPhone} placeholder="+1 234 567 8900" />
        </div>
      </section>

      <!-- Payment Method -->
      <section class="checkout-section">
        <h3>3. Payment</h3>
        <div class="type-selector">
          <label class="radio-card" class:active={paymentMethod === 'CARD'}>
            <input type="radio" bind:group={paymentMethod} value="CARD" />
            <span class="icon">💳</span>
            <span>Credit Card</span>
          </label>
          <label class="radio-card" class:active={paymentMethod === 'CASH'}>
            <input type="radio" bind:group={paymentMethod} value="CASH" />
            <span class="icon">💵</span>
            <span>Cash</span>
          </label>
        </div>
        
        {#if paymentMethod === 'CARD'}
          <div class="stripe-placeholder">
            <p>Stripe Payment Element will load here</p>
          </div>
        {:else}
          <div class="cash-notice">
            <p>Please pay at the counter or give cash to your server.</p>
          </div>
        {/if}
      </section>
    </div>

    <div class="right-col">
      <!-- Order Summary -->
      <section class="checkout-section summary-card">
        <h3>Order Summary</h3>
        <div class="summary-items">
          {#each $cart as item}
            <div class="summary-item">
              <span class="qty">{item.quantity}x</span>
              <span class="name">{item.name}</span>
              <span class="price">${((item.basePrice + item.optionsTotal) * item.quantity).toFixed(2)}</span>
            </div>
          {/each}
        </div>
        <div class="summary-totals">
          <div class="row">
            <span>Subtotal</span>
            <span>${$cartTotals.subtotal.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Tax</span>
            <span>${$cartTotals.tax.toFixed(2)}</span>
          </div>
          <div class="row grand-total">
            <span>Total</span>
            <span>${$cartTotals.total.toFixed(2)}</span>
          </div>
        </div>

        <button 
          class="pay-btn" 
          disabled={isProcessing || $cart.length === 0} 
          on:click={placeOrder}
        >
          {isProcessing ? 'Processing...' : `Pay $${$cartTotals.total.toFixed(2)}`}
        </button>
      </section>
    </div>
  </div>
</div>

<style>
  .checkout-container { max-width: 1000px; margin: 0 auto; padding-bottom: 2rem; }
  .checkout-header { padding: 1.5rem 1rem; border-bottom: 1px solid var(--border); background: white; }
  .back-link { color: var(--primary); text-decoration: none; display: inline-block; margin-bottom: 0.5rem; }
  .checkout-header h1 { margin: 0; }

  .checkout-content {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1.5rem 1rem;
  }

  @media (min-width: 768px) {
    .checkout-content { grid-template-columns: 2fr 1fr; }
  }

  .checkout-section {
    background: white;
    padding: 1.5rem;
    border-radius: var(--radius-md);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    margin-bottom: 1.5rem;
  }

  .checkout-section h3 { margin: 0 0 1.5rem 0; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }

  .type-selector { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
  .radio-card {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1rem;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s;
  }
  .radio-card input { display: none; }
  .radio-card.active { border-color: var(--primary); background: #eff6ff; color: var(--primary); }
  .radio-card .icon { font-size: 1.5rem; margin-bottom: 0.5rem; }

  .input-group { margin-bottom: 1rem; }
  .input-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.875rem; }
  .input-group input { width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 1rem; }
  .input-group input:focus { outline: none; border-color: var(--primary); }

  .stripe-placeholder { padding: 2rem; border: 2px dashed var(--border); border-radius: var(--radius-md); text-align: center; color: var(--text-muted); background: var(--surface); }
  .cash-notice { padding: 1rem; background: #fffbeb; color: #b45309; border-radius: var(--radius-md); text-align: center; font-weight: 500; }

  .summary-card { position: sticky; top: 1.5rem; }
  .summary-items { margin-bottom: 1.5rem; }
  .summary-item { display: flex; align-items: flex-start; margin-bottom: 0.75rem; }
  .summary-item .qty { color: var(--text-muted); margin-right: 0.5rem; width: 24px; }
  .summary-item .name { flex: 1; }
  .summary-item .price { font-weight: 500; }
  
  .summary-totals { border-top: 1px solid var(--border); padding-top: 1rem; margin-bottom: 1.5rem; }
  .summary-totals .row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--text-muted); }
  .summary-totals .grand-total { font-weight: 700; color: var(--text-main); font-size: 1.25rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border); }

  .pay-btn {
    width: 100%; padding: 1rem; background: #10b981; color: white; border: none; border-radius: var(--radius-md); font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.2s;
  }
  .pay-btn:hover { background: #059669; }
  .pay-btn:disabled { opacity: 0.7; cursor: not-allowed; }
</style>
