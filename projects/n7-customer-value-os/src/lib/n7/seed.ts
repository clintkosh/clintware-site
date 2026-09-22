import type {
  AssumptionToggle,
  Challenge,
  CustomerWorkspace,
  Organization,
  SkillPack,
} from "./types";

export const ORG: Organization = {
  id: "org-n7",
  name: "Neuron Seven",
  productTitle: "N7 Customer Value OS",
  subtitle: "Customer Operations Workspace",
};

export const OPERATING_THESIS =
  "The customer did not buy a connector. They bought a measurable business outcome.";

export const EXECUTIVE_FRAMING =
  "This is a live Week-1 customer recovery. The team has a valid Year-1 outcome—50% faster resolution—and a newly discovered hard go-live dependency: SAP manuals, with an 8-to-10-week connector estimate against a 6-to-8-week expectation. The operating plan makes the SAP critical path explicit, parallelizes every safe workstream, resets the customer once with evidence rather than optimism, and instruments adoption, quality, and ROI before launch so value is measurable afterward.";

export const PLANNING_BOUNDARY_TEXT =
  "W10 is a planning boundary based on the current Engineering estimate, not a new customer commitment. The committed date gets reset only after Engineering validates architecture, assumptions, milestones, test scope, dependencies, and confidence.";

export const FINAL_POSITIONING =
  "N7 Customer Value OS connects customer outcomes, technical implementation, and internal execution. It helps the team turn what was sold into an implemented, adopted, measurable business outcome—and convert what the team learns into a stronger operating system for the next customer.";

export const OUTCOME_MEASUREMENT_STANDARD =
  "The 50% outcome is measured against a customer-approved baseline using a stable cohort and an agreed start/stop timestamp definition. The team uses median cycle time for the typical experience and a tail metric such as P75 so difficult cases remain visible.";

export const CORE_PRINCIPLES: string[] = [
  "Surface the SAP constraint immediately, without blame.",
  "Preserve customer trust by resetting once, with evidence.",
  "Treat SAP as the explicit critical path.",
  "Parallelize every safe non-SAP workstream.",
  "Never pressure Engineering into an unsupported date.",
  "Never redefine 'go-live' for optics.",
  "Instrument adoption, quality and ROI before production.",
  "Convert a discovery failure into a reusable presales readiness control.",
];

export const GO_LIVE_GATES: { label: string; detail: string; met: boolean }[] = [
  {
    label: "SAP manuals available",
    detail: "Ingested, current, permissioned, validated by customer SME.",
    met: false,
  },
  {
    label: "Salesforce content available",
    detail: "KB articles, technical bulletins, job aids searchable and current.",
    met: false,
  },
  { label: "SSO / RBAC working", detail: "Identity inputs validated end to end.", met: false },
  {
    label: "Content current and permissioned",
    detail: "Freshness and entitlement checks pass per source.",
    met: false,
  },
  { label: "Full-scope UAT passed", detail: "SAP + Salesforce scope, not partial.", met: false },
  {
    label: "Quality / accuracy acceptance criteria passed",
    detail: "Agreed with customer before launch, measured on golden queries.",
    met: false,
  },
  { label: "No critical blockers", detail: "RAID has no open critical item.", met: false },
  {
    label: "Named owners sign readiness",
    detail: "Customer, Engineering, CS/Implementation, Security.",
    met: false,
  },
];

export const RECOVERY_OPTIONS = [
  {
    id: "A",
    title: "Accelerated",
    boundary: "W8",
    summary:
      "W8 only if Engineering validates safe parallelism and compression, and the customer accepts lower schedule buffer.",
    guardrail: "Never force Engineering to make W8 happen.",
    recommended: false,
  },
  {
    id: "B",
    title: "Rebaseline",
    boundary: "W10 planning boundary",
    summary:
      "W10 planning boundary based on the validated Engineering range. All parallel work continues and acceptance quality is protected.",
    guardrail: "Base planning model for this case.",
    recommended: true,
  },
  {
    id: "C",
    title: "Approved temporary / pilot",
    boundary: "Conditional",
    summary:
      "Only if Product, Security, Engineering and the customer approve a supported temporary content path; pilot or non-production cohort only if appropriate.",
    guardrail:
      "Never invent a workaround. Never call an unsupported partial solution production go-live.",
    recommended: false,
  },
];

export const DECISION_TRIGGERS = [
  {
    gate: "W2",
    question:
      "Has Engineering validated architecture, assumptions, milestones, dependencies and confidence?",
    ifNo: "Escalate internally before resetting the customer date.",
  },
  {
    gate: "W6",
    question: "Is feature-complete still consistent with W10 UAT?",
    ifNo: "Trigger a leadership priority / scope / sequencing decision.",
  },
  {
    gate: "W8",
    question: "Can integration and resilience testing still support W10 full UAT?",
    ifNo: "Trigger an executive decision before the customer is surprised.",
  },
  {
    gate: "W10",
    question: "Do acceptance gates pass?",
    ifNo: "Explicit date / scope / priority / risk-acceptance decision. No silent slip.",
  },
];

export const GOVERNANCE = [
  {
    owner: "Engineering",
    owns: "Build",
    items: [
      "Architecture",
      "Code",
      "Testing",
      "Technical estimate",
      "Technical milestone state",
      "Technical risk",
    ],
  },
  {
    owner: "CS / Implementation",
    owns: "Dependency",
    items: [
      "Integrated customer plan",
      "RAID",
      "Decision log",
      "Customer communication",
      "Dependency translation",
      "Escalation triggers",
      "UAT coordination",
      "Adoption plan",
      "ROI narrative",
    ],
  },
  {
    owner: "Customer",
    owns: "Inputs",
    items: [
      "Access",
      "SAP / SFDC SMEs",
      "SSO / identity inputs",
      "Data readiness",
      "Content validation",
      "Workflow acceptance",
    ],
  },
  {
    owner: "Leadership",
    owns: "Tradeoffs",
    items: [
      "Cross-team priority conflicts",
      "Exceptions",
      "Risk tradeoffs",
      "Business outcome review",
    ],
  },
];

export const CADENCE = [
  "Twice-weekly internal SAP critical-path sync",
  "Weekly customer implementation review",
  "Leadership by exception and decision, not raw task lists",
  "Post-launch weekly operating review",
  "Monthly trend review",
  "QBR executive value review",
];

export const READINESS_ROOT_CAUSE =
  "The system allowed a customer-committed date before integration readiness was validated.";

export const READINESS_RULE =
  "An unknown or custom connector blocks a customer-committed date until Solution/Engineering review or a documented exception approval.";

export const ROI_METHOD = [
  "Avoided support interactions = eligible issues resolved without call-center escalation.",
  "Support hours saved = avoided calls × average handling time.",
  "Labor value = saved hours × Finance-approved loaded labor rate.",
  "All monetary assumptions must be customer/Finance approved. Never invent dollar ROI as fact.",
];

export const TRIAGE_LAYERS = [
  {
    step: 1,
    title: "Validate the metric",
    prompts: [
      "Which definition of accuracy: SME correctness, top-result relevance, successful session, or user survey?",
      "Same baseline method, query population, product families and window as before?",
    ],
  },
  {
    step: 2,
    title: "Blast radius",
    prompts: [
      "SAP vs Salesforce content",
      "Product family, manual, region, role, query type, cohort, date, version",
    ],
  },
  {
    step: 3,
    title: "Reproduce with versioned golden query",
    prompts: [
      "Expected result vs returned result",
      "Source doc, timestamp, permissions, content version, model/config version if available",
    ],
  },
  {
    step: 4,
    title: "Source / data",
    prompts: [
      "Missing or stale manuals, duplicate versions, metadata, structure, parsing",
      "Incomplete ingestion, encoding/OCR if relevant, freshness",
    ],
  },
  {
    step: 5,
    title: "Connector / pipeline",
    prompts: [
      "Failures, partial sync, indexing lag, pagination, retries",
      "Ingestion errors, permission filters",
    ],
  },
  {
    step: 6,
    title: "Config / access",
    prompts: ["Ranking and configuration, RBAC, mappings", "Source weighting, entitlements"],
  },
  {
    step: 7,
    title: "User / query",
    prompts: [
      "Terminology shifts, new product lines, new users",
      "Query complexity, training gaps",
    ],
  },
  {
    step: 8,
    title: "Retrieval / model",
    prompts: [
      "Only after prior layers are ruled out and correct content is indexed, permissioned and exists but retrieval still fails",
    ],
  },
];

export const TRIAGE_KEY_DIAGNOSTIC =
  "If SAP degrades while Salesforce stays stable, prioritize SAP source → connector → ingestion → parsing → metadata → indexing before any general model hypothesis.";

export const RED_FLAG_PHRASES = [
  "Sales screwed up",
  "Engineering is late",
  "We'll definitely make 8 weeks",
  "We can just launch without SAP",
  "The AI is wrong",
  "The customer data is bad",
];

export const SKILL_PACKS: SkillPack[] = [
  {
    id: "sp-sfdc",
    name: "Salesforce Admin",
    scope: "Service Cloud content model, Field Service work orders, permissions and profiles.",
    strengths: ["Content model questions", "Entitlement/permission mapping", "Sandbox vs prod"],
    limits: "No access to the customer org. Answers are structural, not configuration truth.",
  },
  {
    id: "sp-net",
    name: "Network Administration",
    scope: "Firewalls, trust boundaries, egress rules, latency and connectivity checks.",
    strengths: ["Topology questions", "Boundary review", "Connectivity failure triage"],
    limits: "Cannot test the customer network. Suggests checks, does not perform them.",
  },
  {
    id: "sp-sap",
    name: "SAP Integration",
    scope: "Product manual sources, extraction patterns, versioning and metadata hygiene.",
    strengths: ["Ingestion design questions", "Content versioning", "Parsing/metadata risks"],
    limits: "No SAP connector exists in this case. Nothing here implies a supported capability.",
  },
  {
    id: "sp-sec",
    name: "Security",
    scope: "SSO, RBAC, entitlement filtering, data handling and approval paths.",
    strengths: ["Identity inputs", "Permission-aware search", "Approval gates"],
    limits: "Cannot approve exceptions. Security sign-off remains human.",
  },
  {
    id: "sp-cs",
    name: "Customer Success",
    scope: "Stakeholder mapping, adoption plan, ROI narrative, escalation framing.",
    strengths: ["Message framing", "Risk translation", "Cadence design"],
    limits: "Drafts only. No message is sent without human approval.",
  },
  {
    id: "sp-n7",
    name: "Neuron7 Product / Implementation",
    scope: "Case and demo knowledge only, as supplied in this exercise.",
    strengths: ["Case facts", "Implementation sequencing", "Acceptance gates"],
    limits: "Case-scoped. No official Neuron7 internal APIs, data, policies or capabilities.",
  },
];

/** Standalone training/reference material. Deliberately not imported or rendered by the CRM. */
export const CHALLENGES: Challenge[] = [
  {
    id: "ch-1",
    prompt: "Preserve 6–8 weeks. What do you do?",
    thirtySecond:
      "I preserve the earliest achievable date, not the original one. SAP manuals are a must-have for go-live and Engineering says 8–10 weeks, so I parallelize everything non-SAP, run a design spike to validate the estimate, and reset once with evidence.",
    deeper:
      "Because the case says SAP is required for go-live and Engineering estimates 8–10 weeks. Preserving the date by ignoring the hard dependency would repeat the root cause. I would preserve the earliest achievable date after Engineering validates the plan.",
    evidence: { label: "Critical Path", section: "critical-path" },
    redFlag: "\"We'll definitely make 8 weeks.\"",
  },
  {
    id: "ch-2",
    prompt: "The customer refuses to accept a slip.",
    thirtySecond:
      "I make the tradeoffs explicit and let them choose, rather than hiding the dependency or manufacturing a date.",
    deeper:
      "I would make the tradeoffs explicit. They can choose a validated later full-scope date, an approved limited pilot if technically supportable, or an executive risk decision. I would not hide the dependency or manufacture a date.",
    evidence: { label: "SAP Recovery Options", section: "critical-path" },
    redFlag: "Agreeing to the original date to keep the meeting pleasant.",
  },
  {
    id: "ch-3",
    prompt: "Engineering says W10 is really W13.",
    thirtySecond:
      "W10 was always a planning boundary, not a promise. The W6 and W8 triggers exist so we escalate early and force an explicit scope, date or priority decision.",
    deeper:
      "W10 is not a promise. It is a planning boundary. The W6 and W8 trigger points exist specifically so we do not discover a miss at W10. If evidence says W10 is no longer credible, I escalate early and force an explicit scope/date/priority decision.",
    evidence: { label: "Decision Triggers", section: "implementation" },
    redFlag: "\"Engineering is late.\"",
  },
  {
    id: "ch-4",
    prompt: "SAP ingestion passes but accuracy is poor.",
    thirtySecond:
      "Ingestion success is not content correctness. I check freshness, duplicate versions, parsing, metadata and permission filters on the SAP segment before touching retrieval.",
    deeper:
      "I reproduce with versioned golden queries, segment SAP vs Salesforce, and walk the source, connector, configuration and query layers. Retrieval and model behavior are examined only after the content layers are ruled out.",
    evidence: { label: "Accuracy Triage", section: "accuracy-triage" },
    redFlag: "\"The AI is wrong.\"",
  },
  {
    id: "ch-5",
    prompt: "Adoption is high but resolution time is flat.",
    thirtySecond:
      "Adoption is not ROI. I check whether the searched content actually covers the high-frequency failure modes, and whether the cycle-time definition captures the work we changed.",
    deeper:
      "I segment by product family and query type, verify the start/stop timestamp definition, and look for a coverage gap: usage on content that does not map to the issues driving cycle time. Then I fix content coverage or the metric contract, whichever is wrong.",
    evidence: { label: "KPI Contract", section: "kpi-contract" },
    redFlag: "Reporting usage charts as value realization.",
  },
  {
    id: "ch-6",
    prompt: "The baseline is unusable.",
    thirtySecond:
      "Then we agree a defensible construction method before launch, not after. A cohort-matched sampled baseline with documented exclusions beats an unfalsifiable claim.",
    deeper:
      "I would run a baseline workshop, agree the source system and timestamp definition, and if the historical data is not reliable, construct a forward baseline over an agreed window with Finance and the customer signing the method and its confidence note.",
    evidence: { label: "ROI Workshop", section: "roi-workshop" },
    redFlag: "\"The customer data is bad.\"",
  },
  {
    id: "ch-7",
    prompt: "Salesforce is fine but SAP degrades.",
    thirtySecond:
      "That asymmetry is the diagnostic. I prioritize SAP source, connector, ingestion, parsing, metadata and indexing before any general model hypothesis.",
    deeper: TRIAGE_KEY_DIAGNOSTIC,
    evidence: { label: "Accuracy Triage", section: "accuracy-triage" },
    redFlag: "Escalating to a model investigation first.",
  },
  {
    id: "ch-8",
    prompt: "The CFO challenges the ROI.",
    thirtySecond:
      "I measure first and monetize second. Avoided interactions and hours saved are ours to measure; the loaded labor rate is Finance's to approve.",
    deeper:
      "Avoided support interactions are eligible issues resolved without call-center escalation. Hours saved are avoided calls times average handling time. Labor value uses a Finance-approved loaded rate. Every monetary assumption is customer or Finance approved; I do not invent dollar ROI as fact.",
    evidence: { label: "ROI Workshop", section: "roi-workshop" },
    redFlag: "Quoting a dollar figure with no approved rate behind it.",
  },
  {
    id: "ch-9",
    prompt: "This process feels too heavy for a startup.",
    thirtySecond:
      "It is deliberately light: one critical path, one RAID and decision log, a few evidence gates, automation where it is safe.",
    deeper:
      "The controls are intentionally lightweight: one critical-path view, one RAID/decision log, a few evidence gates, and automation where possible. The goal is to reduce status chasing and surprise escalation, not add bureaucracy.",
    evidence: { label: "RACI / Governance", section: "raci" },
    redFlag: "Defending process for its own sake.",
  },
  {
    id: "ch-10",
    prompt: "Isolate model vs data exactly.",
    thirtySecond:
      "Reproduce with a versioned golden query. If the correct document is present, current, parsed and permissioned and retrieval still misses it, only then is it a retrieval problem.",
    deeper:
      "I don't assume the model. That is the point of the triage. I reproduce, segment, inspect source freshness and parsing, check ingestion, permissions, and configuration, then isolate retrieval/model behavior only after those are ruled out.",
    evidence: { label: "Accuracy Triage", section: "accuracy-triage" },
    redFlag: "\"The AI is wrong.\"",
  },
  {
    id: "ch-11",
    prompt: "Answer in 30 seconds: what is your plan?",
    thirtySecond: EXECUTIVE_FRAMING,
    deeper:
      "Make the SAP critical path explicit, parallelize every safe workstream, reset the customer once with evidence, and instrument adoption, quality and ROI before launch.",
    evidence: { label: "Executive Summary", section: "executive-summary" },
    redFlag: "Opening with the tooling instead of the judgment.",
  },
  {
    id: "ch-12",
    prompt: "Why a design spike instead of just starting the build?",
    thirtySecond:
      "The 8–10 weeks is initial feedback. The spike converts it into a defensible plan before it becomes a customer commitment.",
    deeper:
      "The 8–10 weeks is initial feedback. Before converting that into a customer commitment, I want architecture, assumptions, milestones, test scope, external dependencies, and confidence documented. The spike validates the estimate; it is not idle waiting.",
    evidence: { label: "Implementation", section: "implementation" },
    redFlag: "Treating the spike as waiting time.",
  },
  {
    id: "ch-13",
    prompt: "Why not go live on Salesforce first?",
    thirtySecond:
      "I will use Salesforce to de-risk configuration, UAT, adoption and telemetry, but that is not production go-live.",
    deeper:
      "I can use Salesforce to de-risk configuration, UAT, adoption, and telemetry, but I would not call that production go-live because the case explicitly makes SAP manuals a must-have for the technician workflow.",
    evidence: { label: "Readiness Gate", section: "readiness-gate" },
    redFlag: "\"We can just launch without SAP.\"",
  },
  {
    id: "ch-14",
    prompt: "How much of this did AI do?",
    thirtySecond:
      "I use AI the way I would on the job: to accelerate research, structure and production. The judgment is mine.",
    deeper:
      "Yes. I use AI the way I would on the job: to accelerate research, structure, QA, and repeatable production. The assumptions, tradeoffs, customer stance, and decisions are mine, and I can defend every line.",
    evidence: { label: "Architecture & Assumptions", section: "architecture" },
    redFlag: "Overclaiming autonomous capability.",
  },
];

export const ASSUMPTION_TOGGLES: AssumptionToggle[] = [
  {
    id: "as-sap-12",
    label: "SAP estimate becomes 12 weeks",
    description: "Engineering's validated range moves from 8–10 to 12 weeks.",
    planImpact:
      "Planning boundary moves from W10 to W12 with hypercare at W13–W14. Parallel workstreams are unchanged and finish early; UAT scope splits into Salesforce dry-run at W8 and full-scope UAT after SAP ingestion.",
    riskImpact:
      "Schedule risk rises to high. Adoption risk rises because trained technicians wait longer for the full workflow.",
    recommendedDecision:
      "Trigger the W2 escalation path before any customer date change; present Option B rebaselined, with Option C pilot only if Product, Security and Engineering support a temporary content path.",
    evidenceNeeded:
      "Revised Engineering architecture note, milestone schedule, confidence statement, and the dependency list that drove the increase.",
  },
  {
    id: "as-refuse",
    label: "Customer rejects any timeline change",
    description: "Sponsor holds the original 6–8 week commercial expectation.",
    planImpact:
      "Plan itself does not change; the decision does. Options become validated later full-scope date, approved limited pilot, or documented executive risk acceptance.",
    riskImpact: "Commercial and trust risk rise to high; quality risk rises if scope is forced.",
    recommendedDecision:
      "Executive-to-executive conversation with the tradeoff sheet. No date is reaffirmed without Engineering validation.",
    evidenceNeeded:
      "Tradeoff comparison, acceptance gate list, and the written record of what SAP availability does to the technician workflow.",
  },
  {
    id: "as-nobaseline",
    label: "No usable resolution-time baseline",
    description: "Historical cycle-time data is incomplete or inconsistently stamped.",
    planImpact:
      "Add a baseline construction workstream in W1–W3; forward baseline over an agreed window with documented method.",
    riskImpact: "Value-proof risk rises to high. The 50% claim is unfalsifiable until fixed.",
    recommendedDecision:
      "Agree baseline construction method with customer and Finance in writing before go-live; record it in the metric contract confidence note.",
    evidenceNeeded:
      "Sampled cycle-time extract, timestamp definition, cohort definition, exclusion list, customer sign-off.",
  },
  {
    id: "as-sso",
    label: "SSO is delayed",
    description: "Identity inputs slip beyond the planned window.",
    planImpact:
      "SSO/RBAC validation moves onto the critical path alongside SAP; UAT cannot complete without permission-aware results.",
    riskImpact: "Technical and schedule risk rise; security risk if a temporary access path is proposed.",
    recommendedDecision:
      "Escalate as a customer-owned dependency with a named owner and date; no unsupported access workaround.",
    evidenceNeeded: "Identity owner commitment, test plan for permission-filtered results.",
  },
  {
    id: "as-pilot20",
    label: "Only 20 pilot users available",
    description: "Cohort for early validation shrinks from the planned population.",
    planImpact:
      "Pilot still useful for UAT and content validation; adoption telemetry becomes directional only.",
    riskImpact:
      "Measurement risk rises: a 20-user cohort cannot support a defensible 50% cycle-time claim.",
    recommendedDecision:
      "Keep the pilot for quality validation, and hold the ROI claim until the cohort reaches the agreed statistical floor.",
    evidenceNeeded: "Cohort definition, sample-size note, revised confidence statement in the KPI contract.",
  },
  {
    id: "as-priority",
    label: "Engineering priority drops",
    description: "The SAP connector loses relative priority against other work.",
    planImpact: "Critical path extends by the deprioritized duration; parallel work completes and waits.",
    riskImpact: "Schedule risk critical; trust risk high if not surfaced immediately.",
    recommendedDecision:
      "Leadership priority decision, framed as customer outcome exposure rather than team conflict.",
    evidenceNeeded: "Current critical-path view, customer commitment record, revenue/renewal exposure note.",
  },
  {
    id: "as-onefamily",
    label: "Accuracy issue affects one product family",
    description: "Reported degradation is isolated to a single family.",
    planImpact:
      "Triage narrows to that family's source content, versions and metadata; no platform-wide rollback.",
    riskImpact: "Quality risk contained; reputational risk in that technician segment.",
    recommendedDecision:
      "Fix content or metadata for the family and re-run the golden query set for that segment before declaring resolution.",
    evidenceNeeded: "Segmented accuracy comparison, versioned golden queries, source freshness report.",
  },
  {
    id: "as-bothdegrade",
    label: "Salesforce also degrades",
    description: "Both sources show the same degradation pattern.",
    planImpact:
      "Fault domain shifts away from a single source: examine shared pipeline, configuration, ranking and entitlement layers.",
    riskImpact: "Quality risk high and platform-wide; escalation packet required.",
    recommendedDecision:
      "Raise an engineering escalation with a full repro packet before speculating about the model.",
    evidenceNeeded: "Cross-source golden query results, config change log, ingestion and indexing telemetry.",
  },
  {
    id: "as-flatroi",
    label: "Adoption high but ROI flat",
    description: "Usage grows while cycle time does not move.",
    planImpact:
      "Add a coverage analysis workstream: map high-frequency failure modes to available content.",
    riskImpact: "Value risk high; renewal narrative weakens without a credible explanation.",
    recommendedDecision:
      "Report honestly with the coverage hypothesis and a dated plan, rather than presenting usage as value.",
    evidenceNeeded:
      "Query-to-issue mapping, content coverage gap list, cycle-time segmentation by query type.",
  },
];

export const AUTOMATION_CONCEPTS = [
  {
    id: "au-dep",
    title: "Dependency sync",
    flow: "Jira / Engineering milestone state → CS dependency summary + risk trigger",
    human: "A milestone change never changes a customer commitment automatically.",
  },
  {
    id: "au-value",
    title: "Value pipeline",
    flow: "SFDC timestamps + usage + interaction data → weekly metrics + confidence notes",
    human: "ROI interpretation stays human; the pipeline produces measurements, not claims.",
  },
  {
    id: "au-quality",
    title: "Quality intake",
    flow: "Structured complaint + telemetry → repro packet + fault-domain checklist",
    human: "Root-cause conclusion is human.",
  },
  {
    id: "au-readiness",
    title: "Readiness gate",
    flow: "CRM opportunity / implementation fields → connector review + exception workflow",
    human: "Exception approval is human and documented.",
  },
];

export const HUMAN_IN_THE_LOOP = {
  automationMay: [
    "Surface milestone changes",
    "Summarize risk",
    "Refresh demo dashboards",
    "Detect thresholds",
    "Prepare evidence",
  ],
  humanRequired: [
    "Customer commitments",
    "Timeline rebaseline",
    "Risk acceptance",
    "Executive communication",
    "ROI interpretation",
    "Root-cause conclusion",
    "Go / no-go",
  ],
};

export const SUCCESS_DEFINITION = [
  {
    label: "Delivery",
    text: "The SAP-dependent production launch passes acceptance without surprise escalation.",
  },
  {
    label: "Value",
    text: "The customer can demonstrate whether resolution cycle time is moving toward the Year-1 50% goal.",
  },
  {
    label: "System",
    text: "The next implementation starts with verified integrations, explicit dependencies and measurable ROI rather than rediscovering them after contract signature.",
  },
];

/* ------------------------------------------------------------------ */
/* Customer #1 — official case customer                                */
/* ------------------------------------------------------------------ */

const C1 = "official-case";

export const CUSTOMER_ONE: CustomerWorkspace = {
  customer: {
    id: C1,
    name: "Healthcare Device Manufacturer (Customer #1)",
    industry: "Healthcare device manufacturing",
    isOfficialCase: true,
    health: "at-risk",
    stage: "discovery",
    targetOutcome: "Improve resolution cycle time by 50% by end of Year 1",
    users: "500+ field technicians, plus call-center / technical support agents",
    nextMilestone: "To be confirmed",
    nextExecutiveTouch: "Not provided",
    headline:
      "Week 1. Kickoff and discovery complete. SAP manual dependency discovered with no available connector.",
    createdAt: "Week 1",
    provenance: "case-fact",
  },
  // No named customer contacts were supplied in the case materials.
  stakeholders: [],
  outcomes: [
    {
      id: "out-1",
      customerId: C1,
      statement: "Improve resolution cycle time by 50%",
      horizon: "By end of Year 1",
      valueHypothesis:
        "Technicians get correct instructions directly and require fewer calls to support.",
      provenance: "case-fact",
    },
  ],
  kpis: [
    {
      id: "kpi-cycle",
      customerId: C1,
      name: "Resolution cycle time",
      kind: "lagging",
      unit: "Not provided",
      baseline: "Not provided",
      target: "50% improvement by end of Year 1",
      current: "Not yet measured",
      trend: "flat",
      goodDirection: "down",
      contract: {
        metricName: "Resolution cycle time",
        businessDefinition: "To be confirmed with the customer.",
        numerator: "To be confirmed",
        denominator: "To be confirmed",
        cohort: "To be confirmed",
        startTimestamp: "To be confirmed",
        stopTimestamp: "To be confirmed",
        baselineWindow: "To be confirmed",
        comparisonWindow: "To be confirmed",
        exclusions: "To be confirmed",
        sourceSystem: "To be confirmed",
        sourceOwner: "Not provided",
        refreshCadence: "To be confirmed",
        confidenceNote: "No baseline or measurement method was supplied in the case materials.",
      },
      provenance: "case-fact",
    },
  ],
  milestones: [
    {
      id: "ms-w1-discovery",
      customerId: C1,
      week: "W1",
      title: "Kickoff and discovery",
      detail: "Completed. SAP product-manual requirement discovered during discovery.",
      track: "governance",
      owner: "Not provided",
      status: "done",
      provenance: "case-fact",
    },
    {
      id: "ms-sap-connector",
      customerId: C1,
      week: "To be confirmed",
      title: "SAP connector design, development and testing",
      detail: "Engineering initial estimate: 8–10 weeks. No SAP connector is available today.",
      track: "critical-path",
      owner: "Engineering",
      status: "planned",
      provenance: "case-fact",
    },
  ],
  dependencies: [
    {
      id: "dep-sap",
      customerId: C1,
      name: "SAP product manuals available in search",
      owner: "Not provided",
      type: "engineering",
      status: "blocked",
      blocksGoLive: true,
      note: "Must-have for formal production go-live. No SAP connector available; Engineering initial estimate 8–10 weeks.",
      provenance: "case-fact",
    },
    {
      id: "dep-sfdc",
      customerId: C1,
      name: "Salesforce connector",
      owner: "Not provided",
      type: "internal",
      status: "ready",
      blocksGoLive: false,
      note: "Salesforce connector is ready (confirmed in Week 1).",
      provenance: "case-fact",
    },
    {
      id: "dep-sso",
      customerId: C1,
      name: "SSO",
      owner: "Not provided",
      type: "customer",
      status: "not-started",
      blocksGoLive: false,
      note: "SSO is included in scope. No further detail was supplied.",
      provenance: "case-fact",
    },
  ],
  risks: [
    {
      id: "risk-sap",
      customerId: C1,
      title: "SAP connector estimate (8–10 weeks) exceeds the original 6–8 week expectation",
      category: "schedule",
      impact: "high",
      likelihood: "high",
      mitigation: "To be confirmed",
      owner: "Not provided",
      trigger: "To be confirmed",
      status: "open",
      provenance: "case-fact",
    },
  ],
  // Decisions and RACI assignments are recorded by the team in the app, never pre-populated.
  decisions: [],
  raci: [],
  nodes: [
    {
      id: "n-tech",
      customerId: C1,
      label: "Field Technicians (500+)",
      kind: "endpoint",
      x: 80,
      y: 60,
      detail: "Mobile technicians executing work orders in the field.",
      provenance: "case-fact",
    },
    {
      id: "n-agents",
      customerId: C1,
      label: "Call-center / Support Agents",
      kind: "endpoint",
      x: 80,
      y: 220,
      detail: "Technical support agents handling escalations from technicians.",
      provenance: "case-fact",
    },
    {
      id: "n-sso",
      customerId: C1,
      label: "SSO / Identity Provider",
      kind: "identity",
      x: 340,
      y: 380,
      detail: "SSO included in scope. Drives permission-aware search.",
      provenance: "case-fact",
    },
    {
      id: "n-n7",
      customerId: C1,
      label: "Neuron7 Intelligent Search",
      kind: "saas",
      x: 360,
      y: 140,
      detail: "Unifies searchable content across platforms (case scope).",
      provenance: "case-fact",
    },
    {
      id: "n-sfdc-sc",
      customerId: C1,
      label: "Salesforce Service Cloud",
      kind: "saas",
      x: 640,
      y: 40,
      detail: "KB articles, technical bulletins, job aids.",
      provenance: "case-fact",
    },
    {
      id: "n-sfdc-fs",
      customerId: C1,
      label: "Salesforce Field Service",
      kind: "saas",
      x: 640,
      y: 160,
      detail: "Work orders and field workflow. Also the cycle-time source system.",
      provenance: "case-fact",
    },
    {
      id: "n-sap",
      customerId: C1,
      label: "SAP (Product Manuals)",
      kind: "saas",
      x: 640,
      y: 290,
      detail: "Must-have content for formal production go-live. No connector available in this case.",
      provenance: "case-fact",
    },
    {
      id: "n-conn-sfdc",
      customerId: C1,
      label: "Salesforce Connector (ready)",
      kind: "integration",
      x: 500,
      y: 100,
      detail: "Existing prebuilt connector, ready in this case.",
      provenance: "case-fact",
    },
    {
      id: "n-conn-sap",
      customerId: C1,
      label: "SAP Connector (not available)",
      kind: "integration",
      x: 500,
      y: 290,
      detail: "Custom build. Engineering initial estimate 8–10 weeks. Critical path.",
      provenance: "case-fact",
    },
  ],
  edges: [
    {
      id: "e-1",
      customerId: C1,
      from: "n-tech",
      to: "n-n7",
      label: "search for guidance",
      flow: "data",
      provenance: "case-fact",
    },
    {
      id: "e-2",
      customerId: C1,
      from: "n-agents",
      to: "n-n7",
      label: "agent search",
      flow: "data",
      provenance: "case-fact",
    },
    {
      id: "e-3",
      customerId: C1,
      from: "n-sso",
      to: "n-n7",
      label: "SSO / entitlements",
      flow: "auth",
      provenance: "case-fact",
    },
    {
      id: "e-4",
      customerId: C1,
      from: "n-n7",
      to: "n-conn-sfdc",
      label: "content sync",
      flow: "data",
      provenance: "case-fact",
    },
    {
      id: "e-5",
      customerId: C1,
      from: "n-conn-sfdc",
      to: "n-sfdc-sc",
      label: "KB / bulletins / job aids",
      flow: "data",
      provenance: "case-fact",
    },
    {
      id: "e-6",
      customerId: C1,
      from: "n-conn-sfdc",
      to: "n-sfdc-fs",
      label: "work order context",
      flow: "data",
      provenance: "case-fact",
    },
    {
      id: "e-7",
      customerId: C1,
      from: "n-n7",
      to: "n-conn-sap",
      label: "blocked dependency",
      flow: "data",
      provenance: "case-fact",
    },
    {
      id: "e-8",
      customerId: C1,
      from: "n-conn-sap",
      to: "n-sap",
      label: "product manuals (to be built)",
      flow: "data",
      provenance: "case-fact",
    },
  ],
  integrations: [
    {
      id: "int-sc",
      customerId: C1,
      system: "Salesforce Service Cloud",
      purpose: "KB articles, technical bulletins, job aids",
      connectorStatus: "prebuilt",
      authModel: "To be confirmed",
      owner: "Not provided",
      blocksGoLive: false,
      provenance: "case-fact",
    },
    {
      id: "int-fs",
      customerId: C1,
      system: "Salesforce Field Service",
      purpose: "Work orders",
      connectorStatus: "prebuilt",
      authModel: "To be confirmed",
      owner: "Not provided",
      blocksGoLive: false,
      provenance: "case-fact",
    },
    {
      id: "int-sap",
      customerId: C1,
      system: "SAP",
      purpose: "Product manuals — must-have for formal production go-live",
      connectorStatus: "not-available",
      authModel: "To be confirmed",
      owner: "Not provided",
      blocksGoLive: true,
      provenance: "case-fact",
    },
    {
      id: "int-sso",
      customerId: C1,
      system: "SSO",
      purpose: "Included in scope",
      connectorStatus: "unknown",
      authModel: "To be confirmed",
      owner: "Not provided",
      blocksGoLive: false,
      provenance: "case-fact",
    },
  ],
  // No post-launch measurements and no incidents were supplied. Both start empty.
  adoption: [],
  incidents: [],
  valueEvents: [
    {
      id: "ve-1",
      customerId: C1,
      date: "W1",
      title: "Business goal confirmed",
      detail: "Improve resolution cycle time by 50% by end of Year 1.",
      provenance: "case-fact",
    },
    {
      id: "ve-2",
      customerId: C1,
      date: "W1",
      title: "SAP dependency discovered in discovery",
      detail:
        "SAP product manuals are a must-have for formal production go-live and no SAP connector is available.",
      provenance: "case-fact",
    },
  ],
  documents: [
    {
      id: "doc-1",
      customerId: C1,
      title: "Kickoff and discovery notes",
      kind: "call-note",
      owner: "Not provided",
      freshness: "Week 1",
      approved: true,
      confidence: "high",
      lastSync: "W1",
      relevantSystems: ["Salesforce", "SAP", "SSO"],
      content:
        "500+ field technicians plus call-center / technical support agents. Salesforce Service Cloud holds KB articles, technical bulletins and job aids. Salesforce Field Service holds work orders. SAP holds product manuals. SSO is included. Intelligent Search unifies searchable content across platforms. Business goal: improve resolution cycle time by 50% by end of Year 1. Original commercial expectation: 6–8 weeks to production go-live.",
      provenance: "case-fact",
    },
    {
      id: "doc-2",
      customerId: C1,
      title: "Integration position (Week 1)",
      kind: "architecture",
      owner: "Not provided",
      freshness: "Week 1",
      approved: true,
      confidence: "high",
      lastSync: "W1",
      relevantSystems: ["Salesforce", "SAP"],
      content:
        "Salesforce connector is ready. SAP requirement was discovered during discovery and no SAP connector is available. Engineering initial estimate is 8–10 weeks for design, development and testing. SAP manuals are a must-have for formal production go-live.",
      provenance: "case-fact",
    },
  ],
  // No reproduction queries were supplied. The team creates these in the app.
  goldenQueries: [],
  readiness: [
    { id: "rg-1", label: "Data sources", group: "Data", value: "Salesforce Service Cloud, Salesforce Field Service, SAP product manuals", blocking: true },
    { id: "rg-2", label: "Source owners", group: "Data", value: "Not provided", blocking: true },
    { id: "rg-3", label: "Connector status", group: "Integration", value: "Salesforce: ready. SAP: not available.", blocking: true },
    { id: "rg-4", label: "Version / auth", group: "Integration", value: "To be confirmed", blocking: true },
    { id: "rg-5", label: "Security / SSO", group: "Security", value: "SSO included in scope", blocking: true },
    { id: "rg-6", label: "Content sample", group: "Data", value: "Not provided", blocking: true },
    { id: "rg-7", label: "Data quality", group: "Data", value: "Not provided", blocking: true },
    { id: "rg-8", label: "Permissions", group: "Security", value: "To be confirmed", blocking: true },
    { id: "rg-9", label: "ROI metric", group: "Value", value: "Resolution cycle time", blocking: false },
    { id: "rg-10", label: "Baseline", group: "Value", value: "Not provided", blocking: true },
    { id: "rg-11", label: "Cohort", group: "Value", value: "Not provided", blocking: false },
    { id: "rg-12", label: "Source system", group: "Value", value: "To be confirmed", blocking: false },
    { id: "rg-13", label: "Customer dependencies", group: "Governance", value: "To be confirmed", blocking: true },
    { id: "rg-14", label: "Named owners", group: "Governance", value: "Not provided", blocking: true },
    { id: "rg-15", label: "Date confidence", group: "Governance", value: "To be confirmed", blocking: true },
    { id: "rg-16", label: "Engineering review for custom / unknown integrations", group: "Integration", value: "Not provided", blocking: true },
  ],
  // Customer messages and assumptions are written by the team in the app.
  messages: [],
  assumptions: [],
};

/** Seeded record ids that were removed as unsupported sample data. Used by the saved-data migration. */
export const RETIRED_OFFICIAL_RECORD_IDS = [
  "sh-1", "sh-2", "sh-3", "sh-4", "sh-5", "sh-6", "sh-7",
  "kpi-p75", "kpi-wau", "kpi-deflect", "kpi-success", "kpi-fresh",
  "ms-w1-scope", "ms-w1-roi", "ms-w1-inv", "ms-w1-sso", "ms-w1-owners",
  "ms-w12-spike", "ms-w12-accel", "ms-w2-reset", "ms-sfdc", "ms-uat-pack",
  "ms-training", "ms-telemetry", "ms-sap-design", "ms-sap-dev", "ms-sap-test",
  "ms-sap-ingest", "ms-uat", "ms-gono", "ms-hyper",
  "dep-baseline", "dep-sme",
  "risk-trust", "risk-baseline", "risk-content", "risk-adopt", "risk-sso",
  "dec-1", "dec-2", "dec-3", "dec-4",
  "raci-1", "raci-2", "raci-3", "raci-4", "raci-5", "raci-6", "raci-7", "raci-8",
  "ad-1", "ad-2", "ad-3", "ad-4", "ad-5", "ad-6",
  "inc-1",
  "ve-3",
  "doc-3", "doc-4",
  "gq-1", "gq-2", "gq-3", "gq-4",
  "msg-1",
  "asm-1", "asm-2", "asm-3", "asm-4",
];