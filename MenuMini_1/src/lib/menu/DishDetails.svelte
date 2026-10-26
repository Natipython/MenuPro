<script lang="ts">
  import { onMount } from 'svelte';
  import type { MenuDishView } from './catalog-view';
  export let dish: MenuDishView;
  export let onClose: () => void;
  let dialog: HTMLDialogElement;
  onMount(() => {
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      // Release native modal inertness before returning focus to the opener.
      if (dialog.open) dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  });
</script>

<dialog bind:this={dialog} class="modal-card" aria-labelledby="dish-detail-title" on:cancel|preventDefault={onClose} on:click={(event) => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) onClose();
}}>
  <div class="modal-header">
    <h2 id="dish-detail-title">{dish.name}</h2>
    <button type="button" class="modal-close" aria-label="Close item details" on:click={onClose}>✕</button>
  </div>
  <div class="modal-body">
    {#if dish.nameAm}<p class="modal-amharic" lang="am">{dish.nameAm}</p>{/if}
    {#if dish.description}<p class="modal-desc">{dish.description}</p>{/if}
    {#if dish.descriptionAm}<p class="modal-desc" lang="am">{dish.descriptionAm}</p>{/if}
    <div class="modal-price-box">{dish.modifiers.length ? 'Base price' : 'Price'}: <strong>{dish.price} {dish.currency}</strong></div>
    {#if !dish.available}<p class="availability">Currently unavailable</p>{/if}
    {#if dish.modifiers.length}
      <section class="options" aria-label="Options and prices">
        <h3>Options & prices</h3>
        {#each dish.modifiers as group (group.id)}
          <div class="option-group">
            <h4>{group.label}</h4>
            <p>{group.minSelections === group.maxSelections ? `Choose ${group.minSelections}` : group.minSelections ? `Choose ${group.minSelections}–${group.maxSelections}` : `Optional · up to ${group.maxSelections}`}</p>
            <ul>{#each group.choices as choice (choice.id)}
              <li><span>{choice.label}{#if !choice.isAvailable}<small>Currently unavailable</small>{/if}</span><strong>{choice.priceDelta.startsWith('-') || /^0(?:\.0+)?$/.test(choice.priceDelta) ? '' : '+'}{choice.priceDelta} {dish.currency}</strong></li>
            {/each}</ul>
          </div>
        {/each}
      </section>
    {/if}
    <slot />
  </div>
  <div class="modal-footer"><slot name="footer"><button type="button" class="btn-close" on:click={onClose}>Back to menu</button></slot></div>
</dialog>

<style>
  .modal-card { background:var(--bg-surface); color:var(--color-text); font-family:var(--font-dining); border:1px solid rgba(255,255,255,.12); border-radius:var(--radius-dining); width:calc(100% - 2rem); max-width:440px; max-height:85dvh; padding:1.25rem; margin:auto; box-shadow:0 20px 40px rgba(0,0,0,.6); overflow-y:auto; overflow-wrap:anywhere; }
  .modal-card::backdrop { background:rgba(0,0,0,.75); backdrop-filter:blur(8px); }
  .modal-header { display:flex; justify-content:space-between; align-items:flex-start; gap:.75rem; margin-bottom:1rem; }
  h2 { font-size:1.1rem; line-height:1.4; } h3 { font-size:.95rem; } h4 { font-size:.88rem; }
  .modal-close { background:rgba(255,255,255,.08); border:none; color:#CBD5E1; width:44px; height:44px; flex-shrink:0; border-radius:50%; cursor:pointer; }
  .modal-amharic { font-size:.95rem; color:var(--color-primary); font-weight:600; margin:0 0 .5rem; }
  .modal-desc { font-size:.85rem; color:#94A3B8; line-height:1.5; margin-bottom:.75rem; white-space:pre-line; }
  .modal-price-box { background:rgba(255,255,255,.04); padding:.5rem .75rem; border-radius:6px; font-size:.9rem; color:#CBD5E1; margin-bottom:1rem; }
  .availability { font-size:.82rem; margin-bottom:1rem; }
  .options { margin:1rem 0; } .option-group { margin-top:1rem; } .option-group p { font-size:.78rem; color:#94A3B8; margin:.3rem 0 .5rem; }
  ul { list-style:none; padding:0; } li { display:flex; justify-content:space-between; gap:1rem; padding:.6rem 0; border-top:1px solid rgba(255,255,255,.08); font-size:.82rem; } li strong { white-space:nowrap; } li small { display:block; margin-top:.25rem; color:#94A3B8; }
  .modal-footer { display:flex; gap:.75rem; margin-top:1.25rem; }
  .btn-close { width:100%; padding:.7rem; background:rgba(255,255,255,.06); color:inherit; border:1px solid rgba(255,255,255,.12); border-radius:8px; font:inherit; font-weight:600; cursor:pointer; min-height:44px; }
  button:focus-visible { outline:2px solid var(--color-text); outline-offset:3px; }
  @media(prefers-reduced-motion:reduce) { .modal-card::backdrop { backdrop-filter:none; } }
</style>
