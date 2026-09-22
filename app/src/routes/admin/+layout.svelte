<script lang="ts">
  import { page } from '$app/stores';
  
  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: '📊' },
    { name: 'Live Orders', path: '/admin/orders', icon: '📋' },
    { name: 'Menu Builder', path: '/admin/menu', icon: '🍔' },
    { name: 'Branches', path: '/admin/branches', icon: '🏪' },
    { name: 'QR Codes', path: '/admin/qr-codes', icon: '📱' },
    { name: 'Team & Roles', path: '/admin/staff', icon: '👥' },
    { name: 'Audit & Feedback', path: '/admin/logs', icon: '🛡️' },
    { name: 'Settings', path: '/admin/settings', icon: '⚙️' }
  ];
</script>

<div class="admin-layout">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="brand">
      <h2>MenuApp Pro</h2>
      <span class="badge">Business Admin</span>
    </div>
    
    <nav class="nav-menu">
      {#each navItems as item}
        <a 
          href={item.path} 
          class="nav-link" 
          class:active={$page.url.pathname === item.path}
        >
          <span class="icon">{item.icon}</span>
          {item.name}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <div class="user-profile">
        <div class="avatar">O</div>
        <div class="info">
          <strong>Owner Name</strong>
          <small>owner@democafe.com</small>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Content Area -->
  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  :global(body) { background-color: #f3f4f6; margin: 0; font-family: system-ui, sans-serif; }
  
  .admin-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .sidebar {
    width: 260px;
    background: #111827;
    color: white;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .brand {
    padding: 1.5rem;
    border-bottom: 1px solid #374151;
  }

  .brand h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
  }

  .badge {
    background: #3b82f6;
    color: white;
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .nav-menu {
    flex: 1;
    padding: 1.5rem 1rem;
    overflow-y: auto;
  }

  .nav-link {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    color: #9ca3af;
    text-decoration: none;
    border-radius: 6px;
    margin-bottom: 0.5rem;
    transition: all 0.2s;
  }

  .nav-link:hover {
    background: #1f2937;
    color: white;
  }

  .nav-link.active {
    background: #3b82f6;
    color: white;
  }

  .nav-link .icon {
    margin-right: 0.75rem;
    font-size: 1.25rem;
  }

  .sidebar-footer {
    padding: 1.5rem;
    border-top: 1px solid #374151;
  }

  .user-profile {
    display: flex;
    align-items: center;
  }

  .avatar {
    width: 40px; height: 40px;
    background: #374151;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; margin-right: 1rem;
  }

  .info { display: flex; flex-direction: column; }
  .info strong { font-size: 0.875rem; }
  .info small { color: #9ca3af; font-size: 0.75rem; }

  .main-content {
    flex: 1;
    overflow-y: auto;
    background: #f9fafb;
    padding: 2rem;
  }
</style>
