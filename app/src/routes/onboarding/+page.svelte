<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { soundFX, addToast } from '$lib/utils/feedback';

  export let data: any;
  let step = 1;
  let templates = data?.templates || [
    { slug: 'cafe', name: 'Artisan Cafe & Roastery', icon: '☕', category: 'Cafe', description: 'Espresso bar, breakfast plates, pastries & cold brew.' },
    { slug: 'restaurant', name: 'Full-Service Restaurant', icon: '🍽️', category: 'Restaurant', description: 'Course-based dining, steaks, pasta, appetizers & desserts.' },
    { slug: 'bar-and-restaurant', name: 'Bar & Restaurant', icon: '🍺🍽️', category: 'Hybrid', description: 'Wine list, signature cocktails, beers, happy hour & full dining.' },
    { slug: 'juice-and-smoothie-bar', name: 'Juice & Smoothie Bar', icon: '🧃', category: 'Cafe', description: 'Fresh blends, açaí bowls, immunity shots & superfood boosters.' },
    { slug: 'pizzeria', name: 'Pizza Shop & Pizzeria', icon: '🍕', category: 'Restaurant', description: 'Crust builder, specialty pies, calzones & pastas.' },
    { slug: 'bakery-cafe-pastry', name: 'Bakery, Cafe & Pastry', icon: '🥐☕🍰', category: 'Hybrid', description: 'Artisan sourdough, morning pastries, whole cakes & coffee.' },
    { slug: 'food-truck-street-food', name: 'Food Truck & Street Food', icon: '🚚', category: 'Street Food', description: 'Fast service, combo meals, compact takeaway menu.' },
    { slug: 'tea-house-bubble-tea', name: 'Tea House & Boba Bar', icon: '🧋', category: 'Cafe', description: 'Milk tea, cheese foams, toppings builder & sweetness levels.' }
  ];

  let selectedCategory = 'ALL';
  const categories = ['ALL', 'Restaurant', 'Cafe', 'Hybrid', 'Street Food'];

  $: filteredTemplates = selectedCategory === 'ALL'
    ? templates
    : templates.filter((t: any) => t.category === selectedCategory);

  let businessData = {
    name: '',
    slug: '',
    email: '',
    phone: '',
    currency: 'ETB',
    templateSlug: 'restaurant',
    telebirrPhone: '',
    cbeAccountNumber: ''
  };

  function slugify(text: string) {
    businessData.slug = text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  function handleNameChange(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    businessData.name = val;
    slugify(val);
  }

  function selectTemplate(slug: string) {
    soundFX.playTap();
    businessData.templateSlug = slug;
  }

  function nextStep() {
    if (step === 1) {
      if (!businessData.name.trim() || !businessData.slug.trim()) {
        soundFX.playError();
        addToast({ type: 'warning', title: 'Details Incomplete', message: 'Please enter a business name.' });
        return;
      }
    } else if (step === 2) {
      if (!businessData.templateSlug) {
        soundFX.playError();
        addToast({ type: 'warning', title: 'Choose a Template', message: 'Please select a business type layout.' });
        return;
      }
    }
    soundFX.playPop();
    step++;
  }

  function prevStep() {
    soundFX.playTap();
    if (step > 1) step--;
  }

  function finish() {
    soundFX.playSuccess();
    addToast({
      type: 'success',
      title: 'Restaurant Initialized!',
      message: `${businessData.name} is ready on the MenuApp Pro network.`
    });
    setTimeout(() => {
      goto('/admin');
    }, 1200);
  }
</script>

<svelte:head>
  <title>Register Restaurant | Onboarding Wizard</title>
</svelte:head>

<div class="onboarding-root">
  <div class="onboarding-container">
    <!-- Brand Title -->
    <div class="onboarding-brand-header">
      <div class="brand-chip">
        <span class="brand-chip-icon">🍽️</span>
        <span class="brand-chip-title">MenuApp Pro • Business Registration</span>
      </div>
    </div>

    <!-- Stepper Indicator -->
    <div class="wizard-stepper">
      <div class="step-badge-item" class:active={step >= 1}>
        <span class="step-circle">1</span>
        <span class="step-name">Basics</span>
      </div>
      <div class="step-connector" class:active={step >= 2}></div>
      <div class="step-badge-item" class:active={step >= 2}>
        <span class="step-circle">2</span>
        <span class="step-name">Template</span>
      </div>
      <div class="step-connector" class:active={step >= 3}></div>
      <div class="step-badge-item" class:active={step >= 3}>
        <span class="step-circle">3</span>
        <span class="step-name">Payments</span>
      </div>
      <div class="step-connector" class:active={step >= 4}></div>
      <div class="step-badge-item" class:active={step >= 4}>
        <span class="step-circle">4</span>
        <span class="step-name">Launch</span>
      </div>
    </div>

    <!-- Step Card Box -->
    <div class="wizard-sheet">
      <!-- Step 1: Basics -->
      {#if step === 1}
        <div class="step-panel animate-fade-up">
          <div class="panel-header">
            <h1 class="panel-title">Let's setup your establishment</h1>
            <p class="panel-sub">Enter the core details of your restaurant, cafe, or dining lounge.</p>
          </div>

          <div class="form-grid">
            <div class="form-group full-width">
              <label for="biz-name" class="form-label">Establishment Name *</label>
              <input 
                id="biz-name"
                type="text" 
                value={businessData.name} 
                on:input={handleNameChange}
                placeholder="e.g. Gourmet Bistro Addis" 
                class="form-control"
                required
              />
            </div>

            <div class="form-group full-width">
              <label for="biz-slug" class="form-label">Menu URL Slug</label>
              <div class="slug-input-wrapper">
                <span class="slug-domain">menuapp.pro/</span>
                <input 
                  id="biz-slug"
                  type="text" 
                  bind:value={businessData.slug} 
                  placeholder="gourmet-bistro" 
                  class="slug-control font-mono"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="biz-phone" class="form-label">Business Phone Number</label>
              <input 
                id="biz-phone"
                type="tel" 
                bind:value={businessData.phone} 
                placeholder="+251 911 234 567" 
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label for="biz-curr" class="form-label">Primary Currency</label>
              <select id="biz-curr" bind:value={businessData.currency} class="form-control">
                <option value="ETB">Ethiopian Birr (ETB)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
          </div>
        </div>

      <!-- Step 2: Choose Template -->
      {:else if step === 2}
        <div class="step-panel animate-fade-up">
          <div class="panel-header">
            <h1 class="panel-title">Select your business architecture</h1>
            <p class="panel-sub">Choose from our pre-built, industry-specific menu flows and modifier setups.</p>
            
            <div class="template-filter-row">
              {#each categories as cat}
                <button 
                  type="button" 
                  class="cat-chip"
                  class:active={selectedCategory === cat}
                  on:click={() => { soundFX.playTap(); selectedCategory = cat; }}
                >
                  {cat}
                </button>
              {/each}
            </div>
          </div>

          <div class="templates-choice-grid">
            {#each filteredTemplates as tmpl}
              {@const isSelected = businessData.templateSlug === tmpl.slug}
              <button 
                type="button" 
                class="template-choice-card"
                class:selected={isSelected}
                on:click={() => selectTemplate(tmpl.slug)}
              >
                <div class="choice-top-row">
                  <span class="choice-icon">{tmpl.icon}</span>
                  {#if isSelected}
                    <span class="selected-pill">✓ Selected</span>
                  {/if}
                </div>
                <h3 class="choice-name">{tmpl.name}</h3>
                <p class="choice-desc">{tmpl.description || ''}</p>
              </button>
            {/each}
          </div>
        </div>

      <!-- Step 3: Payment Configuration -->
      {:else if step === 3}
        <div class="step-panel animate-fade-up">
          <div class="panel-header">
            <h1 class="panel-title">Configure Ethiopian Banking Hub</h1>
            <p class="panel-sub">Connect telebirr and CBE Birr so customer payments route directly to you with 0% fees.</p>
          </div>

          <div class="payments-setup-stack">
            <!-- telebirr -->
            <div class="payment-setup-card telebirr-card">
              <div class="pay-card-head">
                <div class="pay-logo-badge tele">telebirr</div>
                <span class="pay-sub">Merchant / Personal Wallet</span>
              </div>
              <div class="form-group">
                <label for="tele-num" class="form-label">telebirr Phone / Merchant ID</label>
                <input 
                  id="tele-num"
                  type="text" 
                  bind:value={businessData.telebirrPhone} 
                  placeholder="0911234567" 
                  class="form-control font-mono"
                />
              </div>
            </div>

            <!-- CBE Birr -->
            <div class="payment-setup-card cbe-card">
              <div class="pay-card-head">
                <div class="pay-logo-badge cbe">CBE Birr</div>
                <span class="pay-sub">Commercial Bank of Ethiopia</span>
              </div>
              <div class="form-group">
                <label for="cbe-num" class="form-label">CBE Account Number</label>
                <input 
                  id="cbe-num"
                  type="text" 
                  bind:value={businessData.cbeAccountNumber} 
                  placeholder="1000123456789" 
                  class="form-control font-mono"
                />
              </div>
            </div>
          </div>
        </div>

      <!-- Step 4: Ready to Launch -->
      {:else if step === 4}
        <div class="step-panel launch-panel animate-fade-up">
          <div class="launch-icon-burst">🎉</div>
          <h1 class="launch-title">Your Restaurant is Ready to Serve!</h1>
          <p class="launch-sub">
            We have scaffolded your <strong>{businessData.name}</strong> digital menu with the 
            <strong>{businessData.templateSlug}</strong> architecture.
          </p>

          <div class="launch-summary-card">
            <div class="summary-stat-line">
              <span>Public Digital Menu:</span>
              <strong class="font-mono text-amber">menuapp.pro/{businessData.slug}</strong>
            </div>
            <div class="summary-stat-line">
              <span>Kitchen Display Line:</span>
              <strong>Active & Ready</strong>
            </div>
            <div class="summary-stat-line">
              <span>Payment Gateway:</span>
              <strong>telebirr & CBE Birr Hub</strong>
            </div>
          </div>
        </div>
      {/if}

      <!-- Bottom Nav Buttons -->
      <footer class="wizard-footer">
        {#if step > 1 && step < 4}
          <button type="button" class="btn-tactile btn-secondary btn-nav-back" on:click={prevStep}>
            ← Back
          </button>
        {/if}

        {#if step < 4}
          <button type="button" class="btn-tactile btn-primary btn-nav-next" on:click={nextStep}>
            <span>Continue</span>
            <span>→</span>
          </button>
        {:else}
          <button type="button" class="btn-tactile btn-primary btn-nav-finish" on:click={finish}>
            <span>Enter Restaurant Admin Dashboard</span>
            <span>🚀</span>
          </button>
        {/if}
      </footer>
    </div>
  </div>
</div>

<style>
  .onboarding-root {
    min-height: 100vh;
    background: var(--bg-dark);
    color: var(--text-primary);
    padding: 3rem 1.5rem 5rem 1.5rem;
    display: flex;
    justify-content: center;
  }

  .onboarding-container {
    width: 100%;
    max-width: 780px;
  }

  .onboarding-brand-header {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .brand-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .brand-chip-title {
    color: #FFFFFF;
  }

  /* Wizard Stepper */
  .wizard-stepper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2.5rem;
    padding: 0 1rem;
  }

  .step-badge-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--text-tertiary);
    font-weight: 600;
    font-size: 0.88rem;
  }

  .step-badge-item.active {
    color: #FFFFFF;
  }

  .step-circle {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    transition: all 150ms ease;
  }

  .step-badge-item.active .step-circle {
    background: var(--amber-500);
    border-color: var(--amber-400);
    color: #090A0F;
    font-weight: 800;
    box-shadow: 0 0 15px var(--amber-glow);
  }

  .step-connector {
    flex: 1;
    height: 2px;
    background: var(--border);
    margin: 0 1rem;
  }

  .step-connector.active {
    background: var(--amber-500);
  }

  /* Wizard Sheet */
  .wizard-sheet {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 2.5rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  }

  .panel-header {
    margin-bottom: 2rem;
  }

  .panel-title {
    font-family: var(--font-serif);
    font-size: 2rem;
    color: #FFFFFF;
    margin-bottom: 0.4rem;
  }

  .panel-sub {
    font-size: 0.95rem;
    color: var(--text-secondary);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }

  .full-width {
    grid-column: span 2;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .form-control {
    width: 100%;
    padding: 0.85rem 1rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 140ms ease;
  }

  .form-control:focus {
    border-color: var(--amber-500);
  }

  .slug-input-wrapper {
    display: flex;
    align-items: center;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0 1rem;
  }

  .slug-domain {
    font-size: 0.9rem;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }

  .slug-control {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--amber-400);
    padding: 0.85rem 0.5rem;
    font-size: 0.95rem;
    outline: none;
  }

  /* Template Selector */
  .template-filter-row {
    display: flex;
    gap: 0.4rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .cat-chip {
    padding: 0.35rem 0.85rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .cat-chip.active {
    background: var(--amber-500);
    border-color: var(--amber-500);
    color: #090A0F;
    font-weight: 700;
  }

  .templates-choice-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .template-choice-card {
    background: var(--surface-elevated);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    text-align: left;
    cursor: pointer;
    transition: all 140ms ease;
    display: flex;
    flex-direction: column;
  }

  .template-choice-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .template-choice-card.selected {
    border-color: var(--amber-500);
    background: rgba(245, 158, 11, 0.08);
  }

  .choice-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .choice-icon {
    font-size: 1.8rem;
  }

  .selected-pill {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--amber-400);
  }

  .choice-name {
    font-size: 1rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 0.35rem 0;
  }

  .choice-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.4;
    margin: 0;
  }

  /* Payments */
  .payments-setup-stack {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .payment-setup-card {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }

  .telebirr-card {
    border-color: rgba(0, 91, 187, 0.3);
  }

  .cbe-card {
    border-color: rgba(107, 33, 168, 0.3);
  }

  .pay-card-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .pay-logo-badge {
    padding: 0.3rem 0.75rem;
    border-radius: var(--radius-sm);
    font-weight: 800;
    font-size: 0.85rem;
    color: #FFFFFF;
  }

  .pay-logo-badge.tele { background: #005BBB; }
  .pay-logo-badge.cbe { background: #6B21A8; }

  .pay-sub {
    font-size: 0.82rem;
    color: var(--text-tertiary);
  }

  /* Launch */
  .launch-panel {
    text-align: center;
    padding: 1.5rem 0;
  }

  .launch-icon-burst {
    font-size: 3.5rem;
    margin-bottom: 1rem;
  }

  .launch-title {
    font-family: var(--font-serif);
    font-size: 2.2rem;
    color: #FFFFFF;
    margin-bottom: 0.5rem;
  }

  .launch-sub {
    font-size: 1rem;
    color: var(--text-secondary);
    max-width: 480px;
    margin: 0 auto 2rem auto;
    line-height: 1.5;
  }

  .launch-summary-card {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    text-align: left;
  }

  .summary-stat-line {
    display: flex;
    justify-content: space-between;
    font-size: 0.92rem;
    color: var(--text-secondary);
  }

  .summary-stat-line strong {
    color: #FFFFFF;
  }

  .text-amber {
    color: var(--amber-400);
  }

  /* Footer */
  .wizard-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
  }

  .btn-nav-next, .btn-nav-finish {
    padding: 0.85rem 1.75rem;
    font-size: 1rem;
    gap: 0.5rem;
  }

  .btn-nav-back {
    margin-right: auto;
  }

  @media (max-width: 640px) {
    .wizard-sheet {
      padding: 1.5rem;
    }
    .form-grid {
      grid-template-columns: 1fr;
    }
    .full-width {
      grid-column: span 1;
    }
    .templates-choice-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
