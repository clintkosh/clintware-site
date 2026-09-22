/**
 * N7 Customer Value OS — reusable domain model.
 *
 * Every entity here is customer-agnostic. Customer #1 (the official case
 * customer) is seeded data, not a special type.
 */

/** Provenance classification applied across the whole product. */
export type Provenance =
  | "case-fact"
  | "working-assumption"
  | "illustrative"
  | "human-decision"
  | "automated-signal";

export interface Provenanced {
  provenance: Provenance;
  /** Optional pointer to a DocumentSource id or free-text source note. */
  sourceNote?: string;
}

export type ID = string;

export interface Organization {
  id: ID;
  name: string;
  productTitle: string;
  subtitle: string;
}

export type CustomerHealth = "on-track" | "watch" | "at-risk" | "critical";
export type ImplementationStage =
  | "discovery"
  | "design"
  | "build"
  | "test"
  | "uat"
  | "launch"
  | "hypercare"
  | "bau";

export interface Customer {
  id: ID;
  name: string;
  industry: string;
  isOfficialCase: boolean;
  health: CustomerHealth;
  stage: ImplementationStage;
  targetOutcome: string;
  users: string;
  nextMilestone: string;
  nextExecutiveTouch: string;
  headline: string;
  createdAt: string;
  provenance: Provenance;
}

export interface Stakeholder {
  id: ID;
  customerId: ID;
  name: string;
  role: string;
  side: "customer" | "internal";
  interest: string;
  provenance: Provenance;
}

export interface Outcome {
  id: ID;
  customerId: ID;
  statement: string;
  horizon: string;
  valueHypothesis: string;
  provenance: Provenance;
}

export interface MetricContract {
  metricName: string;
  businessDefinition: string;
  numerator: string;
  denominator: string;
  cohort: string;
  startTimestamp: string;
  stopTimestamp: string;
  baselineWindow: string;
  comparisonWindow: string;
  exclusions: string;
  sourceSystem: string;
  sourceOwner: string;
  refreshCadence: string;
  confidenceNote: string;
}

export interface KPI {
  id: ID;
  customerId: ID;
  name: string;
  kind: "leading" | "lagging";
  unit: string;
  baseline: string;
  target: string;
  current: string;
  trend: "up" | "down" | "flat";
  goodDirection: "up" | "down";
  contract: MetricContract;
  provenance: Provenance;
}

export interface Milestone {
  id: ID;
  customerId: ID;
  week: string;
  title: string;
  detail: string;
  track: "critical-path" | "parallel" | "hypercare" | "governance";
  owner: string;
  status: "done" | "in-progress" | "planned" | "blocked";
  provenance: Provenance;
}

export interface Dependency {
  id: ID;
  customerId: ID;
  name: string;
  owner: string;
  type: "customer" | "engineering" | "vendor" | "internal";
  status: "ready" | "in-progress" | "not-started" | "blocked";
  blocksGoLive: boolean;
  note: string;
  provenance: Provenance;
}

export interface Risk {
  id: ID;
  customerId: ID;
  title: string;
  category: "schedule" | "technical" | "adoption" | "commercial" | "quality";
  impact: "low" | "medium" | "high";
  likelihood: "low" | "medium" | "high";
  mitigation: string;
  owner: string;
  trigger: string;
  status: "open" | "monitoring" | "closed";
  provenance: Provenance;
}

export interface Decision {
  id: ID;
  customerId: ID;
  date: string;
  title: string;
  decision: string;
  rationale: string;
  decidedBy: string;
  type: "human-decision" | "pending";
  alternatives: string;
  provenance: Provenance;
}

export interface RACIEntry {
  id: ID;
  customerId: ID;
  activity: string;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
  provenance: Provenance;
}

export type NodeKind =
  | "saas"
  | "app-server"
  | "database"
  | "firewall"
  | "endpoint"
  | "integration"
  | "identity"
  | "boundary";

export interface EnvironmentNode {
  id: ID;
  customerId: ID;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  detail: string;
  provenance: Provenance;
  sourceNote?: string;
}

export interface EnvironmentEdge {
  id: ID;
  customerId: ID;
  from: ID;
  to: ID;
  label: string;
  flow: "data" | "auth" | "network";
  provenance: Provenance;
}

export interface Integration {
  id: ID;
  customerId: ID;
  system: string;
  purpose: string;
  connectorStatus: "prebuilt" | "custom" | "unknown" | "not-available";
  authModel: string;
  owner: string;
  blocksGoLive: boolean;
  provenance: Provenance;
}

export interface AdoptionSignal {
  id: ID;
  customerId: ID;
  week: string;
  activeTechnicians: number;
  searches: number;
  successfulSessionRate: number;
  deflectionRate: number;
  medianCycleTimeMin: number;
  p75CycleTimeMin: number;
}

export interface Incident {
  id: ID;
  customerId: ID;
  title: string;
  reportedSymptom: string;
  status: "reported" | "triage" | "isolated" | "resolved";
  openedAt: string;
  segment: string;
  provenance: Provenance;
}

export interface ValueEvent {
  id: ID;
  customerId: ID;
  date: string;
  title: string;
  detail: string;
  provenance: Provenance;
}

export interface DocumentSource {
  id: ID;
  customerId: ID;
  title: string;
  kind: "pdf" | "architecture" | "runbook" | "crm-note" | "kb" | "call-note";
  owner: string;
  freshness: string;
  approved: boolean;
  confidence: "low" | "medium" | "high";
  lastSync: string;
  relevantSystems: string[];
  content: string;
  provenance: Provenance;
}

export interface GoldenQuery {
  id: ID;
  customerId: ID;
  query: string;
  expected: string;
  sourceSystem: "SAP" | "Salesforce";
  productFamily: string;
  version: string;
  lastResult: "pass" | "fail" | "not-run";
}

export interface ReadinessGateField {
  id: ID;
  label: string;
  group: string;
  value: string;
  blocking: boolean;
}

export interface SkillPack {
  id: ID;
  name: string;
  scope: string;
  strengths: string[];
  limits: string;
}

export interface Challenge {
  id: ID;
  prompt: string;
  thirtySecond: string;
  deeper: string;
  evidence: { label: string; section: string };
  redFlag: string;
}

export interface AssumptionToggle {
  id: ID;
  label: string;
  description: string;
  planImpact: string;
  riskImpact: string;
  recommendedDecision: string;
  evidenceNeeded: string;
}

export interface CustomerMessage {
  id: ID;
  customerId: ID;
  title: string;
  audience: string;
  status: "approved-example" | "draft";
  discovered: string;
  impact: string;
  actions: string;
  decisions: string;
  checkpoint: string;
  provenance: Provenance;
}

export interface Assumption {
  id: ID;
  customerId: ID;
  statement: string;
  validationPath: string;
  owner: string;
}

export interface CustomerWorkspace {
  customer: Customer;
  stakeholders: Stakeholder[];
  outcomes: Outcome[];
  kpis: KPI[];
  milestones: Milestone[];
  dependencies: Dependency[];
  risks: Risk[];
  decisions: Decision[];
  raci: RACIEntry[];
  nodes: EnvironmentNode[];
  edges: EnvironmentEdge[];
  integrations: Integration[];
  adoption: AdoptionSignal[];
  incidents: Incident[];
  valueEvents: ValueEvent[];
  documents: DocumentSource[];
  goldenQueries: GoldenQuery[];
  readiness: ReadinessGateField[];
  messages: CustomerMessage[];
  assumptions: Assumption[];
}