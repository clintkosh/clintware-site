import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
// BuyerOrigin stores pseudonymous coupon-use keys and no raw customer profile.  A customer-redact request is acknowledged; future reversible/raw fields must be deleted here.
export const action=async({request}:ActionFunctionArgs)=>{await authenticate.webhook(request);return new Response("OK");};
