import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/n7/AppHeader";
import { AddCustomerWizard } from "@/components/n7/AddCustomerWizard";
import { Callout, KeyQuote, MetricCard, Panel, ProvenanceLegend, StatusPill } from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import { OPERATING_THESIS, ORG, FINAL_POSITIONING } from "@/lib/n7/seed";
import { useN7 } from "@/lib/n7/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "N7 Customer Value OS — Customer Portfolio" },
      {
        name: "description",
        content:
          "Multi-customer value operating console: outcome, health, stage, risk and next executive touch for every implementation.",
      },
      { property: "og:title", content: "N7 Customer Value OS — Customer Portfolio" },
      {
        property: "og:description",
        content: "Turn what was sold into an implemented, adopted, measurable business outcome.",
      },
    ],
  }),
  component: Portfolio,
});

const HEALTH_TONE: Record<string, string> = {
  "on-track": "text-success",
  watch: "text-warning",
  "at-risk": "text-critical",
  critical: "text-critical",
};

function Portfolio() {
  const { workspaces } = useN7();

  const atRisk = workspaces.filter((w) => w.customer.health === "at-risk" || w.customer.health === "critical");
  const blockers = workspaces.flatMap((w) => w.dependencies.filter((d) => d.blocksGoLive && d.status === "blocked"));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader right={<AddCustomerWizard />} />

      <main className="mx-auto max-w-[1400px] px-5 py-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <div className="label-caps">{ORG.name} · Customer Value Operating System</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Turn what was sold into an implemented, adopted, measurable outcome.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A reusable operating layer across customers: outcome, critical path, governance,
              evidence and value proof. It sits above the systems of record — CRM stays commercial
              truth, product telemetry stays product truth, engineering systems stay operational
              truth.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link
                  to="/customers/$customerId/$section"
                  params={{ customerId: workspaces[0]!.customer.id, section: "executive-summary" }}
                >
                   Open customer workspace
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/present/$customerId" params={{ customerId: workspaces[0]!.customer.id }}>
                  Presentation mode
                </Link>
              </Button>
            </div>
          </div>
          <KeyQuote>{OPERATING_THESIS}</KeyQuote>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Customers" value={String(workspaces.length)} note="Reusable workspaces" />
          <MetricCard
            label="At risk"
            value={String(atRisk.length)}
            tone={atRisk.length ? "critical" : "success"}
            note="Health requiring an executive decision"
          />
          <MetricCard
            label="Go-live blockers"
            value={String(blockers.length)}
            tone={blockers.length ? "warning" : "success"}
            note="Dependencies blocking formal go-live"
          />
          <MetricCard
            label="Judgment hierarchy"
            value="Human first"
            note="Judgment → operating model → evidence → automation"
          />
        </div>

        <Panel
          title="Customer portfolio"
          subtitle="Health, stage, target outcome, open risk, next milestone and next executive touch."
          right={<ProvenanceLegend className="hidden xl:flex" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Customer", "Stage", "Health", "Target outcome", "Open risks", "Next milestone", "Next exec touch", ""].map(
                    (h) => (
                      <th key={h} className="label-caps py-2 pr-4 font-semibold">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {workspaces.map((w) => (
                  <tr key={w.customer.id} className="border-b border-border/70 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">{w.customer.name}</div>
                      <div className="text-xs text-muted-foreground">{w.customer.industry}</div>
                    </td>
                    <td className="py-3 pr-4 capitalize">{w.customer.stage}</td>
                    <td className={`py-3 pr-4 font-medium capitalize ${HEALTH_TONE[w.customer.health]}`}>
                      {w.customer.health.replace("-", " ")}
                    </td>
                    <td className="max-w-[240px] py-3 pr-4 text-muted-foreground">
                      {w.customer.targetOutcome}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-1">
                        {w.risks.filter((r) => r.status !== "closed").slice(0, 2).map((r) => (
                          <StatusPill key={r.id} status={`${r.impact} impact`} />
                        ))}
                        <span className="text-xs text-muted-foreground">
                          {w.risks.filter((r) => r.status !== "closed").length} open
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[220px] py-3 pr-4 text-muted-foreground">
                      {w.customer.nextMilestone}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{w.customer.nextExecutiveTouch}</td>
                    <td className="py-3">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/customers/$customerId/$section"
                          params={{ customerId: w.customer.id, section: "executive-summary" }}
                        >
                          Open
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {workspaces.length === 1 ? (
            <Callout tone="info" title="Prove it is a system, not a slide">
              Add a second customer with the wizard. The same entities, gates, RAID structure,
              metric contract and readiness control are applied automatically to the new workspace.
            </Callout>
          ) : null}
        </Panel>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Panel title="Positioning">
            <p className="text-sm leading-relaxed text-foreground/90">{FINAL_POSITIONING}</p>
          </Panel>
          <Panel title="Operating controls">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Provenance, human approval gates, and source freshness keep plans and customer-facing work evidence-backed.
            </p>
          </Panel>
        </div>
      </main>
    </div>
  );
}