<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { toasts, removeToast } from '$lib/utils/feedback';
  import { onNavigate } from '$app/navigation';

  // Native View Transitions API support on SvelteKit navigation
  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<div class="app-shell">
  <main class="page-wrapper">
    <slot />
  </main>

  <!-- Global Toast Notification Layer -->
  <div class="toast-container" aria-live="polite">
    {#each $toasts as toast (toast.id)}
      <div 
        class="toast-card toast-{toast.type}" 
        role="alert"
        on:click={() => removeToast(toast.id)}
      >
        <div class="toast-indicator"></div>
        <div class="toast-content">
          {#if toast.title}
            <h4 class="toast-title">{toast.title}</h4>
          {/if}
          <p class="toast-message">{toast.message}</p>
        </div>
        <button class="toast-close" aria-label="Close notification">&times;</button>
      </div>
    {/each}
  </div>
</div>

<style>
  .app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .page-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Toast Notification Stack */
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 400px;
    width: calc(100vw - 3rem);
    pointer-events: none;
  }

  .toast-card {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(26, 29, 43, 0.95);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    border-radius: var(--radius-md);
    padding: 0.85rem 1rem;
    color: #F9FAFB;
    cursor: pointer;
    animation: toastSlideUp 280ms var(--ease-spring) forwards;
    transition: transform 150ms ease, opacity 150ms ease;
  }

  .toast-card:hover {
    transform: translateY(-2px);
  }

  .toast-indicator {
    width: 6px;
    height: 32px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }

  .toast-success .toast-indicator { background: var(--color-success); box-shadow: 0 0 10px var(--color-success); }
  .toast-warning .toast-indicator { background: var(--color-warning); box-shadow: 0 0 10px var(--color-warning); }
  .toast-error .toast-indicator { background: var(--color-danger); box-shadow: 0 0 10px var(--color-danger); }
  .toast-info .toast-indicator { background: var(--color-info); box-shadow: 0 0 10px var(--color-info); }

  .toast-content {
    flex: 1;
  }

  .toast-title {
    font-size: 0.88rem;
    font-weight: 700;
    margin: 0 0 0.15rem 0;
    color: #FFFFFF;
  }

  .toast-message {
    font-size: 0.82rem;
    color: #9CA3AF;
    margin: 0;
    line-height: 1.35;
  }

  .toast-close {
    background: transparent;
    border: none;
    color: #6B7280;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0 0.25rem;
    line-height: 1;
  }

  .toast-close:hover {
    color: #FFFFFF;
  }

  @keyframes toastSlideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 640px) {
    .toast-container {
      bottom: 1rem;
      right: 1rem;
      left: 1rem;
      width: auto;
    }
  }
</style>
