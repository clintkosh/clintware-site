import { env } from "cloudflare:workers";

type Binding = { fetch: typeof fetch };

function binding(): Binding {
  const value = (env as unknown as { CONTROL_PLANE?: Binding }).CONTROL_PLANE;
  if (!value) throw new Error("Clintware Control Plane binding is unavailable.");
  return value;
}

function serviceHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("x-clintware-service-product", "neuron7-case");
  headers.set("x-clintware-service-worker", "n7-customer-value-os");
  return headers;
}

async function call(path: string, init?: RequestInit) {
  return binding().fetch(`https://mcp.clintware.internal${path}`, {
    ...init,
    headers: serviceHeaders(init?.headers),
  });
}

async function json(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || `HTTP ${response.status}` };
  }
}

export async function probeN7ControlPlane() {
  const stateResponse = await call("/api/v1/state?product=neuron7-case", { method: "GET" });
  const state = await json(stateResponse);
  if (!stateResponse.ok) {
    throw new Error(state?.error || `State probe failed (${stateResponse.status})`);
  }

  const aiResponse = await call("/api/v1/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      product: "neuron7-case",
      task: "health-check",
      prompt: "Return exactly OK. Do not use external research.",
      context: {},
    }),
  });
  const ai = await json(aiResponse);
  if (!aiResponse.ok) {
    throw new Error(ai?.error || `AI probe failed (${aiResponse.status})`);
  }

  // Deliberately omit audio. A correctly authorized request reaches the audio
  // provider and returns audio_required (400). Unauthorized would be 401.
  const audioResponse = await call("/api/v1/audio/transcribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      product: "neuron7-case",
      audio_base64: "",
      mime_type: "audio/webm",
      language: "en",
    }),
  });
  const audio = await json(audioResponse);
  const audioAuthorized =
    audioResponse.status === 400 && String(audio?.error || "") === "audio_required";
  if (!audioAuthorized) {
    throw new Error(
      audio?.error ||
        `Audio authorization probe returned unexpected status ${audioResponse.status}`,
    );
  }

  const jiraResponse = await call("/api/v1/jira/bridge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      product: "neuron7-case",
      operation: "status",
      args: {},
    }),
  });
  const jira = await json(jiraResponse);
  if (!jiraResponse.ok) {
    throw new Error(jira?.error || `Jira bridge probe failed (${jiraResponse.status})`);
  }

  return {
    ok: true,
    revision: Number(state?.revision ?? 0),
    state: "ready",
    ai: ai?.available ? "ready" : ai?.reason || "reachable",
    audio: "authorized",
    jira: {
      authorized: true,
      configured: Boolean(jira?.configured),
      connected: Boolean(jira?.connected),
    },
  };
}
