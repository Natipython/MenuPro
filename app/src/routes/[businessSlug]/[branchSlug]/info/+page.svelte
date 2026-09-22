<script lang="ts">
  export let data;
  const { business, branch } = data;
</script>

<svelte:head>
  <title>About {business.name} | {branch.name}</title>
</svelte:head>

<div class="info-container">
  <header class="info-header">
    <a href={`/${business.slug}/${branch.slug}`} class="back-link">← Back to Menu</a>
    <h1>About {business.name}</h1>
  </header>

  <main class="info-content">
    <section class="card">
      <h2>{branch.name}</h2>
      <p class="description">{business.description}</p>
      
      <div class="contact-info">
        <p><strong>📍 Address:</strong> {branch.address}</p>
        <p><strong>📞 Phone:</strong> <a href={`tel:${business.contactPhone}`}>{business.contactPhone}</a></p>
        <p><strong>✉️ Email:</strong> <a href={`mailto:${business.contactEmail}`}>{business.contactEmail}</a></p>
        <p><strong>🌐 Website:</strong> <a href={business.website} target="_blank" rel="noreferrer">{business.website}</a></p>
      </div>
    </section>

    <section class="card">
      <h2>Operating Hours</h2>
      <ul class="hours-list">
        {#each branch.operatingHours as {day, hours}}
          <li>
            <span class="day">{day}</span>
            <span class="hours">{hours}</span>
          </li>
        {/each}
      </ul>
    </section>

    <section class="card">
      <h2>Amenities & Services</h2>
      <div class="features-grid">
        {#each branch.features as feature}
          <div class="feature-badge">{feature}</div>
        {/each}
      </div>
    </section>
  </main>
</div>

<style>
  .info-container {
    padding-bottom: 2rem;
  }

  .info-header {
    background: white;
    padding: 1.5rem 1rem 1rem;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .back-link {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
    display: inline-block;
    margin-bottom: 1rem;
  }

  .info-header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .info-content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card {
    background: white;
    padding: 1.5rem;
    border-radius: var(--radius-md);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .card h2 {
    font-size: 1.25rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  .description {
    color: var(--text-muted);
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .contact-info p {
    margin: 0.5rem 0;
    color: var(--text-main);
  }

  .contact-info a {
    color: var(--primary);
    text-decoration: none;
  }

  .hours-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .hours-list li {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px dashed var(--border);
  }

  .hours-list li:last-child {
    border-bottom: none;
  }

  .day {
    font-weight: 500;
  }

  .hours {
    color: var(--text-muted);
  }

  .features-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .feature-badge {
    background: var(--surface);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    color: var(--text-muted);
  }
</style>
