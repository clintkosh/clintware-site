import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { keyedToken } from "../../src/compact-state.js";
import { merchantStateKey } from "../lib/state.server";
export const action=async({request}:ActionFunctionArgs)=>{const{shop,payload}=await authenticate.webhook(request);const merchant=await prisma.merchant.findUnique({where:{shop}});if(merchant){const p:any=payload;const secret=merchantStateKey(shop);const emailKey=keyedToken(secret,"email",p?.customer?.email||"");const phoneKey=keyedToken(secret,"phone",p?.customer?.phone||"");const orders=(p?.orders_requested||[]).map((x:any)=>String(x));const ors:any[]=[];if(emailKey)ors.push({emailKey});if(phoneKey)ors.push({phoneKey});if(orders.length)ors.push({orderId:{in:orders}});const count=ors.length?await prisma.couponUse.count({where:{merchantId:merchant.id,OR:ors}}):0;console.info("BuyerOrigin privacy data request authenticated",{shop,requestId:p?.data_request?.id||null,matchedPseudonymousRecords:count});}return new Response("OK");};
