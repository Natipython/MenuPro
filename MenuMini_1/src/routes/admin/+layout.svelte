<script lang="ts">
  import { page } from '$app/stores';
  import { soundFX } from '$lib/audio/feedback';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: '📊' },
    { name: 'Live Orders & WhatsApp', path: '/admin/orders', icon: '📋' },
    { name: 'Menu & Templates', path: '/admin/menu', icon: '🎨' },
    { name: 'Table & Payment QRs', path: '/admin/qr-codes', icon: '📱' },
    { name: 'Physical Print Shop', path: '/admin/print-shop', icon: '🖨️' }
  ];

  let isMobileMenuOpen = false;
  $: isMenuStudio = $page.url.pathname === '/admin/menu' || $page.url.pathname.startsWith('/admin/menu/');

  function toggleMobileMenu() {
    soundFX.playTap();
    isMobileMenuOpen = !isMobileMenuOpen;
  }
</script>

<div class="admin-shell">
  <!-- Mobile Header -->
  <header class="admin-mobile-bar">
    <div class="brand-group">
      <div class="brand-icon">⚡</div>
      <span class="brand-title">Menu<span class="accent">Mini</span></span>
    </div>
    <button class="mobile-toggle-btn" on:click={toggleMobileMenu} aria-label="Toggle Navigation">
      {isMobileMenuOpen ? '✕' : '☰'}
    </button>
  </header>

  <!-- Sidebar -->
  <aside class="admin-sidebar" class:open={isMobileMenuOpen}>
    <div class="sidebar-brand-box">
      <div class="brand-group">
        <div class="brand-icon">⚡</div>
        <div>
          <h2 class="brand-title">Menu<span class="accent">Mini</span></h2>
          <span class="brand-tier-badge">{isMenuStudio ? 'Menu workspace' : 'Commercial Edition'}</span>
        </div>
      </div>
    </div>

    <!-- Quick Preview Link -->
    <div class="ops-switchers-box">
      {#if isMenuStudio}<p class="studio-preview-hint">Use “Preview draft” in the studio to review your edits.</p>{:else}
      <a href={data.session?.venueSlug ? `/menu/${data.session.venueSlug}` : '/sign-in'} target="_blank" class="ops-link customer-link" on:click={() => soundFX.playTap()}>
        <span>📱 Open Live Menu</span>
        <span class="ext-arrow">↗</span>
      </a>
      {/if}
    </div>

    <!-- Navigation List -->
    <nav class="sidebar-nav">
      <span class="nav-section-title">STORE MANAGEMENT</span>
      {#each navItems as item}
        {@const isActive = $page.url.pathname === item.path || (item.path === '/admin/menu' && isMenuStudio)}
        <a 
          href={item.path} 
          class="nav-link" 
          class:active={isActive}
          on:click={() => { soundFX.playTap(); isMobileMenuOpen = false; }}
        >
          <span class="nav-icon">{item.icon}</span>
          <span class="nav-label">{item.name}</span>
          {#if isActive}
            <div class="active-indicator"></div>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
      <div class="admin-user-profile">
        <div class="user-avatar">☕</div>
        <div class="user-info">
          <strong class="user-name">{isMenuStudio ? 'Menu Studio' : 'Manager Console'}</strong>
          <small class="user-branch">{isMenuStudio ? $page.data.access === 'VERIFIED' ? 'Business workspace' : 'Preparation only' : 'Bole Medhanealem'}</small>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Content Viewport -->
  <main class="admin-main-viewport">
    <div class="main-content-scroll">
      <slot />
    </div>
  </main>
</div>

<style>
  .studio-preview-hint { color:var(--text-secondary); font-size:.8rem; line-height:1.5; padding:.75rem; }
  .admin-shell {
    display: flex;
    min-height: 100vh;
    background: var(--bg-dark);
    color: var(--text-primary);
  }

  .admin-mobile-bar {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 60px;
    background: var(--surface-dark);
    border-bottom: 1px solid var(--border);
    padding: 0 1.25rem;
    align-items: center;
    justify-content: space-between;
    z-index: 1000;
  }

  .mobile-toggle-btn {
    background: transparent;
    border: none;
    color: #FFFFFF;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .admin-sidebar {
    width: 270px;
    background: var(--surface-dark);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: sticky;
    top: 0;
    z-index: 900;
  }

  .sidebar-brand-box {
    padding: 1.5rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .brand-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .brand-icon {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, var(--amber-500), var(--amber-600));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: #000000;
    font-weight: 800;
    box-shadow: 0 4px 12px var(--amber-glow);
  }

  .brand-title {
    font-family: var(--font-serif);
    font-size: 1.3rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  .accent {
    color: var(--amber-400);
  }

  .brand-tier-badge {
    font-size: 0.68rem;
    font-weight: 800;
    color: #10B981;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ops-switchers-box {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .ops-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.85rem;
    border-radius: var(--radius-md);
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    background: rgba(245, 158, 11, 0.1);
    color: var(--amber-400);
    border: 1px solid rgba(245, 158, 11, 0.2);
    transition: all 120ms ease;
  }

  .ops-link:hover {
    background: rgba(245, 158, 11, 0.18);
  }

  .sidebar-nav {
    flex: 1;
    padding: 1.25rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .nav-section-title {
    font-size: 0.65rem;
    font-weight: 800;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 0.5rem;
    margin-bottom: 0.5rem;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.7rem 0.85rem;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.88rem;
    font-weight: 600;
    position: relative;
    transition: all 140ms ease;
  }

  .nav-link:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.04);
  }

  .nav-link.active {
    color: #FFFFFF;
    background: rgba(245, 158, 11, 0.12);
  }

  .active-indicator {
    position: absolute;
    right: 0.75rem;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--amber-500);
    box-shadow: 0 0 8px var(--amber-500);
  }

  .sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border);
  }

  .admin-user-profile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--surface-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-info {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-size: 0.82rem;
    color: #FFFFFF;
  }

  .user-branch {
    font-size: 0.72rem;
    color: var(--text-tertiary);
  }

  .admin-main-viewport {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }

  @media (max-width: 900px) {
    .admin-mobile-bar { display: flex; }
    .admin-sidebar {
      position: fixed;
      top: 60px; left: 0; bottom: 0;
      transform: translateX(-100%);
      transition: transform var(--duration-normal) var(--ease-spring);
    }
    .admin-sidebar.open {
      transform: translateX(0);
    }
    .admin-main-viewport {
      padding: 5rem 1rem 2rem 1rem;
    }
  }
</style>
