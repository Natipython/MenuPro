<script lang="ts">
  import { tick } from 'svelte';
  import { BUSINESS_TYPES } from './registration';
  import type { FieldIssue } from './registration';
  import { DAYS, SETUP_ISSUE_MESSAGES, normalizePrice, validateBranch, DRAFT_MAX_BYTES } from './setup';
  import type { SetupDraft, SetupCheck, SetupHours, SetupSection, SetupBlocker } from './setup';
  import { MINI_MENU_TEMPLATES } from '$lib/types/miniTemplates';
  import MenuPreview from './MenuPreview.svelte';
  import DraftImport from './DraftImport.svelte';
  import MerchantWorkspace from '$lib/workspace/MerchantWorkspace.svelte';
  import { workspaceFromSetup } from '$lib/workspace/model';
  import type { WorkspacePreparation } from '$lib/workspace/model';

  export let draft: SetupDraft;
  export let stage: 'BRANCH' | 'PLAN' | 'MENU' | 'REVIEW' = 'BRANCH';
  export let onReturn: () => void;
  let errors: FieldIssue[] = [];
  let failure = '';
  let busy = false;
  let check: SetupCheck | null = null;
  let selectedId = '';
  let savedMessage = '';
  let workspaceDraft: WorkspacePreparation | null = null;
  let workspaceOpen = false;
  $: if (!draft.menu.sections.some(section => section.id === selectedId)) selectedId = draft.menu.sections[0].id;
  $: selectedIndex = draft.menu.sections.findIndex(section => section.id === selectedId);
  $: section = draft.menu.sections[selectedIndex];
  $: itemCount = draft.menu.sections.reduce((count, section) => count + section.items.length, 0);
  $: errorFor = (field: string) => errors.filter(error => error.field === field)
    .map(error => SETUP_ISSUE_MESSAGES[error.code] || 'Check this field.').join(' ');
  const plans = [
    { id: 'FREE', name: 'Free', detail: 'One branch with a menu for customers to browse.', note: 'Start with the menu. Ordering and payment handling need a paid plan and service setup.' },
    { id: 'MINI', name: 'MenuMini', detail: 'Prepare menu and staff ordering for a small business.', note: 'Start with one active branch. Maximum 2: branch two needs a price quote, owner acceptance and verified billing. You stay on MenuMini.' },
    { id: 'PRO', name: 'MenuPro · future interest', detail: 'For businesses needing a larger branch agreement.', note: 'Features, branch allowance and pricing need a separate agreement. This choice records draft interest only.' }
  ];
  const blockerText: Record<SetupBlocker, string> = {
    PHONE_VERIFICATION: 'Verify your own phone when OTP is connected.',
    BUSINESS_AUTHORIZATION: 'Establish owner access and any manager approval or invitation.',
    MENU_PUBLICATION: 'Save this draft to the business, confirm displayed prices, and publish a menu version.',
    SUBSCRIPTION_ACTIVATION: 'Review approved pricing and complete verified software subscription billing.',
    ORDERING_SETUP: 'Prepare staff, service points, receiving accounts and a test order before enabling ordering.',
    MENU_ITEMS: 'Add at least one actual menu item before publication.',
    AVAILABLE_ITEMS: 'Make at least one actual item available before publication.'
  };
  async function focusHeading() { await tick(); document.getElementById('setup-stage-title')?.focus(); }
  async function changeStage(next: typeof stage) {
    stage = next; errors = []; failure = ''; savedMessage = ''; check = null; await focusHeading();
  }
  async function branchNext() {
    errors = validateBranch(draft.branch);
    if (errors.length) { failure = 'Check the marked branch details.'; await focusError(); }
    else await changeStage('PLAN');
  }
  async function focusError() {
    await tick(); document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }
  function setHours(hours: SetupHours) {
    if (hours.status === 'OPEN') { hours.opens = '07:00'; hours.closes = '21:00'; hours.overnight = false; }
    else { delete hours.opens; delete hours.closes; delete hours.overnight; }
    draft = draft; check = null;
  }
  function addSection() {
    const added: SetupSection = { id: crypto.randomUUID(), name: 'New section', items: [] };
    draft.menu.sections = [...draft.menu.sections, added]; selectedId = added.id;
  }
  function removeSection() {
    if (draft.menu.sections.length === 1) return;
    if (section.items.length && !window.confirm(`Remove “${section.name}” and its ${section.items.length} item(s) from this draft?`)) return;
    draft.menu.sections = draft.menu.sections.filter(candidate => candidate.id !== selectedId);
    errors = []; failure = '';
  }
  function addItem() {
    section.items = [...section.items, { id: crypto.randomUUID(), name: '', nameAm: '', description: '', price: '', available: true }];
    draft = draft;
    tick().then(() => document.getElementById(`item-name-${section.items.at(-1)?.id}`)?.focus());
  }
  function removeItem(id: string) {
    const item = section.items.find(item => item.id === id);
    if (item?.name.trim() && !window.confirm(`Remove “${item.name}” from this draft?`)) return;
    section.items = section.items.filter(item => item.id !== id); draft = draft; errors = []; failure = '';
  }
  function normalizePrices() {
    draft.menu.sections.forEach(section => section.items.forEach(item => { item.price = normalizePrice(item.price) || item.price; }));
    draft = draft;
  }
  async function checkDraft() {
    normalizePrices(); busy = true; errors = []; failure = ''; check = null; savedMessage = '';
    try {
      const body = JSON.stringify(draft);
      if (new TextEncoder().encode(body).length > DRAFT_MAX_BYTES) throw new Error('Keep the exported setup draft smaller than 256 KB.');
      const response = await fetch('/api/v2/onboarding/setup-validation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body
      });
      const result = await response.json();
      if (!response.ok) {
        errors = result.errors || [];
        if (errors.some(error => error.field.startsWith('branch'))) stage = 'BRANCH';
        else if (errors.some(error => error.field.startsWith('menu.sections.'))) {
          stage = 'MENU';
          const index = Number(errors.find(error => error.field.startsWith('menu.sections.'))?.field.split('.')[2]);
          selectedId = draft.menu.sections[index]?.id || selectedId;
        }
        failure = errors.length ? 'Check the marked fields. Your draft is still here.' : result.detail || 'The check could not finish.';
        await focusError();
      } else { check = result; stage = 'REVIEW'; await focusHeading(); }
    } catch (error) { failure = error instanceof Error && error.message.includes('256 KB') ? error.message : 'Connection interrupted. Your draft is still here; try again.'; }
    finally { busy = false; }
  }
  function exportDraft() {
    // No registration names, personal phones/emails, access assertions or cookies.
    const blob = new Blob([JSON.stringify(draft, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'menumini-setup-draft.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    savedMessage = 'Draft download started. Keep the file to resume later. No account or live menu was created.';
  }
  function imported(value: SetupDraft) {
    draft = value; selectedId = value.menu.sections[0].id; changeStage('BRANCH');
  }
  function openWorkspace() {
    workspaceDraft = workspaceFromSetup(draft);
    workspaceOpen = true;
  }
</script>

{#if workspaceOpen && workspaceDraft}
  <MerchantWorkspace bind:draft={workspaceDraft} />
{:else}
<div class="preparation">
  <nav aria-label="Setup preparation progress"><ol>
    <li class:active={stage === 'BRANCH'}>1. Branch</li><li class:active={stage === 'PLAN'}>2. Plan</li>
    <li class:active={stage === 'MENU'}>3. Menu</li><li class:active={stage === 'REVIEW'}>4. Review</li>
  </ol></nav>
  <div class="pending"><strong>Verification pending</strong><p>You can prepare these details now. Account access, billing and public launch come after verification.</p></div>
  {#if failure}<div class="error-summary" role="alert">{failure}</div>{/if}
  {#if stage === 'BRANCH'}
    <h2 id="setup-stage-title" tabindex="-1">Your first branch</h2><p class="hint">Customer-facing details. Required unless marked optional.</p>
    <form on:submit|preventDefault={branchNext}>
      <label for="public-name">Public business name</label>
      <input id="public-name" bind:value={draft.branch.publicName} maxlength="160" required aria-invalid={!!errorFor('branch.publicName')} aria-describedby="public-name-error" />
      <p class="hint">The name customers should see. It can differ from the business license name.</p><p id="public-name-error" class="field-error">{errorFor('branch.publicName')}</p>
      <label for="branch-name">Branch name</label>
      <input id="branch-name" bind:value={draft.branch.name} maxlength="160" required aria-invalid={!!errorFor('branch.name')} aria-describedby="branch-name-error" />
      <p id="branch-name-error" class="field-error">{errorFor('branch.name')}</p>
      <div class="pair"><div><label for="branch-city">City / town</label><input id="branch-city" bind:value={draft.branch.city} maxlength="160" required aria-invalid={!!errorFor('branch.city')} aria-describedby="city-error" /><p id="city-error" class="field-error">{errorFor('branch.city')}</p></div>
        <div><label for="branch-area">Area / neighborhood <span>(optional)</span></label><input id="branch-area" bind:value={draft.branch.area} maxlength="160" aria-invalid={!!errorFor('branch.area')} aria-describedby="area-error" /><p id="area-error" class="field-error">{errorFor('branch.area')}</p></div></div>
      <label for="branch-landmark">Address / practical landmark</label><input id="branch-landmark" bind:value={draft.branch.landmark} maxlength="300" required aria-invalid={!!errorFor('branch.landmark')} aria-describedby="landmark-hint landmark-error" />
      <p id="landmark-hint" class="hint">For a mobile or catering business, enter the operating base or service area.</p><p id="landmark-error" class="field-error">{errorFor('branch.landmark')}</p>
      <label for="public-phone">Public customer phone <span>(optional)</span></label>
      <input id="public-phone" type="tel" inputmode="tel" bind:value={draft.branch.publicPhone} maxlength="32" placeholder="Leave blank if you do not want a public number" aria-invalid={!!errorFor('branch.publicPhone')} aria-describedby="public-phone-hint public-phone-error" />
      <p id="public-phone-hint" class="hint">This will appear on the eventual public menu. Owner and manager phones are not copied here.</p><p id="public-phone-error" class="field-error">{errorFor('branch.publicPhone')}</p>
      <label for="service-mode">What should this branch prepare for?</label><select id="service-mode" bind:value={draft.branch.serviceMode}>
        <option value="MENU_ONLY">Menu browsing only</option><option value="DINE_IN">Dine-in ordering · prepare for later</option><option value="COUNTER">Counter ordering · prepare for later</option>
      </select><p class="hint">Delivery and catering fulfillment are not enabled by choosing a business type.</p>
      <div class="settings"><span><strong>Currency</strong> ETB</span><span><strong>Time zone</strong> Africa/Addis_Ababa</span></div>
      <fieldset><legend>Opening hours <span>(can be completed later)</span></legend><p class="hint">Unspecified days display “Hours not provided”. Times use the 24-hour clock.</p>
        {#each draft.branch.hours as hours, index (hours.day)}
          <div class="hours-row"><div class="day-status"><label for={`day-${hours.day}`}>{DAYS[hours.day]}</label>
            <select id={`day-${hours.day}`} bind:value={hours.status} on:change={() => setHours(hours)}>
              <option value="UNSPECIFIED">Not provided</option><option value="CLOSED">Closed</option><option value="OPEN">Open</option>
            </select></div>
            {#if hours.status === 'OPEN'}
              <div class="hour-times"><div><label for={`opens-${hours.day}`}>Opens</label><input id={`opens-${hours.day}`} type="time" required bind:value={hours.opens} aria-invalid={!!errorFor(`branch.hours.${index}`)} aria-describedby={`hours-error-${hours.day}`} /></div>
                <div><label for={`closes-${hours.day}`}>Closes</label><input id={`closes-${hours.day}`} type="time" required bind:value={hours.closes} aria-invalid={!!errorFor(`branch.hours.${index}`)} aria-describedby={`hours-error-${hours.day}`} /></div></div>
              <label class="checkbox overnight"><input type="checkbox" bind:checked={hours.overnight} />Closes next day</label>
            {/if}<p id={`hours-error-${hours.day}`} class="field-error">{errorFor(`branch.hours.${index}`)}</p>
          </div>
        {/each}
      </fieldset>
      <div class="actions"><button class="secondary" type="button" on:click={onReturn}>← Registration details</button><button class="primary" type="submit">Continue to plan →</button></div>
    </form>
    <DraftImport onImported={imported} replacing={true} />
  {:else if stage === 'PLAN'}
    <h2 id="setup-stage-title" tabindex="-1">Choose a plan preference</h2><p class="hint">No purchase or activation happens here. You can change this preference.</p>
    <fieldset class="plans"><legend class="sr-only">Plan preference</legend>
      {#each plans as plan}<label class="plan" class:selected={draft.planPreference === plan.id}><input type="radio" name="plan-preference" value={plan.id} bind:group={draft.planPreference} />
        <span><strong>{plan.name}</strong><span class="detail">{plan.detail}</span><span class="hint">{plan.note}</span></span></label>{/each}
    </fieldset>
    <div class="note"><strong>{draft.planPreference === 'FREE' ? 'A useful place to start.' : 'Pricing is still to be confirmed.'}</strong>
      <p>{draft.planPreference === 'FREE' ? 'Prepare one branch and a menu without entering a receiving account or inviting staff.' : 'Approved prices and terms must be shown before any paid subscription is accepted. This draft cannot create a billing obligation.'}</p></div>
    {#if draft.branch.serviceMode !== 'MENU_ONLY' && draft.planPreference === 'FREE'}<p class="hint">Your ordering preference is saved for later. Free will remain a browsing-only menu.</p>{/if}
    <div class="actions"><button class="secondary" type="button" on:click={() => changeStage('BRANCH')}>← Branch</button><button class="primary" type="button" on:click={() => changeStage('MENU')}>Continue to menu →</button></div>
  {:else if stage === 'MENU'}
    <h2 id="setup-stage-title" tabindex="-1">Build your menu</h2><p class="hint">Starting sections for {BUSINESS_TYPES.find(type => type.id === draft.businessTypeId)?.name}. Add your own items and ETB prices.</p>
    <form on:submit|preventDefault={checkDraft}>
      <fieldset><legend>Menu appearance</legend><label for="menu-theme">Visual theme</label><select id="menu-theme" bind:value={draft.menu.themeId}>
        {#each MINI_MENU_TEMPLATES as theme}<option value={theme.id}>{theme.name}</option>{/each}
      </select><p class="hint">Six appearance choices. These are separate from the 24 business types.</p></fieldset>
      <fieldset><legend>Sections & items <span>{itemCount}/200 items</span></legend>
        <label for="menu-section">Section to edit</label><select id="menu-section" bind:value={selectedId}>{#each draft.menu.sections as candidate}<option value={candidate.id}>{candidate.name || 'Unnamed section'} ({candidate.items.length})</option>{/each}</select>
        <div class="small-actions"><button class="secondary compact" type="button" disabled={draft.menu.sections.length >= 30} on:click={addSection}>+ Add section</button>
          <button class="text-button" type="button" disabled={draft.menu.sections.length <= 1} on:click={removeSection}>Remove this section</button></div>
        <div class="pair"><div><label for="section-name">Section name</label><input id="section-name" bind:value={section.name} maxlength="120" required aria-invalid={!!errorFor(`menu.sections.${selectedIndex}.name`)} aria-describedby="section-name-error" /></div>
          <div><label for="section-name-am">Section name in Amharic <span>(optional)</span></label><input id="section-name-am" lang="am" bind:value={section.nameAm} maxlength="120" /></div></div>
        <p id="section-name-error" class="field-error">{errorFor(`menu.sections.${selectedIndex}.name`)}</p>
        {#each section.items as item, index (item.id)}
          <div class="item-editor"><div class="item-top"><h3>Item {index + 1}</h3><button class="text-button" type="button" on:click={() => removeItem(item.id)} aria-label={`Remove item ${index + 1}`}>Remove</button></div>
            <label for={`item-name-${item.id}`}>Item name</label><input id={`item-name-${item.id}`} bind:value={item.name} maxlength="160" required aria-invalid={!!errorFor(`menu.sections.${selectedIndex}.items.${index}.name`)} aria-describedby={`item-name-error-${item.id}`} />
            <p id={`item-name-error-${item.id}`} class="field-error">{errorFor(`menu.sections.${selectedIndex}.items.${index}.name`)}</p>
            <label for={`item-am-${item.id}`}>Item name in Amharic <span>(optional)</span></label><input id={`item-am-${item.id}`} lang="am" bind:value={item.nameAm} maxlength="160" />
            <label for={`item-description-${item.id}`}>Description <span>(optional)</span></label><textarea id={`item-description-${item.id}`} bind:value={item.description} maxlength="500" rows="2"></textarea>
            <div class="pair item-bottom"><div><label for={`item-price-${item.id}`}>Price in ETB</label>
              <input id={`item-price-${item.id}`} type="text" inputmode="decimal" bind:value={item.price} placeholder="60.50" required maxlength="11" aria-invalid={!!errorFor(`menu.sections.${selectedIndex}.items.${index}.price`)} aria-describedby={`price-error-${item.id}`} />
              <p id={`price-error-${item.id}`} class="field-error">{errorFor(`menu.sections.${selectedIndex}.items.${index}.price`)}</p></div>
              <label class="checkbox availability"><input type="checkbox" bind:checked={item.available} />Available to customers</label></div>
          </div>
        {:else}<p class="empty">No items in this section yet. Empty sections stay out of the customer preview.</p>{/each}
        <button class="secondary" type="button" on:click={addItem} disabled={section.items.length >= 50 || itemCount >= 200}>+ Add item to this section</button>
        <p class="hint">This step covers names, descriptions, prices and availability. Item options, images, taxes and service charges will be configured in menu management before ordering.</p>
      </fieldset>
      <div class="actions"><button class="secondary" type="button" on:click={() => changeStage('PLAN')} disabled={busy}>← Plan</button><button class="primary" type="submit" disabled={busy}>{busy ? 'Checking draft…' : 'Review & preview →'}</button></div>
    </form>
  {:else if check}
    <h2 id="setup-stage-title" tabindex="-1">Your setup draft</h2><p class="hint">{check.summary.itemCount} items in {check.summary.sectionCount} sections. Preparation checked; launch is still pending.</p>
    <dl class="review"><dt>First branch</dt><dd>{draft.branch.publicName} · {draft.branch.name}</dd><dt>Location</dt><dd>{draft.branch.city}{draft.branch.area ? ' · ' + draft.branch.area : ''}</dd>
      <dt>Plan preference</dt><dd>{draft.planPreference === 'FREE' ? 'Free · browsing only' : draft.planPreference === 'MINI' ? 'MenuMini · start with one branch, maximum two after quoted add-on' : 'MenuPro · future interest only'}</dd>
      <dt>Public customer phone</dt><dd>{draft.branch.publicPhone?.trim() || 'Not provided'}</dd></dl>
    <div class="small-actions"><button class="secondary compact" type="button" on:click={() => changeStage('BRANCH')}>Edit branch</button><button class="secondary compact" type="button" on:click={() => changeStage('PLAN')}>Edit plan</button><button class="secondary compact" type="button" on:click={() => changeStage('MENU')}>Edit menu</button></div>
    <MenuPreview {draft} />
    <div class="launch"><h3>Before launch</h3><ul>{#each check.blockers as blocker}<li>{blockerText[blocker]}</li>{/each}</ul>
      {#if draft.planPreference === 'PRO'}<p class="hint">MenuPro terms and capabilities still need to be defined; expressing interest does not make them available.</p>{/if}
      <button class="primary" type="button" disabled>Publish after verification</button><p class="hint">There is no live menu link, public QR code or ordering access yet.</p></div>
    <button class="primary export" type="button" on:click={openWorkspace}>Continue to workspace & service setup →</button>
    <button class="secondary export" type="button" on:click={exportDraft}>Export setup draft</button>
    <p class="hint">The file contains branch details, your plan preference and menu. It excludes owner and manager contacts. Choose it under “Resume an exported setup draft” to continue later.</p>
    {#if savedMessage}<p class="saved" role="status">{savedMessage}</p>{/if}
  {/if}
</div>
{/if}

<style>
  .preparation { color:#243b35; font:inherit; } nav ol { display:flex; list-style:none; gap:12px; padding:0; margin:0 0 20px; flex-wrap:wrap; font-size:11px; color:#6b7a70; }
  nav li { padding-bottom:7px; border-bottom:2px solid #e3e8df; } nav li.active { color:#285747; font-weight:750; border-color:#285747; }
  .pending,.note { background:#f7f9f4; border:1px solid #dce2da; border-radius:10px; padding:15px 18px; margin:18px 0 24px; font-size:13px; }
  .pending p,.note p { font-size:12px; color:#68786d; margin-top:5px; } h2 { font-size:24px; letter-spacing:-.5px; margin:16px 0 0; } h3 { font-size:16px; }
  .hint { color:#68786d; font-size:12px; margin-top:7px; line-height:1.6; } label { display:block; font-size:13px; font-weight:650; margin:18px 0 6px; } label span,legend span { color:#788579; font-size:11px; font-weight:400; }
  input:not([type=checkbox]):not([type=radio]),select,textarea { width:100%; box-sizing:border-box; padding:11px 12px; font:inherit; font-size:14px; color:#243b35; border:1px solid #cbd5c8; border-radius:7px; background:#fff; min-height:46px; }
  textarea { resize:vertical; } input:focus,select:focus,textarea:focus { outline:2px solid #28574755; outline-offset:2px; border-color:#285747; }
  [aria-invalid=true] { border-color:#aa3b31 !important; } .pair { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .settings { display:flex; flex-wrap:wrap; gap:14px 26px; font-size:11px; margin:20px 0; color:#68786d; } .settings strong { display:block; color:#405a4b; }
  fieldset { border:0; border-top:1px solid #e5eae1; padding:20px 0 4px; margin-top:28px; min-width:0; } legend { font-size:13px; font-weight:750; padding-right:12px; }
  .hours-row { border-bottom:1px solid #edf0e9; padding:12px 0; } .day-status { display:grid; grid-template-columns:1fr 1.4fr; gap:16px; align-items:center; } .day-status label { margin:0; }
  .hour-times { display:grid; grid-template-columns:1fr 1fr; gap:16px; } .hour-times label { font-size:11px; margin-top:10px; }
  .checkbox { display:flex; align-items:center; gap:9px; font-size:12px; font-weight:500; color:#405a4b; } .checkbox input { accent-color:#285747; width:18px; height:18px; flex-shrink:0; } .overnight { margin:12px 0 4px; }
  button { font:inherit; font-size:13px; font-weight:650; min-height:46px; padding:12px 16px; border-radius:7px; cursor:pointer; } button:disabled { opacity:.55; cursor:not-allowed; }
  .primary { background:#285747; color:white; border:1px solid #285747; } .primary:hover:enabled { background:#1c4335; } .secondary { background:#fff; border:1px solid #ccd6ca; color:#285747; }
  .actions { display:flex; gap:12px; margin-top:28px; justify-content:space-between; } .actions .primary { flex:1; } .small-actions { display:flex; flex-wrap:wrap; gap:10px; margin:12px 0 8px; }
  .compact { padding:8px 12px; font-size:12px; min-height:40px; } .text-button { background:none; border:0; color:#925448; font-size:11px; padding:7px 0; min-height:40px; }
  .plans { border:0; padding:0; margin-top:22px; } .plan { display:flex; gap:12px; border:1px solid #d5ded0; border-radius:10px; padding:18px; margin:12px 0; cursor:pointer; }
  .plan.selected { border:2px solid #285747; padding:17px; background:#f7faf3; } .plan input { width:18px; height:18px; accent-color:#285747; margin-top:3px; flex-shrink:0; }
  .plan>span { font-size:13px; color:#405a4b; } .plan strong { color:#243b35; display:block; font-size:16px; } .plan .detail,.plan .hint { display:block; margin-top:7px; } .plan .detail { font-size:12px; }
  .item-editor { margin:18px 0; background:#f9faf7; border:1px solid #dde4d8; border-radius:10px; padding:18px; } .item-top { display:flex; align-items:center; justify-content:space-between; }
  .item-top h3 { font-size:13px; } .item-editor label { margin-top:12px; } .item-bottom { align-items:center; } .availability { margin-top:30px !important; }
  .empty { padding:18px 0; color:#788579; font-size:12px; } .field-error { color:#ae382f; font-size:12px; margin-top:5px; } .field-error:empty { display:none; }
  .error-summary { background:#fff0ec; padding:12px; margin:16px 0; color:#923128; font-size:13px; border-radius:6px; }
  .review { margin:22px 0; } dt { color:#68786d; font-size:12px; margin-top:14px; } dd { font-size:14px; font-weight:600; overflow-wrap:anywhere; }
  .launch { padding:20px; border:1px solid #ddd7be; border-radius:10px; background:#fcfaf1; } .launch ul { padding-left:18px; font-size:12px; line-height:1.7; margin:12px 0 18px; color:#655f46; } .launch li { margin-top:7px; } .launch .primary { width:100%; }
  .export { width:100%; margin-top:22px; } .saved { padding:12px; background:#ecf4e6; font-size:12px; margin-top:14px; } .sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
  @media(max-width:520px) { .pair { grid-template-columns:1fr; gap:0; } .actions { flex-wrap:wrap; } .actions button { width:100%; } .availability { margin-top:16px !important; } .item-editor { padding:14px; } .day-status { grid-template-columns:1fr 1.3fr; gap:10px; } h2 { font-size:22px; } }
</style>
