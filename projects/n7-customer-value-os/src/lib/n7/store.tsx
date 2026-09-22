import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CUSTOMER_ONE, RETIRED_OFFICIAL_RECORD_IDS } from "./seed";
import type {
  Customer,
  CustomerWorkspace,
  Decision,
  DocumentSource,
  EnvironmentEdge,
  EnvironmentNode,
  GoldenQuery,
  ID,
  Incident,
  MeetingRecord,
  Milestone,
  TriageRecord,
} from "./types";


const STORAGE_KEY = "n7-cvos-state-v1";

export interface NewCustomerInput {
  name: string;
  industry: string;
  businessOutcome: string;
  baseline: string;
  target: string;
  users: string;
  useCases: string;
  systems: string;
  stakeholders: string;
  implementationTarget: string;
  successCriteria: string;
}

export interface AppState {
  workspaces: CustomerWorkspace[];
  /** Assumption-override ids currently active (scenario mode). */
  activeOverrides: ID[];
  presentationMode: boolean;
  audience: "executive" | "technical";
  providerMode: "demo" | "controlPlane";
  tourSeen: boolean;
}

const initialState: AppState = {
  workspaces: [CUSTOMER_ONE],
  activeOverrides: [],
  presentationMode: false,
  audience: "executive",
  providerMode: "demo",
  tourSeen: true,
};

export function buildWorkspace(input: NewCustomerInput): CustomerWorkspace {
  const id = `cust-${Date.now().toString(36)}`;
  const systems = input.systems
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const people = input.stakeholders
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const nodes: EnvironmentNode[] = [
    {
      id: `${id}-users`,
      customerId: id,
      label: input.users || "End users",
      kind: "endpoint",
      x: 80,
      y: 140,
      detail: input.useCases || "Primary use cases pending discovery.",
      provenance: "working-assumption",
    },
    {
      id: `${id}-platform`,
      customerId: id,
      label: "Intelligent Search layer",
      kind: "saas",
      x: 340,
      y: 140,
      detail: "Unified search across the customer's content systems.",
      provenance: "working-assumption",
    },
    ...systems.map((sys, i) => ({
      id: `${id}-sys-${i}`,
      customerId: id,
      label: sys,
      kind: "saas" as const,
      x: 620,
      y: 40 + i * 110,
      detail: "Captured in the Add Customer wizard. Not yet validated.",
      provenance: "working-assumption" as const,
    })),
  ];

  const edges: EnvironmentEdge[] = [
    {
      id: `${id}-e-users`,
      customerId: id,
      from: `${id}-users`,
      to: `${id}-platform`,
      label: "search",
      flow: "data",
      provenance: "working-assumption",
    },
    ...systems.map((_, i) => ({
      id: `${id}-e-sys-${i}`,
      customerId: id,
      from: `${id}-platform`,
      to: `${id}-sys-${i}`,
      label: "content sync",
      flow: "data" as const,
      provenance: "working-assumption" as const,
    })),
  ];

  return {
    customer: {
      id,
      name: input.name,
      industry: input.industry,
      isOfficialCase: false,
      health: "watch",
      stage: "discovery",
      targetOutcome: input.businessOutcome,
      users: input.users,
      nextMilestone: "W1 — discovery, integration inventory, baseline workshop",
      nextExecutiveTouch: "Week 2 sponsor review",
      headline: `Created in the Add Customer wizard. Target: ${input.implementationTarget || "to be agreed"}.`,
      createdAt: new Date().toISOString().slice(0, 10),
      provenance: "user-entered",
    },
    stakeholders: people.map((p, i) => ({
      id: `${id}-sh-${i}`,
      customerId: id,
      name: p,
      role: "Captured during onboarding",
      side: "customer" as const,
      interest: "Interest to be confirmed in discovery.",
      provenance: "user-entered" as const,
    })),
    outcomes: [
      {
        id: `${id}-out`,
        customerId: id,
        statement: input.businessOutcome,
        horizon: input.implementationTarget || "To be agreed",
        valueHypothesis: input.useCases || "Value hypothesis pending discovery.",
        provenance: "user-entered",
      },
    ],
    kpis: [
      {
        id: `${id}-kpi`,
        customerId: id,
        name: input.businessOutcome || "Primary business outcome",
        kind: "lagging",
        unit: "as defined",
        baseline: input.baseline || "Pending baseline workshop",
        target: input.target || "Pending",
        current: "Not yet measured",
        trend: "flat",
        goodDirection: "down",
        contract: {
          metricName: input.businessOutcome || "Primary outcome metric",
          businessDefinition: "To be agreed in the ROI baseline workshop.",
          numerator: "TBD",
          denominator: "TBD",
          cohort: input.users || "TBD",
          startTimestamp: "TBD",
          stopTimestamp: "TBD",
          baselineWindow: input.baseline || "TBD",
          comparisonWindow: "TBD",
          exclusions: "TBD",
          sourceSystem: systems[0] ?? "TBD",
          sourceOwner: people[0] ?? "TBD",
          refreshCadence: "Weekly",
          confidenceNote: "New customer. No approved baseline yet.",
        },
        provenance: "user-entered",
      },
    ],
    milestones: [
      {
        id: `${id}-ms-1`,
        customerId: id,
        week: "W1",
        title: "Discovery, integration inventory, decision rights",
        detail: "Same Week-1 pattern as the reference implementation.",
        track: "governance",
        owner: "CS / Implementation",
        status: "in-progress",
        provenance: "user-entered",
      },
      {
        id: `${id}-ms-2`,
        customerId: id,
        week: "W1",
        title: "ROI baseline workshop",
        detail: "Metric contract, cohort, timestamps, exclusions, data owners.",
        track: "parallel",
        owner: "CS / Implementation",
        status: "planned",
        provenance: "user-entered",
      },
      {
        id: `${id}-ms-3`,
        customerId: id,
        week: "W1–W2",
        title: "Engineering readiness review for custom / unknown connectors",
        detail: "Readiness gate control applied before any customer-committed date.",
        track: "critical-path",
        owner: "Engineering",
        status: "planned",
        provenance: "user-entered",
      },
    ],
    dependencies: systems.map((sys, i) => ({
      id: `${id}-dep-${i}`,
      customerId: id,
      name: `${sys} content availability`,
      owner: people[0] ?? "Customer owner TBD",
      type: "customer" as const,
      status: "not-started" as const,
      blocksGoLive: true,
      note: "Connector status must be verified before a date is committed.",
      provenance: "user-entered" as const,
    })),
    risks: [
      {
        id: `${id}-risk-1`,
        customerId: id,
        title: "Connector status unverified for one or more source systems",
        category: "technical",
        impact: "high",
        likelihood: "medium",
        mitigation: "Readiness gate review before any customer-committed date.",
        owner: "CS / Implementation",
        trigger: "Any source system marked unknown or custom.",
        status: "open",
        provenance: "user-entered",
      },
      {
        id: `${id}-risk-2`,
        customerId: id,
        title: "No approved baseline for the target outcome",
        category: "quality",
        impact: "high",
        likelihood: "medium",
        mitigation: "Baseline workshop and metric contract before launch.",
        owner: "CS / Implementation",
        trigger: "Baseline not approved before build completion.",
        status: "open",
        provenance: "user-entered",
      },
    ],
    decisions: [
      {
        id: `${id}-dec-1`,
        customerId: id,
        date: "W1",
        title: "Apply the readiness gate before committing a date",
        decision: "No customer-committed date until integration readiness is validated.",
        rationale: "Reusable control derived from the reference implementation root cause.",
        decidedBy: "CS / Implementation",
        type: "human-decision",
        alternatives: "Commit to a date on commercial pressure (rejected).",
        provenance: "human-decision",
      },
    ],
    raci: [
      {
        id: `${id}-raci-1`,
        customerId: id,
        activity: "Integrated customer plan and RAID",
        responsible: "CS / Implementation",
        accountable: "CSM / Implementation Lead",
        consulted: "Engineering, Customer PM",
        informed: "Leadership",
        provenance: "user-entered",
      },
    ],
    nodes,
    edges,
    integrations: systems.map((sys, i) => ({
      id: `${id}-int-${i}`,
      customerId: id,
      system: sys,
      purpose: "Content or workflow source captured in onboarding",
      connectorStatus: "unknown" as const,
      authModel: "TBD",
      owner: people[0] ?? "TBD",
      blocksGoLive: true,
      provenance: "user-entered" as const,
    })),
    adoption: [],
    incidents: [],
    valueEvents: [
      {
        id: `${id}-ve-1`,
        customerId: id,
        date: "W1",
        title: "Success criteria captured",
        detail: input.successCriteria || "Success criteria to be agreed.",
        provenance: "user-entered",
      },
    ],
    documents: [
      {
        id: `${id}-doc-1`,
        customerId: id,
        title: "Onboarding wizard capture",
        kind: "crm-note",
        owner: "CS / Implementation",
        freshness: "Today",
        approved: true,
        confidence: "medium",
        lastSync: "Today",
        relevantSystems: systems,
        content: `Outcome: ${input.businessOutcome}. Baseline: ${input.baseline}. Target: ${input.target}. Users: ${input.users}. Use cases: ${input.useCases}. Systems: ${input.systems}. Success criteria: ${input.successCriteria}.`,
        provenance: "user-entered",
      },
    ],
    goldenQueries: [],
    readiness: [
      { id: `${id}-rg-1`, label: "Data sources", group: "Data", value: input.systems, blocking: true },
      { id: `${id}-rg-2`, label: "Source owners", group: "Data", value: input.stakeholders, blocking: true },
      {
        id: `${id}-rg-3`,
        label: "Connector status (prebuilt / custom / unknown)",
        group: "Integration",
        value: "Unknown — Engineering review required",
        blocking: true,
      },
      { id: `${id}-rg-4`, label: "ROI metric", group: "Value", value: input.businessOutcome, blocking: false },
      { id: `${id}-rg-5`, label: "Baseline", group: "Value", value: input.baseline || "Pending", blocking: true },
      { id: `${id}-rg-6`, label: "Date confidence", group: "Governance", value: "Low until readiness review completes", blocking: true },
    ],
    messages: [],
    assumptions: [
      {
        id: `${id}-asm-1`,
        customerId: id,
        statement: "All entries from the onboarding wizard are unvalidated until discovery confirms them.",
        validationPath: "Discovery workshop and integration inventory.",
        owner: "CS / Implementation",
      },
    ],
  };
}

interface StoreValue extends AppState {
  addCustomer: (input: NewCustomerInput) => string;
  getWorkspace: (id: ID) => CustomerWorkspace | undefined;
  /** The untouched seeded case workspace, used to show what a case fact originally said. */
  getBaseline: (id: ID) => CustomerWorkspace | undefined;
  toggleOverride: (id: ID) => void;
  clearOverrides: () => void;
  setPresentationMode: (v: boolean) => void;
  setAudience: (v: "executive" | "technical") => void;
  setProviderMode: (v: "demo" | "controlPlane") => void;
  setTourSeen: (v: boolean) => void;
  updateNodes: (customerId: ID, nodes: EnvironmentNode[]) => void;
  updateEdges: (customerId: ID, edges: EnvironmentEdge[]) => void;
  addDocument: (customerId: ID, doc: DocumentSource) => void;
  addDecision: (customerId: ID, decision: Decision) => void;
  addIncident: (customerId: ID, incident: Incident) => void;
  updateIncident: (customerId: ID, incidentId: ID, patch: Partial<Incident>) => void;
  addGoldenQuery: (customerId: ID, query: GoldenQuery) => void;
  updateGoldenQuery: (customerId: ID, queryId: ID, patch: Partial<GoldenQuery>) => void;
  upsertTriageRecord: (customerId: ID, record: TriageRecord) => void;
  /** Generic, typed workspace patch used by every inline edit surface. */
  patchWorkspace: (customerId: ID, patch: Partial<CustomerWorkspace>) => void;
  updateCustomer: (customerId: ID, patch: Partial<Customer>) => void;
  /** Update one item inside any array-valued workspace collection, by id. */
  updateItem: <K extends CollectionKey>(
    customerId: ID,
    collection: K,
    itemId: ID,
    patch: Partial<CollectionItem<K>>,
  ) => void;
  addMilestone: (customerId: ID, milestone: Milestone) => void;
  recordMeeting: (customerId: ID, record: MeetingRecord) => void;
  lastMeeting: (customerId: ID) => MeetingRecord | undefined;
  resetDemo: () => void;
}

type ArrayKeys<T> = {
  [K in keyof T]: T[K] extends Array<{ id: ID }> | undefined ? K : never;
}[keyof T];
export type CollectionKey = Exclude<ArrayKeys<CustomerWorkspace>, undefined>;
type CollectionItem<K extends CollectionKey> = NonNullable<CustomerWorkspace[K]> extends Array<
  infer I
>
  ? I
  : never;

const StoreContext = createContext<StoreValue | null>(null);

const RETIRED_IDS = new Set<string>(RETIRED_OFFICIAL_RECORD_IDS);

/**
 * Saved-data migration for the official case.
 * Earlier versions persisted sample records that were not supplied in the case
 * materials. Those exact ids are dropped on load. Anything a person created in
 * the app has a different id and is preserved untouched.
 */
function sanitizeOfficial(ws: CustomerWorkspace): CustomerWorkspace {
  const clean = <T extends { id: string }>(rows: T[] | undefined): T[] =>
    (rows ?? []).filter((r) => !RETIRED_IDS.has(r.id));
  return {
    ...ws,
    // The official case keeps its seed identity even if an older saved id differs.
    customer: { ...ws.customer, id: CUSTOMER_ONE.customer.id },
    stakeholders: clean(ws.stakeholders),
    kpis: clean(ws.kpis),
    milestones: clean(ws.milestones),
    dependencies: clean(ws.dependencies),
    risks: clean(ws.risks),
    decisions: clean(ws.decisions),
    raci: clean(ws.raci),
    integrations: clean(ws.integrations),
    adoption: clean(ws.adoption),
    incidents: clean(ws.incidents),
    valueEvents: clean(ws.valueEvents),
    documents: clean(ws.documents),
    goldenQueries: clean(ws.goldenQueries),
    messages: clean(ws.messages),
    assumptions: clean(ws.assumptions),
    triageRecords: (ws.triageRecords ?? []).filter((t) => !RETIRED_IDS.has(t.incidentId)),
  };
}

export function N7Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed?.workspaces?.length) {
          // Seed shape stays authoritative; persisted edits are layered on top so
          // in-app edits survive a refresh. "Reset demo" restores the seed exactly.
          const persistedOfficial = parsed.workspaces.find((w) => w.customer.isOfficialCase);
          const extras = parsed.workspaces.filter((w) => !w.customer.isOfficialCase);
          setState({
            ...initialState,
            ...parsed,
            // Scenarios are temporary working overlays. They never reopen in the live plan.
            activeOverrides: [],
            presentationMode: false,
            providerMode: "demo",
            tourSeen: true,
            workspaces: [
              persistedOfficial
                ? sanitizeOfficial({ ...CUSTOMER_ONE, ...persistedOfficial })
                : CUSTOMER_ONE,
              ...extras,
            ],
          });
        }
      }
    } catch {
      /* ignore corrupt local state */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          activeOverrides: [],
          presentationMode: false,
          providerMode: "demo",
          tourSeen: true,
        }),
      );
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const addCustomer = useCallback((input: NewCustomerInput) => {
    const ws = buildWorkspace(input);
    setState((s) => ({ ...s, workspaces: [...s.workspaces, ws] }));
    return ws.customer.id;
  }, []);

  const mapWorkspace = useCallback(
    (customerId: ID, fn: (w: CustomerWorkspace) => CustomerWorkspace) =>
      setState((s) => ({
        ...s,
        workspaces: s.workspaces.map((w) => (w.customer.id === customerId ? fn(w) : w)),
      })),
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      addCustomer,
      getWorkspace: (id) => state.workspaces.find((w) => w.customer.id === id),
      getBaseline: (id) => (CUSTOMER_ONE.customer.id === id ? CUSTOMER_ONE : undefined),
      toggleOverride: (id) =>
        setState((s) => ({
          ...s,
          activeOverrides: s.activeOverrides.includes(id)
            ? s.activeOverrides.filter((o) => o !== id)
            : [...s.activeOverrides, id],
        })),
      clearOverrides: () => setState((s) => ({ ...s, activeOverrides: [] })),
      setPresentationMode: (v) => setState((s) => ({ ...s, presentationMode: v })),
      setAudience: (v) => setState((s) => ({ ...s, audience: v })),
      setProviderMode: (v) => setState((s) => ({ ...s, providerMode: v })),
      setTourSeen: (v) => setState((s) => ({ ...s, tourSeen: v })),
      updateNodes: (customerId, nodes) => mapWorkspace(customerId, (w) => ({ ...w, nodes })),
      updateEdges: (customerId, edges) => mapWorkspace(customerId, (w) => ({ ...w, edges })),
      addDocument: (customerId, doc) =>
        mapWorkspace(customerId, (w) => ({ ...w, documents: [...w.documents, doc] })),
      addDecision: (customerId, decision) =>
        mapWorkspace(customerId, (w) => ({ ...w, decisions: [...w.decisions, decision] })),
      addIncident: (customerId, incident) =>
        mapWorkspace(customerId, (w) => ({ ...w, incidents: [...w.incidents, incident] })),
      updateIncident: (customerId, incidentId, patch) =>
        mapWorkspace(customerId, (w) => ({
          ...w,
          incidents: w.incidents.map((incident) =>
            incident.id === incidentId ? { ...incident, ...patch } : incident,
          ),
        })),
      addGoldenQuery: (customerId, query) =>
        mapWorkspace(customerId, (w) => ({ ...w, goldenQueries: [...w.goldenQueries, query] })),
      updateGoldenQuery: (customerId, queryId, patch) =>
        mapWorkspace(customerId, (w) => ({
          ...w,
          goldenQueries: w.goldenQueries.map((query) =>
            query.id === queryId ? { ...query, ...patch } : query,
          ),
        })),
      upsertTriageRecord: (customerId, record) =>
        mapWorkspace(customerId, (w) => {
          const records = w.triageRecords ?? [];
          const exists = records.some((item) => item.incidentId === record.incidentId);
          return {
            ...w,
            triageRecords: exists
              ? records.map((item) => (item.incidentId === record.incidentId ? record : item))
              : [...records, record],
          };
        }),
      patchWorkspace: (customerId, patch) => mapWorkspace(customerId, (w) => ({ ...w, ...patch })),
      updateCustomer: (customerId, patch) =>
        mapWorkspace(customerId, (w) => ({ ...w, customer: { ...w.customer, ...patch } })),
      updateItem: (customerId, collection, itemId, patch) =>
        mapWorkspace(customerId, (w) => {
          const list = (w[collection] ?? []) as { id: ID }[];
          return {
            ...w,
            [collection]: list.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
          } as CustomerWorkspace;
        }),
      addMilestone: (customerId, milestone) =>
        mapWorkspace(customerId, (w) => ({ ...w, milestones: [...w.milestones, milestone] })),
      recordMeeting: (customerId, record) =>
        mapWorkspace(customerId, (w) => ({ ...w, meetings: [...(w.meetings ?? []), record] })),
      lastMeeting: (customerId) => {
        const list = state.workspaces.find((w) => w.customer.id === customerId)?.meetings ?? [];
        return list[list.length - 1];
      },
      resetDemo: () => setState(initialState),
    }),
    [state, addCustomer, mapWorkspace],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useN7() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useN7 must be used inside N7Provider");
  return ctx;
}