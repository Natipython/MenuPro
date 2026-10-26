<script lang="ts">
  import { onMount } from 'svelte';
  import { soundFX } from '$lib/utils/feedback';

  // 24 Business Types showcase list
  const templates = [
    { id: 'cafe', name: 'Artisan Cafe & Roastery', icon: '☕', category: 'Cafe' },
    { id: 'restaurant', name: 'Fine Dining Restaurant', icon: '🍽️', category: 'Restaurant' },
    { id: 'bar', name: 'Cocktail Bar & Lounge', icon: '🍸', category: 'Bar' },
    { id: 'steakhouse', name: 'Steakhouse & Grill', icon: '🥩', category: 'Restaurant' },
    { id: 'sushi', name: 'Sushi & Japanese Dining', icon: '🍣', category: 'Restaurant' },
    { id: 'pizzeria', name: 'Authentic Pizzeria', icon: '🍕', category: 'Restaurant' },
    { id: 'bakery', name: 'Bakery & Pastry House', icon: '🥐', category: 'Cafe' },
    { id: 'juice-bar', name: 'Fresh Juice & Smoothie Bar', icon: '🧃', category: 'Cafe' },
    { id: 'food-truck', name: 'Street Food & Food Truck', icon: '🚚', category: 'Street Food' },
    { id: 'boba', name: 'Tea House & Boba Bar', icon: '🧋', category: 'Cafe' },
    { id: 'ice-cream', name: 'Gelato & Ice Cream Parlor', icon: '🍦', category: 'Cafe' },
    { id: 'cloud-kitchen', name: 'Cloud Kitchen & Delivery', icon: '🛵', category: 'Delivery' }
  ];

  let selectedCategory = 'ALL';
  const categories = ['ALL', 'Restaurant', 'Cafe', 'Bar', 'Street Food'];

  $: filteredTemplates = selectedCategory === 'ALL' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  // Pricing toggle (Monthly vs Annual)
  let isAnnual = true;
</script>

<svelte:head>
  <title>MenuApp Pro | The Modern Operating System for Ethiopian & Global Dining</title>
</svelte:head>

<div class="landing-root">
  <!-- Sticky Blurred Navigation -->
  <nav class="landing-nav glass-panel">
    <div class="nav-container">
      <div class="brand-logo-group">
        <div class="brand-badge-icon">🍽️</div>
        <span class="brand-text">MenuApp<span class="brand-accent">Pro</span></span>
      </div>

      <div class="nav-links-center">
        <a href="#features" class="nav-link">Features</a>
        <a href="#templates" class="nav-link">24 Templates</a>
        <a href="#payments" class="nav-link">Ethiopian Banking</a>
        <a href="#pricing" class="nav-link">Pricing</a>
      </div>

      <div class="nav-actions">
        <a href="/onboarding" class="btn-tactile btn-primary btn-nav-cta" on:click={() => soundFX.playTap()}>
          <span>Start Free Trial</span>
          <span class="cta-arrow">→</span>
        </a>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <header class="hero-section">
    <div class="hero-ambient-glow-1"></div>
    <div class="hero-ambient-glow-2"></div>

    <div class="hero-container">
      <div class="hero-text-col">
        <div class="hero-announcement-pill">
          <span class="pill-sparkle">✨</span>
          <span>Next-Gen QR Ordering & Ethiopian Payment Hub</span>
        </div>

        <h1 class="hero-main-headline">
          The Operating System for <span class="gradient-text">World-Class Dining</span>.
        </h1>

        <p class="hero-subtitle">
          Turn tables 30% faster with interactive mobile menus, zero-commission telebirr & CBE Birr payments, and real-time Kitchen Display Systems (KDS).
        </p>

        <div class="hero-cta-group">
          <a href="/onboarding" class="btn-tactile btn-primary btn-hero-lg" on:click={() => soundFX.playPop()}>
            <span>Launch Your Restaurant Free</span>
            <span class="cta-arrow">→</span>
          </a>
          <a href="/demo-restaurant/main-branch" class="btn-tactile btn-secondary btn-hero-lg" on:click={() => soundFX.playTap()}>
            <span>📱 Experience Live Mobile Menu</span>
          </a>
        </div>

        <div class="hero-proof-stats">
          <div class="proof-stat">
            <span class="stat-number font-mono">24+</span>
            <span class="stat-label">Cuisine Templates</span>
          </div>
          <div class="proof-divider"></div>
          <div class="proof-stat">
            <span class="stat-number font-mono">0%</span>
            <span class="stat-label">Payment Markup</span>
          </div>
          <div class="proof-divider"></div>
          <div class="proof-stat">
            <span class="stat-number font-mono">&lt; 3 min</span>
            <span class="stat-label">Onboarding Setup</span>
          </div>
        </div>
      </div>

      <!-- 3D Interactive Phone Mockup Preview -->
      <div class="hero-preview-col">
        <div class="phone-frame-mockup">
          <div class="phone-notch"></div>
          <div class="phone-screen">
            <!-- Simulated Live Mobile Menu Inside Phone -->
            <div class="preview-menu-header">
              <div class="preview-avatar">☕</div>
              <div>
                <div class="preview-brand-name">Bole Gourmet Cafe</div>
                <div class="preview-table">Table 4 • Dine-In</div>
              </div>
            </div>

            <div class="preview-category-bar">
              <span class="preview-cat active">Espresso</span>
              <span class="preview-cat">Breakfast</span>
              <span class="preview-cat">Desserts</span>
            </div>

            <div class="preview-dish-card">
              <div class="preview-dish-info">
                <h4>Caramel Macchiato</h4>
                <p>Double shot espresso with steamed milk & vanilla.</p>
                <span class="preview-price font-mono">140.00 ETB</span>
              </div>
              <div class="preview-dish-img">☕</div>
            </div>

            <div class="preview-dish-card">
              <div class="preview-dish-info">
                <h4>Avocado Sourdough</h4>
                <p>Poached farm eggs & chili oil on sourdough.</p>
                <span class="preview-price font-mono">220.00 ETB</span>
              </div>
              <div class="preview-dish-img">🥑</div>
            </div>

            <!-- Floating Payment Badge Inside Phone -->
            <div class="preview-bottom-bar">
              <div class="telebirr-pill">
                <span class="tele-dot"></span>
                <span>telebirr Verified</span>
              </div>
              <span class="font-mono preview-bar-total">360.00 ETB →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Bento Grid Core Features -->
  <section class="features-section" id="features">
    <div class="section-container">
      <div class="section-heading-box">
        <h2 class="section-title">Engineered for Frictionless Hospitality</h2>
        <p class="section-desc">Everything your restaurant, cafe, or lounge needs to operate at peak efficiency.</p>
      </div>

      <div class="bento-grid">
        <!-- Bento 1: Smart QR -->
        <div class="bento-card bento-span-2">
          <div class="bento-badge">📱 Customer Experience</div>
          <h3 class="bento-title">Dynamic Table-Specific QR Menus</h3>
          <p class="bento-text">Customers scan and immediately view your branded menu. No app download needed. Works directly in Safari, Chrome, and Telegram.</p>
          <div class="bento-visual qr-visual-card">
            <div class="mini-qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://menuapp.pro/table4" alt="QR" class="mini-qr" />
              <span>Table #4</span>
            </div>
            <div class="mini-qr-features">
              <div class="check-pill">✓ Instant ordering</div>
              <div class="check-pill">✓ Allergen filters</div>
              <div class="check-pill">✓ Tipping calculator</div>
            </div>
          </div>
        </div>

        <!-- Bento 2: Kitchen Display System -->
        <div class="bento-card">
          <div class="bento-badge">👨‍🍳 Cook Line</div>
          <h3 class="bento-title">Kitchen Display (KDS)</h3>
          <p class="bento-text">Replace loud printers and lost paper tickets with real-time color-coded order cards. Chefs strike off items as they cook.</p>
          <div class="kds-timer-preview">
            <span class="live-clock">⏱️ 04:12 mins</span>
            <span class="status-indicator">In Preparation</span>
          </div>
        </div>

        <!-- Bento 3: Ethiopian Banking -->
        <div class="bento-card">
          <div class="bento-badge">🇪🇹 Localised Banking</div>
          <h3 class="bento-title">telebirr, CBE & Awash Hub</h3>
          <p class="bento-text">Customers scan your verified bank QR and enter their TXN ID. Money lands straight in your account with 0% platform fees.</p>
          <div class="bank-logos-row">
            <span class="bank-badge tele">telebirr</span>
            <span class="bank-badge cbe">CBE Birr</span>
            <span class="bank-badge awash">Awash</span>
          </div>
        </div>

        <!-- Bento 4: Menu Builder & Control -->
        <div class="bento-card bento-span-2">
          <div class="bento-badge">⚡ Real-Time Management</div>
          <h3 class="bento-title">Drag-and-Drop Menu Builder</h3>
          <p class="bento-text">Out of avocados? Sold out of ribeyes? Mark items unavailable in one tap from your phone. Modify prices, add seasonal dishes, and update photos instantly.</p>
          <div class="menu-tags-demo">
            <span class="tag-pill active">86'd / Sold Out Toggle</span>
            <span class="tag-pill active">Modifiers & Options</span>
            <span class="tag-pill active">Multi-Branch Sync</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 24 Business Types Showcase -->
  <section class="templates-section" id="templates">
    <div class="section-container">
      <div class="section-heading-box">
        <h2 class="section-title">24 Tailored Business Architectures</h2>
        <p class="section-desc">Every business type has its own distinct menu flow, required sections, and modifier options.</p>
        
        <div class="template-filter-pills">
          {#each categories as cat}
            <button 
              type="button" 
              class="cat-filter-btn" 
              class:active={selectedCategory === cat}
              on:click={() => { soundFX.playTap(); selectedCategory = cat; }}
            >
              {cat}
            </button>
          {/each}
        </div>
      </div>

      <div class="templates-grid">
        {#each filteredTemplates as tmpl}
          <div class="template-card">
            <div class="tmpl-icon-box">{tmpl.icon}</div>
            <h4 class="tmpl-name">{tmpl.name}</h4>
            <span class="tmpl-category">{tmpl.category}</span>
          </div>
        {/each}
      </div>

      <div class="templates-cta-box">
        <a href="/onboarding" class="btn-tactile btn-primary btn-explore-all" on:click={() => soundFX.playTap()}>
          Explore All 24 Templates in Onboarding Wizard →
        </a>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section class="pricing-section" id="pricing">
    <div class="section-container">
      <div class="section-heading-box">
        <h2 class="section-title">Predictable, Transparent Pricing</h2>
        <p class="section-desc">No hidden charges. No transaction fees taken from your food sales.</p>
        
        <div class="pricing-toggle-box">
          <span class:active={!isAnnual}>Monthly</span>
          <button 
            type="button" 
            class="toggle-switch-btn" 
            class:annual={isAnnual}
            on:click={() => { soundFX.playTap(); isAnnual = !isAnnual; }}
          >
            <div class="switch-ball"></div>
          </button>
          <span class:active={isAnnual}>Annual (Save 20%)</span>
        </div>
      </div>

      <div class="pricing-cards-grid">
        <!-- Starter Plan -->
        <div class="price-card">
          <h3 class="plan-name">Starter Bistro</h3>
          <p class="plan-desc">Perfect for single-location cafes, juice bars, and food trucks.</p>
          <div class="plan-price font-mono">
            {isAnnual ? '1,200 ETB' : '1,500 ETB'} <span>/ month</span>
          </div>
          <ul class="plan-perks">
            <li>✓ 1 Branch with up to 15 Tables</li>
            <li>✓ Dynamic QR Code Generator</li>
            <li>✓ telebirr & CBE Birr Payment Hub</li>
            <li>✓ Basic Menu Builder</li>
          </ul>
          <a href="/onboarding" class="btn-tactile btn-secondary btn-plan">Start 14-Day Free Trial</a>
        </div>

        <!-- Pro Plan (Featured) -->
        <div class="price-card featured">
          <div class="featured-badge">MOST POPULAR</div>
          <h3 class="plan-name">Hospitality Pro</h3>
          <p class="plan-desc">For high-volume restaurants, lounges, and multi-station kitchens.</p>
          <div class="plan-price font-mono">
            {isAnnual ? '2,800 ETB' : '3,500 ETB'} <span>/ month</span>
          </div>
          <ul class="plan-perks">
            <li>✓ Unlimited Tables & QR Codes</li>
            <li>✓ Kitchen Display System (KDS) Line</li>
            <li>✓ Staff RBAC & Waiter Call System</li>
            <li>✓ Financial CSV/Excel Exporting</li>
            <li>✓ Priority WhatsApp & Phone Support</li>
          </ul>
          <a href="/onboarding" class="btn-tactile btn-primary btn-plan">Get Started with Pro</a>
        </div>

        <!-- Enterprise -->
        <div class="price-card">
          <h3 class="plan-name">Franchise & Chains</h3>
          <p class="plan-desc">Multi-location enterprise groups and hotel dining operations.</p>
          <div class="plan-price font-mono">
            Custom
          </div>
          <ul class="plan-perks">
            <li>✓ Unlimited Branches & Menus</li>
            <li>✓ Centralized Multi-Branch Inventory</li>
            <li>✓ Dedicated Account Manager</li>
            <li>✓ Custom ERP & Accounting API</li>
          </ul>
          <a href="mailto:enterprise@menuapp.pro" class="btn-tactile btn-secondary btn-plan">Contact Sales</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="landing-footer">
    <div class="footer-container">
      <div class="footer-brand-col">
        <div class="brand-logo-group">
          <div class="brand-badge-icon">🍽️</div>
          <span class="brand-text">MenuApp<span class="brand-accent">Pro</span></span>
        </div>
        <p class="footer-tagline">The dining operating system for visionary hospitality operators in Ethiopia and worldwide.</p>
      </div>

      <div class="footer-links-col">
        <h4>Product</h4>
        <a href="#features">Smart QR Menus</a>
        <a href="#features">Kitchen Display (KDS)</a>
        <a href="#templates">24 Business Types</a>
        <a href="#payments">telebirr & CBE Hub</a>
      </div>

      <div class="footer-links-col">
        <h4>Platform</h4>
        <a href="/onboarding">Sign Up / Register</a>
        <a href="/admin">Manager Portal</a>
        <a href="/demo-restaurant/main-branch">Customer Demo</a>
      </div>
    </div>

    <div class="footer-bottom-bar">
      <span>&copy; 2026 MenuApp Pro. All rights reserved.</span>
    </div>
  </footer>
</div>

<style>
  .landing-root {
    min-height: 100vh;
    background: var(--bg-dark);
    color: var(--text-primary);
    overflow-x: hidden;
  }

  /* Nav */
  .landing-nav {
    position: sticky;
    top: 0;
    z-index: 500;
    padding: 0.85rem 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand-logo-group {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .brand-badge-icon {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, var(--amber-500), var(--amber-600));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    box-shadow: 0 4px 14px var(--amber-glow);
  }

  .brand-text {
    font-family: var(--font-serif);
    font-size: 1.4rem;
    font-weight: 700;
    color: #FFFFFF;
  }

  .brand-accent {
    color: var(--amber-400);
  }

  .nav-links-center {
    display: flex;
    gap: 2rem;
  }

  .nav-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 600;
    transition: color 140ms ease;
  }

  .nav-link:hover {
    color: #FFFFFF;
  }

  .btn-nav-cta {
    padding: 0.65rem 1.25rem;
    font-size: 0.9rem;
  }

  /* Hero */
  .hero-section {
    position: relative;
    padding: 6rem 1.5rem 5rem 1.5rem;
    overflow: hidden;
  }

  .hero-ambient-glow-1 {
    position: absolute;
    top: -150px;
    left: -100px;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(9, 10, 15, 0) 70%);
    pointer-events: none;
  }

  .hero-ambient-glow-2 {
    position: absolute;
    top: 50px;
    right: -100px;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(0, 91, 187, 0.12) 0%, rgba(9, 10, 15, 0) 70%);
    pointer-events: none;
  }

  .hero-container {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 3.5rem;
    align-items: center;
    position: relative;
    z-index: 2;
  }

  .hero-announcement-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.85rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--amber-400);
    margin-bottom: 1.5rem;
  }

  .hero-main-headline {
    font-family: var(--font-serif);
    font-size: 3.6rem;
    line-height: 1.15;
    color: #FFFFFF;
    margin-bottom: 1.5rem;
    letter-spacing: -0.02em;
  }

  .gradient-text {
    background: linear-gradient(135deg, #FFFFFF 30%, var(--amber-400) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .hero-subtitle {
    font-size: 1.2rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 2.25rem;
    max-width: 580px;
  }

  .hero-cta-group {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .btn-hero-lg {
    padding: 1rem 1.75rem;
    font-size: 1.05rem;
    border-radius: var(--radius-md);
  }

  .cta-arrow {
    transition: transform 140ms ease;
  }

  .btn-primary:hover .cta-arrow {
    transform: translateX(4px);
  }

  .hero-proof-stats {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border);
  }

  .proof-stat {
    display: flex;
    flex-direction: column;
  }

  .stat-number {
    font-size: 1.6rem;
    font-weight: 800;
    color: #FFFFFF;
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }

  .proof-divider {
    width: 1px;
    height: 35px;
    background: var(--border);
  }

  /* Phone Mockup */
  .hero-preview-col {
    display: flex;
    justify-content: center;
  }

  .phone-frame-mockup {
    width: 320px;
    height: 600px;
    background: #090A0F;
    border: 10px solid #202436;
    border-radius: 44px;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.2);
    position: relative;
    overflow: hidden;
  }

  .phone-notch {
    width: 120px;
    height: 22px;
    background: #202436;
    border-radius: 0 0 16px 16px;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
  }

  .phone-screen {
    width: 100%;
    height: 100%;
    background: #12141D;
    padding: 2.25rem 1rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .preview-menu-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .preview-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--amber-500);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }

  .preview-brand-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: #FFFFFF;
  }

  .preview-table {
    font-size: 0.72rem;
    color: var(--amber-400);
  }

  .preview-category-bar {
    display: flex;
    gap: 0.4rem;
  }

  .preview-cat {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.25rem 0.55rem;
    background: #1A1D2B;
    border-radius: var(--radius-full);
    color: var(--text-tertiary);
  }

  .preview-cat.active {
    background: var(--amber-500);
    color: #090A0F;
  }

  .preview-dish-card {
    background: #1A1D2B;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .preview-dish-info h4 {
    font-size: 0.85rem;
    color: #FFFFFF;
    margin: 0 0 0.15rem 0;
  }

  .preview-dish-info p {
    font-size: 0.68rem;
    color: var(--text-tertiary);
    margin: 0 0 0.35rem 0;
  }

  .preview-price {
    font-size: 0.8rem;
    color: var(--amber-400);
    font-weight: 700;
  }

  .preview-dish-img {
    font-size: 1.6rem;
  }

  .preview-bottom-bar {
    margin-top: auto;
    background: linear-gradient(135deg, var(--amber-500), var(--amber-600));
    color: #090A0F;
    border-radius: var(--radius-lg);
    padding: 0.65rem 0.85rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    font-size: 0.78rem;
  }

  .telebirr-pill {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .tele-dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: #005BBB;
  }

  /* Bento Grid */
  .features-section {
    padding: 6rem 1.5rem;
    background: #090A0F;
  }

  .section-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .section-heading-box {
    text-align: center;
    max-width: 640px;
    margin: 0 auto 3.5rem auto;
  }

  .section-title {
    font-family: var(--font-serif);
    font-size: 2.6rem;
    color: #FFFFFF;
    margin-bottom: 0.85rem;
  }

  .section-desc {
    font-size: 1.1rem;
    color: var(--text-secondary);
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .bento-card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2rem;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .bento-span-2 {
    grid-column: span 2;
  }

  .bento-badge {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--amber-400);
    margin-bottom: 0.75rem;
  }

  .bento-title {
    font-family: var(--font-serif);
    font-size: 1.5rem;
    color: #FFFFFF;
    margin-bottom: 0.5rem;
  }

  .bento-text {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 1.5rem;
  }

  .qr-visual-card {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background: var(--surface-elevated);
    padding: 1.25rem;
    border-radius: var(--radius-lg);
  }

  .mini-qr-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #FFFFFF;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    color: #090A0F;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .mini-qr {
    width: 75px;
    height: 75px;
  }

  .mini-qr-features {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .check-pill {
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  .kds-timer-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--surface-elevated);
    padding: 0.85rem 1rem;
    border-radius: var(--radius-md);
    margin-top: auto;
  }

  .live-clock {
    font-family: var(--font-mono);
    color: var(--amber-400);
    font-weight: 700;
  }

  .status-indicator {
    font-size: 0.8rem;
    color: var(--color-success);
    font-weight: 600;
  }

  .bank-logos-row {
    display: flex;
    gap: 0.5rem;
    margin-top: auto;
  }

  .bank-badge {
    padding: 0.4rem 0.75rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 700;
    color: #FFFFFF;
  }

  .bank-badge.tele { background: #005BBB; }
  .bank-badge.cbe { background: #6B21A8; }
  .bank-badge.awash { background: #C2410C; }

  .menu-tags-demo {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .tag-pill {
    padding: 0.4rem 0.85rem;
    background: var(--surface-elevated);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  /* Templates Section */
  .templates-section {
    padding: 6rem 1.5rem;
    background: #12141D;
  }

  .template-filter-pills {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }

  .cat-filter-btn {
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 140ms ease;
  }

  .cat-filter-btn:hover {
    color: #FFFFFF;
  }

  .cat-filter-btn.active {
    background: var(--amber-500);
    color: #090A0F;
    border-color: var(--amber-500);
    font-weight: 700;
  }

  .templates-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
    margin-bottom: 2.5rem;
  }

  .template-card {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: all 160ms var(--ease-spring);
  }

  .template-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .tmpl-icon-box {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }

  .tmpl-name {
    font-size: 1.05rem;
    color: #FFFFFF;
    margin: 0 0 0.35rem 0;
  }

  .tmpl-category {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .templates-cta-box {
    text-align: center;
  }

  .btn-explore-all {
    padding: 0.9rem 2rem;
  }

  /* Pricing */
  .pricing-section {
    padding: 6rem 1.5rem;
    background: #090A0F;
  }

  .pricing-toggle-box {
    display: inline-flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .pricing-toggle-box span.active {
    color: #FFFFFF;
  }

  .toggle-switch-btn {
    width: 48px;
    height: 26px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    cursor: pointer;
    position: relative;
    padding: 2px;
  }

  .switch-ball {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full);
    background: var(--text-tertiary);
    transition: transform 150ms ease, background-color 150ms ease;
  }

  .toggle-switch-btn.annual .switch-ball {
    transform: translateX(22px);
    background: var(--amber-500);
  }

  .pricing-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    align-items: stretch;
  }

  .price-card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2.5rem 2rem;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .price-card.featured {
    border-color: var(--amber-500);
    box-shadow: 0 0 35px -5px var(--amber-glow);
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(18, 20, 29, 1) 100%);
  }

  .featured-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--amber-500);
    color: #090A0F;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.85rem;
    border-radius: var(--radius-full);
  }

  .plan-name {
    font-family: var(--font-serif);
    font-size: 1.6rem;
    color: #FFFFFF;
    margin-bottom: 0.5rem;
  }

  .plan-desc {
    font-size: 0.88rem;
    color: var(--text-secondary);
    line-height: 1.4;
    margin-bottom: 1.5rem;
  }

  .plan-price {
    font-size: 2.2rem;
    font-weight: 800;
    color: #FFFFFF;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
  }

  .plan-price span {
    font-size: 0.9rem;
    color: var(--text-tertiary);
    font-family: var(--font-sans);
  }

  .plan-perks {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 2rem;
    flex: 1;
  }

  .plan-perks li {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .btn-plan {
    width: 100%;
    padding: 0.95rem;
  }

  /* Footer */
  .landing-footer {
    background: #06070A;
    border-top: 1px solid var(--border);
    padding: 4rem 1.5rem 2rem 1.5rem;
  }

  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 3rem;
    margin-bottom: 3rem;
  }

  .footer-tagline {
    font-size: 0.9rem;
    color: var(--text-tertiary);
    line-height: 1.6;
    margin-top: 1rem;
    max-width: 380px;
  }

  .footer-links-col {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .footer-links-col h4 {
    font-size: 0.95rem;
    color: #FFFFFF;
    margin-bottom: 0.5rem;
  }

  .footer-links-col a {
    color: var(--text-tertiary);
    text-decoration: none;
    font-size: 0.88rem;
    transition: color 120ms ease;
  }

  .footer-links-col a:hover {
    color: #FFFFFF;
  }

  .footer-bottom-bar {
    max-width: 1200px;
    margin: 0 auto;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }

  @media (max-width: 1024px) {
    .hero-container {
      grid-template-columns: 1fr;
      text-align: center;
    }
    .hero-subtitle {
      margin-left: auto;
      margin-right: auto;
    }
    .hero-cta-group {
      justify-content: center;
    }
    .hero-proof-stats {
      justify-content: center;
    }
    .bento-grid {
      grid-template-columns: 1fr;
    }
    .bento-span-2 {
      grid-column: span 1;
    }
    .templates-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .pricing-cards-grid {
      grid-template-columns: 1fr;
    }
    .nav-links-center {
      display: none;
    }
  }
</style>
