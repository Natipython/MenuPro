<script lang="ts">
  import { soundFX, addToast } from '$lib/utils/feedback';

  let currentTab: 'AUDIT' | 'FEEDBACK' = 'AUDIT';

  const auditLogs = [
    { id: 'log-1', time: '14:32:01', user: 'General Manager', action: 'VERIFY_PAYMENT', entity: 'Order #4821', details: 'Confirmed telebirr TXN: 7DF89432' },
    { id: 'log-2', time: '14:15:22', user: 'Chef Tadesse', action: '86_STOCK', entity: 'Item: Iced Caramel Frappe', details: 'Marked out of stock for kitchen rush' },
    { id: 'log-3', time: '13:00:00', user: 'System Worker', action: 'DAILY_SYNC', entity: 'Revenue Accounting', details: 'Compiled hourly shift ledger' },
    { id: 'log-4', time: '11:45:10', user: 'General Manager', action: 'INVITE_STAFF', entity: 'Hiwot A. (Server)', details: 'Issued terminal PIN: 7741' },
    { id: 'log-5', time: '10:20:00', user: 'Owner', action: 'UPDATE_MENU', entity: 'Special Burger Delight', details: 'Updated price to 280.00 ETB' }
  ];

  const customerReviews = [
    { id: 'rev-1', order: '#4818', customer: 'Sara K.', rating: 5, time: '35 mins ago', comment: 'The Single-Origin Pour Over was phenomenal! Fast table QR service.', table: 'Table 2', sentiment: 'POSITIVE' },
    { id: 'rev-2', order: '#4817', customer: 'Yohannes B.', rating: 5, time: '50 mins ago', comment: 'telebirr payment worked immediately. Burger was cooked perfectly.', table: 'Table 11', sentiment: 'POSITIVE' },
    { id: 'rev-3', order: '#4812', customer: 'Anonymous Guest', rating: 4, time: '2 hours ago', comment: 'Delicious food, but fries could have arrived a minute hotter.', table: 'Table 6', sentiment: 'NEUTRAL' }
  ];

  function exportLogs() {
    soundFX.playSuccess();
    addToast({
      type: 'success',
      title: 'Logs Exported',
      message: 'System audit and review ledger downloaded as CSV.'
    });
  }
</script>

<svelte:head>
  <title>Audit Logs & Customer Reviews | Admin Suite</title>
</svelte:head>

<div class="logs-page">
  <!-- Top Bar -->
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Accountability & Customer Reviews</h1>
      <p class="page-subtitle">Track every operational action taken in the system and monitor guest satisfaction.</p>
    </div>

    <div class="top-actions">
      <button class="btn-tactile btn-primary btn-export" on:click={exportLogs}>
        <span>📥 Export Compliance CSV</span>
      </button>
    </div>
  </header>

  <!-- Tabs -->
  <div class="tabs-row">
    <button 
      type="button" 
      class="tab-btn"
      class:active={currentTab === 'AUDIT'}
      on:click={() => { soundFX.playTap(); currentTab = 'AUDIT'; }}
    >
      System Audit Trail ({auditLogs.length})
    </button>
    <button 
      type="button" 
      class="tab-btn"
      class:active={currentTab === 'FEEDBACK'}
      on:click={() => { soundFX.playTap(); currentTab = 'FEEDBACK'; }}
    >
      Guest Star Reviews (4.8 ★ Avg)
    </button>
  </div>

  {#if currentTab === 'AUDIT'}
    <!-- Audit Table Card -->
    <div class="card table-card">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Staff / Operator</th>
            <th>Action Type</th>
            <th>Target Entity</th>
            <th>Event Description</th>
          </tr>
        </thead>
        <tbody>
          {#each auditLogs as log}
            <tr>
              <td class="font-mono text-muted">{log.time}</td>
              <td><strong>{log.user}</strong></td>
              <td>
                <span class="action-chip {log.action.toLowerCase()}">
                  {log.action.replace('_', ' ')}
                </span>
              </td>
              <td class="font-mono text-amber">{log.entity}</td>
              <td class="text-secondary">{log.details}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <!-- Customer Reviews View -->
    <div class="reviews-stack">
      <!-- Ratings Summary Banner -->
      <div class="card rating-summary-banner">
        <div class="big-rating-box">
          <span class="big-score font-mono">4.8</span>
          <div class="stars-gold">★★★★★</div>
          <span class="total-reviews">Based on 148 verified dining tickets</span>
        </div>
        <div class="sentiment-badges">
          <div class="sentiment-pill positive">
            <span class="sent-num font-mono">94%</span>
            <span>Positive Dining Experience</span>
          </div>
          <div class="sentiment-pill highlight">
            <span class="sent-num font-mono">&lt; 90s</span>
            <span>Average telebirr Verification</span>
          </div>
        </div>
      </div>

      <!-- Individual Review Cards -->
      <div class="reviews-grid">
        {#each customerReviews as rev}
          <div class="card review-card">
            <div class="review-header">
              <div>
                <strong class="rev-customer">{rev.customer}</strong>
                <span class="rev-meta font-mono text-muted">{rev.order} • {rev.table} • {rev.time}</span>
              </div>
              <div class="rev-stars font-mono">
                {'★'.repeat(rev.rating)}
              </div>
            </div>
            <p class="rev-comment font-sans">"{rev.comment}"</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .logs-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .page-title {
    font-family: var(--font-serif);
    font-size: 2rem;
    color: #FFFFFF;
    margin: 0 0 0.25rem 0;
  }

  .page-subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .btn-export {
    padding: 0.75rem 1.25rem;
    font-size: 0.88rem;
  }

  /* Tabs */
  .tabs-row {
    display: flex;
    gap: 0.5rem;
  }

  .tab-btn {
    padding: 0.6rem 1.2rem;
    border-radius: var(--radius-md);
    background: var(--surface-dark);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .tab-btn:hover {
    color: #FFFFFF;
  }

  .tab-btn.active {
    background: var(--amber-500);
    border-color: var(--amber-500);
    color: #090A0F;
    font-weight: 700;
  }

  .card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
  }

  /* Table */
  .table-card {
    padding: 0;
    overflow: hidden;
  }

  .audit-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    text-align: left;
  }

  .audit-table th {
    padding: 0.9rem 1.25rem;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
  }

  .audit-table td {
    padding: 1.15rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
  }

  .text-amber { color: var(--amber-400); }
  .text-muted { color: var(--text-secondary); }

  .action-chip {
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-xs);
    font-size: 0.75rem;
    font-weight: 700;
    background: var(--surface-elevated);
    color: #FFFFFF;
  }

  /* Feedback */
  .reviews-stack {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .rating-summary-banner {
    padding: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(18, 20, 29, 1) 100%);
  }

  .big-rating-box {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .big-score {
    font-size: 3rem;
    font-weight: 800;
    color: var(--amber-400);
    line-height: 1;
  }

  .stars-gold {
    color: var(--amber-400);
    font-size: 1.35rem;
    letter-spacing: 0.1em;
  }

  .total-reviews {
    font-size: 0.85rem;
    color: var(--text-tertiary);
  }

  .sentiment-badges {
    display: flex;
    gap: 1rem;
  }

  .sentiment-pill {
    padding: 1rem 1.25rem;
    border-radius: var(--radius-lg);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .sent-num {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-success);
  }

  .sentiment-pill.highlight .sent-num {
    color: var(--amber-400);
  }

  .sentiment-pill span:last-child {
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  .reviews-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .review-card {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .review-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .rev-customer {
    font-size: 1rem;
    color: #FFFFFF;
    display: block;
    margin-bottom: 0.15rem;
  }

  .rev-meta {
    font-size: 0.78rem;
  }

  .rev-stars {
    color: var(--amber-400);
    font-size: 1.1rem;
    letter-spacing: 0.05em;
  }

  .rev-comment {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  @media (max-width: 900px) {
    .rating-summary-banner {
      flex-direction: column;
      align-items: flex-start;
      gap: 1.5rem;
    }
  }
</style>
