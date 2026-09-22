/**
 * Environment generation provider abstraction.
 *
 * Local mode is deterministic, credential-free, and intentionally tolerant of
 * incomplete notes. External enrichment remains a server-side control-plane
 * seam; secrets and third-party calls never belong in this client module.
 */
import type { EnvironmentEdge, EnvironmentNode, NodeKind, Provenance } from "./types";

export type ProviderMode = "demo" | "controlPlane";

export interface GenerationRequest {
  customerId: string;
  /** User-entered notes. Fragments and shorthand are valid. */
  freeText: string;
  approvedSourceTitles: string[];
  /** Approved source content only. Unapproved text must never enter this field. */
  approvedSourceText?: string;
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
  /**
   * Optional server-side research seam for unresolved product or system names.
   * A control plane may implement this with Exa AI or another approved provider.
   * Local generation never depends on it and no credential is accepted here.
   */
  enrichUnknownTerms?: (terms: string[]) => Promise<Record<string, string>>;
}

const COUNT_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
};

export interface EnvironmentDraft {
  kind: NodeKind;
  label: string;
  count: number;
  detail: string;
  sourcePhrase: string;
  start: number;
  end: number;
  uncertain?: boolean;
}

interface EntityRule {
  kind: NodeKind;
  pattern: RegExp;
  label: (match: string) => string;
  detail?: (match: string) => string;
}

const titleCase = (value: string) => value.replace(/\b\w/g, (char) => char.toUpperCase());

// Specific rules precede generic rules so "file server" is not reduced to "server".
const ENTITY_RULES: EntityRule[] = [
  { kind: "database", pattern: /\b(?:aws\s+)?rds\b|\bpostgres(?:ql)?\b|\bmysql\b|\boracle\b|\bsql\s*server\b|\bmongodb\b|\bdatabase\b/gi, label: (m) => titleCase(m) },
  { kind: "app-server", pattern: /\bfile servers?\b|\bmail servers?\b|\bweb servers?\b|\bapplication servers?\b|\bapp servers?\b/gi, label: (m) => titleCase(m) },
  { kind: "app-server", pattern: /\b(?:aws\s+)?ec2\b|\bvirtual servers?\b|\bphysical servers?\b|\bservers?\b|\bvms?\b|\bvirtual machines?\b|\bhost\b(?!\s+(?:an?|the)\b)/gi, label: (m) => titleCase(m.replace(/s$/i, "")) },
  { kind: "app-server", pattern: /\bkubernetes\b|\bk8s\b|\bdocker\b|\bcontainers?\b|\bhypervisor\b|\bvmware\b/gi, label: (m) => titleCase(m), detail: (m) => `Compute platform: ${m}` },
  { kind: "app-server", pattern: /\b(?:aws|amazon web services|azure|gcp|google cloud)(?:\s+(?:resource|instance|service|cloud))?\b/gi, label: (m) => titleCase(m), detail: (m) => `Cloud resource: ${m}` },
  { kind: "firewall", pattern: /\bfirewall\b|\bdmz\b|\bperimeter\b|\brouter\b|\bnetwork switch\b|\bload balancer\b|\breverse proxy\b|\bproxy\b|\bvpn\b|\bgateway\b/gi, label: (m) => titleCase(m) },
  { kind: "database", pattern: /\bnas\b|\bsan\b|\bstorage\b|\bcache\b|\bredis\b|\bqueue\b|\bkafka\b|\brabbitmq\b/gi, label: (m) => titleCase(m) },
  { kind: "identity", pattern: /\bokta\b|\bentra(?: id)?\b|\bactive directory\b|\bauth0\b|\bidentity provider\b|\bidp\b|\bsso\b/gi, label: (m) => titleCase(m) },
  { kind: "saas", pattern: /\bsalesforce(?: service cloud| field service)?\b|\bservicenow\b|\bsap\b|\bsharepoint\b|\bconfluence\b|\bworkday\b|\bzendesk\b|\bslack\b|\boffice 365\b|\bmicrosoft 365\b/gi, label: (m) => titleCase(m) },
  { kind: "integration", pattern: /\bapi gateway\b|\bapi\b|\bconnector\b|\bintegration\b|\betl\b|\bwebhook\b|\bmessage bus\b/gi, label: (m) => titleCase(m) },
  { kind: "endpoint", pattern: /\bdesktop\b|\bpc\b|\bworkstation\b|\blaptop\b|\bphone\b|\bmobile\b|\btablet\b|\bendpoint\b|\bbrowser\b|\busers?\b|\btechnicians?\b|\bagents?\b/gi, label: (m) => titleCase(m) },
];

const OS_PATTERN = /\b(windows(?:\s+(?:98|xp|7|8(?:\.1)?|10|11|server(?:\s+\d{4})?))?|linux|unix|macos|mac\s+os)\b/gi;
const RELATION_PATTERN = /\b(running on|runs on|connected to|connects to|connects through|behind|through|talks to|talking to|uses|hosts|hosted on|authenticates with|authenticates|syncs with|syncs to|syncs|sends to|receives from|writes to|reads from|inside|into|via|on|to)\b/i;

function countBefore(text: string, start: number) {
  const prefix = text.slice(Math.max(0, start - 40), start);
  const match = prefix.match(/(?:^|\s)(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s+[a-z][\w-]*){0,2}\s*$/i);
  if (!match?.[1]) return 1;
  const numeric = Number(match[1]);
  return Math.min(Number.isFinite(numeric) ? numeric : (COUNT_WORDS[match[1].toLowerCase()] ?? 1), 12);
}

function overlaps(drafts: EnvironmentDraft[], start: number, end: number) {
  return drafts.some((draft) => start < draft.end && end > draft.start);
}

/** Deterministic, free-form parser. It always returns at least one draft. */
export function parseEnvironmentText(text: string): EnvironmentDraft[] {
  const input = text.trim();
  const drafts: EnvironmentDraft[] = [];

  for (const rule of ENTITY_RULES) {
    rule.pattern.lastIndex = 0;
    for (const match of input.matchAll(rule.pattern)) {
      const phrase = match[0];
      const start = match.index ?? 0;
      const end = start + phrase.length;
      if (overlaps(drafts, start, end)) continue;
      drafts.push({
        kind: rule.kind,
        label: rule.label(phrase),
        count: countBefore(input, start),
        detail: rule.detail?.(phrase) ?? `Interpreted from: “${phrase}”.`,
        sourcePhrase: phrase,
        start,
        end,
      });
    }
  }

  // Preserve explicit or unusual names without requiring a product dictionary.
  const namedPatterns = [
    /\b(?:thing|system|service|platform|server)\s+(?:called|named)\s+([A-Za-z][A-Za-z0-9_-]{2,})\b/gi,
    /\b([A-Z][a-z]+(?:Server|Box|Cloud|DB|API|App|Hub|Net))\b/g,
  ];
  for (const pattern of namedPatterns) {
    for (const match of input.matchAll(pattern)) {
      const label = match[1];
      if (!label) continue;
      const relative = match[0].lastIndexOf(label);
      const start = (match.index ?? 0) + relative;
      const end = start + label.length;
      if (overlaps(drafts, start, end)) continue;
      drafts.push({
        kind: /server|api|app/i.test(label) ? "app-server" : "boundary",
        label,
        count: 1,
        detail: `Unknown named system: ${label}. Classification requires review.`,
        sourcePhrase: label,
        start,
        end,
        uncertain: true,
      });
    }
  }

  const operatingSystems = Array.from(input.matchAll(OS_PATTERN));
  for (const osMatch of operatingSystems) {
    const os = osMatch[0];
    const osStart = osMatch.index ?? 0;
    const compute = drafts
      .filter((draft) => draft.kind === "app-server" || draft.kind === "endpoint")
      .sort((a, b) => Math.abs(a.start - osStart) - Math.abs(b.start - osStart))[0];
    if (compute) compute.detail = `${compute.detail} Operating system: ${titleCase(os)}.`;
    else {
      drafts.push({
        kind: "app-server",
        label: `${titleCase(os)} host`,
        count: 1,
        detail: `Operating system: ${titleCase(os)}. Hardware role requires review.`,
        sourcePhrase: os,
        start: osStart,
        end: osStart + os.length,
        uncertain: true,
      });
    }
  }

  if (!drafts.length) {
    const phrase = input || "Unspecified environment component";
    drafts.push({
      kind: "boundary",
      label: phrase.length > 54 ? `${phrase.slice(0, 53)}…` : phrase,
      count: 1,
      detail: `Unclassified component from user notes: “${phrase}”. Needs review.`,
      sourcePhrase: phrase,
      start: 0,
      end: phrase.length,
      uncertain: true,
    });
  }

  return drafts.sort((a, b) => a.start - b.start);
}

const COLUMN_BY_KIND: Record<NodeKind, number> = {
  endpoint: 0, identity: 0, firewall: 1, boundary: 1, integration: 2,
  "app-server": 2, saas: 3, database: 4,
};

function layout(drafts: EnvironmentDraft[], customerId: string, provenance: Provenance) {
  const nodes: EnvironmentNode[] = [];
  const nodeIdsByDraft: string[][] = [];
  const perColumn: Record<number, number> = {};
  const usedColumns = Array.from(new Set(drafts.map((draft) => COLUMN_BY_KIND[draft.kind]))).sort((a, b) => a - b);
  const columnIndex = new Map(usedColumns.map((column, index) => [column, index]));
  let idIndex = 0;
  for (const draft of drafts) {
    const ids: string[] = [];
    for (let item = 0; item < draft.count; item++) {
      const column = columnIndex.get(COLUMN_BY_KIND[draft.kind]) ?? 0;
      const row = perColumn[column] ?? 0;
      perColumn[column] = row + 1;
      const id = `${customerId}-gen-${idIndex++}`;
      ids.push(id);
      nodes.push({
        id,
        customerId,
        label: draft.count > 1 ? `${draft.label} ${item + 1}` : draft.label,
        kind: draft.kind,
        x: 40 + column * 196,
        y: 40 + row * 100,
        detail: `${draft.detail} Proposed record; confirm before approval.`,
        provenance,
        sourceNote: `Generated from “${draft.sourcePhrase}”`,
      });
    }
    nodeIdsByDraft.push(ids);
  }
  return { nodes, nodeIdsByDraft };
}

function relationshipLabel(text: string) {
  const match = text.match(RELATION_PATTERN)?.[1]?.toLowerCase();
  if (!match) return "related to";
  if (/authenticates/.test(match)) return "authentication";
  if (/syncs/.test(match)) return "sync";
  if (/writes/.test(match)) return "writes";
  if (/reads/.test(match)) return "reads";
  if (/\binto\b/.test(match)) return "access";
  if (/^to$/.test(match)) return "connected to";
  if (/hosts|running on|runs on|hosted on|inside|\bon\b/.test(match)) return "hosts";
  if (/through|via|behind/.test(match)) return "network path";
  return match;
}

function buildEdges(
  drafts: EnvironmentDraft[],
  nodeIdsByDraft: string[][],
  input: string,
  customerId: string,
): EnvironmentEdge[] {
  const edges: EnvironmentEdge[] = [];
  for (let index = 0; index < drafts.length - 1; index++) {
    const current = drafts[index];
    const next = drafts[index + 1];
    if (!current || !next) continue;
    const between = input.slice(current.end, next.start);
    const sentenceBreak = /[.!?;\n]/.test(between);
    let relation = relationshipLabel(between);
    if (relation === "related to" && index === drafts.length - 2) {
      const trailing = input.slice(next.end);
      const trailingRelation = relationshipLabel(trailing);
      if (trailingRelation !== "related to") relation = trailingRelation;
    }
    if (sentenceBreak && relation === "related to") continue;
    const fromIds = nodeIdsByDraft[index] ?? [];
    const toIds = nodeIdsByDraft[index + 1] ?? [];
    for (const from of fromIds) {
      for (const to of toIds) {
        edges.push({
          id: `${customerId}-gene-${edges.length}`,
          customerId,
          from,
          to,
          label: relation,
          flow: relation === "authentication" ? "auth" : /network|connect|through|via|behind/.test(relation) ? "network" : "data",
          provenance: "working-assumption",
        });
      }
    }
  }
  return edges;
}

export const demoProvider: EnvironmentProvider = {
  mode: "demo",
  async generate({ customerId, freeText, approvedSourceTitles, approvedSourceText = "" }) {
    const combined = [freeText.trim(), approvedSourceText.trim()].filter(Boolean).join("\n");
    const drafts = parseEnvironmentText(combined);
    const { nodes, nodeIdsByDraft } = layout(drafts, customerId, "working-assumption");
    const edges = buildEdges(drafts, nodeIdsByDraft, combined, customerId);
    const uncertain = drafts.filter((draft) => draft.uncertain);
    const confidence: GenerationResult["confidence"] = uncertain.length || drafts.length === 1 ? "low" : drafts.length >= 3 ? "medium" : "low";
    const interpretation = drafts
      .slice(0, 4)
      .map((draft) => `${draft.sourcePhrase} as ${draft.label}${draft.detail.includes("Operating system:") ? ` (${draft.detail.match(/Operating system: ([^.]+)/)?.[1] ?? "OS detected"})` : ""}`)
      .join("; ");
    return {
      nodes,
      edges,
      confidence,
      provenanceLabel: "Proposed from approved sources and user notes",
      notes: [
        `${confidence === "low" ? "Low confidence" : "Best-effort interpretation"}: interpreted ${interpretation}. ${confidence === "low" ? "Needs review." : "Review relationships before approval."}`,
        approvedSourceTitles.length
          ? `Approved sources considered: ${approvedSourceTitles.join(", ")}.`
          : "Generated from user-entered notes only.",
        "Generated locally. No external research service was required.",
      ],
    };
  },
};

export const controlPlaneProvider: EnvironmentProvider = {
  mode: "controlPlane",
  async generate() {
    // TODO(secure-integration-boundary): call a server function that may use an
    // approved research provider such as Exa AI. Credentials stay server-side.
    throw new Error("External environment enrichment is not configured.");
  },
  async enrichUnknownTerms() {
    // Same future server-side seam. Local parsing succeeds without enrichment.
    throw new Error("External term enrichment is not configured.");
  },
};

export function getEnvironmentProvider(mode: ProviderMode): EnvironmentProvider {
  return mode === "controlPlane" ? controlPlaneProvider : demoProvider;
}