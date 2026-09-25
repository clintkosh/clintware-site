import fs from "node:fs";

const p = new URL("./src/index.js", import.meta.url);
const samplesPath = new URL("./src/sample-customers.js", import.meta.url);
let src = fs.readFileSync(p, "utf8");
let samples = fs.readFileSync(samplesPath, "utf8");
if (samples.includes("SAMPLE_SEED_VERSION=3")) samples = samples.replace("SAMPLE_SEED_VERSION=3", "SAMPLE_SEED_VERSION=4");
fs.writeFileSync(samplesPath, samples);

// DPLR is deliberately no-login. Keep the anonymous workspace stable in this browser
// for 180 days rather than tying the interview/demo experience to an identity provider.
src = src.replace(
  'cookie:fresh?sessionCookie(GUEST_COOKIE,id):""',
  'cookie:fresh?setCookie(GUEST_COOKIE,id,15552000):""'
);
src = src.replaceAll('persistence:"guest-session"', 'persistence:"browser-persistent"');
src = src.replaceAll('session?"account":"guest-session"', 'session?"account":"browser-persistent"');
src = src.replace(
  'if(req.method==="GET"&&u.pathname==="/auth/login")return startLogin();',
  'if(req.method==="GET"&&u.pathname==="/auth/login")return new Response(null,{status:302,headers:secureHeaders(new Headers({location:"/"}))});'
);
src = src.replace(
  'if(req.method==="GET"&&u.pathname==="/auth/callback")return finishLogin(req,env);',
  'if(req.method==="GET"&&u.pathname==="/auth/callback")return new Response(null,{status:302,headers:secureHeaders(new Headers({location:"/"}))});'
);

// Add an immediately useful call-prep record and a reusable evidence-first TCE baseline
// to every curated sample account. Public customer references stay explicit proposals;
// synthetic scenarios remain clearly synthetic.
const marker = "\n return a}\n async seed()";
if (!src.includes(marker)) throw new Error("DPLR sampleRecords return marker missing");
const add = `
 a.push(
  ["call_prep",pub?"internal_proposal":p,{title:"Default technical review prep · "+s.n,meetingDate:"",meetingType:"Technical customer review",objective:pub?"Validate the private technical architecture and identify the highest-value technical discovery questions without inventing account facts.":"Resolve the highest-risk technical unknown while preserving customer context and leaving explicit owners, evidence, and the next decision.",attendees:"CSM; Technical Customer Engineer; customer security / technical owner; Support or specialist team as required",opening:"Restate customer impact and the known technical state. Separate facts from hypotheses before changing configuration or escalating.",currentState:(s.st||"")+" | Systems: "+(s.sys||"Discovery required")+" | Open dependency: "+(s.dep||"Validate current state"),evidenceReady:"Known-good control; affected example; last-known-good / change window; raw payload or event ID; downstream transform / field mapping; relevant logs; rollback or workaround; business impact.",questions:"What changed since the last known-good state?\\nWhere is the first point of divergence?\\nIs this authentication or authorization, configuration, integration transformation, expected behavior, or a reproducible product defect?\\nWhat evidence would change our conclusion?\\nWho owns the next technical decision?",decisions:"Root-cause class; technical owner; next evidence; safe workaround / rollback; specialist escalation yes/no; what should become Support guidance if the pattern repeats.",escalationCriteria:"Escalate only after the supported path is reproduced with expected-versus-actual behavior, scope / blast radius, correlation IDs or evidence, troubleshooting already completed, customer impact, and a bounded ask.",followUp:"Send decisions, owners, checkpoints, evidence links, unresolved questions, and the reusable lesson. Graduate deterministic work to Support / self-service when safe.",technologyNotes:"Use current vendor and Doppel documentation. Validate tenant-specific values before production changes.",assistantNotes:"Live Assist is advisory only. Ground on this account, expose uncertainty, never invent commitments, and prefer a clean evidence-backed handoff over speculation."}],
  ["assistant_profile","template",{name:"Evidence-first Technical Customer Engineering baseline",status:"Approved demo baseline",updatedFrom:"Curated role-aligned operating model",playbook:"Use the smallest reproducible example. Establish a known-good control and last-known-good state. Separate authentication from authorization. Compare raw source payload to normalized / transformed downstream data. Record expected vs actual, scope / blast radius, request / event / alert IDs, timestamps, logs, prior troubleshooting, workaround, and business impact. Resolve directly when within supported TCE scope. Escalate custom architecture to Solutions Architecture and reproducible product defects to Engineering with a bounded ask. After resolution, decide whether the pattern should become a Support diagnostic, runbook, training module, automation, self-service path, or Product signal."}]
 );
 return a}
 async seed()`;
src = src.replace(marker, add);

fs.writeFileSync(p, src);
console.log("DPLR no-login persistence, seed v4, and default preparation enrichment applied.");
