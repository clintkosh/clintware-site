import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");

test("public health is constant-cost and does not read durable state",()=>{
  const start=source.indexOf('if(request.method==="GET"&&url.pathname==="/health")');
  assert.ok(start>=0,"health route missing");
  const end=source.indexOf('if(url.pathname==="/mcp")',start);
  assert.ok(end>start,"health route boundary missing");
  const block=source.slice(start,end);

  assert.match(block,/health_mode:"constant-cost-config"/);
  assert.match(block,/durable_state_reads:0/);
  assert.doesNotMatch(block,/registryHub\s*\(/);
  assert.doesNotMatch(block,/researchConfig\s*\(/);
  assert.doesNotMatch(block,/jiraStatus\s*\(/);
  assert.doesNotMatch(block,/productHub\s*\(/);
  assert.doesNotMatch(block,/ctx\.storage/);
});
