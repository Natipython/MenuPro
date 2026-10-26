<script lang="ts">
  import { tick } from 'svelte';
  import { BUSINESS_TYPES, EMPTY_CONTACT, ISSUE_MESSAGES, normalizePhone } from '$lib/onboarding/registration';
  import type { FieldIssue, RegistrationCheck, RegistrationInput } from '$lib/onboarding/registration';
  import { newSetupDraft, newSections } from '$lib/onboarding/setup';
  import type { SetupDraft } from '$lib/onboarding/setup';
  import SetupWizard from '$lib/onboarding/SetupWizard.svelte';
  import DraftImport from '$lib/onboarding/DraftImport.svelte';

  let businessName = '';
  let businessTypeId = '';
  let owner = { ...EMPTY_CONTACT };
  let manager = { ...EMPTY_CONTACT };
  let ownerIsManager = false;
  let registrantRole: 'OWNER' | 'MANAGER' = 'OWNER';
  let authorityConfirmed = false;
  let errors: FieldIssue[] = [];
  let busy = false;
  let failure = '';
  let checked: RegistrationCheck | null = null;
  let preparing = false;
  let draft: SetupDraft | null = null;
  let wizardStage: 'BRANCH' | 'PLAN' | 'MENU' | 'REVIEW' = 'BRANCH';
  $: if (ownerIsManager) registrantRole = 'OWNER';
  $: errorFor = (field: string) => errors.filter(error => error.field === field)
    .map(error => ISSUE_MESSAGES[error.code] || 'Check this field.').join(' ');
  $: contact = registrantRole === 'OWNER' ? owner : manager;

  async function review() {
    busy = true; failure = ''; errors = [];
    const input: RegistrationInput = { businessName, businessTypeId, owner, ownerIsManager,
      ...(ownerIsManager ? {} : { manager }), registrantRole, authorityConfirmed };
    try {
      const response = await fetch('/api/v2/onboarding/validation', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(input)
      });
      const result = await response.json();
      if (!response.ok) {
        errors = result.errors || [];
        failure = errors.length ? 'Check the marked fields, then try again.' : result.detail || 'The check could not finish. Your entries are still here.';
        await tick();
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      } else {
        checked = result;
        await tick();
        document.getElementById('review-title')?.focus();
      }
    } catch { failure = 'Connection interrupted. Your entries are still here; try again.'; }
    finally { busy = false; }
  }
  async function prepare() {
    if (!draft) draft = newSetupDraft(businessName, businessTypeId);
    else if (draft.businessTypeId !== businessTypeId) {
      if (!window.confirm('Changing the business type replaces the current menu sections and items. Continue with the new type?')) return;
      draft.businessTypeId = businessTypeId; draft.menu.sections = newSections(businessTypeId);
    }
    preparing = true; wizardStage = 'BRANCH';
    await tick(); document.getElementById('setup-stage-title')?.focus();
  }
  async function resume(value: SetupDraft) {
    draft = value; businessTypeId = value.businessTypeId; preparing = true; wizardStage = 'BRANCH';
    await tick(); document.getElementById('setup-stage-title')?.focus();
  }
  const nextSteps = [
    { title: 'Verify your phone', detail: 'Verify the number belonging to the person completing setup. Confirming a phone does not verify a business license.' },
    { title: 'Confirm owner and manager access', detail: 'An owner can invite a separate manager. A manager registering first needs the owner’s verification and approval before business access is activated. If you do both jobs, one account is enough.' },
    { title: 'Set up the first branch', detail: 'Add its public name, branch name, city or area, address or landmark, customer contact, opening hours and dine-in or counter-service setting. Personal contact numbers stay private unless you choose to publish them.' },
    { title: 'Choose your plan', detail: 'Free starts with one branch and a menu. MenuMini supports up to two active branches. Request a price quote for branch two, review the amount and billing period, then accept it. Capacity activates after verified subscription billing. You stay on MenuMini.' },
    { title: 'Build and preview the menu', detail: 'Use your selected business type as an editable starting structure. Enter your own items, prices and availability; choose a visual theme separately. Confirm pricing and applicable charges, then preview and publish the menu.' },
    { title: 'Prepare service when needed', detail: 'For ordering, add tables and QR codes or use the supported counter workflow, invite staff with branch permissions and confirm receiving accounts. Staff may accept unpaid orders; transfers become paid only after staff verify credited funds.' },
    { title: 'Check and launch', detail: 'Check the menu on another phone. For ordering, complete a test order and settlement with staff before enabling live orders. A menu can be published before operational ordering is ready.' }
  ];
</script>

<svelte:head><title>Set up your business | MenuMini</title><meta name="robots" content="noindex" /></svelte:head>

<div class="setup-page">
  <header><a class="wordmark" href="/">MenuMini<span>Business setup</span></a><a class="signin" href="/sign-in">Already registered? Sign in →</a></header>
  <main>
    <aside class="intro">
      <p class="eyebrow">START WITH THE ESSENTIALS</p>
      <h1>{#if preparing}Prepare your branch. <br />Build your menu.{:else}Your business. <br />One clear setup.{/if}</h1>
      <p>{preparing ? 'Continue preparation while phone verification is pending. Keep your work with an exported setup draft.' : 'Tell us about the business and the people responsible for it. Branch details and menus come next.'}</p>
      <ol class="steps"><li class:active={!preparing && !checked}>Business & people</li><li class:active={!preparing && !!checked}>Review & verification</li><li class:active={preparing && ['BRANCH','PLAN'].includes(wizardStage)}>Branch & plan</li><li class:active={preparing && ['MENU','REVIEW'].includes(wizardStage)}>Menu & launch</li></ol>
      <div class="plan-note"><strong>Room for two branches.</strong><p>MenuMini has a maximum of 2 active branches. Branch two requires an accepted price quote and billing activation.</p></div>
    </aside>
    <section class="form-panel" aria-label="Business setup">
      <div class="build-notice" role="note"><strong>{preparing ? 'Preparation only' : 'Setup preview'}</strong><p>{preparing ? 'Work stays in this page unless you export a draft. Reload clears it.' : 'Phone verification will be added later. Prepare your details, branch and menu here. Reload clears your entries. No account, messages or live menu are created.'}</p></div>
      {#if preparing && draft}
        <SetupWizard bind:draft bind:stage={wizardStage} onReturn={() => { preparing = false; }} />
      {:else if !checked}
        <h2>Business & people</h2><p class="hint">Required unless marked optional.</p>
        {#if failure}<div class="error-summary" role="alert">{failure}</div>{/if}
        <form on:submit|preventDefault={review}>
          <fieldset><legend>1. The business</legend>
            <label for="business-name">Name of the business</label>
            <input id="business-name" name="businessName" autocomplete="organization" bind:value={businessName} maxlength="160" required aria-invalid={!!errorFor('businessName')} aria-describedby="license-name business-name-error" />
            <p id="license-name" class="hint">The same name used as in Business License. You can add a different public trading name later.</p>
            <p id="business-name-error" class="field-error">{errorFor('businessName')}</p>
            <label for="business-type">Type of business</label>
            <select id="business-type" name="businessTypeId" bind:value={businessTypeId} required aria-invalid={!!errorFor('businessTypeId')} aria-describedby="type-hint type-error">
              <option value="" disabled>Choose from 24 business types</option>
              {#each BUSINESS_TYPES as type}<option value={type.id}>{type.name}</option>{/each}
            </select>
            <p id="type-hint" class="hint">This gives your menu a starting structure. You can edit the sections and choose its appearance later.</p>
            <p id="type-error" class="field-error">{errorFor('businessTypeId')}</p>
          </fieldset>
          <fieldset><legend>2. Business owner</legend>
            <label for="owner-name">Full name of owner</label>
            <input id="owner-name" name="ownerName" autocomplete="section-owner name" bind:value={owner.name} maxlength="120" required aria-invalid={!!errorFor('owner.name')} aria-describedby="owner-name-error" />
            <p id="owner-name-error" class="field-error">{errorFor('owner.name')}</p>
            <div class="pair"><div>
              <label for="owner-phone">Owner’s phone number</label>
              <input id="owner-phone" name="ownerPhone" type="tel" inputmode="tel" autocomplete="section-owner tel" placeholder="09XXXXXXXX or +251…" bind:value={owner.phone} maxlength="32" required aria-invalid={!!errorFor('owner.phone')} aria-describedby="owner-phone-error" />
              <p id="owner-phone-error" class="field-error">{errorFor('owner.phone')}</p>
            </div><div>
              <label for="owner-email">Owner’s email <span>(optional)</span></label>
              <input id="owner-email" name="ownerEmail" type="email" autocomplete="section-owner email" bind:value={owner.email} maxlength="254" aria-invalid={!!errorFor('owner.email')} aria-describedby="owner-email-error" />
              <p id="owner-email-error" class="field-error">{errorFor('owner.email')}</p>
            </div></div>
            <label class="checkbox" for="same-manager"><input id="same-manager" name="ownerIsManager" type="checkbox" bind:checked={ownerIsManager} /><span>Owner is also the administrator / general manager</span></label>
          </fieldset>
          {#if !ownerIsManager}
            <fieldset><legend>3. Administrator / general manager</legend>
              <label for="manager-name">Full name of administrator / general manager</label>
              <input id="manager-name" name="managerName" autocomplete="section-manager name" bind:value={manager.name} maxlength="120" required aria-invalid={!!errorFor('manager.name')} aria-describedby="manager-name-error" />
              <p id="manager-name-error" class="field-error">{errorFor('manager.name')}</p>
              <div class="pair"><div>
                <label for="manager-phone">Manager’s phone number</label>
                <input id="manager-phone" name="managerPhone" type="tel" inputmode="tel" autocomplete="section-manager tel" placeholder="09XXXXXXXX or +251…" bind:value={manager.phone} maxlength="32" required aria-invalid={!!errorFor('manager.phone')} aria-describedby="manager-phone-error" />
                <p id="manager-phone-error" class="field-error">{errorFor('manager.phone')}</p>
              </div><div>
                <label for="manager-email">Manager’s email <span>(optional)</span></label>
                <input id="manager-email" name="managerEmail" type="email" autocomplete="section-manager email" bind:value={manager.email} maxlength="254" aria-invalid={!!errorFor('manager.email')} aria-describedby="manager-email-error" />
                <p id="manager-email-error" class="field-error">{errorFor('manager.email')}</p>
              </div></div>
            </fieldset>
          {/if}
          <fieldset><legend>{ownerIsManager ? '3' : '4'}. Your access</legend>
            <label for="your-role">Who is completing this setup?</label>
            <select id="your-role" name="registrantRole" bind:value={registrantRole} required disabled={ownerIsManager}>
              <option value="OWNER">I am the business owner</option><option value="MANAGER">I am the authorized administrator / general manager</option>
            </select>
            <p class="hint">We will verify your own phone first. Separate people need their own numbers to sign in.</p>
            <label class="checkbox" for="authority"><input id="authority" name="authorityConfirmed" type="checkbox" bind:checked={authorityConfirmed} required /><span>I am authorized to set up this business and provide these business contacts.</span></label>
            <p class="field-error">{errorFor('authorityConfirmed')}</p>
          </fieldset>
          <button class="primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Review details →'}</button>
          <p class="hint footnote">Names and contact details stay private. No license upload, payment account or plan purchase is needed for this first step.</p>
          <noscript><p class="error-summary">Enable JavaScript to use this setup preview. Nothing has been submitted.</p></noscript>
        </form>
        <DraftImport onImported={resume} replacing={!!draft} />
      {:else}
        <h2 id="review-title" tabindex="-1">Review before verification</h2><p class="hint">Your details passed the format check. No account has been created.</p>
        <dl class="review">
          <dt>Business name</dt><dd>{businessName.trim()}</dd><dt>Business type</dt><dd>{BUSINESS_TYPES.find(type => type.id === businessTypeId)?.name}</dd>
          <dt>Owner</dt><dd>{owner.name.trim()} · {normalizePhone(owner.phone)}{owner.email?.trim() ? ' · ' + owner.email.trim() : ''}</dd>
          <dt>Administrator / general manager</dt><dd>{ownerIsManager ? 'Same person as owner' : manager.name.trim() + ' · ' + normalizePhone(manager.phone) + (manager.email?.trim() ? ' · ' + manager.email.trim() : '')}</dd>
        </dl>
        <button class="secondary" type="button" on:click={() => checked = null}>← Edit details</button>
        <div class="verification"><h3>Phone verification is pending</h3><p>When connected, verification will use <strong>{normalizePhone(contact.phone)}</strong>.{registrantRole === 'MANAGER' ? ' Owner approval will follow before business access is activated.' : ''}</p>
          <button class="primary" type="button" on:click={prepare}>Continue preparing setup →</button><p class="hint">Prepare the branch and menu now. Verification, account access and live publication remain pending.</p>
        </div>
        <h3 class="journey-title">What comes after this?</h3>
        <ol class="journey">{#each nextSteps as next}<li><h4>{next.title}</h4><p>{next.detail}</p></li>{/each}</ol>
        <a class="doc-link" href="/sign-in">See the returning-user sign-in →</a>
      {/if}
    </section>
  </main>
</div>

<style>
  .setup-page { min-height:100vh; background:#f5f3ee; color:#243b35; font-family:system-ui,-apple-system,sans-serif; line-height:1.5; }
  header { max-width:1200px; margin:auto; padding:24px 32px; display:flex; justify-content:space-between; align-items:center; gap:20px; border-bottom:1px solid #dce2da; }
  a { color:#285747; text-decoration:none; } a:hover { text-decoration:underline; }
  .wordmark { font-size:22px; font-weight:800; letter-spacing:-.7px; } .wordmark span { display:block; font-size:11px; font-weight:500; letter-spacing:1px; text-transform:uppercase; }
  .signin { font-size:13px; font-weight:600; }
  main { max-width:1140px; margin:auto; padding:52px 32px 80px; display:grid; grid-template-columns:320px minmax(0,1fr); gap:64px; align-items:start; }
  .intro { position:sticky; top:28px; } .eyebrow { font-size:11px; letter-spacing:1.6px; font-weight:700; color:#63776d; }
  h1 { font-family:Georgia,serif; font-size:42px; font-weight:500; line-height:1.15; margin:18px 0; letter-spacing:-1px; } .intro>p:not(.eyebrow) { color:#63736a; font-size:14px; }
  .steps { list-style-position:inside; margin:30px 0; border-top:1px solid #dce2da; } .steps li { padding:14px 0; border-bottom:1px solid #dce2da; color:#748077; font-size:14px; } .steps .active { color:#214d3b; font-weight:750; }
  .plan-note { background:#e7ede2; padding:20px; border-radius:12px; font-size:14px; } .plan-note p { margin-top:6px; color:#52664f; font-size:13px; }
  .form-panel { background:#fff; border:1px solid #dce2da; border-radius:18px; padding:32px; min-width:0; box-shadow:0 12px 35px #243b3505; }
  .build-notice { background:#faf5e6; border-left:3px solid #b18a3a; border-radius:4px; padding:13px 16px; margin-bottom:24px; color:#6c572d; font-size:12px; } .build-notice p { margin-top:4px; }
  h2 { font-size:24px; letter-spacing:-.5px; } h3 { font-size:18px; } .hint { color:#68786d; font-size:12px; margin-top:7px; line-height:1.6; }
  fieldset { border:0; border-top:1px solid #e8ece6; padding:24px 0 4px; margin-top:28px; min-width:0; } legend { font-size:13px; font-weight:750; padding-right:12px; }
  label { display:block; font-size:13px; font-weight:600; margin:12px 0 7px; } label span { font-weight:400; color:#68786d; }
  input:not([type=checkbox]),select { width:100%; min-height:46px; border:1px solid #c7d2c7; border-radius:7px; padding:10px 12px; font:inherit; font-size:14px; color:#243b35; background:#fff; }
  select { text-overflow:ellipsis; } input::placeholder { color:#7c897e; } input[aria-invalid=true],select[aria-invalid=true] { border-color:#ae382f; }
  input:focus-visible,select:focus-visible,button:focus-visible,a:focus-visible { outline:3px solid #91b6a2; outline-offset:3px; }
  .pair { display:grid; grid-template-columns:1fr 1fr; gap:18px; } .checkbox { display:flex; align-items:flex-start; gap:10px; margin-top:18px; cursor:pointer; } .checkbox input { width:18px; height:18px; flex-shrink:0; accent-color:#285747; margin-top:2px; } .checkbox span { color:#405a4b; }
  .field-error { color:#ae382f; font-size:12px; margin-top:5px; } .field-error:empty { display:none; } .error-summary { background:#fff0ec; padding:12px; margin-top:16px; color:#923128; font-size:13px; border-radius:6px; }
  button { font:inherit; font-size:14px; font-weight:650; border-radius:7px; min-height:46px; padding:12px 20px; cursor:pointer; }
  .primary { border:1px solid #285747; background:#285747; color:#fff; width:100%; margin-top:22px; } .primary:hover:enabled { background:#1c4335; } button:disabled { opacity:.55; cursor:not-allowed; }
  .secondary { border:1px solid #ccd6ca; background:#fff; color:#285747; } .footnote { margin-top:16px; }
  .review { margin:24px 0; } dt { color:#68786d; font-size:12px; margin-top:16px; } dd { font-size:14px; font-weight:600; overflow-wrap:anywhere; }
  .verification { margin-top:28px; border:1px solid #dce2da; border-radius:12px; padding:20px; background:#f7f9f4; } .verification>p { margin-top:8px; font-size:13px; }
  .journey-title { margin-top:34px; } .journey { padding-left:23px; margin:18px 0 24px; } .journey li { padding:0 0 20px 8px; } h4 { font-size:14px; } .journey p { color:#63736a; font-size:13px; margin-top:5px; } .doc-link { font-size:13px; font-weight:650; }
  @media(max-width:850px) { main { grid-template-columns:1fr; gap:28px; padding-top:30px; } .intro { position:static; } h1 { font-size:35px; } h1 br { display:none; } .steps { display:flex; flex-wrap:wrap; gap:12px; margin:20px 0; padding-top:12px; } .steps li { padding:0; border:0; font-size:12px; } .plan-note { padding:14px 18px; } }
  @media(max-width:520px) { header { padding:18px; align-items:start; } .signin { max-width:125px; text-align:right; font-size:12px; } main { padding:20px 16px 44px; gap:20px; } .form-panel { padding:22px 18px; border-radius:12px; } .pair { grid-template-columns:1fr; gap:0; } h1 { font-size:28px; margin:0; } .intro>.eyebrow,.intro>p,.steps,.plan-note { display:none; } }
</style>
