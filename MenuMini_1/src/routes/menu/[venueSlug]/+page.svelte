<script lang="ts">
  import type { PageData } from './$types';
  import MenuCatalog from '$lib/menu/MenuCatalog.svelte';
  import DishDetails from '$lib/menu/DishDetails.svelte';
  import { publishedCatalogView, type MenuDishView } from '$lib/menu/catalog-view';
  import { MINI_MENU_TEMPLATES } from '$lib/types/miniTemplates';
  import { DAYS } from '$lib/onboarding/setup';
  export let data: PageData;
  let copied = false;
  let copyFailed = false;
  let selectedDish: MenuDishView | null = null;
  $: menu = data.menu;
  $: catalog = menu ? publishedCatalogView(menu) : null;
  $: if (selectedDish && !catalog?.dishes.includes(selectedDish)) selectedDish = null;
  async function copyLink() {
    try { await navigator.clipboard.writeText(data.shareUrl); copied = true; copyFailed = false; }
    catch { copyFailed = true; }
  }
</script>

<svelte:head><title>{menu?.venueName || 'Menu unavailable'} | MenuMini</title><meta name="robots" content="noindex" /></svelte:head>

{#if menu && catalog}
  <MenuCatalog {catalog} onDetails={(dish) => selectedDish = dish}>
    {#if selectedDish}<DishDetails dish={selectedDish} onClose={() => selectedDish = null} />{/if}
    <aside class="branch-details" aria-label="Branch information">
      <h2>About this branch</h2>
      <p class="location">{[menu.branch.city, menu.branch.area].filter(Boolean).join(' · ')}</p>
      {#if menu.branch.landmark}<p class="location">{menu.branch.landmark}</p>{/if}
      {#if menu.branch.publicPhone}<p class="contact">Customer contact: {menu.branch.publicPhone}</p>{/if}
      <details class="hours"><summary>Opening hours · Addis Ababa time</summary>
        <dl>{#each [...menu.branch.hours].sort((a,b) => a.day-b.day) as hours}
          <dt>{DAYS[hours.day]}</dt><dd>{hours.status === 'OPEN' ? `${hours.opens}–${hours.closes}${hours.overnight ? ' (next day)' : ''}` : hours.status === 'CLOSED' ? 'Closed' : 'Hours not provided'}</dd>
        {/each}</dl>
      </details>
      <details class="share"><summary>Share this menu / QR</summary>
        <p>This QR opens this branch’s menu.</p>
        <img src={data.qr} width="240" height="240" alt="QR code for this branch menu" />
        <a href={data.shareUrl} class="menu-link">{data.shareUrl}</a>
        <button type="button" on:click={copyLink}>{copied ? 'Link copied' : 'Copy menu link'}</button>
        {#if copied}<p role="status">Menu link copied.</p>{/if}
        {#if copyFailed}<p role="status">Copy the link shown above.</p>{/if}
      </details>
      <footer>MenuMini</footer>
    </aside>
  </MenuCatalog>
{:else}
  <main class="missing" style:background={MINI_MENU_TEMPLATES[0].theme.bg} style:color={MINI_MENU_TEMPLATES[0].theme.text}>
    <p>MenuMini</p><h1>Menu unavailable</h1>
    <p>{data.serviceUnavailable ? 'The menu service is temporarily unavailable. Try again shortly.' : 'This link has no available menu. Ask the business for its current menu.'}</p>
    <button type="button" on:click={() => window.location.reload()}>Try again</button>
  </main>
{/if}

<style>
  .branch-details { max-width:768px; padding:0 1rem; margin:0 auto; font-size:.85rem; line-height:1.6; overflow-wrap:anywhere; }
  h2 { font-size:1rem; margin-bottom:.75rem; } .location,.contact { color:#94A3B8; }
  details { border-top:1px solid rgba(255,255,255,.12); padding:.75rem 0; margin-top:1rem; }
  summary { cursor:pointer; min-height:44px; display:flex; align-items:center; gap:.5rem; }
  summary::before { content:'▸'; color:var(--color-primary); } details[open]>summary::before { content:'▾'; }
  dl { display:grid; grid-template-columns:1fr 1.5fr; gap:10px; margin:1rem 0; color:#CBD5E1; }
  .share img { display:block; margin:1rem 0; border-radius:9px; max-width:100%; height:auto; }
  .menu-link { color:inherit; display:block; margin-bottom:1rem; }
  button { min-height:44px; padding:.65rem 1rem; font:inherit; border:1px solid rgba(255,255,255,.2); border-radius:8px; background:var(--bg-surface,#1A1D27); color:inherit; cursor:pointer; }
  button:focus-visible,summary:focus-visible,a:focus-visible { outline:2px solid currentColor; outline-offset:3px; }
  footer { font-size:.7rem; color:#94A3B8; margin-top:1.5rem; text-align:center; }
  .missing { min-height:100vh; padding:6rem max(1rem,calc((100vw - 680px)/2)); font-family:'Plus Jakarta Sans',sans-serif; line-height:1.6; }
  .missing h1 { font-size:1.7rem; margin:.75rem 0; } .missing p { margin-bottom:1rem; }
</style>
