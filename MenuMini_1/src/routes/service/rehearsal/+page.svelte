<script lang="ts">
  import GuestBoard from '$lib/guest/GuestBoard.svelte';
  import CashierBoard from '$lib/cashier/CashierBoard.svelte';
  import ServiceBoard from '$lib/service/ServiceBoard.svelte';
  import {rehearsalGateway,REHEARSAL_BRANCH} from '$lib/service/rehearsal';
  const gateway=rehearsalGateway();
  let reviewOpen=false;
  function onReviewState(blocked:boolean){reviewOpen=blocked;}
  let view:'FLOOR'|'PREPARATION'|'CASHIER'|'MANAGER'|'GUEST_A'|'GUEST_B'='FLOOR';
  function switchView(value:typeof view){if(reviewOpen)return;view=value;gateway.setPreparationOnly(value==='PREPARATION');gateway.cashier.setManager(value==='MANAGER');}
</script>
<svelte:head><title>{view==='GUEST_A'||view==='GUEST_B'?'Guest rehearsal · MenuMini':view==='CASHIER'||view==='MANAGER'?'Cashier rehearsal · MenuMini':'Fictional service rehearsal · MenuMini'}</title><meta name="robots" content="noindex" /></svelte:head>
<nav aria-label="Rehearsal workflow view"><button type="button" disabled={reviewOpen} aria-pressed={view==='FLOOR'} on:click={()=>switchView('FLOOR')}>Floor & owner view</button><button type="button" disabled={reviewOpen} aria-pressed={view==='PREPARATION'} on:click={()=>switchView('PREPARATION')}>Preparation staff view</button><button type="button" disabled={reviewOpen} aria-pressed={view==='CASHIER'} on:click={()=>switchView('CASHIER')}>Cashier view</button><button type="button" disabled={reviewOpen} aria-pressed={view==='MANAGER'} on:click={()=>switchView('MANAGER')}>Manager settlement view</button><button type="button" disabled={reviewOpen} aria-pressed={view==='GUEST_A'} on:click={()=>switchView('GUEST_A')}>Guest A</button><button type="button" disabled={reviewOpen} aria-pressed={view==='GUEST_B'} on:click={()=>switchView('GUEST_B')}>Guest B</button></nav>
{#if reviewOpen}<p class="view-note">Submit or cancel the current draft/review before changing rehearsal roles.</p>{/if}
{#key view}{#if view==='GUEST_A'||view==='GUEST_B'}<GuestBoard {onReviewState} gateway={view==='GUEST_A'?gateway.guestA:gateway.guestB} payerGateway={view==='GUEST_A'?gateway.guestA.payer:gateway.guestB.payer} rehearsal={true} guestLabel={view==='GUEST_A'?'Guest A':'Guest B'}/>{:else if view==='CASHIER'||view==='MANAGER'}<CashierBoard {onReviewState} gateway={gateway.cashier} payerGateway={gateway.cashierPayers} branchId={REHEARSAL_BRANCH} rehearsal={true}/>{:else}<ServiceBoard {onReviewState} {gateway} branchId={REHEARSAL_BRANCH} rehearsal={true} canManageTables={view==='FLOOR'} preparationOnly={view==='PREPARATION'}/>{/if}{/key}
<style>nav{display:flex;gap:12px;flex-wrap:wrap;padding:16px 24px;background:#edf2e9}button{font:inherit;font-size:13px;padding:10px 14px;min-height:44px;border:1px solid #bdcdbb;border-radius:8px;background:#fff;color:#245c4c;cursor:pointer}button[aria-pressed=true]{background:#245c4c;color:#fff}.view-note{margin:0;padding:12px 24px;background:#fff6d9;color:#5c4d27;font:14px Arial,sans-serif}button:disabled{opacity:.5;cursor:default}</style>
