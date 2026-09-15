import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
export const loader=async({request}:LoaderFunctionArgs)=>{const url=new URL(request.url);const shop=url.searchParams.get("shop");return redirect(shop?`/app?shop=${encodeURIComponent(shop)}`:"/auth/login");};
