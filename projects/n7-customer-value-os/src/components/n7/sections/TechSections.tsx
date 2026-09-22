import { useMemo, useState } from "react";
import { toast } from "sonner";
import { copyText } from "@/lib/n7/clipboard";
import {
  Callout,
  DemoDataNote,
  EmptyState,
  Panel,
  ProvenanceTag,
  SectionHeader,
  StatusPill,
} from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeetingBriefDialog } from "@/components/n7/MeetingBrief";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SKILL_PACKS, TRIAGE_KEY_DIAGNOSTIC, TRIAGE_LAYERS } from "@/lib/n7/seed";

import { useN7 } from "@/lib/n7/store";
import type {
  CustomerWorkspace,
  DocumentSource,
  GoldenQuery,
  Incident,
  TriageRecord,
} from "@/lib/n7/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Documents / Knowledge                                               */
/* ------------------------------------------------------------------ */

export function Documents({ ws }: { ws: CustomerWorkspace }) {
  const { addDocument } = useN7();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    kind: "pdf" as DocumentSource["kind"],
    owner: "",
    freshness: "",
    approved: false,
    confidence: "medium" as DocumentSource["confidence"],
    systems: "",
    content: "",
  });

  function submit() {
    if (!form.title.trim()) {
      toast.error("A source needs a title");
      return;
    }
    addDocument(ws.customer.id, {
      id: `${ws.customer.id}-doc-${Date.now().toString(36)}`,
      customerId: ws.customer.id,
      title: form.title,
      kind: form.kind,
      owner: form.owner || "Unassigned",
      freshness: form.freshness || "Unknown",
      approved: form.approved,
      confidence: form.confidence,
      lastSync: new Date().toISOString().slice(0, 10),
      relevantSystems: form.systems.split(",").map((s) => s.trim()).filter(Boolean),
      content: form.content,
      provenance: "user-entered",
    });
    toast.success("Source registered", {
      description: form.approved
        ? "Approved — available to environment generation and call prep."
        : "Unapproved — excluded from generation and call prep until approved.",
    });
    setOpen(false);
    setForm({ ...form, title: "", owner: "", content: "", systems: "", approved: false });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Documents / Knowledge"
        description="Source inventory with owner, freshness, approval state, confidence and relevant systems. Only approved sources feed environment generation and call preparation."
        actions={
          <Button size="sm" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Register source"}
          </Button>
        }
      />

      {open ? (
        <Panel title="Register a source" subtitle="Capture source metadata and approved text locally. No file is uploaded.">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="dtitle">Title</Label>
              <Input id="dtitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dkind">Kind</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as DocumentSource["kind"] })}>
                <SelectTrigger id="dkind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["pdf", "architecture", "runbook", "crm-note", "kb", "call-note"] as const).map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="downer">Owner</Label>
              <Input id="downer" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dfresh">Freshness</Label>
              <Input id="dfresh" placeholder="e.g. Updated this week" value={form.freshness} onChange={(e) => setForm({ ...form, freshness: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dsys">Relevant systems (comma separated)</Label>
              <Input id="dsys" value={form.systems} onChange={(e) => setForm({ ...form, systems: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dconf">Confidence</Label>
              <Select value={form.confidence} onValueChange={(v) => setForm({ ...form, confidence: v as DocumentSource["confidence"] })}>
                <SelectTrigger id="dconf">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["low", "medium", "high"] as const).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 grid gap-1.5">
              <Label htmlFor="dcontent">Content representation</Label>
              <Textarea id="dcontent" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="dappr" checked={form.approved} onCheckedChange={(c) => setForm({ ...form, approved: !!c })} />
              <Label htmlFor="dappr" className="cursor-pointer">
                Approved for generation and call prep
              </Label>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={submit}>Register source</Button>
          </div>
        </Panel>
      ) : null}

      {ws.documents.length === 0 ? (
        <EmptyState
          title="No sources registered"
          body="Register discovery notes, architecture documents, runbooks, CRM notes, KB exports or call notes. Approval state controls what the Virtual Liaison and environment generation may use."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ws.documents.map((d) => (
            <article key={d.id} className="panel p-5">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{d.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {d.kind} · owner {d.owner} · freshness {d.freshness} · last sync {d.lastSync}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={d.approved ? "approved" : "unapproved"} />
                  <ProvenanceTag value={d.provenance} short />
                </div>
              </header>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{d.content}</p>
              <footer className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Confidence: {d.confidence}</span>
                {d.relevantSystems.map((s) => (
                  <span key={s} className="rounded-full bg-secondary px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </footer>
            </article>
          ))}
        </div>
      )}

      <Callout tone="info" title="Approval is the control">
        Environment generation and call preparation read approved sources only. Unapproved or
        low-confidence material stays visible to humans but never becomes an input to generated output.
      </Callout>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accuracy Triage                                                     */
/* ------------------------------------------------------------------ */

export function AccuracyTriage({ ws }: { ws: CustomerWorkspace }) {
  const {
    addIncident,
    updateIncident,
    addGoldenQuery,
    updateGoldenQuery,
    upsertTriageRecord,
  } = useN7();
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(ws.incidents[0]?.id ?? "");
  const [incidentForm, setIncidentForm] = useState({
    title: "", reportedSymptom: "", openedAt: new Date().toISOString().slice(0, 16),
    reportedBy: "", segment: "", severity: "medium" as NonNullable<Incident["severity"]>,
    sourceSystem: "", status: "reported" as Incident["status"], notes: "",
  });
  const [queryForm, setQueryForm] = useState({
    query: "", expected: "", sourceSystem: "", productFamily: "", version: "",
    lastResult: "not-run" as GoldenQuery["lastResult"], notes: "",
  });

  const incident = ws.incidents.find((item) => item.id === selectedIncidentId) ?? ws.incidents[0];
  const existingRecord = incident
    ? ws.triageRecords?.find((record) => record.incidentId === incident.id)
    : undefined;
  const emptyPacketFields = {
    repro: "", expected: "", actual: "", contentVersion: "", timestamps: "",
    userRole: "", blastRadius: "", suspected: "", evidence: "",
  };
  const record: TriageRecord | undefined = incident
    ? existingRecord ?? {
        id: `${incident.id}-triage`, customerId: ws.customer.id, incidentId: incident.id,
        currentLayer: 0, findings: {}, ruledOutLayers: [], startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), owner: "Unassigned", linkedGoldenQueryIds: [],
        packetFields: emptyPacketFields, provenance: "human-decision",
      }
    : undefined;
  const step = Math.min(record?.currentLayer ?? 0, TRIAGE_LAYERS.length - 1);
  const findings = record?.findings ?? {};
  const ruledOut = record?.ruledOutLayers ?? [];
  const linkedQueries = ws.goldenQueries.filter((query) => record?.linkedGoldenQueryIds.includes(query.id));
  const sapQueries = linkedQueries.filter((q) => q.sourceSystem.toLowerCase().includes("sap"));
  const sfdcQueries = linkedQueries.filter((q) => q.sourceSystem.toLowerCase().includes("salesforce"));

  const asymmetry = useMemo(
    () => sapQueries.some((q) => q.lastResult !== "pass") && sfdcQueries.every((q) => q.lastResult !== "fail"),
    [sapQueries, sfdcQueries],
  );

  function saveRecord(patch: Partial<TriageRecord>) {
    if (!record) return;
    upsertTriageRecord(ws.customer.id, { ...record, ...patch, updatedAt: new Date().toISOString() });
  }

  function createIncident() {
    if (!incidentForm.title.trim() || !incidentForm.reportedSymptom.trim()) {
      toast.error("Title and reported symptom are required");
      return;
    }
    const id = `${ws.customer.id}-inc-${Date.now().toString(36)}`;
    addIncident(ws.customer.id, {
      id, customerId: ws.customer.id, ...incidentForm, provenance: "human-decision",
    });
    setSelectedIncidentId(id);
    setIncidentOpen(false);
    toast.success("Triage case created");
  }

  function createQuery() {
    if (!queryForm.query.trim() || !queryForm.expected.trim()) {
      toast.error("Query and expected result are required");
      return;
    }
    if (editingQueryId) {
      updateGoldenQuery(ws.customer.id, editingQueryId, queryForm);
      setEditingQueryId(null);
      setQueryOpen(false);
      toast.success("Golden query updated");
      return;
    }
    const id = `${ws.customer.id}-gq-${Date.now().toString(36)}`;
    addGoldenQuery(ws.customer.id, {
      id, customerId: ws.customer.id, ...queryForm, sourceSystem: queryForm.sourceSystem || "Unknown",
      productFamily: queryForm.productFamily || "Unspecified", version: queryForm.version || "Unversioned",
      provenance: "human-decision",
    });
    if (record) saveRecord({ linkedGoldenQueryIds: [...record.linkedGoldenQueryIds, id] });
    setQueryOpen(false);
    toast.success("Golden query added");
  }

  function generatePacket() {
    if (!incident || !record) return;
    const alreadyRuledOut = ruledOut
      .map((i) => `${TRIAGE_LAYERS[i]!.step}. ${TRIAGE_LAYERS[i]!.title}${findings[String(i)] ? ` — ${findings[String(i)]}` : ""}`)
      .join("\n");
    const fields = record.packetFields;
    const generatedAt = new Date().toISOString();
    const packet = [
        "ENGINEERING ESCALATION PACKET",
        `Customer: ${ws.customer.name}`,
        `Incident: ${incident.title}`,
        `Reported symptom: ${incident.reportedSymptom}`,
        `Severity / status: ${incident.severity ?? "unknown"} / ${incident.status}`,
        `Reported by: ${incident.reportedBy || "unknown"}`,
        `Affected segment: ${incident.segment || "unknown"}`,
        "",
        `Repro steps: ${fields.repro || "Unknown"}`,
        `Linked queries: ${linkedQueries.map((q) => `${q.query} (${q.sourceSystem}, ${q.lastResult})`).join("; ") || "None linked"}`,
        `Expected: ${fields.expected || "Unknown"}`,
        `Actual: ${fields.actual || incident.reportedSymptom}`,
        `Affected source: ${incident.sourceSystem || "Unknown"}`,
        `Content version: ${fields.contentVersion || "Unknown"}`,
        `Evidence / logs: ${fields.evidence || "Not attached"}`,
        `Timestamps: ${fields.timestamps || incident.openedAt}`,
        `User / role / permissions: ${fields.userRole || "Unknown"}`,
        `Blast radius: ${fields.blastRadius || incident.segment || "Unknown"}`,
        `Suspected fault domain: ${fields.suspected || "Not yet determined"}`,
        "",
        "What CS has already ruled out:",
        alreadyRuledOut || "(none marked yet)",
        "",
        "Note: reported symptom, not a proven model failure. Root-cause conclusion remains a human decision.",
      ].join("\n");
    saveRecord({ generatedPacket: packet, packetGeneratedAt: generatedAt });
    toast.success("Escalation packet generated");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Accuracy Triage"
        description="Persistent customer incident records, evidence, and eight-layer investigation before any root-cause conclusion."
        actions={<><Button size="sm" variant="outline" onClick={() => { setEditingQueryId(null); setQueryOpen(true); }}>Add golden query</Button><Button size="sm" onClick={() => setIncidentOpen(true)}>New triage case</Button></>}
      />

      <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create triage case</DialogTitle>
            <DialogDescription>Record the reported symptom without assuming a root cause.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            {([
              ["title", "Title"], ["reportedBy", "Reported by"], ["openedAt", "Opened date / time"],
              ["segment", "Affected segment"], ["sourceSystem", "Source / system"], ["notes", "Notes"],
            ] as const).map(([key, label]) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={`inc-${key}`}>{label}</Label>
                <Input id={`inc-${key}`} type={key === "openedAt" ? "datetime-local" : "text"} value={incidentForm[key]} onChange={(e) => setIncidentForm({ ...incidentForm, [key]: e.target.value })} />
              </div>
            ))}
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="inc-symptom">Reported symptom</Label>
              <Textarea id="inc-symptom" value={incidentForm.reportedSymptom} onChange={(e) => setIncidentForm({ ...incidentForm, reportedSymptom: e.target.value })} />
            </div>
            <div className="grid gap-1.5"><Label>Severity / priority</Label><Select value={incidentForm.severity} onValueChange={(value) => setIncidentForm({ ...incidentForm, severity: value as NonNullable<Incident["severity"]> })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["low", "medium", "high", "critical"] as const).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5"><Label>Status</Label><Select value={incidentForm.status} onValueChange={(value) => setIncidentForm({ ...incidentForm, status: value as Incident["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["reported", "triage", "isolated", "resolved"] as const).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <Button onClick={createIncident}>Create triage case</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={queryOpen} onOpenChange={setQueryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingQueryId ? "Edit golden query" : "Add golden query"}</DialogTitle><DialogDescription>Add a reusable, versioned reproduction check. Linking to an incident is optional.</DialogDescription></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            {(["query", "expected", "sourceSystem", "productFamily", "version", "notes"] as const).map((key) => (
              <div key={key} className={cn("grid gap-1.5", (key === "query" || key === "expected") && "md:col-span-2")}>
                <Label htmlFor={`gq-${key}`}>{({ query: "Query", expected: "Expected result", sourceSystem: "Source system", productFamily: "Product family", version: "Version", notes: "Notes / evidence" })[key]}</Label>
                <Input id={`gq-${key}`} value={queryForm[key]} onChange={(e) => setQueryForm({ ...queryForm, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <Button onClick={createQuery}>{editingQueryId ? "Save query" : "Add golden query"}</Button>
        </DialogContent>
      </Dialog>

      {ws.incidents.length ? (
        <Panel title="Triage cases" subtitle="Select an incident to continue its saved investigation.">
          <div className="flex flex-wrap gap-2">
            {ws.incidents.map((item) => (
              <Button key={item.id} size="sm" variant={incident?.id === item.id ? "default" : "outline"} onClick={() => setSelectedIncidentId(item.id)}>
                {item.title} · {item.status} · {item.openedAt}
              </Button>
            ))}
          </div>
        </Panel>
      ) : null}

      {incident ? (
        <Callout tone="warning" title={incident.title}>
          {incident.reportedSymptom}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <StatusPill status={incident.status} />
            <span>Opened: {incident.openedAt}</span>
            <span>Segment: {incident.segment}</span>
            <ProvenanceTag value={incident.provenance} short />
            <span>Priority: {incident.severity ?? "not set"}</span>
            <Select value={incident.status} onValueChange={(status) => updateIncident(ws.customer.id, incident.id, { status: status as Incident["status"] })}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent>{(["reported", "triage", "isolated", "resolved"] as const).map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>
          </div>
        </Callout>
      ) : (
        <div className="space-y-3"><EmptyState title="No triage cases" body="Create a customer incident to begin an evidence-backed investigation. Golden queries are optional." /><Button onClick={() => setIncidentOpen(true)}>Create triage case</Button></div>
      )}

      {incident && record ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Triage wizard" subtitle={`Layer ${step + 1} of ${TRIAGE_LAYERS.length}`}>
          <div className="mb-4 grid gap-1.5"><Label htmlFor="triage-owner">Triage owner</Label><Input id="triage-owner" value={record.owner} onChange={(e) => saveRecord({ owner: e.target.value })} /></div>
          <ol className="mb-4 flex flex-wrap gap-1">
            {TRIAGE_LAYERS.map((l, i) => (
              <li key={l.step}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => saveRecord({ currentLayer: i })}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : ruledOut.includes(i)
                        ? "bg-human text-human-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.step}
                </Button>
              </li>
            ))}
          </ol>

          <h3 className="text-sm font-semibold text-foreground">
            {TRIAGE_LAYERS[step]!.step}. {TRIAGE_LAYERS[step]!.title}
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {TRIAGE_LAYERS[step]!.prompts.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>

          <div className="mt-3 grid gap-1.5">
            <Label htmlFor="finding">Finding</Label>
            <Textarea
              id="finding"
              rows={3}
              value={findings[String(step)] ?? ""}
              onChange={(e) => saveRecord({ findings: { ...findings, [String(step)]: e.target.value } })}
              placeholder="What did you observe at this layer?"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={ruledOut.includes(step) ? "default" : "outline"}
              onClick={() => saveRecord({ ruledOutLayers: ruledOut.includes(step) ? ruledOut.filter((x) => x !== step) : [...ruledOut, step] })}
            >
              {ruledOut.includes(step) ? "Marked ruled out" : "Mark ruled out"}
            </Button>
            <Button size="sm" variant="ghost" disabled={step === 0} onClick={() => saveRecord({ currentLayer: step - 1 })}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={step === TRIAGE_LAYERS.length - 1}
              onClick={() => saveRecord({ currentLayer: step + 1 })}
            >
              Next layer
            </Button>
          </div>

          {step === TRIAGE_LAYERS.length - 1 && ruledOut.length < 6 ? (
            <Callout tone="critical" title="Do not jump to the model">
              Retrieval and model behavior are examined only after the source, pipeline, configuration
              and query layers have been ruled out. {7 - ruledOut.length} earlier layers are still open.
            </Callout>
          ) : null}
        </Panel>

        <div className="space-y-4">
          <Panel title="Key diagnostic" right={<ProvenanceTag value="human-decision" short />}>
            <p className="text-sm leading-relaxed text-foreground/90">{TRIAGE_KEY_DIAGNOSTIC}</p>
            {asymmetry ? (
              <Callout tone="warning" title="Asymmetry detected in the golden query set">
                SAP queries are failing or unrun while Salesforce queries pass. Prioritize the SAP
                content chain before any general model hypothesis.
              </Callout>
            ) : null}
          </Panel>

          <Panel title="Versioned golden queries" subtitle="Add, link, and update reusable reproduction checks." right={<Button size="sm" onClick={() => { setEditingQueryId(null); setQueryOpen(true); }}>Add golden query</Button>}>
            {ws.goldenQueries.length === 0 ? (
              <EmptyState title="No golden queries yet" body="Build the representative query pack during the parallel UAT workstream." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {["Query", "Source", "Family", "Version", "Last result", "Link / edit"].map((h) => (
                        <th key={h} className="label-caps py-2 pr-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ws.goldenQueries.map((q) => (
                      <tr key={q.id} className="border-b border-border/70 align-top">
                        <td className="py-2 pr-3">
                          <div className="font-medium text-foreground">{q.query}</div>
                          <div className="text-xs text-muted-foreground">Expected: {q.expected}</div>
                        </td>
                        <td className="py-2 pr-3">{q.sourceSystem}</td>
                        <td className="py-2 pr-3">{q.productFamily}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{q.version}</td>
                       <td className="py-2 pr-2">
                          <Select value={q.lastResult} onValueChange={(value) => updateGoldenQuery(ws.customer.id, q.id, { lastResult: value as GoldenQuery["lastResult"] })}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{(["not-run", "pass", "fail"] as const).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
                          <div className="mt-1"><ProvenanceTag value={q.provenance ?? "user-entered"} short /></div>
                        </td>
                        <td className="py-2">
                          <Checkbox aria-label={`Link ${q.query}`} checked={record.linkedGoldenQueryIds.includes(q.id)} onCheckedChange={(checked) => saveRecord({ linkedGoldenQueryIds: checked ? [...record.linkedGoldenQueryIds, q.id] : record.linkedGoldenQueryIds.filter((id) => id !== q.id) })} />
                          <Button className="ml-2" size="sm" variant="ghost" onClick={() => { setEditingQueryId(q.id); setQueryForm({ query: q.query, expected: q.expected, sourceSystem: q.sourceSystem, productFamily: q.productFamily, version: q.version, lastResult: q.lastResult, notes: q.notes ?? "" }); setQueryOpen(true); }}>Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <DemoDataNote />
          </Panel>
        </div>
      </div> : null}

      {incident && record ? <Panel
        title="Engineering escalation packet generator"
        subtitle="Everything Engineering needs to start, including what CS already ruled out."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ["repro", "Repro steps"],
              ["expected", "Expected result"],
              ["actual", "Actual result"],
              ["contentVersion", "Content version"],
              ["timestamps", "Timestamps"],
              ["userRole", "User / role / permissions"],
              ["blastRadius", "Blast radius"],
              ["suspected", "Suspected fault domain"],
              ["evidence", "Screenshots / logs / evidence"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="grid gap-1.5">
              <Label htmlFor={key}>{label}</Label>
               <Input id={key} value={record.packetFields[key]} onChange={(e) => saveRecord({ packetFields: { ...record.packetFields, [key]: e.target.value } })} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={generatePacket}>Generate packet</Button>
           {record.generatedPacket ? (
            <Button
              variant="outline"
              onClick={() => {
                 void copyText(record.generatedPacket ?? "", "Packet copied");
              }}
            >
              Copy
            </Button>
          ) : null}
        </div>
         {record.packetGeneratedAt ? <span className="mt-3 block text-xs text-muted-foreground">Last generated: {new Date(record.packetGeneratedAt).toLocaleString()}</span> : null}
         {record.generatedPacket ? (
          <pre className="mt-4 max-h-96 overflow-auto rounded-md border border-border bg-surface p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
             {record.generatedPacket}
          </pre>
        ) : null}
      </Panel> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Virtual Liaison                                                     */
/* ------------------------------------------------------------------ */

const OBJECTIVES = [
  "SAP dependency and rebaseline conversation",
  "Technical deep dive on connector design",
  "SSO / RBAC readiness review",
  "ROI baseline workshop",
  "Accuracy incident review",
  "Executive value review (QBR)",
];

const OBJECTIVE_PACKS: Record<string, string[]> = {
  "SAP dependency and rebaseline conversation": ["sp-sap", "sp-cs", "sp-n7"],
  "Technical deep dive on connector design": ["sp-sap", "sp-net", "sp-n7"],
  "SSO / RBAC readiness review": ["sp-sec", "sp-sfdc", "sp-net"],
  "ROI baseline workshop": ["sp-cs", "sp-sfdc"],
  "Accuracy incident review": ["sp-sap", "sp-sfdc", "sp-n7"],
  "Executive value review (QBR)": ["sp-cs", "sp-n7"],
};

export function VirtualLiaison({ ws }: { ws: CustomerWorkspace }) {
  const [objective, setObjective] = useState<string>(OBJECTIVES[0]!);

  const [attendees, setAttendees] = useState<string[]>(ws.stakeholders.slice(0, 2).map((s) => s.id));
  const [packs, setPacks] = useState<string[]>(OBJECTIVE_PACKS[OBJECTIVES[0]!]!);
  const [brief, setBrief] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  function selectObjective(o: string) {
    setObjective(o);
    setPacks(OBJECTIVE_PACKS[o] ?? ["sp-cs"]);
  }

  const approvedDocs = ws.documents.filter((d) => d.approved);

  function buildBrief() {
    const people = ws.stakeholders.filter((s) => attendees.includes(s.id));
    const blockers = ws.dependencies.filter((d) => d.blocksGoLive && d.status !== "ready");
    const topRisks = ws.risks.filter((r) => r.status !== "closed").slice(0, 3);
    const unknowns = ws.assumptions.map((a) => a.statement);

    setBrief([
      `Objective: ${objective}`,
      `Attendees: ${people.map((p) => `${p.name} (${p.role})`).join("; ") || "none selected"}`,
      `Skill packs engaged: ${packs.map((p) => SKILL_PACKS.find((s) => s.id === p)?.name).filter(Boolean).join(", ")}`,
      `Environment: ${ws.nodes.length} nodes, ${ws.edges.length} flows. Key systems: ${ws.integrations.map((i) => i.system).join(", ") || "not yet captured"}.`,
      `Current state: ${ws.customer.stage} · ${ws.customer.headline}`,
      `Open blockers: ${blockers.map((b) => `${b.name} (${b.owner})`).join("; ") || "none"}`,
      `Top risks: ${topRisks.map((r) => r.title).join("; ") || "none open"}`,
      `Likely technical questions: ${
        objective.includes("SAP")
          ? "What exactly does the connector have to extract? How are manual revisions versioned? What does ingestion validation cover?"
          : objective.includes("SSO")
            ? "How are entitlements enforced in results? What identity attributes drive filtering?"
            : objective.includes("ROI")
              ? "Which timestamps define start and stop? What is excluded? Who owns the data?"
              : "What changed, in which segment, and what evidence isolates it?"
      }`,
      `Ownership: Engineering owns build. CS/Implementation owns dependency and communication. Customer owns access, SMEs, identity inputs and content validation. Leadership owns tradeoffs.`,
      `Evidence available: ${approvedDocs.map((d) => d.title).join("; ") || "no approved sources"}`,
      `Escalation path: CS/Implementation → Engineering Lead (technical) → Leadership (priority, exception, risk acceptance).`,
      `Known unknowns — say these out loud rather than guessing: ${unknowns.join("; ") || "none recorded"}`,
      `Value state: primary outcome is ${ws.customer.targetOutcome}. Baseline approval status: ${
        ws.kpis[0]?.baseline ?? "unknown"
      }.`,
    ]);
    toast.success("Call brief prepared", { description: "Built from approved sources and current workspace state." });
  }

  function buildDraft() {
    setDraft(
      [
        `Subject: ${objective} — follow-up`,
        "",
        "What we discovered: [summary of the confirmed finding]",
        "Business impact: [effect on the technician workflow and the Year-1 outcome]",
        "What we are doing: [parallel workstreams and the validation step in flight]",
        "Decisions needed: [named decision, named owner, date]",
        "Next checkpoint: [date and what will be shown]",
        "",
        "— Drafted by the Virtual Liaison for human review. Not sent. A named human sends it, under their own identity.",
      ].join("\n"),
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Virtual Liaison"
        description="A customer-scoped assistant that augments the human on the call. It never speaks to the customer, never sends anything, and surfaces unknowns instead of inventing answers."
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Callout tone="info" title="What it may and may not do">
          It may assemble context from approved documents, the environment map, implementation
          state, risks, incidents, KPI state and stakeholders. It may draft a message for human
          approval. It may not contact the customer, act autonomously, or represent itself as a
          person.
        </Callout>
         <Panel title="Identity and safeguards">
          <p className="text-xs leading-relaxed text-foreground/90">
            <strong>Virtual Liaison — internal copilot, not an autonomous representative.</strong>{" "}
            Every customer-facing output carries a named human approver.
          </p>
          <div className="mt-3 flex items-center gap-2">
             <span className="size-2 rounded-full bg-success" />
             <span className="text-xs font-medium text-foreground">Local workspace ready</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
             Briefs and drafts use approved workspace context. Customer-facing output always requires human review.
          </p>
          <div className="mt-3 print:hidden">
            <MeetingBriefDialog ws={ws} />
          </div>
          <p className="mt-3 rounded-md border border-dashed border-border p-2 text-[11px] leading-relaxed text-muted-foreground">
            Roadmap only: approved asynchronous handoff / message relay, gated on explicit human
            approval and identity disclosure. Not implemented — no autonomous impersonation.
          </p>
        </Panel>
      </div>


      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <Panel title="Ramp up for a call">
            <div className="grid gap-1.5">
              <Label htmlFor="obj">Meeting objective</Label>
              <Select value={objective} onValueChange={selectObjective}>
                <SelectTrigger id="obj">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <div className="label-caps mb-1">Attendees</div>
              {ws.stakeholders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No stakeholders captured for this customer.</p>
              ) : (
                <ul className="space-y-1.5">
                  {ws.stakeholders.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`att-${s.id}`}
                        checked={attendees.includes(s.id)}
                        onCheckedChange={(c) =>
                          setAttendees((a) => (c ? [...a, s.id] : a.filter((x) => x !== s.id)))
                        }
                      />
                      <label htmlFor={`att-${s.id}`} className="cursor-pointer">
                        {s.name} <span className="text-xs text-muted-foreground">· {s.role}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4">
              <div className="label-caps mb-1">Skill packs (recommended for this objective)</div>
              <div className="flex flex-wrap gap-2">
                {SKILL_PACKS.map((p) => {
                  const on = packs.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      title={`${p.scope} — limits: ${p.limits}`}
                      onClick={() => setPacks((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Additional skill packs can be added as the operating model grows.
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={buildBrief}>Ramp up for call</Button>
              <Button variant="outline" onClick={buildDraft}>
                Draft message for human approval
              </Button>
            </div>
          </Panel>

          <Panel title="Skill pack limits" subtitle="Each pack states what it cannot do.">
            <ul className="space-y-2 text-sm">
              {SKILL_PACKS.filter((p) => packs.includes(p.id)).map((p) => (
                <li key={p.id} className="rounded-md border border-border p-3">
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.scope}</div>
                  <div className="mt-1 text-xs text-warning">Limits: {p.limits}</div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Roadmap: approved asynchronous handoff">
            <p className="text-sm text-foreground/90">
              A future capability could relay an approved message asynchronously. It would require
              explicit human approval per message and clear identity disclosure to the recipient.
              Autonomous impersonation is out of scope and is not implemented.
            </p>
            <div className="mt-2">
              <ProvenanceTag value="working-assumption" />
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Call brief" subtitle="Assembled from approved sources and current workspace state.">
            {brief ? (
              <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
                {brief.map((b) => (
                  <li key={b} className="rounded-md bg-secondary/50 p-3">
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No brief yet"
                body="Choose an objective and attendees, then run “Ramp up for call” to assemble the brief."
              />
            )}
          </Panel>

          {draft ? (
            <Panel title="Draft for human approval" subtitle="Nothing is sent. A named human reviews, edits and sends.">
              <pre className="rounded-md border border-border bg-surface p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
                {draft}
              </pre>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void copyText(draft, "Draft copied for human review");
                  }}
                >
                  Copy draft
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  Discard
                </Button>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}