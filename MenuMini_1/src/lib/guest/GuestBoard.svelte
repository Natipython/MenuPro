<script lang="ts">
 import RecoveryPanel from '$lib/recovery/RecoveryPanel.svelte';
 import {CommandRecovery,RecoveryError,httpRecoveryTransport,hasSavedRecovery} from '$lib/recovery/client';

 import PayerBoard from '$lib/payer/PayerBoard.svelte';
 import {deviceCode} from '$lib/payer/model';
 import {httpPayerGateway} from '$lib/payer/client';
 import type {PayerGateway} from '$lib/payer/client';
 import {onMount,tick} from 'svelte';
 import {httpGuestGateway,GuestClientError} from './client';
 import type {GuestGateway} from './client';
 import {parseInvitation} from './model';
 import type {GuestContext,GuestOrder,GuestOrderList,GuestOperation} from './model';
 import {estimateSelection} from '$lib/service/model';
 import type {ServiceOffer,Selection,OrderStatus} from '$lib/service/model';
 let context:GuestContext|null=null;
 export let gateway:GuestGateway=httpGuestGateway(()=>context?.csrfToken||'');
 export let payerGateway:PayerGateway=httpPayerGateway(()=>context?.csrfToken||'');
 export let rehearsal=false;
 let payerReview=false;
 let recovery:CommandRecovery|null=null;let recoveryBlocked=false;let recoveryScope='';let earlierAttempt=false;
 export let guestLabel='Guest';
 export let onReviewState:(blocked:boolean)=>void=()=>{};
 let offer:ServiceOffer|null=null;let orders:GuestOrder[]=[];let nextCursor:string|null=null;
 let tableToken='';let invitation='';let itemId='';let choiceIds:string[]=[];let quantity=1;let instructions='';let note='';let cart:Selection[]=[];
 let error='';let message='';let busy=false;let reading=false;let loading=true;let stale=false;let leaveReview=false;let menuReview=false;
 let pending:{op:GuestOperation;resource:string|null;body:Record<string,unknown>;key:string}|null=null;
 $: items=offer?.menu.content.sections.flatMap(s=>s.items)||[];
 $: item=items.find(i=>i.id===itemId);
 $: estimate=(()=>{try{return offer&&cart.length?estimateSelection(offer,cart):null;}catch{return null;}})();
 $: ownReview=!!pending||cart.length>0||!!note.trim()||!!invitation.trim()||leaveReview||menuReview||recoveryBlocked;
 $: onReviewState(ownReview||payerReview);
 $: canOrder=!!context?.association?.canSubmitOrders&&!stale;
 const statusLabel:Record<OrderStatus,string>={SUBMITTED:'Awaiting staff acceptance',ACCEPTED:'Accepted',PREPARING:'Preparing',READY:'Ready to serve',COMPLETED:'Served',CANCELLED:'Cancelled / declined'};
 function pickItem(){choiceIds=[];quantity=1;instructions='';}
 async function loadOffer(){offer=await gateway.call<ServiceOffer>('OFFER');if(!offer.menu.content.sections.flatMap(s=>s.items).some(i=>i.id===itemId))itemId=offer.menu.content.sections.flatMap(s=>s.items).find(i=>i.availableNow)?.id||'';pickItem();stale=false;}
 async function refresh(initial=false,announce=false){
  if(busy||reading||payerReview)return;reading=true;
  try{
   context=await gateway.call<GuestContext>('CONTEXT');
   if(!rehearsal&&recoveryScope!==context.session.venueId+':'+context.session.id){recoveryScope=context.session.venueId+':'+context.session.id;recoveryBlocked=true;recovery=new CommandRecovery('GUEST',{scope:context.session.venueId+':'+context.session.id,secret:context.csrfToken},httpRecoveryTransport('GUEST','',()=>context?.csrfToken||''),c=>gateway.call('SUBMIT',null,c.body,c.requestKey));}
   const page=await gateway.call<GuestOrderList>('ORDERS');orders=page.items;nextCursor=page.nextCursor;
   if(initial||!offer)await loadOffer();
   if(announce)message='Your order status is up to date.';
  }catch(e){
   if(e instanceof GuestClientError&&e.status===401){context=null;recovery=null;recoveryBlocked=false;recoveryScope='';offer=null;orders=[];nextCursor=null;if(!rehearsal)hasSavedRecovery().then(value=>earlierAttempt=value).catch(()=>{});if(!initial)error='This session has ended. Ask staff to resolve any unconfirmed request before entering a replacement.';}
   else error=e instanceof Error?e.message:'Your status could not be refreshed.';
  }finally{loading=false;reading=false;}
 }
 onMount(()=>{
  refresh(true);
  const timer=setInterval(()=>{if(context&&!document.hidden&&!busy&&!pending&&!leaveReview&&!menuReview&&!payerReview)refresh();},15000);
  const beforeUnload=(e:BeforeUnloadEvent)=>{const saved=!!pending&&pending.key===recovery?.snapshot().record?.requestKey;if(!saved&&(pending||cart.length||note.trim())){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',beforeUnload);
  return()=>{clearInterval(timer);window.removeEventListener('beforeunload',beforeUnload);};
 });
 async function execute(command:NonNullable<typeof pending>){
  if(busy||reading||payerReview)return;pending=command;busy=true;error='';message='';
  try{
   const result=command.op==='SUBMIT'&&recovery?await recovery.run<unknown>({operation:command.op,resourceId:String(command.body.visitId),body:command.body,requestKey:command.key}):await gateway.call<unknown>(command.op,command.resource,command.body,command.key);pending=null;
   if(command.op==='START'){context=result as GuestContext;tableToken='';message='Table session started. Ask staff for an invitation to your seating.';}
   else if(command.op==='PAIR'){invitation='';message='You joined this seating. You can now send an order request.';}
   else if(command.op==='SUBMIT'){cart=[];note='';instructions='';message='Request saved. Please wait for staff acceptance.';}
   else if(command.op==='REVOKE'){context=null;recovery=null;recoveryBlocked=false;recoveryScope='';offer=null;orders=[];cart=[];note='';invitation='';leaveReview=false;message='Session ended. Access to its previous orders is now closed.';return;}
   busy=false;await refresh(command.op==='START');
  }catch(e){
   if(e instanceof RecoveryError&&e.notSent)pending=null;
   if(e instanceof GuestClientError&&e.status>0&&e.status<500&&!recovery?.snapshot().blocked)pending=null;
   if(e instanceof GuestClientError&&e.status===409)stale=true;
   error=e instanceof Error?e.message:'Request interrupted. Retry unchanged.';
  }finally{busy=false;}
 }
 function command(op:GuestOperation,body:Record<string,unknown>={},resource:string|null=null){
  if(busy||reading||payerReview||pending||recoveryBlocked)return;
  if(op==='START'){const bytes=crypto.getRandomValues(new Uint8Array(32));const nonce=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');body={...body,sessionNonce:nonce};}
  execute({op,resource,body:structuredClone(body),key:crypto.randomUUID()});
 }
 function join(){const value=parseInvitation(invitation);if(!value){error='Use the complete invitation from staff, including its visit and code.';return;}command('PAIR',{pairingToken:value.pairingToken},value.visitId);}
 function chooseOption(id:string,groupId:string,single:boolean){const g=item?.modifiers.find(g=>g.id===groupId);if(!g)return;choiceIds=single?[...choiceIds.filter(c=>!g.choices.some(o=>o.id===c)),id]:choiceIds.includes(id)?choiceIds.filter(c=>c!==id):[...choiceIds,id];}
 function add(){if(!offer||!item)return;const value:Selection={itemId:item.id,quantity,choiceIds:[...choiceIds],...(instructions?{specialInstructions:instructions}:{})};
  try{estimateSelection(offer,[value]);cart=[...cart,value];error='';message='Added to your unsent order.';}catch(e){error=e instanceof Error?e.message:'Check the required options.';}}
 function submit(){if(!context?.association||!offer||!estimate||!canOrder)return;command('SUBMIT',{visitId:context.association.visitId,menuPublicationId:offer.menu.publicationId,pricingFingerprint:offer.pricingFingerprint,items:cart,...(note?{customerNote:note}:{})});}
 async function recovered(state:'COMMITTED'|'CANCELLED',key:string){const originalDraft=pending?.key===key;recoveryBlocked=false;pending=null;if(originalDraft){cart=[];note='';instructions='';}stale=state==='CANCELLED';error='';message=state==='COMMITTED'?'The earlier order request was recorded. Current status is shown below.':'The original attempt is cancelled. Reload the menu and review a new request before sending.';await tick();await refresh();}
 async function more(){if(!nextCursor||busy||pending)return;busy=true;try{const page=await gateway.call<GuestOrderList>('ORDERS',null,{cursor:nextCursor});const map=new Map(orders.map(o=>[o.id,o]));page.items.forEach(o=>map.set(o.id,o));orders=[...map.values()];nextCursor=page.nextCursor;}catch(e){error=e instanceof Error?e.message:'Could not load more.';}finally{busy=false;}}
 async function reloadMenu(){if(busy||reading||payerReview||pending)return;if(cart.length||note.trim()){menuReview=true;return;}try{await loadOffer();error='';}catch(e){error=e instanceof Error?e.message:'Menu unavailable.';}}
 async function discardAndReload(){cart=[];note='';instructions='';menuReview=false;message='Draft discarded. Reloading the current menu.';await reloadMenu();}
</script>
<svelte:head>{#if !rehearsal}<title>Your table & orders · MenuMini</title>{/if}<meta name="robots" content="noindex" /></svelte:head>
<main class="guest-board">
 <header><a href="/" class="brand">MenuMini</a><span class="tag">{rehearsal?guestLabel:'Your visit'}</span></header>
 {#if rehearsal}<aside class="fictional"><strong>Fictional guest rehearsal</strong><p>This guest shares service records with the floor, preparation and cashier views. Changes stay in this page’s memory; reload resets the rehearsal.</p></aside>{/if}
 <div class="title"><div><p class="eyebrow">YOUR TABLE · YOUR ORDERS</p><h1>{context?context.session.tableLabel:'Welcome to your table'}</h1><p>{context?'Send a request, then follow its progress here.':'Use the table link supplied by the venue.'}</p></div>{#if context}<button type="button" disabled={recoveryBlocked||busy||reading||payerReview||!!pending} on:click={()=>refresh(false,true)}>Refresh status</button>{/if}</div>
 {#if error}<p class="error" role="alert">{error}</p>{/if}{#if message}<p class="message" role="status">{message}</p>{/if}
 {#if recovery}{#key recovery}<RecoveryPanel controller={recovery} onBlocked={value=>recoveryBlocked=value} onResolved={recovered}/>{/key}{/if}
 {#if pending&&!busy&&!recovery?.snapshot().blocked}<aside class="retry"><strong>Result not confirmed.</strong><p>Your request may have saved. Keep this page open and retry the same request before doing anything else.</p><button type="button" on:click={()=>pending&&execute(pending)}>Retry unchanged request</button></aside>{/if}
 {#if loading}<p>Loading your session…</p>{:else if !context}
  {#if earlierAttempt}<aside class="retry"><strong>An earlier saved attempt is unresolved.</strong><p>Ask staff to check it before sending a replacement or reporting a transfer again. A new table session will not restore the earlier session’s authority.</p></aside>{/if}
  <section class="panel entry"><h2>Start a table session</h2><p class="hint">A table session lets you browse. Staff will provide a separate invitation before you can order.</p><form on:submit|preventDefault={()=>command('START',{tableToken})}><label for="guest-table-code">Table access code</label><input id="guest-table-code" bind:value={tableToken} autocomplete="off" autocapitalize="none" spellcheck={false} maxlength="43" required disabled={recoveryBlocked||busy||reading||payerReview||!!pending}/><button type="submit" class="primary" disabled={recoveryBlocked||busy||reading||payerReview||!!pending||tableToken.length!==43}>Start table session</button></form></section>
 {:else}
  <section class="panel association"><div class="section-heading"><h2>{context.association?'Your seating':'Join your seating'}</h2><span class="tag">{context.association?(context.association.canSubmitOrders?'Joined':'Requests closed'):'Waiting for staff'}</span></div>
   {#if !context.association}<p>Ask staff to confirm your table and give you a private invitation. It expires after five minutes.</p><form on:submit|preventDefault={join}><label for="guest-invitation">Invitation from staff</label><textarea id="guest-invitation" bind:value={invitation} rows="2" maxlength="100" autocomplete="off" autocapitalize="none" spellcheck={false} disabled={recoveryBlocked||busy||reading||payerReview||!!pending}></textarea><button type="submit" class="primary" disabled={recoveryBlocked||busy||reading||payerReview||!!pending||!invitation.trim()}>Join confirmed seating</button><button type="button" disabled={recoveryBlocked||busy||reading||payerReview||!!pending} on:click={()=>invitation=''}>Clear invitation</button></form>
   {:else if !context.association.canSubmitOrders}<p>This seating is no longer accepting new requests. Your own orders remain available while this session is active. Ask staff for help with the bill.</p>
   {:else}<p>You are connected to this seating. Every request still needs staff acceptance.</p>{/if}
   <p class="hint">Device code: <strong>{deviceCode(context.session.id)}</strong> · Show this to the cashier for shared bill authorization.</p>
   <p class="hint">This screen shows your orders. The combined table bill and payment records require separate staff authorization.</p>
  </section>
  <div class="layout" class:has-orders={orders.length>0}>
   <section class="panel menu"><div class="section-heading"><h2>{canOrder?'Choose your order':'Browse menu'}</h2><button type="button" disabled={recoveryBlocked||busy||reading||payerReview||!!pending||menuReview} on:click={reloadMenu}>Reload menu</button></div>
    {#if menuReview}<aside class="retry"><p>Your draft uses the previous menu. Review it before loading new prices.</p><button type="button" on:click={()=>menuReview=false}>Keep draft</button><button type="button" on:click={discardAndReload}>Discard draft and reload</button></aside>{/if}
    {#if stale}<p class="error">The menu or seating changed. Reload the menu and review before sending another request.</p>{/if}
    {#if offer}<label for="guest-item">Menu item</label><select id="guest-item" bind:value={itemId} on:change={pickItem} disabled={recoveryBlocked||busy||reading||payerReview||!!pending||menuReview}>{#each items as candidate}<option value={candidate.id} disabled={!candidate.availableNow}>{candidate.nameEn} · ETB {candidate.basePrice}{!candidate.availableNow?' · unavailable':''}</option>{/each}</select>
     {#if item?.nameAm}<p lang="am" class="hint">{item.nameAm}</p>{/if}
     {#if item}{#each item.modifiers as group}<fieldset disabled={recoveryBlocked||!canOrder||busy||reading||payerReview||!!pending||menuReview}><legend>{group.label} · choose {group.minSelections}–{group.maxSelections}</legend>{#each group.choices as choice}<label class="choice"><input type={group.mode==='SINGLE_SELECT'?'radio':'checkbox'} name={group.id} checked={choiceIds.includes(choice.id)} disabled={!choice.isAvailable} on:change={()=>chooseOption(choice.id,group.id,group.mode==='SINGLE_SELECT')}/>{choice.label} · ETB {choice.priceDelta}{!choice.isAvailable?' · unavailable':''}</label>{/each}</fieldset>{/each}
      <div class="pair"><div><label for="guest-quantity">Quantity</label><input id="guest-quantity" type="number" min="1" max="99" bind:value={quantity} disabled={recoveryBlocked||!canOrder||busy||reading||payerReview||!!pending||menuReview}/></div><button type="button" disabled={recoveryBlocked||!canOrder||busy||reading||payerReview||!!pending||menuReview||!item.availableNow||cart.length>=100} on:click={add}>Add to my draft</button></div>
      <label for="guest-instructions">Item instructions (optional)</label><input id="guest-instructions" bind:value={instructions} maxlength="500" disabled={recoveryBlocked||!canOrder||busy||reading||payerReview||!!pending||menuReview}/>
     {/if}
     {#if cart.length}<h3>Review your request</h3>{#each cart as line,index}<div class="draft-line"><span>{line.quantity} × {items.find(i=>i.id===line.itemId)?.nameEn}<small>{items.find(i=>i.id===line.itemId)?.modifiers.flatMap(g=>g.choices.filter(c=>line.choiceIds.includes(c.id)).map(c=>c.label)).join(', ')}</small></span><button type="button" aria-label={'Remove my draft line '+(index+1)} disabled={recoveryBlocked||busy||reading||payerReview||!!pending||menuReview} on:click={()=>cart=cart.filter((_,i)=>i!==index)}>Remove</button></div>{/each}
      <label for="guest-note">Order note (optional)</label><textarea id="guest-note" bind:value={note} maxlength="1000" rows="2" disabled={recoveryBlocked||busy||reading||payerReview||!!pending||menuReview}></textarea>
      {#if estimate}<dl><dt>Items</dt><dd>ETB {estimate.subtotalAmount}</dd><dt>Service</dt><dd>ETB {estimate.serviceAmount}</dd><dt>Added tax</dt><dd>ETB {estimate.taxAmount}</dd><dt>Estimated total</dt><dd><strong>ETB {estimate.totalAmount}</strong></dd></dl>{/if}
      <button type="button" class="primary" disabled={recoveryBlocked||!canOrder||busy||reading||payerReview||!!pending||menuReview||!estimate} on:click={submit}>Send my order request</button><button type="button" disabled={recoveryBlocked||busy||reading||payerReview||!!pending} on:click={()=>{cart=[];note='';instructions='';}}>Discard my draft</button><p class="hint">The venue checks prices and availability again. Sending this request records no payment.</p>
     {/if}
    {:else}<p class="hint">The menu is temporarily unavailable. Staff can take your order.</p>{/if}
   </section>
   <section class="panel tracking"><div class="section-heading"><h2>My orders</h2><span class="tag">{orders.length}{nextCursor?' +':''}</span></div><p class="hint">Status refreshes every 15 seconds while this page is visible. “Served” does not mean paid.</p>
    {#each orders as order(order.id)}<article class="order"><div class="section-heading"><span class="status">{statusLabel[order.status]}</span><strong>ETB {order.totalAmount}</strong></div><p class="hint">Request {order.id.slice(-6)} · {new Date(order.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Addis_Ababa'})} EAT</p><ul>{#each order.items as line}<li><strong>{line.quantity} × {line.nameEn}</strong>{#if line.nameAm}<span lang="am"> · {line.nameAm}</span>{/if}{#if line.selectedOptions.length}<small>{line.selectedOptions.join(', ')}</small>{/if}{#if line.specialInstructions}<p>{line.specialInstructions}</p>{/if}</li>{/each}</ul>{#if order.customerNote}<p class="note">{order.customerNote}</p>{/if}{#if order.status==='SUBMITTED'}<p class="hint">Staff have not accepted this request yet. For changes or cancellation, speak to staff.</p>{/if}</article>{:else}<p class="empty">You have no saved orders in this session.</p>{/each}
    {#if nextCursor}<button type="button" disabled={recoveryBlocked||busy||reading||payerReview||!!pending} on:click={more}>Load more of my orders</button>{/if}
   </section>
  </div>
  {#key context.session.id}<PayerBoard gateway={payerGateway} sessionId={context.session.id} csrfToken={context.csrfToken} venueId={context.session.venueId} {rehearsal} blocked={ownReview||busy||reading} onReviewState={value=>payerReview=value}/>{/key}
  <footer><p class="hint">Keep this session on your device. Leaving closes access to its previous orders.</p><button type="button" disabled={recoveryBlocked||busy||reading||payerReview||!!pending||cart.length>0||!!note.trim()} on:click={()=>leaveReview=true}>Leave this session</button></footer>
  {#if leaveReview}<section class="panel leave" aria-label="Leave session review"><h2>Leave this table session?</h2><p>This removes this device’s access to these orders. Orders already sent and any payment obligations remain with the venue.</p><button type="button" class="primary" disabled={recoveryBlocked||busy||reading||payerReview||!!pending} on:click={()=>command('REVOKE')}>Confirm leave session</button><button type="button" disabled={recoveryBlocked||busy||reading||payerReview||!!pending} on:click={()=>leaveReview=false}>Keep session</button></section>{/if}
 {/if}
</main>
<style>
 .guest-board{max-width:1120px;margin:0 auto;padding:clamp(16px,4vw,36px);font-family:Arial,sans-serif;background:#f4f6f2;min-height:100vh;color:#233b32}header,.title,.section-heading{display:flex;justify-content:space-between;gap:16px;align-items:center}header{margin-bottom:24px}.brand{font-size:24px;font-weight:800;text-decoration:none;color:#245c4c}.title{align-items:start;margin:24px 0}.eyebrow{font-size:11px;letter-spacing:.1em;font-weight:700}h1{font-size:clamp(29px,4vw,38px);margin:8px 0}h2{font-size:20px;margin:0}h3{font-size:17px}p{font-size:15px;line-height:1.6;margin:10px 0}.panel{background:#fff;border:1px solid #d9e1d5;border-radius:14px;padding:22px;min-width:0}.association{margin-bottom:24px}.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}.tag,.status{font-size:12px;border-radius:7px;background:#edf2e9;padding:7px 10px}.status{font-weight:700}.hint,small{font-size:13px;color:#627568}small{display:block;margin:6px 0}.fictional,.retry{padding:16px 20px;border:1px solid #d8c483;background:#fff6d9;border-radius:10px;margin-bottom:20px}.fictional p{font-size:13px;margin-bottom:0}.error{padding:14px;border:1px solid #d59988;border-radius:9px;background:#fff0e9;color:#7b3328;overflow-wrap:anywhere}.message{padding:12px;background:#e6f3e7;border-radius:9px;color:#29543a}button{min-height:44px;font:inherit;font-size:13px;font-weight:700;border:1px solid #c4d0c1;border-radius:8px;padding:10px 13px;background:#fff;color:#2a4b3c;cursor:pointer}.primary{background:#245c4c;border-color:#245c4c;color:#fff}button:disabled{opacity:.5;cursor:default}label,legend{font-size:13px;font-weight:700;display:block;margin:16px 0 7px}input,select,textarea{box-sizing:border-box;width:100%;min-width:0;min-height:44px;border:1px solid #c6d1c1;border-radius:8px;background:#fff;padding:11px;color:#233b32;font:inherit;font-size:15px}textarea{resize:vertical}form button{margin-top:14px}fieldset{min-width:0;border:1px solid #dfe5db;border-radius:9px;margin:18px 0;padding:4px 12px 12px}.choice{display:flex;gap:10px;align-items:center;font-weight:400}.choice input{width:18px;min-height:18px;height:18px;flex-shrink:0;accent-color:#245c4c}.pair{display:grid;grid-template-columns:1fr 1.5fr;gap:14px;align-items:end}.draft-line{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #e1e7dc}.draft-line span{font-size:14px}dl{display:grid;grid-template-columns:1fr auto;gap:10px;font-size:14px;margin:22px 0}dd{margin:0}dt:last-of-type,dd:last-child{border-top:1px solid #dce4d8;padding-top:12px}.order{padding:20px 0;border-top:1px solid #dce5d8;margin-top:18px}.order ul{list-style:none;padding:0;font-size:14px}.order li{padding:6px 0}.order li p,.note{font-size:13px;overflow-wrap:anywhere}.note{background:#f5f7f1;padding:10px;border-radius:8px}.empty{padding:24px 0;font-size:14px;color:#627568}footer{margin-top:24px}.leave{margin-top:20px}.retry button,.leave button{margin:8px 5px 0 0}input:focus,select:focus,textarea:focus,button:focus-visible{outline:3px solid #a5c8b1;outline-offset:2px}.entry{max-width:600px}
 @media(max-width:760px){.layout{grid-template-columns:1fr}.layout.has-orders .tracking{order:-1}.panel{padding:17px}.title{display:block}.title>button{margin-top:10px}.pair{grid-template-columns:1fr}.section-heading{align-items:start}.tag,.status{white-space:normal}.fictional{padding:14px}.tracking .section-heading strong{white-space:nowrap;font-size:14px}}
</style>
