import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
export const action=async({request}:ActionFunctionArgs)=>{const{shop}=await authenticate.webhook(request);const merchant=await prisma.merchant.findUnique({where:{shop}});if(merchant)await prisma.merchant.delete({where:{id:merchant.id}});await prisma.session.deleteMany({where:{shop}});return new Response("OK");};
