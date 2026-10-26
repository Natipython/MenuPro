<script lang="ts">
  import { MINI_MENU_TEMPLATES } from '$lib/types/miniTemplates';
  import { DAYS } from './setup';
  import type { SetupDraft } from './setup';
  export let draft: SetupDraft;
  $: theme = MINI_MENU_TEMPLATES.find(theme => theme.id === draft.menu.themeId) || MINI_MENU_TEMPLATES[0];
  $: populated = draft.menu.sections.filter(section => section.items.length);
</script>

<div class="customer-preview" aria-label="Customer menu draft preview"
  style:background={theme.theme.bg} style:color={theme.theme.text} style:--menu-surface={theme.theme.surface}
  style:--menu-primary={theme.theme.primary} style:--menu-radius={theme.theme.borderRadius}>
  <div class="draft-banner">DRAFT PREVIEW · MENU ONLY · NOT PUBLISHED</div>
  <div class="venue"><p>{draft.branch.name}</p><h3>{draft.branch.publicName}</h3>
    <p>{[draft.branch.city, draft.branch.area].filter(Boolean).join(' · ')}</p>
    <p>{draft.branch.landmark}</p>
    {#if draft.branch.publicPhone?.trim()}<p>Customer contact: {draft.branch.publicPhone}</p>{/if}
  </div>
  <p class="currency">Prices in ETB · Ordering is unavailable in this draft</p>
  {#each populated as section (section.id)}
    <section><h4>{section.name}{#if section.nameAm?.trim()}<span lang="am">{section.nameAm}</span>{/if}</h4>
      {#each section.items as item (item.id)}
        <article class:unavailable={!item.available}>
          <div><h5>{item.name}{#if item.nameAm?.trim()}<span lang="am">{item.nameAm}</span>{/if}</h5>
            {#if item.description}<p class="description">{item.description}</p>{/if}
            {#if !item.available}<p class="availability">Currently unavailable</p>{/if}
          </div><strong class="price">{item.price}<small>ETB</small></strong>
        </article>
      {/each}
    </section>
  {:else}<p class="empty">Your menu is empty. Add your own items and prices to see them here.</p>{/each}
  <details class="hours"><summary>Opening hours · Addis Ababa time</summary>
    <dl>{#each [...draft.branch.hours].sort((a, b) => a.day - b.day) as hours}
      <dt>{DAYS[hours.day]}</dt><dd>{hours.status === 'OPEN' ? `${hours.opens}–${hours.closes}${hours.overnight ? ' (next day)' : ''}` : hours.status === 'CLOSED' ? 'Closed' : 'Hours not provided'}</dd>
    {/each}</dl>
  </details>
</div>

<style>
  .customer-preview { max-width:390px; margin:24px auto; border-radius:18px; overflow:hidden; border:5px solid #273d35; font-family:system-ui,sans-serif; overflow-wrap:anywhere; }
  .draft-banner { background:#fff6d5; color:#5f4b20; padding:10px 14px; font-size:10px; font-weight:750; letter-spacing:.5px; text-align:center; }
  .venue { padding:24px 20px 12px; } .venue h3 { font-family:Georgia,serif; font-size:26px; line-height:1.2; margin:6px 0 10px; }
  .venue p { font-size:11px; line-height:1.6; opacity:.8; } .currency { padding:12px 20px; font-size:10px; opacity:.85; border-top:1px solid #ffffff20; }
  section { padding:12px 16px; } h4 { color:var(--menu-primary); font-size:15px; margin:0 4px 12px; }
  h4 span,h5 span { display:block; font-weight:500; margin-top:4px; } article { background:var(--menu-surface); border-radius:var(--menu-radius); padding:14px; display:flex; gap:14px; justify-content:space-between; margin:8px 0; }
  article>div { min-width:0; } h5 { font-size:13px; } .description { font-size:11px; line-height:1.6; opacity:.75; margin-top:7px; white-space:pre-wrap; }
  .price { font-size:14px; white-space:nowrap; font-variant-numeric:tabular-nums; } .price small { display:block; font-size:9px; opacity:.7; font-weight:500; text-align:right; }
  .unavailable { opacity:.65; } .availability { font-size:10px; margin-top:8px; } .empty { padding:24px; font-size:12px; opacity:.8; }
  .hours { margin:20px; font-size:11px; } summary { cursor:pointer; } dl { display:grid; grid-template-columns:1fr 1.2fr; gap:7px; margin-top:12px; opacity:.85; }
</style>
