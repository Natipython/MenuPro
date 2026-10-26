<script lang="ts">
  import { soundFX, addToast } from '$lib/audio/feedback';
  import { MINI_TABLE_QR_TEMPLATES, type MiniTableQrTemplate } from '$lib/types/miniTemplates';
  import type { PageData } from './$types';

  export let data: PageData;

  let selectedFormat: MiniTableQrTemplate = MINI_TABLE_QR_TEMPLATES[0];
  let numTables = 12;
  let showOrderPrintsModal = false;
  let printQuantity = 12;
  let selectedMaterial = 'Laminated 350gsm Cardstock (Folded Tent)';
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
      message: `Order for ${printQuantity}x ${selectedFormat.name} received! Delivery to ${deliveryAddress}.`
    });
  }

  $: qrTables = Array.from({ length: Number(numTables) || 12 }, (_, i) => ({
    tableNumber: i + 1,
    url: `${data.origin || 'http://127.0.0.1:5174'}/menu/${data.venueSlug || 'menu'}?table=${i + 1}`
  }));

  function selfPrint() {
    soundFX.playTap();
    window.print();
  }
</script>

<svelte:head>
  <title>Table QRs & Print Shop | MenuMini</title>
</svelte:head>

<div class="qr-studio-page">
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Table QRs & Physical Print Shop</h1>
      <p class="page-subtitle">Unique table QR codes. Print immediately at home or order pre-assembled acrylic & wood stands.</p>
    </div>

    <div class="top-actions">
      <button class="btn-tactile btn-order-cta" on:click={() => { soundFX.playPop(); showOrderPrintsModal = true; }}>
        <span>📦 Order Physical Prints</span>
      </button>
      <button class="btn-tactile btn-secondary" on:click={selfPrint}>
        <span>🖨️ Self-Print (PDF)</span>
      </button>
    </div>
  </header>

  <!-- Pre-Made Stand Formats -->
  <div class="stand-formats-card card">
    <div class="formats-header">
      <div>
        <span class="badge-mini">Verified Print Dimensions</span>
        <h2 class="formats-title">Pre-Made Physical Standee & Sticker Formats</h2>
      </div>
      <div class="table-count-field">
        <label for="tbl-count" class="lbl">Table Count:</label>
        <input id="tbl-count" type="number" bind:value={numTables} min="1" max="50" class="input-count font-mono" />
      </div>
    </div>

    <div class="formats-grid">
      {#each MINI_TABLE_QR_TEMPLATES as tmpl}
        <button 
          type="button" 
          class="format-pill-card"
          class:selected={selectedFormat.id === tmpl.id}
          on:click={() => { soundFX.playTap(); selectedFormat = tmpl; addToast({ type: 'info', title: 'Format Selected', message: `Adjusted to ${tmpl.name}.` }); }}
        >
          <div class="format-badge">{tmpl.format.replace('_', ' ')}</div>
          <strong class="format-name">{tmpl.name}</strong>
          <span class="format-dim font-mono">{tmpl.dimensions}</span>
          <small class="format-mat">Material: {tmpl.recommendedMaterial}</small>
          {#if selectedFormat.id === tmpl.id}
            <span class="format-check">✓ Active Format</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- QR Display Grid -->
  <div class="qr-tables-grid">
    {#each qrTables as qr}
      <div class="qr-stand-card card">
        <div class="stand-header">
          <span class="table-tag">TABLE #{qr.tableNumber}</span>
          <span class="format-tag">{selectedFormat.format.replace('_', ' ')}</span>
        </div>

        <div class="stand-qr-box">
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data={encodeURIComponent(qr.url)}&color=000000" 
            alt="Table {qr.tableNumber} QR"
            class="qr-img"
          />
          <strong class="qr-brand-label">Addis Cafe & Roastery</strong>
          <span class="qr-scan-cta">Scan to Order & Pay via telebirr</span>
        </div>

        <div class="stand-footer font-mono">
          Table #{qr.tableNumber} • MenuMini
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Order Physical Prints Modal -->
{#if showOrderPrintsModal}
  <div class="modal-backdrop" on:click={() => showOrderPrintsModal = false} role="dialog" aria-modal="true">
    <div class="modal-card card" on:click|stopPropagation>
      <div class="modal-head">
        <div>
          <span class="badge-mini">MenuMini Physical Service</span>
          <h3 class="modal-title">Order Printed & Assembled Table Stands</h3>
        </div>
        <button class="modal-close" on:click={() => showOrderPrintsModal = false}>✕</button>
      </div>

      <div class="modal-body-form">
        <div class="form-group">
          <label for="ord-format" class="form-label">Chosen Stand Format</label>
          <input id="ord-format" type="text" value={selectedFormat.name} readonly class="form-control" />
        </div>

        <div class="form-group">
          <label for="ord-mat" class="form-label">Material & Finishing Quality</label>
          <select id="ord-mat" bind:value={selectedMaterial} class="form-control">
            {#each materialOptions as opt}
              <option value={opt.name}>{opt.name} — {opt.rate} ETB/unit</option>
            {/each}
          </select>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label for="ord-qty" class="form-label">Quantity</label>
            <input id="ord-qty" type="number" bind:value={printQuantity} min="5" max="100" class="form-control font-mono" />
          </div>
          <div class="form-group">
            <label for="ord-phone" class="form-label">Phone</label>
            <input id="ord-phone" type="text" bind:value={contactPhone} class="form-control font-mono" />
          </div>
        </div>

        <div class="form-group">
          <label for="ord-addr" class="form-label">Delivery Address (Addis Ababa)</label>
          <input id="ord-addr" type="text" bind:value={deliveryAddress} class="form-control" />
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
        <button type="button" class="btn-tactile btn-secondary" on:click={() => showOrderPrintsModal = false}>
          Cancel
        </button>
        <button type="button" class="btn-tactile btn-order-cta" on:click={submitPrintOrder}>
          Confirm Print Order ({getEstimatedTotal().toFixed(2)} ETB)
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .qr-studio-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .page-title {
    font-family: var(--font-serif);
    font-size: 1.75rem;
    color: #FFFFFF;
  }

  .page-subtitle {
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  .top-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-order-cta {
    background: linear-gradient(135deg, #10B981, #059669);
    color: #FFFFFF;
    font-weight: 700;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
  }

  .stand-formats-card {
    padding: 1.5rem;
  }

  .formats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .badge-mini {
    background: #10B981;
    color: #000000;
    font-size: 0.68rem;
    font-weight: 800;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
  }

  .formats-title {
    font-size: 1.15rem;
    color: #FFFFFF;
    margin: 0.25rem 0 0 0;
  }

  .table-count-field {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .lbl {
    font-size: 0.82rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .input-count {
    width: 70px;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    color: #FFFFFF;
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
  }

  .formats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 0.85rem;
  }

  .format-pill-card {
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

  .format-pill-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(16, 185, 129, 0.4);
  }

  .format-pill-card.selected {
    background: rgba(16, 185, 129, 0.12);
    border-color: #10B981;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
  }

  .format-badge {
    font-size: 0.65rem;
    font-weight: 800;
    color: #10B981;
    background: rgba(16, 185, 129, 0.15);
    padding: 0.15rem 0.45rem;
    border-radius: var(--radius-xs);
    margin-bottom: 0.4rem;
  }

  .format-name {
    font-size: 0.88rem;
    color: #FFFFFF;
    margin-bottom: 0.2rem;
  }

  .format-dim {
    font-size: 0.72rem;
    color: var(--amber-400);
    margin-bottom: 0.35rem;
  }

  .format-mat {
    font-size: 0.7rem;
    color: var(--text-tertiary);
  }

  .format-check {
    margin-top: 0.6rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: #10B981;
  }

  /* QR Grid */
  .qr-tables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.25rem;
  }

  .qr-stand-card {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--surface-dark);
  }

  .stand-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .table-tag {
    font-size: 0.78rem;
    font-weight: 800;
    color: var(--amber-400);
  }

  .format-tag {
    font-size: 0.7rem;
    color: var(--text-tertiary);
  }

  .stand-qr-box {
    background: #FFFFFF;
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .qr-img {
    width: 150px;
    height: 150px;
    display: block;
  }

  .qr-brand-label {
    font-size: 0.82rem;
    color: #111827;
    font-family: var(--font-serif);
  }

  .qr-scan-cta {
    font-size: 0.68rem;
    font-weight: 700;
    color: #4B5563;
  }

  .stand-footer {
    font-size: 0.72rem;
    color: var(--text-tertiary);
  }

  /* Modal */
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
    max-width: 520px;
    padding: 1.75rem;
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  .modal-title {
    font-size: 1.15rem;
    color: #FFFFFF;
    margin: 0.25rem 0 0 0;
  }

  .modal-close {
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

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-label {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .form-control {
    width: 100%;
    padding: 0.65rem 0.85rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 0.9rem;
    outline: none;
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
    font-size: 0.72rem;
    color: var(--text-tertiary);
    display: block;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  @media print {
    :global(aside), .page-top-bar, .stand-formats-card { display: none !important; }
    .qr-tables-grid { grid-template-columns: repeat(2, 1fr); gap: 2cm; }
    .qr-stand-card { border: 2px solid black; }
  }
</style>
