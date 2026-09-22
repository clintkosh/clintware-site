import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/n7/ThemeToggle";
import { Callout, EmptyState, KeyQuote } from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import {
  CADENCE,
  CORE_PRINCIPLES,
  EXECUTIVE_FRAMING,
  FINAL_POSITIONING,
  GOVERNANCE,
  GO_LIVE_GATES,
  OPERATING_THESIS,
  OUTCOME_MEASUREMENT_STANDARD,
  PLANNING_BOUNDARY_TEXT,
  READINESS_ROOT_CAUSE,
  RECOVERY_OPTIONS,
  ROI_METHOD,
  SUCCESS_DEFINITION,
  TRIAGE_KEY_DIAGNOSTIC,
  TRIAGE_LAYERS,
} from "@/lib/n7/seed";
import { useN7 } from "@/lib/n7/store";
import type { CustomerWorkspace } from "@/lib/n7/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/present/$customerId")({
  head: () => ({
    meta: [
      { title: "Presentation Mode — N7 Customer Value OS" },
      {
        name: "description",
        content:
          "30-second, 5-minute and full operational briefings for the Week-1 customer recovery plan.",
      },
      { property: "og:title", content: "Presentation Mode — N7 Customer Value OS" },
      {
        property: "og:description",
        content: "Executive framing, critical path, governance, value proof, and coordinated next actions on one rail.",
      },
    ],
  }),
  component: Present,
});

type Mode = "30s" | "5min" | "full";

interface Slide {
  title: string;
  body: React.ReactNode;
}

function buildSlides(ws: CustomerWorkspace): Slide[] {
  const criticalPath = ws.milestones.filter((m) => m.track === "critical-path");
  const parallel = ws.milestones.filter((m) => m.track === "parallel");

  return [
    {
      title: "1. Executive framing",
      body: (
        <div className="space-y-4">
          <KeyQuote>{OPERATING_THESIS}</KeyQuote>
          <p className="text-base leading-relaxed text-foreground/90">{EXECUTIVE_FRAMING}</p>
        </div>
      ),
    },
    {
      title: "2. System landscape",
      body: (
        <ul className="space-y-2 text-base text-foreground/90">
          <li>• 500+ field technicians and call-center / technical support agents.</li>
          <li>• Salesforce Service Cloud: KB articles, technical bulletins, job aids.</li>
          <li>• Salesforce Field Service: work orders and field workflow.</li>
          <li>• SAP: product manuals — must-have for formal production go-live.</li>
          <li>• SSO included; Intelligent Search unifies searchable content across platforms.</li>
        </ul>
      ),
    },
    {
      title: "3. Operating principles",
      body: (
        <ul className="grid gap-2 text-base text-foreground/90 md:grid-cols-2">
          {CORE_PRINCIPLES.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "4. Critical-path plan",
      body: (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="label-caps">SAP critical path</div>
            <ol className="mt-2 space-y-1 text-sm text-foreground/90">
              {criticalPath.map((m) => (
                <li key={m.id}>
                  <span className="font-mono text-xs text-muted-foreground">{m.week}</span> {m.title}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <div className="label-caps">Parallel, starting now</div>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              {parallel.map((m) => (
                <li key={m.id}>• {m.title}</li>
              ))}
            </ul>
          </div>
          <Callout tone="warning" title="Planning boundary">
            {PLANNING_BOUNDARY_TEXT}
          </Callout>
        </div>
      ),
    },
    {
      title: "5. SAP recovery options",
      body: (
        <div className="grid gap-3 md:grid-cols-3">
          {RECOVERY_OPTIONS.map((o) => (
            <div key={o.id} className="rounded-lg border border-border p-4">
              <div className="label-caps">Option {o.id}</div>
              <div className="text-sm font-semibold text-foreground">{o.title}</div>
              <div className="font-mono text-xs text-muted-foreground">{o.boundary}</div>
              <p className="mt-2 text-sm text-foreground/90">{o.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">Guardrail: {o.guardrail}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "6. Governance and RACI",
      body: (
        <div className="grid gap-3 md:grid-cols-4">
          {GOVERNANCE.map((g) => (
            <div key={g.owner} className="rounded-lg border border-border p-4">
              <div className="text-sm font-semibold text-foreground">{g.owner}</div>
              <div className="label-caps">Owns {g.owns}</div>
              <ul className="mt-2 space-y-1 text-xs text-foreground/90">
                {g.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "7. Acceptance gates and RAID",
      body: (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="label-caps">Go-live acceptance gates</div>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              {GO_LIVE_GATES.map((g) => (
                <li key={g.label}>• {g.label}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label-caps">Top open risks</div>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              {ws.risks
                .filter((r) => r.status !== "closed")
                .slice(0, 5)
                .map((r) => (
                  <li key={r.id}>
                    • {r.title} <span className="text-xs text-muted-foreground">({r.impact} impact)</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "8. Customer communication",
      body: (
        <div className="space-y-2 text-base text-foreground/90">
          {ws.messages[0] ? (
            <>
              <p>
                <span className="label-caps block">What we discovered</span>
                {ws.messages[0].discovered}
              </p>
              <p>
                <span className="label-caps block">Business impact</span>
                {ws.messages[0].impact}
              </p>
              <p>
                <span className="label-caps block">What we are doing</span>
                {ws.messages[0].actions}
              </p>
              <p>
                <span className="label-caps block">Decisions needed</span>
                {ws.messages[0].decisions}
              </p>
              <p>
                <span className="label-caps block">Next checkpoint</span>
                {ws.messages[0].checkpoint}
              </p>
            </>
          ) : (
            <p>No approved customer message for this customer yet.</p>
          )}
        </div>
      ),
    },
    {
      title: "9. KPI and ROI",
      body: (
        <div className="space-y-3">
          <p className="text-base text-foreground/90">{OUTCOME_MEASUREMENT_STANDARD}</p>
          <ul className="space-y-1 text-sm text-foreground/90">
            {ROI_METHOD.map((m) => (
              <li key={m}>• {m}</li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: "10. Accuracy triage",
      body: (
        <div className="space-y-3">
          <ol className="grid gap-1 text-sm text-foreground/90 md:grid-cols-2">
            {TRIAGE_LAYERS.map((l) => (
              <li key={l.step}>
                {l.step}. {l.title}
              </li>
            ))}
          </ol>
          <Callout tone="warning" title="Key diagnostic">
            {TRIAGE_KEY_DIAGNOSTIC}
          </Callout>
        </div>
      ),
    },
    {
      title: "11. Audience cadence",
      body: (
        <ul className="space-y-1 text-base text-foreground/90">
          {CADENCE.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "12. Readiness prevention",
      body: (
        <div className="space-y-3">
          <Callout tone="critical" title="Root cause, without blame">
            {READINESS_ROOT_CAUSE}
          </Callout>
          <p className="text-base text-foreground/90">
            The control: an unknown or custom connector blocks a customer-committed date until
            Solution/Engineering review or a documented exception approval.
          </p>
        </div>
      ),
    },
    {
      title: "13. Definition of success",
      body: (
        <div className="grid gap-3 md:grid-cols-3">
          {SUCCESS_DEFINITION.map((s) => (
            <div key={s.label} className="rounded-lg border border-border p-4">
              <div className="label-caps">{s.label}</div>
              <p className="mt-1 text-sm text-foreground/90">{s.text}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "14. Team handoff and next actions",
      body: (
        <div className="space-y-3">
          <p className="text-base leading-relaxed text-foreground/90">{FINAL_POSITIONING}</p>
          <ul className="grid gap-2 md:grid-cols-2">
            {ws.milestones
              .filter((milestone) => milestone.status === "in-progress" || milestone.status === "planned")
              .slice(0, 6)
              .map((milestone) => (
                <li key={milestone.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{milestone.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{milestone.week}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Owner: {milestone.owner} · {milestone.status.replace("-", " ")}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      ),
    },
  ];
}

const PATHS: Record<Mode, number[]> = {
  "30s": [0],
  "5min": [0, 3, 4, 8, 12],
  full: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
};

// Extra depth shown only when the audience toggle is set to technical.
const TECH_NOTES: string[] = [
  "The dependency is binary: SAP product manuals are a must-have content source for formal production go-live, so no amount of Salesforce-side progress closes the gate.",
  "Salesforce Service Cloud (knowledge, bulletins, job aids) and Field Service (work orders) are connector-ready. SAP manuals are not; SSO is in scope for identity and RBAC.",
  "Principles are enforced operationally: Engineering owns the estimate, CS owns the dependency and the customer narrative, and neither role overrides the other.",
  "W10 is a planning boundary used for sequencing, not a committed date. It is only reset after Engineering validates architecture, assumptions, milestones, test scope, dependencies and confidence.",
  "Option A requires Engineering-validated safe parallelism or compression. Option C is pilot-only under Product, Security, Engineering and customer approval, and is never labelled production go-live.",
  "Escalation triggers are pre-agreed at W2, W6, W8 and W10 so a slip surfaces as a decision, not as a surprise to the customer.",
  "Acceptance gates are conjunctive: manuals ingested, Salesforce content validated, SSO and RBAC working, content current and permissioned, full-scope UAT passed, quality criteria agreed, no critical blockers, named owners signed.",
  "Messages follow a five-part structure (discovered, impact, doing, decisions needed, next checkpoint) and are screened for unevidenced red-flag phrasing before sending.",
  "Each KPI carries a metric contract: numerator, denominator, cohort, start and stop timestamps, baseline and comparison windows, exclusions, source system and owner, refresh cadence and a data-quality note. Median for typical, P75 for the tail.",
  "Layer order matters: metric validity, blast radius, versioned golden-query reproduction, source data, connector and pipeline, configuration and access, user and query behaviour, and only then retrieval or model.",
  "Cadence is role-scoped: twice-weekly internal SAP sync, weekly customer review, leadership by exception, weekly post-launch, monthly trend and an executive QBR on value.",
  "The control is systemic: an unknown or custom connector blocks a customer-committed date until Solution or Engineering review, or a documented exception is recorded.",
  "Success is measured on three levels: an acceptance-passing SAP-dependent launch, demonstrable movement toward the 50% Year-1 outcome, and a reusable readiness system for the next customer.",
  "The handoff keeps each next action tied to an owner, milestone, dependency, and evidence source in the workspace.",
];

function Present() {
  const { customerId } = Route.useParams();
  const { getWorkspace, audience, setAudience } = useN7();
  const ws = getWorkspace(customerId);
  const [mode, setMode] = useState<Mode>("full");
  const [index, setIndex] = useState(0);


  if (!ws) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <EmptyState
          title="Customer not found"
          body="Workspaces created with the wizard are stored in this browser only."
        />
        <div className="mt-4 text-center">
          <Button asChild>
            <Link to="/">Back to portfolio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const slides = buildSlides(ws);
  const path = PATHS[mode];
  const slide = path.length ? slides[path[Math.min(index, path.length - 1)]!] : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
        <Link to="/" className="text-sm font-semibold text-foreground">
          N7 Customer Value OS
        </Link>
        <span className="text-xs text-muted-foreground">{ws.customer.name} · Briefing</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ThemeToggle />

          <div
            role="group"
            aria-label="Audience"
            className="flex items-center rounded-md border border-border p-0.5"
          >
            {(["executive", "technical"] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={audience === a}
                onClick={() => setAudience(a)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  audience === a
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {a}
              </button>
            ))}
          </div>

          {(
            [
              ["30s", "30-second"],
              ["5min", "5-minute"],
              ["full", "Full 15–18 min"],
            ] as const
          ).map(([m, label]) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "outline"}
              onClick={() => {
                setMode(m);
                setIndex(0);
              }}
            >
              {label}
            </Button>
          ))}
          <Button asChild size="sm" variant="ghost">
            <Link
              to="/customers/$customerId/$section"
              params={{ customerId: ws.customer.id, section: "executive-summary" }}
            >
              Exit
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        {slide ? (
          <>
            <div className="mb-4 flex items-center gap-1">
              {path.map((p, i) => (
                <button
                  key={p}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-primary" : "bg-secondary")}
                />
              ))}
            </div>
            <article className="panel min-h-[460px] p-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{slide.title}</h1>
              <div className="mt-6">{slide.body}</div>
              {audience === "technical" && TECH_NOTES[path[index]!] ? (
                <div className="mt-6 border-t border-border pt-4">
                  <div className="label-caps">Technical depth</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {TECH_NOTES[path[index]!]}
                  </p>
                </div>
              ) : null}
            </article>

            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {index + 1} / {path.length}
              </span>
              <Button disabled={index >= path.length - 1} onClick={() => setIndex((i) => i + 1)}>
                Next
              </Button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}