import {
  Callout,
  KeyQuote,
  MetricCard,
  Panel,
  ProvenanceTag,
  SectionHeader,
  StatusPill,
} from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ASSUMPTION_TOGGLES,
  CORE_PRINCIPLES,
  EXECUTIVE_FRAMING,
  FINAL_POSITIONING,
  OPERATING_THESIS,
  PLANNING_BOUNDARY_TEXT,
  SUCCESS_DEFINITION,
} from "@/lib/n7/seed";
import { EditableCustomerPanel } from "@/components/n7/EditableCustomerPanel";
import { useN7 } from "@/lib/n7/store";

import type { CustomerWorkspace } from "@/lib/n7/types";

export function ExecutiveSummary({ ws }: { ws: CustomerWorkspace }) {
  const { audience } = useN7();
  const isCase = ws.customer.isOfficialCase;
  const openRisks = ws.risks.filter((r) => r.status !== "closed");
  const blockers = ws.dependencies.filter((d) => d.blocksGoLive && d.status !== "ready");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Executive Summary"
        description={ws.customer.headline}
      />

      <KeyQuote>{OPERATING_THESIS}</KeyQuote>

      <EditableCustomerPanel ws={ws} />


      <Panel title="30-second executive framing" right={<ProvenanceTag value="human-decision" />}>
        <p className="text-sm leading-relaxed text-foreground/90">
          {isCase ? EXECUTIVE_FRAMING : ws.customer.headline}
        </p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Target outcome"
          value={ws.customer.targetOutcome}
          provenance={ws.customer.provenance}
          note={ws.outcomes[0]?.valueHypothesis ?? "No outcome recorded yet"}
        />
        <MetricCard
          label="Stage"
          value={ws.customer.stage}
          note={`Users: ${ws.customer.users}`}
          provenance={ws.customer.provenance}
        />
        <MetricCard
          label="Go-live blockers"
          value={String(blockers.length)}
          tone={blockers.length ? "critical" : "success"}
          note="Dependencies that must clear before formal production go-live"
        />
        <MetricCard
          label="Open risks"
          value={String(openRisks.length)}
          tone={openRisks.some((r) => r.impact === "high") ? "warning" : "default"}
          note="Tracked in the RAID register with named owners"
        />
      </div>

      {isCase ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Situation" subtitle="Case facts as supplied. Not corrected against public materials.">
            <ul className="space-y-2 text-sm text-foreground/90">
              {[
                "Healthcare device manufacturer, 500+ field technicians plus call-center / technical support agents.",
                "Salesforce Service Cloud (KB articles, technical bulletins, job aids) and Salesforce Field Service (work orders).",
                "SAP holds product manuals. SSO included. Intelligent Search unifies searchable content.",
                "Business goal: improve resolution cycle time by 50% by end of Year 1.",
                "Original commercial expectation: 6–8 weeks to production go-live.",
                "Week 1: kickoff and discovery complete; Salesforce connector ready.",
                "SAP requirement discovered in discovery; SAP connector is not available.",
                "Engineering initial estimate: 8–10 weeks for design, development and testing.",
                "SAP manuals are a must-have for formal production go-live.",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <ProvenanceTag value="case-fact" short />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="The four moves" subtitle="What the team does next, in order.">
            <ol className="space-y-3 text-sm">
              {[
                ["Make the SAP critical path explicit", "No hidden dependency, no optimistic date."],
                ["Parallelize every safe workstream", "Salesforce, SSO/RBAC, ROI baseline, UAT pack, training, telemetry."],
                ["Reset the customer once, with evidence", "One rebaseline conversation after Engineering validates."],
                ["Instrument adoption, quality and ROI before launch", "So value is provable afterward, not argued."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{t}</span>
                    <span className="block text-xs text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      ) : null}

      <Panel title="Operating principles">
        <ul className="grid gap-2 text-sm text-foreground/90 sm:grid-cols-2">
          {CORE_PRINCIPLES.map((p) => (
            <li key={p} className="flex gap-2 rounded-md bg-secondary/60 p-2.5">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
              {p}
            </li>
          ))}
        </ul>
      </Panel>

      <Callout tone="warning" title="Planning boundary, not a promise">
        {PLANNING_BOUNDARY_TEXT}
      </Callout>

      {audience === "technical" ? (
        <Panel title="Immediate technical posture" subtitle="What the team starts this week.">
          <ul className="space-y-2 text-sm text-foreground/90">
            <li>SAP design spike scoped with architecture, assumptions, test scope and confidence as deliverables.</li>
            <li>Salesforce connector configuration and content-quality validation started in parallel.</li>
            <li>SSO/RBAC inputs requested with a named customer owner and a date.</li>
            <li>Versioned golden query pack drafted per product family and source system.</li>
            <li>Telemetry lineage defined so adoption, quality and cycle time are measurable at launch.</li>
          </ul>
        </Panel>
      ) : null}

      <Panel title="Definition of success">
        <div className="grid gap-3 md:grid-cols-3">
          {SUCCESS_DEFINITION.map((s) => (
            <div key={s.label} className="rounded-md border border-border p-4">
              <div className="label-caps">{s.label}</div>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{s.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Positioning">
        <p className="text-sm leading-relaxed text-foreground/90">{FINAL_POSITIONING}</p>
      </Panel>
    </div>
  );
}

export function AssumptionChange({ ws }: { ws: CustomerWorkspace }) {
  const { activeOverrides, toggleOverride, clearOverrides } = useN7();
  const active = ASSUMPTION_TOGGLES.filter((a) => activeOverrides.includes(a.id));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Scenario mode"
        title="Assumption Change"
        description="Change a condition and the plan, risk state, recommended decision and required evidence adapt. Case facts are preserved separately and are never rewritten."
        actions={
          activeOverrides.length ? (
            <Button variant="outline" size="sm" onClick={clearOverrides}>
              Return to live plan
            </Button>
          ) : null
        }
      />

      <Callout tone={active.length ? "warning" : "info"} title={active.length ? "Scenario mode active" : "Live plan unchanged"}>
        {active.length
          ? `${active.length} scenario override(s) applied on top of the case. The underlying case facts are unchanged and still shown throughout the workspace.`
          : "No temporary overrides are active. Changes here are not saved into the live customer plan."}
      </Callout>

      <div className="grid gap-4 lg:grid-cols-2">
        {ASSUMPTION_TOGGLES.map((a) => {
          const on = activeOverrides.includes(a.id);
          return (
            <article key={a.id} className={`panel p-5 ${on ? "border-warning" : ""}`}>
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{a.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                </div>
                <Switch checked={on} onCheckedChange={() => toggleOverride(a.id)} aria-label={a.label} />
              </header>
              {on ? (
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ["Plan impact", a.planImpact],
                    ["Risk impact", a.riskImpact],
                    ["Recommended decision", a.recommendedDecision],
                    ["Evidence needed", a.evidenceNeeded],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="label-caps">{k}</dt>
                      <dd className="mt-0.5 leading-relaxed text-foreground/90">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </article>
          );
        })}
      </div>

      <Panel
        title="Preserved case facts"
        subtitle="Scenario overrides never overwrite these."
        right={<ProvenanceTag value="case-fact" />}
      >
        <ul className="grid gap-2 text-sm text-foreground/90 sm:grid-cols-2">
          <li>SAP manuals are a must-have for formal production go-live.</li>
          <li>Engineering initial estimate: 8–10 weeks.</li>
          <li>Original commercial expectation: 6–8 weeks.</li>
          <li>Existing Salesforce connector is ready; no SAP connector is available.</li>
          <li>Outcome: 50% resolution cycle-time improvement by end of Year 1.</li>
          <li>500+ field technicians plus call-center / technical support agents.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {ws.assumptions.map((a) => (
            <span key={a.id} className="rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs">
              <StatusPill status="working assumption" /> <span className="ml-1">{a.statement}</span>
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}