import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Callout,
  DemoDataNote,
  EmptyState,
  MetricCard,
  Panel,
  ProvenanceTag,
  SectionHeader,
} from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OUTCOME_MEASUREMENT_STANDARD, ROI_METHOD, SUCCESS_DEFINITION } from "@/lib/n7/seed";
import type { CustomerWorkspace } from "@/lib/n7/types";

export function ROIWorkshop({ ws }: { ws: CustomerWorkspace }) {
  // No values are pre-filled. Every input is entered by the team.
  const [eligible, setEligible] = useState(0);
  const [deflection, setDeflection] = useState(0);
  const [aht, setAht] = useState(0);
  const [rate, setRate] = useState(0);

  const avoided = Math.round((eligible * deflection) / 100);
  const hours = +((avoided * aht) / 60).toFixed(1);
  const value = rate > 0 ? Math.round(hours * rate) : null;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="ROI Workshop"
        description="Measure first, monetize second. Adoption is never presented as ROI."
      />

      <Callout tone="info" title="How the 50% is defended">
        {OUTCOME_MEASUREMENT_STANDARD}
      </Callout>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Baseline construction" subtitle="Agreed before launch, in writing.">
          <ul className="space-y-2 text-sm text-foreground/90">
            <li>• Source system and the exact start/stop timestamp fields.</li>
            <li>• Cohort definition, locked across baseline and comparison windows.</li>
            <li>• Exclusions: parts-delay holds, customer-caused waits, duplicates, cancellations.</li>
            <li>• Baseline window and an equal-length rolling comparison window.</li>
            <li>• Named data owner and a documented confidence note.</li>
            <li>• If historical data is unusable, a forward baseline with an approved construction method.</li>
          </ul>
        </Panel>
        <Panel title="Measure first, monetize second" right={<ProvenanceTag value="working-assumption" short />}>
          <ol className="space-y-2 text-sm text-foreground/90">
            {ROI_METHOD.map((m) => (
              <li key={m}>• {m}</li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel
        title="Value calculator"
        subtitle="Deterministic arithmetic on inputs you control. No dollar figure is produced without a Finance-approved loaded labor rate."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="eligible">Eligible issues / month</Label>
            <Input id="eligible" type="number" value={eligible} onChange={(e) => setEligible(+e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="deflect">Deflection rate (%)</Label>
            <Input id="deflect" type="number" value={deflection} onChange={(e) => setDeflection(+e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="aht">Average handling time (min)</Label>
            <Input id="aht" type="number" value={aht} onChange={(e) => setAht(+e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rate">Finance-approved loaded rate ($/hr)</Label>
            <Input id="rate" type="number" value={rate} onChange={(e) => setRate(+e.target.value)} />
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Avoided support interactions" value={`${avoided} / month`} note="Eligible issues resolved without call-center escalation" />
          <MetricCard label="Support hours saved" value={`${hours} hrs / month`} note="Avoided calls × average handling time" />
          <MetricCard
            label="Labor value"
            value={value === null ? "Requires approved rate" : `$${value.toLocaleString()} / month`}
            tone={value === null ? "warning" : "success"}
            note="Never claimed without Finance/customer approval"
          />
        </div>
        <DemoDataNote>
          Inputs start empty and are entered by your team. Every monetary assumption must be
          customer or Finance approved before it appears in a business review.
        </DemoDataNote>
      </Panel>

      <Panel title="Leading vs lagging separation">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border p-4">
            <div className="label-caps">Leading (behavior)</div>
            <ul className="mt-1 space-y-1 text-sm text-foreground/90">
              {["Weekly active field technicians", "Search usage", "Successful session rate", "Search-to-action rate", "Support-call deflection", "Time to useful guidance", "Source freshness", "Search quality"].map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-border p-4">
            <div className="label-caps">Lagging (business)</div>
            <ul className="mt-1 space-y-1 text-sm text-foreground/90">
              {["Resolution cycle time (median + P75)", "Support effort saved", "Technician productivity recovered", "Escalations avoided", "Business-value realization"].map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </div>
        </div>
        <Callout tone="warning" title="Do not equate adoption with ROI">
          Usage growth is a leading indicator that the workflow changed. It is not evidence that
          resolution cycle time moved.
        </Callout>
      </Panel>
    </div>
  );
}

export function KPIContract({ ws }: { ws: CustomerWorkspace }) {
  const [openId, setOpenId] = useState<string | null>(ws.kpis[0]?.id ?? null);
  const kpi = ws.kpis.find((k) => k.id === openId) ?? ws.kpis[0]!;

  if (!ws.kpis.length) {
    return (
      <div className="space-y-6">
        <SectionHeader title="KPI Contract" description="No KPIs defined for this customer yet." />
        <EmptyState title="No metric contracts" body="Run the ROI baseline workshop to define the primary outcome metric and its contract." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="KPI Contract"
        description="Every KPI carries a full contract: definition, numerator, denominator, cohort, timestamps, windows, exclusions, source, owner, cadence and a confidence note."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ws.kpis.map((k) => (
          <button key={k.id} onClick={() => setOpenId(k.id)} className="text-left">
            <MetricCard
              label={`${k.kind} · ${k.unit}`}
              value={k.name}
              note={`Baseline: ${k.baseline} · Target: ${k.target}`}
              provenance={k.provenance}
            />
          </button>
        ))}
      </div>

      <Panel title={`Metric contract — ${kpi.name}`} right={<ProvenanceTag value={kpi.provenance} />}>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Metric name", kpi.contract.metricName],
            ["Business definition", kpi.contract.businessDefinition],
            ["Numerator", kpi.contract.numerator],
            ["Denominator", kpi.contract.denominator],
            ["Cohort", kpi.contract.cohort],
            ["Start timestamp", kpi.contract.startTimestamp],
            ["Stop timestamp", kpi.contract.stopTimestamp],
            ["Baseline window", kpi.contract.baselineWindow],
            ["Comparison window", kpi.contract.comparisonWindow],
            ["Exclusions", kpi.contract.exclusions],
            ["Source system", kpi.contract.sourceSystem],
            ["Source owner", kpi.contract.sourceOwner],
            ["Refresh cadence", kpi.contract.refreshCadence],
            ["Confidence / data-quality note", kpi.contract.confidenceNote],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border border-border p-3">
              <dt className="label-caps">{k}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-foreground/90">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Callout tone="info" title="Median and tail, always together">
        Median (P50) shows the typical experience. P75 ensures difficult cases are not hidden behind
        an improving average.
      </Callout>
    </div>
  );
}

export function ExecutiveQBR({ ws }: { ws: CustomerWorkspace }) {
  const [view, setView] = useState<"weekly" | "monthly" | "qbr">("weekly");
  const data = ws.adoption;

  const latest = data[data.length - 1]!;
  const first = data[0]!;
  const cycleDelta = useMemo(() => {
    if (!latest || !first) return null;
    return Math.round(((first.medianCycleTimeMin - latest.medianCycleTimeMin) / first.medianCycleTimeMin) * 100);
  }, [first, latest]);

  if (!data.length) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Executive QBR" description="No post-launch measurement series for this customer yet." />
        <EmptyState
          title="Nothing to review yet"
          body="Value views appear once telemetry and cycle-time measurement are instrumented and the implementation reaches hypercare."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Executive QBR"
        description="Sponsor-level value review. Leading behavior and lagging business outcome are shown separately."
        actions={
          <div className="flex rounded-md border border-border p-0.5">
            {(["weekly", "monthly", "qbr"] as const).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? "default" : "ghost"}
                onClick={() => setView(v)}
                className="capitalize"
              >
                {v}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Median cycle time"
          value={`${latest.medianCycleTimeMin} min`}
          note={`From ${first.medianCycleTimeMin} min at hypercare start`}
          tone="success"
          provenance="user-entered"
        />
        <MetricCard
          label="P75 cycle time"
          value={`${latest.p75CycleTimeMin} min`}
          note="Tail metric — difficult cases stay visible"
          provenance="user-entered"
        />
        <MetricCard
          label="Progress toward 50%"
          value={cycleDelta === null ? "—" : `${cycleDelta}%`}
          tone="warning"
          note="Against an unapproved interim baseline. Not a value claim."
          provenance="user-entered"
        />
        <MetricCard
          label="Weekly active technicians"
          value={String(latest.activeTechnicians)}
          note="Leading signal. Not ROI."
          provenance="user-entered"
        />
      </div>

      <Panel title="Resolution cycle time (median vs P75)" subtitle="Illustrative demo series.">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="medianCycleTimeMin" name="Median (P50)" stroke="var(--color-chart-1)" strokeWidth={2} />
              <Line type="monotone" dataKey="p75CycleTimeMin" name="P75" stroke="var(--color-chart-3)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <DemoDataNote />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Adoption and deflection" subtitle="Leading indicators only.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="activeTechnicians" name="Active technicians" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.18} />
                <Area type="monotone" dataKey="deflectionRate" name="Deflection %" stroke="var(--color-chart-4)" fill="var(--color-chart-4)" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <DemoDataNote />
        </Panel>

        <Panel
          title={
            view === "weekly"
              ? "Weekly operating review"
              : view === "monthly"
                ? "Monthly trend review"
                : "QBR executive value review"
          }
        >
          {view === "weekly" ? (
            <ul className="space-y-2 text-sm text-foreground/90">
              <li>• Milestone state against the validated critical path.</li>
              <li>• Open blockers and named owners with dates.</li>
              <li>• Adoption and quality signals, with data-quality notes.</li>
              <li>• Decisions needed this week.</li>
            </ul>
          ) : view === "monthly" ? (
            <ul className="space-y-2 text-sm text-foreground/90">
              <li>• Median and P75 trend with cohort stability check.</li>
              <li>• Coverage gaps between high-frequency failure modes and content.</li>
              <li>• Quality incidents, root cause state, and drift watch.</li>
              <li>• Forecast against the Year-1 outcome, with confidence.</li>
            </ul>
          ) : (
            <div className="space-y-3 text-sm text-foreground/90">
              <p>
                <span className="font-medium">Outcome:</span> {ws.customer.targetOutcome}
              </p>
              <p>
                <span className="font-medium">Evidence:</span> approved baseline, stable cohort,
                agreed timestamp definition, median and tail reported together.
              </p>
              <p>
                <span className="font-medium">Monetization:</span> only with a Finance-approved
                loaded labor rate applied to measured hours saved.
              </p>
              <ul className="space-y-1">
                {SUCCESS_DEFINITION.map((s) => (
                  <li key={s.label}>
                    • <span className="font-medium">{s.label}:</span> {s.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Value events">
        <ol className="relative space-y-3 border-l border-border pl-5">
          {ws.valueEvents.map((v) => (
            <li key={v.id} className="relative">
              <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary" />
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{v.date}</span>
                <span className="text-sm font-medium text-foreground">{v.title}</span>
                <ProvenanceTag value={v.provenance} short />
              </div>
              <p className="text-xs text-muted-foreground">{v.detail}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}