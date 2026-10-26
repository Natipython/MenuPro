import { CatalogCommandError,merchantTransaction } from './merchant-catalog';
import type { MerchantPrincipal } from './merchant-catalog';
import { cashierRead } from '$lib/cashier/model';
import type { CashierOperation } from '$lib/cashier/model';
import { UUID } from '$lib/workspace/model';
export async function cashierCommand(principal:MerchantPrincipal,resource:string,operation:CashierOperation,body:Record<string,unknown>={},key?:string){
  if(!UUID.test(resource))throw new CatalogCommandError(400,'INVALID_ID','Use a valid settlement resource.');
  return merchantTransaction(principal,cashierRead(operation),async client=>{
    const call:{sql:string;args:unknown[]}=operation==='BILLS'?{sql:'select menumini.list_cashier_bills($1,$2,$3,$4) as result',args:[resource,body.limit??50,body.cursor??null,body.view??'UNRESOLVED']}:
      operation==='DETAIL'?{sql:'select menumini.read_cashier_detail($1) as result',args:[resource]}:
      {sql:'select menumini.cashier_command($1,$2,$3::jsonb,$4) as result',args:[resource,operation,JSON.stringify(body),key]};
    const response=await client.query(call.sql,call.args);return response.rows[0]?.result;
  });
}
