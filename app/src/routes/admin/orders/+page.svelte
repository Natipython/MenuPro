<script lang="ts">
  // Mock live orders array
  let activeOrders = [
    { id: '12345', customer: 'John D.', table: '12', time: '10 mins ago', status: 'PREPARING', total: 10.50, type: 'Dine-In', items: 3 },
    { id: '12346', customer: 'Sarah W.', table: 'Takeaway', time: '5 mins ago', status: 'PENDING', total: 24.00, type: 'Takeaway', items: 2 },
    { id: '12347', customer: 'Mike T.', table: '4', time: 'Just now', status: 'PENDING', total: 8.00, type: 'Dine-In', items: 1 }
  ];

  let filter = 'ALL'; // ALL, PENDING, PREPARING
  
  $: filteredOrders = filter === 'ALL' 
    ? activeOrders 
    : activeOrders.filter(o => o.status === filter);
</script>

<svelte:head>
  <title>Live Orders | Admin</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1>Live Orders Overview</h1>
    <p class="subtitle">Monitor and manage incoming orders outside the kitchen</p>
  </div>
  <div class="actions">
    <button class="secondary-btn">Order History</button>
  </div>
</div>

<div class="filters">
  <button class="filter-btn" class:active={filter === 'ALL'} on:click={() => filter = 'ALL'}>
    All Active ({activeOrders.length})
  </button>
  <button class="filter-btn" class:active={filter === 'PENDING'} on:click={() => filter = 'PENDING'}>
    Pending ({activeOrders.filter(o => o.status === 'PENDING').length})
  </button>
  <button class="filter-btn" class:active={filter === 'PREPARING'} on:click={() => filter = 'PREPARING'}>
    Preparing ({activeOrders.filter(o => o.status === 'PREPARING').length})
  </button>
</div>

<div class="card">
  <table class="data-table">
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Time</th>
        <th>Customer</th>
        <th>Table/Type</th>
        <th>Items</th>
        <th>Total</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#if filteredOrders.length === 0}
        <tr>
          <td colspan="8" class="empty-state">No orders found for this filter.</td>
        </tr>
      {:else}
        {#each filteredOrders as order}
          <tr>
            <td><strong>#{order.id}</strong></td>
            <td><span class="time-badge">{order.time}</span></td>
            <td>{order.customer}</td>
            <td>
              <div class="type-info">
                <span class="type-icon">{order.type === 'Dine-In' ? '🍽️' : '🛍️'}</span>
                {order.table}
              </div>
            </td>
            <td>{order.items} items</td>
            <td><strong>${order.total.toFixed(2)}</strong></td>
            <td>
              <span class="status-badge {order.status.toLowerCase()}">{order.status}</span>
            </td>
            <td class="actions-cell">
              <button class="icon-btn" title="View Details">👁️</button>
              <button class="icon-btn text-red" title="Cancel Order">❌</button>
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<style>
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
  .page-header h1 { margin: 0 0 0.25rem 0; font-size: 1.75rem; color: #111827; }
  .subtitle { margin: 0; color: #6b7280; font-size: 0.875rem; }
  
  .secondary-btn { background: white; border: 1px solid #d1d5db; color: #374151; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 500; cursor: pointer; }

  .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; }
  .filter-btn { background: none; border: none; color: #6b7280; font-weight: 500; cursor: pointer; padding: 0.5rem 1rem; border-radius: 6px; transition: all 0.2s; }
  .filter-btn:hover { background: #f3f4f6; }
  .filter-btn.active { background: #111827; color: white; }

  .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; text-align: left; }
  .data-table th { background: #f9fafb; color: #6b7280; font-weight: 500; font-size: 0.875rem; padding: 1rem; border-bottom: 1px solid #e5e7eb; }
  .data-table td { padding: 1rem; border-bottom: 1px solid #f3f4f6; color: #111827; vertical-align: middle; }
  .data-table tr:last-child td { border-bottom: none; }
  
  .time-badge { color: #d97706; font-size: 0.875rem; font-weight: 500; }
  
  .type-info { display: flex; align-items: center; gap: 0.5rem; }
  
  .status-badge { font-size: 0.75rem; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 999px; }
  .status-badge.pending { background: #fee2e2; color: #ef4444; }
  .status-badge.preparing { background: #fef3c7; color: #f59e0b; }

  .actions-cell { display: flex; gap: 0.5rem; }
  .icon-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; opacity: 0.7; transition: opacity 0.2s; }
  .icon-btn:hover { opacity: 1; }
  .text-red { filter: grayscale(1); }
  .text-red:hover { filter: none; }
  
  .empty-state { text-align: center; color: #6b7280; padding: 3rem !important; }
</style>
