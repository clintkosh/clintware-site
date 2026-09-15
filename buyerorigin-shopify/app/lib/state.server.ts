import crypto from "node:crypto";
import prisma from "../db.server";
import { buildCouponState, keyedToken } from "../../src/compact-state.js";
import { extractCouponUses } from "../../src/order-ingest.js";

export function merchantStateKey(shop: string) {
  const master=process.env.BUYERORIGIN_MASTER_KEY;
  if (!master) throw new Error("BUYERORIGIN_MASTER_KEY is required");
  return crypto.createHmac("sha256",master).update(`buyerorigin:${shop.toLowerCase()}`).digest("base64url");
}
export async function ensureMerchant(shop: string) {
  return prisma.merchant.upsert({where:{shop},update:{uninstalledAt:null},create:{shop}});
}
export async function ingestOrder(shop: string, payload: any) {
  const merchant=await ensureMerchant(shop); const secret=merchantStateKey(shop); const uses=extractCouponUses(payload,secret);
  for (const use of uses) await prisma.couponUse.upsert({where:{merchantId_orderId_couponKey:{merchantId:merchant.id,orderId:use.orderId,couponKey:use.couponKey}},update:{emailKey:use.emailKey,phoneKey:use.phoneKey,addressKey:use.addressKey,usedAt:new Date(use.usedAt),discountAmount:use.discountAmount},create:{merchantId:merchant.id,orderId:use.orderId,couponKey:use.couponKey,emailKey:use.emailKey,phoneKey:use.phoneKey,addressKey:use.addressKey,usedAt:new Date(use.usedAt),discountAmount:use.discountAmount}});
  return uses;
}
export async function couponState(shop: string, policy: any) {
  const merchant=await ensureMerchant(shop); const secret=merchantStateKey(shop); const couponKey=keyedToken(secret,"code",policy.couponCode);
  const cutoff=new Date(Date.now()-Number(policy.lookbackDays||365)*86400000);
  const uses=await prisma.couponUse.findMany({where:{merchantId:merchant.id,couponKey,usedAt:{gte:cutoff}},orderBy:{usedAt:"asc"}});
  return buildCouponState({secret,couponCode:policy.couponCode,enabled:policy.enabled,policy,uses:uses.map((u:any)=>({orderId:u.orderId,emailKey:u.emailKey,phoneKey:u.phoneKey,addressKey:u.addressKey,usedAt:u.usedAt.toISOString()}))});
}
