<script lang="ts">
  // Mock analytics data
  const stats = [
    { label: 'Today\'s Revenue', value: '$1,245.00', trend: '+12%', isPositive: true },
    { label: 'Total Orders', value: '84', trend: '+5%', isPositive: true },
    { label: 'Avg Order Value', value: '$14.82', trend: '-2%', isPositive: false },
    { label: 'Active Tables', value: '12 / 20', trend: '60% Capacity', isPositive: true }
  ];

  const recentOrders = [
    { id: '12345', time: '10 mins ago', table: '12', amount: '$45.00', status: 'COMPLETED' },
    { id: '12346', time: '15 mins ago', table: 'Takeaway', amount: '$12.50', status: 'COMPLETED' },
    { id: '12347', time: '1 hour ago', table: '4', amount: '$85.00', status: 'COMPLETED' }
  ];
</script>

<svelte:head>
  <title>Admin Dashboard | MenuApp Pro</title>
</svelte:head>

<div class="dashboard">
  <header class="page-header">
    <h1>Dashboard Overview</h1>
    <div class="actions">
      <button class="primary-btn">Download Report</button>
    </div>
  </header>

  <!-- Stats Grid -->
  <div class="stats-grid">
    {#each stats as stat}
      <div class="stat-card">
        <h3 class="stat-label">{stat.label}</h3>
        <div class="stat-value">{stat.value}</div>
        <div class="stat-trend" class:positive={stat.isPositive} class:negative={!stat.isPositive}>
          {stat.trend} from yesterday
        </div>
      </div>
    {/each}
  </div>

  <div class="dashboard-grid">
    <!-- Chart Placeholder -->
    <div class="card chart-card">
      <h2>Revenue Trend</h2>
      <div class="chart-placeholder">
        <span>[ Chart rendering area ]</span>
        <div class="mock-bars">
          <div class="bar" style="height: 40%"></div>
          <div class="bar" style="height: 60%"></div>
          <div class="bar" style="height: 45%"></div>
          <div class="bar" style="height: 80%"></div>
          <div class="bar" style="height: 55%"></div>
          <div class="bar" style="height: 90%"></div>
          <div class="bar" style="height: 100%"></div>
        </div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="card recent-orders">
      <h2>Recent Orders</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Time</th>
            <th>Table/Type</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each recentOrders as order}
            <tr>
              <td>#{order.id}</td>
              <td>{order.time}</td>
              <td>{order.table}</td>
              <td><strong>{order.amount}</strong></td>
              <td><span class="status-badge {order.status.toLowerCase()}">{order.status}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  .page-header h1 { margin: 0; font-size: 1.75rem; color: #111827; }
  .primary-btn { background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 500; cursor: pointer; }
  
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
  .stat-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .stat-label { color: #6b7280; font-size: 0.875rem; font-weight: 500; text-transform: uppercase; margin: 0 0 0.5rem 0; }
  .stat-value { font-size: 1.75rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
  .stat-trend { font-size: 0.875rem; font-weight: 500; }
  .stat-trend.positive { color: #10b981; }
  .stat-trend.negative { color: #ef4444; }

  .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
  
  .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; }
  .card h2 { margin: 0 0 1.5rem 0; font-size: 1.25rem; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; }
  
  .chart-placeholder { height: 300px; background: #f9fafb; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; position: relative; }
  .mock-bars { display: flex; align-items: flex-end; gap: 10px; height: 200px; width: 80%; margin-top: 1rem; }
  .bar { flex: 1; background: #93c5fd; border-radius: 4px 4px 0 0; }

  .data-table { width: 100%; border-collapse: collapse; text-align: left; }
  .data-table th { color: #6b7280; font-weight: 500; font-size: 0.875rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e5e7eb; }
  .data-table td { padding: 1rem 0; border-bottom: 1px solid #f3f4f6; color: #111827; }
  .status-badge { font-size: 0.75rem; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 999px; }
  .status-badge.completed { background: #d1fae5; color: #065f46; }
</style>
