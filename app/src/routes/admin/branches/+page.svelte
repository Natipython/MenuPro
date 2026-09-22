<script lang="ts">
  let branches = [
    { id: 1, name: 'Main Branch', address: '123 Downtown St', status: 'Active', tables: 15 },
    { id: 2, name: 'Airport Kiosk', address: 'Terminal 2', status: 'Active', tables: 0 },
    { id: 3, name: 'Mall Food Court', address: 'MegaMall Level 3', status: 'Setup', tables: 8 }
  ];

  let showModal = false;
</script>

<svelte:head>
  <title>Branch Management | Admin</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1>Branch & Franchise Management</h1>
    <p class="subtitle">Manage locations, operating hours, and service availability</p>
  </div>
  <button class="primary-btn" on:click={() => showModal = true}>+ Add New Branch</button>
</div>

<div class="card">
  <table class="data-table">
    <thead>
      <tr>
        <th>Branch Name</th>
        <th>Address</th>
        <th>Tables</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each branches as branch}
        <tr>
          <td><strong>{branch.name}</strong></td>
          <td>{branch.address}</td>
          <td>{branch.tables > 0 ? branch.tables : 'Takeaway Only'}</td>
          <td><span class="status-badge {branch.status.toLowerCase()}">{branch.status}</span></td>
          <td class="actions">
            <button class="icon-btn" title="Edit">✏️</button>
            <button class="icon-btn" title="Operating Hours">🕒</button>
            <button class="icon-btn text-red" title="Delete">🗑️</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showModal}
  <div class="modal-backdrop" on:click={() => showModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Add New Location</h2>
        <button class="close-btn" on:click={() => showModal = false}>&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Branch Name</label>
          <input type="text" placeholder="e.g. Uptown Plaza" />
        </div>
        <div class="form-group">
          <label>Address</label>
          <input type="text" placeholder="Full address" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Accepts Dine-In?</label>
            <input type="checkbox" checked />
          </div>
          <div class="form-group">
            <label>Number of Tables</label>
            <input type="number" placeholder="e.g. 20" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="text-btn" on:click={() => showModal = false}>Cancel</button>
        <button class="primary-btn" on:click={() => showModal = false}>Save Branch</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
  .page-header h1 { margin: 0 0 0.25rem 0; font-size: 1.75rem; color: #111827; }
  .subtitle { margin: 0; color: #6b7280; font-size: 0.875rem; }
  
  .primary-btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
  .primary-btn:hover { background: #2563eb; }
  .text-btn { background: none; border: none; color: #6b7280; font-weight: 500; cursor: pointer; padding: 0.75rem 1rem; }

  .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; text-align: left; }
  .data-table th { background: #f9fafb; color: #6b7280; font-weight: 500; font-size: 0.875rem; padding: 1rem; border-bottom: 1px solid #e5e7eb; }
  .data-table td { padding: 1rem; border-bottom: 1px solid #f3f4f6; color: #111827; }
  .data-table tr:last-child td { border-bottom: none; }
  
  .status-badge { font-size: 0.75rem; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 999px; }
  .status-badge.active { background: #d1fae5; color: #065f46; }
  .status-badge.setup { background: #fef3c7; color: #92400e; }

  .actions { display: flex; gap: 0.5rem; }
  .icon-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; opacity: 0.7; transition: opacity 0.2s; }
  .icon-btn:hover { opacity: 1; }
  .text-red { filter: grayscale(1); }
  .text-red:hover { filter: none; }

  .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
  .modal-content { background: white; width: 100%; max-width: 500px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #e5e7eb; }
  .modal-header h2 { margin: 0; font-size: 1.25rem; }
  .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
  .modal-body { padding: 1.5rem; }
  .modal-footer { padding: 1.5rem; background: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; display: flex; justify-content: flex-end; gap: 1rem; }

  .form-group { margin-bottom: 1.25rem; }
  .form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; color: #374151; font-size: 0.875rem; }
  .form-group input[type="text"], .form-group input[type="number"] { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
  .form-row { display: flex; gap: 1rem; }
  .form-row .form-group { flex: 1; }
</style>
