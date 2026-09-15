import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../shopify.server";
export const loader=async({request}:LoaderFunctionArgs)=>login(request);
export const action=async({request}:ActionFunctionArgs)=>login(request);
export default function Login(){const loaderData=useLoaderData<any>();const actionData=useActionData<any>();const errors=actionData?.errors||loaderData?.errors;return <main style={{maxWidth:520,margin:"80px auto",fontFamily:"system-ui",padding:24}}><h1>BuyerOrigin</h1><p>Enter the Shopify store domain to install or open BuyerOrigin.</p><Form method="post"><label>Shop domain<input name="shop" placeholder="store.myshopify.com" style={{display:"block",width:"100%",padding:10,margin:"8px 0"}}/></label>{errors?.shop?<p>{errors.shop}</p>:null}<button type="submit">Continue with Shopify</button></Form></main>;}
