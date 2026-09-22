<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let dietaryTags = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Halal', 'Keto'];
  export let allergenTags = ['Nut-Free', 'Dairy-Free', 'Shellfish-Free'];

  let searchQuery = '';
  let selectedDietary = [];
  let selectedAllergens = [];
  
  let showFilters = false;
  const dispatch = createEventDispatcher();

  $: {
    dispatch('filter', {
      query: searchQuery.toLowerCase(),
      dietary: selectedDietary,
      allergens: selectedAllergens
    });
  }

  function toggleArray(arr: string[], item: string) {
    const idx = arr.indexOf(item);
    if (idx > -1) {
      return arr.filter(i => i !== item);
    } else {
      return [...arr, item];
    }
  }
</script>

<div class="search-filter-bar">
  <div class="search-input-wrapper">
    <span class="search-icon">🔍</span>
    <input 
      type="text" 
      bind:value={searchQuery} 
      placeholder="Search menu..." 
      class="search-input"
    />
    {#if searchQuery}
      <button class="clear-btn" on:click={() => searchQuery = ''}>×</button>
    {/if}
  </div>
  <button 
    class="filter-toggle-btn" 
    class:active={selectedDietary.length > 0 || selectedAllergens.length > 0}
    on:click={() => showFilters = !showFilters}
  >
    <span class="icon">⚙️</span>
  </button>
</div>

{#if showFilters}
  <div class="filter-panel">
    <div class="filter-group">
      <h4>Dietary Preferences</h4>
      <div class="chip-group">
        {#each dietaryTags as tag}
          <button 
            class="chip" 
            class:selected={selectedDietary.includes(tag)}
            on:click={() => selectedDietary = toggleArray(selectedDietary, tag)}
          >
            {tag}
          </button>
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <h4>Allergen Free</h4>
      <div class="chip-group">
        {#each allergenTags as tag}
          <button 
            class="chip" 
            class:selected={selectedAllergens.includes(tag)}
            on:click={() => selectedAllergens = toggleArray(selectedAllergens, tag)}
          >
            {tag}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .search-filter-bar {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    background: white;
    position: sticky;
    top: 60px; /* Below the header nav */
    z-index: 9;
    border-bottom: 1px solid var(--surface);
  }

  .search-input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    color: var(--text-muted);
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface);
    font-size: 1rem;
    transition: all 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary);
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .clear-btn {
    position: absolute;
    right: 1rem;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.25rem;
    cursor: pointer;
  }

  .filter-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-toggle-btn.active {
    background: #eff6ff;
    border-color: var(--primary);
    color: var(--primary);
  }

  .filter-panel {
    background: white;
    padding: 1rem;
    border-bottom: 1px solid var(--border);
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .filter-group {
    margin-bottom: 1.5rem;
  }

  .filter-group:last-child {
    margin-bottom: 0;
  }

  .filter-group h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    border-radius: 2rem;
    background: white;
    color: var(--text-main);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .chip.selected {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }
</style>
