import { useMemo, useState } from "react";
import { CalendarClock, ClipboardCopy, FileDown, Sparkles } from "lucide-react";
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
import { ProvenanceLegend } from "@/components/n7/primitives";
import { copyText } from "@/lib/n7/clipboard";
import {
  MEETING_TYPES,
  buildMeetingBrief,
  briefToText,
  snapshotOf,
  type BriefDoc,
  type MeetingBriefInput,
} from "@/lib/n7/meeting";
import { useN7 } from "@/lib/n7/store";
import type { CustomerWorkspace, MeetingType } from "@/lib/n7/types";
import { cn } from "@/lib/utils";

const OBJECTIVES = [
  "Reset the plan with evidence and agree the dependency position",
  "Validate the engineering estimate and the planning boundary",
  "Agree the ROI baseline and the metric contract",
  "Review an accuracy report and agree the triage path",
  "Executive value review against the committed outcome",
  "Go / no-go readiness review",
];

export function MeetingBriefDialog({
  ws,
  trigger,
}: {
  ws: CustomerWorkspace;
  trigger?: React.ReactNode;
}) {
  const { audience, recordMeeting, lastMeeting, addMilestone } = useN7();
  const [open, setOpen] = useState(false);
  const [objective, setObjective] = useState(OBJECTIVES[0]!);
  const [meetingType, setMeetingType] = useState<MeetingType>("weekly");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    ws.stakeholders.slice(0, 3).map((s) => s.id),
  );
  const [sourceIds, setSourceIds] = useState<string[]>(
    ws.documents.filter((d) => d.approved).map((d) => d.id),
  );
  const [doc, setDoc] = useState<BriefDoc | null>(null);
  const [busy, setBusy] = useState(false);

  const last = useMemo(() => lastMeeting(ws.customer.id), [lastMeeting, ws.customer.id]);

  function generate() {
    setBusy(true);
    const input: MeetingBriefInput = {
      objective,
      meetingType,
      date,
      attendeeIds,
      audience,
      sourceIds,
    };
    try {
      const built = buildMeetingBrief(ws, input, last);
      setDoc(built);
      toast.success("Meeting brief generated", {
        description: "Built locally from current workspace state. No external service was called.",
      });
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
    toast.success("Checkpoint recorded", {
      description: "The next brief will show what changed since this moment.",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <CalendarClock className="mr-1.5 size-3.5" /> Meeting brief
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate meeting brief</DialogTitle>
          <DialogDescription>
             Synthesised locally from the current workspace and approved sources.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="mb-obj">Meeting objective</Label>
            <select
              id="mb-obj"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
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
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mb-date">Meeting date</Label>
            <Input id="mb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Audience</span>
            <p className="text-xs text-muted-foreground">
              Following the global toggle: <strong className="capitalize">{audience}</strong>
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="rounded-md border border-border p-3">
            <legend className="label-caps px-1">Attendees</legend>
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
                    <span>
                      {s.name} — <span className="text-muted-foreground">{s.role}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No stakeholders captured yet. Add them in the workspace profile.
              </p>
            )}
          </fieldset>
          <fieldset className="rounded-md border border-border p-3">
            <legend className="label-caps px-1">Approved sources</legend>
            {ws.documents.filter((d) => d.approved).length ? (
              <div className="grid gap-1.5">
                {ws.documents
                  .filter((d) => d.approved)
                  .map((d) => (
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
              <p className="text-xs text-muted-foreground">
                No approved sources. The brief will use workspace state only.
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Unapproved sources are never used.
            </p>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={generate} disabled={busy}>
            <Sparkles className="mr-1.5 size-3.5" />
            {busy ? "Generating…" : "Generate brief"}
          </Button>
          {doc ? (
            <>
              <Button
                variant="outline"
                onClick={() => void copyText(briefToText(doc), "Brief copied")}
              >
                <ClipboardCopy className="mr-1.5 size-3.5" /> Copy brief
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <FileDown className="mr-1.5 size-3.5" /> Export PDF
              </Button>
              <Button variant="ghost" onClick={recordCheckpoint}>
                Record as checkpoint
              </Button>
            </>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {last ? `Last checkpoint: ${last.date}` : "No checkpoint recorded yet"}
          </span>
        </div>

        {doc ? (
          <BriefView doc={doc} onPull={(title) => {
            addMilestone(ws.customer.id, {
              id: `${ws.customer.id}-ms-${Date.now().toString(36)}`,
              customerId: ws.customer.id,
              week: "Now",
              title,
              detail: "Pulled forward from the meeting brief quick-win list. Human decision.",
              track: "parallel",
              owner: "CS / Implementation",
              status: "planned",
              provenance: "human-decision",
            });
            toast.success("Pulled into the current plan", {
              description: "Added as a parallel workstream item. It does not touch the critical path.",
            });
          }} />
        ) : (
          <div className="panel grid-bg p-8 text-center">
            <p className="text-sm font-medium text-foreground">No brief generated yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Choose the objective, cadence, date, attendees and approved sources, then generate.
              Nothing is fabricated: if nothing material changed, the brief says so and proposes
              pull-forward work instead.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BriefView({ doc, onPull }: { doc: BriefDoc; onPull: (title: string) => void }) {
  return (
    <article id="brief-print" className="space-y-5 text-sm">
      <header className="rounded-lg border border-border bg-secondary/50 p-5 print:bg-white">
        <div className="label-caps">Meeting brief · Customer Value OS</div>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{doc.customerName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {doc.meetingLabel} · {doc.date}
        </p>
        <p className="mt-2 text-sm text-foreground/90">
          <strong>Objective:</strong> {doc.objective}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Generated {doc.generatedAt} · deterministic local generation, no external service
        </p>
        <ProvenanceLegend className="mt-3" />
      </header>

      <Block heading="Customer-safe status">
        <p className="leading-relaxed text-foreground/90">{doc.customerSafeStatus}</p>
      </Block>

      {doc.delta.length ? (
        <Block heading="What changed since the last checkpoint">
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
        <Block heading="Nothing material changed — pull-forward work instead">
          <p className="mb-3 text-xs text-muted-foreground">
            No fabricated activity. These items are safe to do now, remove future load and never
            bypass a hard dependency.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {doc.quickWins.map((q) => (
              <li key={q.id} className="rounded-md border border-border p-3">
                <div className="font-medium text-foreground">{q.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">Why now: {q.whyNow}</p>
                <p className="text-xs text-muted-foreground">Benefit: {q.benefit}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <div>
                    <dt className="inline font-semibold">Owner: </dt>
                    <dd className="inline">{q.owner}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Effort: </dt>
                    <dd className="inline capitalize">{q.effort}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Dependency: </dt>
                    <dd className="inline">{q.dependency}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Critical path: </dt>
                    <dd className="inline">{q.changesCriticalPath ? "changes it" : "no change"}</dd>
                  </div>
                </dl>
                <div className="mt-2 flex items-center justify-between gap-2 print:hidden">
                  <span className="rounded-full bg-auto px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-auto-foreground">
                    Deterministic recommendation
                  </span>
                  <Button size="sm" variant="outline" onClick={() => onPull(q.title)}>
                    Pull into plan
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {doc.blocks.map((b) => (
        <Block key={b.heading} heading={b.heading} internal={b.internal}>
          <ul className="space-y-1.5">
            {b.items.map((i, n) => (
              <li key={n} className="leading-relaxed text-foreground/90">
                • {i}
              </li>
            ))}
          </ul>
        </Block>
      ))}

      <div className="grid gap-5 md:grid-cols-2">
        <Block heading="Recommended agenda">
          <ol className="list-decimal space-y-1 pl-5">
            {doc.agenda.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </Block>
        <Block heading="Questions to ask">
          <ul className="space-y-1">
            {doc.questions.map((q) => (
              <li key={q}>• {q}</li>
            ))}
          </ul>
        </Block>
        <Block heading="Artefacts to have open">
          <ul className="space-y-1">
            {doc.artifacts.map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
        </Block>
        <Block heading="Recommended skill packs">
          <ul className="space-y-1">
            {doc.skillPacks.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </Block>
      </div>

      <p className="text-xs text-muted-foreground">
        Nothing in this brief is sent to a customer automatically. A named human approves and sends
        every customer-facing message, commitment, risk acceptance or go/no-go decision.
      </p>
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
    <section
      className={cn(
        "rounded-lg border p-4",
        internal ? "border-dashed border-warning/60 bg-assumption/25" : "border-border",
      )}
    >
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