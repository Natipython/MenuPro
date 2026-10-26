<script lang="ts">
  import { soundFX, addToast } from '$lib/audio/feedback';

  const products = [
    {
      id: 'acrylic-stand',
      title: 'Crystal Clear Acrylic Pedestal Stand',
      badge: 'Most Popular',
      price: 160,
      description: 'Heavy 3mm crystal acrylic with double-sided glossy card insert. Waterproof, wipeable, and restaurant-grade durable.',
      icon: '💎',
      specs: ['100mm x 150mm', 'Scratch-resistant acrylic', 'Free local delivery in Addis']
    },
    {
      id: 'laminated-tent',
      title: 'Laminated Heavy Cardstock Table Tent',
      badge: 'Best Value',
      price: 45,
      description: '350gsm premium art card folded into self-standing A6 double-sided tent with thermal matte lamination.',
      icon: '📄',
      specs: ['105mm x 148mm (A6)', 'Matte lamination', 'Dual-sided scan target']
    },
    {
      id: 'vinyl-sticker',
      title: 'Waterproof Table Surface Vinyl Sticker',
      badge: 'Fast Casual',
      price: 35,
      description: 'Industrial-grade vinyl decal with UV matte lamination. Sticks firmly to wood, metal, and marble tables without residue.',
      icon: '🏷️',
      specs: ['100mm x 100mm', 'Heat & solvent resistant', 'Non-peel adhesive']
    },
    {
      id: 'wood-block',
      title: 'Solid Beech Wood Block + Kraft Card',
      badge: 'Artisan & Cultural',
      price: 220,
      description: 'Hand-crafted solid beech wood base slotted with natural kraft paper QR card. Perfect for boutique cafes and heritage dining.',
      icon: '🪵',
      specs: ['80mm x 120mm', 'Natural oiled beech wood', 'Replaceable paper insert']
    }
  ];

  let selectedProductId = 'acrylic-stand';
  let quantity = 15;
  let deliveryAddress = 'Bole Subcity, House #402, Addis Ababa';
  let contactPhone = '0911223344';

  $: activeProduct = products.find(p => p.id === selectedProductId) || products[0];
  $: totalCost = activeProduct.price * quantity;

  function placePrintOrder() {
    soundFX.playSuccess();
    addToast({
      type: 'success',
      title: 'Print Order Confirmed!',
      message: `Your order for ${quantity}x ${activeProduct.title} is queued for printing and local delivery.`
    });
  }
</script>

<svelte:head>
  <title>Physical Print Shop | MenuMini</title>
</svelte:head>

<div class="print-shop-page">
  <header class="page-top-bar">
    <div>
      <h1 class="page-title">Physical QR Print Shop</h1>
      <p class="page-subtitle">We design, print, assemble, and deliver high-durability physical table QR displays right to your restaurant door.</p>
    </div>
  </header>

  <!-- Product Showcase Cards -->
  <div class="products-grid">
    {#each products as prod}
      <div 
        class="product-card card" 
        class:selected={selectedProductId === prod.id}
        on:click={() => { soundFX.playTap(); selectedProductId = prod.id; }}
      >
        <div class="prod-badge-row">
          <span class="prod-icon">{prod.icon}</span>
          <span class="prod-badge">{prod.badge}</span>
        </div>

        <h3 class="prod-title">{prod.title}</h3>
        <p class="prod-desc">{prod.description}</p>

        <ul class="prod-specs">
          {#each prod.specs as spec}
            <li>✓ {spec}</li>
          {/each}
        </ul>

        <div class="prod-price-row">
          <span class="price-val font-mono">{prod.price} <small class="currency">ETB / unit</small></span>
          <button class="btn-tactile btn-select-pill" class:active={selectedProductId === prod.id}>
            {selectedProductId === prod.id ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
    {/each}
  </div>

  <!-- Order & Delivery Configuration Card -->
  <div class="checkout-card card">
    <h3 class="card-title">📦 Place Physical Production Order</h3>
    <div class="order-form-grid">
      <div class="form-group">
        <label for="p-selected" class="form-label">Selected Hardware</label>
        <input id="p-selected" type="text" value="{activeProduct.title} ({activeProduct.price} ETB/unit)" readonly class="form-control" />
      </div>

      <div class="form-group">
        <label for="p-qty" class="form-label">Number of Tables</label>
        <input id="p-qty" type="number" bind:value={quantity} min="5" max="100" class="form-control font-mono" />
      </div>

      <div class="form-group">
        <label for="p-phone" class="form-label">Manager Phone</label>
        <input id="p-phone" type="text" bind:value={contactPhone} class="form-control font-mono" />
      </div>

      <div class="form-group">
        <label for="p-addr" class="form-label">Delivery Address in Addis Ababa</label>
        <input id="p-addr" type="text" bind:value={deliveryAddress} class="form-control" />
      </div>
    </div>

    <div class="order-total-bar">
      <div class="total-info">
        <span class="total-label">Total Production & Local Delivery:</span>
        <strong class="total-amount font-mono text-amber">{totalCost.toLocaleString()} ETB</strong>
      </div>
      <button class="btn-tactile btn-primary btn-submit-print" on:click={placePrintOrder}>
        <span>Confirm Order & Route to Print Workshop ({totalCost.toLocaleString()} ETB)</span>
      </button>
    </div>
  </div>
</div>

<style>
  .print-shop-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
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

  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.25rem;
  }

  .product-card {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: all 140ms ease;
  }

  .product-card:hover {
    border-color: rgba(16, 185, 129, 0.4);
    transform: translateY(-2px);
  }

  .product-card.selected {
    border-color: #10B981;
    background: rgba(16, 185, 129, 0.08);
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.15);
  }

  .prod-badge-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .prod-icon {
    font-size: 1.75rem;
  }

  .prod-badge {
    font-size: 0.68rem;
    font-weight: 800;
    color: #10B981;
    background: rgba(16, 185, 129, 0.15);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-full);
  }

  .prod-title {
    font-size: 1.05rem;
    color: #FFFFFF;
    margin-bottom: 0.5rem;
  }

  .prod-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.4;
    margin-bottom: 1rem;
    flex: 1;
  }

  .prod-specs {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 1.25rem;
  }

  .prod-specs li {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .prod-price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border);
    padding-top: 1rem;
  }

  .price-val {
    font-size: 1.25rem;
    font-weight: 800;
    color: #FFFFFF;
  }

  .currency {
    font-size: 0.75rem;
    color: var(--amber-400);
  }

  .btn-select-pill {
    padding: 0.35rem 0.75rem;
    font-size: 0.78rem;
    background: var(--surface-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .btn-select-pill.active {
    background: #10B981;
    color: #FFFFFF;
    border-color: #10B981;
  }

  .checkout-card {
    padding: 1.75rem;
  }

  .card-title {
    font-size: 1.2rem;
    color: #FFFFFF;
    margin-bottom: 1.25rem;
  }

  .order-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .form-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .form-control {
    width: 100%;
    padding: 0.7rem 0.85rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 0.9rem;
    outline: none;
  }

  .order-total-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border);
    padding-top: 1.25rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .total-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .total-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .total-amount {
    font-size: 1.5rem;
    font-weight: 800;
  }

  .text-amber { color: var(--amber-400); }

  .btn-submit-print {
    padding: 0.85rem 1.5rem;
  }
</style>
