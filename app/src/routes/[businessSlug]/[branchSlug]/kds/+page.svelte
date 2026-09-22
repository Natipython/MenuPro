<script lang="ts">
  import { onMount } from 'svelte';

  // Mock initial orders
  let orders = [
    {
      id: '12345',
      time: new Date(Date.now() - 5000 * 60).toLocaleTimeString(),
      table: '12',
      type: 'DINE_IN',
      status: 'PENDING',
      items: [
        { qty: 2, name: 'Espresso', notes: 'Extra hot' },
        { qty: 1, name: 'Avocado Toast', notes: 'No chili flakes' }
      ]
    },
    {
      id: '12346',
      time: new Date(Date.now() - 15000 * 60).toLocaleTimeString(),
      table: 'Takeaway',
      type: 'TAKEAWAY',
      status: 'PREPARING',
      items: [
        { qty: 1, name: 'Chicken Wrap', notes: '' },
        { qty: 1, name: 'Iced Latte', notes: 'Almond milk' }
      ]
    }
  ];

  function updateStatus(id: string, newStatus: string) {
    orders = orders.map(o => o.id === id ? { ...o, status: newStatus } : o);
    // In real app: emit WebSocket event, play sound alert if new order
  }
</script>

<svelte:head>
  <title>Kitchen Display System</title>
</svelte:head>

<div class="kds-container">
  <header class="kds-header">
    <h1>Kitchen Display System (KDS)</h1>
    <div class="stats">
      <span class="badge pending">{orders.filter(o => o.status === 'PENDING').length} Pending</span>
      <span class="badge preparing">{orders.filter(o => o.status === 'PREPARING').length} Preparing</span>
    </div>
  </header>

  <div class="lanes">
    <!-- Pending Lane -->
    <div class="lane">
      <h2>Incoming / Pending</h2>
      <div class="ticket-list">
        {#each orders.filter(o => o.status === 'PENDING') as order}
          <div class="ticket pending">
            <div class="ticket-header">
              <span class="order-id">#{order.id}</span>
              <span class="time">{order.time}</span>
            </div>
            <div class="ticket-meta">
              <span class="type {order.type.toLowerCase()}">{order.type}</span>
              <span class="table">Table {order.table}</span>
            </div>
            <ul class="ticket-items">
              {#each order.items as item}
                <li>
                  <strong>{item.qty}x</strong> {item.name}
                  {#if item.notes}
                    <div class="notes">Note: {item.notes}</div>
                  {/if}
                </li>
              {/each}
            </ul>
            <div class="ticket-actions">
              <button class="action-btn start" on:click={() => updateStatus(order.id, 'PREPARING')}>Start Preparing</button>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Preparing Lane -->
    <div class="lane">
      <h2>Preparing</h2>
      <div class="ticket-list">
        {#each orders.filter(o => o.status === 'PREPARING') as order}
          <div class="ticket preparing">
            <div class="ticket-header">
              <span class="order-id">#{order.id}</span>
              <span class="time">{order.time}</span>
            </div>
            <div class="ticket-meta">
              <span class="type {order.type.toLowerCase()}">{order.type}</span>
              <span class="table">Table {order.table}</span>
            </div>
            <ul class="ticket-items">
              {#each order.items as item}
                <li>
                  <strong>{item.qty}x</strong> {item.name}
                  {#if item.notes}
                    <div class="notes">Note: {item.notes}</div>
                  {/if}
                </li>
              {/each}
            </ul>
            <div class="ticket-actions">
              <button class="action-btn complete" on:click={() => updateStatus(order.id, 'READY')}>Mark Ready</button>
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Ready Lane -->
    <div class="lane">
      <h2>Ready to Serve</h2>
      <div class="ticket-list">
        {#each orders.filter(o => o.status === 'READY') as order}
          <div class="ticket ready">
            <div class="ticket-header">
              <span class="order-id">#{order.id}</span>
              <span class="time">{order.time}</span>
            </div>
            <div class="ticket-meta">
              <span class="type {order.type.toLowerCase()}">{order.type}</span>
              <span class="table">Table {order.table}</span>
            </div>
            <div class="ticket-actions">
              <button class="action-btn archive" on:click={() => updateStatus(order.id, 'COMPLETED')}>Archive</button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) { background: #1f2937; color: #f3f4f6; margin: 0; }
  .kds-container { height: 100vh; display: flex; flex-direction: column; }
  .kds-header { background: #111827; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #374151; }
  .kds-header h1 { margin: 0; font-size: 1.5rem; color: white; }
  
  .badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.875rem; font-weight: bold; margin-left: 0.5rem; }
  .badge.pending { background: #ef4444; color: white; }
  .badge.preparing { background: #f59e0b; color: white; }

  .lanes { display: flex; flex: 1; overflow: hidden; padding: 1rem; gap: 1rem; }
  .lane { flex: 1; display: flex; flex-direction: column; background: #374151; border-radius: 0.5rem; }
  .lane h2 { background: #1f2937; margin: 0; padding: 1rem; font-size: 1.1rem; text-align: center; border-radius: 0.5rem 0.5rem 0 0; }
  
  .ticket-list { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  
  .ticket { background: white; color: #111827; border-radius: 0.5rem; padding: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border-left: 6px solid #9ca3af; }
  .ticket.pending { border-left-color: #ef4444; }
  .ticket.preparing { border-left-color: #f59e0b; }
  .ticket.ready { border-left-color: #10b981; }
  
  .ticket-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
  .time { color: #6b7280; font-size: 0.875rem; font-weight: normal; }
  
  .ticket-meta { display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.875rem; }
  .type { padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold; }
  .type.dine_in { background: #dbeafe; color: #1d4ed8; }
  .type.takeaway { background: #fce7f3; color: #be185d; }
  .table { font-weight: bold; font-size: 1rem; color: #111827; }

  .ticket-items { list-style: none; padding: 0; margin: 0 0 1rem 0; }
  .ticket-items li { margin-bottom: 0.5rem; font-size: 1.1rem; border-bottom: 1px dashed #e5e7eb; padding-bottom: 0.5rem; }
  .notes { color: #dc2626; font-size: 0.9rem; font-weight: bold; margin-top: 0.25rem; }

  .ticket-actions { display: flex; gap: 0.5rem; }
  .action-btn { flex: 1; padding: 0.75rem; border: none; border-radius: 0.25rem; font-weight: bold; cursor: pointer; color: white; font-size: 1rem; }
  .action-btn.start { background: #f59e0b; }
  .action-btn.complete { background: #10b981; }
  .action-btn.archive { background: #6b7280; }
</style>
