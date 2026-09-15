import assert from "node:assert/strict";
import test from "node:test";
import { parseShopifyOrdersCsv } from "../src/shopify-csv.js";
const csv=`Name,Email,Phone,Created at,Total,Discount Code,Discount Amount,Shipping Address1,Shipping City,Shipping Province,Shipping Zip,Shipping Country,Lineitem name\n#1001,a@example.com,5125550001,2026-09-01,100,WELCOME20,20,10 Oak St,Austin,TX,78701,US,Item A\n,,,,,,,,,,,,Item B\n#1002,b@example.com,5125550002,2026-09-02,80,SAVE10,8,20 Pine Rd,Austin,TX,78702,US,Item C`;
test("native Shopify CSV collapses continuation rows",()=>{const rows=parseShopifyOrdersCsv(csv);assert.equal(rows.length,2);assert.equal(rows[0].orderId,"#1001");assert.equal(rows[0].discountCodes.length,1);assert.equal(rows[0].discountCodes[0].code,"WELCOME20");});
test("rejects non-Shopify CSV",()=>assert.throws(()=>parseShopifyOrdersCsv("a,b\n1,2"),/Shopify Orders CSV/));
