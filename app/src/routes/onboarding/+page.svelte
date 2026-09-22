<script lang="ts">
  export let data;
  let step = 1;
  let templates = data.templates || [];
  
  let businessData = {
    name: '',
    slug: '',
    email: '',
    phone: '',
    templateSlug: ''
  };

  function nextStep() {
    if (step === 1 && (!businessData.name || !businessData.slug)) return alert('Fill required fields');
    if (step === 2 && !businessData.templateSlug) return alert('Select a template');
    step++;
  }

  function finish() {
    alert(`Business created successfully using ${businessData.templateSlug} template! Redirecting to dashboard...`);
    // In real app, POST to API -> create DB records -> goto('/admin')
  }

  function slugify(text: string) {
    businessData.slug = text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }
</script>

<svelte:head>
  <title>Onboarding | MenuApp Pro</title>
</svelte:head>

<div class="onboarding-layout">
  <div class="wizard-container">
    
    <div class="progress-indicator">
      <div class="step" class:active={step >= 1}>1. Details</div>
      <div class="line" class:active={step >= 2}></div>
      <div class="step" class:active={step >= 2}>2. Business Type</div>
      <div class="line" class:active={step >= 3}></div>
      <div class="step" class:active={step >= 3}>3. Done</div>
    </div>

    {#if step === 1}
      <div class="step-content">
        <h1>Let's set up your business</h1>
        <p>Enter the core details of your restaurant or shop.</p>

        <div class="form-group">
          <label>Business Name *</label>
          <input type="text" bind:value={businessData.name} on:input={(e) => slugify(e.target.value)} placeholder="e.g. The Golden Pastry" />
        </div>

        <div class="form-group">
          <label>Custom URL Slug *</label>
          <div class="input-prefix">
            <span class="prefix">menu.app/</span>
            <input type="text" bind:value={businessData.slug} placeholder="the-golden-pastry" />
          </div>
        </div>

        <div class="form-group">
          <label>Contact Email</label>
          <input type="email" bind:value={businessData.email} placeholder="owner@example.com" />
        </div>

        <button class="primary-btn mt-4" on:click={nextStep}>Next: Choose Template →</button>
      </div>
    {/if}

    {#if step === 2}
      <div class="step-content wide">
        <h1>What kind of business is it?</h1>
        <p>This will automatically configure your menu layout, required sections, and item options (e.g. meat doneness, milk types).</p>

        <div class="template-grid">
          {#each templates as template}
            <div 
              class="template-card" 
              class:selected={businessData.templateSlug === template.slug}
              on:click={() => businessData.templateSlug = template.slug}
            >
              <div class="icon">{template.icon}</div>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
            </div>
          {/each}
        </div>

        <div class="actions mt-4">
          <button class="text-btn" on:click={() => step--}>← Back</button>
          <button class="primary-btn" on:click={nextStep}>Review & Create →</button>
        </div>
      </div>
    {/if}

    {#if step === 3}
      <div class="step-content text-center">
        <div class="success-icon">🎉</div>
        <h1>Ready to go!</h1>
        <p>We've prepared your dashboard using the <strong>{templates.find(t => t.slug === businessData.templateSlug)?.name}</strong> engine.</p>
        
        <div class="summary-box">
          <p><strong>Name:</strong> {businessData.name}</p>
          <p><strong>URL:</strong> menu.app/{businessData.slug}</p>
        </div>

        <button class="primary-btn mt-4" on:click={finish}>Go to Admin Dashboard</button>
      </div>
    {/if}

  </div>
</div>

<style>
  :global(body) { background: #f3f4f6; margin: 0; font-family: system-ui; }
  .onboarding-layout { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
  
  .wizard-container {
    background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 100%; max-width: 600px; padding: 3rem;
  }
  .wizard-container:has(.wide) { max-width: 900px; }

  .progress-indicator { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3rem; }
  .step { font-weight: 600; color: #9ca3af; }
  .step.active { color: #3b82f6; }
  .line { flex: 1; height: 2px; background: #e5e7eb; margin: 0 1rem; }
  .line.active { background: #3b82f6; }

  .step-content h1 { margin: 0 0 0.5rem 0; color: #111827; }
  .step-content p { color: #6b7280; margin-bottom: 2rem; }
  .text-center { text-align: center; }

  .form-group { margin-bottom: 1.5rem; }
  .form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; color: #374151; }
  input[type="text"], input[type="email"] { width: 100%; padding: 0.75rem 1rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; }
  
  .input-prefix { display: flex; align-items: center; }
  .prefix { background: #f3f4f6; padding: 0.75rem 1rem; border: 1px solid #d1d5db; border-right: none; border-radius: 6px 0 0 6px; color: #6b7280; }
  .input-prefix input { border-radius: 0 6px 6px 0; }

  .template-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; max-height: 50vh; overflow-y: auto; padding-right: 1rem; }
  .template-card { border: 2px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s; }
  .template-card:hover { border-color: #9ca3af; }
  .template-card.selected { border-color: #3b82f6; background: #eff6ff; }
  .template-card .icon { font-size: 2.5rem; margin-bottom: 1rem; }
  .template-card h3 { margin: 0 0 0.5rem 0; font-size: 1.1rem; }
  .template-card p { margin: 0; font-size: 0.875rem; color: #6b7280; line-height: 1.4; }

  .success-icon { font-size: 5rem; margin-bottom: 1rem; }
  .summary-box { background: #f9fafb; padding: 1.5rem; border-radius: 8px; text-align: left; margin: 2rem auto; max-width: 300px; }
  .summary-box p { margin: 0.5rem 0; color: #111827; }

  .mt-4 { margin-top: 2rem; }
  .actions { display: flex; justify-content: space-between; align-items: center; }
  
  .primary-btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; width: 100%; transition: background 0.2s; }
  .primary-btn:hover { background: #2563eb; }
  .actions .primary-btn { width: auto; }
  .text-btn { background: none; border: none; color: #6b7280; font-weight: 500; cursor: pointer; padding: 0.75rem 1rem; }
</style>
