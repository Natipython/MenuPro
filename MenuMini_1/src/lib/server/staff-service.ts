import {issueGuestCapability} from './guest-access';
import { CatalogCommandError, merchantTransaction } from './merchant-catalog';
import type { MerchantPrincipal } from './merchant-catalog';
import { readOperation } from '$lib/service/model';
import type { ServiceOperation } from '$lib/service/model';
import { UUID } from '$lib/workspace/model';
export async function serviceCommand(principal:MerchantPrincipal,resourceId:string,operation:ServiceOperation,body:Record<string,unknown>={},key?:string,branchScope?:string):Promise<unknown> {
  if (!UUID.test(resourceId)) throw new CatalogCommandError(400,'INVALID_ID','A valid service resource is required.');
  if(operation==='ISSUE_TABLE_LINK'||operation==='ISSUE_INVITATION'){
    if(!key||!UUID.test(key))throw new CatalogCommandError(400,'IDEMPOTENCY_KEY_REQUIRED','A valid request key is required.');
    return issueGuestCapability(principal,resourceId,operation==='ISSUE_TABLE_LINK'?'TABLE_LINK':'VISIT_INVITATION',body.expectedVersion as number,key);
  }
  const reads:Partial<Record<ServiceOperation,{sql:string;args:unknown[]}>>={
    TABLES:{sql:'select menumini.list_dining_tables($1) as result',args:[resourceId]},
    READ_VISIT:{sql:'select menumini.read_staff_visit($1) as result',args:[resourceId]},
    OFFER:{sql:'select menumini.read_service_offer($1) as result',args:[resourceId]},
    QUEUE:{sql:'select menumini.read_service_queue($1,$2,$3) as result',args:[resourceId,body.limit??50,body.cursor??null]},
    READ_ORDER:{sql:'select menumini.read_operational_order($1) as result',args:[resourceId]},
    READ_BILL:{sql:'select menumini.read_bill($1) as result',args:[resourceId]}
  };
  return merchantTransaction(principal,readOperation(operation),async client=>{
    if(branchScope) {
      if(!UUID.test(branchScope))throw new CatalogCommandError(400,'INVALID_ID','A valid branch is required.');
      const scope=await client.query('select exists(select from menumini.dining_tables where id=$1 and venue_id=$2 and merchant_id=menumini.current_merchant()) as allowed',[resourceId,branchScope]);
      if(!scope.rows[0]?.allowed)throw new CatalogCommandError(403,'PERMISSION_DENIED','This table does not belong to the selected branch.');
    }
    const call=reads[operation] || {sql:'select menumini.staff_service_command($1,$2,$3::jsonb,$4) as result',args:[resourceId,operation,JSON.stringify(body),key]};
    const response=await client.query(call.sql,call.args);
    return response.rows[0]?.result;
  });
}
