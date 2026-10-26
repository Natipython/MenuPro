<script lang="ts">
  import { soundFX, addToast } from '$lib/audio/feedback';
  import { miniNotificationService, type MiniOrderNotification } from '$lib/services/miniNotificationService';

  let managerPhone = '0911223344';
  let showWhatsAppSettings = false;

  interface OrderRecord {
    id: string;
    customer: string;
    table: string;
    time: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
    total: number;
    currency: string;
    itemsCount: number;
    paymentMethod: string;
    txnRef: string;
    itemsSummary: string;
    customerNote?: string;
  }

  let orders: OrderRecord[] = [
    { id: '#4821', customer: 'Abebe T.', table: 'Table 4', time: '3 mins ago', status: 'PENDING', total: 420.00, currency: 'ETB', itemsCount: 3, paymentMethod: 'telebirr', txnRef: 'TL-981023', itemsSummary: '2x Special Macchiato, 1x Croissant', customerNote: 'Extra hot milk please' },
    { id: '#4820', customer: 'Helen M.', table: 'Table 9', time: '11 mins ago', status: 'PREPARING', total: 660.00, currency: 'ETB', itemsCount: 2, paymentMethod: 'CBE Birr', txnRef: 'CBE-441290', itemsSummary: '2x Signature Kitfo Sandwich' },
    { id: '#4819', customer: 'Dawit G.', table: 'Table 2', time: '20 mins ago', status: 'READY', total: 220.00, currency: 'ETB', itemsCount: 2, paymentMethod: 'Awash Birr', txnRef: 'AW-112048', itemsSummary: '2x Avocado Mango Spris' },
    { id: '#4818', customer: 'Sara K.', table: 'Table 7', time: '35 mins ago', status: 'COMPLETED', total: 840.00, currency: 'ETB', itemsCount: 4, paymentMethod: 'telebirr', txnRef: 'TL-980771', itemsSummary: '3x Tibs Plate, 1x Sparkling Water' }
  ];

  function sendToWhatsApp(order: OrderRecord) {
    soundFX.playPop();
    const notification: MiniOrderNotification = {
      orderId: order.id,
      tableNumber: order.table,
      businessName: 'Addis Cafe & Roastery',
      items: [
        { name: order.itemsSummary, quantity: order.itemsCount, price: order.total / order.itemsCount }
      ],
      subtotal: order.total,
      total: order.total,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      customerNote: order.customerNote,
      timestamp: new Date().toISOString()
    };

    const link = miniNotificationService.createWhatsAppLink(managerPhone, notification);
    window.open(link, '_blank');
    addToast({
      type: 'success',
      title: 'WhatsApp Dispatched',
      message: `Order ${order.id} routed to +251 ${managerPhone.slice(1)}.`
    });
  }

  function advanceStatus(id: string) {
    soundFX.playPop();
    orders = orders.map(o => {
      if (o.id === id) {
        if (o.status === 'PENDING') return { ...o, status: 'PREPARING' as const };
        if (o.status === 'PREPARING') return { ...o, status: 'READY' as const };
        if (o.status === 'READY') {
          soundFX.playSuccess();
          return { ...o, status: 'COMPLETED' as const };
        }
      }
      return o;
    });
  }

  function exportCsv() {
    soundFX.playSuccess();
    const rows = orders.map(o => ({
      orderId: o.id,
      tableNumber: o.table,
      businessName: 'Addis Cafe',
      items: [{ name: o.itemsSummary, quantity: o.itemsCount, price: o.total / o.itemsCount }],
      subtotal: o.total,
      total: o.total,
      currency: o.currency,
      paymentMethod: o.paymentMethod,
      customerNote: o.customerNote,
      timestamp: new Date().toISOString()
    }));

    const csv = miniNotificationService.generateOrdersCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MenuMini_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    addToast({ type: 'success', title: 'Export Complete', message: `${orders.length} orders downloaded.` });
  }
</script>

<svelte:head>
  <title>Live Orders & WhatsApp | MenuMini</title>
</svelte:head>

<div class="orders-page">
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Live Orders & WhatsApp Routing</h1>
      <p class="page-subtitle">Zero-hardware order queue. Route orders to WhatsApp and export daily accounting records.</p>
    </div>

    <div class="top-actions">
      <button class="btn-tactile btn-secondary" on:click={exportCsv}>
        <span>📥 Export Excel / CSV</span>
      </button>
      <button class="btn-tactile btn-whatsapp" on:click={() => showWhatsAppSettings = !showWhatsAppSettings}>
        <span>📱 WhatsApp Target: +251 {managerPhone.slice(1)}</span>
      </button>
    </div>
  </header>

  {#if showWhatsAppSettings}
    <div class="whatsapp-settings-card card">
      <div class="settings-head">
        <h3 class="settings-title">📲 WhatsApp Order Notification Target</h3>
        <button class="close-btn" on:click={() => showWhatsAppSettings = false}>✕</button>
      </div>
      <p class="settings-desc">Enter the manager or kitchen phone number to receive formatted WhatsApp order alerts.</p>
      <div class="phone-row">
        <span class="country-badge font-mono">+251 (Ethiopia)</span>
        <input type="text" bind:value={managerPhone} placeholder="0911223344" class="phone-input font-mono" />
        <button class="btn-tactile btn-primary" on:click={() => { soundFX.playSuccess(); showWhatsAppSettings = false; addToast({ type: 'success', title: 'Saved', message: `WhatsApp target set to +251 ${managerPhone.slice(1)}` }); }}>
          Save Target Phone
        </button>
      </div>
    </div>
  {/if}

  <div class="orders-table-card card">
    <table class="orders-table">
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Table</th>
          <th>Items Ordered</th>
          <th>Total</th>
          <th>Payment</th>
          <th>Status</th>
          <th class="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each orders as order (order.id)}
          <tr>
            <td class="font-mono text-amber font-bold">{order.id}</td>
            <td>
              <span class="table-pill">{order.table}</span>
            </td>
            <td>
              <strong class="items-txt">{order.itemsSummary}</strong>
              {#if order.customerNote}
                <small class="note-txt">Note: "{order.customerNote}"</small>
              {/if}
            </td>
            <td class="font-mono font-bold">{order.total.toFixed(2)} {order.currency}</td>
            <td>
              <span class="pay-pill pay-{order.paymentMethod.toLowerCase().replace(' ', '')}">
                {order.paymentMethod}
              </span>
            </td>
            <td>
              <span class="status-pill status-{order.status.toLowerCase()}">
                {order.status}
              </span>
            </td>
            <td class="text-right">
              <div class="actions-cell">
                <button class="btn-tactile btn-wa-action" on:click={() => sendToWhatsApp(order)}>
                  📲 WhatsApp
                </button>
                {#if order.status !== 'COMPLETED'}
                  <button class="btn-tactile btn-secondary btn-step" on:click={() => advanceStatus(order.id)}>
                    Advance →
                  </button>
                {:else}
                  <span class="text-muted">✓ Done</span>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
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

  .top-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-whatsapp {
    background: #25D366;
    color: #000000;
    font-weight: 700;
    box-shadow: 0 4px 14px rgba(37, 211, 102, 0.25);
  }

  .whatsapp-settings-card {
    background: #0D1C13;
    border: 1px solid rgba(37, 211, 102, 0.3);
    padding: 1.25rem 1.5rem;
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
    font-size: 1.1rem;
    cursor: pointer;
  }

  .settings-desc {
    font-size: 0.82rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }

  .phone-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .country-badge {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    font-weight: 700;
  }

  .phone-input {
    background: var(--bg-dark);
    border: 1px solid var(--border);
    color: #FFFFFF;
    padding: 0.6rem 0.85rem;
    border-radius: var(--radius-md);
    font-size: 0.95rem;
    width: 220px;
  }

  .orders-table-card {
    padding: 1rem;
    overflow-x: auto;
  }

  .orders-table {
    width: 100%;
    border-collapse: collapse;
  }

  .orders-table th {
    text-align: left;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .orders-table td {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .table-pill {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    background: var(--surface-elevated);
    border-radius: var(--radius-sm);
  }

  .items-txt {
    font-size: 0.88rem;
    color: #FFFFFF;
    display: block;
  }

  .note-txt {
    font-size: 0.75rem;
    color: var(--amber-400);
    display: block;
  }

  .pay-pill {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-xs);
  }

  .pay-telebirr { background: rgba(0, 92, 185, 0.2); color: #60A5FA; }
  .pay-cbebirr { background: rgba(88, 24, 69, 0.2); color: #E879F9; }
  .pay-awashbirr { background: rgba(247, 147, 30, 0.2); color: #FB923C; }

  .status-pill {
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
  }

  .status-pending { background: rgba(245, 158, 11, 0.15); color: #FBBF24; }
  .status-preparing { background: rgba(59, 130, 246, 0.15); color: #60A5FA; }
  .status-ready { background: rgba(168, 85, 247, 0.15); color: #C084FC; }
  .status-completed { background: rgba(16, 185, 129, 0.15); color: #34D399; }

  .actions-cell {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-wa-action {
    background: rgba(37, 211, 102, 0.15);
    color: #25D366;
    border: 1px solid rgba(37, 211, 102, 0.3);
    font-size: 0.78rem;
    padding: 0.35rem 0.65rem;
  }

  .btn-wa-action:hover {
    background: #25D366;
    color: #000000;
  }

  .btn-step {
    font-size: 0.78rem;
    padding: 0.35rem 0.65rem;
  }

  .text-right { text-align: right; }
  .text-muted { color: var(--text-tertiary); font-size: 0.8rem; }
</style>
