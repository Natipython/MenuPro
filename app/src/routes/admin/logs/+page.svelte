<script lang="ts">
  let logs = [
    { id: 1, time: '2026-09-22 14:32:01', user: 'Alice Smith (Manager)', action: 'REFUND_ORDER', entity: 'Order #12344', details: 'Full refund issued to customer' },
    { id: 2, time: '2026-09-22 14:15:22', user: 'Bob Jones (Head Chef)', action: 'UPDATE_MENU', entity: 'Item: Espresso', details: 'Changed price from $3.00 to $3.50' },
    { id: 3, time: '2026-09-22 13:00:00', user: 'System', action: 'AUTO_REPORT', entity: 'Daily Summary', details: 'Generated daily revenue report for Main Branch' },
    { id: 4, time: '2026-09-22 11:45:10', user: 'Alice Smith (Manager)', action: 'INVITE_STAFF', entity: 'User: charlie@gmail.com', details: 'Sent invite for Waiter role' }
  ];

  let currentTab = 'AUDIT'; // AUDIT or FEEDBACK

  let feedback = [
    { id: 1, order: '#12340', date: 'Yesterday', customer: 'Anonymous', rating: 5, comment: 'Food was amazing, fast service!' },
    { id: 2, order: '#12338', date: 'Yesterday', customer: 'Sarah W.', rating: 3, comment: 'Coffee was a bit cold.' }
  ];
</script>

<svelte:head>
  <title>Logs & Accountability | Admin</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1>Accountability & Feedback</h1>
    <p class="subtitle">Track every action taken in the system and review customer feedback</p>
  </div>
  <div class="actions">
    <button class="secondary-btn">Export CSV</button>
  </div>
</div>

<div class="tabs">
  <button class="tab" class:active={currentTab === 'AUDIT'} on:click={() => currentTab = 'AUDIT'}>System Audit Log</button>
  <button class="tab" class:active={currentTab === 'FEEDBACK'} on:click={() => currentTab = 'FEEDBACK'}>Customer Feedback</button>
</div>

{#if currentTab === 'AUDIT'}
  <div class="card">
    <table class="data-table">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>User</th>
          <th>Action</th>
          <th>Entity Affected</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {#each logs as log}
          <tr>
            <td class="time-col">{log.time}</td>
            <td><strong>{log.user}</strong></td>
            <td><span class="action-badge {log.action.toLowerCase()}">{log.action.replace('_', ' ')}</span></td>
            <td>{log.entity}</td>
            <td class="text-muted">{log.details}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if currentTab === 'FEEDBACK'}
  <div class="feedback-grid">
    {#each feedback as f}
      <div class="feedback-card">
        <div class="feedback-header">
          <div class="stars">
            {#each Array(5) as _, i}
              <span class="star" class:filled={i < f.rating}>★</span>
            {/each}
          </div>
          <span class="date">{f.date}</span>
        </div>
        <p class="comment">"{f.comment}"</p>
        <div class="feedback-footer">
          <span>Order {f.order}</span>
          <span>By {f.customer}</span>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
  .page-header h1 { margin: 0 0 0.25rem 0; font-size: 1.75rem; color: #111827; }
  .subtitle { margin: 0; color: #6b7280; font-size: 0.875rem; }
  
  .secondary-btn { background: white; border: 1px solid #d1d5db; color: #374151; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 500; cursor: pointer; }

  .tabs { display: flex; gap: 1rem; border-bottom: 1px solid #e5e7eb; margin-bottom: 1.5rem; }
  .tab { background: none; border: none; padding: 0.75rem 1rem; color: #6b7280; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; font-size: 1rem; }
  .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }

  .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; text-align: left; }
  .data-table th { background: #f9fafb; color: #6b7280; font-weight: 500; font-size: 0.875rem; padding: 1rem; border-bottom: 1px solid #e5e7eb; }
  .data-table td { padding: 1rem; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 0.875rem; }
  .text-muted { color: #6b7280; }
  .time-col { color: #6b7280; font-family: monospace; white-space: nowrap; }

  .action-badge { background: #f3f4f6; color: #374151; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; border: 1px solid #e5e7eb; }
  .action-badge.refund_order { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }
  .action-badge.update_menu { background: #dbeafe; color: #2563eb; border-color: #bfdbfe; }
  
  .feedback-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
  .feedback-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
  .feedback-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .star { color: #d1d5db; font-size: 1.25rem; }
  .star.filled { color: #f59e0b; }
  .date { color: #6b7280; font-size: 0.875rem; }
  .comment { color: #111827; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem; font-style: italic; }
  .feedback-footer { display: flex; justify-content: space-between; color: #6b7280; font-size: 0.875rem; border-top: 1px dashed #e5e7eb; padding-top: 1rem; }
</style>
