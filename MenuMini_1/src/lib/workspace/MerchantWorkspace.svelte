<script lang="ts">
  import { tick } from 'svelte';
  import { BUSINESS_TYPES } from '$lib/onboarding/registration';
  import { DAYS } from '$lib/onboarding/setup';
  import type { SetupHours } from '$lib/onboarding/setup';
  import type { FieldIssue } from '$lib/onboarding/registration';
  import { MINI_MENU_TEMPLATES } from '$lib/types/miniTemplates';
  import { normalizeAmount, validateWorkspace, WORKSPACE_MAX_BYTES } from './model';
  import type { WorkspacePreparation, WorkspaceCheck, Item, Modifier } from './model';

  export let draft: WorkspacePreparation;
  let stage: 'BRANCH' | 'MENU' | 'SERVICE' | 'REVIEW' = 'MENU';
  let selectedId = draft.menu.sections[0].id;
  let tableLabel = '';
  let errors: FieldIssue[] = [];
  let check: WorkspaceCheck | null = null;
  let failure = '';
  let message = '';
  let busy = false;
  $: if (!draft.menu.sections.some(s => s.id === selectedId)) selectedId = draft.menu.sections[0].id;
  $: section = draft.menu.sections.find(s => s.id === selectedId)!;
  $: items = draft.menu.sections.flatMap(s => s.items);
  const roles = [{ key: 'orders', label: 'Accept orders and handle the floor' },
    { key: 'preparation', label: 'Prepare items and hand them over' }, { key: 'payments', label: 'Record cash and verify credited transfers' }] as const;
  const blockerText: Record<string,string> = {
    PHONE_VERIFICATION: 'Verify the registrant’s own phone.', BUSINESS_AUTHORIZATION: 'Establish owner authority and approve manager access.',
    MENU_PUBLICATION: 'Save and publish the reviewed menu from verified business access.', MENU_ITEMS: 'Add menu items.',
    AVAILABLE_ITEMS: 'Keep at least one item available for initial launch.', PAID_PLAN_REQUIRED: 'Free supports browsing. Activate a paid plan before ordering.',
    SUBSCRIPTION_ACTIVATION: 'Review actual pricing and activate the subscription.', TABLE_PREPARATION: 'Prepare at least one table label for dine-in service.',
    STAFF_RESPONSIBILITIES: 'Decide who handles orders, preparation and payments.', VERIFIED_STAFF_ACCESS: 'Invite and verify staff, then grant actual branch permissions.',
    PAYMENT_METHODS: 'Choose how this branch intends to receive payments.', VERIFIED_RECEIVING_ACCOUNT: 'Verify ownership of a branch receiving account before accepting transfers.',
    PRICE_POLICY_REVIEW: 'Confirm the actual tax and service-charge policy before ordering.', ORDERING_WORKFLOW: 'Connect and test customer orders and the staff service queue.',
    PAYMENT_WORKFLOW: 'Connect and test bills, cash, transfer verification and refunds.', FIELD_ACCEPTANCE: 'Test the complete workflow on actual phones at a venue.',
    COUNTER_WORKFLOW: 'Complete the counter-specific ordering and handover workflow.'
  };
  const issueText: Record<string,string> = {
    PRICE: 'Use an exact price such as 60.50; option adjustments can be negative.', TEXT_INVALID: 'Check the name, description or address length.',
    SELECTION_BOUNDS: 'Check the minimum and maximum options. A single choice allows at most one.', REQUIRED_CHOICES: 'Enough choices must be available to satisfy the required minimum.',
    PRICE_RANGE: 'The available option combinations cannot make the price negative or exceed the supported range.',
    DUPLICATE_TABLE: 'Use a different table label; case and surrounding spaces do not make labels different.',
    UNKNOWN_FIELD: 'Unsupported fields cannot be imported.', UNIQUE_ID: 'Item, section and option IDs must be distinct.',
    PHONE_FORMAT: 'Check the optional public phone.', HOURS_OVERNIGHT: 'Confirm the next-day closing setting and use different opening/closing times.'
  };
  function invalidateReview() { check = null; message = ''; errors = []; failure = ''; }
  function edited() { invalidateReview(); draft = draft; }
  async function changeStage(next: typeof stage) { stage = next; await tick(); document.getElementById('workspace-stage-title')?.focus(); }
  function themeChanged() { draft.menu.primaryColor = MINI_MENU_TEMPLATES.find(t => t.id === draft.menu.themeId)!.theme.primary; edited(); }
  function hoursChanged(hours: SetupHours) {
    if (hours.status === 'OPEN') { hours.opens ||= '07:00'; hours.closes ||= '21:00'; hours.overnight ??= false; }
    else { delete hours.opens; delete hours.closes; delete hours.overnight; } edited();
  }
  function addSection() { const s = { id: crypto.randomUUID(), nameEn: '', items: [] }; draft.menu.sections = [...draft.menu.sections,s]; selectedId = s.id; edited(); }
  function removeSection() {
    if (section.items.length && !window.confirm('Remove this section and its items from the preparation draft?')) return;
    draft.menu.sections = draft.menu.sections.filter(s => s.id !== selectedId); edited();
  }
  function addItem() {
    section.items = [...section.items, { id: crypto.randomUUID(), nameEn: '', basePrice: '', availableNow: true, modifiers: [] }]; edited();
    tick().then(() => document.getElementById('name-' + section.items.at(-1)!.id)?.focus());
  }
  function removeItem(item: Item) {
    if (item.nameEn.trim() && !window.confirm('Remove “' + item.nameEn + '” from this preparation?')) return;
    section.items = section.items.filter(i => i.id !== item.id); edited();
  }
  function addGroup(item: Item) {
    item.modifiers = [...item.modifiers, { id: crypto.randomUUID(), label: '', mode: 'SINGLE_SELECT', minSelections: 0, maxSelections: 1,
      choices: [{ id: crypto.randomUUID(), label: '', priceDelta: '0.00', isAvailable: true }] }]; edited();
  }
  function groupMode(group: Modifier) { if (group.mode === 'SINGLE_SELECT') { group.maxSelections = 1; group.minSelections = Math.min(group.minSelections,1); } edited(); }
  function addTable() { const value = tableLabel.trim(); if (!value) return; draft.service.tableLabels = [...draft.service.tableLabels,value]; tableLabel = ''; edited(); }
  async function review() {
    for (const item of items) { item.basePrice = normalizeAmount(item.basePrice); for (const g of item.modifiers) for (const c of g.choices) c.priceDelta = normalizeAmount(c.priceDelta,true); }
    draft = draft; errors = []; failure = ''; message = ''; check = null;
    const local = validateWorkspace(draft);
    if (local.errors.length) { errors = local.errors; await tick(); document.getElementById('workspace-errors')?.focus(); return; }
    busy = true;
    try {
      const body = JSON.stringify(draft);
      if (new TextEncoder().encode(body).length > WORKSPACE_MAX_BYTES) throw new Error('This preparation is too large. Reduce the menu content.');
      const response = await fetch('/api/v2/onboarding/workspace-validation', { method: 'POST', headers: { 'Content-Type':'application/json' }, body });
      const result = await response.json();
      if (!response.ok) { errors = result.errors || []; failure = result.detail || 'The review could not finish.'; await tick(); document.getElementById('workspace-errors')?.focus(); }
      else { check = result; await changeStage('REVIEW'); }
    } catch (e) { failure = e instanceof Error && e.message.includes('too large') ? e.message : 'Connection interrupted. Your preparation is still here; retry the review.'; }
    finally { busy = false; }
  }
  function download() {
    if (!check) return;
    const file = new Blob([JSON.stringify(draft,null,2) + '\n'], { type:'application/json' });
    const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = 'menumini-workspace-draft.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url),1000); message = 'Download started. Keep this file to resume; refreshing this page clears its preparation.';
  }
</script>

<div class="workspace">
  <header><div><a class="brand" href="/">MenuMini</a><p class="eyebrow">BUSINESS WORKSPACE</p><h1>{draft.profile.branch.publicName || 'Prepare your business'}</h1>
    <p>{draft.profile.branch.name} · {draft.profile.branch.city}</p></div><span class="badge">Preparation · verification pending</span></header>
  <div class="notice"><strong>Your work stays on this page until you download it.</strong><p>Prepare your menu and service details now. Publishing, staff access and ordering follow verified business access.</p></div>
  <div class="layout">
    <aside><nav aria-label="Workspace sections">{#each ['BRANCH','MENU','SERVICE','REVIEW'] as next,index}<button type="button" class:current={stage === next} disabled={busy}
      on:click={() => next === 'REVIEW' ? review() : changeStage(next as typeof stage)}><span>{index + 1}</span>{next === 'BRANCH' ? 'Branch & plan' : next === 'MENU' ? 'Menu & options' : next === 'SERVICE' ? 'Service setup' : 'Review & download'}</button>{/each}</nav>
      <div class="journey"><strong>After preparation</strong><ol><li>Verify owner and staff access</li><li>Publish the customer menu</li><li>Test orders and serving</li><li>Test bills and payments</li><li>Daily close and reports</li></ol></div>
    </aside>
    <main>
      {#if errors.length || failure}<div id="workspace-errors" class="error" role="alert" tabindex="-1"><strong>{failure || 'Check these preparation fields'}</strong><ul>{#each errors as error}<li>{error.field}: {issueText[error.code] || 'Check this field (' + error.code + ').'}</li>{/each}</ul></div>{/if}
      {#if message}<p class="message" role="status">{message}</p>{/if}
      <form on:submit|preventDefault={review} on:input={invalidateReview} on:change={invalidateReview}>
        <fieldset class="panel" disabled={busy}>
        {#if stage === 'BRANCH'}
          <h2 id="workspace-stage-title" tabindex="-1">Branch & plan preference</h2><p class="hint">Public details stay separate from the owner’s and manager’s private contacts.</p>
          <label for="workspace-type">Business type</label><select id="workspace-type" bind:value={draft.profile.businessTypeId}>{#each BUSINESS_TYPES as type}<option value={type.id}>{type.name}</option>{/each}</select>
          <label for="workspace-public-name">Public business name</label><input id="workspace-public-name" bind:value={draft.profile.branch.publicName} maxlength="160" required />
          <div class="pair"><div><label for="workspace-branch">Branch name</label><input id="workspace-branch" bind:value={draft.profile.branch.name} maxlength="160" required /></div>
            <div><label for="workspace-city">City / town</label><input id="workspace-city" bind:value={draft.profile.branch.city} maxlength="160" required /></div></div>
          <label for="workspace-area">Area / neighborhood (optional)</label><input id="workspace-area" bind:value={draft.profile.branch.area} maxlength="160" />
          <label for="workspace-address">Address / practical landmark</label><input id="workspace-address" bind:value={draft.profile.branch.landmark} maxlength="300" required />
          <label for="workspace-phone">Public customer phone (optional)</label><input id="workspace-phone" type="tel" bind:value={draft.profile.branch.publicPhone} maxlength="32" />
          <label for="workspace-plan">Plan preference</label><select id="workspace-plan" bind:value={draft.planPreference}><option value="FREE">Free · one branch, browsing only</option><option value="MINI">MenuMini · maximum two branches</option><option value="PRO">MenuPro · interest for later</option></select>
          <p class="hint">MenuMini starts with one branch. Branch two needs a quoted price increase, owner acceptance and verified subscription billing while staying on Mini. Selecting a preference makes no purchase.</p>
          <h3>Opening hours</h3><p class="hint">24-hour clock · Africa/Addis_Ababa · unspecified days remain unknown.</p>
          {#each draft.profile.branch.hours as hours (hours.day)}<div class="hours"><label for={'workspace-day-' + hours.day}>{DAYS[hours.day]}</label>
            <select id={'workspace-day-' + hours.day} bind:value={hours.status} on:change={() => hoursChanged(hours)}><option value="UNSPECIFIED">Not provided</option><option value="CLOSED">Closed</option><option value="OPEN">Open</option></select>
            {#if hours.status === 'OPEN'}<label class="sr-only" for={'workspace-opens-' + hours.day}>Opening time on {DAYS[hours.day]}</label><input id={'workspace-opens-' + hours.day} type="time" bind:value={hours.opens} />
              <label class="sr-only" for={'workspace-closes-' + hours.day}>Closing time on {DAYS[hours.day]}</label><input id={'workspace-closes-' + hours.day} type="time" bind:value={hours.closes} />
              <label class="check"><input type="checkbox" bind:checked={hours.overnight} />Next day</label>{/if}</div>{/each}
          <button class="primary" type="button" on:click={() => changeStage('MENU')}>Continue to menu →</button>
        {:else if stage === 'MENU'}
          <h2 id="workspace-stage-title" tabindex="-1">Menu & item options</h2><p class="hint">These are preparation edits. A published menu changes only after a separate publication.</p>
          <label for="workspace-theme">Menu appearance</label><select id="workspace-theme" bind:value={draft.menu.themeId} on:change={themeChanged}>{#each MINI_MENU_TEMPLATES as theme}<option value={theme.id}>{theme.name}</option>{/each}</select>
          <label for="workspace-section">Section to edit</label><select id="workspace-section" bind:value={selectedId}>{#each draft.menu.sections as s}<option value={s.id}>{s.nameEn || 'Unnamed section'} ({s.items.length})</option>{/each}</select>
          <div class="actions"><button type="button" disabled={draft.menu.sections.length >= 40} on:click={addSection}>+ Section</button><button class="text-button" type="button" disabled={draft.menu.sections.length === 1} on:click={removeSection}>Remove section</button></div>
          <div class="pair"><div><label for="workspace-section-name">Section name</label><input id="workspace-section-name" bind:value={section.nameEn} maxlength="120" required /></div>
            <div><label for="workspace-section-am">Section name in Amharic (optional)</label><input id="workspace-section-am" lang="am" bind:value={section.nameAm} maxlength="120" /></div></div>
          {#each section.items as item,index (item.id)}<article class="item"><div class="item-heading"><h3>Item {index + 1}</h3><button class="text-button" type="button" on:click={() => removeItem(item)}>Remove item</button></div>
            <label for={'name-' + item.id}>Item name</label><input id={'name-' + item.id} bind:value={item.nameEn} maxlength="160" required />
            <label for={'am-' + item.id}>Item name in Amharic (optional)</label><input id={'am-' + item.id} lang="am" bind:value={item.nameAm} maxlength="160" />
            <label for={'description-' + item.id}>Description (optional)</label><textarea id={'description-' + item.id} bind:value={item.descriptionEn} maxlength="2000" rows="2"></textarea>
            <label for={'description-am-' + item.id}>Description in Amharic (optional)</label><textarea id={'description-am-' + item.id} lang="am" bind:value={item.descriptionAm} maxlength="2000" rows="2"></textarea>
            <div class="pair"><div><label for={'price-' + item.id}>Base price in ETB</label><input id={'price-' + item.id} inputmode="decimal" bind:value={item.basePrice} placeholder="60.50" maxlength="13" required /></div>
              <label class="check"><input type="checkbox" bind:checked={item.availableNow} />Available in this draft</label></div>
            <p class="hint">An urgent sold-out change on a live menu will be handled separately from publishing unfinished edits.</p>
            {#each item.modifiers as group,gi (group.id)}<fieldset class="options"><legend>Option group {gi + 1}</legend>
              <label for={'group-' + group.id}>Group name, such as size or milk</label><input id={'group-' + group.id} bind:value={group.label} maxlength="120" required />
              <div class="pair"><div><label for={'mode-' + group.id}>Selection</label><select id={'mode-' + group.id} bind:value={group.mode} on:change={() => groupMode(group)}><option value="SINGLE_SELECT">One choice</option><option value="MULTI_SELECT">Multiple choices</option></select></div>
                <div class="pair"><div><label for={'min-' + group.id}>Minimum</label><input id={'min-' + group.id} type="number" min="0" max="30" bind:value={group.minSelections} /></div><div><label for={'max-' + group.id}>Maximum</label><input id={'max-' + group.id} type="number" min="1" max="30" bind:value={group.maxSelections} readonly={group.mode === 'SINGLE_SELECT'} /></div></div></div>
              {#each group.choices as choice,ci (choice.id)}<div class="choice"><div><label for={'choice-' + choice.id}>Choice {ci + 1}</label><input id={'choice-' + choice.id} bind:value={choice.label} maxlength="120" required /></div>
                <div><label for={'delta-' + choice.id}>ETB adjustment</label><input id={'delta-' + choice.id} inputmode="decimal" bind:value={choice.priceDelta} maxlength="14" required /></div>
                <label class="check"><input type="checkbox" bind:checked={choice.isAvailable} />Available</label>
                <button class="text-button" type="button" disabled={group.choices.length <= 1} on:click={() => { group.choices = group.choices.filter(c => c.id !== choice.id); edited(); }}>Remove choice</button></div>{/each}
              <p class="hint">0.00 keeps the base price; 10.00 adds ETB 10; -5.00 subtracts ETB 5. Required choices must be available.</p>
              <div class="actions"><button type="button" disabled={group.choices.length >= 30} on:click={() => { group.choices = [...group.choices,{ id:crypto.randomUUID(),label:'',priceDelta:'0.00',isAvailable:true }]; edited(); }}>+ Choice</button>
                <button class="text-button" type="button" on:click={() => { item.modifiers = item.modifiers.filter(g => g.id !== group.id); edited(); }}>Remove option group</button></div>
            </fieldset>{/each}
            <button type="button" disabled={item.modifiers.length >= 10} on:click={() => addGroup(item)}>+ Add item options</button>
          </article>{:else}<p class="empty">Add your first item to this section.</p>{/each}
          <div class="actions"><button type="button" disabled={section.items.length >= 200 || items.length >= 1000} on:click={addItem}>+ Add item</button><button class="primary" type="button" on:click={() => changeStage('SERVICE')}>Continue to service setup →</button></div>
        {:else if stage === 'SERVICE'}
          <h2 id="workspace-stage-title" tabindex="-1">Prepare service responsibilities</h2><p class="hint">Decide how this branch should work. These choices do not invite staff, create tables or activate ordering.</p>
          <label for="workspace-service-mode">Service mode</label><select id="workspace-service-mode" bind:value={draft.profile.branch.serviceMode}><option value="MENU_ONLY">Menu browsing only</option><option value="DINE_IN">Prepare dine-in ordering</option><option value="COUNTER">Prepare counter ordering</option></select>
          {#if draft.profile.branch.serviceMode === 'MENU_ONLY'}<div class="note"><strong>Start with a public menu.</strong><p>Staff, tables and restaurant payments can wait until you choose to prepare ordering.</p></div>
          {:else}
            {#if draft.planPreference === 'FREE'}<p class="note">Free remains browsing only. Ordering requires an activated paid plan, even if you prepare it here.</p>{/if}
            {#if draft.profile.branch.serviceMode === 'DINE_IN'}<h3>Planned tables</h3><div class="pair"><div><label for="workspace-table">Table label</label><input id="workspace-table" bind:value={tableLabel} maxlength="40" placeholder="Table 1" /></div><button type="button" disabled={draft.service.tableLabels.length >= 100 || !tableLabel.trim()} on:click={addTable}>+ Add table label</button></div>
              <ul class="tables">{#each draft.service.tableLabels as label,index}<li>{label}<button type="button" class="text-button" aria-label={'Remove planned ' + label} on:click={() => { draft.service.tableLabels = draft.service.tableLabels.filter((_,i) => i !== index); edited(); }}>Remove</button></li>{:else}<li>No table labels prepared yet.</li>{/each}</ul>
              <p class="hint">Actual table QR codes and safe guest-to-visit access are configured after verification.</p>
            {:else}<p class="note">Counter service needs its own order collection and handover flow before activation.</p>{/if}
            <h3>Who will handle each responsibility?</h3>{#each roles as role}<label for={'workspace-role-' + role.key}>{role.label}</label><select id={'workspace-role-' + role.key} bind:value={draft.service.staffing[role.key]}><option value="UNASSIGNED">Decide later</option><option value="OWNER">Owner will handle this</option><option value="STAFF">Assigned staff will handle this</option></select>{/each}
            <p class="hint">One person can cover several duties. Actual access comes from verified, branch-specific permissions.</p>
            <fieldset class="methods"><legend>Intended payment methods</legend><label class="check"><input type="checkbox" value="CASH" bind:group={draft.service.paymentMethods} />Cash</label><label class="check"><input type="checkbox" value="BANK_TRANSFER" bind:group={draft.service.paymentMethods} />Manually verified transfer</label></fieldset>
            <div class="note"><strong>Staff can accept an order while payment is pending.</strong><p>A transfer claim or screenshot cannot mark a bill paid. Authorized staff must verify funds actually credited to a verified receiving account.</p></div>
            <label for="workspace-pricing">Price policy preparation</label><select id="workspace-pricing" bind:value={draft.service.pricing}><option value="UNCONFIRMED">Not reviewed yet</option><option value="NO_ADDED_CHARGES">Listed prices are final; no extra charges intended</option><option value="REVIEW_REQUIRED">Tax / service charges need configuration</option></select>
            <p class="hint">Confirm the business’s actual policy before enabling orders. This preference does not configure bill calculations.</p>
          {/if}
          <button class="primary" type="submit">{busy ? 'Reviewing…' : 'Review the whole preparation →'}</button>
        {:else if check}
          <h2 id="workspace-stage-title" tabindex="-1">Review before launch</h2><p class="hint">Preparation checked. {check.summary.itemCount} {check.summary.itemCount === 1 ? 'item' : 'items'} · {check.summary.optionGroupCount} {check.summary.optionGroupCount === 1 ? 'option group' : 'option groups'} · {check.summary.plannedTableCount} {check.summary.plannedTableCount === 1 ? 'planned table' : 'planned tables'}.</p>
          <div class="customer-preview"><p class="eyebrow">CUSTOMER MENU PREVIEW · UNPUBLISHED</p><h3>{draft.profile.branch.publicName}</h3><p>{draft.profile.branch.name} · {draft.profile.branch.city}</p>
            {#each draft.menu.sections.filter(s => s.items.length) as s}<h4>{s.nameEn}{#if s.nameAm}<span lang="am"> · {s.nameAm}</span>{/if}</h4>{#each s.items as item}<div class="preview-item"><div><strong>{item.nameEn}</strong>{#if item.nameAm}<p lang="am">{item.nameAm}</p>{/if}<p>{item.descriptionEn}</p>{#if item.descriptionAm}<p lang="am">{item.descriptionAm}</p>{/if}
              {#if !item.availableNow}<span class="sold-out">Unavailable in this draft</span>{/if}{#each item.modifiers as group}<p class="option-summary">{group.label}: {group.choices.filter(c => c.isAvailable).map(c => c.label + ' (' + c.priceDelta + ' ETB)').join(', ')} · select {group.minSelections}–{group.maxSelections}</p>{/each}</div><strong class="price">ETB {item.basePrice}</strong></div>{/each}{:else}<p>No menu items prepared yet.</p>{/each}
          </div>
          <h3>Remaining steps</h3><ul class="remaining">{#each check.blockers as blocker}<li>{blockerText[blocker] || blocker}</li>{/each}</ul>
          <div class="actions"><button class="primary" type="button" on:click={download}>Download workspace draft</button><button type="button" disabled>Publish after verification</button></div>
          <p class="hint">The download includes the public branch/menu and service preparation. It contains no registration contacts, sessions or access grants. Item options are preserved.</p>
          <p class="hint"><a href="/service/rehearsal" target="_blank" rel="noopener noreferrer">Try the fictional table-to-served rehearsal →</a> Opens separately with sample data; your preparation stays here.</p>
        {:else}<h2 id="workspace-stage-title" tabindex="-1">Review preparation</h2><button class="primary" type="submit">Check current preparation</button>{/if}
        </fieldset>
      </form>
    </main>
  </div>
</div>

<style>
  .workspace{color:#21322e;background:#f5f6f3;border-radius:18px;padding:clamp(16px,4vw,40px);max-width:1220px;margin:0 auto;font-family:Arial,sans-serif}
  header{display:flex;justify-content:space-between;align-items:start;gap:18px;margin-bottom:22px}h1{font-size:clamp(24px,4vw,34px);line-height:1.2;margin:6px 0 8px}h2{font-size:24px;margin:0 0 10px}h3{font-size:18px;margin:24px 0 12px}p{line-height:1.55;margin:6px 0 12px}.brand{font-size:20px;font-weight:800;color:#245c4c;text-decoration:none}.eyebrow{font-size:11px;letter-spacing:.1em;font-weight:700;color:#586c61;margin-top:18px}.badge{font-size:12px;font-weight:700;padding:10px 12px;border:1px solid #d9c888;background:#fff6d8;border-radius:20px;white-space:nowrap}
  .notice,.note{background:#edf2e9;border:1px solid #dbe3d4;padding:15px 18px;border-radius:12px}.notice{margin-bottom:24px}.notice p,.note p{margin-bottom:0;font-size:14px}.layout{display:grid;grid-template-columns:225px minmax(0,1fr);gap:26px}main{min-width:0}nav{display:grid;gap:8px}nav button{display:flex;gap:10px;align-items:center;width:100%;text-align:left;border:1px solid transparent;background:transparent;color:#56675e}nav button span{border:1px solid #ccd5cc;border-radius:50%;width:24px;height:24px;display:grid;place-items:center;font-size:12px;flex-shrink:0}nav button.current{background:#fff;border-color:#c9d5cb;color:#245c4c;font-weight:700}.journey{font-size:13px;padding:24px 8px;color:#5f7065}.journey ol{padding-left:18px;line-height:2}.panel{min-width:0;border:1px solid #dde4da;background:#fff;border-radius:15px;padding:clamp(16px,3vw,28px)}
  label,legend{display:block;font-weight:700;font-size:13px;color:#33463a;margin:17px 0 7px}input,select,textarea{width:100%;min-width:0;background:#fff;color:#21322e;border:1px solid #c5d0c4;border-radius:8px;font:inherit;font-size:15px;padding:11px 12px;min-height:44px;box-sizing:border-box}textarea{resize:vertical}input:focus,select:focus,textarea:focus,button:focus-visible{outline:3px solid #a8c5b4;outline-offset:2px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:end}.hint{font-size:13px;color:#657568;margin-top:9px}.check{display:flex;gap:9px;align-items:center;font-weight:400;line-height:1.4;margin-bottom:10px}.check input{width:18px;height:18px;min-height:18px;flex-shrink:0;accent-color:#245c4c}.actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:18px}button{font:inherit;font-size:14px;font-weight:700;min-height:44px;border:1px solid #c5d0c4;border-radius:8px;padding:10px 14px;background:#fff;color:#334c3c;cursor:pointer}button.primary{background:#245c4c;color:#fff;border-color:#245c4c;margin-top:18px}button:disabled{opacity:.5;cursor:default}.text-button{border-color:transparent;background:transparent;font-size:13px}.item{border-top:1px solid #dde4da;padding-top:18px;margin-top:22px}.item-heading{display:flex;justify-content:space-between;gap:10px;align-items:center}.item-heading h3{margin:0}.options{background:#f7f8f5;border:1px solid #d9e0d5;border-radius:10px;padding:8px 16px 16px;margin-top:24px;min-width:0}.options legend{padding:0 8px}.choice{display:grid;grid-template-columns:1.3fr 1fr;gap:4px 16px;border-top:1px solid #dce3d8;margin-top:18px;padding-top:3px}.choice .check{margin-top:12px}.hours{display:flex;flex-wrap:wrap;gap:10px;align-items:center;border-top:1px solid #e6ebe3;padding:10px 0}.hours>label:first-child{width:90px}.hours select{width:160px}.hours input[type=time]{width:118px}.methods{border:0;padding:0;margin:20px 0}.methods legend{margin:0 0 12px}.tables{list-style:none;padding:0}.tables li{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid #e4e9e0;font-size:14px}.error{border:1px solid #d89586;background:#fff0e9;color:#7b3328;padding:15px;border-radius:10px;margin-bottom:16px;overflow-wrap:anywhere;font-size:14px}.error ul{padding-left:20px;line-height:1.6}.message{padding:15px;border-radius:10px;background:#e5f3e9;color:#255138;font-size:14px}.customer-preview{border:1px solid #d8e0d3;border-radius:12px;padding:18px;margin-top:20px}.customer-preview h3{margin:4px 0}.customer-preview .eyebrow{margin-top:0}.customer-preview h4{font-size:16px;margin:22px 0 8px}.preview-item{display:flex;justify-content:space-between;gap:16px;border-top:1px solid #e3e8df;padding:14px 0}.preview-item p{font-size:13px;margin:5px 0;color:#5a6c5e}.price{white-space:nowrap;font-size:14px}.sold-out{font-size:12px;background:#f5eadb;padding:5px 8px;border-radius:6px}.option-summary{overflow-wrap:anywhere}.remaining{font-size:14px;line-height:1.7;padding-left:20px}.remaining li{margin:8px 0}.empty{padding:18px;background:#f6f8f3;border-radius:8px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  @media(max-width:760px){header{display:block}.badge{display:inline-block;margin-top:10px}.layout{grid-template-columns:1fr;gap:16px}nav{grid-template-columns:1fr 1fr}nav button{font-size:12px;padding:9px}.journey{display:none}.pair{grid-template-columns:1fr}.choice{grid-template-columns:1fr 1fr}.panel{padding:16px}.workspace{border-radius:0}.preview-item{gap:8px}.price{font-size:13px}.notice{padding:12px 14px}.hours>label:first-child{width:85px}}
  .workspace{container-type:inline-size}
  @container(max-width:760px){.layout{grid-template-columns:1fr;gap:16px}nav{grid-template-columns:1fr 1fr}nav button{font-size:12px;padding:9px}.journey{display:none}.pair{grid-template-columns:1fr}.panel{padding:16px}}
  @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style>
