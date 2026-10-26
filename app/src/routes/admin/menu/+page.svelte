<script lang="ts">
  import { soundFX, addToast } from '$lib/utils/feedback';
  import { isMiniTier } from '$lib/stores/tierStore';
  import { MINI_MENU_TEMPLATES, type MiniMenuTemplate } from '$lib/types/miniTemplates';

  let selectedMiniTemplate: MiniMenuTemplate = MINI_MENU_TEMPLATES[1];
  let selectedColor = '#F59E0B';

  const colorPresets = [
    { name: 'Amber Gold', hex: '#F59E0B' },
    { name: 'Emerald Green', hex: '#10B981' },
    { name: 'Habesha Terracotta', hex: '#D97706' },
    { name: 'Bole Crimson', hex: '#E11D48' },
    { name: 'Sky Cyan', hex: '#0284C7' }
  ];

  function chooseMiniTemplate(tmpl: MiniMenuTemplate) {
    soundFX.playSuccess();
    selectedMiniTemplate = tmpl;
    selectedColor = tmpl.theme.primary;
    addToast({
      type: 'success',
      title: 'Template Selected',
      message: `MenuMini layout switched to "${tmpl.name}".`
    });
  }

  let aiConceptInput = '';
  let isAiMatching = false;
  let isAiEnhancing = false;
  let aiReasoning = '';

  async function runAiSmartMatch() {
    if (!aiConceptInput.trim()) {
      addToast({ type: 'warning', title: 'Describe Your Venue', message: 'Enter a few words describing your venue or cuisine.' });
      return;
    }
    soundFX.playTap();
    isAiMatching = true;
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'smart-match-template',
          payload: { concept: aiConceptInput }
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        const { recommendedTemplateId, primaryColor, reasoning } = data.result;
        const matched = MINI_MENU_TEMPLATES.find(t => t.id === recommendedTemplateId) || MINI_MENU_TEMPLATES[0];
        selectedMiniTemplate = matched;
        selectedColor = primaryColor || matched.theme.primary;
        aiReasoning = reasoning;
        soundFX.playSuccess();
        addToast({
          type: 'success',
          title: 'AI Smart Match Applied!',
          message: `Switched to "${matched.name}".`
        });
      } else {
        throw new Error(data.error || 'Failed to match template');
      }
    } catch (e: any) {
      soundFX.playError();
      addToast({ type: 'error', title: 'AI Matching Error', message: e.message });
    } finally {
      isAiMatching = false;
    }
  }

  async function runAiEnhanceDish() {
    if (!newItem.name.trim()) {
      addToast({ type: 'warning', title: 'Dish Name Required', message: 'Enter the dish name first.' });
      return;
    }
    soundFX.playTap();
    isAiEnhancing = true;
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enhance-dish',
          payload: {
            name: newItem.name,
            category: activeSection.name,
            currentDesc: newItem.description
          }
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        const { englishDescription, amharicDescription } = data.result;
        newItem.description = `${englishDescription}\n\n🇪🇹 ${amharicDescription}`;
        soundFX.playSuccess();
        addToast({
          type: 'success',
          title: 'Dish Enhanced with AI!',
          message: 'English description & Amharic translation generated.'
        });
      } else {
        throw new Error(data.error || 'Failed to enhance dish');
      }
    } catch (e: any) {
      soundFX.playError();
      addToast({ type: 'error', title: 'AI Enhancer Error', message: e.message });
    } finally {
      isAiEnhancing = false;
    }
  }

  export let data: any;
  const template = data?.template || {
    name: 'Artisan Cafe & Roastery',
    sections: [
      { id: 'sec-1', name: 'Espresso & Coffee', icon: '☕', isRequired: true },
      { id: 'sec-2', name: 'Breakfast & Brunch', icon: '🥐', isRequired: true },
      { id: 'sec-3', name: 'Cold Brew & Frappes', icon: '🧋' },
      { id: 'sec-4', name: 'Artisan Pastries', icon: '🍰' },
      { id: 'sec-5', name: 'Fresh Juices & Coolers', icon: '🧃' }
    ]
  };

  let activeSection = template.sections[0];

  interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    isAvailable: boolean;
    isPopular?: boolean;
    category: string;
    modifiersCount: number;
  }

  let items: MenuItem[] = [
    { id: 'item-1', name: 'Special Burger Delight', description: 'Handcrafted beef patty with melted aged cheddar and house aioli.', price: 280.00, currency: 'ETB', isAvailable: true, isPopular: true, category: 'Main Courses', modifiersCount: 2 },
    { id: 'item-2', name: 'Single-Origin Pour Over', description: 'Yirgacheffe floral notes with delicate citrus finish.', price: 120.00, currency: 'ETB', isAvailable: true, isPopular: true, category: 'Espresso & Coffee', modifiersCount: 1 },
    { id: 'item-3', name: 'Iced Caramel Frappe', description: 'Fresh espresso blended with artisan caramel and rich whipped cream.', price: 160.00, currency: 'ETB', isAvailable: false, isPopular: false, category: 'Cold Brew & Frappes', modifiersCount: 2 },
    { id: 'item-4', name: 'Avocado Toast & Poached Egg', description: 'Fresh avocado mash on toasted country sourdough.', price: 210.00, currency: 'ETB', isAvailable: true, isPopular: false, category: 'Breakfast & Brunch', modifiersCount: 3 }
  ];

  // Add Item Modal
  let isAddModalOpen = false;
  let newItem = {
    name: '',
    description: '',
    price: 150.00,
    isPopular: false,
    category: 'Espresso & Coffee'
  };

  function selectSection(sec: any) {
    soundFX.playTap();
    activeSection = sec;
  }

  function toggleAvailability(itemId: string) {
    soundFX.playTap();
    items = items.map(item => {
      if (item.id === itemId) {
        const next = !item.isAvailable;
        addToast({
          type: next ? 'success' : 'warning',
          title: next ? 'Item Available' : "Item 86'd / Out of Stock",
          message: `${item.name} is now ${next ? 'orderable by customers' : 'disabled on menu'}.`
        });
        return { ...item, isAvailable: next };
      }
      return item;
    });
  }

  function saveNewItem() {
    if (!newItem.name.trim()) {
      soundFX.playError();
      addToast({ type: 'warning', title: 'Name Required', message: 'Please give the dish a name.' });
      return;
    }

    soundFX.playSuccess();
    const created: MenuItem = {
      id: `item-${Date.now()}`,
      name: newItem.name,
      description: newItem.description || 'Prepared fresh by our kitchen team.',
      price: Number(newItem.price) || 100,
      currency: 'ETB',
      isAvailable: true,
      isPopular: newItem.isPopular,
      category: activeSection.name,
      modifiersCount: 0
    };

    items = [created, ...items];
    isAddModalOpen = false;
    addToast({
      type: 'success',
      title: 'Dish Added',
      message: `${created.name} added to ${activeSection.name}.`
    });

    newItem = { name: '', description: '', price: 150.00, isPopular: false, category: activeSection.name };
  }

  function removeItem(itemId: string) {
    soundFX.playTap();
    const removed = items.find(i => i.id === itemId);
    items = items.filter(i => i.id !== itemId);
    addToast({
      type: 'info',
      title: 'Item Removed',
      message: `${removed?.name || 'Dish'} was deleted from the menu.`
    });
  }
</script>

<svelte:head>
  <title>Menu Builder & Dish Catalog | Admin</title>
</svelte:head>

<div class="menu-builder-page">
  <!-- Top Bar -->
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Menu Builder & Dish Catalog</h1>
      <p class="page-subtitle">Configure dishes, real-time availability (86'd), and pricing for <strong>{template.name}</strong>.</p>
    </div>

    <div class="top-actions">
      <a href="/demo-restaurant/main-branch" target="_blank" class="btn-tactile btn-secondary btn-header-action">
        <span>📱 Preview Customer Menu</span>
      </a>
      <button class="btn-tactile btn-primary btn-header-action" on:click={() => { soundFX.playTap(); isAddModalOpen = true; }}>
        <span>+ Add New Dish</span>
      </button>
    </div>
  </header>

  {#if $isMiniTier}
    <!-- MenuMini Curated Template Showcase & Brand Color Tweaker -->
    <div class="mini-template-showcase-card card">
      <div class="showcase-header">
        <div class="showcase-title-box">
          <span class="badge-mini">MenuMini Mode</span>
          <h2 class="showcase-title">Pre-Made Menu Layout & Brand Tweak</h2>
        </div>
        <div class="color-tweaker-group">
          <span class="tweaker-label">Brand Color Tweak:</span>
          <div class="color-dots-row">
            {#each colorPresets as color}
              <button 
                type="button" 
                class="color-dot"
                class:active={selectedColor === color.hex}
                style="background: {color.hex};"
                title={color.name}
                on:click={() => { soundFX.playTap(); selectedColor = color.hex; addToast({ type: 'info', title: 'Color Tweaked', message: `Theme accent updated to ${color.name}.` }); }}
              ></button>
            {/each}
          </div>
        </div>
      </div>

      <!-- AI Smart Match Bar -->
      <div class="ai-smart-match-bar">
        <div class="ai-input-wrap">
          <span class="ai-wand-icon">✨</span>
          <input 
            type="text" 
            bind:value={aiConceptInput} 
            placeholder="Type your vibe (e.g. 'Cozy traditional coffee house with warm pottery' or 'Italian woodfired pizza')..."
            class="ai-concept-field font-sans"
            on:keydown={(e) => e.key === 'Enter' && runAiSmartMatch()}
          />
        </div>
        <button 
          type="button" 
          class="btn-tactile btn-ai-match-action" 
          on:click={runAiSmartMatch}
          disabled={isAiMatching}
        >
          {isAiMatching ? '🤖 Smart Matching...' : '🤖 AI Smart Match'}
        </button>
      </div>
      {#if aiReasoning}
        <div class="ai-rationale-box">
          <span class="rationale-badge">AI Reason</span>
          <p class="rationale-text">{aiReasoning}</p>
        </div>
      {/if}

      <!-- Pre-made Templates Grid -->
      <div class="mini-templates-row">
        {#each MINI_MENU_TEMPLATES as tmpl}
          <button 
            type="button" 
            class="mini-template-pill-card"
            class:selected={selectedMiniTemplate.id === tmpl.id}
            on:click={() => chooseMiniTemplate(tmpl)}
          >
            <div class="tmpl-icon-box">{tmpl.thumbnail}</div>
            <div class="tmpl-info-box">
              <div class="tmpl-title-row">
                <strong class="tmpl-name">{tmpl.name}</strong>
                {#if tmpl.badge}
                  <span class="tmpl-badge">{tmpl.badge}</span>
                {/if}
              </div>
              <small class="tmpl-desc">{tmpl.description}</small>
            </div>
            {#if selectedMiniTemplate.id === tmpl.id}
              <span class="tmpl-active-check">✓ Active</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Two-Column Layout -->
  <div class="builder-split-grid">
    <!-- Left Column: Menu Sections Navigation -->
    <aside class="sections-column card">
      <div class="sections-column-header">
        <h3 class="sections-title">Menu Sections</h3>
        <span class="count-pill">{template.sections.length}</span>
      </div>

      <nav class="sections-nav-stack">
        {#each template.sections as section}
          {@const isActive = activeSection.id === section.id}
          <button 
            type="button" 
            class="section-nav-card" 
            class:active={isActive}
            on:click={() => selectSection(section)}
          >
            <span class="sec-icon">{section.icon || '📄'}</span>
            <div class="sec-meta">
              <span class="sec-name">{section.name}</span>
              {#if section.isRequired}
                <span class="badge-required">Required</span>
              {/if}
            </div>
            {#if isActive}
              <div class="sec-indicator"></div>
            {/if}
          </button>
        {/each}
      </nav>
    </aside>

    <!-- Right Column: Dishes in Active Section -->
    <main class="items-column card">
      <div class="items-column-header">
        <div>
          <h2 class="active-sec-heading">{activeSection.name}</h2>
          <p class="active-sec-count">{items.length} items configured in this section</p>
        </div>
        <button class="btn-tactile btn-secondary btn-add-sm" on:click={() => { soundFX.playTap(); isAddModalOpen = true; }}>
          + Add Item
        </button>
      </div>

      <div class="dishes-table-wrapper">
        <table class="dishes-table">
          <thead>
            <tr>
              <th>Dish & Description</th>
              <th>Price (ETB)</th>
              <th>Modifiers</th>
              <th>In Stock</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each items as item (item.id)}
              <tr class:unavailable={!item.isAvailable}>
                <td class="dish-name-cell">
                  <div class="dish-primary-box">
                    <span class="dish-title-text">{item.name}</span>
                    {#if item.isPopular}
                      <span class="badge-popular">★ Chef's Choice</span>
                    {/if}
                  </div>
                  <p class="dish-desc-snippet">{item.description}</p>
                </td>
                <td class="font-mono font-bold text-amber">
                  {item.price.toFixed(2)} {item.currency}
                </td>
                <td>
                  <span class="modifier-count-chip">
                    {item.modifiersCount > 0 ? `${item.modifiersCount} options` : 'None'}
                  </span>
                </td>
                <td>
                  <button 
                    type="button"
                    class="toggle-switch-wrap"
                    class:in-stock={item.isAvailable}
                    on:click={() => toggleAvailability(item.id)}
                    title="Toggle customer availability"
                  >
                    <div class="switch-ball"></div>
                  </button>
                </td>
                <td class="text-right">
                  <button class="btn-delete-row" on:click={() => removeItem(item.id)} title="Delete item">
                    🗑️
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </main>
  </div>
</div>

<!-- Add Item Modal -->
{#if isAddModalOpen}
  <div class="modal-backdrop" on:click={() => isAddModalOpen = false} role="dialog" aria-modal="true">
    <div class="modal-card" on:click|stopPropagation>
      <div class="modal-head">
        <h3 class="modal-title">Add New Dish to {activeSection.name}</h3>
        <button class="modal-close" on:click={() => isAddModalOpen = false}>&times;</button>
      </div>

      <div class="modal-body-form">
        <div class="form-group">
          <label for="new-name" class="form-label">Dish / Beverage Name *</label>
          <input 
            id="new-name"
            type="text" 
            bind:value={newItem.name} 
            placeholder="e.g. Avocado Toast with Poached Egg" 
            class="form-control"
            required
          />
        </div>

        <div class="form-group">
          <div class="label-with-ai-row">
            <label for="new-desc" class="form-label">Menu Description & Amharic Translation</label>
            <button 
              type="button" 
              class="btn-ai-magic" 
              on:click={runAiEnhanceDish}
              disabled={isAiEnhancing}
            >
              {isAiEnhancing ? '✨ Generating...' : '✨ AI Magic Enhance'}
            </button>
          </div>
          <textarea 
            id="new-desc"
            bind:value={newItem.description} 
            placeholder="Type ingredients or click '✨ AI Magic Enhance' to generate English & Amharic descriptions..."
            rows="3"
            class="form-control"
          ></textarea>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label for="new-price" class="form-label">Base Price (ETB) *</label>
            <input 
              id="new-price"
              type="number" 
              bind:value={newItem.price} 
              class="form-control font-mono"
              required
            />
          </div>

          <div class="form-group checkbox-group">
            <label class="toggle-choice">
              <input type="checkbox" bind:checked={newItem.isPopular} />
              <span>Mark as Chef's Favorite</span>
            </label>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-tactile btn-secondary" on:click={() => isAddModalOpen = false}>
          Cancel
        </button>
        <button type="button" class="btn-tactile btn-primary" on:click={saveNewItem}>
          Save Dish to Menu
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .menu-builder-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .page-title {
    font-family: var(--font-serif);
    font-size: 2rem;
    color: #FFFFFF;
    margin: 0 0 0.25rem 0;
  }

  .page-subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .top-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-header-action {
    padding: 0.75rem 1.25rem;
    font-size: 0.88rem;
  }

  /* Two Column Grid */
  .builder-split-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
  }

  /* Left Column */
  .sections-column {
    padding: 1.25rem;
  }

  .sections-column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  .sections-title {
    font-size: 1rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  .count-pill {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.15rem 0.5rem;
    background: var(--surface-elevated);
    border-radius: var(--radius-full);
    color: var(--amber-400);
  }

  .sections-nav-stack {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .section-nav-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.85rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    position: relative;
    transition: all 120ms ease;
  }

  .section-nav-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .section-nav-card.active {
    background: rgba(245, 158, 11, 0.12);
    border-color: var(--amber-500);
  }

  .sec-icon {
    font-size: 1.25rem;
  }

  .sec-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .sec-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: #FFFFFF;
  }

  .badge-required {
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--amber-400);
  }

  .sec-indicator {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--amber-400);
  }

  /* Right Column */
  .items-column {
    padding: 1.5rem;
  }

  .items-column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .active-sec-heading {
    font-family: var(--font-serif);
    font-size: 1.4rem;
    color: #FFFFFF;
    margin: 0 0 0.2rem 0;
  }

  .active-sec-count {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    margin: 0;
  }

  .btn-add-sm {
    font-size: 0.82rem;
    padding: 0.45rem 0.85rem;
  }

  /* Dishes Table */
  .dishes-table-wrapper {
    overflow-x: auto;
  }

  .dishes-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    text-align: left;
  }

  .dishes-table th {
    padding: 0.75rem 1rem;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
  }

  .dishes-table td {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
  }

  .dishes-table tr.unavailable td {
    opacity: 0.45;
  }

  .dish-name-cell {
    max-width: 320px;
  }

  .dish-primary-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .dish-title-text {
    font-weight: 700;
    color: #FFFFFF;
    font-size: 0.95rem;
  }

  .badge-popular {
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--amber-400);
    background: rgba(245, 158, 11, 0.15);
    padding: 0.15rem 0.45rem;
    border-radius: var(--radius-xs);
  }

  .dish-desc-snippet {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    margin: 0;
    line-height: 1.35;
  }

  .modifier-count-chip {
    font-size: 0.75rem;
    padding: 0.2rem 0.55rem;
    background: var(--surface-elevated);
    border-radius: var(--radius-xs);
    color: var(--text-secondary);
  }

  /* Toggle Switch */
  .toggle-switch-wrap {
    width: 44px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    cursor: pointer;
    position: relative;
    padding: 2px;
    transition: all 120ms ease;
  }

  .switch-ball {
    width: 18px;
    height: 18px;
    border-radius: var(--radius-full);
    background: var(--text-tertiary);
    transition: transform 120ms ease;
  }

  .toggle-switch-wrap.in-stock {
    background: rgba(16, 185, 129, 0.2);
    border-color: var(--color-success);
  }

  .toggle-switch-wrap.in-stock .switch-ball {
    transform: translateX(20px);
    background: var(--color-success);
  }

  .btn-delete-row {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.6;
    transition: opacity 120ms ease;
  }

  .btn-delete-row:hover {
    opacity: 1;
  }

  .text-amber { color: var(--amber-400); }
  .text-right { text-align: right; }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(9, 10, 15, 0.75);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal-card {
    width: 100%;
    max-width: 520px;
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2rem;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .modal-title {
    font-family: var(--font-serif);
    font-size: 1.35rem;
    color: #FFFFFF;
    margin: 0;
  }

  .modal-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: var(--text-tertiary);
    cursor: pointer;
  }

  .modal-body-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: center;
  }

  .form-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .form-control {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 0.95rem;
    outline: none;
  }

  .checkbox-group {
    margin-top: 1.4rem;
  }

  .toggle-choice {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.85rem;
    color: var(--text-primary);
    cursor: pointer;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .mini-template-showcase-card {
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(26, 29, 39, 0.6) 100%);
    border: 1px solid rgba(245, 158, 11, 0.25);
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.5rem;
  }

  .showcase-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .showcase-title-box {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .badge-mini {
    background: var(--amber-500);
    color: #000000;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
  }

  .showcase-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  .color-tweaker-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .tweaker-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .color-dots-row {
    display: flex;
    gap: 0.5rem;
  }

  .color-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 120ms ease;
  }

  .color-dot:hover {
    transform: scale(1.15);
  }

  .color-dot.active {
    border-color: #FFFFFF;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
    transform: scale(1.15);
  }

  .mini-templates-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.75rem;
  }

  .mini-template-pill-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    text-align: left;
    cursor: pointer;
    transition: all 140ms ease;
  }

  .mini-template-pill-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(245, 158, 11, 0.4);
  }

  .mini-template-pill-card.selected {
    background: rgba(245, 158, 11, 0.12);
    border-color: var(--amber-500);
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.15);
  }

  .tmpl-icon-box {
    font-size: 1.5rem;
  }

  .tmpl-info-box {
    flex: 1;
    overflow: hidden;
  }

  .tmpl-title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tmpl-name {
    font-size: 0.85rem;
    color: #FFFFFF;
  }

  .tmpl-badge {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--amber-400);
    background: rgba(245, 158, 11, 0.15);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-xs);
  }

  .tmpl-desc {
    font-size: 0.72rem;
    color: var(--text-tertiary);
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tmpl-active-check {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--amber-400);
  }

  /* AI Smart Match Bar */
  .ai-smart-match-bar {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    align-items: center;
  }

  .ai-input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-md);
    padding: 0 0.75rem;
    gap: 0.5rem;
  }

  .ai-wand-icon {
    font-size: 1rem;
  }

  .ai-concept-field {
    width: 100%;
    background: transparent;
    border: none;
    color: #FFFFFF;
    padding: 0.65rem 0;
    font-size: 0.88rem;
    outline: none;
  }

  .btn-ai-match-action {
    background: linear-gradient(135deg, #F59E0B, #D97706);
    color: #000000;
    font-weight: 800;
    font-size: 0.82rem;
    padding: 0.65rem 1.15rem;
    white-space: nowrap;
    border: none;
    border-radius: var(--radius-md);
  }

  .ai-rationale-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    padding: 0.5rem 0.85rem;
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
  }

  .rationale-badge {
    background: var(--amber-500);
    color: #000000;
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-xs);
    text-transform: uppercase;
  }

  .rationale-text {
    font-size: 0.8rem;
    color: var(--amber-200);
    margin: 0;
  }

  .label-with-ai-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .btn-ai-magic {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.3));
    color: var(--amber-400);
    border: 1px solid rgba(245, 158, 11, 0.4);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.65rem;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all 120ms ease;
  }

  .btn-ai-magic:hover {
    background: var(--amber-500);
    color: #000000;
  }

  @media (max-width: 900px) {
    .builder-split-grid {
      grid-template-columns: 1fr;
    }
    .ai-smart-match-bar {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
