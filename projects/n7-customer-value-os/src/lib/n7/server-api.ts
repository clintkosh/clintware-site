import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

type JsonValue = unknown;

async function controlPlane(path: string, init?: RequestInit) {
  const binding = (env as unknown as { CONTROL_PLANE?: { fetch: typeof fetch } }).CONTROL_PLANE;
  if (!binding) throw new Error("Clintware Control Plane binding is unavailable.");
  const headers = new Headers(init?.headers);
  headers.set("x-clintware-service-product", "neuron7-case");
  headers.set("x-clintware-service-worker", "n7-customer-value-os");
  const response = await binding.fetch(`https://mcp.clintware.internal${path}`, {
    ...init,
    headers,
  });
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
  .validator((data: { state: JsonValue; expectedRevision?: number | null }) => data)
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
  .validator((data: JiraBridgeInput) => data)
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
  .validator(
    (data: {
      task: string;
      prompt: string;
      context?: JsonValue;
      researchQuery?: string | undefined;
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


export const transcribeN7Audio = createServerFn({ method: "POST" })
  .validator(
    (data: {
      audioBase64: string;
      mimeType?: string;
      language?: string;
      initialPrompt?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return controlPlane("/api/v1/audio/transcribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        product: "neuron7-case",
        audio_base64: data.audioBase64,
        mime_type: data.mimeType || "audio/webm",
        language: data.language || "en",
        initial_prompt: data.initialPrompt || "",
      }),
    });
  });

export const jiraConnectionStatus = createServerFn({ method: "GET" }).handler(async () => {
  return controlPlane("/api/v1/jira/status", { method: "GET" });
});

export const beginJiraOAuth = createServerFn({ method: "POST" }).handler(async () => {
  return controlPlane("/api/v1/jira/oauth/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ product: "neuron7-case" }),
  });
});
