import { couponState } from "./state.server";

const FUNCTION_HANDLE="buyerorigin-discount-guard";
const CREATE=`mutation Create($input: DiscountAutomaticAppInput!){discountAutomaticAppCreate(automaticAppDiscount:$input){automaticAppDiscount{discountId} userErrors{field message}}}`;
const UPDATE=`mutation Update($id: ID!, $input: DiscountAutomaticAppInput!){discountAutomaticAppUpdate(id:$id,automaticAppDiscount:$input){automaticAppDiscount{discountId} userErrors{field message}}}`;

function inputFor(state:any){return {title:"BuyerOrigin Coupon Guard",functionHandle:FUNCTION_HANDLE,discountClasses:["ORDER"],startsAt:new Date().toISOString(),combinesWith:{orderDiscounts:true,productDiscounts:true,shippingDiscounts:true},metafields:[{namespace:"$app",key:"buyerorigin-state",type:"json",value:JSON.stringify(state)}]};}
async function graph(admin:any,query:string,variables:any){const response=await admin.graphql(query,{variables});const json=await response.json();return json.data;}
export async function createGuard(admin:any,shop:string,policy:any){const state=await couponState(shop,policy);const data=await graph(admin,CREATE,{input:inputFor(state)});const errors=data?.discountAutomaticAppCreate?.userErrors||[];if(errors.length)throw new Error(errors.map((e:any)=>e.message).join("; "));return data.discountAutomaticAppCreate.automaticAppDiscount.discountId;}
export async function refreshGuard(admin:any,shop:string,policy:any){if(!policy.discountId)return createGuard(admin,shop,policy);const state=await couponState(shop,policy);const data=await graph(admin,UPDATE,{id:policy.discountId,input:inputFor(state)});const errors=data?.discountAutomaticAppUpdate?.userErrors||[];if(errors.length)throw new Error(errors.map((e:any)=>e.message).join("; "));return policy.discountId;}
