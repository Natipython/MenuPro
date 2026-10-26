<script lang="ts">
  import { soundFX, addToast } from '$lib/utils/feedback';

  export let data: any;
  const { business, branch } = data || {};

  const biz = business || {
    name: 'Gourmet Bistro & Cafe',
    description: 'An artisanal dining experience blending local Ethiopian flavors with contemporary culinary mastery. Serving freshly roasted single-origin coffees, organic breakfasts, and evening specialties.',
    contactPhone: '+251 911 234 567',
    contactEmail: 'hello@gourmetbistro.com',
    website: 'https://menuapp.pro',
    slug: 'demo-restaurant'
  };

  const br = branch || {
    name: 'Bole Medhanealem Branch',
    address: 'Cameroon St, Next to Edna Mall, Addis Ababa',
    slug: 'main-branch',
    wifiNetwork: 'GourmetBistro_Guest',
    wifiPassword: 'eatgoodfood2026',
    operatingHours: [
      { day: 'Monday', hours: '07:30 AM – 11:00 PM' },
      { day: 'Tuesday', hours: '07:30 AM – 11:00 PM' },
      { day: 'Wednesday', hours: '07:30 AM – 11:00 PM' },
      { day: 'Thursday', hours: '07:30 AM – 11:00 PM' },
      { day: 'Friday', hours: '07:30 AM – 12:00 AM' },
      { day: 'Saturday', hours: '08:00 AM – 12:00 AM' },
      { day: 'Sunday', hours: '08:00 AM – 10:30 PM' }
    ],
    features: [
      '⚡ High-Speed Guest WiFi',
      '🌱 Vegan & Vegetarian Options',
      '🥩 100% Halal Certified',
      '💳 telebirr & CBE Birr Accepted',
      '🌿 Outdoor Garden Terrace',
      '🅿️ Valet Parking Available'
    ]
  };

  let copiedWifi = false;

  function copyWifiPass() {
    soundFX.playTap();
    navigator.clipboard.writeText(br.wifiPassword || 'eatgoodfood2026');
    copiedWifi = true;
    addToast({
      type: 'success',
      title: 'WiFi Password Copied',
      message: 'Paste in your network settings to connect.'
    });
    setTimeout(() => { copiedWifi = false; }, 2000);
  }
</script>

<svelte:head>
  <title>About {biz.name} | {br.name}</title>
</svelte:head>

<div class="info-layout">
  <div class="info-container">
    <!-- Header -->
    <header class="info-header">
      <a href="/{biz.slug}/{br.slug}" class="back-link">
        <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Menu</span>
      </a>
      <h1 class="info-title">About Our Venue</h1>
    </header>

    <!-- Main Content Cards -->
    <main class="info-cards-stack">
      <!-- 1. Hero Brand Card -->
      <section class="card brand-hero-card">
        <div class="open-status-badge">
          <span class="pulse-dot"></span>
          <span>Open Now • Closes at 11:00 PM</span>
        </div>
        <h2 class="branch-name">{br.name}</h2>
        <p class="business-desc">{biz.description}</p>

        <!-- Quick Action Buttons -->
        <div class="quick-actions-row">
          <a href="tel:{biz.contactPhone}" class="btn-tactile btn-secondary action-pill" on:click={() => soundFX.playTap()}>
            <span>📞 Call Desk</span>
          </a>
          <a href="mailto:{biz.contactEmail}" class="btn-tactile btn-secondary action-pill" on:click={() => soundFX.playTap()}>
            <span>✉️ Email</span>
          </a>
          <button type="button" class="btn-tactile btn-secondary action-pill" on:click={copyWifiPass}>
            <span>📶 {copiedWifi ? '✓ Password Copied' : 'WiFi Pass'}</span>
          </button>
        </div>
      </section>

      <!-- 2. Location & Contact -->
      <section class="card">
        <h3 class="card-title">📍 Location & Contact</h3>
        <p class="address-text">{br.address}</p>

        <div class="map-placeholder-box">
          <div class="map-grid-pattern"></div>
          <div class="map-pin-pulse">
            <span class="pin-emoji">📍</span>
          </div>
          <span class="map-label">Addis Ababa, Ethiopia</span>
        </div>
      </section>

      <!-- 3. Guest WiFi Quick Connect Card -->
      <section class="card wifi-card">
        <div class="wifi-content">
          <div class="wifi-info">
            <h3 class="wifi-title">Free Guest WiFi</h3>
            <p class="wifi-sub">Network: <strong>{br.wifiNetwork || 'GourmetBistro_Guest'}</strong></p>
          </div>
          <button type="button" class="btn-tactile btn-primary btn-copy-wifi" on:click={copyWifiPass}>
            {copiedWifi ? '✓ Copied!' : 'Copy Password'}
          </button>
        </div>
      </section>

      <!-- 4. Operating Hours Schedule -->
      <section class="card">
        <h3 class="card-title">⏰ Kitchen & Dining Hours</h3>
        <div class="hours-schedule">
          {#each br.operatingHours as item}
            <div class="hours-row">
              <span class="day-name">{item.day}</span>
              <span class="hours-val font-mono">{item.hours}</span>
            </div>
          {/each}
        </div>
      </section>

      <!-- 5. Amenities & Hospitality Badges -->
      <section class="card">
        <h3 class="card-title">✨ Dining Amenities</h3>
        <div class="amenities-grid">
          {#each br.features as feature}
            <div class="amenity-chip">{feature}</div>
          {/each}
        </div>
      </section>
    </main>
  </div>
</div>

<style>
  .info-layout {
    min-height: 100vh;
    background: var(--bg-dark);
    padding: 1.5rem 1rem 4rem 1rem;
    color: var(--text-primary);
  }

  .info-container {
    max-width: 580px;
    margin: 0 auto;
  }

  .info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .back-icon {
    width: 18px;
    height: 18px;
  }

  .info-title {
    font-family: var(--font-serif);
    font-size: 1.35rem;
    color: #FFFFFF;
    margin: 0;
  }

  .info-cards-stack {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .card {
    background: var(--surface-dark);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }

  .card-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  /* Brand Hero Card */
  .brand-hero-card {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(18, 20, 29, 1) 100%);
  }

  .open-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: var(--radius-full);
    color: var(--color-success);
    font-size: 0.78rem;
    font-weight: 700;
    margin-bottom: 0.85rem;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--color-success);
    box-shadow: 0 0 10px var(--color-success);
  }

  .branch-name {
    font-family: var(--font-serif);
    font-size: 1.6rem;
    color: #FFFFFF;
    margin: 0 0 0.5rem 0;
  }

  .business-desc {
    font-size: 0.92rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 1.25rem;
  }

  .quick-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .action-pill {
    padding: 0.5rem 0.95rem;
    font-size: 0.82rem;
  }

  /* Location */
  .address-text {
    font-size: 0.95rem;
    color: var(--text-primary);
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .map-placeholder-box {
    width: 100%;
    height: 140px;
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .pin-emoji {
    font-size: 2rem;
  }

  .map-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-tertiary);
  }

  /* WiFi */
  .wifi-card {
    background: linear-gradient(135deg, rgba(0, 91, 187, 0.12) 0%, rgba(18, 20, 29, 1) 100%);
    border-color: rgba(0, 91, 187, 0.3);
  }

  .wifi-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .wifi-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 0.2rem 0;
  }

  .wifi-sub {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .btn-copy-wifi {
    font-size: 0.85rem;
    padding: 0.65rem 1.1rem;
  }

  /* Schedule */
  .hours-schedule {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .hours-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.88rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
  }

  .hours-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .day-name {
    color: var(--text-secondary);
    font-weight: 600;
  }

  .hours-val {
    color: #FFFFFF;
  }

  /* Amenities */
  .amenities-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .amenity-chip {
    padding: 0.45rem 0.8rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: 0.82rem;
    color: var(--text-secondary);
  }
</style>
