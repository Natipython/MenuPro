<script lang="ts">
  import { onMount } from 'svelte';
  import { normalizeAmount } from '$lib/workspace/model';
  import type { Item, Modifier } from '$lib/workspace/model';
  export let original: Item;
  export let onSave: (value: Item) => string | null;
  export let onClose: () => void;
  let item = { ...structuredClone(original), nameAm: original.nameAm || '', descriptionEn: original.descriptionEn || '', descriptionAm: original.descriptionAm || '' };
  let error = '';
  let dialog: HTMLDialogElement;
  onMount(() => {
    const opener = document.activeElement; dialog.showModal();
    return () => { if (dialog.open) dialog.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true }); };
  });
  function addGroup() {
    item.modifiers = [...item.modifiers, { id: crypto.randomUUID(), label: '', mode: 'SINGLE_SELECT', minSelections: 0, maxSelections: 1,
      choices: [{ id: crypto.randomUUID(), label: '', priceDelta: '0.00', isAvailable: true }] }];
  }
  function groupMode(group: Modifier) { if (group.mode === 'SINGLE_SELECT') { group.maxSelections = 1; group.minSelections = Math.min(group.minSelections, 1); } }
  function numberInput(event: Event) { return Math.max(0, Math.min(30, Math.trunc(Number((event.target as HTMLInputElement).value) || 0))); }
</script>
<dialog bind:this={dialog} class="modal-card" aria-labelledby="studio-item-title" on:cancel|preventDefault={onClose}>
  <div class="modal-head"><h2 id="studio-item-title">{original.nameEn ? 'Edit dish' : 'Add new dish'}</h2><button type="button" class="modal-close" aria-label="Close dish editor" on:click={onClose}>✕</button></div>
  <p class="hint">Changes stay in your draft. Incomplete fields can be kept and corrected before preview or publication.</p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <form on:submit|preventDefault={() => error = onSave(structuredClone(item)) || ''}>
    <div class="two-columns">
      <label>Dish name<input bind:value={item.nameEn} maxlength="160" /></label>
      <label>Amharic name (optional)<input lang="am" bind:value={item.nameAm} maxlength="160" /></label>
    </div>
    <label>English description (optional)<textarea bind:value={item.descriptionEn} maxlength="2000" rows="3"></textarea></label>
    <label>Amharic description (optional)<textarea lang="am" bind:value={item.descriptionAm} maxlength="2000" rows="3"></textarea></label>
    <div class="two-columns"><label>Price in ETB<input inputmode="decimal" bind:value={item.basePrice} maxlength="32" placeholder="70.00" on:blur={() => item.basePrice = normalizeAmount(item.basePrice)} /></label>
      <label class="check"><input type="checkbox" bind:checked={item.availableNow} /> Available on the menu</label></div>
    <section aria-label="Dish options"><div class="option-heading"><h3>Options</h3><button type="button" disabled={item.modifiers.length >= 10} on:click={addGroup}>Add option group</button></div>
      {#each item.modifiers as group (group.id)}
        <div class="option-group">
          <div class="two-columns"><label>Group name<input bind:value={group.label} maxlength="120" placeholder="e.g. Size" /></label>
            <label>Selection type<select bind:value={group.mode} on:change={() => groupMode(group)}><option value="SINGLE_SELECT">Choose one</option><option value="MULTI_SELECT">Choose several</option></select></label></div>
          <div class="two-columns"><label>Minimum choices<input type="number" min="0" max="30" value={group.minSelections} on:input={(event) => group.minSelections = numberInput(event)} /></label>
            <label>Maximum choices<input type="number" min="1" max="30" value={group.maxSelections} on:input={(event) => group.maxSelections = numberInput(event)} /></label></div>
          {#each group.choices as choice (choice.id)}
            <div class="choice-row"><label>Choice<input bind:value={choice.label} maxlength="120" /></label>
              <label>ETB adjustment<input inputmode="decimal" bind:value={choice.priceDelta} maxlength="32" on:blur={() => choice.priceDelta = normalizeAmount(choice.priceDelta, true)} /></label>
              <label class="check"><input type="checkbox" bind:checked={choice.isAvailable} /> Available</label>
              <button type="button" aria-label={`Remove ${choice.label || 'unnamed choice'}`} on:click={() => group.choices = group.choices.filter(value => value.id !== choice.id)}>Remove</button></div>
          {/each}
          <div class="option-heading"><button type="button" disabled={group.choices.length >= 30} on:click={() => group.choices = [...group.choices, { id: crypto.randomUUID(), label: '', priceDelta: '0.00', isAvailable: true }]}>Add choice</button>
            <button type="button" on:click={() => item.modifiers = item.modifiers.filter(value => value.id !== group.id)}>Remove group</button></div>
        </div>
      {/each}
    </section>
    <div class="modal-actions"><button type="button" on:click={onClose}>Cancel</button><button type="submit" class="primary">Keep in draft</button></div>
  </form>
</dialog>
<style>
  .modal-card { width:calc(100% - 2rem); max-width:760px; max-height:90dvh; margin:auto; padding:1.5rem; background:var(--surface-dark); color:var(--text-primary); border:1px solid var(--border); border-radius:16px; font-family:var(--font-sans); }
  .modal-card::backdrop { background:rgba(0,0,0,.75); }
  .modal-head,.modal-actions,.option-heading { display:flex; justify-content:space-between; align-items:center; gap:.75rem; flex-wrap:wrap; }
  h2 { font-size:1.25rem; } h3 { font-size:1rem; } .hint { font-size:.82rem; color:var(--text-secondary); margin:1rem 0; line-height:1.5; }
  label { display:flex; flex-direction:column; gap:.4rem; font-size:.85rem; font-weight:600; margin:.75rem 0; min-width:0; }
  input,textarea,select { width:100%; padding:.7rem; min-height:44px; background:var(--bg-dark); color:var(--text-primary); border:1px solid var(--border); border-radius:8px; font:inherit; }
  textarea { resize:vertical; } .two-columns { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
  .check { flex-direction:row; align-items:center; align-self:center; } .check input { width:20px; min-height:20px; accent-color:var(--amber-500); }
  button { min-height:44px; padding:.55rem .8rem; background:var(--surface-elevated); color:inherit; border:1px solid var(--border); border-radius:8px; cursor:pointer; font:inherit; font-size:.82rem; }
  .primary { background:var(--amber-500); color:#000; font-weight:700; } .modal-close { width:44px; border-radius:50%; } button:disabled { opacity:.5; cursor:not-allowed; }
  section { margin-top:1.25rem; } .option-group { padding:1rem 0; border-bottom:1px solid var(--border); }
  .choice-row { display:grid; grid-template-columns:1.3fr 1fr auto auto; gap:.6rem; align-items:center; }
  .modal-actions { justify-content:flex-end; padding-top:1.25rem; }
  .error { color:var(--color-error, #f87171); font-size:.85rem; line-height:1.5; }
  input:focus-visible,textarea:focus-visible,select:focus-visible,button:focus-visible { outline:2px solid var(--amber-500); outline-offset:3px; }
  @media(max-width:600px) { .two-columns { grid-template-columns:1fr; gap:0; } .choice-row { grid-template-columns:1fr 1fr; } .modal-card { padding:1rem; } }
</style>
