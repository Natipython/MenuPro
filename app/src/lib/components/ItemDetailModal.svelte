<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let item: any = null;
  export let isOpen: boolean = false;

  const dispatch = createEventDispatcher();
  
  // Track selected options: { [groupId]: selectedOptionId[] | boolean | string }
  let selections: Record<string, any> = {};
  
  // Initialize selections based on defaults
  $: if (isOpen && item) {
    selections = {};
    if (item.optionGroups) {
      item.optionGroups.forEach((group: any) => {
        if (group.type === 'SINGLE_SELECT' || group.type === 'MULTI_SELECT') {
          const defaults = group.options.filter((o: any) => o.isDefault).map((o: any) => o.id);
          selections[group.id] = defaults;
        } else if (group.type === 'TOGGLE') {
          selections[group.id] = false;
        } else {
          selections[group.id] = '';
        }
      });
    }
  }

  function close() {
    isOpen = false;
    dispatch('close');
  }

  function addToCart() {
    dispatch('add', { item, selections });
    close();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }
</script>

{#if isOpen && item}
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-content" class:open={isOpen}>
      <button class="close-btn" on:click={close}>&times;</button>
      
      <!-- Item Image -->
      <div class="modal-image-container">
        {#if item.imageUrl}
          <img src={item.imageUrl} alt={item.name} class="modal-image" />
        {:else}
          <div class="modal-image-placeholder"></div>
        {/if}
      </div>

      <!-- Item Info -->
      <div class="modal-body">
        <h2>{item.name}</h2>
        <p class="price">${item.basePrice?.toFixed(2) || '0.00'}</p>
        {#if item.description}
          <p class="description">{item.description}</p>
        {/if}

        <!-- Dynamic Option Groups -->
        {#if item.optionGroups && item.optionGroups.length > 0}
          <div class="options-container">
            {#each item.optionGroups as group}
              <div class="option-group">
                <div class="group-header">
                  <h3>{group.name}</h3>
                  {#if group.isRequired}
                    <span class="badge required">Required</span>
                  {/if}
                </div>

                {#if group.type === 'SINGLE_SELECT'}
                  <div class="choices">
                    {#each group.options as option}
                      <label class="choice-row">
                        <input type="radio" name={group.id} bind:group={selections[group.id]} value={[option.id]} />
                        <span class="choice-label">{option.label}</span>
                        {#if option.priceModifier > 0}
                          <span class="choice-price">+${option.priceModifier.toFixed(2)}</span>
                        {/if}
                      </label>
                    {/each}
                  </div>
                {:else if group.type === 'MULTI_SELECT'}
                  <div class="choices">
                    {#each group.options as option}
                      <label class="choice-row">
                        <input type="checkbox" bind:group={selections[group.id]} value={option.id} />
                        <span class="choice-label">{option.label}</span>
                        {#if option.priceModifier > 0}
                          <span class="choice-price">+${option.priceModifier.toFixed(2)}</span>
                        {/if}
                      </label>
                    {/each}
                  </div>
                {:else if group.type === 'TOGGLE'}
                  <label class="choice-row toggle-row">
                    <span class="choice-label">{group.name}</span>
                    <input type="checkbox" bind:checked={selections[group.id]} />
                  </label>
                {:else if group.type === 'TEXT_INPUT'}
                  <textarea bind:value={selections[group.id]} placeholder="Add special instructions..."></textarea>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Sticky Footer Action -->
      <div class="modal-footer">
        <div class="quantity-selector">
          <button>-</button>
          <span>1</span>
          <button>+</button>
        </div>
        <button class="add-to-cart-btn" on:click={addToCart}>
          Add to Order • ${item.basePrice?.toFixed(2) || '0.00'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: flex-end;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    width: 100%;
    max-height: 90vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    display: flex;
    flex-direction: column;
    position: relative;
    transform: translateY(100%);
    animation: slideUp 0.3s forwards ease-out;
  }

  @keyframes slideUp {
    to { transform: translateY(0); }
  }

  .close-btn {
    position: absolute;
    top: 1rem; right: 1rem;
    background: rgba(255,255,255,0.8);
    border: none;
    border-radius: 50%;
    width: 32px; height: 32px;
    font-size: 1.5rem;
    line-height: 1;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .modal-image-container {
    height: 250px;
    width: 100%;
  }

  .modal-image-placeholder {
    width: 100%; height: 100%;
    background: var(--surface);
  }

  .modal-body {
    padding: 1.5rem 1.5rem 0;
    overflow-y: auto;
    flex: 1;
  }

  .modal-body h2 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .price { font-size: 1.25rem; font-weight: 600; color: var(--primary); margin-bottom: 1rem; }
  .description { color: var(--text-muted); line-height: 1.5; margin-bottom: 2rem; }

  .options-container {
    border-top: 1px solid var(--border);
    padding-top: 1.5rem;
    padding-bottom: 2rem;
  }

  .option-group {
    margin-bottom: 1.5rem;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .group-header h3 { font-size: 1.1rem; margin: 0; }
  
  .badge.required {
    background: #fee2e2;
    color: #ef4444;
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    font-weight: 600;
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .choice-row {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background 0.2s;
  }

  .choice-row:hover {
    background: var(--surface);
  }

  .choice-label {
    margin-left: 0.75rem;
    flex: 1;
  }

  .choice-price {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  textarea {
    width: 100%;
    min-height: 80px;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-family: inherit;
    resize: vertical;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    background: white;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 1rem;
    box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);
  }

  .quantity-selector {
    display: flex;
    align-items: center;
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: 0.25rem;
  }

  .quantity-selector button {
    border: none;
    background: white;
    width: 36px; height: 36px;
    border-radius: var(--radius-sm);
    font-size: 1.25rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .quantity-selector span {
    width: 40px;
    text-align: center;
    font-weight: 600;
  }

  .add-to-cart-btn {
    flex: 1;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .add-to-cart-btn:hover {
    background: var(--primary-hover);
  }
</style>
