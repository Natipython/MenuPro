<script lang="ts">
  export let data;
  const { business, branch, tableId, template } = data;
  
  let activeSection = template.sections.find(s => s.isDefaultVisible) || template.sections[0];

  function selectSection(section) {
    activeSection = section;
  }
</script>

<svelte:head>
  <title>{business.name} | Menu</title>
</svelte:head>

<div class="menu-container">
  <!-- Header -->
  <header class="business-header">
    <div class="cover-image"></div>
    <div class="header-content">
      <h1>{business.name}</h1>
      <p class="branch-name">{branch.name} {tableId ? `• Table ${tableId}` : ''}</p>
      {#if template.tags}
        <div class="tags">
          {#each template.tags.slice(0, 3) as tag}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      {/if}
    </div>
  </header>

  <!-- Navigation / Categories -->
  <nav class="section-nav">
    {#each template.sections as section}
      <button 
        class="nav-item {activeSection.id === section.id ? 'active' : ''}"
        on:click={() => selectSection(section)}
      >
        <span class="icon">{section.icon || ''}</span>
        {section.name}
      </button>
    {/each}
  </nav>

  <!-- Active Section Content -->
  <main class="menu-content">
    <div class="section-header">
      <h2>{activeSection.name}</h2>
      {#if activeSection.description}
        <p class="section-desc">{activeSection.description}</p>
      {/if}
    </div>

    {#if activeSection.subSections && activeSection.subSections.length > 0}
      {#each activeSection.subSections as sub}
        <div class="sub-section">
          <h3>{sub.name}</h3>
          <!-- Items would go here -->
          <div class="placeholder-items">
            <div class="item-card">
              <div class="item-info">
                <h4>Sample Item 1</h4>
                <p>Description for sample item goes here.</p>
                <span class="price">$12.00</span>
              </div>
              <div class="item-image-placeholder"></div>
            </div>
          </div>
        </div>
      {/each}
    {:else}
      <!-- Items without sub-sections -->
      <div class="placeholder-items">
        <div class="item-card">
          <div class="item-info">
            <h4>Sample Item</h4>
            <p>Description for sample item.</p>
            <span class="price">$9.50</span>
          </div>
          <div class="item-image-placeholder"></div>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .menu-container {
    padding-bottom: 100px; /* Space for bottom cart bar */
  }

  .business-header {
    background: white;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .cover-image {
    height: 150px;
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  }

  .header-content {
    padding: 1rem;
    text-align: center;
    margin-top: -30px;
  }

  .header-content h1 {
    font-size: 1.5rem;
    background: white;
    display: inline-block;
    padding: 0.5rem 1.5rem;
    border-radius: var(--radius-lg);
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    margin: 0;
  }

  .branch-name {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }

  .tags {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--surface);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .section-nav {
    display: flex;
    overflow-x: auto;
    padding: 0.5rem 1rem;
    background: white;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    scrollbar-width: none; /* Firefox */
  }
  
  .section-nav::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: none;
    border: none;
    padding: 0.5rem;
    white-space: nowrap;
    color: var(--text-muted);
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .nav-item.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

  .nav-item .icon {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .menu-content {
    padding: 1rem;
  }

  .section-header {
    margin-bottom: 1.5rem;
  }

  .section-desc {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .sub-section h3 {
    font-size: 1.1rem;
    color: var(--text-main);
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  .item-card {
    display: flex;
    justify-content: space-between;
    background: white;
    padding: 1rem;
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .item-info {
    flex: 1;
    padding-right: 1rem;
  }

  .item-info h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
  }

  .item-info p {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .price {
    font-weight: 600;
    color: var(--text-main);
  }

  .item-image-placeholder {
    width: 80px;
    height: 80px;
    background: var(--surface);
    border-radius: var(--radius-sm);
  }
</style>
