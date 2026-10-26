<script lang="ts">
  import { soundFX, addToast } from '$lib/utils/feedback';
  import { isMiniTier } from '$lib/stores/tierStore';
  import { miniNotificationService } from '$lib/services/miniNotificationService';

  interface OrderRecord {
    id: string;
    customer: string;
    table: string;
    time: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
    total: number;
    currency: string;
    type: string;
    itemsCount: number;
    paymentMethod: string;
    txnRef: string;
    isVerified: boolean;
  }

  let managerPhone = '0911223344';
  let showWhatsAppSettings = false;

  let orders: OrderRecord[] = [
    { id: '#4821', customer: 'Abebe T.', table: 'Table 4', time: '4 mins ago', status: 'PENDING', total: 680.00, currency: 'ETB', type: 'Dine-In', itemsCount: 3, paymentMethod: 'telebirr', txnRef: '7DF89432', isVerified: false },
    { id: '#4820', customer: 'Helen M.', table: 'Table 9', time: '12 mins ago', status: 'PREPARING', total: 920.00, currency: 'ETB', type: 'Dine-In', itemsCount: 2, paymentMethod: 'CBE Birr', txnRef: 'CBE-99120', isVerified: true },
    { id: '#4819', customer: 'Dawit G.', table: 'Takeaway #3', time: '22 mins ago', status: 'READY', total: 410.00, currency: 'ETB', type: 'Takeaway', itemsCount: 2, paymentMethod: 'Cash', txnRef: 'At Counter', isVerified: false },
    { id: '#4818', customer: 'Sara K.', table: 'Table 2', time: '38 mins ago', status: 'SERVED', total: 1450.00, currency: 'ETB', type: 'Dine-In', itemsCount: 5, paymentMethod: 'telebirr', txnRef: '7DF88901', isVerified: true },
    { id: '#4817', customer: 'Yohannes B.', table: 'Table 11', time: '52 mins ago', status: 'SERVED', total: 530.00, currency: 'ETB', type: 'Dine-In', itemsCount: 2, paymentMethod: 'Awash', txnRef: 'AW-44129', isVerified: true },
    { id: '#4816', customer: 'Meron A.', table: 'Table 1', time: '1 hr ago', status: 'SERVED', total: 780.00, currency: 'ETB', type: 'Dine-In', itemsCount: 3, paymentMethod: 'telebirr', txnRef: '7DF88340', isVerified: true }
  ];

  function sendToWhatsApp(order: OrderRecord) {
    soundFX.playPop();
    const link = miniNotificationService.createWhatsAppLink(managerPhone, {
      orderId: order.id,
      tableNumber: order.table,
      businessName: 'Addis Cafe',
      items: [
        { name: 'Special Item', quantity: order.itemsCount, price: order.total / order.itemsCount }
      ],
      subtotal: order.total,
      total: order.total,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      timestamp: new Date().toISOString()
    });
    window.open(link, '_blank');
    addToast({
      type: 'success',
      title: 'WhatsApp Dispatch',
      message: `Dispatched order ${order.id} to WhatsApp (+251 ${managerPhone.slice(1)}).`
    });
  }

  let activeFilter: 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' = 'ALL';
  let searchQuery = '';

  $: filteredOrders = orders.filter(o => {
    const matchesFilter = activeFilter === 'ALL' || o.status === activeFilter;
    const matchesSearch = !searchQuery || 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.txnRef.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  function toggleVerification(orderId: string) {
    soundFX.playTap();
    orders = orders.map(o => {
      if (o.id === orderId) {
        const next = !o.isVerified;
        addToast({
          type: next ? 'success' : 'info',
          title: next ? 'Payment Verified' : 'Marked Unverified',
          message: `Order ${o.id} (${o.paymentMethod}) status updated.`
        });
        return { ...o, isVerified: next };
      }
      return o;
    });
  }

  function advanceStatus(orderId: string) {
    soundFX.playPop();
    orders = orders.map(o => {
      if (o.id === orderId) {
        if (o.status === 'PENDING') return { ...o, status: 'PREPARING' as const };
        if (o.status === 'PREPARING') return { ...o, status: 'READY' as const };
        if (o.status === 'READY') {
          soundFX.playSuccess();
          return { ...o, status: 'SERVED' as const };
        }
      }
      return o;
    });
  }

  // Real client-side CSV Export Engine
  function exportOrdersToCSV() {
    soundFX.playSuccess();
    const headers = ['Order ID', 'Table/Type', 'Customer', 'Time', 'Payment Method', 'TXN Ref', 'Verified', 'Items', 'Total Amount', 'Status'];
    const rows = filteredOrders.map(o => [
      o.id,
      o.table,
      o.customer,
      o.time,
      o.paymentMethod,
      o.txnRef,
      o.isVerified ? 'YES' : 'NO',
      o.itemsCount,
      `${o.total.toFixed(2)} ${o.currency}`,
      o.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MenuApp_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'CSV Export Complete',
      message: `${filteredOrders.length} orders downloaded for accounting.`
    });
  }
</script>

<svelte:head>
  <title>Live Orders & Accounting | Admin Suite</title>
</svelte:head>

<div class="orders-page">
  <!-- Top Bar -->
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Live Orders & Transactions</h1>
      <p class="page-subtitle">Monitor dining flow, verify telebirr/CBE receipts, and export accounting records.</p>
    </div>

    <div class="top-actions">
      <button class="btn-tactile btn-primary btn-export" on:click={exportOrdersToCSV}>
        <span>📥 Export Excel / CSV</span>
      </button>
      {#if !$isMiniTier}
        <a href="/demo-restaurant/main-branch/kds" target="_blank" class="btn-tactile btn-secondary btn-export">
          <span>🔥 Open KDS Expo</span>
        </a>
      {:else}
        <button class="btn-tactile btn-whatsapp-header" on:click={() => showWhatsAppSettings = !showWhatsAppSettings}>
          <span>📱 WhatsApp Dispatch</span>
        </button>
      {/if}
    </div>
  </header>

  {#if showWhatsAppSettings && $isMiniTier}
    <div class="whatsapp-settings-card card">
      <div class="settings-head">
        <h3 class="settings-title">📲 MenuMini WhatsApp Dispatch Settings</h3>
        <button class="close-btn" on:click={() => showWhatsAppSettings = false}>✕</button>
      </div>
      <p class="settings-desc">Whenever orders are placed or dispatched, they will be formatted and routed to this Ethiopian WhatsApp number.</p>
      <div class="phone-input-row">
        <span class="country-prefix">+251 (Ethiopia)</span>
        <input 
          type="text" 
          bind:value={managerPhone} 
          placeholder="0911223344" 
          class="phone-input font-mono"
        />
        <button class="btn-tactile btn-primary" on:click={() => {
          soundFX.playSuccess();
          showWhatsAppSettings = false;
          addToast({ type: 'success', title: 'Settings Saved', message: `WhatsApp target set to +251 ${managerPhone.slice(1)}` });
        }}>
          Save Number
        </button>
      </div>
    </div>
  {/if}

  <!-- Filters & Search Toolbar -->
  <div class="toolbar-box card">
    <div class="filter-pills-row">
      <button 
        type="button" 
        class="filter-tab"
        class:active={activeFilter === 'ALL'}
        on:click={() => { soundFX.playTap(); activeFilter = 'ALL'; }}
      >
        All Active ({orders.length})
      </button>
      <button 
        type="button" 
        class="filter-tab"
        class:active={activeFilter === 'PENDING'}
        on:click={() => { soundFX.playTap(); activeFilter = 'PENDING'; }}
      >
        Incoming ({orders.filter(o => o.status === 'PENDING').length})
      </button>
      <button 
        type="button" 
        class="filter-tab"
        class:active={activeFilter === 'PREPARING'}
        on:click={() => { soundFX.playTap(); activeFilter = 'PREPARING'; }}
      >
        Preparing ({orders.filter(o => o.status === 'PREPARING').length})
      </button>
      <button 
        type="button" 
        class="filter-tab"
        class:active={activeFilter === 'READY'}
        on:click={() => { soundFX.playTap(); activeFilter = 'READY'; }}
      >
        Ready ({orders.filter(o => o.status === 'READY').length})
      </button>
      <button 
        type="button" 
        class="filter-tab"
        class:active={activeFilter === 'SERVED'}
        on:click={() => { soundFX.playTap(); activeFilter = 'SERVED'; }}
      >
        Completed ({orders.filter(o => o.status === 'SERVED').length})
      </button>
    </div>

    <div class="search-input-box">
      <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Filter by Table, Customer, or TXN Ref..." 
        class="filter-input font-sans"
      />
    </div>
  </div>

  <!-- Orders Data Table Card -->
  <div class="card table-card">
    <div class="table-responsive-wrapper">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Order Ref</th>
            <th>Location</th>
            <th>Customer</th>
            <th>Time</th>
            <th>Payment Method</th>
            <th>TXN ID (Bank Ref)</th>
            <th>Verification</th>
            <th>Amount</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredOrders.length === 0}
            <tr>
              <td colspan="10" class="empty-table-row">
                <span class="empty-symbol">📋</span>
                <p>No orders matching your selected filter.</p>
              </td>
            </tr>
          {:else}
            {#each filteredOrders as order}
              <tr>
                <td class="font-mono font-bold text-amber">{order.id}</td>
                <td>
                  <span class="location-badge">{order.table}</span>
                </td>
                <td class="font-semibold">{order.customer}</td>
                <td class="text-muted">{order.time}</td>
                <td>
                  <span class="pay-method-badge {order.paymentMethod.toLowerCase().includes('tele') ? 'tele' : order.paymentMethod.toLowerCase().includes('cbe') ? 'cbe' : 'cash'}">
                    {order.paymentMethod}
                  </span>
                </td>
                <td class="font-mono text-muted">{order.txnRef}</td>
                <td>
                  <button 
                    type="button" 
                    class="btn-verify-pill"
                    class:verified={order.isVerified}
                    on:click={() => toggleVerification(order.id)}
                  >
                    {order.isVerified ? '✓ Verified' : '○ Verify'}
                  </button>
                </td>
                <td class="font-mono font-bold">{order.total.toFixed(2)} {order.currency}</td>
                <td>
                  <span class="status-pill status-{order.status.toLowerCase()}">
                    {order.status}
                  </span>
                </td>
                <td class="text-right">
                  <div class="row-actions-group">
                    {#if $isMiniTier}
                      <button 
                        type="button" 
                        class="btn-tactile btn-whatsapp-row"
                        on:click={() => sendToWhatsApp(order)}
                        title="Send order to WhatsApp"
                      >
                        📲 WhatsApp
                      </button>
                    {/if}
                    {#if order.status !== 'SERVED'}
                      <button 
                        type="button" 
                        class="btn-tactile btn-secondary btn-step-action"
                        on:click={() => advanceStatus(order.id)}
                      >
                        Advance →
                      </button>
                    {:else}
                      <span class="done-check">✓ Archived</span>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .orders-page {
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

  .top-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-export {
    padding: 0.75rem 1.25rem;
    font-size: 0.88rem;
  }

  /* Toolbar */
  .toolbar-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
  }

  .filter-pills-row {
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
  }

  .filter-tab {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 120ms ease;
  }

  .filter-tab:hover {
    color: #FFFFFF;
  }

  .filter-tab.active {
    background: var(--amber-500);
    border-color: var(--amber-500);
    color: #090A0F;
    font-weight: 700;
  }

  .search-input-box {
    position: relative;
    width: 280px;
  }

  .search-ico {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: var(--text-tertiary);
  }

  .filter-input {
    width: 100%;
    padding: 0.55rem 0.75rem 0.55rem 2.25rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 140ms ease;
  }

  .filter-input:focus {
    border-color: var(--amber-500);
  }

  /* Table */
  .table-card {
    padding: 0;
    overflow: hidden;
  }

  .table-responsive-wrapper {
    overflow-x: auto;
  }

  .orders-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    text-align: left;
  }

  .orders-table th {
    padding: 0.9rem 1.25rem;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid var(--border);
  }

  .orders-table td {
    padding: 1.15rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
  }

  .orders-table tr:hover td {
    background: rgba(255, 255, 255, 0.03);
  }

  .text-amber { color: var(--amber-400); }
  .text-muted { color: var(--text-secondary); }
  .text-right { text-align: right; }

  .location-badge {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    background: var(--surface-elevated);
    border-radius: var(--radius-sm);
    color: #FFFFFF;
  }

  .pay-method-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-xs);
  }

  .pay-method-badge.tele { background: rgba(0, 91, 187, 0.2); color: #60A5FA; }
  .pay-method-badge.cbe { background: rgba(107, 33, 168, 0.2); color: #C084FC; }
  .pay-method-badge.cash { background: rgba(245, 158, 11, 0.2); color: var(--amber-400); }

  .btn-verify-pill {
    padding: 0.25rem 0.65rem;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 700;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 120ms ease;
  }

  .btn-verify-pill.verified {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.3);
    color: var(--color-success);
  }

  .status-pill {
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
  }

  .status-pending { background: rgba(245, 158, 11, 0.15); color: #FBBF24; }
  .status-preparing { background: rgba(59, 130, 246, 0.15); color: #60A5FA; }
  .status-ready { background: rgba(168, 85, 247, 0.15); color: #C084FC; }
  .status-served { background: rgba(16, 185, 129, 0.15); color: #34D399; }

  .btn-step-action {
    font-size: 0.78rem;
    padding: 0.35rem 0.75rem;
  }

  .done-check {
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }

  .empty-table-row {
    text-align: center;
    padding: 3rem !important;
    color: var(--text-tertiary);
  }

  .empty-symbol {
    font-size: 2rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  .row-actions-group {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .btn-whatsapp-header {
    background: #25D366;
    color: #000000;
    font-weight: 700;
    border: none;
    box-shadow: 0 2px 8px rgba(37, 211, 102, 0.25);
  }

  .btn-whatsapp-header:hover {
    background: #20BA5A;
  }

  .btn-whatsapp-row {
    background: rgba(37, 211, 102, 0.15);
    color: #25D366;
    border: 1px solid rgba(37, 211, 102, 0.3);
    font-size: 0.78rem;
    padding: 0.35rem 0.65rem;
  }

  .btn-whatsapp-row:hover {
    background: #25D366;
    color: #000000;
  }

  .whatsapp-settings-card {
    background: #0D1C13;
    border: 1px solid rgba(37, 211, 102, 0.3);
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .settings-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .settings-title {
    font-size: 1rem;
    color: #25D366;
    margin: 0;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    font-size: 1rem;
    cursor: pointer;
  }

  .settings-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0 0 1rem 0;
  }

  .phone-input-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .country-prefix {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    font-weight: 700;
  }

  .phone-input {
    background: var(--bg-dark);
    border: 1px solid var(--border);
    color: #FFFFFF;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    font-size: 0.95rem;
    width: 200px;
  }

  @media (max-width: 900px) {
    .toolbar-box {
      flex-direction: column;
      align-items: stretch;
    }
    .search-input-box {
      width: 100%;
    }
  }
</style>
