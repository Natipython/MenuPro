<script lang="ts">
  export let data;
  const template = data.template;

  let activeSection = template.sections[0];

  let items = [
    { id: 1, name: 'Espresso', price: 3.50, status: 'Available', image: true },
    { id: 2, name: 'Cappuccino', price: 4.50, status: 'Available', image: false },
    { id: 3, name: 'Iced Latte', price: 5.00, status: 'Out of Stock', image: true }
  ];
</script>

<svelte:head>
  <title>Menu Builder | Admin</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1>Menu Builder</h1>
    <p class="subtitle">Managing: <strong>{template.name}</strong> Layout</p>
  </div>
  <div class="actions">
    <button class="secondary-btn">Preview Menu</button>
    <button class="primary-btn">+ Add Item</button>
  </div>
</div>

<div class="layout">
  <!-- Sidebar: Sections -->
  <aside class="sections-sidebar">
    <h3>Menu Sections</h3>
    <ul class="section-list">
      {#each template.sections as section}
        <li 
          class:active={activeSection.id === section.id}
          on:click={() => activeSection = section}
        >
          <span class="icon">{section.icon || '📄'}</span>
          <div class="info">
            <strong>{section.name}</strong>
            {#if section.isRequired}
              <span class="badge required">Required</span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </aside>

  <!-- Main Area: Items in Section -->
  <div class="items-area">
    <div class="area-header">
      <h2>{activeSection.name}</h2>
      {#if activeSection.subSections}
        <div class="sub-tabs">
          <button class="tab active">All</button>
          {#each activeSection.subSections as sub}
            <button class="tab">{sub.name}</button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="items-list">
      {#each items as item}
        <div class="item-card" class:out-of-stock={item.status === 'Out of Stock'}>
          <div class="item-image">
            {#if item.image}
              <span>🖼️</span>
            {:else}
              <span class="no-img">No Img</span>
            {/if}
          </div>
          <div class="item-details">
            <h4>{item.name}</h4>
            <span class="price">${item.price.toFixed(2)}</span>
            <div class="options-preview">
              <span class="pill">Milk Options</span>
              <span class="pill">Size</span>
            </div>
          </div>
          <div class="item-status">
            <span class="status-badge {item.status === 'Available' ? 'active' : 'inactive'}">
              {item.status}
            </span>
          </div>
          <div class="item-actions">
            <button class="icon-btn">✏️ Edit</button>
          </div>
        </div>
      {/each}
      
      <button class="add-item-card">
        <span class="plus">+</span>
        <span>Add new item to {activeSection.name}</span>
      </button>
    </div>
  </div>
</div>

<style>
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
  .page-header h1 { margin: 0 0 0.25rem 0; font-size: 1.75rem; color: #111827; }
  .subtitle { margin: 0; color: #6b7280; font-size: 0.875rem; }
  
  .actions { display: flex; gap: 1rem; }
  .primary-btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 500; cursor: pointer; }
  .secondary-btn { background: white; border: 1px solid #d1d5db; color: #374151; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 500; cursor: pointer; }

  .layout { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; height: calc(100vh - 150px); }

  .sections-sidebar { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow: hidden; }
  .sections-sidebar h3 { padding: 1rem 1.5rem; margin: 0; border-bottom: 1px solid #e5e7eb; font-size: 1rem; background: #f9fafb; color: #374151; }
  
  .section-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1; }
  .section-list li { display: flex; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.2s; }
  .section-list li:hover { background: #f9fafb; }
  .section-list li.active { background: #eff6ff; border-left: 4px solid #3b82f6; }
  .section-list .icon { font-size: 1.25rem; margin-right: 1rem; width: 24px; text-align: center; }
  .section-list .info { display: flex; flex-direction: column; gap: 0.25rem; }
  .section-list strong { font-size: 0.875rem; color: #111827; }
  
  .badge.required { background: #fee2e2; color: #ef4444; font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-block; width: max-content; }

  .items-area { display: flex; flex-direction: column; }
  .area-header { margin-bottom: 1.5rem; }
  .area-header h2 { margin: 0 0 1rem 0; font-size: 1.5rem; }
  
  .sub-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0px; }
  .tab { background: none; border: none; padding: 0.5rem 1rem; color: #6b7280; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }

  .items-list { display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; padding-right: 0.5rem; }
  
  .item-card { display: flex; align-items: center; background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); gap: 1.5rem; transition: opacity 0.2s; }
  .item-card.out-of-stock { opacity: 0.6; }
  
  .item-image { width: 60px; height: 60px; background: #f3f4f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #9ca3af; }
  .no-img { font-size: 0.75rem; }
  
  .item-details { flex: 1; }
  .item-details h4 { margin: 0 0 0.25rem 0; font-size: 1.1rem; }
  .item-details .price { font-weight: 600; color: #374151; }
  
  .options-preview { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .pill { background: #f3f4f6; color: #6b7280; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; }
  
  .status-badge { font-size: 0.75rem; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 999px; }
  .status-badge.active { background: #d1fae5; color: #065f46; }
  .status-badge.inactive { background: #f3f4f6; color: #6b7280; }

  .icon-btn { background: white; border: 1px solid #d1d5db; padding: 0.5rem 1rem; border-radius: 4px; font-weight: 500; cursor: pointer; color: #374151; }
  
  .add-item-card { display: flex; flex-direction: column; align-items: center; justify-content: center; background: transparent; border: 2px dashed #d1d5db; border-radius: 8px; padding: 2rem; cursor: pointer; color: #6b7280; font-weight: 500; transition: all 0.2s; }
  .add-item-card:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
  .add-item-card .plus { font-size: 2rem; margin-bottom: 0.5rem; }
</style>
