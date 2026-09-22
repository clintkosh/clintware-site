import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { copyText } from "@/lib/n7/clipboard";
import {
  Callout,
  EmptyState,
  MetricCard,
  Panel,
  ProvenanceTag,
  SectionHeader,
  StatusPill,
} from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GO_LIVE_GATES,
  READINESS_ROOT_CAUSE,
  READINESS_RULE,
  RED_FLAG_PHRASES,
} from "@/lib/n7/seed";
import type { CustomerWorkspace } from "@/lib/n7/types";
import { SECTIONS } from "@/lib/n7/sections";

/* ------------------------------------------------------------------ */
/* Customer Messaging                                                  */
/* ------------------------------------------------------------------ */

const FRAMEWORK = [
  ["discovered", "1. What we discovered"],
  ["impact", "2. Business impact"],
  ["actions", "3. What we are doing"],
  ["decisions", "4. Decisions needed"],
  ["checkpoint", "5. Next checkpoint"],
] as const;

export function Messaging({ ws }: { ws: CustomerWorkspace }) {
  const approved = ws.messages.find((m) => m.status === "approved-example");
  const [form, setForm] = useState({
    discovered: approved?.discovered ?? "",
    impact: approved?.impact ?? "",
    actions: approved?.actions ?? "",
    decisions: approved?.decisions ?? "",
    checkpoint: approved?.checkpoint ?? "",
  });

  const composed = FRAMEWORK.map(([key, label]) => `${label}\n${form[key] || "—"}`).join("\n\n");
  const flagged = RED_FLAG_PHRASES.filter((p) =>
    composed.toLowerCase().includes(p.toLowerCase().replace("we'll", "we'll")),
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Customer Messaging"
        description="A five-part framework: what we discovered, business impact, what we are doing, decisions needed, next checkpoint."
      />

      {approved ? (
        <Panel
          title={`Approved example — ${approved.title}`}
          subtitle={`Audience: ${approved.audience}`}
          right={<ProvenanceTag value={approved.provenance} />}
        >
          <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
            {FRAMEWORK.map(([key, label]) => (
              <p key={key}>
                <span className="label-caps block">{label}</span>
                {approved[key]}
              </p>
            ))}
          </div>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setForm({
                  discovered: approved.discovered,
                  impact: approved.impact,
                  actions: approved.actions,
                  decisions: approved.decisions,
                  checkpoint: approved.checkpoint,
                });
                toast("Approved example loaded into the composer");
              }}
            >
              Load into composer
            </Button>
          </div>
        </Panel>
      ) : (
        <EmptyState
          title="No approved message yet"
          body="Compose the first customer message using the five-part framework below. Nothing is sent without human review."
        />
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Composer">
          <div className="space-y-3">
            {FRAMEWORK.map(([key, label]) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Textarea
                  id={key}
                  rows={3}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Preview" subtitle="Draft only. A named human reviews and sends.">
            <pre className="rounded-md border border-border bg-surface p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
              {composed}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void copyText(composed, "Draft copied");
                }}
              >
                Copy draft
              </Button>
            </div>
          </Panel>

          <Panel title="Language check">
            {flagged.length ? (
              <Callout tone="critical" title="Red-flag phrasing detected">
                <ul className="space-y-1">
                  {flagged.map((f) => (
                    <li key={f}>• “{f}” — remove unless evidence supports the statement.</li>
                  ))}
                </ul>
              </Callout>
            ) : (
              <p className="text-sm text-success">No red-flag phrasing detected in the current draft.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {RED_FLAG_PHRASES.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs"
                >
                  “{p}”
                </span>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Readiness Gate                                                      */
/* ------------------------------------------------------------------ */

export function ReadinessGate({ ws }: { ws: CustomerWorkspace }) {
  const [connector, setConnector] = useState<"prebuilt" | "custom" | "unknown">("unknown");
  const [reviewed, setReviewed] = useState(false);
  const [exception, setException] = useState("");

  const blocked = connector !== "prebuilt" && !reviewed && exception.trim().length === 0;
  const groups = Array.from(new Set(ws.readiness.map((f) => f.group)));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Reusable system control"
        title="Readiness Gate"
        description="The presales control that stops this failure from repeating on the next customer."
      />

      <Callout tone="warning" title="Root cause, stated without blame">
        {READINESS_ROOT_CAUSE} This is a system defect, not a Sales defect.
      </Callout>

      <Panel title="Gate simulator" subtitle="Change the connector status and see whether a customer-committed date is permitted.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Connector status</Label>
            <div className="flex flex-wrap gap-2">
              {(["prebuilt", "custom", "unknown"] as const).map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={connector === c ? "default" : "outline"}
                  onClick={() => setConnector(c)}
                  className="capitalize"
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Solution / Engineering review</Label>
            <Button
              size="sm"
              variant={reviewed ? "default" : "outline"}
              onClick={() => setReviewed((r) => !r)}
              className="w-fit"
            >
              {reviewed ? "Review complete" : "Not reviewed"}
            </Button>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="exc">Documented exception approval</Label>
            <Input id="exc" placeholder="Approver and rationale" value={exception} onChange={(e) => setException(e.target.value)} />
          </div>
        </div>

        <div className="mt-4">
          {blocked ? (
            <Callout tone="critical" title="Customer-committed date blocked">
              {READINESS_RULE}
            </Callout>
          ) : (
            <Callout tone="success" title="Date may be committed">
              {connector === "prebuilt"
                ? "Prebuilt connector: no additional review required by this control."
                : reviewed
                  ? "Engineering review complete. Commit the date with the documented confidence note."
                  : `Exception approved: ${exception}. The exception is recorded in the decision log.`}
            </Callout>
          )}
        </div>
      </Panel>

      <Panel title="Required fields" subtitle="Collected before a customer-committed date exists.">
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g} className="rounded-md border border-border p-4">
              <div className="label-caps mb-2">{g}</div>
              <ul className="space-y-2 text-sm">
                {ws.readiness
                  .filter((f) => f.group === g)
                  .map((f) => (
                    <li key={f.id} className="flex items-start justify-between gap-3">
                      <span>
                        <span className="font-medium text-foreground">{f.label}</span>
                        <span className="block text-xs text-muted-foreground">{f.value}</span>
                      </span>
                      {f.blocking ? <StatusPill status="blocking" /> : null}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Go-live acceptance gates" subtitle="Applies to every customer, not just this one.">
        <ul className="grid gap-2 md:grid-cols-2">
          {GO_LIVE_GATES.map((g) => (
            <li key={g.label} className="rounded-md border border-border p-3">
              <div className="text-sm font-medium text-foreground">{g.label}</div>
              <div className="text-xs text-muted-foreground">{g.detail}</div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Evidence / Artifacts                                                */
/* ------------------------------------------------------------------ */

export function Evidence({ ws }: { ws: CustomerWorkspace }) {
  const counts = [
    { label: "Milestones", value: ws.milestones.length, section: "implementation" },
    { label: "Dependencies", value: ws.dependencies.length, section: "critical-path" },
    { label: "Open risks", value: ws.risks.filter((r) => r.status !== "closed").length, section: "risks-decisions" },
    { label: "Decisions logged", value: ws.decisions.length, section: "risks-decisions" },
    { label: "RACI rows", value: ws.raci.length, section: "raci" },
    { label: "Environment nodes", value: ws.nodes.length, section: "environment" },
    { label: "Approved sources", value: ws.documents.filter((d) => d.approved).length, section: "documents" },
    { label: "Metric contracts", value: ws.kpis.length, section: "kpi-contract" },
    { label: "Golden queries", value: ws.goldenQueries.length, section: "accuracy-triage" },
    { label: "Readiness fields", value: ws.readiness.length, section: "readiness-gate" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Evidence / Artifacts"
        description="Every artifact behind the position, with a direct link to open it under questioning."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {counts.map((c) => (
          <Link
            key={c.label}
            to="/customers/$customerId/$section"
            params={{ customerId: ws.customer.id, section: c.section }}
          >
            <MetricCard label={c.label} value={String(c.value)} note="Open artifact" />
          </Link>
        ))}
      </div>

      <Panel title="Artifact index">
        <ul className="grid gap-2 md:grid-cols-2">
          {SECTIONS.filter((s) => s.slug !== "evidence").map((s) => (
            <li key={s.slug}>
              <Link
                to="/customers/$customerId/$section"
                params={{ customerId: ws.customer.id, section: s.slug }}
                className="flex items-start justify-between gap-3 rounded-md border border-border p-3 transition-colors hover:bg-secondary/60"
              >
                <span>
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.blurb}</span>
                </span>
                <span className="label-caps">{s.group}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Assumption register" subtitle="Working assumptions with a validation path and a named owner.">
        {ws.assumptions.length === 0 ? (
          <EmptyState title="No assumptions recorded" body="Record every working assumption with how it gets validated and who owns it." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Assumption", "Validation path", "Owner"].map((h) => (
                    <th key={h} className="label-caps py-2 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ws.assumptions.map((a) => (
                  <tr key={a.id} className="border-b border-border/70 align-top">
                    <td className="py-3 pr-4 text-foreground">{a.statement}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{a.validationPath}</td>
                    <td className="py-3 text-muted-foreground">{a.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Integration inventory">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["System", "Purpose", "Connector", "Auth", "Owner", "Blocks go-live"].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.integrations.map((i) => (
                <tr key={i.id} className="border-b border-border/70 align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">{i.system}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{i.purpose}</td>
                  <td className="py-3 pr-4">
                    <StatusPill status={i.connectorStatus} />
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{i.authModel}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{i.owner}</td>
                  <td className="py-3">{i.blocksGoLive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}