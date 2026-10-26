<script lang="ts">
  import { BUSINESS_TYPES } from '$lib/onboarding/registration';
  import { validateSetupDraft } from '$lib/onboarding/setup';
  import type { SetupDraft } from '$lib/onboarding/setup';
  import { validateWorkspace, workspaceFromSetup, newWorkspacePreparation, WORKSPACE_MAX_BYTES } from '$lib/workspace/model';
  import type { WorkspacePreparation } from '$lib/workspace/model';
  import MerchantWorkspace from '$lib/workspace/MerchantWorkspace.svelte';
  let draft: WorkspacePreparation | null = null;
  let publicName = ''; let businessTypeId = BUSINESS_TYPES[0].id; let error = '';
  function start() { draft = newWorkspacePreparation(publicName,businessTypeId); }
  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; error = '';
    if (!file) return;
    try {
      if (file.size > WORKSPACE_MAX_BYTES) throw new Error('Choose a draft smaller than 1152 KB.');
      const value = JSON.parse(await file.text());
      if (value?.format === 'menumini-setup-draft') {
        if (validateSetupDraft(value).errors.length) throw new Error('This setup draft has unsupported or invalid fields.');
        draft = workspaceFromSetup(value as SetupDraft);
      } else {
        if (validateWorkspace(value).errors.length) throw new Error('This workspace draft has unsupported or invalid fields.');
        draft = value;
      }
    } catch (e) { error = e instanceof Error ? e.message : 'The draft could not be read.'; }
    finally { input.value = ''; }
  }
</script>
<svelte:head><title>Prepare your business workspace · MenuMini</title><meta name="robots" content="noindex" /></svelte:head>
{#if draft}<MerchantWorkspace bind:draft />{:else}<main class="welcome"><a href="/" class="brand">MenuMini</a><p class="eyebrow">CONTINUE YOUR SETUP</p><h1>Menu, people and service.<br />Prepare them together.</h1>
  <p>Continue from a downloaded setup or workspace draft, or start a new preparation. Verified business access comes later.</p>
  <section><h2>Resume a draft</h2><label for="workspace-import">Choose your MenuMini JSON draft</label><input id="workspace-import" type="file" accept="application/json,.json" on:change={importFile} />
    <p class="hint">Setup drafts and workspace drafts are supported. Your file stays in this browser unless you request a validation check.</p>{#if error}<p role="alert" class="error">{error}</p>{/if}</section>
  <section><h2>Start a preparation</h2><form on:submit|preventDefault={start}><label for="workspace-start-name">Public business name</label><input id="workspace-start-name" bind:value={publicName} required maxlength="160" />
    <label for="workspace-start-type">Business type</label><select id="workspace-start-type" bind:value={businessTypeId}>{#each BUSINESS_TYPES as type}<option value={type.id}>{type.name}</option>{/each}</select>
    <button type="submit">Prepare workspace →</button></form><p class="hint">This creates a preparation on this page. Download it after review to resume later.</p></section>
  <a href="/onboarding">Business registration and first setup →</a>
</main>{/if}
<style>
  :global(body){background:#f5f6f3}.welcome{max-width:640px;padding:clamp(20px,5vw,48px);margin:0 auto;color:#21322e;font-family:Arial,sans-serif}h1{font-size:clamp(28px,5vw,42px);line-height:1.15;margin:12px 0 18px}h2{font-size:19px;margin:0 0 18px}p{line-height:1.6}section{background:#fff;border:1px solid #d9e1d4;border-radius:14px;padding:22px;margin:24px 0}.brand{font-size:22px;font-weight:800;text-decoration:none;color:#245c4c}.eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;color:#5d7363;margin-top:26px}label{display:block;font-size:14px;font-weight:700;margin:15px 0 8px}input,select{width:100%;min-height:44px;box-sizing:border-box;border:1px solid #c7d2c3;border-radius:8px;padding:11px;background:#fff;color:#21322e;font:inherit}button{background:#245c4c;border:0;border-radius:8px;color:#fff;padding:13px 18px;font:inherit;font-weight:700;margin-top:20px;min-height:44px;cursor:pointer}.hint{font-size:13px;color:#627665}a{color:#245c4c}.error{background:#fff0e9;color:#7b3328;padding:12px;border-radius:8px}input:focus,select:focus,button:focus-visible{outline:3px solid #a8c5b4;outline-offset:2px}
</style>
