<script lang="ts">
  import { onMount } from 'svelte';
  import MenuCatalog from '$lib/menu/MenuCatalog.svelte';
  import DishDetails from '$lib/menu/DishDetails.svelte';
  import { draftCatalogView, type MenuDishView } from '$lib/menu/catalog-view';
  import type { Catalog, Profile } from '$lib/workspace/model';
  export let profile: Profile;
  export let content: Catalog;
  export let onClose: () => void;
  let dialog: HTMLDialogElement;
  let selected: MenuDishView | null = null;
  $: catalog = draftCatalogView(profile, content);
  onMount(() => {
    const opener = document.activeElement; dialog.showModal();
    return () => { if (dialog.open) dialog.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true }); };
  });
</script>
<dialog bind:this={dialog} aria-label="Customer menu draft preview" on:cancel|preventDefault={() => { if (!selected) onClose(); }}>
  <div class="preview-bar"><strong>Draft preview · Not published</strong><button type="button" on:click={onClose}>Close preview</button></div>
  <MenuCatalog {catalog} onDetails={(dish) => selected = dish}>
    {#if selected}<DishDetails dish={selected} onClose={() => selected = null} />{/if}
  </MenuCatalog>
</dialog>
<style>
  dialog { width:calc(100% - 2rem); max-width:960px; max-height:92dvh; margin:auto; padding:0; color:var(--text-primary); background:var(--bg-dark); border:1px solid var(--border); border-radius:16px; }
  dialog::backdrop { background:rgba(0,0,0,.75); }
  .preview-bar { display:flex; gap:1rem; justify-content:space-between; align-items:center; flex-wrap:wrap; padding:.75rem 1rem; background:var(--surface-dark); font-size:.85rem; }
  button { min-height:44px; padding:.5rem .75rem; border:1px solid var(--border); border-radius:8px; background:var(--surface-elevated); color:inherit; font:inherit; cursor:pointer; }
  button:focus-visible { outline:2px solid var(--amber-500); outline-offset:3px; }
</style>
