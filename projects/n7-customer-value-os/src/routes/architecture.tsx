import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/n7/AppHeader";
import { Callout, Panel, ProvenanceLegend, SectionHeader } from "@/components/n7/primitives";
import { AUTOMATION_CONCEPTS, HUMAN_IN_THE_LOOP, ORG } from "@/lib/n7/seed";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture & Assumptions — N7 Customer Value OS" },
      {
        name: "description",
        content:
          "Case facts vs assumptions, the reusable data model, provider abstraction, mock vs future integrations, credential boundaries and human approval gates.",
      },
      { property: "og:title", content: "Architecture & Assumptions — N7 Customer Value OS" },
      {
        property: "og:description",
        content: "What is local and deterministic, what would be external, and what must be validated before production use.",
      },
    ],
  }),
  component: Architecture,
});

const ENTITIES = [
  "Organization", "Customer", "Stakeholder", "Outcome", "KPI", "MetricContract",
  "Implementation", "Milestone", "Dependency", "Integration", "EnvironmentNode",
  "EnvironmentEdge", "Risk", "Decision", "RACIEntry", "AdoptionSignal", "Incident",
  "ValueEvent", "ExecutiveBrief", "CallPrep", "SkillPack", "AgentProfile",
  "DocumentSource", "GoldenQuery", "ReadinessGate", "EscalationPacket",
  "CustomerMessage", "Assumption",
];

function Architecture() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[1100px] px-5 py-8">
        <SectionHeader
          eyebrow={ORG.name}
          title="Architecture & Assumptions"
          description="What this prototype is, what it is not, and what would need validation inside Neuron7 before any production use."
        />

        <div className="space-y-6">
          <Callout tone="warning" title="Status of this build">
            This is a candidate-built concept prototype for a Neuron7 Customer Success case study. It
            is not an official Neuron7 product. No Neuron7 internal APIs, data, policies or product
            capabilities are represented. The supplied case is treated as authoritative and is not
            corrected against public product information.
          </Callout>

          <Panel title="Provenance model" subtitle="Every statement in the product carries one of these labels.">
            <ProvenanceLegend />
            <ul className="mt-4 space-y-2 text-sm text-foreground/90">
              <li>
                <span className="font-medium">Case fact</span> — supplied in the exercise brief and treated as authoritative.
              </li>
              <li>
                <span className="font-medium">Working assumption</span> — my inference, with a validation path and an owner.
              </li>
              <li>
                <span className="font-medium">Illustrative / demo data</span> — invented for demonstration. Never presented as customer data.
              </li>
              <li>
                <span className="font-medium">Human decision</span> — a judgment call, with rationale and rejected alternatives.
              </li>
              <li>
                <span className="font-medium">Automated signal</span> — something a pipeline could surface. No live integration exists here.
              </li>
            </ul>
          </Panel>

          <Panel title="Reusable data model" subtitle="Customer #1 is seeded data, not a special case in the type system.">
            <div className="flex flex-wrap gap-1.5">
              {ENTITIES.map((e) => (
                <span key={e} className="rounded-md border border-border bg-secondary/60 px-2 py-1 font-mono text-xs">
                  {e}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              The Add Customer wizard builds a full workspace from the same entities, which is how the
              product demonstrates that it is an operating system rather than a single case study.
            </p>
          </Panel>

          <Panel title="Where this sits" subtitle="An orchestration and value layer, not a CRM replacement.">
            <ul className="space-y-2 text-sm text-foreground/90">
              <li>• CRM remains commercial and system-of-record truth.</li>
              <li>• Product telemetry remains product truth.</li>
              <li>• Engineering and workflow systems remain operational truth.</li>
              <li>• This layer holds the integrated plan, dependency state, decisions, evidence and value narrative.</li>
            </ul>
          </Panel>

          <Panel title="Provider abstraction: demo vs controlPlane">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-border p-4">
                <div className="label-caps">demo (active)</div>
                <p className="mt-1 text-sm text-foreground/90">
                  Deterministic local behavior. Environment generation parses pasted text with fixed
                  rules, so the same input always produces the same proposal. No network calls, no
                  credentials, no third-party accounts.
                </p>
              </div>
              <div className="rounded-md border border-border p-4">
                <div className="label-caps">controlPlane (future)</div>
                <p className="mt-1 text-sm text-foreground/90">
                  Reserved for the operator's Clintware MCP / control plane. It is documented as an
                  interface only; selecting it surfaces a clear "not configured" state rather than
                  fabricating a result. No endpoints or credentials are invented here.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Security and credential boundaries">
            <ul className="space-y-2 text-sm text-foreground/90">
              <li>• No API keys, tokens or third-party credentials exist in this application.</li>
              <li>• No credentials are required to demonstrate any feature.</li>
              <li>• Any future credentialed operation runs server-side in the control plane, never in the browser.</li>
              <li>• Integration boundaries are marked in code with TODO(secure-integration-boundary).</li>
              <li>• Customer workspaces added in the wizard are stored in the browser's local storage only.</li>
            </ul>
          </Panel>

          <Panel title="Mock vs future integrations">
            <div className="grid gap-3 md:grid-cols-2">
              {AUTOMATION_CONCEPTS.map((a) => (
                <div key={a.id} className="rounded-md border border-border p-4">
                  <div className="text-sm font-semibold text-foreground">{a.title}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{a.flow}</div>
                  <div className="mt-2 text-xs text-warning">Not live in this prototype.</div>
                  <div className="mt-1 text-xs text-foreground/80">{a.human}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Human approval gates">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-secondary/60 p-4">
                <div className="label-caps">Automation may</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {HUMAN_IN_THE_LOOP.automationMay.map((x) => (
                    <li key={x}>• {x}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md bg-human/30 p-4">
                <div className="label-caps">Human required</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {HUMAN_IN_THE_LOOP.humanRequired.map((x) => (
                    <li key={x}>• {x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              The Virtual Liaison never contacts a customer and never sends a message. It drafts for a
              named human, who reviews, edits and sends under their own identity.
            </p>
          </Panel>

          <Panel title="What would need validation inside Neuron7 before production use">
            <ul className="space-y-2 text-sm text-foreground/90">
              <li>• Whether these entities map cleanly onto the real implementation and CS systems of record.</li>
              <li>• Actual connector inventory, supported authentication models and ingestion behavior.</li>
              <li>• Real telemetry availability for every leading metric shown here as illustrative.</li>
              <li>• Security review of any document handling, entitlement filtering and permission-aware search claims.</li>
              <li>• Whether the readiness gate can be enforced in the real CRM and deal-desk workflow.</li>
              <li>• Data retention, tenancy and access control for anything beyond a local prototype.</li>
            </ul>
          </Panel>
        </div>
      </main>
    </div>
  );
}