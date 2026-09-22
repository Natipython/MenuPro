<script lang="ts">
  let branches = [
    { id: 1, name: 'Main Branch' },
    { id: 2, name: 'Airport Kiosk' }
  ];
  let selectedBranch = 1;
  let numTables = 15;

  let qrCodes = Array.from({ length: 15 }, (_, i) => ({
    table: i + 1,
    url: `https://menu.app/demo-cafe/main-branch?t=${i + 1}`,
    scans: Math.floor(Math.random() * 100)
  }));
</script>

<svelte:head>
  <title>QR Codes | Admin</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1>QR Code Generator</h1>
    <p class="subtitle">Generate, print, and track QR codes for your tables</p>
  </div>
  <div class="actions">
    <button class="secondary-btn">Download All as PDF</button>
  </div>
</div>

<div class="controls-card">
  <div class="form-row">
    <div class="form-group">
      <label>Select Branch</label>
      <select bind:value={selectedBranch}>
        {#each branches as branch}
          <option value={branch.id}>{branch.name}</option>
        {/each}
      </select>
    </div>
    <div class="form-group">
      <label>Number of Tables to Generate</label>
      <div class="input-with-btn">
        <input type="number" bind:value={numTables} min="1" max="100" />
        <button class="primary-btn">Generate</button>
      </div>
    </div>
  </div>
</div>

<div class="qr-grid">
  <!-- General Branch QR Code -->
  <div class="qr-card standout">
    <div class="qr-header">
      <h3>General Branch Menu</h3>
      <span class="badge">No Table Bound</span>
    </div>
    <div class="qr-image-placeholder standout-qr">
      <span>[ QR Code Image ]</span>
    </div>
    <div class="qr-footer">
      <input type="text" readonly value="https://menu.app/demo-cafe/main-branch" />
      <button class="icon-btn" title="Download PNG">⬇️</button>
    </div>
  </div>

  <!-- Table specific QR Codes -->
  {#each qrCodes as qr}
    <div class="qr-card">
      <div class="qr-header">
        <h3>Table {qr.table}</h3>
        <span class="scans">{qr.scans} scans today</span>
      </div>
      <div class="qr-image-placeholder">
        <span>[ QR Code Image ]</span>
      </div>
      <div class="qr-footer">
        <input type="text" readonly value={qr.url} />
        <button class="icon-btn" title="Download PNG">⬇️</button>
      </div>
    </div>
  {/each}
</div>

<style>
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
  .page-header h1 { margin: 0 0 0.25rem 0; font-size: 1.75rem; color: #111827; }
  .subtitle { margin: 0; color: #6b7280; font-size: 0.875rem; }
  
  .primary-btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 500; cursor: pointer; }
  .secondary-btn { background: white; border: 1px solid #d1d5db; color: #374151; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 500; cursor: pointer; }

  .controls-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
  .form-row { display: flex; gap: 1.5rem; align-items: flex-end; }
  .form-group { flex: 1; }
  .form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; color: #374151; font-size: 0.875rem; }
  select, input[type="number"] { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; background: white; }
  
  .input-with-btn { display: flex; gap: 0.5rem; }
  .input-with-btn input { flex: 1; }

  .qr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
  .qr-card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; }
  .qr-card.standout { border: 2px solid #3b82f6; }
  
  .qr-header { padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .qr-header h3 { margin: 0; font-size: 1.1rem; }
  .badge { background: #3b82f6; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
  .scans { color: #6b7280; font-size: 0.875rem; }

  .qr-image-placeholder { height: 200px; background: #f9fafb; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
  .standout-qr { background: #eff6ff; color: #3b82f6; }

  .qr-footer { padding: 1rem; display: flex; gap: 0.5rem; background: #f9fafb; border-top: 1px solid #e5e7eb; }
  .qr-footer input { flex: 1; font-size: 0.75rem; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; background: white; color: #6b7280; }
  .icon-btn { background: white; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; padding: 0 0.5rem; }
</style>
