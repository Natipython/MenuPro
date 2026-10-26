<script lang="ts">
  import { DRAFT_MAX_BYTES, SETUP_ISSUE_MESSAGES, validateSetupDraft } from './setup';
  import type { SetupDraft } from './setup';
  export let onImported: (draft: SetupDraft) => void;
  export let replacing = false;
  let busy = false;
  let message = '';
  async function readDraft(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    busy = true; message = '';
    try {
      if (file.size > DRAFT_MAX_BYTES) throw new Error('Choose a setup draft smaller than 256 KB.');
      const value: unknown = JSON.parse(await file.text());
      const local = validateSetupDraft(value);
      if (local.errors.length) throw new Error(SETUP_ISSUE_MESSAGES[local.errors[0].code] || 'The draft format is invalid.');
      const response = await fetch('/api/v2/onboarding/setup-validation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'The draft check could not finish. Try again.');
      if (replacing && !window.confirm('Replace the current branch and menu draft with this file?')) return;
      // Only validated preparation data is accepted. A file cannot grant identity/access.
      onImported(value as SetupDraft);
    } catch (error) {
      message = error instanceof SyntaxError ? 'Choose a valid JSON setup draft.'
        : error instanceof Error ? error.message : 'The file could not be read.';
    } finally { busy = false; input.value = ''; }
  }
</script>

<div class="import-draft">
  <label>Resume an exported setup draft<input type="file" accept=".json,application/json" on:change={readDraft} disabled={busy} /></label>
  <p>{busy ? 'Checking the file…' : 'Imports the branch and menu only. Owner and manager contacts are never included.'}</p>
  {#if message}<p class="error" role="alert">{message}</p>{/if}
</div>

<style>
  .import-draft { margin-top:24px; padding:16px; background:#f7f9f4; border:1px solid #dce2da; border-radius:9px; }
  label { display:block; font-size:13px; font-weight:650; color:#294d3c; }
  input { display:block; max-width:100%; margin-top:10px; font:inherit; font-size:12px; }
  p { font-size:12px; color:#68786d; line-height:1.6; margin-top:8px; } .error { color:#923128; }
</style>
