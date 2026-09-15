import assert from "node:assert/strict";
import test from "node:test";
import { buildCouponState } from "../src/compact-state.js";
import { cartLinesDiscountsGenerateRun } from "../extensions/buyerorigin-discount-guard/src/cart_lines_discounts_generate_run.js";

test("Function entrypoint rejects only rejectable same-code reuse",()=>{const state=buildCouponState({secret:"s",couponCode:"WELCOME20",uses:[{orderId:"1",email:"a@example.com",phone:"5125550001",address:"10 Oak St",usedAt:"2026-09-01"}]});const input={enteredDiscountCodes:[{code:"WELCOME20",rejectable:true},{code:"LOCKED10",rejectable:false}],shop:{localTime:{date:"2026-09-15"}},cart:{buyerIdentity:{email:"a@example.com",phone:"5125550001"}},discount:{metafield:{jsonValue:state}}};const result=cartLinesDiscountsGenerateRun(input);assert.deepEqual(result.operations,[{enteredDiscountCodesReject:{codes:[{code:"WELCOME20"}],message:"This coupon is not available for this order."}}]);});
test("Function entrypoint fails open on missing or malformed compact state",()=>{const base={enteredDiscountCodes:[{code:"WELCOME20",rejectable:true}],shop:{localTime:{date:"2026-09-15"}},cart:{buyerIdentity:{email:"a@example.com",phone:"5125550001"}}};assert.deepEqual(cartLinesDiscountsGenerateRun(base),{operations:[]});assert.deepEqual(cartLinesDiscountsGenerateRun({...base,discount:{metafield:{jsonValue:"bad"}}}),{operations:[]});});
