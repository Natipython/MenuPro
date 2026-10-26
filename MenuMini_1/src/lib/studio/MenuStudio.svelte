<script lang="ts">
  import { onMount } from 'svelte';
  import { BUSINESS_TYPES } from '$lib/onboarding/registration';
  import { DAYS } from '$lib/onboarding/setup';
  import type { SetupHours } from '$lib/onboarding/setup';
  import { MINI_MENU_TEMPLATES } from '$lib/types/miniTemplates';
  import { newWorkspacePreparation, validateCatalog, validateProfile } from '$lib/workspace/model';
  import type { Catalog, Profile, Item, WorkspacePreparation } from '$lib/workspace/model';
  import { editablePreparation, importMenuPreparation, menuReview } from './preparation';
  import { readDevicePreparation, saveDevicePreparation } from './device-draft';
  import { httpStudioGateway, StudioCommands } from './catalog-client';
  import type { SavedStudioDraft } from './catalog-client';
  import StudioItemEditor from './StudioItemEditor.svelte';
  import MenuPreview from './MenuPreview.svelte';

  export let connected: { branchId: string; csrfToken: string; menu: SavedStudioDraft<Catalog>; profile: SavedStudioDraft<Profile> } | null = null;
  function initialConnected() {
    if (!connected) return null;
    const value = newWorkspacePreparation(connected.profile.content.branch.publicName, connected.profile.content.businessTypeId);
    value.menu = structuredClone(connected.menu.content); value.profile = structuredClone(connected.profile.content); return value;
  }
  let draft: WorkspacePreparation | null = initialConnected();
  let controller = connected ? new StudioCommands(connected.branchId, httpStudioGateway(connected.branchId, () => connected?.csrfToken || ''), connected.menu, connected.profile) : null;
  let publicName = '', businessTypeId = BUSINESS_TYPES[0].id, selectedId = draft?.menu.sections[0]?.id || '';
  let revision = 0, savedAt: string | null = null, savedSignature = '', deviceReady = false, loading = !connected;
  let error = '', message = '', busy = false, preview = false, publishReview = false;
  let editing: { item: Item; sectionId: string; existing: boolean } | null = null;
  let issues: { field: string; code: string }[] = [];
  const colorPresets = [{ name: 'Amber Gold', hex: '#F59E0B' }, { name: 'Emerald Green', hex: '#10B981' }, { name: 'Habesha Terracotta', hex: '#D97706' }, { name: 'Bole Crimson', hex: '#E11D48' }, { name: 'Sky Cyan', hex: '#0284C7' }];
  $: section = draft?.menu.sections.find(value => value.id === selectedId) || draft?.menu.sections[0];
  $: selectedTemplate = MINI_MENU_TEMPLATES.find(value => value.id === draft?.menu.themeId) || MINI_MENU_TEMPLATES[0];
  $: menuDirty = !!draft && !!controller && JSON.stringify(draft.menu) !== JSON.stringify(controller.menu.content);
  $: profileDirty = !!draft && !!controller && JSON.stringify(draft.profile) !== JSON.stringify(controller.profile.content);
  $: dirty = !!draft && (controller ? menuDirty || profileDirty : JSON.stringify(draft) !== savedSignature);
  $: locked = busy || !!controller?.pending;

  onMount(() => {
    if (!connected) readDevicePreparation().then(saved => {
      revision = saved.revision; savedAt = saved.savedAt; deviceReady = true;
      if (saved.draft) { draft = saved.draft; selectedId = draft.menu.sections[0]?.id || ''; savedSignature = JSON.stringify(draft); message = 'Your preparation was restored from this browser. It is not published.'; }
    }).catch(value => error = value instanceof Error ? value.message : 'Device storage could not be read.').finally(() => loading = false);
    const warn = (event: BeforeUnloadEvent) => { if (dirty || controller?.pending) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  });
  function changed() { draft = draft; message = ''; error = ''; issues = []; publishReview = false; }
  function start() {
    if (draft && dirty && !window.confirm('Start another preparation? Download or save the current edits first if you need them.')) return;
    draft = newWorkspacePreparation(publicName, businessTypeId); selectedId = draft.menu.sections[0]?.id || ''; changed();
  }
  function themeChanged(id: string) { if (!draft) return; draft.menu.themeId = id; draft.menu.primaryColor = MINI_MENU_TEMPLATES.find(value => value.id === id)!.theme.primary; changed(); }
  function addSection() { if (!draft || draft.menu.sections.length >= 40) return; const value = { id: crypto.randomUUID(), nameEn: '', items: [] }; draft.menu.sections = [...draft.menu.sections, value]; selectedId = value.id; changed(); }
  function removeSection() { if (!draft || !section || !window.confirm('Remove this section and its dishes from the draft? The published menu stays unchanged.')) return; draft.menu.sections = draft.menu.sections.filter(value => value.id !== section.id); selectedId = draft.menu.sections[0]?.id || ''; changed(); }
  function openItem(item?: Item) { if (!section) return; editing = { item: item || { id: crypto.randomUUID(), nameEn: '', basePrice: '', availableNow: true, modifiers: [] }, sectionId: section.id, existing: !!item }; }
  function keepItem(value: Item) {
    const target = draft?.menu.sections.find(section => section.id === editing?.sectionId); if (!target || !editing || !draft) return 'This section is no longer available.';
    const proposal = structuredClone(draft); const proposed = proposal.menu.sections.find(section => section.id === target.id)!;
    proposed.items = editing.existing ? proposed.items.map(item => item.id === value.id ? value : item) : [...proposed.items, value];
    if (!editablePreparation(proposal)) return 'Check supported item fields and the section/item/option limits.';
    draft = proposal; editing = null; changed(); return null;
  }
  function removeItem(item: Item) { if (!section || !window.confirm(`Remove “${item.nameEn || 'Untitled dish'}” from this draft?`)) return; section.items = section.items.filter(value => value.id !== item.id); changed(); }
  function hoursChanged(hours: SetupHours) {
    if (hours.status === 'OPEN') { hours.opens ||= '07:00'; hours.closes ||= '21:00'; hours.overnight ??= false; }
    else { delete hours.opens; delete hours.closes; delete hours.overnight; } changed();
  }
  async function saveLocal() {
    if (!draft || !deviceReady || locked) return; busy = true; error = ''; message = '';
    const snapshot = structuredClone(draft);
    try {
      const saved = await saveDevicePreparation(snapshot, revision); revision = saved.revision; savedAt = saved.savedAt; savedSignature = JSON.stringify(snapshot);
      message = 'Preparation saved on this device. This does not save to a business account or publish a menu.';
    } catch (value) { error = value instanceof Error ? value.message : 'The preparation was not saved.'; }
    finally { busy = false; }
  }
  function download() {
    if (!draft || !editablePreparation(draft)) { error = 'This preparation contains unsupported data and cannot be downloaded.'; return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'menumini-menu-preparation.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
    message = 'Preparation downloaded. Keep the file to resume it in another browser; it is not a published menu.';
  }
  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; if (!file) return;
    try {
      if (draft && dirty && !window.confirm('Replace the current unsaved preparation with this file?')) return;
      if (file.size > 1179648) throw new Error('Choose a preparation smaller than 1152 KB.');
      const value = importMenuPreparation(JSON.parse(await file.text())); draft = value; selectedId = draft.menu.sections[0]?.id || ''; changed(); message = 'Preparation imported. Review it before saving or publication.';
    } catch (value) { error = value instanceof Error ? value.message : 'The file could not be imported.'; }
    finally { input.value = ''; }
  }
  function showPreview() { if (!draft) return; issues = validateCatalog(draft.menu).map(value => ({ ...value, field: 'menu.' + value.field })); if (!issues.length) preview = true; }
  async function runConnected(action: 'MENU' | 'PROFILE' | 'PUBLISH' | 'RETRY') {
    if (!draft || !controller || busy) return; busy = true; error = ''; message = ''; issues = [];
    try {
      if (action === 'MENU') { issues = validateCatalog(draft.menu); if (issues.length) return; await controller.saveMenu(draft.menu, crypto.randomUUID()); message = 'Menu draft saved to the business. The published menu is unchanged.'; }
      else if (action === 'PROFILE') { issues = validateProfile(draft.profile); if (issues.length) return; await controller.saveProfile(draft.profile, crypto.randomUUID()); message = 'Branch details saved. Publication is a separate step.'; }
      else if (action === 'PUBLISH') {
        if (menuDirty || profileDirty) throw new Error('Save the menu and branch edits before publication.');
        issues = menuReview(draft).errors; if (issues.length) return;
        await controller.publish(crypto.randomUUID()); publishReview = false; message = 'The server confirmed this publication.';
      } else { await controller.retry(); message = 'The original request was confirmed. Review the current saved state before another change.'; }
      controller = controller;
    } catch (value) { error = value instanceof Error ? value.message : 'The business request could not finish.'; }
    finally { controller = controller; busy = false; }
  }
</script>

<svelte:head><title>Menu & Template Studio | MenuMini</title><meta name="robots" content="noindex" /></svelte:head>
<div class="menu-studio-page">
  <header class="page-top-bar"><div><h1 class="page-title">Menu & Template Studio</h1><p class="page-subtitle">Your menu, appearance and customer preview in one place.</p></div>
    {#if draft}<div class="top-actions"><button type="button" class="btn-tactile btn-secondary" on:click={showPreview}>Preview draft</button><button type="button" class="btn-tactile btn-primary" disabled={locked || !section} on:click={() => openItem()}>+ Add new dish</button></div>{/if}</header>
  <aside class="studio-notice"><strong>{controller ? 'Business menu workspace' : 'Preparation · Verification pending'}</strong>
    <p>{controller ? 'Save menu and branch changes separately, then review publication. Draft edits never update the customer menu automatically.' : 'Prepare, save on this device and download your menu. Real business saving and publication require verified access; this page cannot send OTP codes or create an account.'}</p></aside>
  {#if error}<p class="studio-error" role="alert">{error}</p>{/if}{#if message}<p class="studio-message" role="status">{message}</p>{/if}
  {#if issues.length}<div class="studio-error" role="alert"><strong>Correct these fields before continuing</strong><ul>{#each issues.slice(0, 12) as issue}<li>{issue.field}: {issue.code === 'PRICE' ? 'Use an exact ETB amount such as 70.00.' : issue.code === 'TEXT_INVALID' ? 'Check required text and its length.' : issue.code === 'MENU_ITEMS' ? 'Add at least one dish.' : issue.code === 'REQUIRED_CHOICES' ? 'Make enough required options available.' : 'Check this field (' + issue.code + ').'}</li>{/each}</ul></div>{/if}
  {#if controller?.pending}<aside class="studio-notice"><strong>Result unconfirmed</strong><p>The change may have saved. Keep this page open and retry the original request before changing or publishing anything else.</p><button type="button" class="btn-tactile btn-secondary" disabled={busy} on:click={() => runConnected('RETRY')}>Retry unchanged request</button></aside>{/if}
  {#if loading}<p>Checking this browser for a saved preparation…</p>
  {:else if !draft}
    <section class="card start-preparation"><h2>Start your menu</h2><form on:submit|preventDefault={start}><label class="form-label" for="studio-name">Public business name</label><input id="studio-name" class="form-control" bind:value={publicName} maxlength="160" required />
      <label class="form-label" for="studio-business-type">Business type</label><select id="studio-business-type" class="form-control" bind:value={businessTypeId}>{#each BUSINESS_TYPES as type}<option value={type.id}>{type.name}</option>{/each}</select>
      <button class="btn-tactile btn-primary" type="submit">Prepare menu</button></form><label class="form-label" for="studio-first-import">Or resume a setup/workspace file</label><input id="studio-first-import" type="file" accept="application/json,.json" on:change={importFile} /></section>
  {:else}
    <div class="studio-save-bar"><p>{dirty ? 'Unsaved changes' : controller ? 'Saved business drafts loaded' : 'Matches this device’s saved preparation'}{#if savedAt && !controller}<small>Saved on this device: {new Date(savedAt).toLocaleString()}</small>{/if}</p>
      <div class="top-actions">{#if !controller}<button type="button" class="btn-tactile btn-primary" disabled={locked || !deviceReady} on:click={saveLocal}>Save on this device</button>{:else}<button type="button" class="btn-tactile btn-primary" disabled={locked || !menuDirty} on:click={() => runConnected('MENU')}>Save menu draft</button>{/if}<button type="button" class="btn-tactile btn-secondary" disabled={locked} on:click={download}>Download preparation</button></div></div>
    <fieldset disabled={locked}>
      <div class="mini-template-showcase-card card"><div class="showcase-header"><div class="showcase-title-box"><h2 class="showcase-title">Menu layouts & brand colors</h2></div><div class="color-tweaker-group"><span class="tweaker-label">Brand color:</span><div class="color-dots-row">{#each colorPresets as color}<button type="button" class="color-dot" class:active={draft.menu.primaryColor === color.hex} style:background={color.hex} aria-label={color.name} aria-pressed={draft.menu.primaryColor === color.hex} on:click={() => { if (draft) draft.menu.primaryColor = color.hex; changed(); }}></button>{/each}</div></div></div>
        <div class="mini-templates-row">{#each MINI_MENU_TEMPLATES as theme}<button type="button" class="mini-template-pill-card" class:selected={selectedTemplate.id === theme.id} aria-pressed={selectedTemplate.id === theme.id} on:click={() => themeChanged(theme.id)}><span class="tmpl-icon-box" aria-hidden="true">{theme.thumbnail}</span><span class="tmpl-info-box"><strong class="tmpl-name">{theme.name}</strong><small class="tmpl-desc">{theme.description}</small></span>{#if selectedTemplate.id === theme.id}<span class="tmpl-active-check">Selected</span>{/if}</button>{/each}</div>
        <details class="studio-optional"><summary>Original AI assistance</summary><p>Template matching and dish enhancement remain optional integration work. They are not connected to this preparation’s saving or publication; no external AI request is sent here.</p><button type="button" class="btn-tactile btn-secondary" disabled>AI Smart Match · Not connected</button></details></div>
      <div class="catalog-grid"><aside class="sections-column card"><h2 class="sections-title">Menu sections</h2><nav class="sections-stack" aria-label="Edit menu section">{#each draft.menu.sections as value (value.id)}<button type="button" class="sec-tab-btn" class:active={section?.id === value.id} aria-pressed={section?.id === value.id} on:click={() => selectedId = value.id}>{value.nameEn || 'Untitled section'} <small>{value.items.length}</small></button>{/each}</nav><button type="button" class="btn-tactile btn-secondary" disabled={draft.menu.sections.length >= 40} on:click={addSection}>+ Add section</button></aside>
        <main class="dishes-column card">{#if section}<div class="dishes-head"><h2 class="dishes-title">{section.nameEn || 'Untitled section'}</h2><button type="button" class="btn-tactile btn-secondary" on:click={() => openItem()}>+ Add item</button></div>
          <div class="studio-section-fields"><label class="form-label">Section name<input class="form-control" bind:value={section.nameEn} maxlength="120" on:input={changed} /></label><label class="form-label">Amharic section name (optional)<input class="form-control" lang="am" bind:value={section.nameAm} maxlength="120" on:input={changed} /></label></div>
          <div class="dishes-table-wrap"><table class="dishes-table"><thead><tr><th>Dish & details</th><th>Price</th><th>Draft status</th><th>Action</th></tr></thead><tbody>{#each section.items as item (item.id)}<tr class:out-of-stock={!item.availableNow}><td><strong class="item-name">{item.nameEn || 'Untitled dish'}</strong>{#if item.nameAm}<p lang="am">{item.nameAm}</p>{/if}<p class="item-desc">{item.descriptionEn || ''}</p></td><td class="font-mono text-amber">{item.basePrice || 'Price needed'} ETB</td><td><button type="button" class="btn-stock-pill" class:in-stock={item.availableNow} on:click={() => { item.availableNow = !item.availableNow; changed(); }}>{item.availableNow ? 'Available' : 'Unavailable'}</button></td><td><div class="studio-row-actions"><button type="button" class="btn-tactile btn-secondary" aria-label={`Edit ${item.nameEn || 'untitled dish'}`} on:click={() => openItem(item)}>Edit</button><button type="button" class="btn-del" aria-label={`Remove ${item.nameEn || 'untitled dish'}`} on:click={() => removeItem(item)}>Remove</button></div></td></tr>{:else}<tr><td colspan="4">Add your first dish to this section. Prices and optional translations stay editable.</td></tr>{/each}</tbody></table></div>
          <button type="button" class="studio-remove-section" on:click={removeSection}>Remove this section</button>
        {:else}<h2>No sections yet</h2><p>Add a section to begin your menu.</p><button type="button" class="btn-tactile btn-primary" on:click={addSection}>Add section</button>{/if}</main></div>
      <details class="card studio-branch"><summary>Branch details & opening hours</summary><p class="studio-help">These are public menu details. Owner/manager private contacts are not part of this preparation.</p>
        <div class="studio-section-fields"><label class="form-label">Public business name<input class="form-control" bind:value={draft.profile.branch.publicName} maxlength="160" on:input={changed} /></label><label class="form-label">Branch name<input class="form-control" bind:value={draft.profile.branch.name} maxlength="160" on:input={changed} /></label>
          <label class="form-label">City<input class="form-control" bind:value={draft.profile.branch.city} maxlength="160" on:input={changed} /></label><label class="form-label">Area (optional)<input class="form-control" bind:value={draft.profile.branch.area} maxlength="160" on:input={changed} /></label>
          <label class="form-label">Landmark<input class="form-control" bind:value={draft.profile.branch.landmark} maxlength="300" on:input={changed} /></label><label class="form-label">Public phone (optional)<input type="tel" class="form-control" bind:value={draft.profile.branch.publicPhone} maxlength="32" on:input={changed} /></label></div>
        <p class="studio-help">Hours use Addis Ababa time. Unspecified hours are shown as not provided.</p>{#each draft.profile.branch.hours as hours (hours.day)}<div class="studio-hours"><strong>{DAYS[hours.day]}</strong><label>Schedule<select class="form-control" bind:value={hours.status} on:change={() => hoursChanged(hours)}><option value="UNSPECIFIED">Not supplied</option><option value="CLOSED">Closed</option><option value="OPEN">Open</option></select></label>{#if hours.status === 'OPEN'}<label>Opens<input class="form-control" type="time" bind:value={hours.opens} on:input={changed} /></label><label>Closes<input class="form-control" type="time" bind:value={hours.closes} on:input={changed} /></label><label class="studio-check"><input type="checkbox" bind:checked={hours.overnight} on:change={changed} /> Next day</label>{/if}</div>{/each}
        {#if controller}<button type="button" class="btn-tactile btn-secondary" disabled={!profileDirty} on:click={() => runConnected('PROFILE')}>Save branch details</button>{/if}</details>
    </fieldset>
    <section class="card studio-publication"><h2>Review & publication</h2><p class="studio-help">A preview or device save does not update the customer menu.</p>
      <div class="top-actions"><button type="button" class="btn-tactile btn-secondary" on:click={showPreview}>Preview draft</button><button type="button" class="btn-tactile btn-primary" disabled={!controller || locked || menuDirty || profileDirty} on:click={() => { if (draft) issues = menuReview(draft).errors; publishReview = !issues.length; }}>Review publication</button></div>
      {#if !controller}<p class="studio-help">Publication requires verified business access. You can keep editing, save locally or download this preparation while OTP remains deferred.</p>{/if}
      {#if publishReview && controller}<div class="studio-publication-review"><p>Publish the saved menu and branch details for <strong>{draft.profile.branch.publicName} · {draft.profile.branch.name}</strong>?</p><p>The customer link will show this committed version after the server confirms it.</p><div class="top-actions"><button type="button" class="btn-tactile btn-primary" disabled={locked} on:click={() => runConnected('PUBLISH')}>Publish reviewed menu</button><button type="button" class="btn-tactile btn-secondary" disabled={locked} on:click={() => publishReview = false}>Keep editing</button></div></div>{/if}
      {#if controller?.publication}<p role="status">Publication {controller.publication.revision} confirmed. Later draft edits remain private until another publication.</p>{/if}</section>
    {#if !controller}<details class="studio-optional"><summary>Import or start another preparation</summary><p>One preparation is saved in this browser at a time. Download it before replacing it. This is a device-storage limit, not a plan or branch limit.</p><label class="form-label" for="studio-import">Import setup/workspace JSON</label><input id="studio-import" type="file" accept="application/json,.json" disabled={locked} on:change={importFile} /><form on:submit|preventDefault={start}><label class="form-label">Public business name<input class="form-control" bind:value={publicName} maxlength="160" required /></label><label class="form-label">Business type<select class="form-control" bind:value={businessTypeId}>{#each BUSINESS_TYPES as type}<option value={type.id}>{type.name}</option>{/each}</select></label><button type="submit" class="btn-tactile btn-secondary">Start another preparation</button></form></details>{/if}
  {/if}
</div>
{#if editing}<StudioItemEditor original={editing.item} onSave={keepItem} onClose={() => editing = null} />{/if}
{#if preview && draft}<MenuPreview profile={draft.profile} content={draft.menu} onClose={() => preview = false} />{/if}

<style>
  .menu-studio-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    }
  .page-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    }
  .page-title {
    font-family: var(--font-serif);
    font-size: 1.75rem;
    color: #FFFFFF;
    }
  .page-subtitle {
    font-size: 0.88rem;
    color: var(--text-secondary);
    }
  .top-actions {
    display: flex;
    gap: 0.75rem;
    }
  .mini-template-showcase-card {
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(26, 29, 39, 0.6) 100%);
    border: 1px solid rgba(245, 158, 11, 0.25);
    padding: 1.5rem;
    }
  .showcase-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.25rem;
    }
  .showcase-title-box {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    }
  .showcase-title {
    font-size: 1.15rem;
    color: #FFFFFF;
    margin: 0;
    }
  .color-tweaker-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    }
  .tweaker-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 600;
    }
  .color-dots-row {
    display: flex;
    gap: 0.5rem;
    }
  .color-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 120ms ease;
    }
  .color-dot.active {
    border-color: #FFFFFF;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
    transform: scale(1.15);
    }
  .mini-templates-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.85rem;
    }
  .mini-template-pill-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
    padding: 0.85rem 1rem;
    border-radius: var(--radius-md);
    text-align: left;
    cursor: pointer;
    transition: all 140ms ease;
    }
  .mini-template-pill-card.selected {
    background: rgba(245, 158, 11, 0.12);
    border-color: var(--amber-500);
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.15);
    }
  .tmpl-icon-box { font-size: 1.5rem;   }
  .tmpl-info-box { flex: 1; overflow: hidden;   }
  .tmpl-name { font-size: 0.85rem; color: #FFFFFF;   }
  .tmpl-desc {
    font-size: 0.72rem;
    color: var(--text-tertiary);
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    }
  .tmpl-active-check { font-size: 0.75rem; font-weight: 700; color: var(--amber-400);   }
  .catalog-grid {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 1.25rem;
    }
  .sections-column, .dishes-column {
    padding: 1.25rem;
    }
  .sections-title, .dishes-title {
    font-size: 1rem;
    color: #FFFFFF;
    margin-bottom: 1rem;
    }
  .sections-stack {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    }
  .sec-tab-btn {
    width: 100%;
    text-align: left;
    padding: 0.7rem 0.85rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 120ms ease;
    }
  .sec-tab-btn.active {
    background: var(--surface-elevated);
    border-color: var(--border);
    color: var(--amber-400);
    }
  .dishes-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    }
  .dishes-table {
    width: 100%;
    border-collapse: collapse;
    }
  .dishes-table th {
    text-align: left;
    font-size: 0.72rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--border);
    }
  .dishes-table td {
    padding: 0.85rem 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
  .item-desc {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 0.2rem;
    white-space: pre-line;
    }
  .btn-stock-pill {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    }
  .btn-stock-pill.in-stock {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.3);
    color: var(--color-success);
    }
  .btn-del {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    }
  .form-label {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
    }
  .form-control {
    width: 100%;
    padding: 0.7rem 0.85rem;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: #FFFFFF;
    font-size: 0.9rem;
    outline: none;
    }
  fieldset { min-width:0; margin:0; padding:0; border:0; display:flex; flex-direction:column; gap:1.5rem; }
  .top-actions { flex-wrap:wrap; align-items:center; }
  button, input, select, summary { min-height:44px; }
  button:disabled { opacity:.55; cursor:not-allowed; }
  button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline:2px solid var(--amber-500); outline-offset:3px; }
  .color-dot { width:44px; height:44px; flex-shrink:0; }
  .color-dot.active { transform:none; }
  .color-dots-row, .color-tweaker-group { flex-wrap:wrap; }
  .mini-template-pill-card { transition:border-color 140ms ease, background-color 140ms ease; }
  .sec-tab-btn { min-height:44px; transition:background-color 120ms ease, color 120ms ease; overflow-wrap:anywhere; }
  .sec-tab-btn small { display:inline-block; margin-left:.5rem; color:var(--text-secondary); }
  .tmpl-name { display:block; }
  .tmpl-desc { display:block; overflow:visible; }
  .mini-templates-row { grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr)); }
  .catalog-grid { min-width:0; grid-template-columns:240px minmax(0,1fr); }
  .sections-column { align-self:start; }
  .sections-stack { margin-bottom:1rem; }
  .dishes-column { min-width:0; }
  .dishes-head { gap:1rem; flex-wrap:wrap; }
  .dishes-title { margin:0; }
  .dishes-table-wrap { overflow-x:auto; }
  .dishes-table { min-width:580px; }
  .dishes-table td { vertical-align:top; }
  .dishes-table th:first-child { width:40%; }
  .item-name { font-size:.9rem; overflow-wrap:anywhere; }
  .item-desc { overflow-wrap:anywhere; }
  .out-of-stock .item-name { color:var(--text-secondary); }
  .btn-stock-pill { min-height:44px; white-space:nowrap; }
  .btn-del, .studio-remove-section { color:var(--color-error, #f87171); padding:.5rem .7rem; font-size:.8rem; }
  .studio-remove-section { background:transparent; border:1px solid var(--border); border-radius:var(--radius-md); margin-top:1rem; cursor:pointer; }
  .studio-row-actions { display:flex; gap:.4rem; align-items:center; flex-wrap:wrap; }
  .studio-notice, .studio-message, .studio-error { padding:1rem 1.25rem; border:1px solid var(--border); border-radius:var(--radius-md); font-size:.85rem; line-height:1.6; }
  .studio-notice { background:var(--surface-dark); border-left:3px solid var(--amber-500); }
  .studio-notice p { margin:.3rem 0; color:var(--text-secondary); }
  .studio-error { border-color:var(--color-error, #f87171); }
  .studio-error ul { margin:.5rem 0 0; padding-left:1.25rem; }
  .studio-error li { overflow-wrap:anywhere; }
  .studio-message { border-color:var(--color-success); }
  .studio-save-bar { display:flex; justify-content:space-between; gap:1rem; align-items:center; flex-wrap:wrap; font-size:.85rem; }
  .studio-save-bar small { display:block; color:var(--text-secondary); margin-top:.25rem; }
  .start-preparation, .studio-branch, .studio-publication { padding:1.25rem; }
  .start-preparation { max-width:640px; }
  .start-preparation h2, .studio-publication h2 { font-size:1.15rem; margin-bottom:.75rem; }
  .start-preparation form, .studio-optional form { display:flex; flex-direction:column; gap:.75rem; margin:1rem 0 1.5rem; max-width:640px; }
  .form-label { display:flex; flex-direction:column; gap:.4rem; }
  .studio-section-fields { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin:1rem 0; }
  .studio-help, .studio-optional p { font-size:.85rem; line-height:1.6; color:var(--text-secondary); margin:.75rem 0; }
  .studio-optional { margin-top:1rem; }
  summary { cursor:pointer; padding:.6rem 0; font-weight:600; font-size:.9rem; }
  .studio-hours { display:grid; grid-template-columns:7rem minmax(130px,1fr) 1fr 1fr auto; gap:.75rem; align-items:center; padding:.75rem 0; border-bottom:1px solid var(--border); font-size:.82rem; }
  .studio-hours label { display:flex; flex-direction:column; gap:.4rem; }
  .studio-hours .studio-check { flex-direction:row; align-items:center; min-height:44px; }
  .studio-check input { min-height:20px; accent-color:var(--amber-500); }
  .studio-publication-review { border-top:1px solid var(--border); margin-top:1rem; padding-top:1rem; font-size:.9rem; line-height:1.6; }
  .studio-publication-review .top-actions { margin-top:1rem; }
  @media(hover:hover) and (pointer:fine) {
    .color-dot:hover { transform:scale(1.05); }
    .mini-template-pill-card:hover { background:rgba(255,255,255,.08); border-color:rgba(245,158,11,.4); }
    .sec-tab-btn:hover { background:rgba(255,255,255,.04); color:#fff; }
  }
  @media(max-width:1100px) { .studio-hours { grid-template-columns:7rem 1fr 1fr; } }
  @media(max-width:900px) { .catalog-grid { grid-template-columns:1fr; } }
  @media(max-width:600px) {
    .studio-section-fields { grid-template-columns:1fr; }
    .studio-hours { grid-template-columns:1fr 1fr; }
    .studio-hours strong { grid-column:1/-1; }
    .mini-template-showcase-card, .sections-column, .dishes-column, .studio-branch { padding:1rem; }
    .page-title { font-size:1.5rem; }
  }
  @media(prefers-reduced-motion:reduce) { button { transition:none; } .color-dot:hover { transform:none; } }

</style>
