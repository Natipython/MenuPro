<script lang="ts">
  import { soundFX, addToast } from '$lib/utils/feedback';

  interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: string;
    branch: string;
    pin: string;
    status: 'ACTIVE' | 'INVITED';
  }

  let staffList: StaffMember[] = [
    { id: 'st-1', name: 'Yared T.', email: 'yared@gourmetbistro.com', role: 'General Manager', branch: 'All Locations', pin: '4821', status: 'ACTIVE' },
    { id: 'st-2', name: 'Chef Tadesse', email: 'tadesse@kitchen.com', role: 'Head Chef (Expo)', branch: 'Bole Medhanealem', pin: '1102', status: 'ACTIVE' },
    { id: 'st-3', name: 'Hiwot A.', email: 'hiwot@service.com', role: 'Floor Server', branch: 'Bole Medhanealem', pin: '7741', status: 'ACTIVE' },
    { id: 'st-4', name: 'Samuel B.', email: 'samuel@cash.com', role: 'Cashier & POS', branch: 'Kazanchis Tower', pin: '9032', status: 'INVITED' }
  ];

  let roles = [
    { name: 'General Manager', users: 1, permissions: ['Full Admin', 'Financial CSV Export', 'Menu Editing', 'Staff RBAC'] },
    { name: 'Head Chef (Expo)', users: 1, permissions: ['Kitchen Display (KDS)', '86 Item Availability', 'Recipe Control'] },
    { name: 'Floor Server', users: 1, permissions: ['Table Ordering', 'Waiter Call Response', 'Bill Printing'] },
    { name: 'Cashier & POS', users: 1, permissions: ['TXN Verification', 'Cash Register', 'Split Bill'] }
  ];

  let currentTab: 'STAFF' | 'ROLES' = 'STAFF';
  let showInviteModal = false;
  let newStaff = {
    name: '',
    email: '',
    role: 'Floor Server',
    branch: 'Bole Medhanealem'
  };

  function generateRandomPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  function inviteStaff() {
    if (!newStaff.name.trim() || !newStaff.email.trim()) {
      soundFX.playError();
      addToast({ type: 'warning', title: 'Details Needed', message: 'Please provide staff name and email.' });
      return;
    }

    soundFX.playSuccess();
    const pin = generateRandomPin();
    const created: StaffMember = {
      id: `st-${Date.now()}`,
      name: newStaff.name,
      email: newStaff.email,
      role: newStaff.role,
      branch: newStaff.branch,
      pin,
      status: 'INVITED'
    };

    staffList = [...staffList, created];
    showInviteModal = false;
    addToast({
      type: 'success',
      title: 'Invitation Sent',
      message: `Invited ${created.name} (${created.role}) with Terminal PIN: ${pin}.`
    });

    newStaff = { name: '', email: '', role: 'Floor Server', branch: 'Bole Medhanealem' };
  }

  function copyPin(pin: string, name: string) {
    soundFX.playTap();
    navigator.clipboard.writeText(pin);
    addToast({
      type: 'info',
      title: 'Terminal PIN Copied',
      message: `${name}'s PIN (${pin}) copied.`
    });
  }
</script>

<svelte:head>
  <title>Staff & Roles (RBAC) | Admin Suite</title>
</svelte:head>

<div class="staff-page">
  <!-- Top Bar -->
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Team Access & Terminal Roles</h1>
      <p class="page-subtitle">Manage role-based permissions and fast 4-digit PINs for waiters and kitchen tablets.</p>
    </div>

    <div class="top-actions">
      <button class="btn-tactile btn-primary btn-invite" on:click={() => { soundFX.playTap(); showInviteModal = true; }}>
        <span>+ Invite Staff Member</span>
      </button>
    </div>
  </header>

  <!-- Tabs -->
  <div class="tabs-row">
    <button 
      type="button" 
      class="tab-btn" 
      class:active={currentTab === 'STAFF'}
      on:click={() => { soundFX.playTap(); currentTab = 'STAFF'; }}
    >
      Staff Roster ({staffList.length})
    </button>
    <button 
      type="button" 
      class="tab-btn" 
      class:active={currentTab === 'ROLES'}
      on:click={() => { soundFX.playTap(); currentTab = 'ROLES'; }}
    >
      Permissions Matrix ({roles.length} Roles)
    </button>
  </div>

  {#if currentTab === 'STAFF'}
    <!-- Staff Table Card -->
    <div class="card table-card">
      <table class="staff-table">
        <thead>
          <tr>
            <th>Team Member</th>
            <th>Role</th>
            <th>Assigned Branch</th>
            <th>Tablet / Terminal PIN</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each staffList as staff}
            <tr>
              <td>
                <div class="member-cell">
                  <div class="member-avatar">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <strong class="member-name">{staff.name}</strong>
                    <span class="member-email text-muted">{staff.email}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="role-badge">{staff.role}</span>
              </td>
              <td class="font-sans text-secondary">{staff.branch}</td>
              <td>
                <button 
                  type="button" 
                  class="btn-pin-pill font-mono"
                  on:click={() => copyPin(staff.pin, staff.name)}
                  title="Click to copy terminal PIN"
                >
                  <span class="lock-icon">🔒</span>
                  <span>{staff.pin}</span>
                </button>
              </td>
              <td>
                <span class="status-pill status-{staff.status.toLowerCase()}">
                  {staff.status === 'ACTIVE' ? 'Active' : 'Pending Invite'}
                </span>
              </td>
              <td class="text-right">
                <button class="btn-text-action" on:click={() => copyPin(staff.pin, staff.name)}>
                  Reset PIN
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <!-- Roles Matrix -->
    <div class="roles-grid">
      {#each roles as role}
        <div class="card role-card">
          <div class="role-card-header">
            <h3 class="role-name">{role.name}</h3>
            <span class="users-badge font-mono">{role.users} active</span>
          </div>

          <div class="permissions-list">
            <span class="perm-title">Allowed Capabilities:</span>
            {#each role.permissions as perm}
              <div class="perm-item">
                <span class="perm-check">✓</span>
                <span>{perm}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Invite Staff Modal -->
{#if showInviteModal}
  <div class="modal-backdrop" on:click={() => showInviteModal = false} role="dialog" aria-modal="true">
    <div class="modal-card" on:click|stopPropagation>
      <div class="modal-head">
        <h3 class="modal-title">Invite Team Member</h3>
        <button class="modal-close" on:click={() => showInviteModal = false}>&times;</button>
      </div>

      <div class="modal-form-body">
        <div class="form-group">
          <label for="st-name" class="form-label">Full Name *</label>
          <input id="st-name" type="text" bind:value={newStaff.name} placeholder="e.g. Almaz Kebede" class="form-control" required />
        </div>

        <div class="form-group">
          <label for="st-email" class="form-label">Email Address *</label>
          <input id="st-email" type="email" bind:value={newStaff.email} placeholder="almaz@restaurant.com" class="form-control" required />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label for="st-role" class="form-label">Operational Role</label>
            <select id="st-role" bind:value={newStaff.role} class="form-control">
              <option value="General Manager">General Manager</option>
              <option value="Head Chef (Expo)">Head Chef (Expo)</option>
              <option value="Floor Server">Floor Server</option>
              <option value="Cashier & POS">Cashier & POS</option>
            </select>
          </div>

          <div class="form-group">
            <label for="st-branch" class="form-label">Branch Assignment</label>
            <select id="st-branch" bind:value={newStaff.branch} class="form-control">
              <option value="Bole Medhanealem">Bole Medhanealem</option>
              <option value="Kazanchis Tower">Kazanchis Tower</option>
              <option value="All Locations">All Locations</option>
            </select>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-tactile btn-secondary" on:click={() => showInviteModal = false}>
          Cancel
        </button>
        <button type="button" class="btn-tactile btn-primary" on:click={inviteStaff}>
          Send Invitation & Generate PIN
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .staff-page {
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

  .btn-invite {
    padding: 0.75rem 1.25rem;
    font-size: 0.88rem;
  }

  /* Tabs */
  .tabs-row {
    display: flex;
    gap: 0.5rem;
  }

  .tab-btn {
    padding: 0.6rem 1.2rem;
    border-radius: var(--radius-md);
    background: var(--surface-dark);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .tab-btn:hover {
    color: #FFFFFF;
  }

  .tab-btn.active {
    background: var(--amber-500);
    border-color: var(--amber-500);
    color: #090A0F;
    font-weight: 700;
  }

  .card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
  }

  /* Table */
  .table-card {
    padding: 0;
    overflow: hidden;
  }

  .staff-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    text-align: left;
  }

  .staff-table th {
    padding: 0.9rem 1.25rem;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
  }

  .staff-table td {
    padding: 1.15rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
  }

  .member-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .member-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: var(--amber-400);
  }

  .member-name {
    display: block;
    color: #FFFFFF;
    font-size: 0.92rem;
  }

  .member-email {
    font-size: 0.78rem;
    color: var(--text-tertiary);
  }

  .role-badge {
    padding: 0.25rem 0.65rem;
    border-radius: var(--radius-xs);
    background: var(--surface-elevated);
    color: #FFFFFF;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .btn-pin-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.65rem;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    color: var(--amber-400);
    font-weight: 700;
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .btn-pin-pill:hover {
    border-color: var(--amber-400);
    background: rgba(245, 158, 11, 0.1);
  }

  .lock-icon {
    font-size: 0.75rem;
  }

  .status-pill {
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
  }

  .status-active { background: rgba(16, 185, 129, 0.15); color: var(--color-success); }
  .status-invited { background: rgba(245, 158, 11, 0.15); color: var(--amber-400); }

  .btn-text-action {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.82rem;
    cursor: pointer;
  }

  .btn-text-action:hover {
    color: #FFFFFF;
  }

  .text-right { text-align: right; }

  /* Roles Grid */
  .roles-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }

  .role-card {
    padding: 1.5rem;
  }

  .role-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  .role-name {
    font-family: var(--font-serif);
    font-size: 1.25rem;
    color: #FFFFFF;
    margin: 0;
  }

  .users-badge {
    font-size: 0.78rem;
    color: var(--text-tertiary);
  }

  .permissions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .perm-title {
    font-size: 0.78rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .perm-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  .perm-check {
    color: var(--color-success);
    font-weight: 700;
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
