<script lang="ts">
  import { page } from '$app/stores';
  import { soundFX } from '$lib/utils/feedback';
  import { activeTier, isMiniTier, activeFeatures } from '$lib/stores/tierStore';

  $: navItems = $isMiniTier ? [
    { name: 'Dashboard', path: '/admin', icon: '📊' },
    { name: 'Live Orders & WhatsApp', path: '/admin/orders', icon: '📋' },
    { name: 'Menu & Templates', path: '/admin/menu', icon: '🎨' },
    { name: 'Table & Payment QRs', path: '/admin/qr-codes', icon: '📱' },
    { name: 'Ethiopian Payments', path: '/admin/payments', icon: '💳' }
  ] : [
    { name: 'Dashboard', path: '/admin', icon: '📊' },
    { name: 'Live Orders', path: '/admin/orders', icon: '📋' },
    { name: 'Menu Builder', path: '/admin/menu', icon: '🍔' },
    { name: 'QR Codes & Tables', path: '/admin/qr-codes', icon: '📱' },
    { name: 'Ethiopian Payments', path: '/admin/payments', icon: '💳' },
    { name: 'Branch Locations', path: '/admin/branches', icon: '🏪' },
    { name: 'Staff & Roles', path: '/admin/staff', icon: '👥' },
    { name: 'Audit & Reviews', path: '/admin/logs', icon: '🛡️' }
  ];

  let isMobileMenuOpen = false;

  function toggleMobileMenu() {
    soundFX.playTap();
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function handleTierSelect(tier: 'MINI' | 'PRO') {
    soundFX.playTap();
    activeTier.setTier(tier);
  }
</script>

<div class="admin-shell">
  <!-- Mobile Header -->
  <header class="admin-mobile-bar">
    <div class="brand-group">
      <div class="brand-icon">🍽️</div>
      <span class="brand-title">Menu<span class="accent">{$isMiniTier ? 'Mini' : 'Pro'}</span></span>
    </div>
    <div class="header-right-tools">
      <div class="mini-tier-pill">{$activeTier}</div>
      <button class="mobile-toggle-btn" on:click={toggleMobileMenu} aria-label="Toggle Navigation">
        {isMobileMenuOpen ? '✕' : '☰'}
      </button>
    </div>
  </header>

  <!-- Sidebar -->
  <aside class="admin-sidebar" class:open={isMobileMenuOpen}>
    <div class="sidebar-brand-box">
      <div class="brand-group">
        <div class="brand-icon">🍽️</div>
        <div>
          <h2 class="brand-title">Menu<span class="accent">{$isMiniTier ? 'Mini' : 'Pro'}</span></h2>
          <span class="brand-tier-badge">{$isMiniTier ? 'Lite & Fast Edition' : 'Full Enterprise Edition'}</span>
        </div>
      </div>

      <!-- Tier Switcher Control -->
      <div class="tier-switcher-control">
        <button 
          type="button" 
          class="tier-btn" 
          class:active={$isMiniTier} 
          on:click={() => handleTierSelect('MINI')}
        >
          MenuMini
        </button>
        <button 
          type="button" 
          class="tier-btn" 
          class:active={!$isMiniTier} 
          on:click={() => handleTierSelect('PRO')}
        >
          MenuPro
        </button>
      </div>
    </div>

    <!-- Quick Ops Switchers -->
    <div class="ops-switchers-box">
      <a href="/demo-restaurant/main-branch" target="_blank" class="ops-link customer-link" on:click={() => soundFX.playTap()}>
        <span>📱 Open Mobile Menu</span>
        <span class="ext-arrow">↗</span>
      </a>
      {#if $activeFeatures.kdsEnabled}
        <a href="/demo-restaurant/main-branch/kds" target="_blank" class="ops-link kds-link" on:click={() => soundFX.playTap()}>
          <span>🔥 Open KDS Screen</span>
          <span class="ext-arrow">↗</span>
        </a>
      {/if}
    </div>

    <!-- Navigation List -->
    <nav class="sidebar-nav">
      <span class="nav-section-title">MANAGEMENT</span>
      {#each navItems as item}
        {@const isActive = $page.url.pathname === item.path}
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

    <!-- Sidebar Footer: Profile -->
    <div class="sidebar-footer">
      <div class="admin-user-profile">
        <div class="user-avatar">GM</div>
        <div class="user-info">
          <strong class="user-name">General Manager</strong>
          <small class="user-branch">Bole Medhanealem</small>
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
  .admin-shell {
    display: flex;
    min-height: 100vh;
    background: var(--bg-dark);
    color: var(--text-primary);
    overflow: hidden;
  }

  /* Mobile Bar */
  .admin-mobile-bar {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
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

  /* Sidebar */
  .admin-sidebar {
    width: 270px;
    background: var(--surface-dark);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    height: 100vh;
    position: sticky;
    top: 0;
    z-index: 900;
    transition: transform var(--duration-normal) var(--ease-spring);
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
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, var(--amber-500), var(--amber-600));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    box-shadow: 0 4px 12px var(--amber-glow);
  }

  .brand-title {
    font-family: var(--font-serif);
    font-size: 1.25rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  .accent {
    color: var(--amber-400);
  }

  .brand-tier-badge {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tier-switcher-control {
    display: flex;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 3px;
    margin-top: 1rem;
    gap: 4px;
  }

  .tier-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.4rem 0.5rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .tier-btn:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.05);
  }

  .tier-btn.active {
    background: var(--amber-500);
    color: #000000;
    box-shadow: 0 2px 8px var(--amber-glow);
  }

  .header-right-tools {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mini-tier-pill {
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.2rem 0.6rem;
    background: var(--amber-500);
    color: #000000;
    border-radius: 999px;
  }

  /* Quick Ops */
  .ops-switchers-box {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .ops-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.55rem 0.85rem;
    border-radius: var(--radius-md);
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    transition: all 120ms ease;
  }

  .customer-link {
    background: rgba(245, 158, 11, 0.1);
    color: var(--amber-400);
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  .customer-link:hover {
    background: rgba(245, 158, 11, 0.2);
  }

  .kds-link {
    background: rgba(239, 68, 68, 0.1);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .kds-link:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .ext-arrow {
    font-size: 0.85rem;
  }

  /* Nav Links */
  .sidebar-nav {
    flex: 1;
    padding: 1.25rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    overflow-y: auto;
  }

  .nav-section-title {
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--text-tertiary);
    letter-spacing: 0.08em;
    padding: 0.5rem 0.75rem 0.25rem 0.75rem;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 0.85rem;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    position: relative;
    transition: all 140ms ease;
  }

  .nav-link:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.04);
  }

  .nav-link.active {
    background: rgba(245, 158, 11, 0.12);
    color: var(--amber-400);
    font-weight: 700;
  }

  .nav-icon {
    font-size: 1.1rem;
    display: flex;
    align-items: center;
  }

  .active-indicator {
    position: absolute;
    right: 0.5rem;
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--amber-400);
    box-shadow: 0 0 8px var(--amber-400);
  }

  /* Profile Footer */
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
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--amber-400);
  }

  .user-info {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-size: 0.85rem;
    color: #FFFFFF;
  }

  .user-branch {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  /* Main Viewport */
  .admin-main-viewport {
    flex: 1;
    overflow-y: auto;
    height: 100vh;
    background: var(--bg-dark);
  }

  .main-content-scroll {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  @media (max-width: 900px) {
    .admin-mobile-bar {
      display: flex;
    }

    .admin-sidebar {
      position: fixed;
      top: 60px;
      left: 0;
      bottom: 0;
      transform: translateX(-100%);
    }

    .admin-sidebar.open {
      transform: translateX(0);
    }

    .admin-main-viewport {
      margin-top: 60px;
      height: calc(100vh - 60px);
    }

    .main-content-scroll {
      padding: 1.25rem;
    }
  }
</style>
