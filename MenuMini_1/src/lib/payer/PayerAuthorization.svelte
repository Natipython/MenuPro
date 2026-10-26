<script lang="ts">
 import {onMount} from 'svelte';
 import {ServiceClientError} from '$lib/service/client';
 import type {Bill} from '$lib/cashier/model';
 import type {PayerStaffGateway} from './client';
 import type {PayerCandidates,BillGrant,PayerStaffOperation} from './model';
 export let bill:Bill;
 export let tableLabel:string;
 export let gateway:PayerStaffGateway;
 export let blocked=false;
 export let onReviewState:(value:boolean)=>void=()=>{};
 let candidates:PayerCandidates|null=null;let guestSessionId='';let issued:BillGrant|null=null;let error='';let message='';let busy=false;
 let review:{op:'ISSUE'|'REVOKE';resource:string;body:Record<string,unknown>;deviceCode:string}|null=null;
 let pending:{op:PayerStaffOperation;resource:string;body:Record<string,unknown>;key:string}|null=null;
 $: onReviewState(!!review||!!pending||!!issued);
 $: candidate=candidates?.items.find(c=>c.guestSessionId===guestSessionId);
 const date=(value:string)=>new Intl.DateTimeFormat('en-ET',{timeStyle:'short',timeZone:'Africa/Addis_Ababa'}).format(new Date(value));
 async function refresh(){if(busy||pending||review||blocked)return;busy=true;error='';try{candidates=await gateway.call<PayerCandidates>('CANDIDATES',bill.id);if(!candidates.items.some(c=>c.guestSessionId===guestSessionId))guestSessionId='';}catch(e){error=e instanceof Error?e.message:'Joined devices unavailable.';}finally{busy=false;}}
 onMount(()=>{refresh();const beforeUnload=(e:BeforeUnloadEvent)=>{if(pending){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);});
 function prepare(op:'ISSUE'|'REVOKE'){
  if(!candidate||blocked||busy||review||pending||issued)return;
  if(op==='REVOKE'&&!candidate.grant?.active)return;
  review={op,resource:op==='ISSUE'?bill.id:candidate.grant!.id,deviceCode:candidate.deviceCode,body:op==='ISSUE'?{guestSessionId:candidate.guestSessionId,expectedBillVersion:bill.version}:{expectedVersion:candidate.grant!.version}};error='';message='';
 }
 async function execute(command:NonNullable<typeof pending>){
  if(busy||blocked)return;pending=command;busy=true;error='';message='';
  try{
   const result=await gateway.call<BillGrant>(command.op,command.resource,command.body,command.key);pending=null;review=null;
   if(command.op==='ISSUE'){if(result.active)issued=result;else message='The original authorization is no longer active. Refresh joined devices before issuing another code.';}
   else message='Selected shared bill access revoked. Financial records are unchanged.';
   busy=false;await refresh();
  }catch(e){if(e instanceof ServiceClientError&&e.status>0&&e.status<500){pending=null;review=null;}error=e instanceof Error?e.message:'Authorization interrupted. Retry unchanged.';}finally{busy=false;}
 }
</script>
<section class="authorization" aria-label="Payer authorization">
 <h2>Authorize a payer</h2><p>Ask the guest to show their device code. Authorization shares the whole bill for this seating, including other diners’ accepted charges.</p>
 {#if error}<p class="error" role="alert">{error}</p>{/if}{#if message}<p class="message" role="status">{message}</p>{/if}
 {#if pending&&!busy}<aside><strong>Authorization result not confirmed.</strong><p>Retry the unchanged action before creating another code.</p><button type="button" disabled={blocked} on:click={()=>pending&&execute(pending)}>Retry unchanged authorization</button></aside>{/if}
 {#if issued}<aside><h3>Private bill access code</h3><p>{tableLabel} · Device {candidates?.items.find(c=>c.guestSessionId===issued?.guestSessionId)?.deviceCode} · Expires {date(issued.expiresAt)} EAT</p><label for="issued-bill-code">Give this code only to the selected guest</label><input id="issued-bill-code" value={issued.accessToken} readonly autocomplete="off" spellcheck={false}/><p>It works only with that guest’s current table session. A new authorization replaces their previous code.</p><button type="button" on:click={()=>issued=null}>Hide bill access code</button></aside>
 {:else if review}<aside><h3>{review.op==='ISSUE'?'Share this table bill':'Revoke shared bill access'}</h3><p>{tableLabel} · Bill {bill.id.slice(-8)} · Device <strong>{review.deviceCode}</strong></p><p>{review.op==='ISSUE'?'This guest can view all accepted charges and report transfers already sent. Access expires within one hour.':'This device will lose shared bill access. Its own orders and existing financial records remain available through their normal permissions.'}</p><p>Current outstanding balance: ETB {bill.outstandingAmount}</p><div class="actions"><button type="button" class="primary" disabled={blocked||busy||!!pending} on:click={()=>review&&execute({...review,key:crypto.randomUUID()})}>{review.op==='ISSUE'?'Confirm payer authorization':'Confirm payer revocation'}</button><button type="button" disabled={busy||!!pending} on:click={()=>review=null}>Cancel authorization review</button></div></aside>
 {:else}
  <label for="payer-device">Joined guest device</label><select id="payer-device" bind:value={guestSessionId} disabled={blocked||busy||!!pending}><option value="">Choose the code shown on the guest’s phone</option>{#each candidates?.items||[] as entry}<option value={entry.guestSessionId}>{entry.deviceCode}{entry.grant?.active?' · bill access active':''}</option>{/each}</select>
  {#if candidate?.grant?.active}<p>Bill access expires {date(candidate.grant.expiresAt)} EAT.</p>{/if}
  <div class="actions"><button type="button" class="primary" disabled={blocked||busy||!!pending||!candidate} on:click={()=>prepare('ISSUE')}>{candidate?.grant?.active?'Replace payer authorization':'Review payer authorization'}</button><button type="button" disabled={blocked||busy||!!pending||!candidate?.grant?.active} on:click={()=>prepare('REVOKE')}>Revoke payer access</button><button type="button" disabled={blocked||busy||!!pending} on:click={refresh}>Refresh joined devices</button></div>
  {#if candidates&&!candidates.items.length}<p>No joined active guest devices. Staff must first confirm the seating and invite the guest.</p>{/if}
 {/if}
 {#if blocked}<p>Finish the current settlement action before changing payer authorization.</p>{/if}
</section>
<style>
.authorization{min-width:0;border:1px solid #d9e1d5;border-radius:14px;padding:22px;background:#fff;font:14px Arial,sans-serif;color:#233b32}h2{font-size:20px;margin:0}h3{font-size:17px}p{line-height:1.6;overflow-wrap:anywhere}label{display:block;margin:16px 0 7px;font-weight:700}input,select{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:11px;border:1px solid #c6d1c1;border-radius:8px;background:#fff;color:inherit;font:inherit}input{font-family:monospace}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}button{font:inherit;font-size:13px;font-weight:700;min-height:44px;padding:10px 13px;border:1px solid #c4d0c1;border-radius:8px;background:#fff;color:#2a4b3c;cursor:pointer}button:disabled{opacity:.5;cursor:default}.primary{background:#245c4c;color:white;border-color:#245c4c}aside{border:1px solid #d8c483;background:#fff6d9;padding:18px;border-radius:12px;margin-top:18px}.error,.message{padding:14px;border-radius:9px}.error{background:#fff0e9;color:#7b3328}.message{background:#e6f3e7}button:focus-visible,input:focus,select:focus{outline:3px solid #a5c8b1;outline-offset:2px}@media(max-width:600px){.authorization{padding:17px}.actions button{flex-grow:1}}
</style>
