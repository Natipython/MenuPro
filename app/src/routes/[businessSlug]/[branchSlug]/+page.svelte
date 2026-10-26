<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { cart, cartTotals } from '$lib/stores/cartStore';
  import { soundFX } from '$lib/utils/feedback';
  import ItemDetailModal from '$lib/components/ItemDetailModal.svelte';
  import CartDrawer from '$lib/components/CartDrawer.svelte';

  export let data: any;
  const { business, branch, tableId, template } = data;

  const currency = business?.currency || 'ETB';

  // Active section tab
  let activeSection = template?.sections?.find((s: any) => s.isDefaultVisible) || template?.sections?.[0] || { name: 'Main Menu', items: [] };

  // Search and filter state
  let searchQuery = '';
  let selectedDietaryTag = 'ALL';
  const dietaryTags = ['ALL', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Chef Special'];

  // Modal & Drawer State
  let selectedItemForDetail: any = null;
  let isDetailModalOpen: boolean = false;
  let isCartDrawerOpen: boolean = false;

  function selectSection(section: any) {
    soundFX.playTap();
    activeSection = section;
  }

  function openItemModal(item: any) {
    soundFX.playTap();
    selectedItemForDetail = item;
    isDetailModalOpen = true;
  }

  function handleAddToCartFromModal(event: CustomEvent) {
    const { item, selections, quantity, specialInstructions, unitPrice, totalPrice } = event.detail;
    cart.addItem({
      productId: item.id,
      name: item.name,
      basePrice: item.basePrice,
      quantity,
      selectedOptions: selections,
      optionsTotal: unitPrice - item.basePrice,
      specialInstructions
    });
  }

  function handleOpenCart() {
    soundFX.playPop();
    isCartDrawerOpen = true;
  }

  function handleCheckout(event: CustomEvent) {
    const bizSlug = business.slug || 'demo-restaurant';
    const brSlug = branch.slug || 'main-branch';
    goto(`/${bizSlug}/${brSlug}/checkout${tableId ? `?table=${tableId}` : ''}`);
  }

  // Filter items dynamically based on search query and active dietary tag
  function getFilteredItems(items: any[]) {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = selectedDietaryTag === 'ALL' || 
        (item.tags && item.tags.some((t: string) => t.toLowerCase() === selectedDietaryTag.toLowerCase()));

      return matchesSearch && matchesTag;
    });
  }

  // Mock sample items if a section only contains definitions without items
  function getSectionItems(section: any) {
    if (section.items && section.items.length > 0) {
      return getFilteredItems(section.items);
    }
    // Default fallback dishes
    return getFilteredItems([
      {
        id: `${section.id}-1`,
        name: `Special ${section.name} Delight`,
        description: 'Freshly prepared with authentic culinary ingredients and house spices.',
        basePrice: 180.00,
        imageUrl: '',
        tags: ['Chef Special', 'Fresh'],
        isPopular: true,
        optionGroups: [
          {
            id: 'portion',
            name: 'Portion Size',
            type: 'SINGLE_SELECT',
            isRequired: true,
            options: [
              { id: 'reg', label: 'Regular Portion', priceModifier: 0, isDefault: true },
              { id: 'large', label: 'Generous Portion', priceModifier: 60 }
            ]
          },
          {
            id: 'sides',
            name: 'Choice of Accompaniment',
            type: 'MULTI_SELECT',
            options: [
              { id: 'extra-sauce', label: 'House Chili Sauce', priceModifier: 25 },
              { id: 'herb-bread', label: 'Toasted Garlic Bread', priceModifier: 40 }
            ]
          }
        ]
      },
      {
        id: `${section.id}-2`,
        name: `Classic ${section.name} Platter`,
        description: 'Traditional recipe served hot with organic seasoning and garnishes.',
        basePrice: 220.00,
        imageUrl: '',
        tags: ['Popular'],
        isPopular: false
      }
    ]);
  }
</script>

<svelte:head>
  <title>{business?.name || 'Restaurant'} | Digital Menu</title>
</svelte:head>

<div class="menu-app-container">
  <!-- Top Luxury Ambient Header -->
  <header class="restaurant-hero-header">
    <div class="hero-cover-backdrop">
      <div class="hero-ambient-gradient"></div>
    </div>

    <div class="hero-brand-card">
      <div class="brand-identity-row">
        <div class="brand-avatar">
          {business?.name?.charAt(0) || '🍽️'}
        </div>
        <div class="brand-meta">
          <h1 class="restaurant-name">{business?.name || 'MenuApp Pro'}</h1>
          <p class="branch-meta">
            {branch?.name || 'Main Branch'}
            {#if tableId}
              <span class="table-pill">Table {tableId}</span>
            {/if}
          </p>
        </div>
      </div>

      <!-- Quick Category / Cuisine Tags -->
      {#if template?.tags}
        <div class="cuisine-tags-row">
          {#each template.tags.slice(0, 4) as tag}
            <span class="cuisine-tag">{tag}</span>
          {/each}
        </div>
      {/if}
    </div>
  </header>

  <!-- Sticky Controls: Search & Category Navigation -->
  <div class="sticky-nav-container">
    <!-- Search Bar -->
    <div class="search-input-wrapper">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input 
        type="text" 
        bind:value={searchQuery} 
        placeholder="Search dishes, drinks, or ingredients..."
        class="search-input"
      />
      {#if searchQuery}
        <button class="clear-search-btn" on:click={() => searchQuery = ''}>&times;</button>
      {/if}
    </div>

    <!-- Category Pill Scroller -->
    <nav class="category-tabs-scroll" aria-label="Menu categories">
      {#each template?.sections || [] as section}
        {@const isActive = activeSection.id === section.id}
        <button 
          type="button"
          class="category-pill"
          class:active={isActive}
          on:click={() => selectSection(section)}
        >
          {#if section.icon}
            <span class="category-icon">{section.icon}</span>
          {/if}
          <span class="category-name">{section.name}</span>
        </button>
      {/each}
    </nav>
  </div>

  <!-- Active Section Content Grid -->
  <main class="menu-main-content">
    <div class="section-headline">
      <h2 class="active-section-title">{activeSection.name}</h2>
      {#if activeSection.description}
        <p class="active-section-desc">{activeSection.description}</p>
      {/if}
    </div>

    <!-- Dish Cards Grid -->
    <div class="dishes-grid">
      {#each getSectionItems(activeSection) as item (item.id)}
        <div class="dish-card" on:click={() => openItemModal(item)}>
          <div class="dish-card-info">
            <div class="dish-title-row">
              <h3 class="dish-name">{item.name}</h3>
              {#if item.isPopular}
                <span class="popular-star" title="Chef's Favorite">★</span>
              {/if}
            </div>
            
            <p class="dish-snippet">{item.description || 'Prepared fresh upon order.'}</p>

            {#if item.tags && item.tags.length > 0}
              <div class="dish-mini-tags">
                {#each item.tags.slice(0, 2) as tag}
                  <span class="mini-tag">{tag}</span>
                {/each}
              </div>
            {/if}

            <div class="dish-footer-row">
              <span class="dish-card-price">{item.basePrice?.toFixed(2)} {currency}</span>
              <button 
                type="button" 
                class="btn-quick-add"
                on:click|stopPropagation={() => openItemModal(item)}
                aria-label="Add item"
              >
                <span>+</span>
              </button>
            </div>
          </div>

          <!-- Dish Image Thumbnail -->
          <div class="dish-thumbnail-box">
            {#if item.imageUrl}
              <img src={item.imageUrl} alt={item.name} class="dish-thumb-img" loading="lazy" />
            {:else}
              <div class="dish-thumb-fallback">
                <span class="fallback-food-icon">🍽️</span>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </main>

  <!-- Sticky Floating Order Bar (Pops up when items are in cart) -->
  {#if $cartTotals.totalItems > 0}
    <div class="floating-cart-wrapper animate-fade-up">
      <button 
        type="button" 
        class="floating-cart-bar" 
        on:click={handleOpenCart}
      >
        <div class="cart-bar-left">
          <div class="cart-items-counter">
            {$cartTotals.totalItems}
          </div>
          <span class="cart-label">View Order Tray</span>
        </div>

        <div class="cart-bar-right">
          <span class="cart-bar-total">{$cartTotals.subtotal.toFixed(2)} {currency}</span>
          <svg class="cart-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
      </button>
    </div>
  {/if}

  <!-- Modals -->
  <ItemDetailModal 
    item={selectedItemForDetail}
    isOpen={isDetailModalOpen}
    {currency}
    on:close={() => isDetailModalOpen = false}
    on:add={handleAddToCartFromModal}
  />

  <CartDrawer 
    isOpen={isCartDrawerOpen}
    {currency}
    tableNumber={tableId || '1'}
    on:close={() => isCartDrawerOpen = false}
    on:checkout={handleCheckout}
  />
</div>

<style>
  .menu-app-container {
    max-width: 640px;
    margin: 0 auto;
    min-height: 100vh;
    background: var(--bg-dark);
    padding-bottom: 110px; /* Space for floating cart bar */
    position: relative;
  }

  /* Hero Header */
  .restaurant-hero-header {
    position: relative;
    padding-top: 1.5rem;
    padding-bottom: 1rem;
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(9, 10, 15, 0) 100%);
  }

  .hero-brand-card {
    padding: 0 1.25rem;
  }

  .brand-identity-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .brand-avatar {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, var(--amber-500), var(--amber-600));
    color: #090A0F;
    font-weight: 800;
    font-size: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px var(--amber-glow);
    flex-shrink: 0;
  }

  .restaurant-name {
    font-family: var(--font-serif);
    font-size: 1.55rem;
    color: #FFFFFF;
    margin: 0 0 0.15rem 0;
  }

  .branch-meta {
    font-size: 0.85rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
  }

  .table-pill {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.15rem 0.55rem;
    background: rgba(245, 158, 11, 0.18);
    color: var(--amber-400);
    border-radius: var(--radius-full);
  }

  .cuisine-tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .cuisine-tag {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
  }

  /* Sticky Navigation Container */
  .sticky-nav-container {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(9, 10, 15, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    padding: 0.75rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 0.9rem;
    width: 17px;
    height: 17px;
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.65rem 2.25rem 0.65rem 2.5rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: #FFFFFF;
    font-family: var(--font-sans);
    font-size: 0.88rem;
    outline: none;
    transition: all 140ms ease;
  }

  .search-input:focus {
    border-color: var(--amber-500);
    background: var(--card-bg);
  }

  .clear-search-btn {
    position: absolute;
    right: 0.8rem;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    font-size: 1.2rem;
    cursor: pointer;
  }

  /* Category Scrollbar */
  .category-tabs-scroll {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    scrollbar-width: none;
  }

  .category-tabs-scroll::-webkit-scrollbar {
    display: none;
  }

  .category-pill {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.95rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 140ms ease;
  }

  .category-pill:hover {
    color: #FFFFFF;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .category-pill.active {
    background: var(--amber-500);
    border-color: var(--amber-500);
    color: #090A0F;
    font-weight: 700;
    box-shadow: 0 2px 10px var(--amber-glow);
  }

  /* Main Menu Grid */
  .menu-main-content {
    padding: 1.25rem;
  }

  .section-headline {
    margin-bottom: 1rem;
  }

  .active-section-title {
    font-family: var(--font-serif);
    font-size: 1.45rem;
    color: #FFFFFF;
    margin: 0 0 0.2rem 0;
  }

  .active-section-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .dishes-grid {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  /* Dish Card */
  .dish-card {
    display: flex;
    justify-content: space-between;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem;
    cursor: pointer;
    transition: transform var(--duration-fast) var(--ease-spring),
                border-color var(--duration-fast) ease;
    gap: 1rem;
  }

  .dish-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .dish-card:active {
    transform: scale(0.98);
  }

  .dish-card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .dish-title-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.25rem;
  }

  .dish-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  .popular-star {
    color: var(--amber-400);
    font-size: 0.9rem;
  }

  .dish-snippet {
    font-size: 0.83rem;
    color: var(--text-secondary);
    line-height: 1.4;
    margin: 0 0 0.5rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .dish-mini-tags {
    display: flex;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }

  .mini-tag {
    font-size: 0.7rem;
    padding: 0.15rem 0.45rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-xs);
    color: var(--text-tertiary);
  }

  .dish-footer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
  }

  .dish-card-price {
    font-family: var(--font-mono);
    font-size: 1rem;
    font-weight: 700;
    color: var(--amber-400);
  }

  .btn-quick-add {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: var(--card-bg);
    border: 1px solid var(--border);
    color: #FFFFFF;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .btn-quick-add:hover {
    background: var(--amber-500);
    color: #090A0F;
    border-color: var(--amber-500);
  }

  /* Dish Thumbnail */
  .dish-thumbnail-box {
    width: 90px;
    height: 90px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--card-bg);
    border: 1px solid var(--border);
    flex-shrink: 0;
  }

  .dish-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .dish-thumb-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle, #202436 0%, #12141D 100%);
  }

  .fallback-food-icon {
    font-size: 1.8rem;
  }

  /* Sticky Floating Cart Bar */
  .floating-cart-wrapper {
    position: fixed;
    bottom: 1.25rem;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 500;
    padding: 0 1.25rem;
    pointer-events: none;
  }

  .floating-cart-bar {
    pointer-events: auto;
    width: 100%;
    max-width: 600px;
    background: linear-gradient(135deg, var(--amber-500), var(--amber-600));
    color: #090A0F;
    border: none;
    border-radius: var(--radius-xl);
    padding: 0.95rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 10px 30px rgba(245, 158, 11, 0.4), 0 0 15px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: transform var(--duration-fast) var(--ease-spring);
  }

  .floating-cart-bar:active {
    transform: scale(0.97);
  }

  .cart-bar-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .cart-items-counter {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: #090A0F;
    color: var(--amber-400);
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cart-label {
    font-size: 1rem;
    font-weight: 700;
  }

  .cart-bar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cart-bar-total {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 800;
  }

  .cart-arrow {
    width: 20px;
    height: 20px;
  }
</style>
