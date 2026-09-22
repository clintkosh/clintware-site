import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Callout, Panel, SectionHeader, StatusPill } from "@/components/n7/primitives";
import { invokeN7AI, transcribeN7Audio } from "@/lib/n7/server-api";
import { useN7 } from "@/lib/n7/store";
import type {
  CustomerWorkspace,
  LiveAssistSession,
  LiveAssistTrainingSource,
  PlanChangeCollection,
  PlanChangeOperation,
  PlanChangeRecord,
} from "@/lib/n7/types";

type Citation = { url: string; title?: string; publishedDate?: string | null };

type ChangeProposal = {
  interpretation: string;
  confidence: "low" | "medium" | "high";
  operations: PlanChangeOperation[];
  cautions?: string[];
};

type AssistReply = {
  shouldRespond: boolean;
  customerMatch: boolean;
  reason: string;
  suggestedResponse: string;
  supportingContext?: string[];
};

const COLLECTIONS: PlanChangeCollection[] = [
  "milestones",
  "dependencies",
  "risks",
  "decisions",
  "raci",
  "integrations",
  "kpis",
  "deploymentWork",
  "sprints",
  "engineeringIssues",
  "documents",
  "valueEvents",
];

const UPDATE_FIELDS: Record<string, string[]> = {
  milestones: ["week", "title", "detail", "track", "owner", "status"],
  dependencies: ["name", "owner", "type", "status", "blocksGoLive", "note"],
  risks: ["title", "category", "impact", "likelihood", "mitigation", "owner", "trigger", "status"],
  decisions: ["date", "title", "decision", "rationale", "decidedBy", "type", "alternatives"],
  raci: ["activity", "responsible", "accountable", "consulted", "informed", "workingHere", "workingSince"],
  integrations: ["system", "purpose", "connectorStatus", "authModel", "owner", "blocksGoLive"],
  kpis: ["name", "kind", "unit", "baseline", "target", "current", "trend", "goodDirection"],
  deploymentWork: ["title", "detail", "status", "owner", "week", "sprintId", "storyPoints", "sourceMilestoneId", "jiraKey"],
  sprints: ["name", "weekStart", "weekEnd", "goal", "status", "capacityPoints"],
  engineeringIssues: [
    "summary",
    "reportedProblem",
    "expected",
    "actual",
    "reproSteps",
    "reproducible",
    "notReproducibleReason",
    "environment",
    "evidence",
    "severity",
    "customerImpact",
    "affectedUsers",
    "workaround",
    "source",
    "owner",
    "status",
    "jiraKey",
  ],
  documents: ["title", "kind", "owner", "freshness", "approved", "confidence", "lastSync", "relevantSystems", "content"],
  valueEvents: ["date", "title", "detail"],
};

const CUSTOMER_FIELDS = ["health", "stage", "targetOutcome", "users", "nextMilestone", "nextExecutiveTouch", "headline"];

function stripFence(text: string) {
  return text.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
}

function safeJson<T>(text: string): T {
  const cleaned = stripFence(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1)) as T;
    throw new Error("The AI response was not valid JSON.");
  }
}

function cleanPatch(collection: string | undefined, patch: Record<string, unknown>) {
  const allowed = collection ? UPDATE_FIELDS[collection] ?? [] : CUSTOMER_FIELDS;
  return Object.fromEntries(Object.entries(patch ?? {}).filter(([key]) => allowed.includes(key)));
}

function workspaceForAI(ws: CustomerWorkspace) {
  return {
    customer: ws.customer,
    stakeholders: ws.stakeholders,
    outcomes: ws.outcomes,
    kpis: ws.kpis,
    milestones: ws.milestones,
    dependencies: ws.dependencies,
    risks: ws.risks,
    decisions: ws.decisions,
    raci: ws.raci,
    integrations: ws.integrations,
    deploymentWork: ws.deploymentWork ?? [],
    sprints: ws.sprints ?? [],
    engineeringIssues: ws.engineeringIssues ?? [],
    valueEvents: ws.valueEvents,
    readiness: ws.readiness,
    recentApprovedChanges: (ws.planChangeRecords ?? []).slice(-8),
  };
}

function makeAddedItem(collection: PlanChangeCollection, customerId: string, patch: Record<string, unknown>) {
  const id = `${customerId}-ai-${collection}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const common = { id, customerId, provenance: "human-decision" as const };
  const p = cleanPatch(collection, patch);

  switch (collection) {
    case "milestones":
      return { ...common, week: "", title: "New milestone", detail: "", track: "parallel", owner: "Not assigned", status: "planned", ...p };
    case "dependencies":
      return { ...common, name: "New dependency", owner: "Not assigned", type: "internal", status: "not-started", blocksGoLive: false, note: "", ...p };
    case "risks":
      return { ...common, title: "New risk", category: "schedule", impact: "medium", likelihood: "medium", mitigation: "", owner: "Not assigned", trigger: "", status: "open", ...p };
    case "decisions":
      return { ...common, date: new Date().toISOString().slice(0, 10), title: "Decision", decision: "", rationale: "", decidedBy: "Operator", type: "human-decision", alternatives: "", ...p };
    case "raci":
      return { ...common, activity: "New activity", responsible: "", accountable: "", consulted: "", informed: "", ...p };
    case "integrations":
      return { ...common, system: "New system", purpose: "", connectorStatus: "unknown", authModel: "Not provided", owner: "Not assigned", blocksGoLive: false, ...p };
    case "deploymentWork":
      return { ...common, title: "New work item", detail: "", status: "backlog", owner: "Not assigned", week: "", ...p };
    case "sprints":
      return { ...common, name: "New sprint", weekStart: "", weekEnd: "", goal: "", status: "planned", ...p };
    case "engineeringIssues":
      return {
        ...common,
        summary: "New issue",
        reportedProblem: "",
        expected: "",
        actual: "",
        reproSteps: "",
        reproducible: false,
        environment: "",
        evidence: "",
        severity: "medium",
        customerImpact: "",
        affectedUsers: "",
        workaround: "",
        source: "Live Prompt",
        owner: "Not assigned",
        status: "intake",
        createdAt: new Date().toISOString(),
        ...p,
      };
    case "documents":
      return {
        ...common,
        title: "AI-approved note",
        kind: "crm-note",
        owner: "Operator",
        freshness: new Date().toISOString().slice(0, 10),
        approved: true,
        confidence: "medium",
        lastSync: new Date().toISOString(),
        relevantSystems: [],
        content: "",
        ...p,
      };
    case "valueEvents":
      return { ...common, date: new Date().toISOString().slice(0, 10), title: "Value event", detail: "", ...p };
    default:
      return null;
  }
}

function applyApprovedRecord(ws: CustomerWorkspace, record: PlanChangeRecord): Partial<CustomerWorkspace> {
  const next: any = { ...ws, customer: { ...ws.customer } };

  for (const op of record.operations) {
    if (op.action === "update-customer") {
      next.customer = { ...next.customer, ...cleanPatch(undefined, op.patch) };
      continue;
    }

    if (!op.collection || !COLLECTIONS.includes(op.collection)) continue;
    const list = [...((next[op.collection] ?? []) as any[])];

    if (op.action === "update-item" && op.itemId) {
      const index = list.findIndex((item) => item.id === op.itemId);
      if (index >= 0) list[index] = { ...list[index], ...cleanPatch(op.collection, op.patch) };
      next[op.collection] = list;
      continue;
    }

    if (op.action === "add-item") {
      const item = makeAddedItem(op.collection, ws.customer.id, op.patch);
      if (item) list.push(item);
      next[op.collection] = list;
    }
  }

  next.planChangeRecords = [...(ws.planChangeRecords ?? []), record];
  return next;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.slice(value.indexOf(",") + 1) : value);
    };
    reader.readAsDataURL(blob);
  });
}

function supportedRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const mime of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

function recordSegment(stream: MediaStream, ms = 8000) {
  return new Promise<Blob>((resolve, reject) => {
    const audio = new MediaStream(stream.getAudioTracks());
    const mimeType = supportedRecorderMime();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(audio, { mimeType }) : new MediaRecorder(audio);
    } catch (error) {
      reject(error);
      return;
    }
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Audio recorder error."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
    recorder.start();
    window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, ms);
  });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
}

function audioBufferChunkToWav(buffer: AudioBuffer, startFrame: number, endFrame: number) {
  const frameCount = Math.max(0, endFrame - startFrame);
  const bytesPerSample = 2;
  const wav = new ArrayBuffer(44 + frameCount * bytesPerSample);
  const view = new DataView(wav);
  const sampleRate = buffer.sampleRate;

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + frameCount * bytesPerSample, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, frameCount * bytesPerSample, true);

  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  let offset = 44;
  for (let frame = startFrame; frame < endFrame; frame += 1) {
    let sample = 0;
    for (const channel of channels) sample += channel[frame] ?? 0;
    sample /= Math.max(1, channels.length);
    sample = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([wav], { type: "audio/wav" });
}

async function chunkRecordedCall(file: File, secondsPerChunk = 45) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const framesPerChunk = Math.max(1, Math.floor(decoded.sampleRate * secondsPerChunk));
    const chunks: Blob[] = [];
    for (let start = 0; start < decoded.length; start += framesPerChunk) {
      chunks.push(audioBufferChunkToWav(decoded, start, Math.min(decoded.length, start + framesPerChunk)));
    }
    return chunks;
  } finally {
    await context.close();
  }
}

export function LivePrompt({ ws }: { ws: CustomerWorkspace }) {
  const { patchWorkspace } = useN7();
  const [input, setInput] = useState("");
  const [useResearch, setUseResearch] = useState(true);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<ChangeProposal | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);

  async function interpret() {
    if (!input.trim()) return;
    setBusy(true);
    setProposal(null);
    try {
      const response: any = await invokeN7AI({
        data: {
          task: "interpret-live-customer-plan-change",
          prompt: [
            "Interpret the operator's update into a proposed customer-plan change set.",
            "Return JSON only with: interpretation, confidence(low|medium|high), cautions[], operations[].",
            "Each operation must be {id, action, collection?, itemId?, label, reason, patch}.",
            "Allowed actions: update-customer, update-item, add-item.",
            `Allowed collections: ${COLLECTIONS.join(", ")}.`,
            `Allowed customer fields: ${CUSTOMER_FIELDS.join(", ")}.`,
            "For update-item, use an existing item id from context. Never invent an existing id.",
            "For add-item, include every important field needed to make the card useful.",
            "Do not apply anything. This is a proposal that requires human approval.",
            "Do not treat external research as a customer fact. Research may inform cautions or recommended handling only.",
            "",
            `Operator update: ${input.trim()}`,
          ].join("\n"),
          context: workspaceForAI(ws),
          researchQuery: useResearch
            ? `enterprise customer implementation best practices and risk handling related to: ${input.trim().slice(0, 450)}`
            : undefined,
        },
      });
      if (!response?.available || !response?.text) throw new Error(response?.reason || "AI interpretation unavailable.");
      const parsed = safeJson<ChangeProposal>(response.text);
      parsed.operations = (parsed.operations ?? []).filter((op) => {
        if (op.action === "update-customer") return true;
        return Boolean(op.collection && COLLECTIONS.includes(op.collection));
      });
      setProposal(parsed);
      setCitations(Array.isArray(response.citations) ? response.citations : []);
    } catch (error: any) {
      toast.error(error?.message || "Could not interpret the update.");
    } finally {
      setBusy(false);
    }
  }

  function approve() {
    if (!proposal) return;
    const record: PlanChangeRecord = {
      id: `${ws.customer.id}-change-${Date.now().toString(36)}`,
      customerId: ws.customer.id,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      input: input.trim(),
      interpretation: proposal.interpretation,
      confidence: proposal.confidence,
      operations: proposal.operations.map((op, index) => ({
        ...op,
        id: op.id || `op-${index + 1}`,
        patch: cleanPatch(op.collection, op.patch ?? {}),
      })),
      citations,
      researchUsed: useResearch,
      appliedBy: "operator",
      provenance: "human-decision",
    };
    patchWorkspace(ws.customer.id, applyApprovedRecord(ws, record));
    setProposal(null);
    setInput("");
    setCitations([]);
    toast.success("Approved change record applied. Customer cards refreshed from the approved record.");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Live Prompt"
        description="Describe what changed. Clintware interprets the update, proposes exact customer-plan edits, and changes nothing until you approve the interpretation."
      />

      <Panel
        title="What changed?"
        subtitle="The customer record remains the source of truth. Generated changes are proposals until approval."
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-32"
          placeholder="Example: Engineering confirmed the SAP connector is now 6 weeks, the customer moved UAT to October 14, and the sponsor wants a weekly checkpoint until the dependency clears."
        />
        <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={useResearch} onChange={(e) => setUseResearch(e.target.checked)} className="mt-0.5" />
          <span>
            Use Exa-backed external context for implementation best practices. External research can inform recommendations, but it is never promoted to a customer fact.
          </span>
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={interpret} disabled={busy || !input.trim()}>
            {busy ? "Interpreting…" : "Interpret change"}
          </Button>
          {proposal ? (
            <Button variant="outline" onClick={() => setProposal(null)}>
              Discard proposal
            </Button>
          ) : null}
        </div>
      </Panel>

      {proposal ? (
        <>
          <Callout tone="warning" title="Approval gate">
            Review the interpretation and every proposed edit below. Nothing is written to the live plan until you approve.
          </Callout>
          <Panel
            title="Interpreted change"
            right={<StatusPill status={`${proposal.confidence} confidence`} />}
          >
            <p className="text-sm leading-relaxed text-foreground/90">{proposal.interpretation}</p>
            {proposal.cautions?.length ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {proposal.cautions.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            ) : null}
          </Panel>

          <div className="grid gap-3">
            {proposal.operations.map((op, index) => (
              <Panel key={op.id || index} title={op.label || `Change ${index + 1}`} subtitle={op.reason}>
                <div className="flex flex-wrap gap-2 text-xs">
                  <StatusPill status={op.action} />
                  <span className="rounded border border-border px-2 py-1 text-muted-foreground">
                    {op.collection || "customer"}
                  </span>
                  {op.itemId ? (
                    <span className="rounded border border-border px-2 py-1 text-muted-foreground">id: {op.itemId}</span>
                  ) : null}
                </div>
                <pre className="mt-3 overflow-x-auto rounded-md bg-secondary/60 p-3 text-xs text-foreground/90">
                  {JSON.stringify(cleanPatch(op.collection, op.patch ?? {}), null, 2)}
                </pre>
              </Panel>
            ))}
          </div>

          {citations.length ? (
            <Panel title="External context" subtitle="Reference only. These sources do not become customer facts.">
              <ul className="space-y-2 text-xs">
                {citations.map((c) => (
                  <li key={c.url}>
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-primary underline">
                      {c.title || c.url}
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={approve}>Approve and apply to customer record</Button>
            <Button variant="outline" onClick={() => setProposal(null)}>Reject</Button>
          </div>
        </>
      ) : null}

      <Panel title="Approved change history" subtitle="These records are persisted with the customer workspace and drive the applied edits.">
        {(ws.planChangeRecords ?? []).length ? (
          <div className="space-y-3">
            {(ws.planChangeRecords ?? []).slice().reverse().slice(0, 12).map((record) => (
              <div key={record.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">{record.interpretation}</div>
                  <span className="text-[11px] text-muted-foreground">{new Date(record.approvedAt).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {record.operations.length} applied change{record.operations.length === 1 ? "" : "s"} · {record.researchUsed ? "Exa context used" : "workspace context only"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No approved Live Prompt changes yet.</p>
        )}
      </Panel>
    </div>
  );
}

export function LiveAssist({ ws }: { ws: CustomerWorkspace }) {
  const { patchWorkspace } = useN7();
  const defaultTargets = useMemo(
    () => ws.stakeholders.filter((s) => s.side === "customer").map((s) => s.name).filter(Boolean),
    [ws.stakeholders],
  );
  const [targets, setTargets] = useState(defaultTargets.join(", "));
  const [consent, setConsent] = useState(false);
  const [trainingNotes, setTrainingNotes] = useState("");
  const [transcript, setTranscript] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [directAsk, setDirectAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [progress, setProgress] = useState("");
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<LiveAssistSession["source"]>("machine-audio");
  const streamRef = useRef<MediaStream | null>(null);
  const liveRef = useRef(false);
  const processingRef = useRef<Promise<void>>(Promise.resolve());

  const approvedTraining = (ws.liveAssistTraining ?? []).filter((item) => item.approved);
  const targetNames = targets.split(",").map((v) => v.trim()).filter(Boolean);

  async function suggestionFor(text: string, directQuestion = "") {
    const response: any = await invokeN7AI({
      data: {
        task: "live-customer-call-assist",
        prompt: [
          "You are a white-label live customer conversation assistant embedded in a customer-success workspace.",
          `The selected account is ${ws.customer.name}. Target customer participants: ${targetNames.join(", ") || "not explicitly named"}.`,
          "Do not identify speakers biometrically. Use account context, explicit names, and conversation content only.",
          "For passive listening, respond only when the new transcript is clearly relevant to the selected account and contains a question, objection, decision, risk, commitment, or moment where the operator would benefit from a suggested answer.",
          "If relevance or speaker/account match is uncertain, set shouldRespond=false.",
          "A direct operator question always permits a response.",
          "Return JSON only: {shouldRespond:boolean, customerMatch:boolean, reason:string, suggestedResponse:string, supportingContext:string[]}.",
          "Keep the suggested response concise, natural, customer-safe, and grounded only in the supplied customer record and approved training context.",
          "",
          directQuestion ? `Direct operator question: ${directQuestion}` : "Mode: passive live listening",
          `Newest transcript: ${text}`,
        ].join("\n"),
        context: {
          customer: ws.customer,
          stakeholders: ws.stakeholders,
          milestones: ws.milestones,
          dependencies: ws.dependencies,
          risks: ws.risks,
          decisions: ws.decisions,
          outcomes: ws.outcomes,
          kpis: ws.kpis,
          approvedTraining: approvedTraining.slice(-10),
          operatorTrainingNotes: trainingNotes,
        },
      },
    });
    if (!response?.available || !response?.text) return;
    const parsed = safeJson<AssistReply>(response.text);
    if (parsed.shouldRespond && parsed.suggestedResponse) {
      setSuggestions((list) => [parsed.suggestedResponse, ...list].slice(0, 12));
    }
  }

  async function processBlob(blob: Blob, suggest = true) {
    if (!blob.size) return "";
    try {
      const audioBase64 = await blobToBase64(blob);
      const result: any = await transcribeN7Audio({
        data: {
          audioBase64,
          mimeType: blob.type || "audio/webm",
          language: "en",
          initialPrompt: `Customer account: ${ws.customer.name}. Participant names: ${targetNames.join(", ")}.`,
        },
      });
      if (!result?.available || !result?.text) {
        if (result?.reason) console.warn("N7 transcription unavailable:", result.reason);
        return "";
      }
      const text = String(result.text).trim();
      if (!text) return "";
      setTranscript((current) => (current ? `${current}\n${text}` : text));
      if (suggest) await suggestionFor(text);
      return text;
    } catch (error: any) {
      toast.error(error?.message || "Audio transcription failed.");
      return "";
    }
  }

  async function liveLoop(stream: MediaStream) {
    while (liveRef.current && stream.getAudioTracks().some((track) => track.readyState === "live")) {
      try {
        const blob = await recordSegment(stream, 8000);
        if (!liveRef.current && !blob.size) break;
        processingRef.current = processingRef.current.then(() => processBlob(blob));
      } catch (error: any) {
        toast.error(error?.message || "Could not capture machine audio.");
        break;
      }
    }
    setLive(false);
  }

  async function startLive() {
    if (!consent) {
      toast.error("Confirm customer/participant opt-in before starting live capture.");
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("This browser does not support shared-tab/system audio capture.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        toast.error("No shared audio track was provided. Share a tab/window/screen and enable its audio.");
        return;
      }
      streamRef.current = stream;
      liveRef.current = true;
      setLastSource("machine-audio");
      setSessionStartedAt(new Date().toISOString());
      setLive(true);
      for (const track of stream.getTracks()) {
        track.addEventListener("ended", () => stopLive(), { once: true });
      }
      void liveLoop(stream);
    } catch (error: any) {
      toast.error(error?.message || "Machine audio sharing was cancelled.");
    }
  }

  function stopLive() {
    liveRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLive(false);
  }

  async function uploadCall(file: File | undefined) {
    if (!file) return;
    if (!consent) {
      toast.error("Confirm permission/opt-in before transcribing a recorded call.");
      return;
    }
    setBusy(true);
    setLastSource("uploaded-call");
    setSessionStartedAt(new Date().toISOString());
    setProgress("Preparing recording…");
    try {
      let chunks: Blob[];
      try {
        chunks = await chunkRecordedCall(file, 45);
      } catch (decodeError) {
        if (file.size <= 6 * 1024 * 1024) {
          chunks = [file];
        } else {
          throw new Error("This browser could not decode the recording for safe chunking. Export it as MP3, WAV, M4A, or another browser-decodable audio format and try again.");
        }
      }

      const transcriptParts: string[] = [];
      for (let index = 0; index < chunks.length; index += 1) {
        setProgress(`Transcribing chunk ${index + 1} of ${chunks.length}…`);
        const text = await processBlob(chunks[index]!, false);
        if (text) transcriptParts.push(text);
      }

      const combined = transcriptParts.join("\n").trim();
      if (combined) {
        setProgress("Generating customer-scoped suggestions…");
        await suggestionFor(combined.slice(-12000));
        toast.success(`Recorded call processed in ${chunks.length} chunk${chunks.length === 1 ? "" : "s"}.`);
      } else {
        toast.error("The recording produced no usable transcript.");
      }
    } catch (error: any) {
      toast.error(error?.message || "Recorded-call analysis failed.");
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  async function askDirectly() {
    if (!directAsk.trim()) return;
    setBusy(true);
    if (!sessionStartedAt) setSessionStartedAt(new Date().toISOString());
    if (!transcript.trim()) setLastSource("direct-ask");
    try {
      await suggestionFor(transcript.slice(-6000), directAsk.trim());
      setDirectAsk("");
    } catch (error: any) {
      toast.error(error?.message || "Assistant response failed.");
    } finally {
      setBusy(false);
    }
  }

  function saveTraining(source: LiveAssistTrainingSource["source"], label: string, text: string) {
    const body = text.trim();
    if (!body) {
      toast.error("There is no transcript or training note to save.");
      return;
    }
    const record: LiveAssistTrainingSource = {
      id: `${ws.customer.id}-assist-${Date.now().toString(36)}`,
      customerId: ws.customer.id,
      createdAt: new Date().toISOString(),
      label,
      transcript: body,
      source,
      approved: true,
      provenance: "human-decision",
    };
    patchWorkspace(ws.customer.id, {
      liveAssistTraining: [...(ws.liveAssistTraining ?? []), record],
    });
    toast.success("Approved assistant context saved to this customer only.");
  }

  function saveSession() {
    if (!transcript.trim() && suggestions.length === 0) {
      toast.error("There is no transcript or suggestion history to save.");
      return;
    }
    const record: LiveAssistSession = {
      id: `${ws.customer.id}-session-${Date.now().toString(36)}`,
      customerId: ws.customer.id,
      startedAt: sessionStartedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      source: lastSource,
      consentConfirmed: consent,
      targetParticipantNames: targetNames,
      transcript: transcript.trim(),
      suggestions: [...suggestions],
      provenance: "human-decision",
    };
    patchWorkspace(ws.customer.id, {
      liveAssistSessions: [...(ws.liveAssistSessions ?? []), record],
    });
    setSessionStartedAt(null);
    toast.success("Call-assist session saved to this customer workspace.");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Live Assist"
        description="White-label conversation assistant for customer calls. It listens only after explicit opt-in, stays locked to the selected customer context, and surfaces suggested answers in this tab."
      />

      <Callout tone="info" title={`Account lock: ${ws.customer.name}`}>
        The assistant is scoped to this workspace first. It does not use voice biometrics or claim to know speaker identity. Passive suggestions require a clear account/context match; typed operator questions always receive an answer.
      </Callout>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Assistant training" subtitle="Account-specific context, not model fine-tuning. Approved items are stored with this customer workspace.">
          <label className="text-xs font-medium text-foreground">Target customer participant names</label>
          <Input className="mt-1" value={targets} onChange={(e) => setTargets(e.target.value)} placeholder="Customer names, comma separated" />
          <label className="mt-4 block text-xs font-medium text-foreground">Operator coaching / response guidance</label>
          <Textarea
            className="mt-1 min-h-28"
            value={trainingNotes}
            onChange={(e) => setTrainingNotes(e.target.value)}
            placeholder="Example: Keep answers concise. Never commit dates unless already approved. If SAP timing comes up, restate the current dependency and next evidence gate."
          />
          <div className="mt-3">
            <Button variant="outline" onClick={() => saveTraining("operator-note", "Operator coaching notes", trainingNotes)}>
              Save approved training context
            </Button>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Approved training sources: {approvedTraining.length}
          </div>
        </Panel>

        <Panel title="Consent + machine audio" subtitle="Browser capture requires you to choose a tab/window/screen and explicitly share its audio. Raw audio is not stored by this workspace.">
          <label className="flex items-start gap-2 text-sm text-foreground/90">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span>I confirm the customer/participants have opted in or I otherwise have permission to capture/transcribe this call.</span>
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {!live ? (
              <Button onClick={startLive} disabled={!consent}>Start machine-audio assist</Button>
            ) : (
              <Button variant="outline" onClick={stopLive}>Stop live assist</Button>
            )}
            <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              {busy ? "Processing…" : "Analyze recorded call"}
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void uploadCall(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {live ? "Listening to the audio source you explicitly shared. Suggestions appear below." : "Live capture is off."}
            {progress ? <span className="mt-1 block font-medium text-foreground">{progress}</span> : null}
          </div>
        </Panel>
      </div>

      <Panel title="Ask the assistant directly" subtitle="Typed questions bypass the passive-response gate and use the selected customer record plus approved training context.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={directAsk}
            onChange={(e) => setDirectAsk(e.target.value)}
            placeholder="What should I say if they ask whether we can still hit the original date?"
            onKeyDown={(e) => {
              if (e.key === "Enter") void askDirectly();
            }}
          />
          <Button onClick={askDirectly} disabled={busy || !directAsk.trim()}>Ask</Button>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Live transcript" subtitle="Transcribed from the explicitly shared machine-audio source or uploaded recording.">
          <div className="max-h-[430px] overflow-y-auto whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm leading-relaxed text-foreground/90">
            {transcript || "No transcript yet."}
          </div>
          {transcript ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => saveTraining(live ? "live-call" : "uploaded-call", `${ws.customer.name} call transcript`, transcript)}>
                Approve transcript as training context
              </Button>
              <Button variant="outline" onClick={saveSession}>Save session</Button>
              <Button variant="outline" onClick={() => setTranscript("")}>Clear transcript</Button>
            </div>
          ) : null}
        </Panel>

        <Panel title="Suggested answers" subtitle="Newest suggestion first. Nothing is sent to the customer automatically.">
          {suggestions.length ? (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={`${index}-${suggestion.slice(0, 20)}`} className="rounded-md border border-border bg-card p-3">
                  <div className="label-caps">Suggested response {index === 0 ? "· newest" : ""}</div>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">{suggestion}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No suggestion yet. Passive mode waits for a clear selected-customer match and a useful response moment.
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Saved assist sessions" subtitle="Saved only when you choose to retain a customer-scoped transcript/suggestion record.">
        {(ws.liveAssistSessions ?? []).length ? (
          <div className="space-y-2">
            {(ws.liveAssistSessions ?? []).slice().reverse().slice(0, 8).map((session) => (
              <div key={session.id} className="rounded-md border border-border p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {new Date(session.startedAt).toLocaleString()} · {session.source}
                  </span>
                  <span className="text-muted-foreground">{session.suggestions.length} suggestion{session.suggestions.length === 1 ? "" : "s"}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-muted-foreground">
                  {session.transcript || "Direct assistant question session"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No call-assist sessions saved.</p>
        )}
      </Panel>
    </div>
  );
}
