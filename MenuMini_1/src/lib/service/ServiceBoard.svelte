<script lang="ts">
 import RecoveryPanel from '$lib/recovery/RecoveryPanel.svelte';
 import {CommandRecovery,RecoveryError,httpRecoveryTransport} from '$lib/recovery/client';
 import type {RecoveryIdentity} from '$lib/recovery/model';
 import {supportedRecovery} from '$lib/recovery/model';

  import {onMount} from 'svelte';
  import {ServiceClientError} from './client';
  import type {ServiceGateway} from './client';
  import {estimateSelection,readOperation} from './model';
  import type {DiningTable,ServiceQueue,ServiceOrder,ServiceOffer,StaffVisit,Selection,OrderStatus,ServiceOperation} from './model';
  export let gateway:ServiceGateway;
  export let branchId:string;
  export let rehearsal=false;
  export let canManageTables=false;
  export let preparationOnly=false;
  export let recoveryIdentity:RecoveryIdentity|null=null;
  let recovery:CommandRecovery|null=null;let recoveryBlocked=false;
  export let onReviewState:(blocked:boolean)=>void=()=>{};
  let tables:DiningTable[]=[];let queue:ServiceOrder[]=[];let nextCursor:string|null=null;let selectedTableId='';
  let offer:ServiceOffer|null=null;let itemId='';let choiceIds:string[]=[];let quantity=1;let instructions='';let orderNote='';let cart:Selection[]=[];
  let tableLabel='';let addingTable=false;let busy=false;let error='';let message='';let bill:{chargeAmount:string;outstandingAmount:string;settlement:string}|null=null;
  let editingTable:DiningTable|null=null;let editLabel='';let editActive=true;
  let cancellation:{order:ServiceOrder;reason:string}|null=null;
  let draftDecision:{kind:'TABLE';table:DiningTable}|{kind:'COMMAND';operation:ServiceOperation;resource:string;body:Record<string,unknown>}|null=null;
  let invitation:{visitId:string;pairingToken:string;expiresAt:string;active:boolean}|null=null;
  let tableLink:{tableId:string;tableToken:string;active:boolean}|null=null;
  let pending:{operation:ServiceOperation;resource:string;body:Record<string,unknown>;key:string}|null=null;
  $: onReviewState(!!pending||cart.length>0||!!orderNote.trim()||!!draftDecision||recoveryBlocked);
  $: selectedTable=tables.find(t=>t.id===selectedTableId);
  $: availableItems=offer?.menu.content.sections.flatMap(s=>s.items)||[];
  $: item=availableItems.find(i=>i.id===itemId);
  $: cartEstimate=(()=>{try{return offer&&cart.length?estimateSelection(offer,cart):null;}catch{return null;}})();
  const statusLabel:Record<OrderStatus,string>={SUBMITTED:'Awaiting acceptance',ACCEPTED:'Accepted',PREPARING:'Preparing',READY:'Ready to serve',COMPLETED:'Served',CANCELLED:'Cancelled'};
  const actionLabel:Record<string,string>={ACCEPTED:'Accept unpaid order',PREPARING:'Start preparation',READY:'Mark ready',COMPLETED:'Mark served',CANCELLED:'Cancel / reject'};
  async function refresh(){
    try{const [t,q]=await Promise.all([preparationOnly?Promise.resolve({items:[] as DiningTable[]}):gateway.call<{items:DiningTable[]}>('TABLES',branchId),gateway.call<ServiceQueue>('QUEUE',branchId)]);
      tables=t.items;queue=q.items;nextCursor=q.nextCursor;
      if(selectedTableId&&!tables.some(t=>t.id===selectedTableId&&t.visit)){selectedTableId='';offer=null;cart=[];bill=null;}
    }catch(e){error=e instanceof Error?e.message:'The service state could not be loaded.';}
  }
  onMount(()=>{if(recoveryIdentity&&!rehearsal){recoveryBlocked=true;recovery=new CommandRecovery('SERVICE',recoveryIdentity,httpRecoveryTransport('SERVICE',branchId,()=>recoveryIdentity?.secret||''),c=>gateway.call(c.operation as ServiceOperation,c.resourceId,c.body,c.requestKey));}refresh();});
  async function loadMore(){if(!nextCursor)return;busy=true;try{const q=await gateway.call<ServiceQueue>('QUEUE',branchId,{cursor:nextCursor});
    const map=new Map(queue.map(o=>[o.id,o]));q.items.forEach(o=>map.set(o.id,o));queue=[...map.values()];nextCursor=q.nextCursor;
  }catch(e){error=e instanceof Error?e.message:'The next page could not be loaded.';}finally{busy=false;}}
  async function chooseTable(table:DiningTable,discardConfirmed=false){
    if(busy||pending||draftDecision)return;
    if((cart.length||orderNote.trim())&&!discardConfirmed){draftDecision={kind:'TABLE',table};return;}
    selectedTableId=table.id;cart=[];orderNote='';bill=null;offer=null;error='';busy=true;
    try{offer=await gateway.call<ServiceOffer>('OFFER',branchId);itemId=offer.menu.content.sections.flatMap(s=>s.items).find(i=>i.availableNow)?.id||'';choiceIds=[];quantity=1;instructions='';}
    catch(e){error=e instanceof Error?e.message:'Menu is unavailable.';}finally{busy=false;}
  }
  function pickItem(){choiceIds=[];quantity=1;instructions='';error='';}
  function chooseOption(id:string,groupId:string,single:boolean){
    const group=item?.modifiers.find(g=>g.id===groupId);if(!group)return;
    if(single)choiceIds=[...choiceIds.filter(c=>!group.choices.some(choice=>choice.id===c)),id];
    else choiceIds=choiceIds.includes(id)?choiceIds.filter(c=>c!==id):[...choiceIds,id];
  }
  function addToDraft(){
    if(!offer||!item)return;const s={itemId:item.id,quantity,choiceIds:[...choiceIds],...(instructions?{specialInstructions:instructions}:{})};
    try{estimateSelection(offer,[s]);cart=[...cart,s];error='';message='Item added to the unsent order draft.';}catch(e){error=e instanceof Error?e.message:'Check the item options.';}
  }
  async function execute(command:NonNullable<typeof pending>){
    pending=command;busy=true;error='';message='';
    try{
      const result=recovery&&supportedRecovery('SERVICE',command.operation)?await recovery.run<unknown>({operation:command.operation,resourceId:command.resource,body:command.body,requestKey:command.key}):await gateway.call<unknown>(command.operation,command.resource,command.body,command.key);
      pending=null;
      if(command.operation==='ISSUE_INVITATION'){invitation=result as typeof invitation;message=invitation?.active?'New private invitation issued. The previous invitation can no longer join guests.':'This original invitation is inactive. Issue a new invitation for the current seating.';}
      else if(command.operation==='ISSUE_TABLE_LINK'){tableLink=result as typeof tableLink;message=tableLink?.active?'New table access code issued. Replace the previous table link before handing it out.':'This original table code is inactive. Issue a new code for the current table.';}
      else if(command.operation==='SUBMIT_STAFF_ORDER'){cart=[];orderNote='';message=rehearsal?'Rehearsal request submitted. It still needs acceptance.':'Order request saved. It still needs acceptance.';}
      else if(command.operation==='OPEN_STAFF_VISIT'){selectedTableId=(result as StaffVisit).tableId;cart=[];orderNote='';instructions='';bill=null;offer=null;message=rehearsal?'Rehearsal seating opened.':'Staff-only seating opened.';}
      else if(command.operation==='END_VISIT'){invitation=null;selectedTableId='';offer=null;cart=[];orderNote='';instructions='';bill=null;message='Seating ended. Any outstanding bill remains to be settled.';}
      else if(command.operation==='CREATE_TABLE'){addingTable=false;tableLabel='';message=rehearsal?'Fictional table added.':'Table saved. Guest QR access is not issued by this action.';}
      else if(command.operation==='UPDATE_TABLE'){editingTable=null;message='Idle table details updated.';}
      else{cancellation=null;message=command.body.status==='COMPLETED'?'Marked served. Payment is recorded separately.':'Service status updated.';}
      await refresh();
      if(command.operation==='ISSUE_TABLE_LINK'&&editingTable)editingTable=tables.find(t=>t.id===editingTable?.id)||null;
      if(command.operation==='OPEN_STAFF_VISIT'){const table=tables.find(t=>t.id===selectedTableId);if(table)await chooseTableAfterOpen(table);}
      if(bill&&selectedTable?.visit)bill=await gateway.call('READ_BILL',selectedTable.visit.billId);
    }catch(e){
      if(e instanceof RecoveryError&&e.notSent)pending=null;
      if(e instanceof ServiceClientError&&e.status>0&&e.status<500&&!recovery?.snapshot().blocked)pending=null;
      error=e instanceof Error?e.message:'Service request interrupted. Retry the unchanged action.';
      if(e instanceof ServiceClientError&&e.status===409)await refresh();
    }finally{busy=false;}
  }
  async function chooseTableAfterOpen(table:DiningTable){
    try{offer=await gateway.call<ServiceOffer>('OFFER',branchId);itemId=offer.menu.content.sections.flatMap(s=>s.items).find(i=>i.availableNow)?.id||'';choiceIds=[];quantity=1;}
    catch(e){error=e instanceof Error?e.message:'Menu could not be loaded.';}
  }
  function command(operation:ServiceOperation,resource:string,body:Record<string,unknown>,discardConfirmed=false){
    if(busy||pending||draftDecision||recoveryBlocked||readOperation(operation))return;
    if(['OPEN_STAFF_VISIT','END_VISIT'].includes(operation)&&(cart.length||orderNote.trim())&&!discardConfirmed){draftDecision={kind:'COMMAND',operation,resource,body:structuredClone(body)};return;}
    execute({operation,resource,body:structuredClone(body),key:crypto.randomUUID()});
  }
  async function recovered(state:'COMMITTED'|'CANCELLED',key:string){const originalDraft=pending?.key===key;recoveryBlocked=false;pending=null;if(originalDraft){cart=[];orderNote='';instructions='';cancellation=null;draftDecision=null;editingTable=null;addingTable=false;}error='';message=state==='COMMITTED'?'The original service action was recorded. Review current service status.':'The original attempt is cancelled. Refresh and review before entering a replacement.';await refresh();}
  function discardDraftAndContinue(){
    const decision=draftDecision;draftDecision=null;
    if(decision?.kind==='TABLE')chooseTable(decision.table,true);
    else if(decision?.kind==='COMMAND')command(decision.operation,decision.resource,decision.body,true);
  }
  function transition(order:ServiceOrder,status:OrderStatus){if(status==='CANCELLED'){cancellation={order,reason:''};return;}command('TRANSITION_ORDER',order.id,{expectedVersion:order.version,status});}
  function submit(){if(!selectedTable?.visit||!offer||!cart.length)return;command('SUBMIT_STAFF_ORDER',branchId,{visitId:selectedTable.visit.id,menuPublicationId:offer.menu.publicationId,
    pricingFingerprint:offer.pricingFingerprint,items:cart,...(orderNote?{customerNote:orderNote}:{})});}
  async function showBill(){if(!selectedTable?.visit)return;busy=true;error='';try{bill=await gateway.call('READ_BILL',selectedTable.visit.billId);}catch(e){error=e instanceof Error?e.message:'Bill unavailable.';}finally{busy=false;}}
</script>

<div class="board" class:preparation={preparationOnly}>
  <header><div><a href="/workspace" class="brand">MenuMini</a><p class="eyebrow">{rehearsal?'FICTIONAL SERVICE REHEARSAL':preparationOnly?'PREPARATION QUEUE':'BRANCH SERVICE'}</p><h1>{preparationOnly?'Accepted work. Ready to serve.':'From table to served.'}</h1><p>{preparationOnly?'Prepare accepted items and report when they are ready.':'Tables, order entry and preparation in one workflow.'}</p></div><button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} on:click={()=>{error='';refresh();}}>Refresh service</button></header>
  {#if rehearsal}<div class="rehearsal"><strong>Practice only · fictional business and prices</strong><p>Actions here change this browser’s rehearsal only. No actual orders, staff access or money are created. Reload resets the rehearsal. Illustrative prices have no added tax or service charge.</p></div>{/if}
  {#if error}<div class="error" role="alert">{error}</div>{/if}{#if message}<p class="message" role="status">{message}</p>{/if}
  {#if recovery}{#key recovery}<RecoveryPanel controller={recovery} onBlocked={value=>recoveryBlocked=value} onResolved={recovered}/>{/key}{/if}
  {#if pending&&!busy&&!recovery?.snapshot().blocked}<div class="retry"><strong>Result not confirmed.</strong><p>Retry this exact action before starting another. A timeout does not prove it failed.</p><button type="button" on:click={()=>pending&&execute(pending)}>Retry unchanged action</button></div>{/if}
  {#if draftDecision}<section class="panel draft-review" aria-label="Unsent order review"><h2>Keep this unsent order?</h2><p>You have an unsent draft for {selectedTable?.label}. Discard it before changing seating or loading another menu.</p><div class="actions"><button type="button" on:click={()=>draftDecision=null}>Keep working on this draft</button><button type="button" on:click={discardDraftAndContinue}>Discard draft and continue</button></div></section>{/if}
  <div class="layout">
    {#if !preparationOnly}<section class="panel tables"><div class="heading"><h2>Tables & seating</h2>{#if canManageTables}<button type="button" class="small" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} on:click={()=>addingTable=!addingTable}>+ Table</button>{/if}</div>
      {#if addingTable}<form on:submit|preventDefault={()=>command('CREATE_TABLE',branchId,{label:tableLabel})}><label for="service-table-label">New table label</label><input id="service-table-label" bind:value={tableLabel} maxlength="40" required /><button type="submit" disabled={recoveryBlocked||busy||!!pending||!!draftDecision}>Save table</button></form>{/if}
      {#each tables as table(table.id)}<article class:selected={selectedTableId===table.id}><div><strong>{table.label}</strong><span class="table-state">{!table.active?'Inactive':table.visit?'Seated':'Available'}</span></div>
        <div class="table-actions">{#if table.visit}<button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} on:click={()=>chooseTable(table)}>Enter order</button>{:else}<button type="button" disabled={!table.active||busy||!!pending||!!draftDecision} on:click={()=>command('OPEN_STAFF_VISIT',branchId,{tableId:table.id})}>Open seating</button>{#if canManageTables}<button type="button" class="text-button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} aria-label={'Edit '+table.label} on:click={()=>{editingTable=table;editLabel=table.label;editActive=table.active;}}>Edit</button>{/if}{/if}</div></article>{:else}<p class="hint">No tables configured. An owner must add tables before staff can seat guests.</p>{/each}
      {#if editingTable}<form on:submit|preventDefault={()=>editingTable&&command('UPDATE_TABLE',editingTable.id,{expectedVersion:editingTable.version,label:editLabel,active:editActive})}>
        <h3>Edit idle table</h3><button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision||!editingTable.active} on:click={()=>editingTable&&command('ISSUE_TABLE_LINK',editingTable.id,{expectedVersion:editingTable.version})}>Issue new table access code</button><p class="hint">Issuing a new code invalidates the previous table link.</p><label for="service-edit-table">Table label</label><input id="service-edit-table" bind:value={editLabel} maxlength="40" required />
        <label class="choice"><input type="checkbox" bind:checked={editActive} />Active for seating</label><div class="actions"><button type="submit" disabled={recoveryBlocked||busy||!!pending||!!draftDecision}>Save table changes</button><button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} on:click={()=>editingTable=null}>Keep table unchanged</button></div></form>{/if}
      {#if tableLink?.active}<div class="balance"><strong>Table access code</strong><p class="hint">This starts a table session. It cannot join a seating or reveal orders.</p><label for="issued-table-code">Issued table code</label><textarea id="issued-table-code" readonly rows="3" value={tableLink.tableToken}></textarea><button type="button" on:click={()=>tableLink=null}>Hide table code</button></div>{/if}
      <p class="hint">Each seating has a new visit and bill. A table label alone grants no customer access.</p>
    </section>{/if}
    <div class="main-column">
      {#if !preparationOnly&&selectedTable?.visit}<section class="panel composer"><div class="heading"><h2>Order for {selectedTable.label}</h2><span class="badge">Unsent draft</span></div>
        {#if offer}<label for="service-item">Menu item</label><select id="service-item" bind:value={itemId} on:change={pickItem} disabled={recoveryBlocked||busy||!!pending||!!draftDecision}>{#each availableItems as candidate}<option value={candidate.id} disabled={!candidate.availableNow}>{candidate.nameEn} · ETB {candidate.basePrice}{!candidate.availableNow?' · unavailable':''}</option>{/each}</select>
          {#if item}<p class="amharic" lang="am">{item.nameAm||''}</p>{#each item.modifiers as group}<fieldset><legend>{group.label} · choose {group.minSelections}–{group.maxSelections}</legend>{#each group.choices as choice}<label class="choice"><input type={group.mode==='SINGLE_SELECT'?'radio':'checkbox'} name={group.id} checked={choiceIds.includes(choice.id)} disabled={!choice.isAvailable||busy||!!pending||!!draftDecision} on:change={()=>chooseOption(choice.id,group.id,group.mode==='SINGLE_SELECT')} />{choice.label} · ETB {choice.priceDelta}{!choice.isAvailable?' · unavailable':''}</label>{/each}</fieldset>{/each}
            <div class="pair"><div><label for="service-quantity">Quantity</label><input id="service-quantity" type="number" min="1" max="99" bind:value={quantity} disabled={recoveryBlocked||busy||!!pending||!!draftDecision} /></div><button type="button" disabled={!item.availableNow||busy||!!pending||!!draftDecision||cart.length>=100} on:click={addToDraft}>Add to order draft</button></div>
            <label for="service-instructions">Item instructions (optional)</label><input id="service-instructions" bind:value={instructions} maxlength="500" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} />{/if}
          {#if cart.length}<h3>Review this round</h3>{#each cart as line,index}<div class="draft-line"><span>{line.quantity} × {availableItems.find(i=>i.id===line.itemId)?.nameEn}<small>{availableItems.find(i=>i.id===line.itemId)?.modifiers.flatMap(g=>g.choices.filter(c=>line.choiceIds.includes(c.id)).map(c=>c.label)).join(', ')}</small></span><button class="text-button" type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} aria-label={'Remove draft line '+(index+1)} on:click={()=>cart=cart.filter((_,i)=>i!==index)}>Remove</button></div>{/each}
            <label for="service-note">Order note (optional)</label><textarea id="service-note" bind:value={orderNote} maxlength="1000" rows="2" disabled={recoveryBlocked||busy||!!pending||!!draftDecision}></textarea>
            {#if cartEstimate}<dl class="amounts"><dt>Items</dt><dd>ETB {cartEstimate.subtotalAmount}</dd><dt>Service</dt><dd>ETB {cartEstimate.serviceAmount}</dd><dt>Added tax</dt><dd>ETB {cartEstimate.taxAmount}</dd><dt>Estimated total</dt><dd><strong>ETB {cartEstimate.totalAmount}</strong></dd></dl>{/if}
            <button type="button" class="primary" disabled={recoveryBlocked||busy||!!pending||!!draftDecision||!cartEstimate} on:click={submit}>Submit order request</button><p class="hint">The server checks prices and availability again. Submission needs staff acceptance and creates no payment.</p>{/if}
        {:else}<p class="hint">A validated public menu and reviewed price policy are required for order entry.</p>{/if}
        <div class="guest-invitation"><h3>Invite confirmed guests</h3><p class="hint">Confirm the seating first. Each new invitation expires after five minutes and invalidates the previous invitation. Joined guests keep their own access.</p><button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision||cart.length>0||!!orderNote.trim()} on:click={()=>selectedTable?.visit&&command('ISSUE_INVITATION',selectedTable.visit.id,{expectedVersion:selectedTable.visit.version})}>Issue new guest invitation</button>
        {#if invitation?.active&&invitation.visitId===selectedTable.visit.id}<label for="issued-visit-invitation">Private invitation for {selectedTable.label}</label><textarea id="issued-visit-invitation" readonly rows="3" value={invitation.visitId+'.'+invitation.pairingToken}></textarea><p class="hint">Expires {new Date(invitation.expiresAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Addis_Ababa'})} EAT. Hand this privately to confirmed diners. Never put it on the public menu.</p><button type="button" on:click={()=>invitation=null}>Hide invitation</button>{/if}</div>
        <div class="actions"><button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} on:click={showBill}>View visit balance</button><button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} on:click={()=>selectedTable?.visit&&command('END_VISIT',selectedTable.visit.id,{expectedVersion:selectedTable.visit.version})}>End seating</button></div>
        {#if bill}<div class="balance"><strong>{bill.settlement==='UNPAID'?'Payment still outstanding':bill.settlement==='NO_PAYMENT_DUE'?'No accepted charge yet':bill.settlement.replaceAll('_',' ')}</strong><p>Accepted charges: ETB {bill.chargeAmount} · Outstanding: ETB {bill.outstandingAmount}</p><p class="hint">Serving and ending seating do not record money received.</p></div>{/if}
      </section>{/if}
      <section class="panel queue"><div class="heading"><h2>Active service queue</h2><span class="badge">{queue.length}{nextCursor?' +':''} requests</span></div><p class="hint">Requests → acceptance → preparation → ready → served. Check the queue directly if a notification is missed.</p>
        {#each queue as order(order.id)}<article class="order"><div class="heading"><div><strong>{order.tableLabel}</strong><span class="status">{statusLabel[order.status]}</span></div><strong class="price">ETB {order.totalAmount}</strong></div>
          <ul>{#each order.items as line}<li><strong>{line.quantity} × {line.nameEn}</strong>{#if line.nameAm}<span lang="am"> · {line.nameAm}</span>{/if}{#if line.selectedOptions.length}<small>{line.selectedOptions.join(', ')}</small>{/if}{#if line.specialInstructions}<p>{line.specialInstructions}</p>{/if}</li>{/each}</ul>{#if order.customerNote}<p class="order-note">{order.customerNote}</p>{/if}
          <div class="actions">{#each order.allowedTransitions as status}<button type="button" class:primary={status!=='CANCELLED'} class:text-button={status==='CANCELLED'} disabled={recoveryBlocked||busy||!!pending||!!draftDecision} on:click={()=>transition(order,status)}>{actionLabel[status]}</button>{/each}</div>
        </article>{:else}<p class="empty">{preparationOnly?'No accepted work is waiting for preparation.':'No active requests. Open a seating and enter an order to start this workflow.'}</p>{/each}
        {#if nextCursor}<button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} on:click={loadMore}>Load more active work</button>{/if}
      </section>
    </div>
  </div>
  {#if cancellation}<section class="panel cancellation" aria-label="Cancellation review"><h2>Cancel / reject request</h2><label for="service-cancel-reason">Reason</label><input id="service-cancel-reason" bind:value={cancellation.reason} maxlength="160" />
    <p class="hint">An accepted order needs adjustment permission and may leave a refund obligation. No money is returned by this action.</p><div class="actions"><button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision||!cancellation.reason.trim()} on:click={()=>cancellation&&command('TRANSITION_ORDER',cancellation.order.id,{expectedVersion:cancellation.order.version,status:'CANCELLED',reason:cancellation.reason})}>Confirm cancellation</button><button type="button" disabled={recoveryBlocked||busy||!!pending||!!draftDecision} on:click={()=>cancellation=null}>Keep request</button></div></section>{/if}
</div>

<style>
  .board{max-width:1240px;margin:0 auto;padding:clamp(16px,4vw,36px);background:#f4f6f2;color:#233b32;font-family:Arial,sans-serif;min-height:100vh}header{display:flex;justify-content:space-between;align-items:start;gap:18px;margin-bottom:24px}.brand{font-size:22px;font-weight:800;color:#245c4c;text-decoration:none}.eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;margin:22px 0 8px}h1{font-size:clamp(27px,4vw,38px);margin:6px 0}h2{font-size:20px;margin:0}h3{font-size:16px;margin-top:22px}p{line-height:1.6;margin:8px 0}.rehearsal{border:1px solid #d8c483;background:#fff6d9;padding:16px 20px;border-radius:12px;margin-bottom:24px;font-size:14px}.layout{display:grid;grid-template-columns:290px minmax(0,1fr);gap:24px}.panel{background:#fff;border:1px solid #d9e1d5;border-radius:14px;padding:22px;min-width:0}.main-column{display:grid;gap:24px;align-content:start;min-width:0}.heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.tables{align-self:start}.tables article{padding:16px 0;border-bottom:1px solid #e3e8df}.tables article>div{display:flex;justify-content:space-between;gap:8px;margin-bottom:10px}.tables article.selected{background:#edf4ec;padding:14px 12px;border-radius:8px;margin-top:10px}.table-state{font-size:12px;color:#617366}.hint{font-size:13px;color:#65786b;margin-top:13px}.badge,.status{font-size:12px;padding:6px 9px;background:#edf2e9;border-radius:7px;white-space:nowrap}.status{display:inline-block;margin:7px 0 0 10px}.price{font-size:14px;white-space:nowrap}button{font:inherit;font-size:13px;font-weight:700;min-height:44px;padding:10px 13px;border:1px solid #c4d0c1;border-radius:8px;background:#fff;color:#2a4b3c;cursor:pointer}button.primary{background:#245c4c;border-color:#245c4c;color:#fff}button:disabled{opacity:.5;cursor:default}.small{font-size:12px}.text-button{border-color:transparent;background:transparent;color:#895044}.actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px}label,legend{display:block;font-weight:700;font-size:13px;margin:16px 0 7px}input,select,textarea{width:100%;min-width:0;box-sizing:border-box;border:1px solid #c6d1c1;border-radius:8px;background:#fff;color:#233b32;font:inherit;font-size:15px;padding:11px;min-height:44px}.pair{display:grid;grid-template-columns:1fr 1.6fr;gap:14px;align-items:end}fieldset{border:1px solid #dfe5db;border-radius:9px;padding:4px 12px 12px;margin:18px 0;min-width:0}.choice{display:flex;align-items:center;gap:10px;font-weight:400}.choice input{width:18px;height:18px;min-height:18px;accent-color:#245c4c;flex-shrink:0}.amharic{font-size:13px;color:#667b6b}.draft-line{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid #e1e7dc;padding:8px 0;font-size:14px}small{display:block;font-size:12px;color:#647868;margin:6px 0}.amounts{display:grid;grid-template-columns:1fr auto;gap:8px;font-size:14px;margin:20px 0}.amounts dd{margin:0;text-align:right}.amounts dt:last-of-type,.amounts dd:last-child{border-top:1px solid #dce4d8;padding-top:10px}.order{border-top:1px solid #dce5d8;padding:20px 0;margin-top:16px}.order ul{list-style:none;padding:0;font-size:14px}.order li{padding:6px 0}.order li p,.order-note{font-size:13px;color:#5b7161}.order-note{padding:10px;background:#f5f7f1;border-radius:8px;overflow-wrap:anywhere}.empty{padding:24px 0;color:#6b7c6d;font-size:14px}.balance,.retry{padding:15px;background:#fff5de;border:1px solid #dece9a;border-radius:9px;margin-top:18px;font-size:14px}.error{background:#fff0e9;color:#7b3328;border:1px solid #d59988;border-radius:9px;padding:14px;margin-bottom:16px;overflow-wrap:anywhere}.message{background:#e6f3e7;color:#29543a;padding:12px;border-radius:9px;font-size:14px;margin-bottom:16px}.cancellation{margin-top:24px}.draft-review{border-color:#c3a45c;margin-bottom:24px}input:focus,select:focus,textarea:focus,button:focus-visible{outline:3px solid #a5c8b1;outline-offset:2px}
  @media(max-width:800px){.layout{grid-template-columns:1fr}.tables article{display:flex;justify-content:space-between;align-items:center;gap:12px}.tables article>div{display:block;margin:0}.table-state{display:block;margin-top:6px}.panel{padding:17px}header{display:block}header>button{margin-top:14px}.status{margin-left:0;display:block;white-space:normal}.pair{grid-template-columns:1fr}.heading{align-items:start}.rehearsal{padding:14px}.actions button{flex-grow:1}}
  .preparation .layout{grid-template-columns:1fr}
  .table-actions{display:flex;flex-wrap:wrap;gap:6px}
</style>
