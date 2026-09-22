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
    blurb: "Current customer outcome, stage, health, blockers and priorities.",
  },

  {
    slug: "implementation",
    label: "Implementation",
    group: "Plan",
    blurb: "Milestones, owners, dependencies and the implementation plan.",
  },
  {
    slug: "deployment-board",
    label: "Deployment Board",
    group: "Plan",
    blurb: "Kanban execution board with Jira-backed deployment cards.",
  },
  {
    slug: "rollout-sprints",
    label: "Rollout / Sprints",
    group: "Plan",
    blurb: "Planned rollout periods, capacity, completed points and velocity.",
  },
  {
    slug: "critical-path",
    label: "Critical Path",
    group: "Plan",
    blurb: "Blocking dependencies, sequencing and downstream impact.",
  },
  {
    slug: "risks-decisions",
    label: "Risks + Decisions",
    group: "Plan",
    blurb: "RAID register and decision log with owners and rationale.",
  },
  {
    slug: "raci",
    label: "RACI / Governance",
    group: "Plan",
    blurb: "Ownership, decision rights, governance cadence and current work focus.",
  },
  {
    slug: "assumption-change",
    label: "Scenario Planning",
    group: "Plan",
    blurb: "Test temporary planning assumptions without changing the live customer plan.",
  },

  {
    slug: "environment",
    label: "Environment",
    group: "Technical",
    blurb: "Customer systems, integrations and approved topology.",
  },
  {
    slug: "documents",
    label: "Documents / Knowledge",
    group: "Technical",
    blurb: "Approved source inventory, ownership, freshness and evidence.",
  },
  {
    slug: "engineering-issues",
    label: "Engineering Issues",
    group: "Technical",
    blurb: "Engineering-ready issue intake and Jira execution board.",
  },
  {
    slug: "accuracy-triage",
    label: "Accuracy Triage",
    group: "Technical",
    blurb: "Persistent incident triage, evidence and escalation packets.",
  },

  {
    slug: "meeting-prep",
    label: "Meeting Prep",
    group: "Communication",
    blurb: "Auto-updated call context, approved evidence, decisions, next milestones and pre-call PDF.",
  },
  {
    slug: "messaging",
    label: "Customer Messaging",
    group: "Communication",
    blurb: "Human-reviewed customer communication tied to confirmed workspace facts.",
  },

  {
    slug: "roi-workshop",
    label: "ROI Workshop",
    group: "Value",
    blurb: "Baseline construction and outcome measurement design.",
  },
  {
    slug: "kpi-contract",
    label: "KPI Contract",
    group: "Value",
    blurb: "Metric definitions, sources, ownership and targets.",
  },
  {
    slug: "executive-qbr",
    label: "Executive QBR",
    group: "Value",
    blurb: "Sponsor-ready value, progress, risk and decision view.",
  },

  {
    slug: "readiness-gate",
    label: "Readiness Gate",
    group: "System",
    blurb: "Validate required inputs before a customer-committed launch decision.",
  },
  {
    slug: "evidence",
    label: "Evidence / Artifacts",
    group: "System",
    blurb: "Evidence and operating artifacts behind the current plan.",
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
  "assumption-change": "assumption-change",
};

export function resolveSectionSlug(slug: string) {
  return SECTION_ALIASES[slug] ?? slug;
}

export function sectionBySlug(slug: string) {
  const resolved = resolveSectionSlug(slug);
  return SECTIONS.find((s) => s.slug === resolved);
}
