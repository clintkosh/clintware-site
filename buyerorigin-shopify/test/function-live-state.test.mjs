import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildCouponState, keyedToken } from "../src/compact-state.js";
import { cartLinesDiscountsGenerateRun } from "../extensions/buyerorigin-discount-guard/src/cart_lines_discounts_generate_run.js";
import { sha256Hex, tokenFor } from "../extensions/buyerorigin-discount-guard/src/token.js";

test("Function SHA-256/token matches Node server token", () => {
  assert.equal(sha256Hex("abc"), crypto.createHash("sha256").update("abc").digest("hex"));
  assert.equal(tokenFor("secret","email","Alex.Smith+one@gmail.com"), keyedToken("secret","email","alexsmith@gmail.com"));
});

test("live state rejects same coupon with 2 of 3 evidence inside lookback", () => {
  const state=buildCouponState({secret:"merchant-secret",couponCode:"WELCOME20",uses:[{orderId:"#1",email:"buyer@example.com",phone:"5125550001",address:"10 Oak St Austin TX 78701 US",usedAt:"2026-09-01"}]});
  const result=cartLinesDiscountsGenerateRun({enteredDiscountCodes:[{code:"welcome20",rejectable:true}],shop:{localTime:{date:"2026-09-15"}},cart:{buyerIdentity:{email:"buyer@example.com",phone:"512-555-0001"},deliveryGroups:[{deliveryAddress:{address1:"99 Other Rd",city:"Austin",provinceCode:"TX",zip:"78701",countryCode:"US"}}]},discount:{metafield:{jsonValue:state}}});
  assert.deepEqual(result.operations[0].enteredDiscountCodesReject.codes,[{code:"welcome20"}]);
});

test("different code, non-rejectable code, stale use, and insufficient evidence fail open", () => {
  const state=buildCouponState({secret:"merchant-secret",couponCode:"WELCOME20",uses:[{orderId:"#1",email:"buyer@example.com",phone:"5125550001",address:"10 Oak St",usedAt:"2024-01-01"}]});
  const base={shop:{localTime:{date:"2026-09-15"}},cart:{buyerIdentity:{email:"buyer@example.com",phone:"5125550001"}},discount:{metafield:{jsonValue:state}}};
  assert.deepEqual(cartLinesDiscountsGenerateRun({...base,enteredDiscountCodes:[{code:"OTHER",rejectable:true}]}),{operations:[]});
  assert.deepEqual(cartLinesDiscountsGenerateRun({...base,enteredDiscountCodes:[{code:"WELCOME20",rejectable:false}]}),{operations:[]});
  assert.deepEqual(cartLinesDiscountsGenerateRun({...base,enteredDiscountCodes:[{code:"WELCOME20",rejectable:true}]}),{operations:[]});
  const recent=buildCouponState({secret:"merchant-secret",couponCode:"WELCOME20",uses:[{orderId:"#2",email:"buyer@example.com",usedAt:"2026-09-01"}]});
  assert.deepEqual(cartLinesDiscountsGenerateRun({...base,discount:{metafield:{jsonValue:recent}},cart:{buyerIdentity:{email:"buyer@example.com"}},enteredDiscountCodes:[{code:"WELCOME20",rejectable:true}]}),{operations:[]});
});
