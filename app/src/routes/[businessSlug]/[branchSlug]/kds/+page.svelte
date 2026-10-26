<script lang="ts">
  import { onMount } from 'svelte';
  import { soundFX, addToast } from '$lib/utils/feedback';

  interface KdsItem {
    id: string;
    qty: number;
    name: string;
    notes?: string;
    isDone?: boolean;
  }

  interface KdsOrder {
    id: string;
    orderNumber: string;
    tableNumber: string;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    status: 'PENDING' | 'PREPARING' | 'READY';
    elapsedSeconds: number;
    customerName?: string;
    paymentInfo: {
      provider: string;
      txnId?: string;
      isVerified: boolean;
    };
    items: KdsItem[];
  }

  let orders: KdsOrder[] = [
    {
      id: 'ord-101',
      orderNumber: '#4821',
      tableNumber: 'Table 4',
      orderType: 'DINE_IN',
      status: 'PENDING',
      elapsedSeconds: 240, // 4 mins
      customerName: 'Abebe T.',
      paymentInfo: {
        provider: 'telebirr',
        txnId: '7DF89432',
        isVerified: true
      },
      items: [
        { id: 'i1', qty: 2, name: 'Special Burger Delight', notes: 'Extra spicy, well done' },
        { id: 'i2', qty: 1, name: 'Single-Origin Pour Over', notes: 'Oat milk on side' },
        { id: 'i3', qty: 1, name: 'Garlic Herb Fries', notes: 'Extra crispy' }
      ]
    },
    {
      id: 'ord-102',
      orderNumber: '#4820',
      tableNumber: 'Table 9',
      orderType: 'DINE_IN',
      status: 'PREPARING',
      elapsedSeconds: 780, // 13 mins
      customerName: 'Helen M.',
      paymentInfo: {
        provider: 'CBE Birr',
        txnId: 'CBE-99120',
        isVerified: true
      },
      items: [
        { id: 'i4', qty: 1, name: 'Artisan Fettuccine Alfredo', notes: 'Add grilled chicken', isDone: true },
        { id: 'i5', qty: 2, name: 'Fresh Passion Lemonade', notes: 'Less ice' }
      ]
    },
    {
      id: 'ord-103',
      orderNumber: '#4819',
      tableNumber: 'Takeaway #3',
      orderType: 'TAKEAWAY',
      status: 'READY',
      elapsedSeconds: 1320, // 22 mins (Urgent red)
      customerName: 'Dawit G.',
      paymentInfo: {
        provider: 'Cash at Counter',
        isVerified: false
      },
      items: [
        { id: 'i6', qty: 1, name: 'Crispy Chicken Wrap', notes: '', isDone: true },
        { id: 'i7', qty: 1, name: 'Iced Caramel Frappe', notes: 'Extra whipped cream', isDone: true }
      ]
    }
  ];

  let soundEnabled = true;
  let activeFilter: 'ALL' | 'DINE_IN' | 'TAKEAWAY' = 'ALL';

  onMount(() => {
    // Timer ticker for real-time kitchen elapsed urgency
    const ticker = setInterval(() => {
      orders = orders.map(o => ({ ...o, elapsedSeconds: o.elapsedSeconds + 1 }));
    }, 1000);

    return () => clearInterval(ticker);
  });

  function formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function getUrgencyLevel(seconds: number): 'normal' | 'warning' | 'urgent' {
    if (seconds < 600) return 'normal';    // < 10 mins (Calm emerald)
    if (seconds < 1200) return 'warning';  // 10 - 20 mins (Amber)
    return 'urgent';                       // > 20 mins (Crimson pulse)
  }

  function advanceStatus(orderId: string) {
    soundFX.playPop();
    orders = orders.map(o => {
      if (o.id === orderId) {
        if (o.status === 'PENDING') {
          addToast({ type: 'info', title: 'Order Started', message: `Order ${o.orderNumber} moved to Preparing.` });
          return { ...o, status: 'PREPARING' };
        } else if (o.status === 'PREPARING') {
          soundFX.playSuccess();
          addToast({ type: 'success', title: 'Order Ready!', message: `Order ${o.orderNumber} is plated for delivery.` });
          return { ...o, status: 'READY' };
        }
      }
      return o;
    });
  }

  function bumpOrder(orderId: string) {
    soundFX.playSuccess();
    const bumped = orders.find(o => o.id === orderId);
    orders = orders.filter(o => o.id !== orderId);
    addToast({
      type: 'success',
      title: 'Ticket Bumped',
      message: `Order ${bumped?.orderNumber || ''} completed and archived.`
    });
  }

  function toggleItemDone(orderId: string, itemId: string) {
    soundFX.playTap();
    orders = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          items: o.items.map(item => item.id === itemId ? { ...item, isDone: !item.isDone } : item)
        };
      }
      return o;
    });
  }

  function addNewMockOrder() {
    soundFX.playPop();
    const newNum = `#${Math.floor(4822 + Math.random() * 50)}`;
    const newOrd: KdsOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: newNum,
      tableNumber: `Table ${Math.floor(1 + Math.random() * 12)}`,
      orderType: Math.random() > 0.3 ? 'DINE_IN' : 'TAKEAWAY',
      status: 'PENDING',
      elapsedSeconds: 0,
      customerName: 'Walk-in Guest',
      paymentInfo: {
        provider: 'telebirr',
        txnId: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
        isVerified: true
      },
      items: [
        { id: `it-1`, qty: 2, name: 'Special Burger', notes: 'No pickles' },
        { id: `it-2`, qty: 2, name: 'Iced Americano' }
      ]
    };

    orders = [newOrd, ...orders];
    addToast({
      type: 'warning',
      title: 'New Kitchen Ticket!',
      message: `${newOrd.orderNumber} (${newOrd.tableNumber}) just arrived.`
    });
  }
</script>

<svelte:head>
  <title>Kitchen Display System (KDS) | High-Performance Line</title>
</svelte:head>

<div class="kds-root">
  <!-- Top Command Bar -->
  <header class="kds-bar">
    <div class="kds-branding">
      <div class="kds-logo-box">
        <span class="fire-icon">🔥</span>
      </div>
      <div>
        <h1 class="kds-title">Kitchen Display System (KDS)</h1>
        <p class="kds-sub">Live Expo & Cook Line • Station 1</p>
      </div>
    </div>

    <!-- Center Filters -->
    <div class="kds-filter-group">
      <button 
        type="button" 
        class="filter-pill"
        class:active={activeFilter === 'ALL'}
        on:click={() => { soundFX.playTap(); activeFilter = 'ALL'; }}
      >
        All Tickets ({orders.length})
      </button>
      <button 
        type="button" 
        class="filter-pill"
        class:active={activeFilter === 'DINE_IN'}
        on:click={() => { soundFX.playTap(); activeFilter = 'DINE_IN'; }}
      >
        🍽️ Dine-In ({orders.filter(o => o.orderType === 'DINE_IN').length})
      </button>
      <button 
        type="button" 
        class="filter-pill"
        class:active={activeFilter === 'TAKEAWAY'}
        on:click={() => { soundFX.playTap(); activeFilter = 'TAKEAWAY'; }}
      >
        🛍️ Takeaway ({orders.filter(o => o.orderType === 'TAKEAWAY').length})
      </button>
    </div>

    <!-- Right Controls -->
    <div class="kds-controls">
      <button type="button" class="btn-tactile btn-secondary btn-kds-action" on:click={addNewMockOrder}>
        <span>+ Simulate Ticket</span>
      </button>
      <a href="/admin/orders" class="btn-tactile btn-ghost btn-kds-action">
        <span>Admin Suite →</span>
      </a>
    </div>
  </header>

  <!-- Kanban Three-Column Stage Layout -->
  <main class="kds-lanes-board">
    <!-- Column 1: Incoming / Pending -->
    <section class="kds-lane">
      <div class="lane-header pending-header">
        <div class="lane-title-box">
          <span class="lane-indicator yellow"></span>
          <h2>1. Incoming Tickets</h2>
        </div>
        <span class="lane-count-badge">
          {orders.filter(o => o.status === 'PENDING').length}
        </span>
      </div>

      <div class="lane-scroll-area">
        {#each orders.filter(o => o.status === 'PENDING' && (activeFilter === 'ALL' || o.orderType === activeFilter)) as order (order.id)}
          {@const urgency = getUrgencyLevel(order.elapsedSeconds)}
          <div class="ticket-card urgency-{urgency}">
            <div class="ticket-header-row">
              <div class="table-id-block">
                <span class="table-name">{order.tableNumber}</span>
                <span class="order-hash">{order.orderNumber}</span>
              </div>
              <div class="elapsed-badge badge-{urgency}">
                <span class="clock-icon">⏱️</span>
                <span class="font-mono">{formatTime(order.elapsedSeconds)}</span>
              </div>
            </div>

            <!-- Customer & Payment Proof -->
            <div class="ticket-meta-box">
              <span class="cust-name">👤 {order.customerName || 'Guest'}</span>
              <div class="payment-proof-chip">
                <span class="pay-provider">{order.paymentInfo.provider}</span>
                {#if order.paymentInfo.txnId}
                  <span class="pay-ref font-mono">TXN: {order.paymentInfo.txnId}</span>
                {/if}
              </div>
            </div>

            <!-- Items List -->
            <div class="ticket-items-list">
              {#each order.items as item}
                <div 
                  class="ticket-item-row"
                  class:checked-item={item.isDone}
                  on:click={() => toggleItemDone(order.id, item.id)}
                >
                  <span class="item-checkbox">{item.isDone ? '✓' : '○'}</span>
                  <div class="item-text-group">
                    <div class="item-headline">
                      <span class="item-qty">{item.qty}x</span>
                      <span class="item-dish-name">{item.name}</span>
                    </div>
                    {#if item.notes}
                      <span class="item-special-note">⚠️ {item.notes}</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>

            <!-- Action Button -->
            <button 
              type="button" 
              class="btn-tactile btn-primary btn-advance-ticket"
              on:click={() => advanceStatus(order.id)}
            >
              <span>Accept & Start Prep →</span>
            </button>
          </div>
        {/each}
      </div>
    </section>

    <!-- Column 2: In Preparation -->
    <section class="kds-lane">
      <div class="lane-header preparing-header">
        <div class="lane-title-box">
          <span class="lane-indicator blue"></span>
          <h2>2. In Preparation</h2>
        </div>
        <span class="lane-count-badge">
          {orders.filter(o => o.status === 'PREPARING').length}
        </span>
      </div>

      <div class="lane-scroll-area">
        {#each orders.filter(o => o.status === 'PREPARING' && (activeFilter === 'ALL' || o.orderType === activeFilter)) as order (order.id)}
          {@const urgency = getUrgencyLevel(order.elapsedSeconds)}
          <div class="ticket-card preparing-card urgency-{urgency}">
            <div class="ticket-header-row">
              <div class="table-id-block">
                <span class="table-name">{order.tableNumber}</span>
                <span class="order-hash">{order.orderNumber}</span>
              </div>
              <div class="elapsed-badge badge-{urgency}">
                <span class="clock-icon">⏱️</span>
                <span class="font-mono">{formatTime(order.elapsedSeconds)}</span>
              </div>
            </div>

            <div class="ticket-meta-box">
              <span class="cust-name">👤 {order.customerName || 'Guest'}</span>
              <div class="payment-proof-chip">
                <span class="pay-provider">{order.paymentInfo.provider}</span>
                {#if order.paymentInfo.txnId}
                  <span class="pay-ref font-mono">TXN: {order.paymentInfo.txnId}</span>
                {/if}
              </div>
            </div>

            <div class="ticket-items-list">
              {#each order.items as item}
                <div 
                  class="ticket-item-row"
                  class:checked-item={item.isDone}
                  on:click={() => toggleItemDone(order.id, item.id)}
                >
                  <span class="item-checkbox">{item.isDone ? '✓' : '○'}</span>
                  <div class="item-text-group">
                    <div class="item-headline">
                      <span class="item-qty">{item.qty}x</span>
                      <span class="item-dish-name">{item.name}</span>
                    </div>
                    {#if item.notes}
                      <span class="item-special-note">⚠️ {item.notes}</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>

            <button 
              type="button" 
              class="btn-tactile btn-advance-ticket btn-mark-ready"
              on:click={() => advanceStatus(order.id)}
            >
              <span>🔔 Plated & Ready for Service</span>
            </button>
          </div>
        {/each}
      </div>
    </section>

    <!-- Column 3: Ready to Serve / Bump -->
    <section class="kds-lane">
      <div class="lane-header ready-header">
        <div class="lane-title-box">
          <span class="lane-indicator green"></span>
          <h2>3. Ready for Service</h2>
        </div>
        <span class="lane-count-badge">
          {orders.filter(o => o.status === 'READY').length}
        </span>
      </div>

      <div class="lane-scroll-area">
        {#each orders.filter(o => o.status === 'READY' && (activeFilter === 'ALL' || o.orderType === activeFilter)) as order (order.id)}
          <div class="ticket-card ready-card animate-fade-up">
            <div class="ticket-header-row">
              <div class="table-id-block">
                <span class="table-name">{order.tableNumber}</span>
                <span class="order-hash">{order.orderNumber}</span>
              </div>
              <div class="elapsed-badge badge-ready-glow">
                <span>PLATED ✨</span>
              </div>
            </div>

            <div class="ticket-meta-box">
              <span class="cust-name">👤 {order.customerName || 'Guest'}</span>
              <span class="pay-ref font-mono">{order.paymentInfo.provider}</span>
            </div>

            <div class="ticket-items-list">
              {#each order.items as item}
                <div class="ticket-item-row checked-item">
                  <span class="item-checkbox">✓</span>
                  <div class="item-text-group">
                    <span class="item-dish-name">{item.qty}x {item.name}</span>
                  </div>
                </div>
              {/each}
            </div>

            <button 
              type="button" 
              class="btn-tactile btn-bump-order"
              on:click={() => bumpOrder(order.id)}
            >
              <span>✓ Bump Ticket (Delivered)</span>
            </button>
          </div>
        {/each}
      </div>
    </section>
  </main>
</div>

<style>
  .kds-root {
    min-height: 100vh;
    background: #090A0F;
    color: #F9FAFB;
    display: flex;
    flex-direction: column;
    font-family: var(--font-sans);
  }

  /* Command Bar */
  .kds-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: #12141D;
    border-bottom: 2px solid rgba(255, 255, 255, 0.08);
    gap: 1.5rem;
  }

  .kds-branding {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .kds-logo-box {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, #EF4444, #B91C1C);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.35);
  }

  .fire-icon {
    font-size: 1.5rem;
  }

  .kds-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: #FFFFFF;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .kds-sub {
    font-size: 0.8rem;
    color: #9CA3AF;
    margin: 0;
  }

  /* Filters */
  .kds-filter-group {
    display: flex;
    gap: 0.5rem;
    background: #1A1D2B;
    padding: 0.25rem;
    border-radius: var(--radius-full);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .filter-pill {
    padding: 0.45rem 1rem;
    border-radius: var(--radius-full);
    background: transparent;
    border: none;
    color: #9CA3AF;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .filter-pill:hover {
    color: #FFFFFF;
  }

  .filter-pill.active {
    background: var(--amber-500);
    color: #090A0F;
    font-weight: 700;
  }

  .kds-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .btn-kds-action {
    font-size: 0.85rem;
    padding: 0.55rem 1rem;
  }

  /* Kanban Board */
  .kds-lanes-board {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    padding: 1.25rem;
    overflow-x: auto;
  }

  .kds-lane {
    background: #12141D;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .lane-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 2px solid rgba(255, 255, 255, 0.08);
  }

  .lane-title-box {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .lane-indicator {
    width: 10px;
    height: 10px;
    border-radius: var(--radius-full);
  }

  .lane-indicator.yellow { background: var(--amber-400); box-shadow: 0 0 10px var(--amber-400); }
  .lane-indicator.blue { background: #3B82F6; box-shadow: 0 0 10px #3B82F6; }
  .lane-indicator.green { background: #10B981; box-shadow: 0 0 10px #10B981; }

  .lane-header h2 {
    font-size: 1.05rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  .lane-count-badge {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 800;
    padding: 0.15rem 0.6rem;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.08);
    color: #FFFFFF;
  }

  .lane-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Ticket Cards */
  .ticket-card {
    background: #1A1D2B;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-md);
    padding: 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    transition: all 150ms ease;
  }

  .ticket-card.urgency-urgent {
    border-color: #EF4444;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.25);
    animation: urgentPulse 2s infinite;
  }

  .ticket-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .table-id-block {
    display: flex;
    flex-direction: column;
  }

  .table-name {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--amber-400);
  }

  .order-hash {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: #9CA3AF;
  }

  .elapsed-badge {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.65rem;
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .badge-normal {
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .badge-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #F59E0B;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .badge-urgent {
    background: rgba(239, 68, 68, 0.2);
    color: #EF4444;
    border: 1px solid #EF4444;
  }

  .badge-ready-glow {
    background: #10B981;
    color: #090A0F;
    font-weight: 800;
  }

  .ticket-meta-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.82rem;
    color: #9CA3AF;
    padding-bottom: 0.5rem;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
  }

  .payment-proof-chip {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-xs);
  }

  .pay-provider {
    font-weight: 700;
    color: #FFFFFF;
  }

  /* Items */
  .ticket-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .ticket-item-row {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    cursor: pointer;
    padding: 0.4rem;
    border-radius: var(--radius-xs);
    transition: background 120ms ease;
  }

  .ticket-item-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .item-checkbox {
    font-size: 1rem;
    color: var(--amber-400);
    font-weight: 700;
    width: 18px;
    flex-shrink: 0;
  }

  .item-text-group {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .item-headline {
    display: flex;
    gap: 0.5rem;
    font-size: 0.95rem;
    font-weight: 700;
    color: #FFFFFF;
  }

  .item-qty {
    color: var(--amber-400);
    font-family: var(--font-mono);
  }

  .item-special-note {
    font-size: 0.8rem;
    color: #F87171;
    font-weight: 600;
    margin-top: 0.15rem;
  }

  .ticket-item-row.checked-item .item-dish-name {
    text-decoration: line-through;
    opacity: 0.45;
  }

  /* Advance Buttons */
  .btn-advance-ticket {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.95rem;
    font-weight: 700;
    border-radius: var(--radius-md);
  }

  .btn-mark-ready {
    background: linear-gradient(135deg, #3B82F6, #2563EB);
    color: #FFFFFF;
    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  }

  .btn-mark-ready:hover {
    background: #1D4ED8;
  }

  .btn-bump-order {
    width: 100%;
    padding: 0.85rem;
    background: #10B981;
    color: #090A0F;
    font-weight: 800;
    font-size: 1rem;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    transition: transform var(--duration-fast) var(--ease-spring);
  }

  .btn-bump-order:hover {
    background: #059669;
    transform: scale(1.02);
  }

  .btn-bump-order:active {
    transform: scale(0.97);
  }

  @keyframes urgentPulse {
    0%, 100% { border-color: #EF4444; }
    50% { border-color: rgba(239, 68, 68, 0.3); }
  }

  @media (max-width: 1024px) {
    .kds-lanes-board {
      grid-template-columns: 1fr;
    }
    .kds-bar {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
