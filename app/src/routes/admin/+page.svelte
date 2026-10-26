<script lang="ts">
  import { soundFX, addToast } from '$lib/utils/feedback';

  const stats = [
    { label: "Today's Revenue", value: '42,850 ETB', trend: '+18.4%', isPositive: true, sub: 'vs 36,200 ETB yesterday' },
    { label: 'Total Orders', value: '128', trend: '+12%', isPositive: true, sub: '86 Dine-In • 42 Takeaway' },
    { label: 'Avg Ticket Value', value: '334.75 ETB', trend: '+4.2%', isPositive: true, sub: 'Highest in Dinner shift' },
    { label: 'Live Tables', value: '14 / 22', trend: '64% Seated', isPositive: true, sub: '8 Available tables' }
  ];

  const recentOrders = [
    { id: '#4821', time: '4 mins ago', table: 'Table 4', amount: '680.00 ETB', method: 'telebirr', txn: '7DF89432', status: 'PREPARING' },
    { id: '#4820', time: '12 mins ago', table: 'Table 9', amount: '920.00 ETB', method: 'CBE Birr', txn: 'CBE-99120', status: 'PREPARING' },
    { id: '#4819', time: '22 mins ago', table: 'Takeaway #3', amount: '410.00 ETB', method: 'Cash', txn: 'At Counter', status: 'READY' },
    { id: '#4818', time: '38 mins ago', table: 'Table 2', amount: '1,450.00 ETB', method: 'telebirr', txn: '7DF88901', status: 'SERVED' },
    { id: '#4817', time: '45 mins ago', table: 'Table 11', amount: '530.00 ETB', method: 'Awash', txn: 'AW-44129', status: 'SERVED' }
  ];

  const topDishes = [
    { name: 'Special Burger Delight', count: 48, revenue: '8,640 ETB', icon: '🍔' },
    { name: 'Single-Origin Pour Over', count: 62, revenue: '4,960 ETB', icon: '☕' },
    { name: 'Artisan Fettuccine', count: 31, revenue: '6,820 ETB', icon: '🍝' },
    { name: 'Fresh Passion Lemonade', count: 54, revenue: '4,320 ETB', icon: '🍋' }
  ];

  const weeklyBars = [
    { day: 'Mon', height: 45, val: '24k' },
    { day: 'Tue', height: 60, val: '31k' },
    { day: 'Wed', height: 50, val: '28k' },
    { day: 'Thu', height: 75, val: '38k' },
    { day: 'Fri', height: 95, val: '49k' },
    { day: 'Sat', height: 100, val: '54k' },
    { day: 'Sun', height: 85, val: '43k' }
  ];

  function downloadReport() {
    soundFX.playSuccess();
    addToast({
      type: 'success',
      title: 'Report Downloaded',
      message: 'Daily revenue and transaction summary exported as CSV.'
    });
  }
</script>

<svelte:head>
  <title>Admin Dashboard | Pulse & Analytics</title>
</svelte:head>

<div class="dashboard-page">
  <!-- Header -->
  <header class="page-top-bar">
    <div>
      <div class="branch-pill-tag">
        <span class="live-dot"></span>
        <span>Bole Medhanealem • Live Service</span>
      </div>
      <h1 class="page-title">Management Dashboard</h1>
    </div>

    <div class="header-actions">
      <button class="btn-tactile btn-secondary btn-action" on:click={downloadReport}>
        <span>📥 Export Daily CSV</span>
      </button>
      <a href="/demo-restaurant/main-branch/kds" target="_blank" class="btn-tactile btn-primary btn-action">
        <span>🔥 Launch KDS Screen →</span>
      </a>
    </div>
  </header>

  <!-- Key Metrics Bento Row -->
  <div class="stats-bento-grid">
    {#each stats as stat}
      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-label">{stat.label}</span>
          <span class="stat-trend" class:positive={stat.isPositive}>
            {stat.trend}
          </span>
        </div>
        <div class="stat-main-val font-mono">{stat.value}</div>
        <span class="stat-sub">{stat.sub}</span>
      </div>
    {/each}
  </div>

  <!-- Charts & Top Dishes Grid -->
  <div class="analytics-charts-grid">
    <!-- Revenue Weekly Chart -->
    <div class="card chart-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Weekly Revenue Velocity</h2>
          <p class="panel-subtitle">Total gross volume across Dine-In & Takeaway</p>
        </div>
        <span class="chart-summary-tag font-mono">267,000 ETB this week</span>
      </div>

      <div class="bar-chart-container">
        <div class="bars-flex-row">
          {#each weeklyBars as bar}
            <div class="bar-col">
              <div class="bar-tooltip font-mono">{bar.val}</div>
              <div class="bar-track">
                <div class="bar-fill" style="height: {bar.height}%;"></div>
              </div>
              <span class="bar-day">{bar.day}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Top Selling Dishes -->
    <div class="card top-dishes-panel">
      <div class="panel-header">
        <h2 class="panel-title">Top Moving Dishes</h2>
        <span class="badge-mini">Today</span>
      </div>

      <div class="top-dishes-list">
        {#each topDishes as dish, idx}
          <div class="dish-rank-row">
            <span class="rank-num">#{idx + 1}</span>
            <div class="dish-rank-info">
              <span class="dish-rank-name">{dish.icon} {dish.name}</span>
              <span class="dish-rank-sales">{dish.count} orders today</span>
            </div>
            <span class="dish-rank-rev font-mono">{dish.revenue}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Recent Live Orders Table Card -->
  <div class="card recent-orders-card">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Recent Transactions & Kitchen Feed</h2>
        <p class="panel-subtitle">Latest orders with telebirr & CBE transaction IDs</p>
      </div>
      <a href="/admin/orders" class="btn-tactile btn-secondary btn-sm-link">
        View All Orders →
      </a>
    </div>

    <div class="table-responsive-box">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Location</th>
            <th>Time</th>
            <th>Payment Method</th>
            <th>TXN Ref</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each recentOrders as order}
            <tr>
              <td class="font-mono font-bold text-amber">{order.id}</td>
              <td class="font-bold">{order.table}</td>
              <td class="text-muted">{order.time}</td>
              <td>
                <span class="method-tag {order.method.toLowerCase().includes('tele') ? 'tele' : order.method.toLowerCase().includes('cbe') ? 'cbe' : 'cash'}">
                  {order.method}
                </span>
              </td>
              <td class="font-mono text-muted">{order.txn}</td>
              <td class="font-mono font-bold">{order.amount}</td>
              <td>
                <span class="status-pill status-{order.status.toLowerCase()}">
                  {order.status}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .dashboard-page {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  /* Page Bar */
  .page-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .branch-pill-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0.65rem;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: var(--radius-full);
    color: var(--color-success);
    font-size: 0.75rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--color-success);
  }

  .page-title {
    font-family: var(--font-serif);
    font-size: 2rem;
    color: #FFFFFF;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-action {
    padding: 0.75rem 1.25rem;
    font-size: 0.88rem;
  }

  /* Bento Stats */
  .stats-bento-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .stat-card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .stat-card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .stat-trend {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.15rem 0.45rem;
    border-radius: var(--radius-xs);
  }

  .stat-trend.positive {
    background: rgba(16, 185, 129, 0.15);
    color: var(--color-success);
  }

  .stat-main-val {
    font-size: 1.7rem;
    font-weight: 800;
    color: #FFFFFF;
  }

  .stat-sub {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  /* Charts Grid */
  .analytics-charts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.25rem;
  }

  .card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }

  .panel-title {
    font-family: var(--font-serif);
    font-size: 1.25rem;
    color: #FFFFFF;
    margin: 0 0 0.2rem 0;
  }

  .panel-subtitle {
    font-size: 0.82rem;
    color: var(--text-tertiary);
    margin: 0;
  }

  .chart-summary-tag {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--amber-400);
    padding: 0.25rem 0.65rem;
    background: rgba(245, 158, 11, 0.1);
    border-radius: var(--radius-sm);
  }

  /* Bar Chart */
  .bar-chart-container {
    height: 200px;
    display: flex;
    align-items: flex-end;
    padding-top: 1.5rem;
  }

  .bars-flex-row {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-end;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    position: relative;
  }

  .bar-tooltip {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-bottom: 0.4rem;
  }

  .bar-track {
    width: 100%;
    max-width: 38px;
    flex: 1;
    background: var(--surface-elevated);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: flex-end;
    overflow: hidden;
  }

  .bar-fill {
    width: 100%;
    background: linear-gradient(180deg, var(--amber-400), var(--amber-600));
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    transition: height var(--duration-slow) var(--ease-spring);
  }

  .bar-col:hover .bar-fill {
    background: linear-gradient(180deg, #FFFFFF, var(--amber-400));
  }

  .bar-day {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-top: 0.6rem;
  }

  /* Top Dishes */
  .top-dishes-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .dish-rank-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding-bottom: 0.65rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .dish-rank-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .rank-num {
    font-family: var(--font-mono);
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--amber-400);
    width: 24px;
  }

  .dish-rank-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .dish-rank-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: #FFFFFF;
  }

  .dish-rank-sales {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .dish-rank-rev {
    font-size: 0.88rem;
    font-weight: 700;
    color: #FFFFFF;
  }

  /* Table */
  .table-responsive-box {
    overflow-x: auto;
  }

  .admin-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    text-align: left;
  }

  .admin-table th {
    padding: 0.75rem 1rem;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
  }

  .admin-table td {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
  }

  .admin-table tr:hover td {
    background: rgba(255, 255, 255, 0.03);
  }

  .text-amber { color: var(--amber-400); }
  .text-muted { color: var(--text-secondary); }

  .method-tag {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-xs);
  }

  .method-tag.tele { background: rgba(0, 91, 187, 0.2); color: #60A5FA; }
  .method-tag.cbe { background: rgba(107, 33, 168, 0.2); color: #C084FC; }
  .method-tag.cash { background: rgba(245, 158, 11, 0.2); color: var(--amber-400); }

  .status-pill {
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
  }

  .status-preparing { background: rgba(59, 130, 246, 0.15); color: #60A5FA; }
  .status-ready { background: rgba(245, 158, 11, 0.15); color: #FBBF24; }
  .status-served { background: rgba(16, 185, 129, 0.15); color: #34D399; }

  .btn-sm-link {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }

  @media (max-width: 1024px) {
    .stats-bento-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .analytics-charts-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
