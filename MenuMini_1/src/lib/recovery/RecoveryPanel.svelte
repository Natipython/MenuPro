<script lang="ts">
 import {onMount} from 'svelte';
 import {CommandRecovery} from './client';
 import type {RecoverySnapshot} from './client';
 import {recoveryLabel} from './model';
 export let controller:CommandRecovery;
 export let onBlocked:(blocked:boolean)=>void=()=>{};
 export let onResolved:(state:'COMMITTED'|'CANCELLED',requestKey:string)=>void=()=>{};
 let state:RecoverySnapshot=controller.snapshot();let error='';let cancelReview=false;
 $: onBlocked(!state.ready||state.blocked);
 onMount(()=>{const unsubscribe=controller.subscribe(v=>state=v);controller.initialize().catch(()=>{});const focus=()=>controller.refreshStored().catch(()=>{});window.addEventListener('focus',focus);return()=>{unsubscribe();controller.dispose();window.removeEventListener('focus',focus);};});
 async function check(){error='';cancelReview=false;try{await controller.check();}catch(e){error=e instanceof Error?e.message:'Could not confirm the original result.';}}
 async function retry(){error='';try{const key=state.record!.requestKey;await controller.retry();onResolved('COMMITTED',key);}catch(e){error=e instanceof Error?e.message:'Original result remains unconfirmed.';}}
 async function acknowledge(){error='';try{const key=state.record!.requestKey;const result=await controller.acknowledge();cancelReview=false;onResolved(result,key);}catch(e){error=e instanceof Error?e.message:'Saved attempt could not be cleared.';}}
 async function cancel(){error='';try{const result=await controller.check(true);cancelReview=false;if(result.state==='CANCELLED')await acknowledge();}catch(e){error=e instanceof Error?e.message:'Cancellation is unconfirmed. Do not enter a replacement.';}}
</script>
{#if !state.ready||state.blocked}<section class="recovery" aria-label="Interrupted request recovery">
 <p class="eyebrow">SAVED REQUEST · RECOVERY</p><h2>{state.record?recoveryLabel(state.record.operation):'Check recovery storage'}</h2>
 {#if state.record}<p>Request <strong>{state.record.requestKey}</strong></p><p class="hint">Saved on this device {new Date(state.record.createdAt).toLocaleString('en-GB',{timeZone:'Africa/Addis_Ababa'})} EAT. A reload has not confirmed its outcome.</p>
  {#if state.body}{#if state.body.reportedAmount||state.body.receivedAmount||state.body.amount||state.body.verifiedAmount}<p>Reviewed amount: ETB {String(state.body.reportedAmount||state.body.receivedAmount||state.body.amount||state.body.verifiedAmount)}</p>{/if}{#if state.body.providerReference}<p>Provider reference: {String(state.body.providerReference)}</p>{/if}{#if Array.isArray(state.body.items)}<p>{state.body.items.length} saved order line{state.body.items.length===1?'':'s'}. The original selections and request key will be reused.</p>{/if}{/if}
 {/if}
 {#if state.error||error}<p class="error" role="alert">{error||state.error}</p>{/if}
 {#if state.receipt?.state==='COMMITTED'}<p class="success" role="status"><strong>The original request was recorded.</strong> Result {state.receipt.resultId}. Refresh current status separately; this confirms the earlier action.</p><button type="button" class="primary" disabled={state.working} on:click={acknowledge}>Acknowledge saved result</button>
 {:else if state.receipt?.state==='CANCELLED'}<p class="success" role="status">The original request is cancelled. A delayed copy cannot record it.</p><button type="button" disabled={state.working} on:click={acknowledge}>Acknowledge cancelled request</button>
 {:else if state.record}
  <p>This action may already have saved. Do not create a replacement or repeat a bank transfer because of a timeout.</p>
  {#if state.receipt?.state==='NOT_RECORDED'}<p>Nothing is recorded under this key yet. A delayed request could still arrive. Retry unchanged or confirm cancellation before starting again.</p>{/if}
  {#if cancelReview}<aside><p>Cancel only this unrecorded attempt. If it has already committed, its business record remains and will be shown instead.</p><div class="actions"><button type="button" disabled={state.working} on:click={cancel}>Confirm cancel saved attempt</button><button type="button" disabled={state.working} on:click={()=>cancelReview=false}>Keep saved attempt</button></div></aside>
  {:else}<div class="actions"><button type="button" class="primary" disabled={state.working} on:click={check}>Check original result</button>{#if state.receipt?.state==='NOT_RECORDED'}<button type="button" disabled={state.working||!state.body} on:click={retry}>Retry saved request unchanged</button><button type="button" disabled={state.working} on:click={()=>cancelReview=true}>Review cancellation</button>{/if}</div>{/if}
 {:else}<p>Keep the original fields. A supported action is sent only after its recovery record is saved. Unreadable or lost recovery data requires staff reconciliation.</p><button type="button" disabled={state.working} on:click={()=>controller.initialize(true).catch(()=>{})}>Retry recovery storage</button>{/if}
 <p class="hint">The saved body is encrypted for this session. Access codes, cookies and the encryption secret are never saved here. Browser storage can be cleared or lost; keep the provider record and use staff help when the original session is unavailable.</p>
</section>{/if}
<style>
.recovery{padding:20px;margin:20px 0;border:1px solid #cfb46a;border-radius:12px;background:#fff6d9;color:#403c2b;font:14px Arial,sans-serif;min-width:0}.eyebrow{font-size:11px;letter-spacing:.08em;font-weight:700}h2{font-size:20px;margin:6px 0}p{line-height:1.6;overflow-wrap:anywhere}.hint{font-size:12px;color:#6b6551}.actions{display:flex;gap:10px;flex-wrap:wrap}button{font:inherit;font-size:13px;font-weight:700;min-height:44px;padding:10px 13px;border:1px solid #bcb59c;border-radius:8px;background:#fff;color:#344f3d;cursor:pointer}button:disabled{opacity:.5;cursor:default}.primary{background:#245c4c;color:white;border-color:#245c4c}.error{padding:12px;background:#ffede3;color:#77372c;border-radius:8px}.success{padding:12px;background:#e6f3e7;border-radius:8px}aside{border-top:1px solid #d4c493;margin-top:15px;padding-top:10px}button:focus-visible{outline:3px solid #a5c8b1;outline-offset:2px}@media(max-width:600px){.recovery{padding:17px}.actions button{flex-grow:1}}
</style>
