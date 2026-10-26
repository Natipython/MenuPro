<script lang="ts">
  import { soundFX, addToast } from '$lib/audio/feedback';

  let todayRevenue = 14850.00;
  let todayOrdersCount = 42;
  let activeTablesCount = 9;
  let averageOrderValue = 353.50;

  let topSellingItems = [
    { name: 'Special Macchiato (Double Shot)', count: 68, category: 'Coffee', revenue: 4760.00 },
    { name: 'Signature Kitfo Sandwich', count: 24, category: 'Mains', revenue: 5280.00 },
    { name: 'Fresh Avocado Mango Juice', count: 31, category: 'Juices', revenue: 3410.00 },
    { name: 'Almond Croissant', count: 18, category: 'Pastries', revenue: 1400.00 }
  ];

  function sendDailySummary() {
    soundFX.playSuccess();
    addToast({
      type: 'success',
      title: 'Daily Report Dispatched',
      message: 'Automated sales report sent to manager WhatsApp (+251 91 122 3344).'
    });
  }
</script>

<svelte:head>
  <title>Store Overview | MenuMini Console</title>
</svelte:head>

<div class="overview-page">
  <!-- Header -->
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Executive Daily Overview</h1>
      <p class="page-subtitle">Real-time table orders, digital payment volume, and daily highlights.</p>
    </div>

    <div class="top-actions">
      <button class="btn-tactile btn-primary" on:click={sendDailySummary}>
        <span>📲 Dispatch Daily Summary</span>
      </button>
    </div>
  </header>

  <!-- Metric Highlights Grid -->
  <div class="metrics-grid">
    <div class="metric-card card">
      <div class="metric-head">
        <span class="metric-label">Today's Revenue</span>
        <span class="metric-icon">💰</span>
      </div>
      <div class="metric-value font-mono">{todayRevenue.toLocaleString()} <span class="currency">ETB</span></div>
      <div class="metric-trend text-emerald">↑ 18.4% from yesterday</div>
    </div>

    <div class="metric-card card">
      <div class="metric-head">
        <span class="metric-label">Completed Orders</span>
        <span class="metric-icon">📋</span>
      </div>
      <div class="metric-value font-mono">{todayOrdersCount} <span class="currency">orders</span></div>
      <div class="metric-trend text-emerald">↑ 8 new this afternoon</div>
    </div>

    <div class="metric-card card">
      <div class="metric-head">
        <span class="metric-label">Active Tables</span>
        <span class="metric-icon">📍</span>
      </div>
      <div class="metric-value font-mono">{activeTablesCount} <span class="currency">seated</span></div>
      <div class="metric-trend text-amber">Tables 2, 4, 9, 12 active</div>
    </div>

    <div class="metric-card card">
      <div class="metric-head">
        <span class="metric-label">Average Order</span>
        <span class="metric-icon">⚡</span>
      </div>
      <div class="metric-value font-mono">{averageOrderValue.toFixed(2)} <span class="currency">ETB</span></div>
      <div class="metric-trend text-emerald">High-ticket dining</div>
    </div>
  </div>

  <!-- Top Sellers & Quick Actions -->
  <div class="details-split-grid">
    <div class="card top-items-card">
      <div class="card-header-row">
        <h3 class="card-title">🔥 Top Selling Items Today</h3>
        <a href="/admin/menu" class="card-action-link">Manage Menu →</a>
      </div>

      <div class="items-list">
        {#each topSellingItems as item}
          <div class="top-item-row">
            <div class="item-info">
              <strong class="item-name">{item.name}</strong>
              <small class="item-cat">{item.category} • {item.count} sold</small>
            </div>
            <div class="item-rev font-mono text-amber">
              {item.revenue.toFixed(2)} ETB
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="card quick-links-card">
      <h3 class="card-title">🚀 Quick Actions</h3>
      <div class="quick-btns-stack">
        <a href="/admin/menu" class="quick-btn">
          <span class="q-icon">🎨</span>
          <div>
            <strong>AI Template Switcher</strong>
            <small>Change theme & tune brand colors</small>
          </div>
        </a>
        <a href="/admin/orders" class="quick-btn">
          <span class="q-icon">📲</span>
          <div>
            <strong>Live Orders & WhatsApp</strong>
            <small>View live orders & export Excel</small>
          </div>
        </a>
        <a href="/admin/qr-codes" class="quick-btn">
          <span class="q-icon">🖨️</span>
          <div>
            <strong>Physical QR Print Shop</strong>
            <small>Order acrylic stands or stickers</small>
          </div>
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  .overview-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .page-title {
    font-family: var(--font-serif);
    font-size: 1.75rem;
    color: #FFFFFF;
  }

  .page-subtitle {
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .metric-card {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .metric-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .metric-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
  }

  .metric-icon {
    font-size: 1.25rem;
  }

  .metric-value {
    font-size: 1.75rem;
    font-weight: 800;
    color: #FFFFFF;
  }

  .currency {
    font-size: 0.9rem;
    color: var(--amber-400);
  }

  .metric-trend {
    font-size: 0.78rem;
    font-weight: 600;
  }

  .text-emerald { color: #10B981; }
  .text-amber { color: var(--amber-400); }

  .details-split-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
  }

  .top-items-card, .quick-links-card {
    padding: 1.5rem;
  }

  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .card-title {
    font-size: 1.1rem;
    color: #FFFFFF;
    margin: 0;
  }

  .card-action-link {
    font-size: 0.82rem;
    color: var(--amber-400);
    text-decoration: none;
    font-weight: 700;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .top-item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0.85rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md);
  }

  .item-name {
    font-size: 0.88rem;
    color: #FFFFFF;
    display: block;
  }

  .item-cat {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .item-rev {
    font-size: 0.95rem;
    font-weight: 700;
  }

  .quick-btns-stack {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .quick-btn {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.85rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: #FFFFFF;
    transition: all 140ms ease;
  }

  .quick-btn:hover {
    background: rgba(245, 158, 11, 0.1);
    border-color: var(--amber-500);
  }

  .q-icon {
    font-size: 1.5rem;
  }

  .quick-btn strong {
    font-size: 0.88rem;
    display: block;
  }

  .quick-btn small {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  @media (max-width: 900px) {
    .details-split-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
