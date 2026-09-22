import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardCopy, FileDown, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, Panel, ProvenanceLegend, SectionHeader } from "@/components/n7/primitives";
import { copyText } from "@/lib/n7/clipboard";
import {
  MEETING_TYPES,
  buildMeetingBrief,
  briefToText,
  snapshotOf,
  type BriefDoc,
  type MeetingBriefInput,
} from "@/lib/n7/meeting";
import { invokeN7AI } from "@/lib/n7/server-api";
import { useN7 } from "@/lib/n7/store";
import type { CustomerWorkspace, MeetingType } from "@/lib/n7/types";
import { cn } from "@/lib/utils";

const OBJECTIVES = [
  "Review progress, blockers, decisions and next milestones",
  "Validate the implementation plan and dependency position",
  "Agree the ROI baseline and metric definition",
  "Review an issue and agree the triage path",
  "Executive value review against the agreed outcome",
  "Go / no-go readiness review",
];

type GenerationMode = "local" | "control-plane";

function asciiPdfText(value: string) {
  return value
    .replace(/[—–]/g, "-")
    .replace(/→/g, "->")
    .replace(/·/g, " | ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

async function downloadBriefPdf(doc: BriefDoc) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 44;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usable = pageWidth - margin * 2;
  const lineHeight = 13;
  let y = margin;

  const addLine = (line: string, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(bold ? 12 : 9.5);
    const wrapped = pdf.splitTextToSize(asciiPdfText(line), usable) as string[];
    for (const part of wrapped.length ? wrapped : [""]) {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(part, margin, y);
      y += lineHeight;
    }
  };

  addLine("N7 Customer Value OS - Pre-call Summary", true);
  addLine(doc.customerName, true);
  addLine(`${doc.meetingLabel} | ${doc.date}`);
  addLine(`Objective: ${doc.objective}`);
  addLine(`Generated: ${doc.generatedAt}`);
  y += 6;

  for (const raw of briefToText(doc).split("\n")) {
    const line = raw.trimEnd();
    const heading =
      Boolean(line) &&
      line === line.toUpperCase() &&
      !line.startsWith("-") &&
      !/^\d+\./.test(line);
    addLine(line, heading);
    if (!line) y += 3;
  }

  const safeName = doc.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  pdf.save(`${safeName || "customer"}-${doc.date}-pre-call-summary.pdf`);
}

function MeetingPrepComposer({
  ws,
  autoGenerate = false,
}: {
  ws: CustomerWorkspace;
  autoGenerate?: boolean;
}) {
  const {
    audience,
    recordCallPrep,
    recordMeeting,
    lastMeeting,
    lastCallPrep,
    addMilestone,
  } = useN7();

  const [objective, setObjective] = useState(OBJECTIVES[0]!);
  const [meetingType, setMeetingType] = useState<MeetingType>("weekly");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendeeIds, setAttendeeIds] = useState<string[]>(ws.stakeholders.slice(0, 3).map((s) => s.id));
  const [sourceIds, setSourceIds] = useState<string[]>(ws.documents.filter((d) => d.approved).map((d) => d.id));
  const [doc, setDoc] = useState<BriefDoc | null>(null);
  const [mode, setMode] = useState<GenerationMode>("local");
  const [busy, setBusy] = useState(false);

  const last = useMemo(() => lastMeeting(ws.customer.id), [lastMeeting, ws.customer.id]);
  const previousPrep = useMemo(() => lastCallPrep(ws.customer.id), [lastCallPrep, ws.customer.id]);

  const buildCurrent = useCallback(
    async (withAI: boolean) => {
      const input: MeetingBriefInput = {
        objective,
        meetingType,
        date,
        attendeeIds,
        audience,
        sourceIds,
      };
      const local = buildMeetingBrief(ws, input, last);
      let built = local;
      let generationMode: GenerationMode = "local";

      if (withAI) {
        try {
          const approvedSources = ws.documents
            .filter((d) => d.approved && sourceIds.includes(d.id))
            .map((d) => ({
              title: d.title,
              owner: d.owner,
              content: (d.content || "").slice(0, 7000),
            }));

          const result: any = await invokeN7AI({
            data: {
              task: "meeting-prep",
              prompt:
                "Create a concise internal pre-call synthesis using ONLY the supplied workspace and approved-source context. Do not invent customer facts, names, dates, metrics, owners, commitments, technical details, or conclusions. Explicitly label unknowns. Focus on what changed, blockers, decisions needed, next milestones, and questions to ask. Keep it under 250 words.",
              context: {
                deterministicBrief: briefToText(local),
                approvedSources,
              },
            },
          });

          if (result?.available && typeof result.text === "string" && result.text.trim()) {
            built = {
              ...local,
              blocks: [
                {
                  heading: "Control Plane synthesis",
                  items: [result.text.trim()],
                  internal: true,
                },
                ...local.blocks,
              ],
            };
            generationMode = "control-plane";
          }
        } catch (error) {
          console.warn("N7 AI synthesis unavailable; deterministic brief retained.", error);
        }
      }

      setDoc(built);
      setMode(generationMode);
      return { built, generationMode };
    },
    [audience, attendeeIds, date, last, meetingType, objective, sourceIds, ws],
  );

  useEffect(() => {
    if (!autoGenerate) return;
    void buildCurrent(false);
  }, [autoGenerate, buildCurrent]);

  async function generate(withAI: boolean) {
    setBusy(true);
    try {
      const result = await buildCurrent(withAI);
      toast.success(withAI && result.generationMode === "control-plane" ? "Meeting prep refreshed with Clintware AI" : "Meeting prep refreshed");
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function preparePdf() {
    setBusy(true);
    try {
      const { built, generationMode } = await buildCurrent(true);
      await downloadBriefPdf(built);
      recordCallPrep(ws.customer.id, {
        id: `prep-${Date.now().toString(36)}`,
        customerId: ws.customer.id,
        date,
        type: meetingType,
        objective,
        attendeeIds,
        sourceIds,
        generatedAt: new Date().toISOString(),
        generationMode,
        briefText: briefToText(built),
      });
      toast.success("Pre-call PDF prepared", {
        description: "The call pack was generated from current workspace data and approved sources, then saved to prep history.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the pre-call PDF.");
    } finally {
      setBusy(false);
    }
  }

  function recordCheckpoint() {
    recordMeeting(ws.customer.id, {
      id: `mtg-${Date.now().toString(36)}`,
      customerId: ws.customer.id,
      date,
      type: meetingType,
      objective,
      attendeeIds,
      recordedAt: new Date().toISOString(),
      snapshot: snapshotOf(ws),
    });
    toast.success("Meeting checkpoint recorded", {
      description: "The next pre-call brief will compare current state with this checkpoint.",
    });
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Call details"
        subtitle="The preview updates automatically from current workspace state. Use Prepare call PDF for a fresh one-click call pack."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="mb-obj">Meeting objective</Label>
            <Input
              id="mb-obj"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What needs to be accomplished on this call?"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mb-type">Cadence / type</Label>
            <select
              id="mb-type"
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value as MeetingType)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {MEETING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mb-date">Meeting date</Label>
            <Input id="mb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Generation</span>
            <p className="text-xs text-muted-foreground">
              Deterministic workspace summary always works. Clintware Control Plane AI is used for synthesis when available.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Attendees">
          {ws.stakeholders.length ? (
            <div className="grid gap-1.5">
              {ws.stakeholders.map((s) => (
                <label key={s.id} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={attendeeIds.includes(s.id)}
                    onChange={() =>
                      setAttendeeIds((ids) =>
                        ids.includes(s.id) ? ids.filter((i) => i !== s.id) : [...ids, s.id],
                      )
                    }
                  />
                  <span>{s.name} <span className="text-muted-foreground">- {s.role}</span></span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No stakeholders have been entered for this customer.</p>
          )}
        </Panel>

        <Panel title="Approved sources" subtitle="Only approved source content can influence the call pack.">
          {ws.documents.filter((d) => d.approved).length ? (
            <div className="grid gap-1.5">
              {ws.documents.filter((d) => d.approved).map((d) => (
                <label key={d.id} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={sourceIds.includes(d.id)}
                    onChange={() =>
                      setSourceIds((ids) =>
                        ids.includes(d.id) ? ids.filter((i) => i !== d.id) : [...ids, d.id],
                      )
                    }
                  />
                  <span>{d.title}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No approved source documents. The prep uses workspace data only.</p>
          )}
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button onClick={() => void preparePdf()} disabled={busy}>
          <FileDown className="mr-1.5 size-3.5" />
          {busy ? "Preparing..." : "Prepare call PDF"}
        </Button>
        <Button variant="outline" onClick={() => void generate(true)} disabled={busy}>
          <Sparkles className="mr-1.5 size-3.5" /> Refresh with AI
        </Button>
        <Button variant="outline" onClick={() => void generate(false)} disabled={busy}>
          <RefreshCw className="mr-1.5 size-3.5" /> Refresh locally
        </Button>
        {doc ? (
          <Button variant="outline" onClick={() => void copyText(briefToText(doc), "Brief copied")}>
            <ClipboardCopy className="mr-1.5 size-3.5" /> Copy
          </Button>
        ) : null}
        <Button variant="ghost" onClick={recordCheckpoint}>Mark call completed</Button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>Preview source: {mode === "control-plane" ? "Clintware Control Plane + workspace" : "workspace"}</span>
        <span>{last ? `Last completed call: ${last.date}` : "No completed call checkpoint yet"}</span>
        <span>{previousPrep ? `Last call PDF: ${previousPrep.date}` : "No call PDF prepared yet"}</span>
      </div>

      {doc ? (
        <BriefView
          doc={doc}
          generationMode={mode}
          onPull={(title) => {
            addMilestone(ws.customer.id, {
              id: `${ws.customer.id}-ms-${Date.now().toString(36)}`,
              customerId: ws.customer.id,
              week: "Now",
              title,
              detail: "Pulled forward from the pre-call quick-win list. Human decision.",
              track: "parallel",
              owner: "CS / Implementation",
              status: "planned",
              provenance: "human-decision",
            });
            toast.success("Added to the current plan");
          }}
        />
      ) : (
        <EmptyState
          title="Preparing current call context"
          body="This page automatically builds a current preview from the workspace. No customer detail is invented."
        />
      )}

      {(ws.callPreps ?? []).length ? (
        <Panel title="Recent call packs" subtitle="Prepared summaries are retained with the shared customer workspace.">
          <div className="space-y-2">
            {(ws.callPreps ?? []).slice(-5).reverse().map((prep) => (
              <div key={prep.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-xs">
                <div>
                  <div className="font-medium text-foreground">{prep.date} - {prep.objective}</div>
                  <div className="text-muted-foreground">{prep.type} | {prep.generationMode}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void copyText(prep.briefText, "Saved call pack copied")}>
                  Copy
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

export function MeetingPrepPage({ ws }: { ws: CustomerWorkspace }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Meeting Prep"
        description="Current call context, changes since the last checkpoint, decisions, next milestones, approved evidence, and a one-click pre-call PDF."
      />
      <MeetingPrepComposer ws={ws} autoGenerate />
    </div>
  );
}

export function MeetingBriefDialog({
  ws,
  trigger,
}: {
  ws: CustomerWorkspace;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <CalendarClock className="mr-1.5 size-3.5" /> Meeting prep
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meeting prep</DialogTitle>
          <DialogDescription>Current workspace context with approved-source gating and one-click PDF generation.</DialogDescription>
        </DialogHeader>
        <MeetingPrepComposer ws={ws} autoGenerate />
      </DialogContent>
    </Dialog>
  );
}

function BriefView({
  doc,
  generationMode,
  onPull,
}: {
  doc: BriefDoc;
  generationMode: GenerationMode;
  onPull: (title: string) => void;
}) {
  return (
    <article id="brief-print" className="space-y-5 text-sm">
      <header className="rounded-lg border border-border bg-secondary/50 p-5 print:bg-white">
        <div className="label-caps">Pre-call summary - Customer Value OS</div>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{doc.customerName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{doc.meetingLabel} - {doc.date}</p>
        <p className="mt-2 text-sm text-foreground/90"><strong>Objective:</strong> {doc.objective}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Generated {doc.generatedAt} - {generationMode === "control-plane" ? "Clintware Control Plane synthesis + deterministic workspace facts" : "deterministic workspace facts"}
        </p>
        <ProvenanceLegend className="mt-3" />
      </header>

      <Block heading="Customer-safe status">
        <p className="leading-relaxed text-foreground/90">{doc.customerSafeStatus}</p>
      </Block>

      {doc.delta.length ? (
        <Block heading="What changed since the last completed call">
          <ul className="space-y-3">
            {doc.delta.map((d) => (
              <li key={d.title} className="rounded-md border border-border p-3">
                <div className="font-medium text-foreground">{d.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">Why: {d.why}</p>
                <p className="text-xs text-muted-foreground">Impact: {d.impact}</p>
                <p className="text-xs text-muted-foreground">Decision: {d.decision}</p>
              </li>
            ))}
          </ul>
        </Block>
      ) : (
        <Block heading="No material change">
          <p className="mb-3 text-xs text-muted-foreground">
            The system does not manufacture progress. Safe pull-forward work is listed separately.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {doc.quickWins.slice(0, 4).map((q) => (
              <li key={q.id} className="rounded-md border border-border p-3">
                <div className="font-medium text-foreground">{q.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{q.whyNow}</p>
                <div className="mt-2 flex items-center justify-between gap-2 print:hidden">
                  <span className="text-[11px] text-muted-foreground">{q.owner} | {q.effort} effort</span>
                  <Button size="sm" variant="outline" onClick={() => onPull(q.title)}>Pull into plan</Button>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {doc.blocks.map((b) => (
        <Block key={b.heading} heading={b.heading} internal={b.internal}>
          <ul className="space-y-1.5">
            {b.items.filter(Boolean).map((item, n) => (
              <li key={n} className="leading-relaxed text-foreground/90">• {item}</li>
            ))}
          </ul>
        </Block>
      ))}

      <div className="grid gap-5 md:grid-cols-2">
        <Block heading="Agenda">
          <ol className="list-decimal space-y-1 pl-5">{doc.agenda.map((a) => <li key={a}>{a}</li>)}</ol>
        </Block>
        <Block heading="Questions to ask">
          <ul className="space-y-1">{doc.questions.map((q) => <li key={q}>• {q}</li>)}</ul>
        </Block>
        <Block heading="Evidence / files to have open">
          <ul className="space-y-1">{doc.artifacts.map((a) => <li key={a}>• {a}</li>)}</ul>
        </Block>
      </div>
    </article>
  );
}

function Block({
  heading,
  internal,
  children,
}: {
  heading: string;
  internal?: boolean | undefined;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border p-4", internal ? "border-dashed border-warning/60 bg-assumption/25" : "border-border")}>
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        {heading}
        {internal ? (
          <span className="ml-2 rounded-full bg-assumption px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-assumption-foreground">
            Internal only
          </span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}
