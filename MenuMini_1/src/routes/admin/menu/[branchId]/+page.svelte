<script lang="ts">
  import type { PageData } from './$types';
  import MenuStudio from '$lib/studio/MenuStudio.svelte';
  export let data: PageData;
</script>

<svelte:head>
  <title>{data.studio ? 'Menu Studio | MenuMini' : 'Business menu access | MenuMini'}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

{#if data.studio}
  {#key data.studio.branchId}<MenuStudio connected={data.studio} />{/key}
{:else}
  <section class="card access-message">
    <h1>{data.access === 'IDENTITY_REQUIRED' ? 'Verified business access is required' : 'Menu workspace unavailable'}</h1>
    <p>{data.loadError || 'Real sign-in and OTP verification remain deferred. A branch link cannot grant access to saved business drafts.'}</p>
    <a class="btn-tactile btn-primary" href="/admin/menu">Continue menu preparation</a>
  </section>
{/if}

<style>
  .access-message { padding:1.5rem; max-width:720px; }
  h1 { font-family:var(--font-serif); font-size:1.5rem; }
  p { margin:1rem 0; color:var(--text-secondary); line-height:1.6; }
  a { min-height:44px; }
  a:focus-visible { outline:2px solid var(--amber-500); outline-offset:3px; }
</style>
