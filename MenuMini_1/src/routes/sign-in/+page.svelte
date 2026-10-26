<script lang="ts">
  import { goto } from '$app/navigation';
  import { BUSINESS_TYPES } from '$lib/onboarding/registration';

  export let data: { authenticated: boolean; venueId?: string };

  let isRegistering = false;
  let email = '';
  let password = '';
  let displayName = '';
  let businessName = '';
  let businessTypeId = BUSINESS_TYPES[0]?.id || 'cafe-and-restaurant';
  let phone = '';

  let busy = false;
  let errorMessage = '';

  if (data.authenticated && data.venueId) {
    goto(`/admin/menu/${data.venueId}`);
  }

  async function handleSubmit() {
    busy = true;
    errorMessage = '';

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegistering
      ? { email, password, displayName: displayName || businessName, businessName, businessTypeId, phone }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        errorMessage = result.error || 'Authentication failed. Please check your credentials.';
      } else if (result.session?.venueId) {
        window.location.href = `/admin/menu/${result.session.venueId}`;
      } else {
        window.location.href = '/admin/menu';
      }
    } catch {
      errorMessage = 'Could not reach server. Please check your network connection.';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>{isRegistering ? 'Create Business Account' : 'Sign In'} | MenuMini</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="auth-wrapper">
  <div class="auth-card">
    <a href="/" class="back-link">← Return to MenuMini</a>

    <header class="auth-header">
      <span class="auth-kicker">{isRegistering ? 'New Business' : 'Merchant Access'}</span>
      <h1>{isRegistering ? 'Set up your menu' : 'Welcome back'}</h1>
      <p class="subtitle">
        {isRegistering
          ? 'Create your business account to start drafting and publishing your digital menu.'
          : 'Sign in with your email and password to manage your menu drafts and publications.'}
      </p>
    </header>

    {#if errorMessage}
      <div class="error-banner" role="alert">
        <span>⚠️</span>
        <p>{errorMessage}</p>
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="auth-form">
      {#if isRegistering}
        <div class="form-group">
          <label for="businessName">Business Name (as on trade license)</label>
          <input
            id="businessName"
            type="text"
            bind:value={businessName}
            required
            placeholder="e.g. Tomoca Coffee, Bole Bistro"
            maxlength="160"
          />
        </div>

        <div class="form-group">
          <label for="businessTypeId">Business Type</label>
          <select id="businessTypeId" bind:value={businessTypeId}>
            {#each BUSINESS_TYPES as type}
              <option value={type.id}>{type.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="displayName">Your Full Name</label>
          <input
            id="displayName"
            type="text"
            bind:value={displayName}
            required
            placeholder="e.g. Abebe Bikila"
            maxlength="120"
          />
        </div>

        <div class="form-group">
          <label for="phone">Phone Number (optional)</label>
          <input
            id="phone"
            type="tel"
            bind:value={phone}
            placeholder="09XXXXXXXX or +251..."
            maxlength="32"
          />
        </div>
      {/if}

      <div class="form-group">
        <label for="email">Email Address</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          autocomplete="email"
          placeholder="owner@yourcafe.com"
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          minlength="6"
          autocomplete={isRegistering ? 'new-password' : 'current-password'}
          placeholder="Minimum 6 characters"
        />
      </div>

      <button type="submit" class="btn-submit" disabled={busy}>
        {#if busy}
          <span>Processing...</span>
        {:else}
          <span>{isRegistering ? 'Create Account & Open Studio →' : 'Sign In to Studio →'}</span>
        {/if}
      </button>
    </form>

    <footer class="auth-footer">
      {#if isRegistering}
        <p>Already have an account? <button type="button" class="btn-link" on:click={() => { isRegistering = false; errorMessage = ''; }}>Sign in here</button></p>
      {:else}
        <p>Don't have an account yet? <button type="button" class="btn-link" on:click={() => { isRegistering = true; errorMessage = ''; }}>Create a new business</button></p>
      {/if}
    </footer>
  </div>
</main>

<style>
  .auth-wrapper {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    background-color: var(--bg-dark, #0c0e14);
    color: var(--text-primary, #f1f3f7);
    font-family: var(--font-sans, system-ui, sans-serif);
  }

  .auth-card {
    width: 100%;
    max-width: 480px;
    background: var(--surface-dark, #161922);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: 16px;
    padding: 2.25rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }

  .back-link {
    display: inline-block;
    color: var(--text-secondary, #94a3b8);
    font-size: 0.85rem;
    text-decoration: none;
    margin-bottom: 1.5rem;
    transition: color 0.15s;
  }
  .back-link:hover {
    color: var(--text-primary, #ffffff);
  }

  .auth-header {
    margin-bottom: 1.75rem;
  }

  .auth-kicker {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #d97706; /* Warm subtle amber/terracotta */
  }

  h1 {
    font-family: var(--font-serif, Georgia, serif);
    font-size: 1.85rem;
    font-weight: 600;
    margin: 0.35rem 0 0.5rem;
    color: #ffffff;
  }

  .subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary, #94a3b8);
    line-height: 1.5;
    margin: 0;
  }

  .error-banner {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    padding: 0.85rem 1rem;
    margin-bottom: 1.5rem;
    color: #fca5a5;
    font-size: 0.88rem;
  }
  .error-banner p {
    margin: 0;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary, #cbd5e1);
  }

  input, select {
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem 0.9rem;
    font: inherit;
    font-size: 0.95rem;
    color: #ffffff;
    background: var(--surface-elevated, #202430);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
    border-radius: 8px;
    min-height: 44px;
    transition: border-color 0.15s, outline 0.15s;
  }

  input:focus, select:focus {
    outline: 2px solid rgba(217, 119, 6, 0.4);
    border-color: #d97706;
  }

  .btn-submit {
    margin-top: 0.75rem;
    padding: 0.85rem 1.25rem;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    color: #ffffff;
    background: #b45309; /* Warm copper amber */
    border: 1px solid #d97706;
    border-radius: 8px;
    cursor: pointer;
    min-height: 46px;
    transition: background 0.15s, transform 0.05s;
  }

  .btn-submit:hover:enabled {
    background: #92400e;
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .auth-footer {
    margin-top: 1.75rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    font-size: 0.85rem;
    color: var(--text-secondary, #94a3b8);
    text-align: center;
  }

  .auth-footer p {
    margin: 0;
  }

  .btn-link {
    background: none;
    border: none;
    color: #d97706;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
  }
  .btn-link:hover {
    color: #f59e0b;
  }
</style>
