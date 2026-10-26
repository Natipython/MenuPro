<script lang="ts">
 import RecoveryPanel from '$lib/recovery/RecoveryPanel.svelte';
 import {CommandRecovery,RecoveryError,httpRecoveryTransport} from '$lib/recovery/client';

 import {onMount} from 'svelte';
 import {GuestClientError} from '$lib/guest/client';
 import type {PayerGateway} from './client';
 import {deviceCode,validatePayerCommand} from './model';
 import type {PayerDetail,PayerClaimList,PayerOperation} from './model';
 export let gateway:PayerGateway;
 export let sessionId:string;
 export let venueId='';
 export let csrfToken='';
 export let rehearsal=false;
 let recovery:CommandRecovery|null=null;let recoveryBlocked=false;
 export let blocked=false;
 export let onReviewState:(value:boolean)=>void=()=>{};
 let detail:PayerDetail|null=null;let accessToken='';let error='';let message='';let busy=false;let reading=false;let loading=true;
 let reportOpen=false;let reportReview=false;let leaveReview=false;let amount='';let reference='';let accountId='';let transferSent=false;
 let pending:{op:PayerOperation;body:Record<string,unknown>;key:string}|null=null;
 $: account=detail?.accounts.find(a=>a.id===accountId);
 $: reviewing=reportOpen||leaveReview||!!pending||!!accessToken.trim()||recoveryBlocked;
 $: onReviewState(reviewing);
 const date=(v:string)=>new Intl.DateTimeFormat('en-ET',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Addis_Ababa'}).format(new Date(v));
 async function refresh(announce=false){
  if(busy||reading||pending||reportOpen||leaveReview)return;reading=true;
  try{detail=await gateway.call<PayerDetail>('DETAIL');if(announce)message='Shared bill refreshed.';}
  catch(e){if(e instanceof GuestClientError&&[401,403].includes(e.status)){detail=null;if(announce)error=e.message;}else error=e instanceof Error?e.message:'Bill unavailable.';}
  finally{loading=false;reading=false;}
 }
 onMount(()=>{
  if(!rehearsal&&venueId&&csrfToken){recoveryBlocked=true;recovery=new CommandRecovery('PAYER',{scope:venueId+':'+sessionId,secret:csrfToken},httpRecoveryTransport('PAYER','',()=>csrfToken),c=>{if(detail?.bill.id!==c.resourceId)throw new RecoveryError('Restore the original bill access before retrying this report.',true);return gateway.call('CLAIM',c.body,c.requestKey);});}
  refresh();const timer=setInterval(()=>{if(detail&&!document.hidden&&!blocked&&!reviewing)refresh();},15000);
  const beforeUnload=(e:BeforeUnloadEvent)=>{const saved=!!pending&&pending.key===recovery?.snapshot().record?.requestKey;if(!saved&&(pending||reportOpen)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',beforeUnload);
  return()=>{clearInterval(timer);window.removeEventListener('beforeunload',beforeUnload);};
 });
 async function execute(command:NonNullable<typeof pending>){
  if(busy||reading||blocked)return;pending=command;busy=true;error='';message='';
  try{
   if(command.op==='CLAIM'&&recovery&&detail)await recovery.run({operation:'CLAIM',resourceId:detail.bill.id,body:command.body,requestKey:command.key});else await gateway.call(command.op,command.body,command.key);pending=null;
   if(command.op==='BIND'){accessToken='';message='Staff-authorized bill access is ready.';}
   if(command.op==='CLAIM'){reportOpen=false;reportReview=false;amount='';reference='';transferSent=false;message='Transfer report saved for staff review. This report does not mark the bill paid.';}
   if(command.op==='LEAVE'){detail=null;leaveReview=false;message='Shared bill access ended. Your own orders remain available.';return;}
   busy=false;await refresh();
  }catch(e){
   if(e instanceof RecoveryError&&e.notSent)pending=null;
   if(e instanceof GuestClientError&&e.status>0&&e.status<500&&!recovery?.snapshot().blocked){pending=null;if([401,403].includes(e.status)){detail=null;reportOpen=false;reportReview=false;leaveReview=false;}if(e.status===409){reportReview=false;reportOpen=false;busy=false;await refresh();}}
   error=e instanceof Error?e.message:'Result interrupted. Retry unchanged.';
  }finally{busy=false;}
 }
 function command(op:PayerOperation,body:Record<string,unknown>={}){
  if(blocked||busy||reading||pending||(recoveryBlocked&&op!=='BIND'))return;const errors=validatePayerCommand(op,body);if(errors.length){error='Check the exact amount, provider reference, receiving account and already-sent confirmation.';return;}
  execute({op,body:structuredClone(body),key:crypto.randomUUID()});
 }
 function reviewReport(){
  const body={accountId,destinationFingerprint:account?.destinationFingerprint,reportedAmount:amount,providerReference:reference.trim(),transferSent};
  if(validatePayerCommand('CLAIM',body).length){error='Use a positive amount with two decimals, the exact provider reference and confirmation that you already sent it.';return;}error='';reportReview=true;
 }
 async function recovered(state:'COMMITTED'|'CANCELLED',key:string){const originalDraft=pending?.key===key;recoveryBlocked=false;pending=null;if(originalDraft){reportOpen=false;reportReview=false;leaveReview=false;amount='';reference='';transferSent=false;}error='';message=state==='COMMITTED'?'The earlier transfer report was recorded. Staff still verify received funds.':'The saved report attempt is cancelled. This did not cancel or reverse a bank transfer.';await refresh();}
 async function more(){if(!detail?.claims.nextCursor||busy||reading||pending||blocked||reviewing)return;reading=true;try{const page=await gateway.call<PayerClaimList>('CLAIMS',{cursor:detail.claims.nextCursor});const map=new Map(detail.claims.items.map(c=>[c.claim.id,c]));page.items.forEach(c=>map.set(c.claim.id,c));detail={...detail,claims:{items:[...map.values()],nextCursor:page.nextCursor}};}catch(e){error=e instanceof Error?e.message:'Report history unavailable.';}finally{reading=false;}}
</script>
<section class="payer" aria-label="Shared table bill">
 <div class="heading"><h2>Shared table bill</h2>{#if detail}<button type="button" disabled={blocked||busy||reading||reviewing} on:click={()=>refresh(true)}>Refresh shared bill</button>{/if}</div>
 <p class="device">Your device code <strong>{deviceCode(sessionId)}</strong></p>
 {#if error}<p class="error" role="alert">{error}</p>{/if}{#if message}<p class="message" role="status">{message}</p>{/if}
 {#if recovery}{#key recovery}<RecoveryPanel controller={recovery} onBlocked={value=>recoveryBlocked=value} onResolved={recovered}/>{/key}{/if}
 {#if pending&&!busy&&!recovery?.snapshot().blocked}<aside class="review"><strong>Report or access result not confirmed.</strong><p>Keep this page open. Retry the same request before entering another report. Never repeat the bank transfer to retry this screen.</p><button type="button" disabled={blocked||reading} on:click={()=>pending&&execute(pending)}>Retry unchanged bill request</button></aside>{/if}
 {#if loading}<p>Checking bill access…</p>{:else if !detail}
  <p>Show your device code to the cashier. With their authorization, you can see the whole table bill and report a transfer already sent.</p>
  <form on:submit|preventDefault={()=>command('BIND',{accessToken:accessToken.trim()})}>
   <label for="payer-code">Private bill access code from cashier</label><input id="payer-code" bind:value={accessToken} maxlength="43" autocomplete="off" autocapitalize="none" spellcheck={false} disabled={blocked||busy||reading||!!pending}/>
   <div class="actions"><button type="submit" class="primary" disabled={blocked||busy||reading||!!pending||accessToken.trim().length!==43}>Open authorized bill</button><button type="button" disabled={busy||!!pending} on:click={()=>accessToken=''}>Clear bill code</button></div>
  </form>
 {:else}
  <p>{detail.tableLabel} · Bill {detail.bill.id.slice(-8)} · {detail.bill.status} · Access until {date(detail.expiresAt)} EAT</p>
  <dl><dt>Accepted charges after corrections</dt><dd>ETB {detail.bill.chargeAmount}</dd><dt>Verified funds allocated</dt><dd>ETB {detail.bill.allocatedAmount}</dd><dt>Still outstanding</dt><dd><strong>ETB {detail.bill.outstandingAmount}</strong></dd></dl>
  <p class="settlement">{detail.bill.settlement.replaceAll('_',' ')}</p>
  {#if detail.bill.status==='OPEN'}<p class="hint">The bill can change when staff accept another order or record a correction. Refresh and confirm the current amount with the cashier.</p>{/if}
  {#if detail.bill.unappliedAmount!=='0.00'}<p>Received funds awaiting allocation or return: ETB {detail.bill.unappliedAmount}. Ask the cashier to resolve them.</p>{/if}
  <details><summary>Accepted orders and corrections ({detail.orders.length})</summary>{#each detail.orders as order}<article><strong>Order {order.id.slice(-8)} · {order.status} · Net ETB {order.netChargeAmount}</strong><ul>{#each order.items as line}<li>{line.quantity} × {line.nameEn}{#if line.nameAm}<span lang="am"> · {line.nameAm}</span>{/if} · {line.selectedOptions.join(', ')} · ETB {line.lineTotal}</li>{/each}</ul>{#if order.creditedAmount!=='0.00'}<p>Order correction: ETB {order.creditedAmount}</p>{/if}</article>{/each}</details>
  <details><summary>Verified receiving accounts ({detail.accounts.length})</summary><p class="hint">Confirm the holder and destination in your banking app before sending funds. MenuMini does not initiate a transfer.</p>{#each detail.accounts as destination}<article><strong>{destination.provider} · {destination.holderName}</strong><p class="account">{destination.accountIdentifier}</p></article>{:else}<p>Ask the cashier for a verified receiving method.</p>{/each}</details>
  <div class="actions"><button type="button" class="primary" disabled={blocked||busy||reading||reviewing||!detail.accounts.length||detail.claims.items.some(c=>c.claim.status==='SUBMITTED')} on:click={()=>{reportOpen=true;reportReview=false;accountId=detail!.accounts[0]?.id||'';amount='';reference='';transferSent=false;error='';}}>Report a transfer already sent</button><button type="button" disabled={blocked||busy||reading||reviewing} on:click={()=>leaveReview=true}>End shared bill access</button></div>
  {#if reportOpen}<form class="review" aria-label="Transfer report" on:submit|preventDefault={()=>reportReview?command('CLAIM',{accountId,destinationFingerprint:account?.destinationFingerprint,reportedAmount:amount,providerReference:reference.trim(),transferSent}):reviewReport()}>
   <h3>{reportReview?'Review your transfer report':'Report money already sent'}</h3><p>Report evidence for staff to verify. A report, reference or screenshot alone does not pay the bill.</p>
   {#if reportReview}<p><strong>Reported ETB {amount}</strong> · {reference.trim()}</p><p>{account?.provider} · {account?.holderName} · <span class="account">{account?.accountIdentifier}</span></p>
   {:else}<label for="payer-account">Receiving account used</label><select id="payer-account" bind:value={accountId} disabled={busy||!!pending}>{#each detail.accounts as destination}<option value={destination.id}>{destination.provider} · {destination.holderName} · …{destination.accountIdentifier.slice(-4)}</option>{/each}</select>
    <label for="payer-amount">Amount already sent (ETB)</label><input id="payer-amount" bind:value={amount} inputmode="decimal" placeholder="100.00" disabled={busy||!!pending}/>
    <label for="payer-reference">Provider transfer reference</label><input id="payer-reference" bind:value={reference} maxlength="120" autocomplete="off" disabled={busy||!!pending}/>
    <label class="check"><input type="checkbox" bind:checked={transferSent} disabled={busy||!!pending}/>I have already sent this transfer to the selected account.</label>
   {/if}
   <div class="actions"><button type="submit" class="primary" disabled={blocked||busy||!!pending}>{reportReview?'Submit transfer report':'Review transfer report'}</button>{#if reportReview}<button type="button" disabled={busy||!!pending} on:click={()=>reportReview=false}>Edit report</button>{/if}<button type="button" disabled={busy||!!pending} on:click={()=>{reportOpen=false;reportReview=false;}}>Cancel report</button></div>
  </form>{/if}
  {#if leaveReview}<aside class="review"><p>End this device’s shared bill access. Your own-order session continues.</p><div class="actions"><button type="button" disabled={blocked||busy||!!pending} on:click={()=>command('LEAVE')}>Confirm end bill access</button><button type="button" disabled={busy||!!pending} on:click={()=>leaveReview=false}>Keep bill access</button></div></aside>{/if}
  <h3>Your transfer reports</h3>{#each detail.claims.items as entry}<article><strong>Reported ETB {entry.claim.reportedAmount} · {entry.claim.status==='SUBMITTED'?'Waiting for staff verification':entry.claim.status}</strong><p>{entry.providerReference} · {entry.accountLabel}</p>{#if entry.verifiedReceivedAmount!==null}<p>Staff recorded received funds: ETB {entry.verifiedReceivedAmount}. The bill balance reflects funds allocated to it.</p>{:else if entry.claim.status==='REJECTED'}<p>Staff could not verify this report. Speak to the cashier before correcting it; do not repeat the transfer.</p>{:else}<p class="hint">This report has not established received funds. Keep the provider record and ask the cashier for help.</p>{/if}</article>{:else}<p class="hint">You have not reported a transfer for this bill.</p>{/each}
  {#if detail.claims.nextCursor}<button type="button" disabled={blocked||busy||reading||reviewing} on:click={more}>Load more transfer reports</button>{/if}
 {/if}
 {#if blocked}<p class="hint">Finish or cancel your order draft before changing bill access or reporting funds.</p>{/if}
</section>
<style>
.payer{min-width:0;border:1px solid #d9e1d5;border-radius:14px;padding:22px;background:#fff;margin:24px 0;font:14px Arial,sans-serif;color:#233b32}.heading,.actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.heading{justify-content:space-between}h2{font-size:20px;margin:0}h3{font-size:17px;margin-top:24px}p{line-height:1.6;overflow-wrap:anywhere}.device{background:#edf2e9;border-radius:8px;padding:12px}.device strong{font-family:monospace;letter-spacing:.08em;white-space:nowrap}.hint{color:#607266;font-size:13px}dl{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;margin:24px 0}dd{margin:0;text-align:right}.settlement{font-size:13px;font-weight:bold}label{display:block;margin:16px 0 7px;font-weight:700}input,select{font:inherit;box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:11px;border:1px solid #c6d1c1;border-radius:8px;background:#fff;color:inherit}button{font:inherit;font-weight:700;font-size:13px;min-height:44px;padding:10px 13px;border:1px solid #c4d0c1;border-radius:8px;background:#fff;color:#2a4b3c;cursor:pointer}button:disabled{opacity:.5;cursor:default}.primary{background:#245c4c;color:white;border-color:#245c4c}.actions{margin-top:16px}.review{border:1px solid #d8c483;background:#fff6d9;padding:18px;border-radius:12px;margin-top:18px}.error,.message{padding:14px;border-radius:9px}.error{background:#fff0e9;color:#7b3328}.message{background:#e6f3e7}.check{display:flex;align-items:center;gap:10px;font-weight:400}.check input{width:20px;min-height:20px;flex-shrink:0}article{border-top:1px solid #dce5d8;padding:14px 0}details{margin:16px 0;border-top:1px solid #dce5d8;padding-top:14px}summary{cursor:pointer;min-height:32px;font-weight:700}.account{font-family:monospace;overflow-wrap:anywhere}li{overflow-wrap:anywhere;line-height:1.7}button:focus-visible,input:focus,select:focus{outline:3px solid #a5c8b1;outline-offset:2px}@media(max-width:600px){.payer{padding:17px}.actions button{flex-grow:1}dl{font-size:13px;gap:12px}}
</style>
