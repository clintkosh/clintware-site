export interface SectionDef {
  slug: string;
  label: string;
  group: string;
  blurb: string;
}

export const SECTIONS: SectionDef[] = [
  {
    slug: "executive-summary",
    label: "Executive Summary",
    group: "Frame",
    blurb: "The 30-second position, the situation, and the four moves.",
  },
  {
    slug: "implementation",
    label: "Implementation",
    group: "Plan",
    blurb: "Week-by-week plan, parallel workstreams, decision triggers.",
  },
  {
    slug: "deployment-board",
    label: "Deployment Board",
    group: "Plan",
    blurb: "Kanban execution board with optional Jira-backed cards.",
  },
  {
    slug: "rollout-sprints",
    label: "Rollout / Sprints",
    group: "Plan",
    blurb: "Sprint goals, planned weeks, capacity and measured velocity.",
  },
  {
    slug: "engineering-issues",
    label: "Engineering Issues",
    group: "Technical",
    blurb: "Engineering-ready issue intake and Jira ticket board.",
  },
  {
    slug: "critical-path",
    label: "Critical Path",
    group: "Plan",
    blurb: "SAP dependency chain and the three recovery options.",
  },
  {
    slug: "risks-decisions",
    label: "Risks + Decisions",
    group: "Plan",
    blurb: "RAID register and the decision log with rationale.",
  },
  {
    slug: "raci",
    label: "RACI / Governance",
    group: "Plan",
    blurb: "Who owns build, dependency, inputs and tradeoffs. Cadence.",
  },
  {
    slug: "environment",
    label: "Environment",
    group: "Technical",
    blurb: "Interactive customer architecture map with provenance.",
  },
  {
    slug: "documents",
    label: "Documents / Knowledge",
    group: "Technical",
    blurb: "Source inventory with owner, freshness and approval state.",
  },
  {
    slug: "messaging",
    label: "Customer Messaging",
    group: "Communication",
    blurb: "Five-part composer, approved example, red-flag phrases.",
  },
  {
    slug: "roi-workshop",
    label: "ROI Workshop",
    group: "Value",
    blurb: "Baseline construction, measure-first monetization model.",
  },
  {
    slug: "kpi-contract",
    label: "KPI Contract",
    group: "Value",
    blurb: "Full metric contracts for every leading and lagging KPI.",
  },
  {
    slug: "accuracy-triage",
    label: "Accuracy Triage",
    group: "Technical",
    blurb: "Eight-layer wizard plus engineering escalation packet.",
  },
  {
    slug: "executive-qbr",
    label: "Executive QBR",
    group: "Value",
    blurb: "Weekly, monthly and QBR value views for the sponsor.",
  },
  {
    slug: "readiness-gate",
    label: "Readiness Gate",
    group: "System",
    blurb: "Presales control that prevents the next repeat of this failure.",
  },
  {
    slug: "meeting-prep",
    label: "Meeting Prep",
    group: "Communication",
    blurb: "Auto-updated call context, approved evidence, decisions, next milestones and pre-call PDF.",
  },
  {
    slug: "assumption-change",
    label: "Assumption Change",
    group: "Frame",
    blurb: "Change a condition and watch the plan, risk and decision adapt.",
  },
  {
    slug: "evidence",
    label: "Evidence / Artifacts",
    group: "System",
    blurb: "Every artifact behind the position, in one index.",
  },
];

export const SECTION_GROUPS = ["Frame", "Plan", "Technical", "Communication", "Value", "System"];

/** Friendly aliases so older or hand-typed URLs still resolve. */
export const SECTION_ALIASES: Record<string, string> = {
  "raci-governance": "raci",
  governance: "raci",
  "customer-messaging": "messaging",
  "documents-knowledge": "documents",
  "evidence-artifacts": "evidence",
  kanban: "deployment-board",
  deployment: "deployment-board",
  sprints: "rollout-sprints",
  issues: "engineering-issues",
  "virtual-liaison": "meeting-prep",
  "call-brief": "meeting-prep",
  "meeting-brief": "meeting-prep",
};

export function resolveSectionSlug(slug: string) {
  return SECTION_ALIASES[slug] ?? slug;
}

export function sectionBySlug(slug: string) {
  const resolved = resolveSectionSlug(slug);
  return SECTIONS.find((s) => s.slug === resolved);
}