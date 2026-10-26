<script lang="ts">
  import { soundFX, addToast } from '$lib/utils/feedback';
  import { isMiniTier } from '$lib/stores/tierStore';
  import { MINI_TABLE_QR_TEMPLATES, type MiniTableQrTemplate } from '$lib/types/miniTemplates';

  let selectedStandTemplate: MiniTableQrTemplate = MINI_TABLE_QR_TEMPLATES[0];
  let showOrderPrintsModal = false;
  let printQuantity = 12;
  let selectedMaterial = 'Laminated 350gsm Cardstock (ETB 45 / unit)';
  let deliveryAddress = 'Bole Subcity, House #402, Addis Ababa';
  let contactPhone = '0911223344';

  const materialOptions = [
    { name: 'Laminated 350gsm Cardstock (Folded Tent)', rate: 45 },
    { name: 'Waterproof Vinyl Table Surface Sticker (10x10cm)', rate: 35 },
    { name: 'Crystal Clear Acrylic Stand + Gloss Insert', rate: 160 },
    { name: 'Solid Beech Wood Base + Kraft Card', rate: 220 }
  ];

  function getEstimatedTotal() {
    const matched = materialOptions.find(m => m.name === selectedMaterial) || materialOptions[0];
    return matched.rate * Number(printQuantity);
  }

  function submitPrintOrder() {
    soundFX.playSuccess();
    showOrderPrintsModal = false;
    addToast({
      type: 'success',
      title: 'Physical Print Order Placed',
      message: `Order for ${printQuantity}x ${selectedStandTemplate.name} received! We will deliver to ${deliveryAddress}.`
    });
  }

  let branches = [
    { id: 'b1', name: 'Bole Medhanealem (Main)', slug: 'bole-branch' },
    { id: 'b2', name: 'Kazanchis Business Tower', slug: 'kazanchis-branch' }
  ];
  let selectedBranch = 'b1';
  let numTables = 12;

  $: activeBranchObj = branches.find(b => b.id === selectedBranch) || branches[0];

  let qrTables = Array.from({ length: 12 }, (_, i) => ({
    tableNumber: i + 1,
    url: `https://menuapp.pro/demo-restaurant/main-branch?table=${i + 1}`,
    scanCount: Math.floor(25 + Math.random() * 120),
    isOccupied: i === 3 || i === 8 || i === 0
  }));

  function generateTables() {
    soundFX.playSuccess();
    qrTables = Array.from({ length: Number(numTables) || 12 }, (_, i) => ({
      tableNumber: i + 1,
      url: `https://menuapp.pro/demo-restaurant/${activeBranchObj.slug}?table=${i + 1}`,
      scanCount: 0,
      isOccupied: false
    }));
    addToast({
      type: 'success',
      title: 'QR Codes Generated',
      message: `Created ${numTables} table QR codes for ${activeBranchObj.name}.`
    });
  }

  function printAllTables() {
    soundFX.playTap();
    window.print();
  }

  function copyTableUrl(url: string, tableNum: number) {
    soundFX.playTap();
    navigator.clipboard.writeText(url);
    addToast({
      type: 'info',
      title: `Table #${tableNum} Link Copied`,
      message: url
    });
  }
</script>

<svelte:head>
  <title>Table QR Generator | Admin Suite</title>
</svelte:head>

<div class="qr-page">
  <!-- Top Bar -->
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Table QR Generator & Stands</h1>
      <p class="page-subtitle">Generate print-ready table QR codes bound to live digital ordering and payment.</p>
    </div>

    <div class="top-actions">
      {#if $isMiniTier}
        <button class="btn-tactile btn-order-prints" on:click={() => { soundFX.playPop(); showOrderPrintsModal = true; }}>
          <span>📦 Order Physical Prints</span>
        </button>
      {/if}
      <button class="btn-tactile btn-primary btn-print" on:click={printAllTables}>
        <span>🖨️ Self-Print Cards</span>
      </button>
    </div>
  </header>

  {#if $isMiniTier}
    <!-- MenuMini Physical Standee Templates -->
    <div class="mini-standee-showcase card">
      <div class="showcase-head">
        <div>
          <span class="badge-mini">MenuMini Print Formats</span>
          <h2 class="showcase-title">Pre-Made Physical Standee & Sticker Formats</h2>
          <p class="showcase-sub">Verified pre-made table formats. You can self-print immediately or order pre-assembled acrylic/laminated materials.</p>
        </div>
        <button class="btn-tactile btn-order-prints-cta" on:click={() => { soundFX.playPop(); showOrderPrintsModal = true; }}>
          <span>✨ Order Professional Prints</span>
        </button>
      </div>

      <div class="standee-templates-grid">
        {#each MINI_TABLE_QR_TEMPLATES as tmpl}
          <button 
            type="button" 
            class="standee-card"
            class:selected={selectedStandTemplate.id === tmpl.id}
            on:click={() => { soundFX.playTap(); selectedStandTemplate = tmpl; addToast({ type: 'info', title: 'Format Selected', message: `Preview adjusted to ${tmpl.name}.` }); }}
          >
            <div class="format-badge">{tmpl.format.replace('_', ' ')}</div>
            <strong class="standee-name">{tmpl.name}</strong>
            <span class="standee-dim font-mono">{tmpl.dimensions}</span>
            <small class="standee-mat">Material: {tmpl.recommendedMaterial}</small>
            {#if selectedStandTemplate.id === tmpl.id}
              <span class="check-pill">✓ Selected Format</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if showOrderPrintsModal}
    <div class="modal-backdrop" on:click={() => showOrderPrintsModal = false} role="dialog" aria-modal="true">
      <div class="modal-card card" on:click|stopPropagation>
        <div class="modal-head">
          <div>
            <span class="badge-mini">MenuMini Fulfillment Service</span>
            <h3 class="modal-title">Order Printed & Assembled Table QRs</h3>
          </div>
          <button class="modal-close-btn" on:click={() => showOrderPrintsModal = false}>✕</button>
        </div>

        <div class="modal-body-form">
          <div class="form-group">
            <label for="order-format" class="form-label">Chosen Stand Format</label>
            <input id="order-format" type="text" value={selectedStandTemplate.name} readonly class="form-select font-sans bg-muted" />
          </div>

          <div class="form-group">
            <label for="order-material" class="form-label">Material & Finishing Type</label>
            <select id="order-material" bind:value={selectedMaterial} class="form-select font-sans">
              {#each materialOptions as opt}
                <option value={opt.name}>{opt.name} — {opt.rate} ETB/pc</option>
              {/each}
            </select>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label for="order-qty" class="form-label">Quantity (Tables)</label>
              <input id="order-qty" type="number" bind:value={printQuantity} min="5" max="100" class="form-select font-mono" />
            </div>
            <div class="form-group">
              <label for="order-phone" class="form-label">Contact Phone</label>
              <input id="order-phone" type="text" bind:value={contactPhone} class="form-select font-mono" />
            </div>
          </div>

          <div class="form-group">
            <label for="order-address" class="form-label">Delivery Address in Addis Ababa</label>
            <input id="order-address" type="text" bind:value={deliveryAddress} class="form-select font-sans" />
          </div>

          <div class="pricing-summary-box">
            <div class="price-row">
              <span>Estimated Production & Assembly:</span>
              <span class="font-mono font-bold text-amber">{getEstimatedTotal().toFixed(2)} ETB</span>
            </div>
            <small class="price-note">Includes custom table numbering, QR binding, and local delivery in Addis Ababa.</small>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-tactile btn-secondary" on:click={() => showOrderPrintsModal = false}>
            Cancel
          </button>
          <button class="btn-tactile btn-primary btn-submit-order" on:click={submitPrintOrder}>
            Confirm Print Order ({getEstimatedTotal().toFixed(2)} ETB)
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Controls Card -->
  <div class="card controls-card">
    <div class="controls-grid">
      <div class="form-group">
        <label for="branch-select" class="form-label">Active Branch Location</label>
        <select id="branch-select" bind:value={selectedBranch} class="form-select font-sans">
          {#each branches as branch}
            <option value={branch.id}>{branch.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="num-tables" class="form-label">Number of Dining Tables</label>
        <div class="input-action-row">
          <input 
            id="num-tables"
            type="number" 
            bind:value={numTables} 
            min="1" 
            max="60" 
            class="form-select font-mono"
          />
          <button class="btn-tactile btn-secondary btn-gen" on:click={generateTables}>
            Regenerate
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- QR Standout Grid -->
  <div class="qr-tables-grid">
    <!-- 1. General Venue QR (Takeaway / Lobby) -->
    <div class="qr-stand-card standout-card">
      <div class="stand-header">
        <div class="stand-title-row">
          <h3 class="stand-title">Lobby / Takeaway QR</h3>
          <span class="badge-standout">Universal</span>
        </div>
        <p class="stand-desc">Place at entrance or counter. Does not bind to a specific table.</p>
      </div>

      <div class="stand-qr-frame">
        <img 
          src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://menuapp.pro/demo-restaurant/main-branch&color=F59E0B" 
          alt="Universal QR" 
          class="qr-img"
        />
        <div class="qr-brand-label font-serif">MenuApp Pro</div>
      </div>

      <div class="stand-footer">
        <button class="btn-copy-url" on:click={() => copyTableUrl('https://menuapp.pro/demo-restaurant/main-branch', 0)}>
          Copy Link ↗
        </button>
      </div>
    </div>

    <!-- 2. Table-Specific QRs -->
    {#each qrTables as qr}
      <div class="qr-stand-card">
        <div class="stand-header">
          <div class="stand-title-row">
            <h3 class="stand-title font-mono">Table {qr.tableNumber}</h3>
            <span class="badge-status" class:occupied={qr.isOccupied}>
              {qr.isOccupied ? 'Seated' : 'Available'}
            </span>
          </div>
          <p class="stand-desc font-mono text-tertiary">
            {qr.scanCount} scans logged
          </p>
        </div>

        <div class="stand-qr-frame">
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={encodeURIComponent(qr.url)}" 
            alt="Table {qr.tableNumber} QR" 
            class="qr-img"
            loading="lazy"
          />
          <div class="table-number-center font-mono">
            Table #{qr.tableNumber}
          </div>
        </div>

        <div class="stand-footer">
          <button class="btn-copy-url" on:click={() => copyTableUrl(qr.url, qr.tableNumber)}>
            Copy Table Link ↗
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .qr-page {
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

  .btn-print {
    padding: 0.75rem 1.25rem;
    font-size: 0.88rem;
  }

  .card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
  }

  /* Controls */
  .controls-card {
    padding: 1.25rem 1.5rem;
  }

  .controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-label {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .form-select {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 0.95rem;
    outline: none;
  }

  .input-action-row {
    display: flex;
    gap: 0.5rem;
  }

  .btn-gen {
    padding: 0.75rem 1.25rem;
    white-space: nowrap;
  }

  /* QR Grid */
  .qr-tables-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }

  .qr-stand-card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: transform var(--duration-fast) var(--ease-spring),
                border-color var(--duration-fast) ease;
  }

  .qr-stand-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .standout-card {
    border-color: var(--amber-500);
    box-shadow: 0 0 25px -5px var(--amber-glow);
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(18, 20, 29, 1) 100%);
  }

  .stand-header {
    width: 100%;
    margin-bottom: 1.25rem;
  }

  .stand-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .stand-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0;
  }

  .badge-standout {
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--amber-400);
    background: rgba(245, 158, 11, 0.15);
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-full);
  }

  .badge-status {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-full);
    background: rgba(16, 185, 129, 0.12);
    color: var(--color-success);
  }

  .badge-status.occupied {
    background: rgba(245, 158, 11, 0.15);
    color: var(--amber-400);
  }

  .stand-desc {
    font-size: 0.78rem;
    color: var(--text-tertiary);
    margin: 0;
    text-align: left;
  }

  .stand-qr-frame {
    background: #FFFFFF;
    padding: 1rem;
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    margin-bottom: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .qr-img {
    width: 150px;
    height: 150px;
    display: block;
  }

  .qr-brand-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: #111827;
  }

  .table-number-center {
    font-size: 0.8rem;
    font-weight: 800;
    color: #111827;
  }

  .stand-footer {
    width: 100%;
    margin-top: auto;
  }

  .btn-copy-url {
    width: 100%;
    padding: 0.5rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .btn-copy-url:hover {
    color: #FFFFFF;
    background: rgba(255, 255, 255, 0.08);
  }

  @media (max-width: 1024px) {
    .qr-tables-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .qr-tables-grid {
      grid-template-columns: 1fr;
    }
    .controls-grid {
      grid-template-columns: 1fr;
    }
  }

  .btn-order-prints {
    background: linear-gradient(135deg, #10B981, #059669);
    color: #FFFFFF;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
  }

  .btn-order-prints-cta {
    background: #10B981;
    color: #FFFFFF;
    font-weight: 700;
  }

  .mini-standee-showcase {
    background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(26, 29, 39, 0.6) 100%);
    border: 1px solid rgba(16, 185, 129, 0.25);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .showcase-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }

  .badge-mini {
    background: #10B981;
    color: #000000;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
  }

  .showcase-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0.35rem 0 0.25rem 0;
  }

  .showcase-sub {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .standee-templates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
  }

  .standee-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
    padding: 1rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    transition: all 140ms ease;
  }

  .standee-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(16, 185, 129, 0.4);
  }

  .standee-card.selected {
    background: rgba(16, 185, 129, 0.12);
    border-color: #10B981;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
  }

  .format-badge {
    font-size: 0.68rem;
    font-weight: 800;
    color: #10B981;
    background: rgba(16, 185, 129, 0.15);
    padding: 0.15rem 0.45rem;
    border-radius: var(--radius-xs);
    margin-bottom: 0.5rem;
  }

  .standee-name {
    font-size: 0.95rem;
    color: #FFFFFF;
    margin-bottom: 0.25rem;
  }

  .standee-dim {
    font-size: 0.75rem;
    color: var(--amber-400);
    margin-bottom: 0.35rem;
  }

  .standee-mat {
    font-size: 0.72rem;
    color: var(--text-tertiary);
    line-height: 1.3;
  }

  .check-pill {
    margin-top: 0.75rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: #10B981;
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 1.5rem;
  }

  .modal-card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 540px;
    padding: 1.5rem;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.75rem;
  }

  .modal-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0.25rem 0 0 0;
  }

  .modal-close-btn {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    font-size: 1.2rem;
    cursor: pointer;
  }

  .modal-body-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .pricing-summary-box {
    background: rgba(255, 255, 255, 0.04);
    border: 1px dashed var(--border);
    border-radius: var(--radius-md);
    padding: 1rem;
  }

  .price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.95rem;
    color: #FFFFFF;
    margin-bottom: 0.35rem;
  }

  .price-note {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    display: block;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .btn-submit-order {
    background: #10B981;
    color: #FFFFFF;
    font-weight: 700;
  }

  /* Print Styles */
  @media print {
    body {
      background: white !important;
      color: black !important;
    }
    .page-top-bar, .controls-card, .btn-copy-url, :global(.admin-sidebar) {
      display: none !important;
    }
    .qr-tables-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 2cm;
    }
    .qr-stand-card {
      border: 2px solid black;
      page-break-inside: avoid;
    }
  }
</style>
