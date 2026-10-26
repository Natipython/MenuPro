<script lang="ts">
 import RecoveryPanel from '$lib/recovery/RecoveryPanel.svelte';
 import {CommandRecovery,RecoveryError,httpRecoveryTransport} from '$lib/recovery/client';
 import type {RecoveryIdentity} from '$lib/recovery/model';

  import PayerAuthorization from '$lib/payer/PayerAuthorization.svelte';
  import type {PayerStaffGateway} from '$lib/payer/client';
  import {onMount} from 'svelte';
  import {ServiceClientError} from '$lib/service/client';
  import {moneyCents,centsText} from '$lib/service/model';
  import {validateCashierCommand} from './model';
  import type {CashierOperation,CashierDetail,BillSummary,BillList} from './model';
  import type {CashierGateway} from './client';
  export let gateway:CashierGateway;
  export let branchId:string;
  export let rehearsal=false;
  export let payerGateway:PayerStaffGateway|null=null;
  let payerReview=false;
  export let recoveryIdentity:RecoveryIdentity|null=null;
  let recovery:CommandRecovery|null=null;let recoveryBlocked=false;
  export let onReviewState:(blocked:boolean)=>void=()=>{};
  let bills:BillSummary[]=[];let nextCursor:string|null=null;let view='UNRESOLVED';let selected='';let detail:CashierDetail|null=null;
  let busy=true;let error='';let message='';
  let form:{operation:CashierOperation;resource:string;version:number;orderId?:string;claimDecision?:string}|null=null;
  let receiptMethod:'CASH'|'BANK_TRANSFER'='BANK_TRANSFER';
  let amount='';let tender='';let change='0.00';let note='';let reference='';let accountId='';let allocation='0.00';let confirmed=false;
  let pending:{operation:CashierOperation;resource:string;body:Record<string,unknown>;key:string}|null=null;
  $: onReviewState(!!form||!!pending||payerReview||recoveryBlocked);
  $: bill=detail?.summary.bill;
  $: reviewReceipt=detail?.receipts.find(entry=>entry.receipt.id===form?.resource);
  $: reviewRefund=detail?.refunds.find(entry=>entry.refund.id===form?.resource);
  $: reviewClaim=detail?.claims.find(entry=>entry.claim.id===form?.resource);
  $: cashNet=(()=>{try{return centsText(moneyCents(tender)-moneyCents(change));}catch{return '';}})();
  $: canClose=!!bill&&bill.status==='FINALIZED'&&['outstandingAmount','unappliedAmount','refundPendingAmount'].every(k=>(bill as unknown as Record<string,string>)[k]==='0.00')&&detail!.orders.every(o=>['COMPLETED','CANCELLED'].includes(o.status));
  const labels:Partial<Record<CashierOperation,string>>={FINALIZE_BILL:'Finalize this bill',CLOSE_BILL:'Close resolved bill',CREDIT_BILL:'Record order credit',RECORD_RECEIPT:'Record received funds',ALLOCATE_RECEIPT:'Allocate receipt',REVIEW_CLAIM:'Review transfer claim',REQUEST_REFUND:'Request refund',REVIEW_REFUND:'Review refund',EXECUTE_REFUND:'Record completed refund'};
  const date=(value:string)=>new Intl.DateTimeFormat('en-ET',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Addis_Ababa'}).format(new Date(value));
  async function refresh(){
    const list=await gateway.call<BillList>('BILLS',branchId,{view});bills=list.items;nextCursor=list.nextCursor;
    if(selected)detail=await gateway.call<CashierDetail>('DETAIL',selected);
  }
  async function reload(){if(busy||pending||form||payerReview||recoveryBlocked)return;busy=true;error='';try{await refresh();}catch(e){error=e instanceof Error?e.message:'Cashier state unavailable.';}finally{busy=false;}}
  onMount(()=>{if(recoveryIdentity&&!rehearsal){recoveryBlocked=true;recovery=new CommandRecovery('CASHIER',recoveryIdentity,httpRecoveryTransport('CASHIER',branchId,()=>recoveryIdentity?.secret||''),c=>gateway.call(c.operation as CashierOperation,c.resourceId,c.body,c.requestKey));}refresh().catch(e=>error=e.message).finally(()=>busy=false);});
  async function switchView(){if(pending||form||payerReview)return;busy=true;error='';try{await refresh();}catch(e){error=e instanceof Error?e.message:'History unavailable.';}finally{busy=false;}}
  async function choose(id:string){if(busy||pending||form||payerReview||recoveryBlocked)return;busy=true;error='';try{detail=await gateway.call('DETAIL',id);selected=id;message='';}catch(e){error=e instanceof Error?e.message:'Bill unavailable.';}finally{busy=false;}}
  async function loadMore(){if(!nextCursor||busy||pending||form||payerReview)return;busy=true;try{const next=await gateway.call<BillList>('BILLS',branchId,{view,cursor:nextCursor});const map=new Map(bills.map(b=>[b.bill.id,b]));next.items.forEach(b=>map.set(b.bill.id,b));bills=[...map.values()];nextCursor=next.nextCursor;}catch(e){error=e instanceof Error?e.message:'More bills unavailable.';}finally{busy=false;}}
  function start(operation:CashierOperation,resource:string,version=bill?.version||1,orderId?:string,decision?:string){
    if(busy||pending||form||payerReview||recoveryBlocked)return;form={operation,resource,version,orderId,claimDecision:decision};amount='';tender='';change='0.00';note='';reference='';receiptMethod='BANK_TRANSFER';accountId=detail?.accounts[0]?.id||'';allocation='0.00';confirmed=false;error='';message='';
  }
  function payload():Record<string,unknown>{
    if(!form||!bill)throw new Error('Select a bill.');const op=form.operation;
    if(['FINALIZE_BILL','CLOSE_BILL'].includes(op))return{expectedVersion:form.version};
    if(op==='CREDIT_BILL')return{expectedVersion:form.version,orderId:form.orderId,amount,reason:note};
    if(op==='RECORD_RECEIPT')return receiptMethod==='CASH'?{method:'CASH',receivedAmount:cashNet,tenderedAmount:tender,changeAmount:change,verificationNote:note,fundsConfirmed:confirmed}:{method:'BANK_TRANSFER',receivedAmount:amount,accountId,providerReference:reference,verificationNote:note,fundsConfirmed:confirmed};
    if(op==='ALLOCATE_RECEIPT')return{billId:bill.id,expectedBillVersion:form.version,amount};
    if(op==='REQUEST_REFUND')return{amount,reason:note};
    if(op==='REVIEW_REFUND')return{expectedVersion:form.version,decision:form.claimDecision,reason:note};
    if(op==='EXECUTE_REFUND')return{expectedVersion:form.version,executionReference:reference,executionConfirmed:confirmed};
    if(op==='REVIEW_CLAIM')return{expectedVersion:form.version,decision:form.claimDecision,verificationNote:note,...(form.claimDecision==='APPROVE'?{verifiedAmount:amount,allocationAmount:allocation,fundsConfirmed:confirmed}:{})};
    throw new Error('Unknown cashier action.');
  }
  async function execute(command:NonNullable<typeof pending>){
    pending=command;busy=true;error='';message='';
    try{if(recovery)await recovery.run({operation:command.operation,resourceId:command.resource,body:command.body,requestKey:command.key});else await gateway.call(command.operation,command.resource,command.body,command.key);pending=null;form=null;
      message=command.operation==='RECORD_RECEIPT'?'Receipt recorded. Review and allocate its unapplied funds separately.':command.operation==='REQUEST_REFUND'?'Refund requested. No returned funds have been recorded.':command.operation==='REVIEW_REFUND'?'Refund decision recorded. Approval does not mean money has been returned.':command.operation==='EXECUTE_REFUND'?'Already-returned funds recorded. No bank transfer was initiated.':'Settlement action recorded. Review the updated balances.';
      await refresh();
    }catch(e){
      if(e instanceof RecoveryError&&e.notSent)pending=null;
      if(e instanceof ServiceClientError&&e.status>0&&e.status<500&&!recovery?.snapshot().blocked){pending=null;if(e.status===409){form=null;try{await refresh();}catch{}}}
      error=e instanceof Error?e.message:'Cashier action interrupted. Retry the unchanged request.';
    }finally{busy=false;}
  }
  async function recovered(state:'COMMITTED'|'CANCELLED',key:string){const originalDraft=pending?.key===key;recoveryBlocked=false;pending=null;if(originalDraft)form=null;error='';message=state==='COMMITTED'?'The earlier settlement action was recorded. Review current balances and receipt history.':'The original saved attempt is cancelled. No recorded funds, allocation or refund was reversed.';await refresh();}
  function submit(){if(!form||busy||pending||recoveryBlocked)return;try{const body=payload();if(validateCashierCommand(form.operation,body).length){error='Check exact amounts, required notes and the actual-funds confirmation.';return;}execute({operation:form.operation,resource:form.resource,body:structuredClone(body),key:crypto.randomUUID()});}catch(e){error=e instanceof Error?e.message:'Check the form.';}}
</script>
<svelte:head>{#if !rehearsal}<title>Cashier bills · MenuMini</title>{/if}</svelte:head>
<div class="cashier">
  <header><div><a class="brand" href="/workspace">MenuMini</a><p class="eyebrow">{rehearsal?'FICTIONAL CASHIER REHEARSAL':'CASHIER · BRANCH BILLS'}</p><h1>Received. Allocated. Resolved.</h1><p>Keep service, received funds and financial closure distinct.</p></div><button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={reload}>Refresh bills</button></header>
  {#if rehearsal}<aside class="notice"><strong>Practice only · fictional bills and funds</strong><p>This rehearsal changes browser memory only and resets on reload. No actual cash, account access or bank transfer is recorded.</p></aside>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}{#if message}<p class="success" role="status">{message}</p>{/if}
  {#if recovery}{#key recovery}<RecoveryPanel controller={recovery} onBlocked={value=>recoveryBlocked=value} onResolved={recovered}/>{/key}{/if}
  {#if pending&&!busy&&!recovery?.snapshot().blocked}<aside class="notice"><strong>Result not confirmed.</strong><p>Keep this page open and retry the exact action. After a reload, review receipt history before entering cash again.</p><button type="button" on:click={()=>pending&&execute(pending)}>Retry unchanged action</button></aside>{/if}
  <div class="layout"><section class="panel worklist"><h2>Bill worklist</h2><label for="cashier-view">Show</label><select id="cashier-view" bind:value={view} disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:change={switchView}><option value="UNRESOLVED">Unresolved bills</option><option value="CLOSED">Closed history</option></select>
    <p class="hint">Ended seating can still owe money. Each seating has its own bill.</p>
    {#each bills as entry(entry.bill.id)}<button type="button" class="bill-card" class:selected={selected===entry.bill.id} disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={()=>choose(entry.bill.id)}><strong>{entry.tableLabel}</strong><span>{entry.visitStatus==='ENDED'?'Seating ended':'Current seating'} · {entry.bill.status}</span><small>{date(entry.openedAt)} · {entry.bill.id.slice(-8)}</small><span>Outstanding ETB {entry.bill.outstandingAmount}</span>{#if entry.bill.unappliedAmount!=='0.00'}<span>Unapplied ETB {entry.bill.unappliedAmount}</span>{/if}</button>{:else}<p class="hint">{busy?'Loading bills…':'No bills in this view.'}</p>{/each}
    {#if nextCursor}<button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={loadMore}>Load more bills</button>{/if}
  </section><div class="details">
    {#if detail&&bill}<section class="panel"><div class="heading"><h2>{detail.summary.tableLabel} · Bill {bill.id.slice(-8)}</h2><span class="badge">{bill.status}</span></div><p class="hint">{date(detail.summary.openedAt)} EAT · {detail.summary.visitStatus==='ENDED'?'Seating has ended':'Seating remains open'}</p>
      <dl><dt>Net accepted charges</dt><dd>ETB {bill.chargeAmount}</dd><dt>Allocated to bill</dt><dd>ETB {bill.allocatedAmount}</dd><dt>Still outstanding</dt><dd><strong>ETB {bill.outstandingAmount}</strong></dd><dt>Received but unapplied</dt><dd>ETB {bill.unappliedAmount}</dd><dt>Refund reserved</dt><dd>ETB {bill.refundPendingAmount}</dd></dl>
      <p class="settlement">{bill.settlement.replaceAll('_',' ')} · Serving and ending seating do not settle this bill.</p>
      <div class="actions"><button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={()=>{start('RECORD_RECEIPT',bill!.id);receiptMethod='CASH';}}>Record counted cash</button><button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview||!detail.accounts.length} on:click={()=>start('RECORD_RECEIPT',bill!.id)}>Record verified transfer</button>
        {#if detail.permissions.manage}<button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview||bill.status!=='OPEN'||detail.orders.some(o=>o.status==='SUBMITTED')} on:click={()=>start('FINALIZE_BILL',bill!.id)}>Finalize bill</button><button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview||!canClose} on:click={()=>start('CLOSE_BILL',bill!.id)}>Close financial obligations</button>{/if}</div>
      {#if !detail.accounts.length}<p class="hint">Transfers require an active, verified receiving account assigned to this branch. Account onboarding remains separate.</p>{/if}
      <p class="hint">Finalize after resolving pending requests. Close only after service, outstanding funds, unapplied funds and refund obligations are resolved.</p>
    </section>
    {#if payerGateway}{#key bill.id}<PayerAuthorization {bill} tableLabel={detail.summary.tableLabel} gateway={payerGateway} blocked={recoveryBlocked||busy||!!form||!!pending} onReviewState={value=>payerReview=value}/>{/key}{/if}
    {#if form}<section class="panel review" aria-label="Settlement action review"><h2>{form.operation==='REVIEW_REFUND'?(form.claimDecision==='APPROVE'?'Approve refund obligation':'Reject refund request'):form.operation==='REVIEW_CLAIM'?(form.claimDecision==='APPROVE'?'Record verified funds for this claim':'Reject transfer claim'):labels[form.operation]}</h2><p>{detail.summary.tableLabel} · Bill {bill.id.slice(-8)} · Outstanding ETB {bill.outstandingAmount}</p>
      {#if form.orderId}<p>Order {form.orderId.slice(-8)} · Remaining charge ETB {detail.orders.find(order=>order.id===form?.orderId)?.remainingChargeAmount}</p>{/if}
      {#if reviewReceipt}<p>Receipt {reviewReceipt.receipt.id.slice(-8)} · {reviewReceipt.receipt.method.replaceAll('_',' ')} · Received ETB {reviewReceipt.receipt.receivedAmount} · Available ETB {centsText(moneyCents(reviewReceipt.receipt.unappliedAmount)-moneyCents(reviewReceipt.reservedAmount))}</p>{/if}
      {#if reviewRefund}<p>Refund {reviewRefund.refund.id.slice(-8)} · ETB {reviewRefund.refund.amount} · {reviewRefund.reason}</p>{/if}
      {#if reviewClaim}<p>Reported ETB {reviewClaim.claim.reportedAmount} · {reviewClaim.providerReference} · {reviewClaim.accountLabel}</p>{/if}
      {#if form.operation==='FINALIZE_BILL'}<p>Finalization freezes this bill’s charges and prevents additional order rounds. It does not mark funds received.</p>{:else if form.operation==='CLOSE_BILL'}<p>Close only this resolved financial record. Table seating is handled separately.</p>{:else}
        {#if form.operation==='RECORD_RECEIPT'&&receiptMethod==='CASH'}<label for="cashier-tender">Cash actually tendered (ETB)</label><input id="cashier-tender" bind:value={tender} inputmode="decimal" placeholder="100.00" disabled={recoveryBlocked||busy||!!pending}/><label for="cashier-change">Change actually returned (ETB)</label><input id="cashier-change" bind:value={change} inputmode="decimal" disabled={recoveryBlocked||busy||!!pending}/><p>Net funds received: <strong>ETB {cashNet||'—'}</strong></p>
        {:else if ['RECORD_RECEIPT','ALLOCATE_RECEIPT','CREDIT_BILL','REQUEST_REFUND'].includes(form.operation)||form.operation==='REVIEW_CLAIM'&&form.claimDecision==='APPROVE'}<label for="cashier-amount">{form.operation==='REVIEW_CLAIM'?'Actual credited amount':form.operation==='ALLOCATE_RECEIPT'?'Amount to allocate':'Amount'} (ETB)</label><input id="cashier-amount" bind:value={amount} inputmode="decimal" placeholder="80.00" disabled={recoveryBlocked||busy||!!pending}/>{/if}
        {#if form.operation==='RECORD_RECEIPT'&&receiptMethod!=='CASH'}<label for="cashier-account">Verified receiving account</label><select id="cashier-account" bind:value={accountId} disabled={recoveryBlocked||busy||!!pending}>{#each detail.accounts as account}<option value={account.id}>{account.label}</option>{/each}</select>{/if}
        {#if form.operation==='RECORD_RECEIPT'&&receiptMethod!=='CASH'||form.operation==='EXECUTE_REFUND'}<label for="cashier-reference">{form.operation==='EXECUTE_REFUND'?'Actual return reference':'Provider transfer reference'}</label><input id="cashier-reference" bind:value={reference} maxlength="120" disabled={recoveryBlocked||busy||!!pending}/>{/if}
        {#if form.operation==='REVIEW_CLAIM'&&form.claimDecision==='APPROVE'}<label for="cashier-allocation">Explicit amount to allocate (ETB)</label><input id="cashier-allocation" bind:value={allocation} inputmode="decimal" disabled={recoveryBlocked||busy||!!pending}/><p class="hint">Use 0.00 to retain the credited funds unapplied. A screenshot or reported amount is not credited-funds evidence.</p>{/if}
        {#if form.operation!=='ALLOCATE_RECEIPT'&&form.operation!=='EXECUTE_REFUND'}<label for="cashier-note">Verification note / reason</label><textarea id="cashier-note" bind:value={note} maxlength="160" rows="2" disabled={recoveryBlocked||busy||!!pending}></textarea>{/if}
        {#if form.operation==='RECORD_RECEIPT'||form.operation==='REVIEW_CLAIM'&&form.claimDecision==='APPROVE'||form.operation==='EXECUTE_REFUND'}<label class="check"><input type="checkbox" bind:checked={confirmed} disabled={recoveryBlocked||busy||!!pending}/>{form.operation==='EXECUTE_REFUND'?'I confirm these funds have already been returned.':'I independently checked that these funds were actually received.'}</label>{/if}
      {/if}
      <div class="actions"><button type="button" class="primary" disabled={recoveryBlocked||busy||!!pending} on:click={submit}>Confirm settlement record</button><button type="button" disabled={recoveryBlocked||busy||!!pending} on:click={()=>form=null}>Keep bill unchanged</button></div><p class="hint">Use exact amounts with two decimals, such as 100.00. This action records evidence and never initiates a bank transfer.</p>
    </section>{/if}
    <section class="panel"><h2>Orders & corrections</h2>{#each detail.orders as order}<article><div class="heading"><strong>Order {order.id.slice(-8)} · {order.status}</strong><span>Net charge ETB {order.remainingChargeAmount}</span></div><ul>{#each order.items as line}<li>{line.quantity} × {line.nameEn}{#if line.nameAm}<span lang="am"> · {line.nameAm}</span>{/if} · {line.selectedOptions.join(', ')} · ETB {line.lineTotal}</li>{/each}</ul>{#if detail.permissions.adjust&&order.remainingChargeAmount!=='0.00'}<button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={()=>start('CREDIT_BILL',bill!.id,bill!.version,order.id)}>Credit this order</button>{/if}</article>{/each}
      {#each detail.credits as credit}<p class="credit">Credit ETB {credit.amount} · {credit.reason} · {date(credit.recordedAt)}</p>{/each}
    </section>
    <section class="panel"><h2>Received funds & allocations</h2>{#each detail.receipts as entry}<article><strong>{entry.receipt.method.replaceAll('_',' ')} · ETB {entry.receipt.receivedAmount}</strong><p>{entry.accountLabel||'Counted cash'}{entry.providerReference?' · '+entry.providerReference:''}</p><p class="hint">{date(entry.recordedAt)} · {entry.verificationNote}</p><p>Allocated {entry.receipt.allocatedAmount} · Returned {entry.receipt.refundedAmount} · Unapplied {entry.receipt.unappliedAmount} · Reserved {entry.reservedAmount}</p>
        <div class="actions"><button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview||moneyCents(entry.receipt.unappliedAmount)<=moneyCents(entry.reservedAmount)||bill.status==='CLOSED'||bill.outstandingAmount==='0.00'} on:click={()=>start('ALLOCATE_RECEIPT',entry.receipt.id)}>Allocate to this bill</button><button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview||moneyCents(entry.receipt.unappliedAmount)<=moneyCents(entry.reservedAmount)} on:click={()=>start('REQUEST_REFUND',entry.receipt.id)}>Request return of unapplied funds</button></div>
      </article>{:else}<p class="hint">No received funds recorded. Pending claims are shown separately.</p>{/each}</section>
    <section class="panel"><h2>Transfer claims</h2>{#each detail.claims as entry}<article><strong>Reported ETB {entry.claim.reportedAmount} · {entry.claim.status}</strong><p>{entry.accountLabel} · {entry.providerReference}</p>{#if entry.claim.status==='SUBMITTED'}<div class="actions"><button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={()=>start('REVIEW_CLAIM',entry.claim.id,entry.claim.version,undefined,'APPROVE')}>Review credited funds</button><button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={()=>start('REVIEW_CLAIM',entry.claim.id,entry.claim.version,undefined,'REJECT')}>Reject claim with reason</button></div>{/if}</article>{:else}<p class="hint">No transfer claims. A claim alone never marks a bill paid.</p>{/each}</section>
    <section class="panel"><h2>Refund obligations</h2>{#each detail.refunds as entry}<article><strong>ETB {entry.refund.amount} · {entry.refund.status}</strong><p>{entry.reason}</p>{#if entry.executionReference}<p>Recorded return reference: {entry.executionReference}</p>{/if}{#if detail.permissions.refund}<div class="actions">{#if entry.refund.status==='REQUESTED'}<button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={()=>start('REVIEW_REFUND',entry.refund.id,entry.refund.version,undefined,'APPROVE')}>Approve refund obligation</button><button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={()=>start('REVIEW_REFUND',entry.refund.id,entry.refund.version,undefined,'REJECT')}>Reject refund request</button>{:else if entry.refund.status==='APPROVED'}<button type="button" disabled={recoveryBlocked||busy||!!pending||!!form||payerReview} on:click={()=>start('EXECUTE_REFUND',entry.refund.id,entry.refund.version)}>Record already-returned funds</button>{/if}</div>{:else if ['REQUESTED','APPROVED'].includes(entry.refund.status)}<p class="hint">A manager must review or record actual execution.</p>{/if}</article>{:else}<p class="hint">No refund requests.</p>{/each}</section>
    {:else}<section class="panel"><h2>Select a bill</h2><p>Review the table, seating date and bill identifier before recording any funds.</p></section>{/if}
  </div></div>
</div>
<style>
.cashier{max-width:1240px;min-height:100vh;margin:auto;padding:clamp(16px,4vw,36px);font-family:Arial,sans-serif;color:#233b32;background:#f4f6f2}.brand{font-size:22px;font-weight:800;color:#245c4c;text-decoration:none}.eyebrow{font-size:11px;font-weight:700;letter-spacing:.08em;margin:22px 0 8px}header,.heading{display:flex;justify-content:space-between;gap:18px;align-items:start}header{margin-bottom:24px}h1{font-size:clamp(27px,4vw,36px);margin:6px 0}h2{font-size:20px;margin:0}p{line-height:1.6;margin:10px 0}.layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:24px}.panel{min-width:0;border:1px solid #d9e1d5;border-radius:14px;padding:22px;background:#fff}.details{display:grid;align-content:start;gap:24px;min-width:0}.worklist{align-self:start}.notice,.review{border:1px solid #d8c483;background:#fff6d9;padding:18px;border-radius:12px;margin-bottom:24px}.review{margin-bottom:0}.hint,small{font-size:13px;color:#65786b}.bill-card{display:block;text-align:left;width:100%;margin-top:14px;padding:15px}.bill-card>*{display:block;margin:5px 0}.selected{background:#edf4ec;border-color:#245c4c}button{font:inherit;font-size:13px;min-height:44px;padding:10px 13px;border:1px solid #c4d0c1;border-radius:8px;background:#fff;color:#2a4b3c;font-weight:700;cursor:pointer}button:disabled{opacity:.5;cursor:default}.primary{background:#245c4c;border-color:#245c4c;color:#fff}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}label{display:block;font-size:13px;font-weight:700;margin:16px 0 7px}input,select,textarea{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:11px;border:1px solid #c6d1c1;border-radius:8px;background:#fff;color:#233b32;font:inherit}.check{display:flex;gap:10px;align-items:center;font-weight:400}.check input{width:20px;height:20px;min-height:20px;flex-shrink:0}dl{display:grid;grid-template-columns:1fr auto;gap:12px;margin:24px 0}dd{margin:0;text-align:right}article{padding:18px 0;border-top:1px solid #dce5d8;margin-top:18px}article p,.credit,li{font-size:14px;overflow-wrap:anywhere}.badge,.settlement{background:#edf2e9;padding:9px;border-radius:8px;font-size:12px}.error{padding:16px;background:#fff0e9;color:#7b3328;border-radius:9px;overflow-wrap:anywhere}.success{padding:14px;background:#e6f3e7;border-radius:9px;font-size:14px}input:focus,select:focus,textarea:focus,button:focus-visible{outline:3px solid #a5c8b1;outline-offset:2px}
@media(max-width:800px){.layout{grid-template-columns:1fr}.panel{padding:17px}header{display:block}header>button{margin-top:14px}.heading{flex-wrap:wrap}dl{font-size:14px;gap:12px}.actions button{flex-grow:1}}
</style>
