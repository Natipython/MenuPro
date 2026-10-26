<script lang="ts">
 import CashierBoard from '$lib/cashier/CashierBoard.svelte';
 import {httpPayerStaffGateway} from '$lib/payer/client';
 import {httpCashierGateway} from '$lib/cashier/client';
 import type {PageData} from './$types';
 export let data:PageData;
</script>
<svelte:head><title>Cashier bills · MenuMini</title><meta name="robots" content="noindex"/></svelte:head>
{#if data.access}{#key data.recoveryIdentity?.scope}<CashierBoard gateway={httpCashierGateway(data.csrfToken,data.branchId)} payerGateway={httpPayerStaffGateway(data.csrfToken)} recoveryIdentity={data.recoveryIdentity} branchId={data.branchId}/>{/key}{:else}
 <main><a href="/workspace">MenuMini</a><h1>Verified cashier access is required.</h1><p>Phone verification and trusted sign-in are still being connected. Branch IDs and preparation files grant no financial access.</p><a href="/service/rehearsal">Try the fictional service and cashier rehearsal →</a></main>
{/if}
<style>main{max-width:620px;margin:60px auto;padding:24px;border:1px solid #d9e1d5;border-radius:14px;background:#fff;color:#243b35;font-family:Arial,sans-serif}h1{font-size:30px}p{line-height:1.7}a{color:#245c4c}</style>
