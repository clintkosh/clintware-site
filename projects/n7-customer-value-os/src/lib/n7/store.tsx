import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CUSTOMER_ONE, RETIRED_OFFICIAL_RECORD_IDS } from "./seed";
import { loadSharedState, saveSharedState } from "./server-api";
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
  providerMode: "controlPlane",
  tourSeen: true,
};

export function buildWorkspace(input: NewCustomerInput): CustomerWorkspace {
  const id = `cust-${Date.now().toString(36)}`;
  const systems = input.systems.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const people = input.stakeholders.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

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
      nextMilestone: "Not provided",
      nextExecutiveTouch: "Not provided",
      headline: input.successCriteria || "",
      createdAt: new Date().toISOString().slice(0, 10),
      provenance: "user-entered",
    },
    stakeholders: people.map((name, i) => ({
      id: `${id}-sh-${i}`,
      customerId: id,
      name,
      role: "Not provided",
      side: "customer" as const,
      interest: "",
      provenance: "user-entered" as const,
    })),
    outcomes: input.businessOutcome
      ? [{
          id: `${id}-out`,
          customerId: id,
          statement: input.businessOutcome,
          horizon: input.implementationTarget,
          valueHypothesis: input.useCases,
          provenance: "user-entered" as const,
        }]
      : [],
    kpis: input.businessOutcome
      ? [{
          id: `${id}-kpi`,
          customerId: id,
          name: input.businessOutcome,
          kind: "lagging" as const,
          unit: "Not provided",
          baseline: input.baseline || "Not provided",
          target: input.target || "Not provided",
          current: "Not provided",
          trend: "flat" as const,
          goodDirection: "down" as const,
          contract: {
            metricName: input.businessOutcome,
            businessDefinition: "Not provided",
            numerator: "Not provided",
            denominator: "Not provided",
            cohort: input.users || "Not provided",
            startTimestamp: "Not provided",
            stopTimestamp: "Not provided",
            baselineWindow: input.baseline || "Not provided",
            comparisonWindow: "Not provided",
            exclusions: "Not provided",
            sourceSystem: "Not provided",
            sourceOwner: "Not provided",
            refreshCadence: "Not provided",
            confidenceNote: "Only user-entered values are present.",
          },
          provenance: "user-entered" as const,
        }]
      : [],
    milestones: [],
    dependencies: [],
    risks: [],
    decisions: [],
    raci: [],
    workingRaciOwners: [],
    deploymentWork: [],
    sprints: [],
    engineeringIssues: [],
    jira: {},
    nodes: [],
    edges: [],
    integrations: systems.map((system, i) => ({
      id: `${id}-int-${i}`,
      customerId: id,
      system,
      purpose: "",
      connectorStatus: "unknown" as const,
      authModel: "Not provided",
      owner: "Not provided",
      blocksGoLive: false,
      provenance: "user-entered" as const,
    })),
    adoption: [],
    incidents: [],
    triageRecords: [],
    valueEvents: [],
    documents: [],
    goldenQueries: [],
    readiness: [],
    messages: [],
    assumptions: [],
    meetings: [],
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
  const [serverReady, setServerReady] = useState(false);
  const revisionRef = useRef<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizeState = useCallback((parsed: AppState): AppState => {
    const persistedOfficial = parsed.workspaces?.find((w) => w.customer.isOfficialCase);
    const extras = (parsed.workspaces ?? []).filter((w) => !w.customer.isOfficialCase);
    return {
      ...initialState,
      ...parsed,
      activeOverrides: [],
      presentationMode: false,
      providerMode: "controlPlane",
      tourSeen: true,
      workspaces: [
        persistedOfficial ? sanitizeOfficial({ ...CUSTOMER_ONE, ...persistedOfficial }) : CUSTOMER_ONE,
        ...extras,
      ],
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      let local: AppState | null = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) local = JSON.parse(raw) as AppState;
      } catch {
        local = null;
      }

      if (local?.workspaces?.length && !cancelled) setState(normalizeState(local));

      try {
        const remote = (await loadSharedState()) as {
          state?: AppState | null;
          revision?: number;
        };
        if (!cancelled) {
          revisionRef.current = Number(remote?.revision ?? 0);
          if (remote?.state?.workspaces?.length) setState(normalizeState(remote.state));
        }
      } catch (error) {
        console.warn("N7 shared state unavailable; using local cache.", error);
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setServerReady(true);
        }
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [normalizeState]);

  useEffect(() => {
    if (!hydrated) return;
    const persisted: AppState = {
      ...state,
      activeOverrides: [],
      presentationMode: false,
      providerMode: "controlPlane",
      tourSeen: true,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      /* local cache unavailable */
    }

    if (!serverReady) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveSharedState({ data: { state: persisted, expectedRevision: revisionRef.current } })
        .then((result: any) => {
          revisionRef.current = Number(result?.revision ?? revisionRef.current ?? 0);
        })
        .catch(async (error: any) => {
          if (error?.status !== 409) {
            console.warn("N7 shared state save failed; local cache retained.", error);
            return;
          }
          try {
            const remote = (await loadSharedState()) as { state?: AppState | null; revision?: number };
            revisionRef.current = Number(remote?.revision ?? 0);
            if (remote?.state?.workspaces?.length) setState(normalizeState(remote.state));
          } catch (reloadError) {
            console.warn("N7 shared state conflict reload failed.", reloadError);
          }
        });
    }, 450);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, hydrated, serverReady, normalizeState]);

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