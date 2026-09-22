<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let branches = [];
  export let currentBranchSlug = '';
  
  let isOpen = false;
  const dispatch = createEventDispatcher();

  function selectBranch(slug: string) {
    isOpen = false;
    if (slug !== currentBranchSlug) {
      dispatch('change', slug);
      // In real app, this would trigger navigation: goto(`/${businessSlug}/${slug}`)
    }
  }
</script>

<div class="branch-selector">
  <button class="selector-btn" on:click={() => isOpen = !isOpen}>
    <span class="icon">📍</span>
    <span class="label">
      {branches.find(b => b.slug === currentBranchSlug)?.name || 'Select Location'}
    </span>
    <span class="chevron">▼</span>
  </button>

  {#if isOpen}
    <div class="dropdown-backdrop" on:click={() => isOpen = false}></div>
    <div class="dropdown-menu">
      {#each branches as branch}
        <button 
          class="dropdown-item" 
          class:active={branch.slug === currentBranchSlug}
          on:click={() => selectBranch(branch.slug)}
        >
          <div class="branch-info">
            <strong>{branch.name}</strong>
            <small>{branch.address || 'Loading address...'}</small>
          </div>
          {#if branch.slug === currentBranchSlug}
            <span class="check">✓</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .branch-selector {
    position: relative;
    display: inline-block;
  }

  .selector-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: white;
    border: 1px solid var(--border);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-lg);
    font-size: 0.875rem;
    color: var(--text-main);
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .chevron {
    font-size: 0.6rem;
    color: var(--text-muted);
  }

  .dropdown-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 99;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    min-width: 250px;
    z-index: 100;
    overflow: hidden;
  }

  .dropdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    text-align: left;
    padding: 1rem;
    border: none;
    background: none;
    border-bottom: 1px solid var(--surface);
    cursor: pointer;
    transition: background 0.2s;
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .dropdown-item:hover {
    background: var(--surface);
  }

  .dropdown-item.active {
    background: #eff6ff;
  }

  .branch-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .branch-info strong {
    font-size: 0.875rem;
    color: var(--text-main);
  }

  .branch-info small {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .check {
    color: var(--primary);
    font-weight: bold;
  }
</style>
