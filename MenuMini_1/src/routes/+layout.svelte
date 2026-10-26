<script lang="ts">
  import '../app.css';
  import { toasts } from '$lib/audio/feedback';
</script>

<slot />

<!-- Global Tactile Toast Notifications -->
{#if $toasts.length > 0}
  <aside class="toast-hub" aria-live="polite">
    {#each $toasts as toast (toast.id)}
      <div class="toast-bubble toast-{toast.type}">
        <div class="toast-indicator"></div>
        <div class="toast-body">
          <strong class="toast-title">{toast.title}</strong>
          {#if toast.message}
            <p class="toast-msg">{toast.message}</p>
          {/if}
        </div>
      </div>
    {/each}
  </aside>
{/if}

<style>
  .toast-hub {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    z-index: 9999;
    max-width: 360px;
  }

  .toast-bubble {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #181B26;
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 0.85rem 1.15rem;
    border-radius: var(--radius-md);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
    animation: toastIn 180ms var(--ease-spring);
  }

  .toast-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .toast-success .toast-indicator { background: #10B981; }
  .toast-warning .toast-indicator { background: #F59E0B; }
  .toast-info .toast-indicator { background: #38BDF8; }
  .toast-error .toast-indicator { background: #EF4444; }

  .toast-title {
    font-size: 0.88rem;
    color: #FFFFFF;
    display: block;
  }

  .toast-msg {
    font-size: 0.78rem;
    color: var(--text-secondary);
    margin: 0;
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(12px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
</style>
