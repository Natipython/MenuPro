<script lang="ts">
  let staffList = [
    { id: 1, name: 'Alice Smith', email: 'alice@democafe.com', role: 'Manager', branch: 'All Branches', status: 'Active' },
    { id: 2, name: 'Bob Jones', email: 'bob@democafe.com', role: 'Head Chef', branch: 'Main Branch', status: 'Active' },
    { id: 3, name: 'Charlie Day', email: 'charlie@gmail.com', role: 'Waiter', branch: 'Airport Kiosk', status: 'Pending Invite' }
  ];

  let roles = [
    { name: 'Manager', users: 1, permissions: ['menu.edit', 'order.manage', 'staff.manage', 'analytics.view'] },
    { name: 'Head Chef', users: 1, permissions: ['menu.edit', 'order.view', 'inventory.manage'] },
    { name: 'Cashier', users: 0, permissions: ['order.manage', 'payment.view'] },
    { name: 'Waiter', users: 1, permissions: ['order.view', 'table.manage'] }
  ];

  let currentTab = 'STAFF'; // STAFF or ROLES
  let showInviteModal = false;
</script>

<svelte:head>
  <title>Staff & Roles | Admin</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1>Team Management</h1>
    <p class="subtitle">Manage staff access, roles, and branch assignments</p>
  </div>
  <div class="actions">
    {#if currentTab === 'STAFF'}
      <button class="primary-btn" on:click={() => showInviteModal = true}>+ Invite Staff</button>
    {:else}
      <button class="primary-btn">+ Create Custom Role</button>
    {/if}
  </div>
</div>

<div class="tabs">
  <button class="tab" class:active={currentTab === 'STAFF'} on:click={() => currentTab = 'STAFF'}>Staff Members</button>
  <button class="tab" class:active={currentTab === 'ROLES'} on:click={() => currentTab = 'ROLES'}>Roles & Permissions</button>
</div>

{#if currentTab === 'STAFF'}
  <div class="card">
    <table class="data-table">
      <thead>
        <tr>
          <th>Name / Email</th>
          <th>Assigned Role</th>
          <th>Branch Assignment</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each staffList as staff}
          <tr>
            <td>
              <strong>{staff.name}</strong><br/>
              <small class="text-muted">{staff.email}</small>
            </td>
            <td><span class="role-badge">{staff.role}</span></td>
            <td>{staff.branch}</td>
            <td>
              <span class="status-badge {staff.status === 'Active' ? 'active' : 'pending'}">
                {staff.status}
              </span>
            </td>
            <td class="actions-cell">
              <button class="icon-btn" title="Edit Assignment">✏️</button>
              <button class="icon-btn text-red" title="Revoke Access">🚫</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if currentTab === 'ROLES'}
  <div class="roles-grid">
    {#each roles as role}
      <div class="role-card">
        <div class="role-header">
          <h3>{role.name}</h3>
          <span class="users-count">{role.users} users</span>
        </div>
        <div class="permissions-list">
          <h4>Key Permissions:</h4>
          <ul>
            {#each role.permissions as perm}
              <li>✓ {perm.replace('.', ' ')}</li>
            {/each}
          </ul>
        </div>
        <div class="role-footer">
          <button class="text-btn">Edit Permissions</button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Invite Modal -->
{#if showInviteModal}
  <div class="modal-backdrop" on:click={() => showInviteModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Invite Team Member</h2>
        <button class="close-btn" on:click={() => showInviteModal = false}>&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" placeholder="staff@example.com" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Assign Role</label>
            <select>
              {#each roles as role}
                <option value={role.name}>{role.name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label>Branch Assignment</label>
            <select>
              <option value="all">All Branches</option>
              <option value="main">Main Branch</option>
              <option value="airport">Airport Kiosk</option>
            </select>
          </div>
        </div>
        <p class="help-text">An invitation link will be sent to their email. They must create a password to join your workspace.</p>
      </div>
      <div class="modal-footer">
        <button class="text-btn" on:click={() => showInviteModal = false}>Cancel</button>
        <button class="primary-btn" on:click={() => showInviteModal = false}>Send Invitation</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
  .page-header h1 { margin: 0 0 0.25rem 0; font-size: 1.75rem; color: #111827; }
  .subtitle { margin: 0; color: #6b7280; font-size: 0.875rem; }
  
  .primary-btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 500; cursor: pointer; }
  .text-btn { background: none; border: none; color: #3b82f6; font-weight: 500; cursor: pointer; }

  .tabs { display: flex; gap: 1rem; border-bottom: 1px solid #e5e7eb; margin-bottom: 1.5rem; }
  .tab { background: none; border: none; padding: 0.75rem 1rem; color: #6b7280; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; font-size: 1rem; }
  .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }

  .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; text-align: left; }
  .data-table th { background: #f9fafb; color: #6b7280; font-weight: 500; font-size: 0.875rem; padding: 1rem; border-bottom: 1px solid #e5e7eb; }
  .data-table td { padding: 1rem; border-bottom: 1px solid #f3f4f6; color: #111827; }
  .text-muted { color: #6b7280; }
  
  .role-badge { background: #f3f4f6; color: #374151; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; border: 1px solid #e5e7eb; }
  .status-badge { font-size: 0.75rem; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 999px; }
  .status-badge.active { background: #d1fae5; color: #065f46; }
  .status-badge.pending { background: #fef3c7; color: #92400e; }

  .actions-cell { display: flex; gap: 0.5rem; }
  .icon-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; opacity: 0.7; }
  .icon-btn:hover { opacity: 1; }

  .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
  .role-card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; display: flex; flex-direction: column; }
  .role-header { padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .role-header h3 { margin: 0; font-size: 1.25rem; color: #111827; }
  .users-count { background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.75rem; color: #4b5563; font-weight: bold; }
  
  .permissions-list { padding: 1.5rem; flex: 1; }
  .permissions-list h4 { margin: 0 0 1rem 0; font-size: 0.875rem; color: #6b7280; text-transform: uppercase; }
  .permissions-list ul { list-style: none; padding: 0; margin: 0; }
  .permissions-list li { margin-bottom: 0.5rem; color: #374151; font-size: 0.875rem; text-transform: capitalize; }
  
  .role-footer { padding: 1rem 1.5rem; background: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }

  .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
  .modal-content { background: white; width: 100%; max-width: 500px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #e5e7eb; }
  .modal-header h2 { margin: 0; font-size: 1.25rem; }
  .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
  .modal-body { padding: 1.5rem; }
  .modal-footer { padding: 1.5rem; background: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; display: flex; justify-content: flex-end; gap: 1rem; }

  .form-group { margin-bottom: 1.25rem; }
  .form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; color: #374151; font-size: 0.875rem; }
  .form-group input, .form-group select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; background: white; }
  .form-row { display: flex; gap: 1rem; }
  .form-row .form-group { flex: 1; }
  .help-text { font-size: 0.875rem; color: #6b7280; margin: 0; }
</style>
