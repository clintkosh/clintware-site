import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { redactCustomer } from "../lib/state.server";
import { refreshGuard } from "../lib/discount.server";
export const action=async({request}:ActionFunctionArgs)=>{const{shop,payload,admin}=await authenticate.webhook(request);await redactCustomer(shop,payload);const merchant=await prisma.merchant.findUnique({where:{shop}});if(merchant&&admin){const policies=await prisma.couponPolicy.findMany({where:{merchantId:merchant.id,enabled:true}});for(const policy of policies)await refreshGuard(admin,shop,policy);}else if(merchant&&!admin){return new Response("Redacted locally; checkout-state refresh requires retry",{status:503});}return new Response("OK");};
