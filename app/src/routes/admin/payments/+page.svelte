<script lang="ts">
  import { onMount } from 'svelte';
  import { soundFX, addToast } from '$lib/utils/feedback';
  
  let paymentMethods = [
    { id: 1, providerName: 'telebirr', accountName: 'MenuApp Pro Restaurant', accountNumber: '0911234567', isActive: true, badge: 'telebirr' },
    { id: 2, providerName: 'CBE Birr', accountName: 'MenuApp Pro Ltd', accountNumber: '1000123456789', isActive: true, badge: 'CBE Birr' },
    { id: 3, providerName: 'Awash Birr', accountName: 'MenuApp Pro Hospitality', accountNumber: '01423456789000', isActive: false, badge: 'Awash' }
  ];

  let showAddModal = false;
  let qrScannerInstance: any = null;
  let rawQrData = 'telebirr://pay?to=0911234567&amount=450';
  
  // Beautifier settings
  let providerName = 'telebirr';
  let accountName = 'Gourmet Bistro Addis';
  let accountNumber = '0911234567';
  let qrColor = '#005BBB';
  let qrBgColor = '#ffffff';
  let dotStyle = 'square'; 
  let cornerStyle = 'square';
  let logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Telebirr_logo.png/600px-Telebirr_logo.png';
  let customerInstructions = 'Scan with your banking app. In the payment reason/memo, write your Table Number so our server can verify your ticket immediately.';

  let qrCodeStyling: any;
  let qrContainer: HTMLElement;
  let libraryFailed = false;

  onMount(() => {
    let attempts = 0;
    const checkScripts = setInterval(() => {
      attempts++;
      if (attempts > 20) {
        clearInterval(checkScripts);
        libraryFailed = true;
        return;
      }
      if ((window as any).QRCodeStyling) {
        clearInterval(checkScripts);
        qrCodeStyling = new (window as any).QRCodeStyling({
          width: 260,
          height: 260,
          data: rawQrData || 'https://example.com/payment',
          image: logoUrl,
          dotsOptions: { color: qrColor, type: dotStyle },
          backgroundOptions: { color: qrBgColor },
          cornersSquareOptions: { type: cornerStyle }
        });
        if (qrContainer) {
          qrContainer.innerHTML = '';
          qrCodeStyling.append(qrContainer);
        }
      }
    }, 100);
  });

  $: if (qrCodeStyling && qrContainer && rawQrData) {
    qrCodeStyling.update({
      data: rawQrData,
      image: logoUrl,
      dotsOptions: { color: qrColor, type: dotStyle },
      backgroundOptions: { color: qrBgColor },
      cornersSquareOptions: { type: cornerStyle }
    });
    qrContainer.innerHTML = '';
    qrCodeStyling.append(qrContainer);
  }

  function startScanner() {
    soundFX.playTap();
    if (!(window as any).Html5Qrcode) {
      addToast({ type: 'warning', title: 'Scanner Initializing', message: 'Please wait a moment for the camera library to load.' });
      return;
    }
    qrScannerInstance = new (window as any).Html5Qrcode("camera-reader");
    qrScannerInstance.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText: string) => {
        soundFX.playSuccess();
        rawQrData = decodedText;
        addToast({ type: 'success', title: 'Bank QR Scanned!', message: 'Decoded payment string successfully.' });
        stopScanner();
      },
      (err: any) => {}
    );
  }

  function stopScanner() {
    if (qrScannerInstance) {
      qrScannerInstance.stop().catch(console.error);
    }
  }

  function toggleStatus(id: number) {
    soundFX.playTap();
    paymentMethods = paymentMethods.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m);
  }

  function saveMethod() {
    soundFX.playSuccess();
    paymentMethods = [
      ...paymentMethods,
      {
        id: Date.now(),
        providerName,
        accountName,
        accountNumber,
        isActive: true,
        badge: providerName
      }
    ];
    showAddModal = false;
    addToast({
      type: 'success',
      title: 'Payment Method Activated',
      message: `${providerName} will now appear at checkout with zero platform fees.`
    });
  }
</script>

<svelte:head>
  <title>Ethiopian Payment QR Hub | Admin Suite</title>
  <script src="https://cdn.jsdelivr.net/npm/qr-code-styling@1.5.0/lib/qr-code-styling.js"></script>
  <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
</svelte:head>

<div class="payments-admin-page">
  <!-- Top Bar -->
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Ethiopian Banking & QR Beautifier</h1>
      <p class="page-subtitle">Configure local mobile money (telebirr, CBE Birr, Awash) with zero transaction commissions.</p>
    </div>

    <div class="top-actions">
      <button class="btn-tactile btn-primary btn-add-method" on:click={() => { soundFX.playTap(); showAddModal = true; }}>
        <span>+ Add Payment QR</span>
      </button>
    </div>
  </header>

  <!-- Methods Table Card -->
  <div class="card table-card">
    <table class="methods-table">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Account Details</th>
          <th>Account / Phone Number</th>
          <th>Status</th>
          <th class="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each paymentMethods as method}
          <tr>
            <td>
              <div class="provider-cell">
                <span class="provider-icon-badge {method.providerName.toLowerCase().includes('tele') ? 'tele' : method.providerName.toLowerCase().includes('cbe') ? 'cbe' : 'awash'}">
                  {method.providerName.charAt(0)}
                </span>
                <span class="provider-name">{method.providerName}</span>
              </div>
            </td>
            <td>
              <span class="acc-name">{method.accountName}</span>
            </td>
            <td>
              <span class="font-mono acc-num">{method.accountNumber}</span>
            </td>
            <td>
              <button 
                type="button"
                class="status-toggle-pill"
                class:active={method.isActive}
                on:click={() => toggleStatus(method.id)}
              >
                {method.isActive ? '✓ Active at Checkout' : '○ Inactive'}
              </button>
            </td>
            <td class="text-right">
              <button class="btn-text-action" on:click={() => { soundFX.playTap(); showAddModal = true; }}>
                Customize Look
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- Modal: Scan & Beautify Split Wizard -->
{#if showAddModal}
  <div class="modal-backdrop" on:click={() => { showAddModal = false; stopScanner(); }} role="dialog" aria-modal="true">
    <div class="beautifier-modal-sheet" on:click|stopPropagation>
      <div class="modal-header">
        <div>
          <h2 class="modal-heading">Scan & Beautify Bank QR</h2>
          <p class="modal-sub">Scan your bank's original payment code, then design your custom branded QR.</p>
        </div>
        <button class="modal-close-btn" on:click={() => { showAddModal = false; stopScanner(); }}>&times;</button>
      </div>

      <div class="beautifier-grid">
        <!-- Left: Scan & Data -->
        <div class="beautifier-left-flow">
          <!-- 1. Scanner -->
          <div class="scan-box-card">
            <h3 class="step-label">1. Extract QR Data Payload</h3>
            <p class="step-desc">Hold your bank phone or printout up to your webcam, or paste the raw string.</p>
            
            <div id="camera-reader" class="camera-viewport"></div>

            <div class="scanner-actions-row">
              <button type="button" class="btn-tactile btn-secondary btn-cam" on:click={startScanner}>
                📹 Start Camera Scanner
              </button>
              <button type="button" class="btn-tactile btn-ghost btn-cam" on:click={stopScanner}>
                Stop Camera
              </button>
            </div>

            <div class="manual-data-entry">
              <label for="qr-data-payload" class="input-sublabel">Extracted Data Payload</label>
              <input 
                id="qr-data-payload"
                type="text" 
                bind:value={rawQrData} 
                class="form-control font-mono"
                placeholder="telebirr://pay?to=..."
              />
            </div>
          </div>

          <!-- 2. Provider Account Details -->
          <div class="details-box-card">
            <h3 class="step-label">2. Account Information</h3>
            <div class="form-grid-2">
              <div class="form-group">
                <label for="provider-select" class="input-sublabel">Bank Provider</label>
                <select id="provider-select" bind:value={providerName} class="form-control">
                  <option value="telebirr">telebirr</option>
                  <option value="CBE Birr">CBE Birr</option>
                  <option value="Awash Birr">Awash Birr</option>
                  <option value="Amole (Dashen)">Amole (Dashen)</option>
                  <option value="Zemen Bank">Zemen Bank</option>
                </select>
              </div>
              <div class="form-group">
                <label for="acc-num-field" class="input-sublabel">Phone / Account Number</label>
                <input id="acc-num-field" type="text" bind:value={accountNumber} class="form-control font-mono" />
              </div>
            </div>

            <div class="form-group">
              <label for="acc-name-field" class="input-sublabel">Registered Account Name</label>
              <input id="acc-name-field" type="text" bind:value={accountName} class="form-control" />
            </div>

            <div class="form-group">
              <label for="instructions-field" class="input-sublabel">Customer Checkout Instructions</label>
              <textarea id="instructions-field" bind:value={customerInstructions} rows="2" class="form-control"></textarea>
            </div>
          </div>
        </div>

        <!-- Right: Live Beautifier Preview & Styling Controls -->
        <div class="beautifier-right-preview">
          <h3 class="step-label">3. Live Beautified QR Preview</h3>
          
          <div class="preview-stand-card">
            <div class="preview-stand-header">
              <span class="preview-provider-title">{providerName}</span>
              <span class="preview-acc font-mono">{accountNumber}</span>
            </div>

            <!-- Dynamic SVG QR Container -->
            <div class="qr-canvas-holder">
              {#if libraryFailed}
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data={encodeURIComponent(rawQrData)}&color={qrColor.replace('#', '')}" 
                  alt="QR Fallback"
                  class="qr-fallback-img"
                />
              {:else}
                <div bind:this={qrContainer} class="qr-target-element"></div>
              {/if}
            </div>

            <div class="preview-instructions-box">
              <span class="instructions-hint font-sans">
                💡 {customerInstructions}
              </span>
            </div>
          </div>

          <!-- Color & Pattern Controls -->
          <div class="styling-controls-panel">
            <div class="control-row">
              <label class="control-label">Brand Color</label>
              <div class="color-picker-group">
                <input type="color" bind:value={qrColor} class="color-swatch-input" />
                <span class="color-hex font-mono">{qrColor}</span>
              </div>
            </div>

            <div class="control-row">
              <label class="control-label">Pattern Style</label>
              <select bind:value={dotStyle} class="style-select">
                <option value="square">Square</option>
                <option value="dots">Dots</option>
                <option value="rounded">Rounded</option>
              </select>
            </div>

            <div class="control-row">
              <label class="control-label">Center Logo URL</label>
              <input type="text" bind:value={logoUrl} class="style-input" placeholder="https://.../logo.png" />
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <footer class="modal-footer-row">
        <button type="button" class="btn-tactile btn-secondary" on:click={() => { showAddModal = false; stopScanner(); }}>
          Cancel
        </button>
        <button type="button" class="btn-tactile btn-primary btn-save-method" on:click={saveMethod}>
          Save & Publish to Customer Checkout
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .payments-admin-page {
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

  .btn-add-method {
    padding: 0.75rem 1.25rem;
    font-size: 0.88rem;
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

  .methods-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    text-align: left;
  }

  .methods-table th {
    padding: 0.9rem 1.25rem;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
  }

  .methods-table td {
    padding: 1.15rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
  }

  .provider-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .provider-icon-badge {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: #FFFFFF;
    font-size: 0.9rem;
  }

  .provider-icon-badge.tele { background: #005BBB; }
  .provider-icon-badge.cbe { background: #6B21A8; }
  .provider-icon-badge.awash { background: #C2410C; }

  .provider-name {
    font-weight: 700;
    color: #FFFFFF;
  }

  .status-toggle-pill {
    padding: 0.25rem 0.65rem;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 700;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 120ms ease;
  }

  .status-toggle-pill.active {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.3);
    color: var(--color-success);
  }

  .btn-text-action {
    background: transparent;
    border: none;
    color: var(--amber-400);
    font-weight: 600;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .text-right { text-align: right; }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(9, 10, 15, 0.8);
    backdrop-filter: blur(10px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .beautifier-modal-sheet {
    width: 100%;
    max-width: 960px;
    max-height: 90vh;
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2rem;
    overflow-y: auto;
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .modal-heading {
    font-family: var(--font-serif);
    font-size: 1.5rem;
    color: #FFFFFF;
    margin: 0 0 0.2rem 0;
  }

  .modal-sub {
    font-size: 0.88rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .modal-close-btn {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    font-size: 1.6rem;
    cursor: pointer;
  }

  .beautifier-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 2rem;
  }

  .beautifier-left-flow {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .scan-box-card, .details-box-card {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }

  .step-label {
    font-size: 1rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 0.25rem 0;
  }

  .step-desc {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    margin: 0 0 1rem 0;
  }

  .camera-viewport {
    width: 100%;
    height: 180px;
    background: #090A0F;
    border-radius: var(--radius-md);
    margin-bottom: 0.75rem;
    overflow: hidden;
  }

  .scanner-actions-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .btn-cam {
    font-size: 0.82rem;
    padding: 0.5rem 0.85rem;
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }

  .input-sublabel {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .form-control {
    width: 100%;
    padding: 0.65rem 0.85rem;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 0.88rem;
    outline: none;
  }

  /* Right Preview */
  .beautifier-right-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .preview-stand-card {
    width: 100%;
    max-width: 320px;
    background: #FFFFFF;
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    color: #111827;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .preview-stand-header {
    margin-bottom: 1rem;
  }

  .preview-provider-title {
    font-size: 1.25rem;
    font-weight: 800;
    display: block;
  }

  .preview-acc {
    font-size: 0.85rem;
    color: #4B5563;
  }

  .qr-canvas-holder {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .qr-fallback-img {
    width: 220px;
    height: 220px;
  }

  .preview-instructions-box {
    background: #F3F4F6;
    border-radius: var(--radius-md);
    padding: 0.75rem;
    font-size: 0.75rem;
    color: #374151;
    text-align: left;
    line-height: 1.35;
  }

  /* Styling Controls */
  .styling-controls-panel {
    width: 100%;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .control-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .control-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .color-picker-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .color-swatch-input {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
  }

  .color-hex {
    font-size: 0.82rem;
    color: #FFFFFF;
  }

  .style-select, .style-input {
    padding: 0.4rem 0.65rem;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: #FFFFFF;
    font-size: 0.82rem;
    outline: none;
  }

  .modal-footer-row {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .btn-save-method {
    padding: 0.85rem 1.5rem;
    font-size: 0.95rem;
  }

  @media (max-width: 840px) {
    .beautifier-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
