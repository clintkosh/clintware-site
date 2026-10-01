import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.dirname(fileURLToPath(import.meta.url));
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const worker=read("src/index.js");
const track=read("public/nma-track.js");
const status=read("public/nma-build-status.js");
const localApi=read("public/nma-local-api.js");
const html=read("public/index.html");
const css=read("public/nma-ui.css");
const samples=read("src/sample-customers.js");
const wrangler=read("wrangler.jsonc");
const checks={
 identity:worker.includes('const APP_ID="nma-crm"')&&worker.includes('const WORKSPACE_ID="nma-northstar"'),
 syntheticBoundary:localApi.includes("Northstar Bank (Synthetic)")&&localApi.includes("synthetic_sample"),
 modernAI:["RAG","agents","MCP","AI development pipeline"].every(x=>localApi.toLowerCase().includes(x.toLowerCase())||track.toLowerCase().includes(x.toLowerCase())),
 roleTracks:["Strategic Customer Leadership","AI Estate & Security Discovery","AI Security & Governance Program","Deployment & Technical Operationalization","Adoption, Outcomes & Value","Retention & Expansion","Cross-functional Execution","CISO / GRC Executive Review","Customer Insight & Product Signal"].every(x=>track.includes(x)),
 mcpGovernance:["Approved","Review","Blocked","MCP governance"].every(x=>track.includes(x)),
 valueEvidence:["baseline","metricDefinition","sourceSystem","owner","cadence","target","currentValue"].every(x=>localApi.includes(x)),
 presentation:track.includes("function presentation()")&&track.includes("Print / Save PDF")&&status.includes("Execution evidence"),
 executivePdf:track.includes("function executivePdf()")&&track.includes("nma-ciso-ai-security-brief.pdf"),
 samplePortfolio:(samples.match(/pv:"synthetic_sample"/g)||[]).length>=6,
 stageDiversity:["discover","govern","test","protect","prove","expand"].every(x=>samples.includes('phase:"'+x+'"')),
 denseFlowData:["stakeholders:[","metrics:[","risks:[","actions:[","issues:[","adoption:[","meeting:{"].every(x=>samples.includes(x)),
 noIndex:html.includes("noindex,nofollow,noarchive"),
 responsive:css.includes("@media(max-width:620px)"),
 browserPersistence:localApi.includes("localStorage")&&localApi.includes('mode:"browser-persistent"')&&html.includes("/nma-local-api.js"),
 seedMigration:localApi.includes("const VERSION=3")&&localApi.includes("function migrate(old)")&&localApi.includes("REPLACEABLE")&&localApi.includes('hit.record.provenance="internal_record"'),
 quotaIndependent:worker.includes("databaseRowsPerDemoSession:0")&&!wrangler.includes("durable_objects")&&wrangler.includes('"deleted_classes"')&&wrangler.includes('"DPLCRM"'),
 executionTruth:status.includes("qq-local-agent")&&status.includes("349eb03a-d357-4c37-8264-84588614252a")&&status.includes("server-authorized deployment"),
 sourceCompanyClean:!(/Doppel|doppel\.com/i.test(worker+track+status+localApi+html)),
 publicBoundary:track.includes("Not an official Noma product")
};
for(const [k,v] of Object.entries(checks))must(v,"NMA logic check failed: "+k);
console.log(JSON.stringify({ok:true,test:"nma-logic",checks},null,2));
