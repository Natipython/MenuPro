<script lang="ts">
  import { soundFX, addToast } from '$lib/utils/feedback';

  interface BranchItem {
    id: string;
    name: string;
    city: string;
    address: string;
    status: 'ACTIVE' | 'CLOSED' | 'SETUP';
    tables: number;
    activeOrders: number;
    slug: string;
    phone: string;
  }

  let branches: BranchItem[] = [
    { id: 'b-1', name: 'Bole Medhanealem (Flagship)', city: 'Addis Ababa', address: 'Cameroon St, Next to Edna Mall', status: 'ACTIVE', tables: 22, activeOrders: 6, slug: 'bole-branch', phone: '+251 911 234 567' },
    { id: 'b-2', name: 'Kazanchis Business Tower', city: 'Addis Ababa', address: 'ECA Road, Commercial Bank Tower L2', status: 'ACTIVE', tables: 14, activeOrders: 3, slug: 'kazanchis-branch', phone: '+251 911 889 001' },
    { id: 'b-3', name: 'Sarbet Old Airport', city: 'Addis Ababa', address: 'Roosevelt St, Near Pushkin Sq', status: 'SETUP', tables: 18, activeOrders: 0, slug: 'sarbet-branch', phone: '+251 911 442 119' }
  ];

  let showModal = false;
  let newBranch = {
    name: '',
    address: '',
    city: 'Addis Ababa',
    tables: 15,
    phone: ''
  };

  function toggleBranchStatus(id: string) {
    soundFX.playTap();
    branches = branches.map(b => {
      if (b.id === id) {
        const next = b.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
        addToast({
          type: next === 'ACTIVE' ? 'success' : 'warning',
          title: 'Branch Status Changed',
          message: `${b.name} is now ${next === 'ACTIVE' ? 'open for dining' : 'temporarily closed'}.`
        });
        return { ...b, status: next };
      }
      return b;
    });
  }

  function addBranch() {
    if (!newBranch.name.trim()) {
      soundFX.playError();
      addToast({ type: 'warning', title: 'Name Required', message: 'Please enter a branch name.' });
      return;
    }

    soundFX.playSuccess();
    const created: BranchItem = {
      id: `b-${Date.now()}`,
      name: newBranch.name,
      city: newBranch.city,
      address: newBranch.address || 'Addis Ababa, Ethiopia',
      status: 'ACTIVE',
      tables: Number(newBranch.tables) || 12,
      activeOrders: 0,
      slug: newBranch.name.toLowerCase().replace(/\s+/g, '-'),
      phone: newBranch.phone || '+251 911 000 000'
    };

    branches = [...branches, created];
    showModal = false;
    addToast({
      type: 'success',
      title: 'Branch Added',
      message: `${created.name} initialized with ${created.tables} tables.`
    });

    newBranch = { name: '', address: '', city: 'Addis Ababa', tables: 15, phone: '' };
  }
</script>

<svelte:head>
  <title>Branch Locations | Admin Suite</title>
</svelte:head>

<div class="branches-page">
  <!-- Top Bar -->
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Branch Locations & Outlets</h1>
      <p class="page-subtitle">Manage physical restaurant locations, capacity, operating hours, and live KDS links.</p>
    </div>

    <div class="top-actions">
      <button class="btn-tactile btn-primary btn-add-branch" on:click={() => { soundFX.playTap(); showModal = true; }}>
        <span>+ Add New Location</span>
      </button>
    </div>
  </header>

  <!-- Branches Grid -->
  <div class="branches-grid">
    {#each branches as branch}
      <div class="card branch-card" class:inactive={branch.status === 'CLOSED'}>
        <div class="branch-card-header">
          <div>
            <div class="branch-status-row">
              <span class="status-pill status-{branch.status.toLowerCase()}">
                {branch.status === 'ACTIVE' ? '● Open & Serving' : branch.status === 'CLOSED' ? '○ Temporarily Closed' : '⚙ In Setup'}
              </span>
              {#if branch.activeOrders > 0}
                <span class="live-orders-badge font-mono">{branch.activeOrders} active tickets</span>
              {/if}
            </div>
            <h2 class="branch-title">{branch.name}</h2>
            <p class="branch-address font-sans">📍 {branch.address}</p>
          </div>

          <button 
            type="button" 
            class="toggle-status-btn"
            title="Toggle Open/Close Status"
            on:click={() => toggleBranchStatus(branch.id)}
          >
            {branch.status === 'ACTIVE' ? 'Close Station' : 'Open Station'}
          </button>
        </div>

        <div class="branch-meta-row">
          <div class="meta-item">
            <span class="meta-val font-mono">{branch.tables}</span>
            <span class="meta-lbl">Dining Tables</span>
          </div>
          <div class="meta-divider"></div>
          <div class="meta-item">
            <span class="meta-val">{branch.city}</span>
            <span class="meta-lbl">Region</span>
          </div>
          <div class="meta-divider"></div>
          <div class="meta-item">
            <span class="meta-val font-mono">{branch.phone}</span>
            <span class="meta-lbl">Contact Phone</span>
          </div>
        </div>

        <div class="branch-actions-row">
          <a href="/demo-restaurant/{branch.slug}" target="_blank" class="btn-tactile btn-secondary btn-action-sm">
            <span>📱 View Menu</span>
            <span class="ext-ico">↗</span>
          </a>
          <a href="/demo-restaurant/{branch.slug}/kds" target="_blank" class="btn-tactile btn-secondary btn-action-sm">
            <span>🔥 Open KDS</span>
            <span class="ext-ico">↗</span>
          </a>
          <a href="/admin/qr-codes" class="btn-tactile btn-secondary btn-action-sm">
            <span>🖨️ Tables QR</span>
          </a>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Add Branch Modal -->
{#if showModal}
  <div class="modal-backdrop" on:click={() => showModal = false} role="dialog" aria-modal="true">
    <div class="modal-card" on:click|stopPropagation>
      <div class="modal-head">
        <h3 class="modal-title">Register New Branch Location</h3>
        <button class="modal-close" on:click={() => showModal = false}>&times;</button>
      </div>

      <div class="modal-form-body">
        <div class="form-group">
          <label for="branch-name" class="form-label">Location / Outlet Name *</label>
          <input 
            id="branch-name"
            type="text" 
            bind:value={newBranch.name} 
            placeholder="e.g. Kazanchis Business Tower" 
            class="form-control"
            required
          />
        </div>

        <div class="form-group">
          <label for="branch-addr" class="form-label">Physical Address *</label>
          <input 
            id="branch-addr"
            type="text" 
            bind:value={newBranch.address} 
            placeholder="e.g. Commercial Bank Tower L2, Addis Ababa" 
            class="form-control"
          />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label for="branch-tables" class="form-label">Table Count</label>
            <input 
              id="branch-tables"
              type="number" 
              bind:value={newBranch.tables} 
              class="form-control font-mono"
            />
          </div>
          <div class="form-group">
            <label for="branch-phone" class="form-label">Branch Phone</label>
            <input 
              id="branch-phone"
              type="tel" 
              bind:value={newBranch.phone} 
              placeholder="+251 911..." 
              class="form-control"
            />
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-tactile btn-secondary" on:click={() => showModal = false}>
          Cancel
        </button>
        <button type="button" class="btn-tactile btn-primary" on:click={addBranch}>
          Create & Setup QR Codes
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .branches-page {
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

  .btn-add-branch {
    padding: 0.75rem 1.25rem;
    font-size: 0.88rem;
  }

  .card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
  }

  /* Branches Grid */
  .branches-grid {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .branch-card {
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    transition: all 140ms ease;
  }

  .branch-card.inactive {
    opacity: 0.6;
  }

  .branch-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .branch-status-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .status-pill {
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.2rem 0.65rem;
    border-radius: var(--radius-full);
  }

  .status-active { background: rgba(16, 185, 129, 0.15); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.3); }
  .status-closed { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.3); }
  .status-setup { background: rgba(245, 158, 11, 0.15); color: var(--amber-400); border: 1px solid rgba(245, 158, 11, 0.3); }

  .live-orders-badge {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--amber-400);
  }

  .branch-title {
    font-family: var(--font-serif);
    font-size: 1.45rem;
    color: #FFFFFF;
    margin: 0 0 0.25rem 0;
  }

  .branch-address {
    font-size: 0.88rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .toggle-status-btn {
    padding: 0.45rem 0.85rem;
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .toggle-status-btn:hover {
    color: #FFFFFF;
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* Meta Row */
  .branch-meta-row {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding: 1rem;
    background: var(--surface-elevated);
    border-radius: var(--radius-lg);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
  }

  .meta-val {
    font-size: 1.15rem;
    font-weight: 700;
    color: #FFFFFF;
  }

  .meta-lbl {
    font-size: 0.72rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .meta-divider {
    width: 1px;
    height: 30px;
    background: var(--border);
  }

  /* Actions Row */
  .branch-actions-row {
    display: flex;
    gap: 0.75rem;
  }

  .btn-action-sm {
    font-size: 0.82rem;
    padding: 0.5rem 1rem;
    gap: 0.4rem;
  }

  .ext-ico {
    font-size: 0.85rem;
  }

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

  .modal-form-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
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

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
</style>
