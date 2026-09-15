import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
export const action=async({request}:ActionFunctionArgs)=>{const{payload,session}=await authenticate.webhook(request);if(session)await prisma.session.update({where:{id:session.id},data:{scope:Array.isArray((payload as any).current)?(payload as any).current.join(","):session.scope}});return new Response("OK");};
