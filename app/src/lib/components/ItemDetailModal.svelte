<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { soundFX, addToast } from '$lib/utils/feedback';
  
  export let item: any = null;
  export let isOpen: boolean = false;
  export let currency: string = 'ETB';

  const dispatch = createEventDispatcher();
  
  // Track selected options: { [groupId]: selectedOptionId[] | boolean | string }
  let selections: Record<string, any> = {};
  let quantity: number = 1;
  let specialInstructions: string = '';

  // Initialize selections when modal opens with an item
  $: if (isOpen && item) {
    selections = {};
    quantity = 1;
    specialInstructions = '';

    if (item.optionGroups) {
      item.optionGroups.forEach((group: any) => {
        if (group.type === 'SINGLE_SELECT') {
          const defaultOpt = group.options?.find((o: any) => o.isDefault) || group.options?.[0];
          selections[group.id] = defaultOpt ? defaultOpt.id : '';
        } else if (group.type === 'MULTI_SELECT') {
          const defaults = group.options?.filter((o: any) => o.isDefault).map((o: any) => o.id) || [];
          selections[group.id] = defaults;
        } else if (group.type === 'TOGGLE') {
          selections[group.id] = false;
        } else {
          selections[group.id] = '';
        }
      });
    }
  }

  // Calculate live total price based on base price, option modifiers, and quantity
  $: optionsTotal = calculateOptionsTotal(item, selections);
  $: unitPrice = (Number(item?.basePrice) || 0) + optionsTotal;
  $: finalTotal = unitPrice * quantity;

  function calculateOptionsTotal(itemObj: any, currentSelections: Record<string, any>): number {
    if (!itemObj?.optionGroups) return 0;
    let sum = 0;

    itemObj.optionGroups.forEach((group: any) => {
      const selected = currentSelections[group.id];
      if (!selected) return;

      if (group.type === 'SINGLE_SELECT') {
        const opt = group.options?.find((o: any) => o.id === selected);
        if (opt?.priceModifier) sum += Number(opt.priceModifier);
      } else if (group.type === 'MULTI_SELECT' && Array.isArray(selected)) {
        selected.forEach((optId: string) => {
          const opt = group.options?.find((o: any) => o.id === optId);
          if (opt?.priceModifier) sum += Number(opt.priceModifier);
        });
      }
    });

    return sum;
  }

  function handleSingleSelect(groupId: string, optionId: string) {
    soundFX.playTap();
    selections[groupId] = optionId;
    selections = { ...selections };
  }

  function handleMultiSelect(groupId: string, optionId: string) {
    soundFX.playTap();
    const current = (selections[groupId] || []) as string[];
    if (current.includes(optionId)) {
      selections[groupId] = current.filter(id => id !== optionId);
    } else {
      selections[groupId] = [...current, optionId];
    }
    selections = { ...selections };
  }

  function updateQty(delta: number) {
    soundFX.playTap();
    const next = quantity + delta;
    if (next >= 1 && next <= 99) {
      quantity = next;
    }
  }

  function close() {
    isOpen = false;
    dispatch('close');
  }

  function addToCart() {
    soundFX.playPop();
    dispatch('add', {
      item,
      selections,
      quantity,
      specialInstructions,
      unitPrice,
      totalPrice: finalTotal
    });
    addToast({
      type: 'success',
      title: 'Added to Order',
      message: `${quantity}x ${item.name} (${finalTotal.toFixed(2)} ${currency})`
    });
    close();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }
</script>

{#if isOpen && item}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true">
    <div class="modal-sheet">
      <!-- iOS Drag Indicator -->
      <div class="drag-indicator-bar" on:click={close}>
        <div class="drag-handle"></div>
      </div>

      <!-- Close Button -->
      <button class="sheet-close-btn" on:click={close} aria-label="Close modal">&times;</button>
      
      <!-- Scrollable Body -->
      <div class="modal-scroll-area">
        <!-- Dish Hero Banner -->
        <div class="dish-hero">
          {#if item.imageUrl}
            <img src={item.imageUrl} alt={item.name} class="dish-hero-img" />
          {:else}
            <div class="dish-hero-fallback">
              <span class="fallback-icon">🍽️</span>
              <div class="ambient-glow"></div>
            </div>
          {/if}

          {#if item.isPopular}
            <span class="badge-floating popular">🔥 Chef's Favorite</span>
          {/if}
        </div>

        <div class="dish-info-header">
          <div class="title-price-row">
            <h2 class="dish-title">{item.name}</h2>
            <span class="dish-price">{item.basePrice?.toFixed(2)} {currency}</span>
          </div>

          {#if item.description}
            <p class="dish-description">{item.description}</p>
          {/if}

          <!-- Dietary / Allergen Badges -->
          {#if item.tags && item.tags.length > 0}
            <div class="dish-tags">
              {#each item.tags as tag}
                <span class="tag-chip">{tag}</span>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Dynamic Option Groups -->
        {#if item.optionGroups && item.optionGroups.length > 0}
          <div class="options-container">
            {#each item.optionGroups as group}
              <div class="option-group-card">
                <div class="group-header">
                  <div>
                    <h3 class="group-title">{group.name}</h3>
                    <p class="group-subtitle">
                      {group.type === 'SINGLE_SELECT' ? 'Choose 1 option' : 'Choose any options'}
                    </p>
                  </div>
                  {#if group.isRequired}
                    <span class="badge-required">Required</span>
                  {/if}
                </div>

                {#if group.type === 'SINGLE_SELECT'}
                  <div class="choices-grid">
                    {#each group.options as option}
                      {@const isSelected = selections[group.id] === option.id}
                      <button 
                        type="button"
                        class="choice-card"
                        class:selected={isSelected}
                        on:click={() => handleSingleSelect(group.id, option.id)}
                      >
                        <div class="radio-indicator" class:checked={isSelected}>
                          <div class="radio-dot"></div>
                        </div>
                        <span class="choice-name">{option.label}</span>
                        {#if option.priceModifier && option.priceModifier > 0}
                          <span class="choice-add-price">+{option.priceModifier.toFixed(2)} {currency}</span>
                        {/if}
                      </button>
                    {/each}
                  </div>
                {:else if group.type === 'MULTI_SELECT'}
                  <div class="choices-grid">
                    {#each group.options as option}
                      {@const isSelected = (selections[group.id] || []).includes(option.id)}
                      <button 
                        type="button"
                        class="choice-card"
                        class:selected={isSelected}
                        on:click={() => handleMultiSelect(group.id, option.id)}
                      >
                        <div class="checkbox-indicator" class:checked={isSelected}>
                          {#if isSelected}
                            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          {/if}
                        </div>
                        <span class="choice-name">{option.label}</span>
                        {#if option.priceModifier && option.priceModifier > 0}
                          <span class="choice-add-price">+{option.priceModifier.toFixed(2)} {currency}</span>
                        {/if}
                      </button>
                    {/each}
                  </div>
                {:else if group.type === 'TOGGLE'}
                  <label class="toggle-card">
                    <span class="choice-name">{group.name}</span>
                    <input 
                      type="checkbox" 
                      class="toggle-input"
                      bind:checked={selections[group.id]} 
                      on:change={() => soundFX.playTap()}
                    />
                  </label>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Special Notes / Instructions -->
        <div class="special-notes-card">
          <label for="dish-notes" class="notes-label">Special Kitchen Request (Optional)</label>
          <textarea 
            id="dish-notes"
            bind:value={specialInstructions}
            rows="2"
            placeholder="e.g. Extra spicy, dressing on the side, no onions..."
            class="notes-textarea"
          ></textarea>
        </div>
      </div>

      <!-- Sticky Bottom Action Footer -->
      <footer class="modal-footer">
        <!-- Quantity Stepper -->
        <div class="stepper-box">
          <button 
            type="button" 
            class="stepper-btn" 
            on:click={() => updateQty(-1)} 
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >-</button>
          <span class="stepper-value">{quantity}</span>
          <button 
            type="button" 
            class="stepper-btn" 
            on:click={() => updateQty(1)}
            aria-label="Increase quantity"
          >+</button>
        </div>

        <!-- Add To Cart Button with Dynamic Price Odometer -->
        <button 
          type="button" 
          class="btn-tactile btn-primary btn-add-order" 
          on:click={addToCart}
        >
          <span>Add to Order</span>
          <span class="divider-dot">•</span>
          <span class="dynamic-price">{finalTotal.toFixed(2)} {currency}</span>
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(9, 10, 15, 0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 900;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    animation: fadeIn 200ms ease forwards;
  }

  .modal-sheet {
    width: 100%;
    max-width: 620px;
    max-height: 90vh;
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    box-shadow: 0 -10px 40px -5px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    animation: slideUp 280ms var(--ease-spring) forwards;
  }

  .drag-indicator-bar {
    width: 100%;
    padding: 0.75rem 0 0.25rem 0;
    display: flex;
    justify-content: center;
    cursor: pointer;
  }

  .drag-handle {
    width: 44px;
    height: 5px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-full);
  }

  .sheet-close-btn {
    position: absolute;
    top: 0.85rem;
    right: 1.25rem;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    transition: all 150ms ease;
  }

  .sheet-close-btn:hover {
    background: rgba(255, 255, 255, 0.16);
    color: #FFFFFF;
    transform: scale(1.05);
  }

  .modal-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 0 1.25rem 1.5rem 1.25rem;
  }

  /* Dish Hero */
  .dish-hero {
    position: relative;
    width: 100%;
    height: 220px;
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 1.25rem;
    background: var(--surface-elevated);
  }

  .dish-hero-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .dish-hero-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle, #202436 0%, #12141D 100%);
    position: relative;
  }

  .fallback-icon {
    font-size: 3.5rem;
    z-index: 1;
  }

  .badge-floating.popular {
    position: absolute;
    bottom: 1rem;
    left: 1rem;
    background: rgba(217, 119, 6, 0.9);
    backdrop-filter: blur(8px);
    color: #FFFFFF;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius-full);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  /* Dish Header */
  .dish-info-header {
    margin-bottom: 1.5rem;
  }

  .title-price-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .dish-title {
    font-family: var(--font-serif);
    font-size: 1.65rem;
    color: #FFFFFF;
    margin: 0;
    line-height: 1.2;
  }

  .dish-price {
    font-family: var(--font-mono);
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--amber-400);
    white-space: nowrap;
  }

  .dish-description {
    font-size: 0.92rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 0.75rem;
  }

  .dish-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .tag-chip {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
  }

  /* Options */
  .options-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .option-group-card {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .group-title {
    font-size: 1rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  .group-subtitle {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    margin: 0.15rem 0 0 0;
  }

  .badge-required {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.2rem 0.5rem;
    background: var(--color-warning-bg);
    color: var(--color-warning);
    border-radius: var(--radius-xs);
  }

  .choices-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .choice-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    transition: all 140ms ease;
    color: var(--text-primary);
  }

  .choice-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .choice-card.selected {
    border-color: var(--amber-500);
    background: rgba(245, 158, 11, 0.08);
  }

  .radio-indicator {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full);
    border: 2px solid var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: border-color 140ms ease;
  }

  .radio-indicator.checked {
    border-color: var(--amber-400);
  }

  .radio-dot {
    width: 10px;
    height: 10px;
    border-radius: var(--radius-full);
    background: var(--amber-400);
    transform: scale(0);
    transition: transform 140ms var(--ease-spring);
  }

  .radio-indicator.checked .radio-dot {
    transform: scale(1);
  }

  .checkbox-indicator {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-xs);
    border: 2px solid var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 140ms ease;
  }

  .checkbox-indicator.checked {
    background: var(--amber-500);
    border-color: var(--amber-500);
  }

  .check-icon {
    width: 14px;
    height: 14px;
    color: #090A0F;
  }

  .choice-name {
    flex: 1;
    font-size: 0.92rem;
    font-weight: 500;
  }

  .choice-add-price {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--amber-400);
  }

  .special-notes-card {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem;
  }

  .notes-label {
    display: block;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .notes-textarea {
    width: 100%;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    color: #FFFFFF;
    font-family: var(--font-sans);
    font-size: 0.88rem;
    resize: none;
    outline: none;
    transition: border-color 150ms ease;
  }

  .notes-textarea:focus {
    border-color: var(--amber-500);
  }

  /* Modal Footer */
  .modal-footer {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: var(--surface-dark);
    border-top: 1px solid var(--border);
  }

  .stepper-box {
    display: flex;
    align-items: center;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.25rem;
    gap: 0.5rem;
  }

  .stepper-btn {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-sm);
    background: transparent;
    border: none;
    color: #FFFFFF;
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 120ms ease;
  }

  .stepper-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }

  .stepper-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .stepper-value {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 700;
    color: #FFFFFF;
    min-width: 24px;
    text-align: center;
  }

  .btn-add-order {
    flex: 1;
    padding: 0.95rem 1.25rem;
    font-size: 1rem;
  }

  .divider-dot {
    opacity: 0.5;
  }

  .dynamic-price {
    font-family: var(--font-mono);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
</style>
