import { useState } from "react";
import {
  Callout,
  MetricCard,
  Panel,
  ProvenanceTag,
  SectionHeader,
  StatusPill,
} from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import {
  CADENCE,
  DECISION_TRIGGERS,
  GOVERNANCE,
  GO_LIVE_GATES,
  HUMAN_IN_THE_LOOP,
  PLANNING_BOUNDARY_TEXT,
  RECOVERY_OPTIONS,
  AUTOMATION_CONCEPTS,
} from "@/lib/n7/seed";
import { WorkstreamBoard } from "@/components/n7/WorkstreamBoard";
import type { CustomerWorkspace, Milestone } from "@/lib/n7/types";

import { cn } from "@/lib/utils";

const TRACK_META: Record<Milestone["track"], { label: string; cls: string }> = {
  "critical-path": { label: "Critical path", cls: "bg-destructive/15 text-critical" },
  parallel: { label: "Parallel", cls: "bg-human/50 text-human-foreground" },
  hypercare: { label: "Hypercare", cls: "bg-auto/60 text-auto-foreground" },
  governance: { label: "Governance", cls: "bg-secondary text-secondary-foreground" },
};

function MilestoneRow({ m }: { m: Milestone }) {
  return (
    <tr className="border-b border-border/70 align-top">
      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{m.week}</td>
      <td className="py-3 pr-4">
        <div className="font-medium text-foreground">{m.title}</div>
        <div className="text-xs text-muted-foreground">{m.detail}</div>
      </td>
      <td className="py-3 pr-4">
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", TRACK_META[m.track].cls)}>
          {TRACK_META[m.track].label}
        </span>
      </td>
      <td className="py-3 pr-4 text-muted-foreground">{m.owner}</td>
      <td className="py-3 pr-4">
        <StatusPill status={m.status} />
      </td>
      <td className="py-3">
        <ProvenanceTag value={m.provenance} short />
      </td>
    </tr>
  );
}

export function Implementation({ ws }: { ws: CustomerWorkspace }) {
  const [filter, setFilter] = useState<"all" | Milestone["track"]>("all");
  const milestones = ws.milestones.filter((m) => filter === "all" || m.track === filter);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Implementation"
        description="10 weeks as a planning boundary plus 2 weeks hypercare. Everything safe runs in parallel with the SAP critical path."
      />

      <Callout tone="warning" title="W10 is a planning boundary">
        {PLANNING_BOUNDARY_TEXT}
      </Callout>

      <WorkstreamBoard ws={ws} />


      <div className="flex flex-wrap gap-2">
        {(["all", "critical-path", "parallel", "governance", "hypercare"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={filter === t ? "default" : "outline"}
            onClick={() => setFilter(t)}
          >
            {t === "all" ? "All tracks" : TRACK_META[t].label}
          </Button>
        ))}
      </div>

      <Panel title="Milestone schedule">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Week", "Milestone", "Track", "Owner", "Status", "Provenance"].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <MilestoneRow key={m.id} m={m} />
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Decision triggers"
        subtitle="Interactive gates. Each has a question and a consequence if the answer is no."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {DECISION_TRIGGERS.map((t) => (
            <div key={t.gate} className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary px-2 py-0.5 font-mono text-xs font-semibold text-primary-foreground">
                  {t.gate}
                </span>
                <span className="text-sm font-medium text-foreground">{t.question}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">If no: </span>
                {t.ifNo}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Automation roadmap" subtitle="Planned capabilities remain inactive until their integrations are approved and configured.">
        <div className="grid gap-3 md:grid-cols-2">
          {AUTOMATION_CONCEPTS.map((a) => (
            <div key={a.id} className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                <ProvenanceTag value="automated-signal" short />
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{a.flow}</p>
              <p className="mt-2 text-xs text-foreground/80">{a.human}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-md bg-secondary/60 p-4">
            <div className="label-caps">Automation may</div>
            <ul className="mt-1 space-y-1 text-sm text-foreground/90">
              {HUMAN_IN_THE_LOOP.automationMay.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md bg-human/30 p-4">
            <div className="label-caps">Human decision required</div>
            <ul className="mt-1 space-y-1 text-sm text-foreground/90">
              {HUMAN_IN_THE_LOOP.humanRequired.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export function CriticalPath({ ws }: { ws: CustomerWorkspace }) {
  const [selected, setSelected] = useState("B");
  const criticalPath = ws.milestones.filter((m) => m.track === "critical-path");
  const parallel = ws.milestones.filter((m) => m.track === "parallel");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Critical Path"
        description="The SAP dependency chain, the parallel work that de-risks it, and the three recovery options with their guardrails."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Commercial expectation"
          value="6–8 weeks"
          note="Original expectation at contract"
          provenance="case-fact"
        />
        <MetricCard
          label="Engineering initial estimate"
          value="8–10 weeks"
          tone="warning"
          note="Design, development and testing for the SAP connector"
          provenance="case-fact"
        />
        <MetricCard
          label="Planning boundary"
          value="W10 + 2 wks hypercare"
          tone="warning"
          note="Not a customer commitment"
          provenance="working-assumption"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="SAP critical path" subtitle="Sequential. This is what gates formal production go-live.">
          <ol className="relative space-y-3 border-l border-border pl-5">
            {criticalPath.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-critical" />
                <div className="text-sm font-medium text-foreground">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{m.week}</span>
                  {m.title}
                </div>
                <p className="text-xs text-muted-foreground">{m.detail}</p>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Parallel non-SAP work" subtitle="Everything safe runs now, so the post-SAP tail is short.">
          <ul className="space-y-2 text-sm">
            {parallel.map((m) => (
              <li key={m.id} className="flex items-start gap-2 rounded-md bg-secondary/60 p-2.5">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-success" />
                <span>
                  <span className="font-medium text-foreground">{m.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {m.week} · {m.owner}
                  </span>
                </span>
              </li>
            ))}
            <li className="flex items-start gap-2 rounded-md bg-secondary/60 p-2.5">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-success" />
              <span className="text-sm">Non-production pilots where useful</span>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel title="SAP recovery options" subtitle="Select an option to see the guardrail. The selection is a human decision, recorded in the decision log.">
        <div className="grid gap-3 lg:grid-cols-3">
          {RECOVERY_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                selected === o.id ? "border-primary bg-secondary/70" : "border-border hover:bg-secondary/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="label-caps">Option {o.id}</span>
                {o.recommended ? (
                  <span className="rounded-full bg-human px-2 py-0.5 text-[10px] font-semibold uppercase text-human-foreground">
                    Base model
                  </span>
                ) : null}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-foreground">{o.title}</h3>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{o.boundary}</div>
              <p className="mt-2 text-sm text-foreground/90">{o.summary}</p>
              <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                Guardrail: {o.guardrail}
              </p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Go-live acceptance gates" subtitle="Formal production go-live requires every gate. Salesforce-only operation is never labelled production go-live.">
        <ul className="grid gap-2 md:grid-cols-2">
          {GO_LIVE_GATES.map((g) => (
            <li key={g.label} className="flex items-start gap-3 rounded-md border border-border p-3">
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border text-[10px]",
                  g.met ? "border-success bg-success text-success-foreground" : "border-border",
                )}
              >
                {g.met ? "✓" : ""}
              </span>
              <span>
                <span className="text-sm font-medium text-foreground">{g.label}</span>
                <span className="block text-xs text-muted-foreground">{g.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Dependencies">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Dependency", "Owner", "Type", "Status", "Blocks go-live", "Note"].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.dependencies.map((d) => (
                <tr key={d.id} className="border-b border-border/70 align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">{d.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{d.owner}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{d.type}</td>
                  <td className="py-3 pr-4">
                    <StatusPill status={d.status} />
                  </td>
                  <td className="py-3 pr-4">{d.blocksGoLive ? "Yes" : "No"}</td>
                  <td className="max-w-[320px] py-3 text-muted-foreground">{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export function RisksDecisions({ ws }: { ws: CustomerWorkspace }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Risks + Decisions"
        description="One RAID register and one decision log. Every entry has an owner, a trigger, and the alternative that was rejected."
      />

      <Panel title="RAID register">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Risk", "Category", "Impact", "Likelihood", "Mitigation", "Trigger", "Owner", "Status"].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.risks.map((r) => (
                <tr key={r.id} className="border-b border-border/70 align-top">
                  <td className="max-w-[260px] py-3 pr-4">
                    <div className="font-medium text-foreground">{r.title}</div>
                    <ProvenanceTag value={r.provenance} short className="mt-1" />
                  </td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{r.category}</td>
                  <td className="py-3 pr-4 capitalize">{r.impact}</td>
                  <td className="py-3 pr-4 capitalize">{r.likelihood}</td>
                  <td className="max-w-[280px] py-3 pr-4 text-muted-foreground">{r.mitigation}</td>
                  <td className="max-w-[220px] py-3 pr-4 text-muted-foreground">{r.trigger}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.owner}</td>
                  <td className="py-3">
                    <StatusPill status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Decision log">
        <div className="space-y-3">
          {ws.decisions.map((d) => (
            <article key={d.id} className="rounded-md border border-border p-4">
              <header className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{d.date}</span>
                <h3 className="text-sm font-semibold text-foreground">{d.title}</h3>
                <StatusPill status={d.type === "pending" ? "pending" : "decided"} />
                <ProvenanceTag value={d.provenance} short className="ml-auto" />
              </header>
              <dl className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                <div>
                  <dt className="label-caps">Decision</dt>
                  <dd className="text-foreground/90">{d.decision}</dd>
                </div>
                <div>
                  <dt className="label-caps">Rationale</dt>
                  <dd className="text-foreground/90">{d.rationale}</dd>
                </div>
                <div>
                  <dt className="label-caps">Alternatives</dt>
                  <dd className="text-foreground/90">{d.alternatives}</dd>
                </div>
                <div>
                  <dt className="label-caps">Decided by</dt>
                  <dd className="text-foreground/90">{d.decidedBy}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function Governance({ ws }: { ws: CustomerWorkspace }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="RACI / Governance"
        description="Engineering owns the build. CS/Implementation owns the dependency. The customer owns their inputs. Leadership owns tradeoffs."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {GOVERNANCE.map((g) => (
          <Panel key={g.owner} title={g.owner} subtitle={`Owns: ${g.owns}`}>
            <ul className="space-y-1 text-sm text-foreground/90">
              {g.items.map((i) => (
                <li key={i}>• {i}</li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Panel title="RACI matrix">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Activity", "Responsible", "Accountable", "Consulted", "Informed"].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.raci.map((r) => (
                <tr key={r.id} className="border-b border-border/70 align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">{r.activity}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.responsible}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.accountable}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.consulted}</td>
                  <td className="py-3 text-muted-foreground">{r.informed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Cadence">
          <ul className="space-y-2 text-sm text-foreground/90">
            {CADENCE.map((c) => (
              <li key={c} className="flex gap-2 rounded-md bg-secondary/60 p-2.5">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                {c}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Stakeholders">
          <ul className="space-y-2 text-sm">
            {ws.stakeholders.map((s) => (
              <li key={s.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{s.name}</span>
                  <ProvenanceTag value={s.provenance} short />
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.role} · {s.side}
                </div>
                <p className="mt-1 text-xs text-foreground/80">{s.interest}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}