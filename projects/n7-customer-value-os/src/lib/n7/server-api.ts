import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

async function controlPlane(path: string, init?: RequestInit) {
  const binding = (env as unknown as { CONTROL_PLANE?: { fetch: typeof fetch } }).CONTROL_PLANE;
  if (!binding) throw new Error("Clintware Control Plane binding is unavailable.");
  const response = await binding.fetch(`https://mcp.clintware.internal${path}`, init);
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `HTTP ${response.status}` };
  }
  if (!response.ok) {
    const error = new Error(data?.error || `Control Plane request failed (${response.status})`) as Error & {
      status?: number;
      payload?: unknown;
    };
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

export const loadSharedState = createServerFn({ method: "GET" }).handler(async () => {
  return controlPlane("/api/v1/state?product=neuron7-case", { method: "GET" });
});

export const saveSharedState = createServerFn({ method: "POST" })
  .inputValidator((data: { state: JsonValue; expectedRevision?: number | null }) => data)
  .handler(async ({ data }) => {
    return controlPlane("/api/v1/state?product=neuron7-case", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        product: "neuron7-case",
        state: data.state,
        expected_revision: data.expectedRevision ?? null,
        actor: "n7crm-web",
      }),
    });
  });

export type JiraBridgeInput = {
  operation:
    | "status"
    | "sites"
    | "projects"
    | "search"
    | "get"
    | "create"
    | "update"
    | "comment"
    | "transitions"
    | "transition";
  args?: Record<string, unknown>;
};

export const jiraBridge = createServerFn({ method: "POST" })
  .inputValidator((data: JiraBridgeInput) => data)
  .handler(async ({ data }) => {
    return controlPlane("/api/v1/jira/bridge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        product: "neuron7-case",
        operation: data.operation,
        args: data.args ?? {},
      }),
    });
  });

export const invokeN7AI = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      task: string;
      prompt: string;
      context?: JsonValue;
      researchQuery?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return controlPlane("/api/v1/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        product: "neuron7-case",
        task: data.task,
        prompt: data.prompt,
        context: data.context ?? {},
        research_query: data.researchQuery || undefined,
      }),
    });
  });
