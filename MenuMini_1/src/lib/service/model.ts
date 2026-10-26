import { shape, UUID } from '$lib/workspace/model';
import type { FieldIssue } from '$lib/onboarding/registration';
import type { PublishedMenu } from '$lib/server/public-catalog';
export type OrderStatus = 'SUBMITTED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export interface StaffVisit { id:string; branchId:string; tableId:string; version:number; status:'OPEN'|'ENDED'; billId:string }
export interface DiningTable { id:string; branchId:string; label:string; active:boolean; version:number; visit:StaffVisit|null }
export interface ServiceOrder {
  id:string; visitId:string; branchId:string; source:'STAFF'|'GUEST'; status:OrderStatus; version:number; currency:'ETB';
  tableLabel:string; customerNote:string; createdAt:string; totalAmount:string; subtotalAmount:string; serviceAmount:string; taxAmount:string;
  allowedTransitions:OrderStatus[];
  items:{ id:string; nameEn:string; nameAm?:string; quantity:number; unitPrice:string; lineTotal:string; selectedOptions:string[]; specialInstructions?:string }[];
}
export interface ServiceQueue { branchId:string; items:ServiceOrder[]; nextCursor:string|null }
export interface ServiceOffer { menu:PublishedMenu; pricingFingerprint:string; pricing:{taxMode:'NONE'|'ADDED'|'INCLUDED'; taxRateBps:number; serviceRateBps:number; taxOnService:boolean} }
export interface Selection { itemId:string; quantity:number; choiceIds:string[]; specialInstructions?:string }
export type ServiceOperation = 'TABLES'|'CREATE_TABLE'|'UPDATE_TABLE'|'OPEN_STAFF_VISIT'|'READ_VISIT'|'END_VISIT'|'OFFER'|'SUBMIT_STAFF_ORDER'|'QUEUE'|'READ_ORDER'|'TRANSITION_ORDER'|'READ_BILL'|'ISSUE_TABLE_LINK'|'ISSUE_INVITATION';
export const readOperation = (op:ServiceOperation) => ['TABLES','READ_VISIT','OFFER','QUEUE','READ_ORDER','READ_BILL'].includes(op);
export function validateServiceCommand(operation:ServiceOperation, value:unknown):FieldIssue[] {
  const errors:FieldIssue[]=[]; const issue=(field:string,code:string)=>errors.push({field,code});
  const fields:Record<string,string[]>={CREATE_TABLE:['label'],UPDATE_TABLE:['expectedVersion','label','active'],
    OPEN_STAFF_VISIT:['tableId'],END_VISIT:['expectedVersion'],ISSUE_TABLE_LINK:['expectedVersion'],ISSUE_INVITATION:['expectedVersion'],SUBMIT_STAFF_ORDER:['visitId','menuPublicationId','items','customerNote','pricingFingerprint'],
    TRANSITION_ORDER:['expectedVersion','status','reason']};
  const allowed=fields[operation]; if (!allowed) return [{field:'$',code:'UNKNOWN_COMMAND'}];
  const required=allowed.filter(k=>!['customerNote','reason'].includes(k));
  if (!shape(value,allowed,required,'$',issue)) return errors;
  if ('expectedVersion' in value && (!Number.isInteger(value.expectedVersion) || (value.expectedVersion as number)<1 || (value.expectedVersion as number)>2147483646)) issue('expectedVersion','VERSION_REQUIRED');
  for (const k of ['tableId','visitId','menuPublicationId']) if (k in value && (typeof value[k]!=='string' || !UUID.test(value[k]))) issue(k,'INVALID_ID');
  const text=(v:unknown,max:number,field:string,required=false)=>{
    if (typeof v!=='string' || [...v].length>max || (required && !v.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) issue(field,'TEXT_INVALID');
  };
  if ('label' in value) { text(value.label,40,'label',true); if (typeof value.label==='string' && /[\r\n\t]/.test(value.label)) issue('label','TEXT_INVALID'); }
  if ('active' in value && typeof value.active!=='boolean') issue('active','BOOLEAN_REQUIRED');
  if ('customerNote' in value) text(value.customerNote,1000,'customerNote');
  if ('reason' in value) text(value.reason,160,'reason');
  if (operation==='TRANSITION_ORDER') {
    if (!['ACCEPTED','PREPARING','READY','COMPLETED','CANCELLED'].includes(value.status as string)) issue('status','TRANSITION');
    if (value.status==='CANCELLED' && (typeof value.reason!=='string' || !value.reason.trim())) issue('reason','CANCELLATION_REASON');
  }
  if (operation==='SUBMIT_STAFF_ORDER') {
    if (typeof value.pricingFingerprint!=='string' || !/^[0-9a-f]{64}$/.test(value.pricingFingerprint)) issue('pricingFingerprint','PRICE_POLICY_REQUIRED');
    if (!Array.isArray(value.items) || value.items.length<1 || value.items.length>100) issue('items','ITEM_LIMIT');
    else value.items.forEach((item,index)=>{
      const f='items.'+index;
      if (!shape(item,['itemId','quantity','choiceIds','specialInstructions'],['itemId','quantity','choiceIds'],f,issue)) return;
      if (typeof item.itemId!=='string' || !UUID.test(item.itemId)) issue(f+'.itemId','INVALID_ID');
      if (!Number.isInteger(item.quantity) || (item.quantity as number)<1 || (item.quantity as number)>99) issue(f+'.quantity','QUANTITY');
      if (!Array.isArray(item.choiceIds) || item.choiceIds.length>30 || item.choiceIds.some(id=>typeof id!=='string'||!UUID.test(id))
        || new Set((item.choiceIds as unknown[]).map(id=>String(id).toLowerCase())).size!==item.choiceIds.length) issue(f+'.choiceIds','CHOICES');
      if ('specialInstructions' in item) text(item.specialInstructions,500,f+'.specialInstructions');
    });
  }
  return errors.slice(0,64);
}
export function queueParameters(url:URL):{limit:number;cursor:string|null} {
  if ([...url.searchParams.keys()].some(k=>!['limit','cursor'].includes(k)) || url.searchParams.getAll('limit').length>1 || url.searchParams.getAll('cursor').length>1) throw new Error('Invalid queue parameters');
  const raw=url.searchParams.get('limit')||'50'; if (!/^[1-9]\d{0,2}$/.test(raw) || Number(raw)>100) throw new Error('Invalid queue limit');
  const cursor=url.searchParams.get('cursor');
  if (cursor && (cursor.length>100 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z~[0-9a-f-]{36}$/i.test(cursor)
    || !UUID.test(cursor.split('~')[1]) || !Number.isFinite(Date.parse(cursor.split('~')[0])))) throw new Error('Invalid queue cursor');
  return {limit:Number(raw),cursor:cursor||null};
}
export const moneyCents=(v:string)=>{ if (!/^-?(0|[1-9]\d{0,9})\.\d{2}$/.test(v)) throw new Error('Invalid exact amount'); return BigInt(v.replace('.','')); };
export const centsText=(v:bigint)=>{const sign=v<0n?'-':''; const n=v<0n?-v:v;return sign+(n/100n)+'.'+String(n%100n).padStart(2,'0');};
// Presentation estimate only; the real command prices again under a branch lock.
export function estimateSelection(offer:ServiceOffer, selections:Selection[]) {
  let subtotal=0n;
  for (const s of selections) {
    const item=offer.menu.content.sections.flatMap(s=>s.items).find(i=>i.id===s.itemId);
    if (!item || !item.availableNow || !Number.isInteger(s.quantity) || s.quantity<1 || s.quantity>99 || new Set(s.choiceIds).size!==s.choiceIds.length) throw new Error('Choose an available item and valid quantity.');
    let unit=moneyCents(item.basePrice); let matches=0;
    for (const g of item.modifiers) {
      const selected=g.choices.filter(c=>s.choiceIds.includes(c.id)); matches+=selected.length;
      if (selected.length<g.minSelections || selected.length>g.maxSelections || selected.some(c=>!c.isAvailable)) throw new Error('Check the required item options.');
      for (const c of selected) unit+=moneyCents(c.priceDelta);
    }
    if (matches!==s.choiceIds.length || unit<0n) throw new Error('Check the selected options.');
    subtotal+=unit*BigInt(s.quantity);
  }
  const round=(n:bigint)=> (n+5000n)/10000n;
  const service=round(subtotal*BigInt(offer.pricing.serviceRateBps));
  const tax=offer.pricing.taxMode==='ADDED'?round((subtotal+(offer.pricing.taxOnService?service:0n))*BigInt(offer.pricing.taxRateBps)):0n;
  const total=subtotal+service+tax; if (total>999999999999n) throw new Error('Total exceeds supported amount.');
  return {subtotalAmount:centsText(subtotal),serviceAmount:centsText(service),taxAmount:centsText(tax),totalAmount:centsText(total)};
}
