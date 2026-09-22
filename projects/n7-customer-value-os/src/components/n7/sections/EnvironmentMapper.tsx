import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Callout,
  EmptyState,
  Panel,
  ProvenanceTag,
  SectionHeader,
} from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEnvironmentProvider } from "@/lib/n7/environment-provider";
import { useN7 } from "@/lib/n7/store";
import type { CustomerWorkspace, EnvironmentEdge, EnvironmentNode, NodeKind } from "@/lib/n7/types";
import { cn } from "@/lib/utils";

const NODE_W = 168;
const NODE_H = 62;

const KIND_STYLE: Record<NodeKind, { fill: string; glyph: string; label: string }> = {
  saas: { fill: "var(--color-chart-1)", glyph: "☁", label: "SaaS platform" },
  "app-server": { fill: "var(--color-chart-2)", glyph: "▤", label: "Application server" },
  database: { fill: "var(--color-chart-4)", glyph: "▦", label: "Database" },
  firewall: { fill: "var(--color-chart-5)", glyph: "▥", label: "Firewall / boundary" },
  endpoint: { fill: "var(--color-chart-3)", glyph: "◉", label: "Endpoint / user" },
  integration: { fill: "var(--color-primary)", glyph: "⇄", label: "Integration / connector" },
  identity: { fill: "var(--color-chart-2)", glyph: "◈", label: "Identity / SSO" },
  boundary: { fill: "var(--color-muted-foreground)", glyph: "▢", label: "Trust boundary" },
};

const EXAMPLE_TEXT =
  "2 database servers behind a firewall, hardwired to application servers, with technicians on mobile tablets. Salesforce and SAP are reached through a connector, and SSO handles identity.";

export function EnvironmentMapper({ ws }: { ws: CustomerWorkspace }) {
  const { updateNodes, updateEdges, providerMode } = useN7();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [freeText, setFreeText] = useState("");
  const [useSources, setUseSources] = useState<string[]>(
    ws.documents.filter((d) => d.approved).map((d) => d.id),
  );
  const [proposal, setProposal] = useState<{
    nodes: EnvironmentNode[];
    edges: EnvironmentEdge[];
    confidence: string;
    notes: string[];
  } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [generationNote, setGenerationNote] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const panning = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const nodes = proposal ? proposal.nodes : ws.nodes;
  const edges = proposal ? proposal.edges : ws.edges;
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom],
  );

  function onPointerMove(e: React.PointerEvent) {
    if (drag.current) {
      const p = toCanvas(e.clientX, e.clientY);
      const next = nodes.map((n) =>
        n.id === drag.current!.id ? { ...n, x: p.x - drag.current!.dx, y: p.y - drag.current!.dy } : n,
      );
      if (proposal) setProposal({ ...proposal, nodes: next });
      else updateNodes(ws.customer.id, next);
    } else if (panning.current) {
      setPan({
        x: panning.current.ox + (e.clientX - panning.current.x),
        y: panning.current.oy + (e.clientY - panning.current.y),
      });
    }
  }

  function endDrag() {
    drag.current = null;
    panning.current = null;
  }

  /** Scale and centre the view so every node is visible inside the canvas. */
  const fitToView = useCallback(
    (list: EnvironmentNode[]) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || !list.length) return;
      const minX = Math.min(...list.map((n) => n.x));
      const minY = Math.min(...list.map((n) => n.y));
      const maxX = Math.max(...list.map((n) => n.x)) + NODE_W;
      const maxY = Math.max(...list.map((n) => n.y)) + NODE_H;
      const pad = 24;
      const z = Math.max(
        0.5,
        Math.min(1, (rect.width - pad * 2) / (maxX - minX), (rect.height - pad * 2) / (maxY - minY)),
      );
      setZoom(+z.toFixed(2));
      setPan({
        x: pad - minX * z + Math.max(0, (rect.width - pad * 2 - (maxX - minX) * z) / 2),
        y: pad - minY * z,
      });
    },
    [],
  );


  function addNode() {
    const node: EnvironmentNode = {
      id: `${ws.customer.id}-manual-${Date.now().toString(36)}`,
      customerId: ws.customer.id,
      label: "New node",
      kind: "app-server",
      x: 120 + Math.round((nodes.length % 4) * 40),
      y: 400,
      detail: "Added manually. Confirm with the customer before treating as fact.",
      provenance: "working-assumption",
    };
    updateNodes(ws.customer.id, [...ws.nodes, node]);
    setSelectedId(node.id);
    toast.success("Node added");
  }

  function patchSelected(patch: Partial<EnvironmentNode>) {
    if (!selected) return;
    const next = nodes.map((n) => (n.id === selected.id ? { ...n, ...patch } : n));
    if (proposal) setProposal({ ...proposal, nodes: next });
    else updateNodes(ws.customer.id, next);
  }

  function deleteSelected() {
    if (!selected || proposal || selected.provenance === "case-fact") return;
    updateNodes(
      ws.customer.id,
      ws.nodes.filter((n) => n.id !== selected.id),
    );
    updateEdges(
      ws.customer.id,
      ws.edges.filter((e) => e.from !== selected.id && e.to !== selected.id),
    );
    setSelectedId(null);
    toast("Node removed");
  }

  async function generate() {
    setBusy(true);
    setGenError(null);
    try {
      const approvedDocs = ws.documents.filter((d) => useSources.includes(d.id) && d.approved);
      const sourceText = approvedDocs.map((d) => d.content).filter(Boolean).join("\n");
      const currentEnvironment = [
        ...ws.nodes.map((node) => `${node.label}: ${node.detail}`),
        ...ws.integrations.map((integration) => `${integration.system}: ${integration.purpose}`),
      ].join("\n");
      const request = {
        customerId: ws.customer.id,
        freeText: freeText.trim() || currentEnvironment || EXAMPLE_TEXT,
        approvedSourceTitles: approvedDocs.map((d) => d.title),
        approvedSourceText: sourceText,
      };
      let fallbackUsed = false;
      let provider = getEnvironmentProvider(providerMode);
      let res;
      try {
        res = await provider.generate(request);
      } catch {
        provider = getEnvironmentProvider("demo");
        res = await provider.generate(request);
        fallbackUsed = true;
      }
      setProposal({ nodes: res.nodes, edges: res.edges, confidence: res.confidence, notes: res.notes });
      setLastGenerated(new Date().toLocaleString());
      setGenerationNote(fallbackUsed ? "Generated locally; external provider unavailable." : null);
      requestAnimationFrame(() => fitToView(res.nodes));
      toast("Proposed environment generated", { description: "Review and approve before it replaces the map." });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed.");
      setProposal(null);
    } finally {
      setBusy(false);
    }
  }

  function approveProposal() {
    if (!proposal) return;
    const protectedNodes = ws.nodes.filter((node) => node.provenance === "case-fact");
    const protectedNodeIds = new Set(protectedNodes.map((node) => node.id));
    const protectedEdges = ws.edges.filter(
      (edge) =>
        edge.provenance === "case-fact" ||
        protectedNodeIds.has(edge.from) ||
        protectedNodeIds.has(edge.to),
    );
    updateNodes(ws.customer.id, [
      ...protectedNodes,
      ...proposal.nodes.filter((node) => !protectedNodeIds.has(node.id)),
    ]);
    updateEdges(ws.customer.id, [
      ...protectedEdges,
      ...proposal.edges.filter((edge) => !protectedEdges.some((saved) => saved.id === edge.id)),
    ]);
    setProposal(null);
    toast.success("Proposal approved", {
      description: "The environment of record was updated without removing protected case facts.",
    });
  }

  const usedKinds = Array.from(new Set(nodes.map((n) => n.kind)));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Environment"
        description="Interactive architecture map. Drag nodes, pan and zoom, edit labels, and generate a proposed topology from approved sources or pasted text."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addNode}>
              Add node
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fitToView(nodes)}>
              Fit to view
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              Reset view
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs">
        <span><strong className="text-foreground">{useSources.length}</strong> approved source{useSources.length === 1 ? "" : "s"} selected</span>
        <span>Last generated: <strong className="text-foreground">{lastGenerated ?? "Not yet"}</strong></span>
        <span>Status: <strong className="text-foreground">{proposal ? "Proposed — review required" : "Approved environment of record"}</strong></span>
      </div>

      {generationNote ? <p className="text-xs text-muted-foreground">{generationNote}</p> : null}

      {proposal ? (
        <Callout tone="warning" title={`Proposed from approved sources · confidence ${proposal.confidence}`}>
          <ul className="mb-3 space-y-1 text-xs">
            {proposal.notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button size="sm" onClick={approveProposal}>
              Approve as environment of record
            </Button>
            <Button size="sm" variant="outline" onClick={() => setProposal(null)}>
              Discard proposal
            </Button>
          </div>
        </Callout>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel
          title="Customer environment"
          subtitle="Colour indicates node type. Border style indicates provenance: solid = case fact, dashed = assumption or proposal."
          right={
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))} aria-label="Zoom in">
                +
              </Button>
              <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} aria-label="Zoom out">
                −
              </Button>
              <span className="ml-1 font-mono text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            </div>
          }
        >
          {nodes.length === 0 ? (
            <EmptyState
              title="No environment captured yet"
              body="Add a node manually, paste a free-text description, or generate a proposed topology from approved sources."
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-border bg-surface">
              <svg
                ref={svgRef}
                role="img"
                aria-label="Customer environment diagram"
                className="h-[520px] w-full touch-none select-none"
                onPointerDown={(e) => {
                  if ((e.target as Element).tagName === "svg" || (e.target as Element).getAttribute("data-bg")) {
                    panning.current = { x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y };
                    setSelectedId(null);
                  }
                }}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
              >
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="var(--color-muted-foreground)" />
                  </marker>
                </defs>
                <rect data-bg="1" width="100%" height="100%" fill="transparent" />
                <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                  {edges.map((e) => {
                    const a = byId[e.from];
                    const b = byId[e.to];
                    if (!a || !b) return null;
                    const x1 = a.x + NODE_W / 2;
                    const y1 = a.y + NODE_H / 2;
                    const x2 = b.x + NODE_W / 2;
                    const y2 = b.y + NODE_H / 2;
                    return (
                      <g key={e.id}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="var(--color-muted-foreground)"
                          strokeWidth={1.4}
                          strokeDasharray={e.flow === "auth" ? "5 4" : undefined}
                          markerEnd="url(#arrow)"
                          opacity={0.75}
                        />
                        <text
                          x={(x1 + x2) / 2}
                          y={(y1 + y2) / 2 - 6}
                          textAnchor="middle"
                          fontSize={10}
                          fill="var(--color-muted-foreground)"
                        >
                          {e.label}
                        </text>
                      </g>
                    );
                  })}
                  {nodes.map((n) => {
                    const style = KIND_STYLE[n.kind];
                    const isFact = n.provenance === "case-fact";
                    return (
                      <g
                        key={n.id}
                        transform={`translate(${n.x} ${n.y})`}
                        className="cursor-grab"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          const p = toCanvas(e.clientX, e.clientY);
                          drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y };
                          setSelectedId(n.id);
                        }}
                      >
                        <rect
                          width={NODE_W}
                          height={NODE_H}
                          rx={8}
                          fill="var(--color-card)"
                          stroke={selectedId === n.id ? "var(--color-primary)" : style.fill}
                          strokeWidth={selectedId === n.id ? 2.5 : 1.5}
                          strokeDasharray={isFact ? undefined : "6 4"}
                        />
                        <rect width={5} height={NODE_H} rx={2} fill={style.fill} />
                        <text x={16} y={22} fontSize={11} fill="var(--color-muted-foreground)">
                          {style.glyph} {style.label}
                        </text>
                        <text x={16} y={42} fontSize={12.5} fontWeight={600} fill="var(--color-foreground)">
                          {n.label.length > 24 ? `${n.label.slice(0, 23)}…` : n.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="label-caps">Legend</span>
            {usedKinds.map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: KIND_STYLE[k].fill }} />
                {KIND_STYLE[k].label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-5 border-t border-dashed border-muted-foreground" /> assumption / proposal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-5 border-t border-muted-foreground" /> case fact
            </span>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Selected node">
            {selected ? (
              <div className="space-y-3">
                 {selected.provenance === "case-fact" ? (
                   <Callout tone="info" title="Protected source record">
                     This node is a case fact. It can be moved for layout, but its source fields cannot be changed or removed.
                   </Callout>
                 ) : null}
                 <div className="grid gap-1.5">
                  <Label htmlFor="nlabel">Label</Label>
                   <Input id="nlabel" value={selected.label} disabled={selected.provenance === "case-fact"} onChange={(e) => patchSelected({ label: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nkind">Type</Label>
                   <Select disabled={selected.provenance === "case-fact"} value={selected.kind} onValueChange={(v) => patchSelected({ kind: v as NodeKind })}>
                    <SelectTrigger id="nkind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_STYLE) as NodeKind[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_STYLE[k].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ndetail">Detail / evidence</Label>
                   <Textarea id="ndetail" rows={3} value={selected.detail} disabled={selected.provenance === "case-fact"} onChange={(e) => patchSelected({ detail: e.target.value })} />
                </div>
                <div className="flex items-center justify-between">
                  <ProvenanceTag value={selected.provenance} />
                   <Button size="sm" variant="ghost" onClick={deleteSelected} disabled={!!proposal || selected.provenance === "case-fact"}>
                    Remove
                  </Button>
                </div>
                {selected.sourceNote ? (
                  <p className="text-xs text-muted-foreground">Source: {selected.sourceNote}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a node in the diagram to edit its label, type, detail and provenance.
              </p>
            )}
          </Panel>

           <Panel title="Generate suggested environment" subtitle="Build a reviewable proposal from approved sources or a pasted description.">
            <div className="space-y-3">
              <div className="grid gap-1.5">
                 <Label htmlFor="gen">Additional environment notes (optional)</Label>
                <Textarea
                  id="gen"
                  rows={4}
                  placeholder={EXAMPLE_TEXT}
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                />
                <Button variant="ghost" size="sm" className="justify-start px-0" onClick={() => setFreeText(EXAMPLE_TEXT)}>
                   Add an example description
                </Button>
              </div>

              <div>
                <div className="label-caps mb-1">Approved sources</div>
                {ws.documents.filter((d) => d.approved).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No approved sources for this customer. Generation will use pasted text only.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {ws.documents
                      .filter((d) => d.approved)
                      .map((d) => (
                        <li key={d.id} className="flex items-center gap-2 text-xs">
                          <Checkbox
                            id={`src-${d.id}`}
                            checked={useSources.includes(d.id)}
                            onCheckedChange={(c) =>
                              setUseSources((s) => (c ? [...s, d.id] : s.filter((x) => x !== d.id)))
                            }
                          />
                          <label htmlFor={`src-${d.id}`} className="cursor-pointer">
                            {d.title}
                          </label>
                        </li>
                      ))}
                  </ul>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Unapproved sources are never used for generation.
                </p>
              </div>

              <Button onClick={generate} disabled={busy} className="h-auto w-full whitespace-normal py-2 text-center leading-snug">
                {busy ? "Generating…" : "Generate suggested environment"}
              </Button>

              {genError ? (
                <Callout tone="warning" title="Add more environment detail">
                  {genError}
                </Callout>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>

      <Callout tone="info" title="AI-generated topology is a suggestion">
        Any generated diagram is labelled “Proposed from approved sources” with a confidence note and
        must be approved by a human before it is treated as the environment of record.
      </Callout>
    </div>
  );
}