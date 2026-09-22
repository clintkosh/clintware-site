/**
 * Meeting preparation engine — deterministic, local, credential-free.
 *
 * Everything here reads the current workspace in the browser store and derives
 * a brief, a state delta since the last recorded checkpoint, and pull-forward
 * ("quick win") candidates. No external service is called.
 *
 * CONTROL-PLANE SEAM: richer synthesis (LLM narrative, document extraction,
 * external telemetry enrichment) belongs behind a server-side Clintware MCP
 * adapter that returns the same BriefDoc shape. See
 * src/lib/n7/environment-provider.ts for the established provider pattern.
 */
import type { CustomerWorkspace, MeetingRecord, MeetingType } from "./types";

export const MEETING_TYPES: { value: MeetingType; label: string; focus: string }[] = [
  { value: "weekly", label: "Weekly customer review", focus: "Progress, blockers, next checkpoint." },
  { value: "monthly", label: "Monthly trend review", focus: "Trend, adoption, quality, risk posture." },
  { value: "qbr", label: "Executive QBR", focus: "Value realisation against the committed outcome." },
  { value: "escalation", label: "Executive escalation", focus: "Decision, tradeoff, risk acceptance." },
  { value: "technical", label: "Technical working session", focus: "Design, integration, test scope." },
  { value: "checkpoint", label: "Implementation checkpoint", focus: "Gate state, dependencies, evidence." },
];

export interface MeetingBriefInput {
  objective: string;
  meetingType: MeetingType;
  date: string;
  attendeeIds: string[];
  audience: "executive" | "technical";
  sourceIds: string[];
}

export interface BriefBlock {
  heading: string;
  items: string[];
  /** Internal-only blocks are visually separated and excluded from customer-safe copy. */
  internal?: boolean;
}

export interface DeltaItem {
  title: string;
  why: string;
  impact: string;
  decision: string;
}

export interface QuickWin {
  id: string;
  title: string;
  whyNow: string;
  benefit: string;
  owner: string;
  effort: "low" | "medium" | "high";
  dependency: string;
  changesCriticalPath: boolean;
  provenance: "deterministic-recommendation" | "human-decision";
}

export interface BriefDoc {
  customerName: string;
  meetingLabel: string;
  objective: string;
  date: string;
  generatedAt: string;
  blocks: BriefBlock[];
  delta: DeltaItem[];
  quickWins: QuickWin[];
  agenda: string[];
  questions: string[];
  artifacts: string[];
  skillPacks: string[];
  customerSafeStatus: string;
}

export function snapshotOf(ws: CustomerWorkspace): MeetingRecord["snapshot"] {
  return {
    milestoneStatus: Object.fromEntries(ws.milestones.map((m) => [m.id, m.status])),
    riskIds: ws.risks.filter((r) => r.status !== "closed").map((r) => r.id),
    decisionIds: ws.decisions.map((d) => d.id),
    documentIds: ws.documents.map((d) => d.id),
    integrationStatus: Object.fromEntries(ws.integrations.map((i) => [i.id, i.connectorStatus])),
    nodeCount: ws.nodes.length,
    kpiCurrent: Object.fromEntries(ws.kpis.map((k) => [k.id, k.current])),
    stage: ws.customer.stage,
  };
}

/** What materially changed since the last recorded meeting. Empty is a valid answer. */
export function computeDelta(ws: CustomerWorkspace, last: MeetingRecord | undefined): DeltaItem[] {
  if (!last) return [];
  const prev = last.snapshot;
  const out: DeltaItem[] = [];

  for (const m of ws.milestones) {
    const before = prev.milestoneStatus[m.id];
    if (before && before !== m.status) {
      out.push({
        title: `${m.week} · ${m.title}: ${before} → ${m.status}`,
        why: m.detail,
        impact:
          m.track === "critical-path"
            ? "On the critical path. Any slip moves the planning boundary, it does not move a promise."
            : "Parallel workstream. Does not move the critical path on its own.",
        decision:
          m.status === "blocked"
            ? "Named owner and unblock path required at this meeting."
            : "No decision required. Report as progress.",
      });
    }
  }

  const newRisks = ws.risks.filter((r) => r.status !== "closed" && !prev.riskIds.includes(r.id));
  for (const r of newRisks) {
    out.push({
      title: `New risk: ${r.title}`,
      why: r.trigger,
      impact: `${r.impact} impact · ${r.likelihood} likelihood`,
      decision: `Confirm mitigation owner (${r.owner}) and acceptance position.`,
    });
  }

  const closedRisks = prev.riskIds.filter(
    (id) => !ws.risks.some((r) => r.id === id && r.status !== "closed"),
  );
  if (closedRisks.length) {
    out.push({
      title: `${closedRisks.length} risk(s) retired since the last checkpoint`,
      why: "Mitigation completed or the trigger no longer applies.",
      impact: "Risk posture improves. Evidence should be attached before it is claimed.",
      decision: "None. Confirm the evidence is filed.",
    });
  }

  const newDecisions = ws.decisions.filter((d) => !prev.decisionIds.includes(d.id));
  for (const d of newDecisions) {
    out.push({
      title: `Decision logged: ${d.title}`,
      why: d.rationale,
      impact: d.decision,
      decision: d.type === "pending" ? "Still pending. Needs a named decision owner." : "Recorded.",
    });
  }

  const newDocs = ws.documents.filter((d) => !prev.documentIds.includes(d.id));
  if (newDocs.length) {
    out.push({
      title: `${newDocs.length} new source document(s)`,
      why: newDocs.map((d) => d.title).join("; "),
      impact: "Changes what the brief and the environment map can be generated from.",
      decision: "Confirm approval state and owner for each new source.",
    });
  }

  for (const i of ws.integrations) {
    const before = prev.integrationStatus[i.id];
    if (before && before !== i.connectorStatus) {
      out.push({
        title: `${i.system} connector: ${before} → ${i.connectorStatus}`,
        why: i.purpose,
        impact: i.blocksGoLive ? "Gate-relevant. Affects go-live readiness." : "Not a go-live gate.",
        decision: "Confirm whether the readiness gate position changes.",
      });
    }
  }

  if (prev.nodeCount !== ws.nodes.length) {
    out.push({
      title: `Environment map changed (${prev.nodeCount} → ${ws.nodes.length} nodes)`,
      why: "Discovery or a human-approved topology proposal was applied.",
      impact: "Integration inventory and test scope may need revisiting.",
      decision: "Confirm the map is the environment of record.",
    });
  }

  if (prev.stage !== ws.customer.stage) {
    out.push({
      title: `Implementation stage: ${prev.stage} → ${ws.customer.stage}`,
      why: "Stage advanced in the workspace.",
      impact: "Cadence, evidence expectations and gate scope change with the stage.",
      decision: "Confirm the gate criteria for the new stage are agreed.",
    });
  }

  return out;
}

/**
 * Pull-forward candidates. Only work that is genuinely safe to do now — never
 * anything that bypasses the SAP hard dependency or fabricates progress.
 */
export function computeQuickWins(ws: CustomerWorkspace): QuickWin[] {
  const wins: QuickWin[] = [];
  const push = (w: QuickWin) => wins.push(w);

  const unapproved = ws.documents.filter((d) => !d.approved);
  if (unapproved.length) {
    push({
      id: "qw-doc-approval",
      title: `Validate and approve ${unapproved.length} unapproved source document(s)`,
      whyNow: "Unapproved sources cannot be used for environment generation or call preparation.",
      benefit: "Removes rework later and widens the evidence base before UAT.",
      owner: "CS / Implementation with the named source owner",
      effort: "low",
      dependency: "Customer source owner availability",
      changesCriticalPath: false,
      provenance: "deterministic-recommendation",
    });
  }

  const staleBaselines = ws.kpis.filter((k) => /tbd|pending|unknown/i.test(k.baseline));
  if (staleBaselines.length) {
    push({
      id: "qw-baseline",
      title: `Approve the baseline for ${staleBaselines.length} KPI(s)`,
      whyNow: "A measured improvement claim is only defensible against a customer-approved baseline.",
      benefit: "Protects the Year-1 outcome claim and removes a launch-week dependency.",
      owner: "CS / Implementation with the customer data owner",
      effort: "medium",
      dependency: "Source system extract and data owner sign-off",
      changesCriticalPath: false,
      provenance: "deterministic-recommendation",
    });
  }

  const notRun = ws.goldenQueries.filter((q) => q.lastResult === "not-run");
  if (notRun.length) {
    push({
      id: "qw-golden",
      title: `Version and run ${notRun.length} golden query/queries`,
      whyNow: "Versioned golden queries are the only reliable way to reproduce an accuracy claim later.",
      benefit: "Turns a future accuracy dispute into a five-minute reproduction.",
      owner: "CS / Implementation",
      effort: "low",
      dependency: "Access to a working search environment",
      changesCriticalPath: false,
      provenance: "deterministic-recommendation",
    });
  }

  const unknownConnectors = ws.integrations.filter(
    (i) => i.connectorStatus === "unknown" || i.connectorStatus === "custom",
  );
  if (unknownConnectors.length) {
    push({
      id: "qw-connector-clarify",
      title: `Clarify integration prerequisites for ${unknownConnectors.map((i) => i.system).join(", ")}`,
      whyNow: "Auth model, extract scope and content ownership can be settled before any build starts.",
      benefit: "Shortens the design spike and reduces estimate variance.",
      owner: "CS / Implementation with Engineering",
      effort: "medium",
      dependency: "Engineering reviewer time",
      changesCriticalPath: false,
      provenance: "deterministic-recommendation",
    });
  }

  const blankGate = ws.readiness.filter((r) => !r.value || /pending|unknown|tbd/i.test(r.value));
  if (blankGate.length) {
    push({
      id: "qw-readiness",
      title: `Close ${blankGate.length} open readiness-gate field(s)`,
      whyNow: "The gate is the control that prevents the next committed date without verified readiness.",
      benefit: "Removes avoidable go/no-go debate later.",
      owner: "CS / Implementation",
      effort: "low",
      dependency: "None",
      changesCriticalPath: false,
      provenance: "deterministic-recommendation",
    });
  }

  const later = ws.milestones.filter((m) => m.status === "planned" && m.track === "parallel");
  if (later.length) {
    push({
      id: "qw-pull-parallel",
      title: `Pull forward ${Math.min(2, later.length)} parallel workstream item(s)`,
      whyNow: "These items carry no dependency on the SAP connector and are currently scheduled later.",
      benefit: "Removes load from the window where the critical path is tightest.",
      owner: later[0]?.owner ?? "CS / Implementation",
      effort: "medium",
      dependency: "None on the critical path",
      changesCriticalPath: false,
      provenance: "deterministic-recommendation",
    });
  }

  push({
    id: "qw-uat-pack",
    title: "Prepare the UAT pack and test-case set now",
    whyNow: "UAT scope can be written against agreed workflows before any connector exists.",
    benefit: "Frees the post-build window and makes the gate criteria explicit early.",
    owner: "CS / Implementation with customer SMEs",
    effort: "medium",
    dependency: "Agreed use cases",
    changesCriticalPath: false,
    provenance: "deterministic-recommendation",
  });

  push({
    id: "qw-narrative",
    title: "Prepare the executive ROI narrative and evidence pack",
    whyNow: "The measurement method can be agreed before any number exists.",
    benefit: "The first value conversation starts from an approved method, not a debate.",
    owner: "CS / Implementation",
    effort: "low",
    dependency: "Finance-approved loaded rate for monetisation only",
    changesCriticalPath: false,
    provenance: "deterministic-recommendation",
  });

  return wins;
}

function fmtList(values: string[], fallback: string) {
  return values.length ? values : [fallback];
}

export function buildMeetingBrief(
  ws: CustomerWorkspace,
  input: MeetingBriefInput,
  last: MeetingRecord | undefined,
): BriefDoc {
  const type = MEETING_TYPES.find((t) => t.value === input.meetingType)!;
  const attendees = ws.stakeholders.filter((s) => input.attendeeIds.includes(s.id));
  const sources = ws.documents.filter(
    (d) => d.approved && (input.sourceIds.length === 0 || input.sourceIds.includes(d.id)),
  );
  const delta = computeDelta(ws, last);
  const quickWins = computeQuickWins(ws);

  const blockers = ws.dependencies.filter((d) => d.blocksGoLive && d.status !== "ready");
  const openRisks = ws.risks.filter((r) => r.status !== "closed");
  const pending = ws.decisions.filter((d) => d.type === "pending");
  const doneSince = ws.milestones.filter((m) => m.status === "done");
  const next = ws.milestones.filter((m) => m.status === "in-progress" || m.status === "planned");
  const critical = ws.milestones.filter((m) => m.track === "critical-path");
  const latestAdoption = ws.adoption[ws.adoption.length - 1];

  const blocks: BriefBlock[] = [
    {
      heading: "Executive summary",
      items: [
        ws.customer.headline,
        `Stage: ${ws.customer.stage}. Health: ${ws.customer.health}.`,
        `Committed outcome: ${ws.customer.targetOutcome}.`,
      ],
    },
    {
      heading: "Outcome, baseline, target and value state",
      items: fmtList(
        ws.kpis
          .slice(0, 6)
          .map(
            (k) =>
              `${k.name} — baseline ${k.baseline}; target ${k.target}; current ${k.current} (${k.kind}, source ${k.contract.sourceSystem}, owner ${k.contract.sourceOwner})`,
          ),
        "No KPIs defined yet. Run the ROI baseline workshop before claiming movement.",
      ),
    },
    {
      heading: "Completed since the last checkpoint",
      items: fmtList(
        doneSince.map((m) => `${m.week} · ${m.title} (${m.owner})`),
        "Nothing recorded as complete. Do not invent activity — use the pull-forward list instead.",
      ),
    },
    {
      heading: "Current critical path",
      items: fmtList(
        critical.map((m) => `${m.week} · ${m.title} — ${m.status} (${m.owner})`),
        "No critical-path items recorded.",
      ),
    },
    {
      heading: "Next milestones, owners and confidence",
      items: fmtList(
        next
          .slice(0, 8)
          .map(
            (m) =>
              `${m.week} · ${m.title} — ${m.status}, owner ${m.owner}, confidence ${
                m.track === "critical-path" ? "dependent on validated engineering estimate" : "moderate"
              }`,
          ),
        "No upcoming milestones recorded.",
      ),
    },
    {
      heading: "Open risks, blockers and decisions needed",
      items: [
        ...openRisks.map((r) => `RISK · ${r.title} — ${r.impact} impact, owner ${r.owner}`),
        ...blockers.map((b) => `BLOCKER · ${b.name} — ${b.status}, owner ${b.owner}`),
        ...pending.map((d) => `DECISION NEEDED · ${d.title} — ${d.decision}`),
      ].length
        ? [
            ...openRisks.map((r) => `RISK · ${r.title} — ${r.impact} impact, owner ${r.owner}`),
            ...blockers.map((b) => `BLOCKER · ${b.name} — ${b.status}, owner ${b.owner}`),
            ...pending.map((d) => `DECISION NEEDED · ${d.title} — ${d.decision}`),
          ]
        : ["No open risks, blockers or pending decisions recorded."],
    },
    {
      heading: "Environment and integration state",
      items: fmtList(
        ws.integrations.map(
          (i) =>
            `${i.system} — connector ${i.connectorStatus}, auth ${i.authModel}, owner ${i.owner}${
              i.blocksGoLive ? " · blocks go-live" : ""
            }`,
        ),
        "No integrations captured yet.",
      ),
    },
    {
      heading: "Document and evidence freshness",
      items: fmtList(
        sources.map(
          (d) => `${d.title} — ${d.kind}, owner ${d.owner}, freshness ${d.freshness}, confidence ${d.confidence}`,
        ),
        "No approved sources selected. The brief is limited to workspace state.",
      ),
    },
    {
      heading: "Adoption, usage and quality signals",
      items: latestAdoption
        ? [
            `Week ${latestAdoption.week}: ${latestAdoption.activeTechnicians} active technicians, ${latestAdoption.searches} searches`,
            `Successful session rate ${latestAdoption.successfulSessionRate}% · deflection ${latestAdoption.deflectionRate}%`,
            `Median cycle time ${latestAdoption.medianCycleTimeMin} min · P75 ${latestAdoption.p75CycleTimeMin} min`,
          ]
        : ["No adoption telemetry yet. Adoption is not ROI — do not present usage as outcome."],
    },
    {
      heading: "Stakeholders and RACI",
      items: fmtList(
        ws.stakeholders.map((s) => `${s.name} — ${s.role} (${s.side})`),
        "No stakeholders captured.",
      ),
    },
    {
      heading: "Commitments previously made",
      items: fmtList(
        ws.decisions.filter((d) => d.type === "human-decision").map((d) => `${d.date} · ${d.decision}`),
        "No prior commitments recorded in the decision log.",
      ),
    },
    {
      heading: "Unknowns requiring validation",
      items: fmtList(
        ws.assumptions.map((a) => `${a.statement} — validation: ${a.validationPath} (${a.owner})`),
        "No open assumptions recorded.",
      ),
      internal: true,
    },
    {
      heading: "Internal-only notes",
      items: [
        `Meeting focus: ${type.focus}`,
        "The planning boundary is a planning artefact, not a promise. Never present it as a committed date.",
        "Any date change is a human decision made with Engineering-validated inputs.",
        "No generated text is sent to the customer without a named human approving it.",
      ],
      internal: true,
    },
  ];

  const agenda = [
    `Purpose and desired decision: ${input.objective}`,
    delta.length ? "State changes since the last checkpoint" : "Confirmation that nothing material changed",
    "Critical path and dependency position",
    delta.length ? "Impact on timeline, value and risk" : "Pull-forward work proposed for this window",
    "Decisions required today, with named owners",
    "Next checkpoint and what will be shown",
  ];

  const questions = [
    ...(blockers.length ? [`Who owns closing ${blockers[0]!.name}, and by when?`] : []),
    ...(staleBaselineQuestion(ws) ? [staleBaselineQuestion(ws)!] : []),
    "Which source systems have changed owners or content since we last validated them?",
    "Are the agreed start and stop timestamps for the outcome metric still correct?",
    input.audience === "technical"
      ? "What test scope do you expect for integration and resilience testing?"
      : "What does the sponsor need to see before signing the readiness gate?",
  ];

  const artifacts = [
    "Integrated plan and critical path",
    "RAID register and decision log",
    "KPI metric contracts",
    "Readiness gate record",
    ...sources.slice(0, 5).map((d) => d.title),
  ];

  const skillPacks =
    input.meetingType === "technical"
      ? ["Integration & connector", "Search quality & accuracy", "Implementation delivery"]
      : input.meetingType === "qbr" || input.meetingType === "monthly"
        ? ["Value & ROI", "Executive communication", "Adoption & change"]
        : input.meetingType === "escalation"
          ? ["Executive communication", "Implementation delivery", "Risk & governance"]
          : ["Implementation delivery", "Risk & governance", "Value & ROI"];

  const customerSafeStatus = delta.length
    ? `Since our last checkpoint there ${delta.length === 1 ? "is one" : `are ${delta.length}`} material update${
        delta.length === 1 ? "" : "s"
      }. The dependency position is unchanged in principle: formal production go-live still requires every agreed content source, and we are sequencing everything that does not depend on it in parallel.`
    : "There is no material change to report since the last checkpoint. Rather than manufacture activity, we are pulling forward work that removes load from the tightest part of the plan. The dependency position and the acceptance gates are unchanged.";

  return {
    customerName: ws.customer.name,
    meetingLabel: type.label,
    objective: input.objective,
    date: input.date,
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    blocks,
    delta,
    quickWins,
    agenda,
    questions,
    artifacts,
    skillPacks,
    customerSafeStatus,
  };
}

function staleBaselineQuestion(ws: CustomerWorkspace) {
  const k = ws.kpis.find((x) => /tbd|pending|unknown/i.test(x.baseline));
  return k ? `Who approves the baseline for "${k.name}", and from which system of record?` : null;
}

/** Plain-text rendering used by the Copy action. */
export function briefToText(doc: BriefDoc) {
  const lines: string[] = [
    `${doc.customerName} — ${doc.meetingLabel}`,
    `Objective: ${doc.objective}`,
    `Meeting date: ${doc.date}`,
    `Generated: ${doc.generatedAt} (local demo generation, no external service)`,
    "",
    "CUSTOMER-SAFE STATUS",
    doc.customerSafeStatus,
    "",
  ];
  if (doc.delta.length) {
    lines.push("WHAT CHANGED SINCE THE LAST CHECKPOINT");
    for (const d of doc.delta) {
      lines.push(`- ${d.title}`, `  Why: ${d.why}`, `  Impact: ${d.impact}`, `  Decision: ${d.decision}`);
    }
    lines.push("");
  } else {
    lines.push(
      "NOTHING MATERIAL CHANGED",
      "No fabricated activity. Pull-forward candidates are listed below.",
      "",
    );
    lines.push("QUICK WINS / PULL FORWARD");
    for (const q of doc.quickWins) {
      lines.push(
        `- ${q.title}`,
        `  Why now: ${q.whyNow}`,
        `  Benefit: ${q.benefit}`,
        `  Owner: ${q.owner} · Effort: ${q.effort} · Dependency: ${q.dependency} · Critical path: ${
          q.changesCriticalPath ? "yes" : "no"
        }`,
      );
    }
    lines.push("");
  }
  for (const b of doc.blocks) {
    lines.push(b.internal ? `${b.heading.toUpperCase()} (INTERNAL ONLY)` : b.heading.toUpperCase());
    for (const i of b.items) lines.push(`- ${i}`);
    lines.push("");
  }
  lines.push("RECOMMENDED AGENDA");
  doc.agenda.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  lines.push("", "QUESTIONS TO ASK");
  doc.questions.forEach((q) => lines.push(`- ${q}`));
  lines.push("", "ARTEFACTS TO HAVE OPEN");
  doc.artifacts.forEach((a) => lines.push(`- ${a}`));
  lines.push("", "RECOMMENDED SKILL PACKS");
  doc.skillPacks.forEach((s) => lines.push(`- ${s}`));
  return lines.join("\n");
}