<script lang="ts">
  import { filterMenuDishes, type MenuCatalogView, type MenuDishView } from './catalog-view';

  export let catalog: MenuCatalogView;
  export let onDetails: (dish: MenuDishView) => void;
  export let quantities: Record<string, number> = {};
  export let orderActions: { add: (id: string) => void; decrease: (id: string) => void } | undefined = undefined;
  export let onCategoryChange: () => void = () => {};

  let selectedCategory: string | null = null;
  let searchQuery = '';
  let catalogKey = catalog.key;
  $: if (catalog.key !== catalogKey) {
    catalogKey = catalog.key;
    selectedCategory = null;
    searchQuery = '';
  }
  $: filteredDishes = filterMenuDishes(catalog.dishes, selectedCategory, searchQuery);
  function selectCategory(id: string | null) {
    onCategoryChange();
    selectedCategory = id;
  }
</script>

<!-- Shared original customer presentation. Slot keeps the prototype cart and
     the published branch information in the same inherited theme. -->
<div class="menumini-dining-container"
  style:--bg-page={catalog.theme.theme.bg}
  style:--bg-surface={catalog.theme.theme.surface}
  style:--color-text={catalog.theme.theme.text}
  style:--color-primary={catalog.primaryColor}
  style:--color-accent={catalog.theme.theme.accent}
  style:--font-dining={catalog.theme.theme.fontFamily}
  style:--radius-dining={catalog.theme.theme.borderRadius}
>
  <header class="dining-header">
    <div class="header-top">
      <div class="venue-identity">
        <div class="venue-badge" aria-hidden="true">{catalog.theme.thumbnail}</div>
        <div class="venue-heading">
          <h1 class="venue-title">{catalog.venueName}</h1>
          <p class="venue-subtitle">{catalog.branchName}{#if catalog.openStatus !== undefined} • <span class="status-dot"></span> {catalog.openStatus ? 'Open' : 'Closed'}{/if}</p>
        </div>
      </div>
      <div class="table-pill">
        <span class="table-lbl">{catalog.badgeLabel}</span>
        <strong class="table-num">{catalog.badgeValue}</strong>
      </div>
    </div>
    {#if catalog.welcomeMessage}
      <div class="welcome-box"><p class="welcome-txt">{catalog.welcomeMessage}</p></div>
    {/if}
    <div class="search-wrap">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input type="search" bind:value={searchQuery} aria-label="Search menu"
        placeholder="Search coffee, tibs, juices... / ፈልግ..." class="search-input" />
      {#if searchQuery}<button type="button" class="clear-btn" aria-label="Clear search" on:click={() => searchQuery = ''}>✕</button>{/if}
    </div>
    <nav class="category-scroll" aria-label="Menu categories">
      <button type="button" class="cat-chip" class:active={selectedCategory === null} aria-pressed={selectedCategory === null} on:click={() => selectCategory(null)}>
        <span class="cat-icon" aria-hidden="true">✨</span> All Items
      </button>
      {#each catalog.sections as section (section.id)}
        <button type="button" class="cat-chip" class:active={selectedCategory === section.id} aria-pressed={selectedCategory === section.id} on:click={() => selectCategory(section.id)}>
          {#if section.icon}<span class="cat-icon" aria-hidden="true">{section.icon}</span>{/if}
          {section.name}{#if section.nameAm}<span lang="am"> · {section.nameAm}</span>{/if}
        </button>
      {/each}
    </nav>
  </header>
  <main class="dining-content" aria-label="Menu items">
    {#if filteredDishes.length === 0}
      <div class="empty-state" role="status">
        <span class="empty-icon" aria-hidden="true">🍽️</span>
        <h2>{catalog.dishes.length ? 'No dishes found' : 'No dishes published yet'}</h2>
        <p>{catalog.dishes.length ? 'Try searching for something else or browse all categories.' : 'Please ask staff for the current menu.'}</p>
        {#if catalog.dishes.length}<button type="button" class="btn-reset" on:click={() => { selectedCategory = null; searchQuery = ''; }}>Reset Filters</button>{/if}
      </div>
    {:else}
      <div class="dish-grid">
        {#each filteredDishes as dish (dish.id)}
          {@const inCartQty = quantities[dish.id] || 0}
          <article class="dish-card" class:disabled={!dish.available} aria-label={dish.name}>
            <div class="dish-header">
              <div class="dish-title-group">
                {#if dish.popular || dish.preparationTime}
                  <div class="dish-tags">
                    {#if dish.popular}<span class="popular-tag">🔥 Popular</span>{/if}
                    {#if dish.preparationTime}<span class="prep-tag">⏱️ {dish.preparationTime}</span>{/if}
                  </div>
                {/if}
                <h2 class="dish-name">{dish.name}</h2>
                {#if dish.nameAm}<p class="dish-amharic" lang="am">{dish.nameAm}</p>{/if}
              </div>
              <div class="dish-price-pill"><span class="price-val">{dish.price}</span><span class="price-curr">{dish.currency}</span></div>
            </div>
            {#if dish.description}<p class="dish-desc">{dish.description}</p>{/if}
            {#if dish.descriptionAm}<p class="dish-desc" lang="am">{dish.descriptionAm}</p>{/if}
            {#if !dish.available}<p class="availability">Currently unavailable</p>{/if}
            <div class="dish-actions">
              <button type="button" class="btn-customize" aria-label={`Details for ${dish.name}`} on:click={() => onDetails(dish)}>
                {orderActions ? 'Details & Notes' : dish.modifiers.length ? 'Details & options' : 'Details'}
              </button>
              {#if orderActions}
                {#if inCartQty > 0}
                  <div class="qty-stepper" aria-label={`Quantity for ${dish.name}`}>
                    <button type="button" class="stepper-btn" aria-label={`Remove one ${dish.name}`} on:click={() => orderActions?.decrease(dish.id)}>–</button>
                    <span class="stepper-val">{inCartQty}</span>
                    <button type="button" class="stepper-btn" aria-label={`Add one ${dish.name}`} disabled={!dish.available} on:click={() => orderActions?.add(dish.id)}>+</button>
                  </div>
                {:else}
                  <button type="button" class="btn-add" aria-label={dish.available ? `Add ${dish.name}` : `${dish.name} sold out`} disabled={!dish.available} on:click={() => orderActions?.add(dish.id)}>{dish.available ? '+ Add' : 'Sold Out'}</button>
                {/if}
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </main>
  <slot />
</div>

<style>
  .menumini-dining-container {
    min-height: 100vh;
    background: var(--bg-page);
    color: var(--color-text);
    font-family: var(--font-dining);
    padding-bottom: 6rem;
    transition: background 0.3s ease;
  }

  /* TOP HEADER */
  .dining-header {
    background: var(--bg-surface);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.25rem 1rem 0.5rem;
    position: sticky;
    top: 0;
    z-index: 40;
    backdrop-filter: blur(16px);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .venue-identity {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .venue-badge {
    font-size: 1.8rem;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-dining);
  }

  .venue-title {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
    color: var(--color-text);
  }

  .venue-subtitle {
    font-size: 0.8rem;
    color: #94A3B8;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    background: #10B981;
    border-radius: 50%;
    display: inline-block;
  }

  .table-pill {
    background: var(--color-primary);
    color: #000000;
    padding: 0.4rem 0.75rem;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .table-lbl {
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  .table-num {
    font-size: 1.1rem;
    font-weight: 900;
  }

  .welcome-box {
    margin-bottom: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    border-left: 3px solid var(--color-primary);
  }

  .welcome-txt {
    font-size: 0.82rem;
    margin: 0;
    color: #CBD5E1;
  }

  /* SEARCH BAR */
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .search-icon {
    position: absolute;
    left: 0.85rem;
    font-size: 0.9rem;
    opacity: 0.6;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #FFFFFF;
    font-size: 0.9rem;
    padding: 0.65rem 2.2rem 0.65rem 2.4rem;
    border-radius: 24px;
    outline: none;
    transition: all 0.2s ease;
  }

  .search-input:focus {
    border-color: var(--color-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .clear-btn {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    color: #94A3B8;
    font-size: 0.85rem;
    cursor: pointer;
  }

  /* CATEGORY SCROLLER */
  .category-scroll {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.4rem;
    scrollbar-width: none;
  }

  .category-scroll::-webkit-scrollbar {
    display: none;
  }

  .cat-chip {
    white-space: nowrap;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #CBD5E1;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.45rem 0.85rem;
    border-radius: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    transition: all 0.2s ease;
  }

  .cat-chip.active {
    background: var(--color-primary);
    color: #000000;
    border-color: var(--color-primary);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  }

  /* DISH LIST */
  .dining-content {
    max-width: 768px;
    margin: 0 auto;
    padding: 1rem;
  }

  .dish-grid {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .dish-card {
    background: var(--bg-surface);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-dining);
    padding: 1.1rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transition: transform 0.15s ease, border-color 0.2s ease;
  }

  .dish-card.disabled {
    opacity: 0.5;
  }

  .dish-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .dish-tags {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.3rem;
  }

  .popular-tag {
    font-size: 0.68rem;
    background: rgba(239, 68, 68, 0.15);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    font-weight: 700;
  }

  .prep-tag {
    font-size: 0.68rem;
    background: rgba(255, 255, 255, 0.06);
    color: #94A3B8;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
  }

  .dish-name {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  .dish-amharic {
    font-size: 0.85rem;
    color: var(--color-primary);
    margin: 0.15rem 0 0;
    font-weight: 500;
  }

  .dish-price-pill {
    background: rgba(255, 255, 255, 0.06);
    padding: 0.35rem 0.65rem;
    border-radius: 8px;
    text-align: right;
    white-space: nowrap;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .price-val {
    font-size: 1.05rem;
    font-weight: 800;
    color: #FFFFFF;
  }

  .price-curr {
    font-size: 0.7rem;
    color: #94A3B8;
    margin-left: 2px;
  }

  .dish-desc {
    font-size: 0.83rem;
    color: #94A3B8;
    line-height: 1.45;
    margin: 0.5rem 0 0.9rem;
    white-space: pre-line;
  }

  .dish-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .btn-customize {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #CBD5E1;
    font-size: 0.78rem;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-add {
    background: var(--color-primary);
    color: #000000;
    border: none;
    font-weight: 700;
    font-size: 0.85rem;
    padding: 0.45rem 1.15rem;
    border-radius: 20px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  .btn-add:active {
    transform: scale(0.96);
  }

  .qty-stepper {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 2px 4px;
    gap: 0.5rem;
  }

  .stepper-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-primary);
    color: #000000;
    border: none;
    font-weight: 800;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stepper-val {
    font-weight: 800;
    font-size: 0.95rem;
    min-width: 20px;
    text-align: center;
    color: #FFFFFF;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #94A3B8;
  }

  .empty-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  .btn-reset {
    margin-top: 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #FFFFFF;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .venue-identity, .venue-heading, .dish-title-group { min-width:0; }
  .venue-title, .venue-subtitle, .dish-name, .dish-desc { overflow-wrap:anywhere; }
  .header-top { gap:.75rem; } .table-pill, .dish-price-pill { flex-shrink:0; }
  .dish-actions { gap:.75rem; flex-wrap:wrap; margin-top:.75rem; }
  .availability { font-size:.8rem; color:var(--color-text); margin:.65rem 0; }
  .dish-card.disabled { opacity:.75; }
  .btn-customize, .btn-add, .cat-chip, .clear-btn, .btn-reset { min-height:44px; }
  .stepper-btn { width:44px; height:44px; }
  .clear-btn { width:44px; right:0; } .search-input { min-height:44px; }
  .search-wrap:focus-within { border-radius:24px; outline:2px solid var(--color-primary); outline-offset:2px; }
  button:focus-visible { outline:2px solid var(--color-text); outline-offset:3px; }
  @media(max-width:360px) { .dish-header { flex-wrap:wrap; } .venue-title { font-size:1rem; } }
  @media(prefers-reduced-motion:reduce) { .menumini-dining-container, .dish-card, .btn-add { transition:none; } .dining-header { backdrop-filter:none; } }
</style>
