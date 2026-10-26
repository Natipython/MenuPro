import type {PageServerLoad} from './$types';
import {verifiedMerchantIdentity} from '$lib/server/catalog-http';
import {merchantTransaction} from '$lib/server/merchant-catalog';
import {UUID} from '$lib/workspace/model';
export const load:PageServerLoad=async({params,setHeaders})=>{
  setHeaders({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
  const principal=await verifiedMerchantIdentity();
  if(!principal||!UUID.test(params.branchId))return{access:false,branchId:params.branchId,csrfToken:'',canManageTables:false,recoveryIdentity:null};
  return merchantTransaction(principal,true,async client=>{
    const result=await client.query("select menumini.has_permission($1,'orders.prepare') as allowed,menumini.is_business_owner() as owner",[params.branchId]);
    return{access:!!result.rows[0]?.allowed,branchId:params.branchId,csrfToken:result.rows[0]?.allowed?principal.csrfToken:'',canManageTables:!!result.rows[0]?.owner,recoveryIdentity:result.rows[0]?.allowed?{scope:principal.businessId+':'+principal.userId+':'+params.branchId,secret:principal.csrfToken}:null};
  });
};
