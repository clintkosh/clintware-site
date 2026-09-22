/**
 * Environment generation provider abstraction.
 *
 * Mode "demo"          — deterministic local parsing. No network, no credentials.
 * Mode "controlPlane"  — reserved for the operator's Clintware MCP / control plane.
 *
 * SECURITY BOUNDARY: no API keys, tokens or third-party credentials belong in
 * this client code. A control-plane implementation must run server-side and
 * authenticate there.
 *
 * TODO(secure-integration-boundary): implement `controlPlaneProvider` as a
 * server function that forwards to the operator's control plane. Endpoint and
 * auth scheme are intentionally undefined here — none are invented.
 */
import type { EnvironmentEdge, EnvironmentNode, NodeKind, Provenance } from "./types";

export type ProviderMode = "demo" | "controlPlane";

export interface GenerationRequest {
  customerId: string;
  freeText: string;
  approvedSourceTitles: string[];
}

export interface GenerationResult {
  nodes: EnvironmentNode[];
  edges: EnvironmentEdge[];
  confidence: "low" | "medium" | "high";
  provenanceLabel: string;
  notes: string[];
}

export interface EnvironmentProvider {
  mode: ProviderMode;
  generate: (req: GenerationRequest) => Promise<GenerationResult>;
}

const KIND_RULES: { kind: NodeKind; patterns: RegExp; label: (m: string) => string }[] = [
  { kind: "database", patterns: /database server|db server|database|postgres|oracle|sql/i, label: () => "Database server" },
  { kind: "app-server", patterns: /application server|app server|web server|middleware/i, label: () => "Application server" },
  { kind: "firewall", patterns: /firewall|dmz|perimeter/i, label: () => "Firewall" },
  { kind: "identity", patterns: /sso|okta|entra|active directory|identity|idp/i, label: () => "Identity provider (SSO)" },
  { kind: "saas", patterns: /salesforce|service cloud|field service|sap|servicenow|sharepoint|confluence/i, label: (m) => m },
  { kind: "endpoint", patterns: /technician|agent|laptop|mobile|tablet|user|workstation/i, label: (m) => m },
  { kind: "integration", patterns: /connector|api gateway|integration|etl|middleware bus/i, label: () => "Integration / connector" },
];

const COUNT_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

interface Draft {
  kind: NodeKind;
  label: string;
  count: number;
}

/** Deterministic free-text parser. Same input always yields the same diagram. */
export function parseEnvironmentText(text: string): Draft[] {
  const drafts: Draft[] = [];
  const clauses = text
    .split(/[,.;\n]|\band\b|\bbehind\b|\bconnected to\b|\bhardwired to\b/i)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    for (const rule of KIND_RULES) {
      const match = clause.match(rule.patterns);
      if (!match) continue;
      const numMatch = clause.match(/\b(\d{1,2})\b/);
      const wordMatch = clause.match(
        /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
      );
      const count = numMatch
        ? Math.min(Number(numMatch[1]), 8)
        : wordMatch
          ? (COUNT_WORDS[wordMatch[1]!.toLowerCase()] ?? 1)
          : 1;
      const label = rule.label(match[0].replace(/\b\w/g, (c) => c.toUpperCase()));
      if (!drafts.some((d) => d.kind === rule.kind && d.label === label)) {
        drafts.push({ kind: rule.kind, label, count });
      }
      break;
    }
  }
  return drafts;
}

const COLUMN_BY_KIND: Record<NodeKind, number> = {
  endpoint: 0,
  identity: 0,
  firewall: 1,
  integration: 2,
  "app-server": 2,
  saas: 3,
  database: 4,
  boundary: 1,
};

function layout(drafts: Draft[], customerId: string, provenance: Provenance) {
  const nodes: EnvironmentNode[] = [];
  const perColumn: Record<number, number> = {};
  let i = 0;
  for (const d of drafts) {
    for (let n = 0; n < d.count; n++) {
      const col = COLUMN_BY_KIND[d.kind];
      const row = (perColumn[col] ?? 0);
      perColumn[col] = row + 1;
      nodes.push({
        id: `${customerId}-gen-${i++}`,
        customerId,
        label: d.count > 1 ? `${d.label} ${n + 1}` : d.label,
        kind: d.kind,
        x: 60 + col * 200,
        y: 60 + row * 110,
        detail: "Proposed from approved sources. Requires human approval.",
        provenance,
        sourceNote: "Generated suggestion",
      });
    }
  }
  return nodes;
}

function chain(nodes: EnvironmentNode[], customerId: string): EnvironmentEdge[] {
  const order: NodeKind[] = [
    "endpoint",
    "identity",
    "firewall",
    "integration",
    "app-server",
    "saas",
    "database",
  ];
  const edges: EnvironmentEdge[] = [];
  let idx = 0;
  for (let i = 0; i < order.length - 1; i++) {
    const from = nodes.filter((n) => n.kind === order[i]);
    let j = i + 1;
    let to: EnvironmentNode[] = [];
    while (j < order.length && to.length === 0) {
      to = nodes.filter((n) => n.kind === order[j]);
      j++;
    }
    for (const f of from) {
      for (const t of to) {
        edges.push({
          id: `${customerId}-gene-${idx++}`,
          customerId,
          from: f.id,
          to: t.id,
          label: f.kind === "identity" ? "auth" : "data flow",
          flow: f.kind === "identity" ? "auth" : "data",
          provenance: "working-assumption",
        });
      }
    }
  }
  return edges;
}

export const demoProvider: EnvironmentProvider = {
  mode: "demo",
  async generate({ customerId, freeText, approvedSourceTitles }) {
    const drafts = parseEnvironmentText(freeText);
    const nodes = layout(drafts, customerId, "working-assumption");
    const edges = chain(nodes, customerId);
    const notes = [
      "Deterministic local generation. No external service was called and no credentials were used.",
      approvedSourceTitles.length
        ? `Approved sources considered: ${approvedSourceTitles.join(", ")}.`
        : "No approved sources selected — generated from pasted text only.",
      "AI-generated topology is a suggestion. A human must approve it before it is treated as the environment of record.",
    ];
    return {
      nodes,
      edges,
      confidence: drafts.length >= 3 ? "medium" : "low",
      provenanceLabel: "Proposed from approved sources",
      notes,
    };
  },
};

export const controlPlaneProvider: EnvironmentProvider = {
  mode: "controlPlane",
  async generate() {
    // TODO(secure-integration-boundary): route to a server function that calls
    // the operator's Clintware MCP / control plane. No endpoint is assumed here.
    throw new Error(
      "Control-plane provider is not configured in this prototype. Environment generation runs in deterministic demo mode.",
    );
  },
};

export function getEnvironmentProvider(mode: ProviderMode): EnvironmentProvider {
  return mode === "controlPlane" ? controlPlaneProvider : demoProvider;
}