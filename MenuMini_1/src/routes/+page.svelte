<script lang="ts">
  import { onMount } from 'svelte';
  import QRCode from 'qrcode';
  import type { PageData } from './$types';

  export let data: PageData;

  // Interactive Live Preview State
  let venueNameInput = 'Bole Velvet Cafe';
  let activeLanguage: 'en' | 'am' = 'en';
  let activeCategory: 'coffee' | 'breakfast' | 'dessert' = 'coffee';
  let generatedQR = '';
  let qrLoading = false;

  // Perspectives State
  let activePerspective: 'owner' | 'customer' | 'staff' | 'platform' = 'owner';

  // Pricing Tier State
  let activeTier: 'free' | 'mini' | 'pro' = 'mini';

  // Sample dishes for interactive live phone preview (pure visual demonstration on the widget)
  const previewDishes = {
    coffee: [
      {
        nameEn: 'Signature Yirgacheffe Pour-Over',
        nameAm: 'ይርጋጨፌ ስፔሻሊቲ ቡና',
        descEn: 'Single-origin highland roast with delicate jasmine and bergamot citrus notes.',
        descAm: 'ከከፍተኛ ቦታዎች የተመረጠ የይርጋጨፌ ጽዱ ቡና ከጣፋጭ መዓዛ ጋር።',
        price: '140.00'
      },
      {
        nameEn: 'Addis Velvet Macchiato',
        nameAm: 'አዲስ ቬልቬት ማኪያቶ',
        descEn: 'Double espresso shot layered with velvety micro-foamed local farm milk.',
        descAm: 'በጥንቃቄ የተቀመመ ጥቁር ኤስፕሬሶ በለሰለሰ ወተት አረፋ ጋር።',
        price: '85.00'
      }
    ],
    breakfast: [
      {
        nameEn: 'Special Ful Mudammas',
        nameAm: 'ስፔሻል ፉል በቅቤ',
        descEn: 'Slow-simmered fava beans with spiced niter kibbeh, fresh yogurt, and warm pita.',
        descAm: 'በንጹህ የሀገር ባህል ቅቤ፣ እርጎ እና ቲማቲም የተሰራ ምርጥ ፉል።',
        price: '190.00'
      },
      {
        nameEn: 'Chechebsa with Pure Honey',
        nameAm: 'ጨጨብሳ በማር እና በቅቤ',
        descEn: 'Torn house-baked flatbread tossed in berbere-infused spiced butter and organic honey.',
        descAm: 'በሞቀ የቂቤ በርበሬ የተለወሰ ቂጣ በተፈጥሮ ንጹህ ማር የታጀበ።',
        price: '175.00'
      }
    ],
    dessert: [
      {
        nameEn: 'Honey Spiced Mille-Feuille',
        nameAm: 'የማር ሚልፌይ ኬክ',
        descEn: 'Crisp puff pastry layered with vanilla bean mascarpone and Ethiopian forest honey.',
        descAm: 'የተደራረበ የፓፍ ኬክ ከቫኒላ ክሬም እና ከዱር ማር ጋር።',
        price: '160.00'
      }
    ]
  };

  async function updatePreviewQR(name: string) {
    qrLoading = true;
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'venue';
      const targetUrl = `https://menumini.et/menu/${slug}`;
      generatedQR = await QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 220,
        color: {
          dark: '#1A1D24',
          light: '#F8F6F0'
        }
      });
    } catch {
      // fallback
    } finally {
      qrLoading = false;
    }
  }

  $: if (venueNameInput) {
    updatePreviewQR(venueNameInput);
  }

  onMount(async () => {
    await updatePreviewQR(venueNameInput);

    // Dynamic import for GSAP to avoid SSR window issues
    try {
      const gsapModule = await import('gsap');
      const scrollTriggerModule = await import('gsap/ScrollTrigger');
      const gsap = gsapModule.gsap || gsapModule.default;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;

      gsap.registerPlugin(ScrollTrigger);

      // Hero Elements Staggered Reveal
      gsap.from('.hero-badge, .hero-headline, .hero-lead, .hero-actions-cluster, .hero-metrics-strip', {
        opacity: 0,
        y: 28,
        duration: 0.85,
        stagger: 0.12,
        ease: 'power3.out'
      });

      // Interactive Preview Floating In
      gsap.from('.interactive-phone-frame', {
        scrollTrigger: {
          trigger: '.preview-section',
          start: 'top 80%'
        },
        opacity: 0,
        scale: 0.94,
        y: 35,
        duration: 0.9,
        ease: 'power2.out'
      });

      // Tier Cards Sequential Stagger
      gsap.from('.tier-card', {
        scrollTrigger: {
          trigger: '.tiers-section',
          start: 'top 75%'
        },
        opacity: 0,
        y: 40,
        duration: 0.75,
        stagger: 0.15,
        ease: 'power3.out'
      });

      // Perspective Content Smooth Transition on Scroll
      gsap.from('.perspectives-card', {
        scrollTrigger: {
          trigger: '.perspectives-section',
          start: 'top 75%'
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power2.out'
      });
    } catch (err) {
      console.warn('GSAP animation skipped:', err);
    }
  });
</script>

<svelte:head>
  <title>MenuMini | The Digital Menu & QR System for Ethiopian Hospitality</title>
  <meta name="description" content="Instant QR dining, zero reprinting costs, and zero-commission telebirr and CBE Birr payments. Built for cafes, restaurants, and lounges in Addis Ababa." />
</svelte:head>

<div class="landing-universe">
  <!-- TOP NAVIGATION BAR -->
  <nav class="nav-container">
    <div class="nav-content">
      <a href="/" class="brand-link">
        <span class="brand-emblem">⚡</span>
        <span class="brand-title">Menu<span class="brand-copper">Mini</span></span>
      </a>

      <div class="nav-anchors">
        <a href="#how-it-works">How It Works</a>
        <a href="#preview">Live Simulator</a>
        <a href="#perspectives">The 360° Advantage</a>
        <a href="#tiers">Tiers & Growth</a>
      </div>

      <div class="nav-actions">
        {#if data.isLoggedIn}
          <a href="/admin/menu/{data.venueId}" class="btn-nav-primary">
            <span>Menu Studio</span>
            <span class="arrow-glyph">→</span>
          </a>
        {:else}
          <a href="/sign-in" class="nav-sign-in">Sign In</a>
          <a href="/sign-in?register=true" class="btn-nav-primary">
            <span>Create Your Menu</span>
            <span class="arrow-glyph">→</span>
          </a>
        {/if}
      </div>
    </div>
  </nav>

  <!-- HERO SECTION -->
  <header class="hero-section">
    <div class="hero-inner">
      <div class="hero-badge">
        <span class="badge-dot"></span>
        <span>Empowering Ethiopian Hospitality</span>
      </div>

      <h1 class="hero-headline">
        Your Menu. On Every Phone. <br />
        <span class="headline-copper">In Seconds.</span>
      </h1>

      <p class="hero-lead">
        Replace fragile paper menus with an ultra-fast, bilingual digital dining catalog. 
        Zero customer app downloads, instant QR scanning, and 0% commission direct 
        payments via telebirr and CBE Birr.
      </p>

      <div class="hero-actions-cluster">
        {#if data.isLoggedIn}
          <a href="/admin/menu/{data.venueId}" class="btn-hero-primary">
            <span>Go to Your Menu Studio</span>
            <span class="icon-right">→</span>
          </a>
        {:else}
          <a href="/sign-in?register=true" class="btn-hero-primary">
            <span>Start Free — No Card Needed</span>
            <span class="icon-right">→</span>
          </a>
        {/if}
        <a href="#preview" class="btn-hero-secondary">
          <span>Test Interactive Simulator</span>
          <span class="icon-right">↓</span>
        </a>
      </div>

      <!-- Trust & Performance Metrics Strip -->
      <div class="hero-metrics-strip">
        <div class="metric-pill">
          <span class="metric-highlight">&lt; 100ms</span>
          <span class="metric-label">Sub-Second Load Time</span>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-pill">
          <span class="metric-highlight">0% Fee</span>
          <span class="metric-label">Direct telebirr &amp; CBE Birr</span>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-pill">
          <span class="metric-highlight">0 Birr</span>
          <span class="metric-label">Paper Reprinting Waste</span>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-pill">
          <span class="metric-highlight">Bilingual</span>
          <span class="metric-label">English &amp; Amharic</span>
        </div>
      </div>
    </div>
  </header>

  <!-- HOW IT WORKS SECTION (3 Simple Steps) -->
  <section id="how-it-works" class="steps-section">
    <div class="section-container">
      <div class="section-header-centered">
        <span class="section-tag">EFFORTLESS HOSPITALITY</span>
        <h2 class="section-title">How MenuMini Powers Your Venue</h2>
        <p class="section-desc">Designed from the ground up for real day-to-day operations in Ethiopian hospitality.</p>
      </div>

      <div class="steps-grid">
        <div class="step-card">
          <div class="step-num">01</div>
          <div class="step-icon-wrap">☕</div>
          <h3>Craft Your Dishes &amp; Prices</h3>
          <p>
            Choose from 24 tailored Ethiopian business templates. Add your dishes, customize modifier options, and set accurate ETB prices in minutes.
          </p>
        </div>

        <div class="step-card">
          <div class="step-num">02</div>
          <div class="step-icon-wrap">📱</div>
          <h3>Place Your Dynamic Table QR</h3>
          <p>
            Download high-resolution, print-ready table placards. Your table QR codes never expire—even when you update dishes, prices, or daily specials.
          </p>
        </div>

        <div class="step-card">
          <div class="step-num">03</div>
          <div class="step-icon-wrap">💳</div>
          <h3>Instant Guest Dining &amp; Settlement</h3>
          <p>
            Guests scan with their regular phone camera. They browse fast, toggle Amharic, and settle orders directly via telebirr or CBE Birr with zero middleman fees.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- LIVE SIMULATOR & INTERACTIVE QR SECTION -->
  <section id="preview" class="preview-section">
    <div class="section-container">
      <div class="preview-layout">
        <!-- Controls & Explanation Side -->
        <div class="preview-controls">
          <span class="section-tag">INTERACTIVE SIMULATOR</span>
          <h2 class="section-title">Experience What Your Guests See</h2>
          <p class="preview-intro">
            Test the live experience right here. Type your business name, toggle languages, and watch how smoothly your dishes render on a smartphone screen.
          </p>

          <div class="simulator-input-box">
            <label for="venue-name-input" class="input-label">YOUR CAFE OR RESTAURANT NAME</label>
            <div class="input-group">
              <input 
                id="venue-name-input"
                type="text" 
                bind:value={venueNameInput}
                placeholder="e.g. Bole Velvet Cafe, Arat Kilo Roastery" 
                class="venue-name-field"
                maxlength="50"
              />
            </div>
            <span class="input-hint">Dynamic QR code updates instantly as you type.</span>
          </div>

          <div class="qr-showcase-card">
            <div class="qr-image-container">
              {#if qrLoading}
                <div class="qr-placeholder">Generating QR...</div>
              {:else if generatedQR}
                <img src={generatedQR} alt="Interactive QR Code" class="qr-image" />
              {/if}
            </div>
            <div class="qr-details">
              <strong>Permanent Table Placard</strong>
              <p>Scan with any iOS or Android camera to open your venue's live dining card.</p>
              <div class="qr-specs">
                <span>Vector Print Ready</span>
                <span>•</span>
                <span>Sub-100ms PWA</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Simulated Mobile Phone Screen -->
        <div class="preview-mockup-wrapper">
          <div class="interactive-phone-frame">
            <div class="phone-speaker-notch"></div>
            
            <div class="phone-screen-content">
              <!-- Mobile Venue Header -->
              <div class="mobile-venue-header">
                <div>
                  <h4 class="mobile-venue-title">{venueNameInput || 'Your Venue'}</h4>
                  <span class="mobile-venue-sub">Table 04 • Addis Ababa</span>
                </div>
                <!-- Language Toggle Pill -->
                <button 
                  class="lang-pill"
                  on:click={() => activeLanguage = activeLanguage === 'en' ? 'am' : 'en'}
                  aria-label="Toggle Language"
                >
                  {activeLanguage === 'en' ? 'አማርኛ' : 'English'}
                </button>
              </div>

              <!-- Category Scroll Pills -->
              <div class="mobile-category-bar">
                <button 
                  class="mobile-cat-pill {activeCategory === 'coffee' ? 'active' : ''}"
                  on:click={() => activeCategory = 'coffee'}
                >
                  {activeLanguage === 'en' ? 'Specialty Coffee' : 'ቡና እና ትኩስ'}
                </button>
                <button 
                  class="mobile-cat-pill {activeCategory === 'breakfast' ? 'active' : ''}"
                  on:click={() => activeCategory = 'breakfast'}
                >
                  {activeLanguage === 'en' ? 'Breakfast Plates' : 'ቁርስ'}
                </button>
                <button 
                  class="mobile-cat-pill {activeCategory === 'dessert' ? 'active' : ''}"
                  on:click={() => activeCategory = 'dessert'}
                >
                  {activeLanguage === 'en' ? 'Pastry & Dessert' : 'ጣፋጭ'}
                </button>
              </div>

              <!-- Simulated Dish List -->
              <div class="mobile-dish-list">
                {#each previewDishes[activeCategory] as dish}
                  <div class="mobile-dish-card">
                    <div class="mobile-dish-text">
                      <strong class="dish-item-name">
                        {activeLanguage === 'en' ? dish.nameEn : dish.nameAm}
                      </strong>
                      <p class="dish-item-desc">
                        {activeLanguage === 'en' ? dish.descEn : dish.descAm}
                      </p>
                    </div>
                    <div class="mobile-dish-footer">
                      <span class="dish-item-price">{dish.price} ETB</span>
                      <span class="dish-badge-available">Available</span>
                    </div>
                  </div>
                {/each}
              </div>

              <!-- Zero-Fee Ethiopian Payment Banner -->
              <div class="mobile-settlement-strip">
                <div class="settlement-icon">💳</div>
                <div class="settlement-info">
                  <strong>Direct Settlement (0% Fee)</strong>
                  <span>telebirr • CBE Birr • Cashier</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- THE 360° PERSPECTIVE ADVANTAGE (4 Entity POVs) -->
  <section id="perspectives" class="perspectives-section">
    <div class="section-container">
      <div class="section-header-centered">
        <span class="section-tag">HARMONIOUS ECOSYSTEM</span>
        <h2 class="section-title">Designed for Every Stakeholder</h2>
        <p class="section-desc">A truly great hospitality tool must serve the owner, delight the guest, protect the staff, and run on an indestructible backbone.</p>
      </div>

      <!-- Perspective Navigation Tabs -->
      <div class="perspective-tabs-container">
        <button 
          class="perspective-tab-btn {activePerspective === 'owner' ? 'active' : ''}"
          on:click={() => activePerspective = 'owner'}
        >
          <span class="tab-icon">🏢</span>
          <span>The Business Owner</span>
        </button>
        <button 
          class="perspective-tab-btn {activePerspective === 'customer' ? 'active' : ''}"
          on:click={() => activePerspective = 'customer'}
        >
          <span class="tab-icon">🍽️</span>
          <span>The Dining Guest</span>
        </button>
        <button 
          class="perspective-tab-btn {activePerspective === 'staff' ? 'active' : ''}"
          on:click={() => activePerspective = 'staff'}
        >
          <span class="tab-icon">☕</span>
          <span>Waiters &amp; Baristas</span>
        </button>
        <button 
          class="perspective-tab-btn {activePerspective === 'platform' ? 'active' : ''}"
          on:click={() => activePerspective = 'platform'}
        >
          <span class="tab-icon">🛡️</span>
          <span>Our Platform Backbone</span>
        </button>
      </div>

      <!-- Perspective Detail Display Card -->
      <div class="perspectives-card">
        {#if activePerspective === 'owner'}
          <div class="perspective-content-grid">
            <div class="perspective-text">
              <span class="sub-tag">OWNER'S PERSPECTIVE</span>
              <h3>Take Complete Control Over Menu Margins &amp; Costs</h3>
              <p>
                Printing physical menus in Addis Ababa costs between 15,000 and 35,000 ETB per print run. 
                Whenever wholesale coffee beans, dairy, or meat prices fluctuate, paper menus force you to either 
                absorb lost profits or reprint at huge expense.
              </p>
              <p>
                With MenuMini, you adjust prices or feature daily chef specials in 5 seconds from your phone. 
                Changes go live instantly across every table without reprinting a single flyer.
              </p>
              <div class="perspective-highlights">
                <div class="highlight-item">
                  <strong>0 ETB Printing Overhead</strong>
                  <span>Never pay to reprint paper menus again.</span>
                </div>
                <div class="highlight-item">
                  <strong>5-Second Price Updates</strong>
                  <span>Protect your operating margins in real time.</span>
                </div>
                <div class="highlight-item">
                  <strong>0% Platform Commission</strong>
                  <span>We never deduct a single percentage from your sales.</span>
                </div>
              </div>
            </div>
            <div class="perspective-visual">
              <div class="stat-callout">
                <span class="stat-number">100%</span>
                <span class="stat-desc">Of your customer revenue stays directly in your merchant bank account.</span>
              </div>
            </div>
          </div>
        {:else if activePerspective === 'customer'}
          <div class="perspective-content-grid">
            <div class="perspective-text">
              <span class="sub-tag">GUEST'S PERSPECTIVE</span>
              <h3>An Effortless, Fast Dining Experience from the First Second</h3>
              <p>
                Guests despise waving their hands for 10 minutes just to get a greasy, tattered paper menu. 
                They also dislike being forced to download an app or register an account just to order a coffee.
              </p>
              <p>
                MenuMini requires zero app downloads. Guests point their phone's native camera at the table QR code, 
                and the menu appears in under 100 milliseconds. Crisp imagery, clear Amharic and English descriptions, 
                and zero clutter.
              </p>
              <div class="perspective-highlights">
                <div class="highlight-item">
                  <strong>Sub-100ms Instant Load</strong>
                  <span>Pre-cached PWA technology ensures instant rendering.</span>
                </div>
                <div class="highlight-item">
                  <strong>Zero App Installs</strong>
                  <span>Works in standard Safari, Chrome, and Telegram in-app browsers.</span>
                </div>
                <div class="highlight-item">
                  <strong>Full Bilingual Respect</strong>
                  <span>One-click toggle between English and clear Amharic typography.</span>
                </div>
              </div>
            </div>
            <div class="perspective-visual">
              <div class="stat-callout">
                <span class="stat-number">&lt; 100ms</span>
                <span class="stat-desc">PWA load speed keeps customers engaged without waiting for page refreshes.</span>
              </div>
            </div>
          </div>
        {:else if activePerspective === 'staff'}
          <div class="perspective-content-grid">
            <div class="perspective-text">
              <span class="sub-tag">STAFF &amp; CREW PERSPECTIVE</span>
              <h3>Fewer Repetitive Inquiries, Zero 86'd Dish Embarrassment</h3>
              <p>
                Waiters and baristas spend up to 40% of their floor time answering the same basic questions: 
                "How much is this today?", "Do you have oat milk?", or running back from the kitchen to apologize 
                that a popular dish is sold out.
              </p>
              <p>
                When a dish runs out in MenuMini, the manager toggles it unavailable in one tap. The dish is immediately 
                flagged across every table QR in real time, preventing frustrated customers and saving staff from awkward explanations.
              </p>
              <div class="perspective-highlights">
                <div class="highlight-item">
                  <strong>Instant Availability Toggle</strong>
                  <span>Mark sold-out items instantly so waitstaff never have to apologize.</span>
                </div>
                <div class="highlight-item">
                  <strong>Clear Modifier Details</strong>
                  <span>Milk choices, spice levels, and portions are transparent to guests.</span>
                </div>
                <div class="highlight-item">
                  <strong>Focus on Hospitality</strong>
                  <span>Staff focus on delivering warm, attentive service rather than repeating prices.</span>
                </div>
              </div>
            </div>
            <div class="perspective-visual">
              <div class="stat-callout">
                <span class="stat-number">80%</span>
                <span class="stat-desc">Reduction in repetitive menu queries during peak lunch and dinner rushes.</span>
              </div>
            </div>
          </div>
        {:else if activePerspective === 'platform'}
          <div class="perspective-content-grid">
            <div class="perspective-text">
              <span class="sub-tag">PLATFORM &amp; ARCHITECTURE PERSPECTIVE</span>
              <h3>An Indestructible PostgreSQL &amp; Cryptographic Spine</h3>
              <p>
                We do not build flimsy prototype toys. MenuMini is engineered with an enterprise-grade 
                PostgreSQL backbone, strict schema-enforced migrations, scrypt cryptographic key derivation, 
                and HTTP-only secure cookie sessions.
              </p>
              <p>
                Every menu publication is an atomic database transaction. Offline PWA caching ensures the menu 
                stays accessible on customer devices even during temporary telecom or Wi-Fi disruptions.
              </p>
              <div class="perspective-highlights">
                <div class="highlight-item">
                  <strong>ACID Publishing Guarantees</strong>
                  <span>Zero partial or corrupted menu states—ever.</span>
                </div>
                <div class="highlight-item">
                  <strong>Cryptographic Session Security</strong>
                  <span>Hardware-level password hashing and timing-safe token checks.</span>
                </div>
                <div class="highlight-item">
                  <strong>Offline PWA Resilience</strong>
                  <span>Menus continue functioning seamlessly during network drops.</span>
                </div>
              </div>
            </div>
            <div class="perspective-visual">
              <div class="stat-callout">
                <span class="stat-number">100%</span>
                <span class="stat-desc">Zero mock data. Real PostgreSQL transactions from draft to live publication.</span>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </section>

  <!-- TIERS & PRICING SECTION -->
  <section id="tiers" class="tiers-section">
    <div class="section-container">
      <div class="section-header-centered">
        <span class="section-tag">TRANSPARENT VALUE TIERS</span>
        <h2 class="section-title">Grow Seamlessly With Your Venue</h2>
        <p class="section-desc">Choose the tier that matches your current stage. Upgrade whenever your business is ready.</p>
      </div>

      <div class="tiers-grid">
        <!-- TIER 1: FREE -->
        <div class="tier-card {activeTier === 'free' ? 'active-tier' : ''}" on:click={() => activeTier = 'free'}>
          <div class="tier-header">
            <span class="tier-badge">ESSENTIAL START</span>
            <h3 class="tier-name">Free Tier</h3>
            <p class="tier-tagline">Start digital immediately with zero financial risk.</p>
            <div class="tier-price-box">
              <span class="tier-amount">0</span>
              <span class="tier-currency">ETB</span>
              <span class="tier-cycle">/ forever</span>
            </div>
          </div>

          <ul class="tier-features-list">
            <li><span class="check-glyph">✓</span> 1 Branch location</li>
            <li><span class="check-glyph">✓</span> Instant high-speed digital menu</li>
            <li><span class="check-glyph">✓</span> Permanent table QR code generator</li>
            <li><span class="check-glyph">✓</span> Live price updates &amp; availability toggle</li>
            <li><span class="check-glyph">✓</span> English &amp; Amharic dual language</li>
            <li><span class="check-glyph">✓</span> Unlimited customer scans</li>
          </ul>

          <div class="tier-cta-box">
            <a href="/sign-in?register=true" class="btn-tier-outline">
              <span>Start Free Now</span>
              <span>→</span>
            </a>
          </div>
        </div>

        <!-- TIER 2: MENUMINI (FEATURED) -->
        <div class="tier-card featured-tier {activeTier === 'mini' ? 'active-tier' : ''}" on:click={() => activeTier = 'mini'}>
          <div class="featured-ribbon">RECOMMENDED FOR ADDIS CAFES</div>
          <div class="tier-header">
            <span class="tier-badge warm-copper">COMMERCIAL STANDARD</span>
            <h3 class="tier-name">Menu'Mini</h3>
            <p class="tier-tagline">Everything a busy cafe, bakery, or bistro needs to operate effortlessly.</p>
            <div class="tier-price-box">
              <span class="tier-amount">Affordable</span>
              <span class="tier-cycle">Monthly Birr Plan</span>
            </div>
          </div>

          <ul class="tier-features-list">
            <li><span class="check-glyph copper">✓</span> <strong>Up to 2 branch locations</strong></li>
            <li><span class="check-glyph copper">✓</span> <strong>24 Curated Hospitality Templates</strong></li>
            <li><span class="check-glyph copper">✓</span> <strong>0% Fee telebirr &amp; CBE Birr Placards</strong></li>
            <li><span class="check-glyph copper">✓</span> Table number management &amp; print shop exporter</li>
            <li><span class="check-glyph copper">✓</span> Full item modifier groups (milks, doneness, extras)</li>
            <li><span class="check-glyph copper">✓</span> Offline PWA dining cart (never lose guest selections)</li>
            <li><span class="check-glyph copper">✓</span> Direct priority WhatsApp support</li>
          </ul>

          <div class="tier-cta-box">
            <a href="/sign-in?register=true" class="btn-tier-featured">
              <span>Get Menu'Mini</span>
              <span>→</span>
            </a>
          </div>
        </div>

        <!-- TIER 3: MENUPRO -->
        <div class="tier-card pro-tier {activeTier === 'pro' ? 'active-tier' : ''}" on:click={() => activeTier = 'pro'}>
          <div class="tier-header">
            <span class="tier-badge dark-accent">ENTERPRISE HOSPITALITY</span>
            <h3 class="tier-name">MenuPro</h3>
            <p class="tier-tagline">For ambitious multi-branch chains, fine dining, and hospitality groups.</p>
            <div class="tier-price-box">
              <span class="tier-amount">Enterprise</span>
              <span class="tier-cycle">Multi-Branch Scale</span>
            </div>
          </div>

          <ul class="tier-features-list">
            <li><span class="check-glyph">✓</span> <strong>Unlimited branch locations</strong></li>
            <li><span class="check-glyph">✓</span> Centralized multi-branch catalog sync</li>
            <li><span class="check-glyph">✓</span> AI-powered menu &amp; dish translation assistant</li>
            <li><span class="check-glyph">✓</span> Live Kitchen Display System (KDS) order routing</li>
            <li><span class="check-glyph">✓</span> Staff permissions (Cashier, Waiter, Kitchen, Admin)</li>
            <li><span class="check-glyph">✓</span> Split bill calculations &amp; multi-payer checkout</li>
            <li><span class="check-glyph">✓</span> Dedicated account manager &amp; on-site staff setup</li>
          </ul>

          <div class="tier-cta-box">
            <a href="/sign-in" class="btn-tier-outline">
              <span>Contact Sales for Pro</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ROI / COST COMPARISON CALLOUT -->
  <section class="roi-section">
    <div class="section-container">
      <div class="roi-card">
        <div class="roi-header">
          <h3>The True Cost of Outdated Paper Menus</h3>
          <p>Why modern Ethiopian venues are abandoning printed cards forever.</p>
        </div>

        <div class="roi-comparison-grid">
          <div class="comparison-column traditional-column">
            <div class="column-badge bad">TRADITIONAL PAPER MENUS</div>
            <div class="cost-stat">~25,000 ETB</div>
            <p class="cost-stat-sub">Spent on printing per quarter</p>
            <ul class="comparison-list">
              <li>❌ Expensive reprints whenever ingredient costs rise</li>
              <li>❌ Soiled, bent, and unhygienic after weeks of handling</li>
              <li>❌ Waiters waste hours explaining sold-out dishes</li>
              <li>❌ Locked to a single language or cluttered text</li>
            </ul>
          </div>

          <div class="comparison-column menumini-column">
            <div class="column-badge good">MENUMINI DIGITAL SYSTEM</div>
            <div class="cost-stat">0 ETB</div>
            <p class="cost-stat-sub">Paper reprinting expense</p>
            <ul class="comparison-list">
              <li>✓ Update prices in 5 seconds from your smartphone</li>
              <li>✓ Always crisp, clean, and contactless on guests' screens</li>
              <li>✓ Toggle out-of-stock items in one tap before guests order</li>
              <li>✓ Seamless English and Amharic with zero clutter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ZERO-COMMISSION PAYMENTS SECTION -->
  <section class="settlement-section">
    <div class="section-container">
      <div class="settlement-content-wrap">
        <span class="section-tag">DIRECT PEER-TO-PEER</span>
        <h2 class="section-title">Zero Middleman Fees on telebirr &amp; CBE Birr</h2>
        <p class="section-desc">
          We never sit between you and your money. Your guests settle their bills directly to your venue's 
          registered telebirr merchant phone, CBE Birr account, or bank account. 
          We deduct 0% commission on peer-to-peer customer settlements.
        </p>

        <div class="settlement-badges-row">
          <div class="payment-brand-card">
            <span class="brand-badge-name">telebirr</span>
            <small>Direct Merchant Settlement</small>
          </div>
          <div class="payment-brand-card">
            <span class="brand-badge-name">CBE Birr</span>
            <small>Commercial Bank of Ethiopia</small>
          </div>
          <div class="payment-brand-card">
            <span class="brand-badge-name">Awash Birr</span>
            <small>Awash Bank Direct</small>
          </div>
          <div class="payment-brand-card">
            <span class="brand-badge-name">Cash &amp; POS</span>
            <small>Traditional In-Person</small>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FINAL CALL TO ACTION BANNER -->
  <section class="final-cta-section">
    <div class="section-container">
      <div class="final-cta-card">
        <h2>Bring Modern Hospitality to Your Venue Today</h2>
        <p>Set up your menu in under five minutes. No credit card required to start.</p>
        <div class="final-cta-buttons">
          {#if data.isLoggedIn}
            <a href="/admin/menu/{data.venueId}" class="btn-final-primary">
              <span>Open Your Menu Studio</span>
              <span>→</span>
            </a>
          {:else}
            <a href="/sign-in?register=true" class="btn-final-primary">
              <span>Create Your Free Menu</span>
              <span>→</span>
            </a>
            <a href="/sign-in" class="btn-final-secondary">
              <span>Sign In to Existing Venue</span>
            </a>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="landing-footer">
    <div class="section-container footer-content">
      <div class="footer-brand-col">
        <div class="brand-link">
          <span class="brand-emblem">⚡</span>
          <span class="brand-title">Menu<span class="brand-copper">Mini</span></span>
        </div>
        <p class="footer-tagline">
          The high-speed digital menu and zero-commission QR payment system for Ethiopian hospitality.
        </p>
        <span class="footer-locale">Crafted with care in Addis Ababa, Ethiopia.</span>
      </div>

      <div class="footer-links-col">
        <strong>Product</strong>
        <a href="#how-it-works">How It Works</a>
        <a href="#preview">Live Simulator</a>
        <a href="#perspectives">The 360° Advantage</a>
        <a href="#tiers">Tiers &amp; Pricing</a>
      </div>

      <div class="footer-links-col">
        <strong>Venue Portal</strong>
        <a href="/sign-in">Sign In</a>
        <a href="/sign-in?register=true">Register Venue</a>
        {#if data.isLoggedIn}
          <a href="/admin/menu/{data.venueId}">Menu Studio</a>
        {/if}
      </div>
    </div>
    
    <div class="footer-bottom-bar">
      <div class="section-container bottom-inner">
        <span>© {new Date().getFullYear()} MenuMini. All rights reserved.</span>
        <span>Zero Third-Party Commission.</span>
      </div>
    </div>
  </footer>
</div>

<style>
  /* -------------------------------------------------------------
     TASTEFUL LUXURY WARM PALETTE (STRICTLY NO BRIGHT YELLOW/BLUE)
     Base: #0E1015 Deep Charcoal / Slate
     Cards: #151821 Subtle Warm Obsidian
     Accent: #C87D55 Burnished Copper / Terracotta
     Accent Hover: #B5653C
     Text Primary: #F5F3EF Soft Cream
     Text Muted: #9E988D Muted Oatmeal
     ------------------------------------------------------------- */
  :global(body) {
    background-color: #0E1015 !important;
    color: #F5F3EF !important;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  .landing-universe {
    background-color: #0E1015;
    color: #F5F3EF;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .section-container {
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 1.5rem;
    width: 100%;
  }

  /* TOP NAVIGATION */
  .nav-container {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(14, 16, 21, 0.88);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .nav-content {
    max-width: 1180px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: #F5F3EF;
  }

  .brand-emblem {
    font-size: 1.25rem;
    color: #C87D55;
  }

  .brand-title {
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .brand-copper {
    color: #C87D55;
  }

  .nav-anchors {
    display: flex;
    align-items: center;
    gap: 1.75rem;
  }

  .nav-anchors a {
    color: #9E988D;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .nav-anchors a:hover {
    color: #F5F3EF;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .nav-sign-in {
    color: #9E988D;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.5rem 0.85rem;
    transition: color 0.2s ease;
  }

  .nav-sign-in:hover {
    color: #F5F3EF;
  }

  .btn-nav-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: #C87D55;
    color: #FFFFFF;
    text-decoration: none;
    font-size: 0.88rem;
    font-weight: 600;
    padding: 0.55rem 1.15rem;
    border-radius: 8px;
    transition: background 0.2s ease, transform 0.15s ease;
  }

  .btn-nav-primary:hover {
    background: #B5653C;
    transform: translateY(-1px);
  }

  .arrow-glyph {
    font-size: 1rem;
    transition: transform 0.2s ease;
  }

  .btn-nav-primary:hover .arrow-glyph {
    transform: translateX(3px);
  }

  /* HERO SECTION */
  .hero-section {
    padding: 5.5rem 1.5rem 4rem;
    text-align: center;
    position: relative;
    background: radial-gradient(circle at 50% 20%, rgba(200, 125, 85, 0.08) 0%, transparent 65%);
  }

  .hero-inner {
    max-width: 860px;
    margin: 0 auto;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(200, 125, 85, 0.12);
    border: 1px solid rgba(200, 125, 85, 0.28);
    color: #D4A373;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.35rem 0.95rem;
    border-radius: 9999px;
    margin-bottom: 1.75rem;
    letter-spacing: 0.02em;
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #C87D55;
  }

  .hero-headline {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2.4rem, 5.2vw, 4.1rem);
    font-weight: 600;
    line-height: 1.14;
    letter-spacing: -0.03em;
    color: #F5F3EF;
    margin-bottom: 1.4rem;
  }

  .headline-copper {
    color: #C87D55;
    font-style: italic;
  }

  .hero-lead {
    font-size: clamp(1rem, 2vw, 1.18rem);
    line-height: 1.65;
    color: #9E988D;
    max-width: 680px;
    margin: 0 auto 2.5rem;
  }

  .hero-actions-cluster {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 3.5rem;
  }

  .btn-hero-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    background: linear-gradient(135deg, #C87D55, #B5653C);
    color: #FFFFFF;
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    padding: 0.9rem 1.8rem;
    border-radius: 10px;
    box-shadow: 0 4px 18px rgba(200, 125, 85, 0.28);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .btn-hero-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(200, 125, 85, 0.38);
  }

  .btn-hero-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #F5F3EF;
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    padding: 0.9rem 1.6rem;
    border-radius: 10px;
    transition: background 0.2s ease, border-color 0.2s ease;
  }

  .btn-hero-secondary:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* METRICS STRIP */
  .hero-metrics-strip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.8rem;
    background: rgba(21, 24, 33, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 1.1rem 2rem;
    border-radius: 14px;
    max-width: 780px;
    margin: 0 auto;
    flex-wrap: wrap;
  }

  .metric-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }

  .metric-highlight {
    font-size: 1.05rem;
    font-weight: 700;
    color: #D4A373;
    font-family: 'JetBrains Mono', monospace;
  }

  .metric-label {
    font-size: 0.78rem;
    color: #9E988D;
  }

  .metric-divider {
    width: 1px;
    height: 28px;
    background: rgba(255, 255, 255, 0.08);
  }

  /* SECTION HEADERS */
  .section-tag {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #C87D55;
    text-transform: uppercase;
    display: block;
    margin-bottom: 0.6rem;
  }

  .section-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.8rem, 3.2vw, 2.5rem);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #F5F3EF;
    margin-bottom: 0.8rem;
  }

  .section-desc {
    color: #9E988D;
    font-size: 1rem;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
  }

  .section-header-centered {
    text-align: center;
    margin-bottom: 3.5rem;
  }

  /* STEPS SECTION */
  .steps-section {
    padding: 5rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.75rem;
  }

  .step-card {
    background: #151821;
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 2.2rem 1.8rem;
    border-radius: 14px;
    position: relative;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .step-card:hover {
    transform: translateY(-3px);
    border-color: rgba(200, 125, 85, 0.3);
  }

  .step-num {
    position: absolute;
    top: 1.4rem;
    right: 1.6rem;
    font-size: 1.5rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.08);
    font-family: 'JetBrains Mono', monospace;
  }

  .step-icon-wrap {
    font-size: 2rem;
    margin-bottom: 1.2rem;
  }

  .step-card h3 {
    font-size: 1.15rem;
    font-weight: 700;
    color: #F5F3EF;
    margin-bottom: 0.75rem;
  }

  .step-card p {
    font-size: 0.9rem;
    line-height: 1.6;
    color: #9E988D;
  }

  /* PREVIEW & LIVE SIMULATOR SECTION */
  .preview-section {
    padding: 5rem 0;
    background: #11131A;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .preview-layout {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 3.5rem;
    align-items: center;
  }

  .preview-intro {
    font-size: 1rem;
    line-height: 1.65;
    color: #9E988D;
    margin-bottom: 2rem;
  }

  .simulator-input-box {
    background: #151821;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.3rem;
    border-radius: 12px;
    margin-bottom: 1.8rem;
  }

  .input-label {
    display: block;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #C87D55;
    margin-bottom: 0.5rem;
  }

  .venue-name-field {
    width: 100%;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #F5F3EF;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.95rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .venue-name-field:focus {
    border-color: #C87D55;
  }

  .input-hint {
    display: block;
    font-size: 0.78rem;
    color: #7A756B;
    margin-top: 0.5rem;
  }

  .qr-showcase-card {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background: #151821;
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 1.4rem;
    border-radius: 12px;
  }

  .qr-image-container {
    width: 120px;
    height: 120px;
    background: #F8F6F0;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .qr-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .qr-placeholder {
    font-size: 0.75rem;
    color: #555;
    text-align: center;
  }

  .qr-details strong {
    display: block;
    font-size: 0.95rem;
    color: #F5F3EF;
    margin-bottom: 0.35rem;
  }

  .qr-details p {
    font-size: 0.82rem;
    color: #9E988D;
    line-height: 1.45;
    margin-bottom: 0.6rem;
  }

  .qr-specs {
    display: flex;
    gap: 0.5rem;
    font-size: 0.74rem;
    color: #C87D55;
    font-weight: 600;
  }

  /* SIMULATED PHONE FRAME */
  .preview-mockup-wrapper {
    display: flex;
    justify-content: center;
  }

  .interactive-phone-frame {
    width: 320px;
    background: #090B0E;
    border: 8px solid #232731;
    border-radius: 36px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08);
    overflow: hidden;
    position: relative;
  }

  .phone-speaker-notch {
    width: 70px;
    height: 14px;
    background: #232731;
    border-radius: 0 0 10px 10px;
    margin: 0 auto;
  }

  .phone-screen-content {
    padding: 1rem;
    min-height: 440px;
    display: flex;
    flex-direction: column;
  }

  .mobile-venue-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .mobile-venue-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #F5F3EF;
    margin-bottom: 0.2rem;
  }

  .mobile-venue-sub {
    font-size: 0.72rem;
    color: #7A756B;
  }

  .lang-pill {
    background: rgba(200, 125, 85, 0.15);
    border: 1px solid rgba(200, 125, 85, 0.3);
    color: #D4A373;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .lang-pill:hover {
    background: rgba(200, 125, 85, 0.25);
  }

  .mobile-category-bar {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 1rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }

  .mobile-cat-pill {
    background: rgba(255, 255, 255, 0.06);
    border: none;
    color: #9E988D;
    font-size: 0.74rem;
    font-weight: 600;
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .mobile-cat-pill.active {
    background: #C87D55;
    color: #FFFFFF;
  }

  .mobile-dish-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex-grow: 1;
    margin-bottom: 1rem;
  }

  .mobile-dish-card {
    background: #151821;
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.75rem;
    border-radius: 8px;
  }

  .dish-item-name {
    display: block;
    font-size: 0.85rem;
    color: #F5F3EF;
    margin-bottom: 0.25rem;
  }

  .dish-item-desc {
    font-size: 0.72rem;
    color: #8A857B;
    line-height: 1.4;
    margin-bottom: 0.5rem;
  }

  .mobile-dish-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dish-item-price {
    font-size: 0.85rem;
    font-weight: 700;
    color: #D4A373;
    font-family: 'JetBrains Mono', monospace;
  }

  .dish-badge-available {
    font-size: 0.65rem;
    color: #608069;
    background: rgba(78, 107, 86, 0.15);
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    font-weight: 600;
  }

  .mobile-settlement-strip {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(200, 125, 85, 0.08);
    border: 1px solid rgba(200, 125, 85, 0.2);
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
  }

  .settlement-icon {
    font-size: 1.1rem;
  }

  .settlement-info strong {
    display: block;
    font-size: 0.72rem;
    color: #F5F3EF;
  }

  .settlement-info span {
    font-size: 0.68rem;
    color: #C87D55;
  }

  /* PERSPECTIVES SECTION */
  .perspectives-section {
    padding: 5.5rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .perspective-tabs-container {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 2.5rem;
  }

  .perspective-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #151821;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #9E988D;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.75rem 1.3rem;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .perspective-tab-btn:hover {
    color: #F5F3EF;
    border-color: rgba(255, 255, 255, 0.18);
  }

  .perspective-tab-btn.active {
    background: #C87D55;
    border-color: #C87D55;
    color: #FFFFFF;
    box-shadow: 0 4px 16px rgba(200, 125, 85, 0.25);
  }

  .tab-icon {
    font-size: 1.05rem;
  }

  .perspectives-card {
    background: #151821;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 2.8rem;
  }

  .perspective-content-grid {
    display: grid;
    grid-template-columns: 1.4fr 0.8fr;
    gap: 3rem;
    align-items: center;
  }

  .sub-tag {
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #C87D55;
    display: block;
    margin-bottom: 0.5rem;
  }

  .perspective-text h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.6rem;
    font-weight: 600;
    color: #F5F3EF;
    margin-bottom: 1rem;
    line-height: 1.3;
  }

  .perspective-text p {
    font-size: 0.95rem;
    line-height: 1.65;
    color: #9E988D;
    margin-bottom: 1.1rem;
  }

  .perspective-highlights {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1.25rem;
    margin-top: 1.8rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .highlight-item strong {
    display: block;
    font-size: 0.9rem;
    color: #F5F3EF;
    margin-bottom: 0.2rem;
  }

  .highlight-item span {
    font-size: 0.78rem;
    color: #8A857B;
    line-height: 1.4;
  }

  .perspective-visual {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-callout {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(200, 125, 85, 0.25);
    padding: 2.5rem 1.8rem;
    border-radius: 14px;
    text-align: center;
    width: 100%;
  }

  .stat-number {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 3rem;
    font-weight: 800;
    color: #C87D55;
    margin-bottom: 0.75rem;
  }

  .stat-desc {
    font-size: 0.88rem;
    color: #9E988D;
    line-height: 1.5;
  }

  /* TIERS SECTION */
  .tiers-section {
    padding: 5.5rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background: #0B0D11;
  }

  .tiers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
    gap: 2rem;
    align-items: stretch;
  }

  .tier-card {
    background: #151821;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 2.4rem 2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .tier-card:hover {
    transform: translateY(-4px);
  }

  .tier-card.featured-tier {
    background: #181B26;
    border: 2px solid rgba(200, 125, 85, 0.45);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(200, 125, 85, 0.08);
  }

  .tier-card.active-tier {
    border-color: #C87D55;
  }

  .featured-ribbon {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #C87D55;
    color: #FFFFFF;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 0.3rem 0.85rem;
    border-radius: 9999px;
    white-space: nowrap;
  }

  .tier-badge {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #9E988D;
    background: rgba(255, 255, 255, 0.06);
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .tier-badge.warm-copper {
    color: #D4A373;
    background: rgba(200, 125, 85, 0.15);
  }

  .tier-badge.dark-accent {
    color: #A39E93;
    background: rgba(255, 255, 255, 0.08);
  }

  .tier-name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.6rem;
    font-weight: 700;
    color: #F5F3EF;
    margin-bottom: 0.5rem;
  }

  .tier-tagline {
    font-size: 0.88rem;
    color: #8A857B;
    line-height: 1.45;
    margin-bottom: 1.4rem;
    min-height: 40px;
  }

  .tier-price-box {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 1.6rem;
  }

  .tier-amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.2rem;
    font-weight: 800;
    color: #F5F3EF;
  }

  .tier-currency {
    font-size: 1rem;
    font-weight: 600;
    color: #D4A373;
  }

  .tier-cycle {
    font-size: 0.82rem;
    color: #8A857B;
    margin-left: 0.2rem;
  }

  .tier-features-list {
    list-style: none;
    padding: 0;
    margin: 0 0 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    flex-grow: 1;
  }

  .tier-features-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    font-size: 0.88rem;
    color: #9E988D;
    line-height: 1.4;
  }

  .tier-features-list li strong {
    color: #F5F3EF;
  }

  .check-glyph {
    color: #608069;
    font-weight: 700;
    flex-shrink: 0;
  }

  .check-glyph.copper {
    color: #C87D55;
  }

  .tier-cta-box {
    margin-top: auto;
  }

  .btn-tier-outline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #F5F3EF;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.92rem;
    padding: 0.85rem;
    border-radius: 8px;
    transition: background 0.2s ease, border-color 0.2s ease;
  }

  .btn-tier-outline:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-tier-featured {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    background: linear-gradient(135deg, #C87D55, #B5653C);
    color: #FFFFFF;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.92rem;
    padding: 0.85rem;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(200, 125, 85, 0.3);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .btn-tier-featured:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(200, 125, 85, 0.4);
  }

  /* ROI SECTION */
  .roi-section {
    padding: 5rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .roi-card {
    background: #151821;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 3rem;
  }

  .roi-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .roi-header h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.8rem;
    font-weight: 600;
    color: #F5F3EF;
    margin-bottom: 0.5rem;
  }

  .roi-header p {
    color: #9E988D;
    font-size: 0.95rem;
  }

  .roi-comparison-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
  }

  .comparison-column {
    background: rgba(0, 0, 0, 0.25);
    border-radius: 14px;
    padding: 2rem;
  }

  .traditional-column {
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .menumini-column {
    border: 1px solid rgba(200, 125, 85, 0.35);
  }

  .column-badge {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    display: inline-block;
    margin-bottom: 1rem;
  }

  .column-badge.bad {
    background: rgba(239, 68, 68, 0.12);
    color: #F87171;
  }

  .column-badge.good {
    background: rgba(200, 125, 85, 0.18);
    color: #D4A373;
  }

  .cost-stat {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.2rem;
    font-weight: 800;
    color: #F5F3EF;
    margin-bottom: 0.2rem;
  }

  .cost-stat-sub {
    font-size: 0.82rem;
    color: #8A857B;
    margin-bottom: 1.5rem;
  }

  .comparison-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .comparison-list li {
    font-size: 0.88rem;
    color: #9E988D;
    line-height: 1.45;
  }

  /* SETTLEMENT SECTION */
  .settlement-section {
    padding: 5rem 0;
    background: #11131A;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;
  }

  .settlement-content-wrap {
    max-width: 780px;
    margin: 0 auto;
  }

  .settlement-badges-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1.25rem;
    margin-top: 2.5rem;
  }

  .payment-brand-card {
    background: #151821;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.3rem;
    border-radius: 12px;
  }

  .brand-badge-name {
    display: block;
    font-size: 1.05rem;
    font-weight: 700;
    color: #F5F3EF;
    margin-bottom: 0.25rem;
  }

  .payment-brand-card small {
    font-size: 0.74rem;
    color: #8A857B;
  }

  /* FINAL CALL TO ACTION */
  .final-cta-section {
    padding: 5rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .final-cta-card {
    background: radial-gradient(circle at 50% 50%, rgba(200, 125, 85, 0.12) 0%, rgba(21, 24, 33, 0.95) 75%);
    border: 1px solid rgba(200, 125, 85, 0.3);
    border-radius: 22px;
    padding: 4rem 2rem;
    text-align: center;
    max-width: 860px;
    margin: 0 auto;
  }

  .final-cta-card h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2rem, 3.6vw, 2.7rem);
    font-weight: 600;
    color: #F5F3EF;
    margin-bottom: 0.8rem;
  }

  .final-cta-card p {
    color: #9E988D;
    font-size: 1.05rem;
    max-width: 500px;
    margin: 0 auto 2.2rem;
  }

  .final-cta-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .btn-final-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    background: linear-gradient(135deg, #C87D55, #B5653C);
    color: #FFFFFF;
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    padding: 0.9rem 1.8rem;
    border-radius: 10px;
    box-shadow: 0 4px 18px rgba(200, 125, 85, 0.3);
    transition: transform 0.15s ease;
  }

  .btn-final-primary:hover {
    transform: translateY(-2px);
  }

  .btn-final-secondary {
    display: inline-flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #F5F3EF;
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    padding: 0.9rem 1.6rem;
    border-radius: 10px;
    transition: background 0.2s ease;
  }

  .btn-final-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* FOOTER */
  .landing-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: #090B0E;
    padding-top: 4rem;
  }

  .footer-content {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 3rem;
    padding-bottom: 3.5rem;
  }

  .footer-tagline {
    font-size: 0.88rem;
    color: #8A857B;
    line-height: 1.5;
    max-width: 340px;
    margin: 0.75rem 0 0.5rem;
  }

  .footer-locale {
    display: block;
    font-size: 0.76rem;
    color: #C87D55;
    font-weight: 600;
  }

  .footer-links-col {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .footer-links-col strong {
    font-size: 0.85rem;
    color: #F5F3EF;
    margin-bottom: 0.4rem;
  }

  .footer-links-col a {
    color: #8A857B;
    text-decoration: none;
    font-size: 0.85rem;
    transition: color 0.2s ease;
  }

  .footer-links-col a:hover {
    color: #F5F3EF;
  }

  .footer-bottom-bar {
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    padding: 1.5rem 0;
  }

  .bottom-inner {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: #646057;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  /* RESPONSIVE DESIGN */
  @media (max-width: 860px) {
    .nav-anchors {
      display: none;
    }

    .preview-layout {
      grid-template-columns: 1fr;
    }

    .perspective-content-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .footer-content {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  @media (max-width: 480px) {
    .hero-actions-cluster {
      flex-direction: column;
      width: 100%;
    }

    .btn-hero-primary, .btn-hero-secondary {
      width: 100%;
      justify-content: center;
    }

    .hero-metrics-strip {
      flex-direction: column;
      gap: 1rem;
    }

    .metric-divider {
      display: none;
    }

    .perspectives-card {
      padding: 1.5rem;
    }
  }
</style>
