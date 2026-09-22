<script lang="ts">
  import { onMount } from 'svelte';
  
  // export let data;
  let orderId = '12345'; // mock
  let status = 'PENDING'; // PENDING, PREPARING, READY, COMPLETED
  let progress = 25;

  onMount(() => {
    // Mock WebSocket progress updates
    const interval = setInterval(() => {
      if (status === 'PENDING') {
        status = 'PREPARING';
        progress = 50;
      } else if (status === 'PREPARING') {
        status = 'READY';
        progress = 100;
        clearInterval(interval);
      }
    }, 4000);

    return () => clearInterval(interval);
  });
</script>

<div class="order-container">
  <header class="order-header">
    <h1>Order Confirmation</h1>
    <p class="order-id">Order #{orderId}</p>
  </header>

  <div class="status-card">
    <div class="status-icon">
      {#if status === 'PENDING'}
        ⏳
      {:else if status === 'PREPARING'}
        👨‍🍳
      {:else if status === 'READY'}
        🎉
      {:else}
        ✅
      {/if}
    </div>
    
    <h2 class="status-text">
      {#if status === 'PENDING'}
        Order Received
      {:else if status === 'PREPARING'}
        Preparing Your Order
      {:else if status === 'READY'}
        Ready for Pickup / Serving!
      {/if}
    </h2>

    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
    
    <p class="eta">Estimated time: 10-15 mins</p>
  </div>

  <div class="details-card">
    <h3>Order Details</h3>
    <div class="items">
      <div class="item"><span>2x Espresso</span> <span>$6.00</span></div>
      <div class="item"><span>1x Croissant</span> <span>$4.50</span></div>
    </div>
    <div class="total-row">
      <span>Total Paid</span>
      <span>$10.50</span>
    </div>
  </div>
</div>

<style>
  .order-container { max-width: 600px; margin: 0 auto; padding: 2rem 1rem; }
  .order-header { text-align: center; margin-bottom: 2rem; }
  .order-id { color: var(--text-muted); font-family: monospace; }
  
  .status-card {
    background: white; padding: 2rem; border-radius: var(--radius-lg); text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 2rem;
  }
  .status-icon { font-size: 4rem; margin-bottom: 1rem; }
  .status-text { margin: 0 0 1.5rem 0; color: var(--primary); }
  
  .progress-bar { height: 8px; background: var(--surface); border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
  .progress-fill { height: 100%; background: var(--primary); transition: width 1s ease-in-out; }
  
  .eta { color: var(--text-muted); font-size: 0.875rem; }

  .details-card { background: white; padding: 1.5rem; border-radius: var(--radius-md); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .details-card h3 { margin: 0 0 1rem 0; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
  .item { display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--text-main); }
  .total-row { display: flex; justify-content: space-between; font-weight: bold; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border); }
</style>
