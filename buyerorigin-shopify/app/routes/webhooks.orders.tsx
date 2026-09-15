import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { ingestOrder } from "../lib/state.server";
import { refreshGuard } from "../lib/discount.server";
export const action=async({request}:ActionFunctionArgs)=>{const{shop,payload,admin}=await authenticate.webhook(request);await ingestOrder(shop,payload);if(admin){const merchant=await prisma.merchant.findUnique({where:{shop}});if(merchant){const policies=await prisma.couponPolicy.findMany({where:{merchantId:merchant.id,enabled:true}});for(const policy of policies){try{await refreshGuard(admin,shop,policy);}catch(error){console.error("BuyerOrigin guard refresh failed",{shop,policyId:policy.id,error});}}}}return new Response("OK");};
