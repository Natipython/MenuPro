<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { soundFX, addToast } from '$lib/utils/feedback';

  const businessSlug = $page.params.businessSlug || 'demo-restaurant';
  const branchSlug = $page.params.branchSlug || 'main-branch';
  const orderId = $page.params.orderId || 'ORD-4821';
  const tableNumber = $page.url.searchParams.get('table') || '4';

  type OrderStage = 'RECEIVED' | 'PREPARING' | 'READY' | 'SERVED';
  let currentStage: OrderStage = 'RECEIVED';
  let estimatedMinutes = 14;

  const stages: { id: OrderStage; label: string; desc: string; icon: string }[] = [
    { id: 'RECEIVED', label: 'Ticket Received', desc: 'Order received & payment registered', icon: '📝' },
    { id: 'PREPARING', label: 'In the Kitchen', desc: 'Chef is crafting your dishes', icon: '👨‍🍳' },
    { id: 'READY', label: 'Ready to Serve', desc: 'Plated and heading to your table', icon: '🍽️' },
    { id: 'SERVED', label: 'Served & Complete', desc: 'Enjoy your meal!', icon: '✨' }
  ];

  // Feedback state
  let rating = 5;
  let feedbackComment = '';
  let feedbackSubmitted = false;
  let waiterCalled = false;

  onMount(() => {
    // Simulated real-time WebSocket events from Kitchen Display System (KDS)
    const timer1 = setTimeout(() => {
      currentStage = 'PREPARING';
      estimatedMinutes = 8;
      soundFX.playPop();
      addToast({ type: 'info', title: 'Kitchen Update', message: 'The chef has started preparing your order!' });
    }, 4500);

    const timer2 = setTimeout(() => {
      currentStage = 'READY';
      estimatedMinutes = 2;
      soundFX.playSuccess();
      addToast({ type: 'success', title: 'Order Ready!', message: 'Your server is bringing your dishes now.' });
    }, 10000);

    const timer3 = setTimeout(() => {
      currentStage = 'SERVED';
      estimatedMinutes = 0;
      soundFX.playSuccess();
    }, 16000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  });

  function callWaiter() {
    soundFX.playTap();
    waiterCalled = true;
    addToast({
      type: 'success',
      title: 'Server Alerted',
      message: `A waiter has been dispatched to Table ${tableNumber}.`
    });
  }

  function submitFeedback() {
    soundFX.playSuccess();
    feedbackSubmitted = true;
    addToast({
      type: 'success',
      title: 'Thank You!',
      message: 'Your dining feedback was shared with the restaurant manager.'
    });
  }
</script>

<svelte:head>
  <title>Live Order Tracking | #{orderId}</title>
</svelte:head>

<div class="tracker-layout">
  <div class="tracker-card">
    <!-- Header -->
    <header class="tracker-header">
      <div class="badge-status-live">
        <span class="live-dot"></span>
        <span>LIVE KITCHEN FEED</span>
      </div>
      <h1 class="order-headline">Order #{orderId}</h1>
      <p class="table-subhead">Table {tableNumber} • Dine-In Service</p>
    </header>

    <!-- Radar Pulse Ring & Stage Icon -->
    <div class="radar-hero-box">
      <div class="radar-circle-outer">
        <div class="radar-circle-middle">
          <div class="radar-circle-center">
            <span class="radar-stage-emoji">
              {#if currentStage === 'RECEIVED'}
                📋
              {:else if currentStage === 'PREPARING'}
                🔥
              {:else if currentStage === 'READY'}
                🔔
              {:else}
                🎉
              {/if}
            </span>
          </div>
        </div>
      </div>

      <div class="stage-callout">
        <h2 class="stage-title">
          {#if currentStage === 'RECEIVED'}
            Kitchen Ticket Confirmed
          {:else if currentStage === 'PREPARING'}
            Sizzling in the Kitchen
          {:else if currentStage === 'READY'}
            Plated & En Route!
          {:else}
            Order Completed
          {/if}
        </h2>
        <p class="stage-desc">
          {#if estimatedMinutes > 0}
            Estimated preparation time: <strong>~{estimatedMinutes} mins</strong>
          {:else}
            Your meal has been delivered. Enjoy every bite!
          {/if}
        </p>
      </div>
    </div>

    <!-- Stepper Timeline -->
    <div class="stepper-timeline">
      {#each stages as stage, idx}
        {@const isPast = stages.findIndex(s => s.id === currentStage) >= idx}
        {@const isCurrent = currentStage === stage.id}
        <div class="step-row" class:completed={isPast} class:current={isCurrent}>
          <div class="step-indicator-col">
            <div class="step-node">
              {#if isPast && !isCurrent}
                <svg class="check-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              {:else}
                <span class="step-num-text">{idx + 1}</span>
              {/if}
            </div>
            {#if idx < stages.length - 1}
              <div class="step-track" class:active-track={isPast && !isCurrent}></div>
            {/if}
          </div>

          <div class="step-content">
            <div class="step-header">
              <span class="step-icon">{stage.icon}</span>
              <h3 class="step-label">{stage.label}</h3>
              {#if isCurrent}
                <span class="badge-in-progress">In Progress</span>
              {/if}
            </div>
            <p class="step-info">{stage.desc}</p>
          </div>
        </div>
      {/each}
    </div>

    <!-- Actions: Call Server & Star Rating -->
    <div class="action-footer-panel">
      {#if currentStage !== 'SERVED'}
        <button 
          type="button" 
          class="btn-tactile btn-secondary btn-call-waiter"
          on:click={callWaiter}
          disabled={waiterCalled}
        >
          <span class="bell-icon">🔔</span>
          <span>{waiterCalled ? 'Server Alerted (Table ' + tableNumber + ')' : 'Call Waiter to Table'}</span>
        </button>
      {:else}
        <!-- Feedback Form -->
        <div class="feedback-card">
          {#if !feedbackSubmitted}
            <h3 class="feedback-heading">How was your dining experience?</h3>
            <div class="stars-row">
              {#each [1, 2, 3, 4, 5] as star}
                <button 
                  type="button" 
                  class="star-btn"
                  class:active-star={rating >= star}
                  on:click={() => { soundFX.playTap(); rating = star; }}
                >★</button>
              {/each}
            </div>
            <textarea 
              bind:value={feedbackComment} 
              placeholder="Leave a compliment for the chef or service..."
              rows="2"
              class="feedback-input"
            ></textarea>
            <button 
              type="button" 
              class="btn-tactile btn-primary btn-submit-feedback"
              on:click={submitFeedback}
            >
              Submit Review
            </button>
          {:else}
            <div class="feedback-thanks">
              <span class="thanks-icon">❤️</span>
              <h4>Thank you for dining with us!</h4>
              <p>Your feedback helps our team maintain exceptional culinary quality.</p>
            </div>
          {/if}
        </div>
      {/if}

      <a href="/{businessSlug}/{branchSlug}" class="btn-return-menu">
        ← Return to Digital Menu
      </a>
    </div>
  </div>
</div>

<style>
  .tracker-layout {
    min-height: 100vh;
    background: var(--bg-dark);
    display: flex;
    justify-content: center;
    padding: 2rem 1rem 4rem 1rem;
    color: var(--text-primary);
  }

  .tracker-card {
    width: 100%;
    max-width: 540px;
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2rem 1.5rem;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6);
  }

  .tracker-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .badge-status-live {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: var(--radius-full);
    color: var(--color-success);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    margin-bottom: 0.75rem;
  }

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--color-success);
    box-shadow: 0 0 10px var(--color-success);
    animation: livePulse 1.5s infinite;
  }

  .order-headline {
    font-family: var(--font-serif);
    font-size: 1.85rem;
    color: #FFFFFF;
    margin: 0 0 0.25rem 0;
  }

  .table-subhead {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Radar Pulse Hero */
  .radar-hero-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2.5rem;
    text-align: center;
  }

  .radar-circle-outer {
    width: 130px;
    height: 130px;
    border-radius: var(--radius-full);
    background: rgba(245, 158, 11, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 1.25rem;
  }

  .radar-circle-middle {
    width: 95px;
    height: 95px;
    border-radius: var(--radius-full);
    background: rgba(245, 158, 11, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 25px rgba(245, 158, 11, 0.25);
  }

  .radar-circle-center {
    width: 65px;
    height: 65px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, var(--amber-500), var(--amber-600));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 15px var(--amber-glow);
  }

  .radar-stage-emoji {
    font-size: 1.8rem;
  }

  .stage-title {
    font-family: var(--font-serif);
    font-size: 1.45rem;
    color: #FFFFFF;
    margin: 0 0 0.35rem 0;
  }

  .stage-desc {
    font-size: 0.92rem;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Stepper Timeline */
  .stepper-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 2.5rem;
    padding: 0 0.5rem;
  }

  .step-row {
    display: flex;
    gap: 1.25rem;
    position: relative;
  }

  .step-indicator-col {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .step-node {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: 2px solid var(--border);
    color: var(--text-tertiary);
    font-size: 0.85rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    transition: all 200ms ease;
  }

  .step-row.completed .step-node {
    background: var(--color-success);
    border-color: var(--color-success);
    color: #090A0F;
  }

  .step-row.current .step-node {
    background: var(--amber-500);
    border-color: var(--amber-400);
    color: #090A0F;
    box-shadow: 0 0 15px var(--amber-glow);
  }

  .check-svg {
    width: 16px;
    height: 16px;
  }

  .step-track {
    width: 2px;
    flex: 1;
    background: var(--border);
    min-height: 38px;
    margin: 4px 0;
  }

  .step-track.active-track {
    background: var(--color-success);
  }

  .step-content {
    flex: 1;
    padding-bottom: 1.5rem;
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
  }

  .step-icon {
    font-size: 1rem;
  }

  .step-label {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-secondary);
    margin: 0;
  }

  .step-row.completed .step-label,
  .step-row.current .step-label {
    color: #FFFFFF;
  }

  .badge-in-progress {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    background: rgba(245, 158, 11, 0.15);
    color: var(--amber-400);
    border-radius: var(--radius-xs);
  }

  .step-info {
    font-size: 0.83rem;
    color: var(--text-tertiary);
    margin: 0;
    line-height: 1.4;
  }

  /* Footer Action */
  .action-footer-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .btn-call-waiter {
    width: 100%;
    padding: 0.95rem;
    font-size: 0.95rem;
    gap: 0.5rem;
  }

  .bell-icon {
    font-size: 1.1rem;
  }

  .btn-return-menu {
    text-align: center;
    font-size: 0.88rem;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 120ms ease;
  }

  .btn-return-menu:hover {
    color: #FFFFFF;
  }

  /* Feedback Card */
  .feedback-card {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    text-align: center;
  }

  .feedback-heading {
    font-family: var(--font-serif);
    font-size: 1.15rem;
    color: #FFFFFF;
    margin-bottom: 0.75rem;
  }

  .stars-row {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .star-btn {
    background: transparent;
    border: none;
    font-size: 1.8rem;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 120ms ease;
  }

  .star-btn.active-star {
    color: var(--amber-400);
    transform: scale(1.1);
  }

  .feedback-input {
    width: 100%;
    padding: 0.75rem;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-family: var(--font-sans);
    font-size: 0.85rem;
    outline: none;
    resize: none;
    margin-bottom: 0.75rem;
  }

  .btn-submit-feedback {
    width: 100%;
    padding: 0.85rem;
  }

  .feedback-thanks {
    padding: 1rem;
  }

  .thanks-icon {
    font-size: 2rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  @keyframes livePulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }
</style>
