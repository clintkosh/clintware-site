import { env } from "cloudflare:workers";

const SERVICE_HEADERS = {
  "x-clintware-service-product": "neuron7-case",
  "x-clintware-service-worker": "n7-customer-value-os",
};

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || `HTTP ${response.status}` };
  }
}

export async function probeN7ControlPlane() {
  const binding = (env as unknown as { CONTROL_PLANE?: { fetch: typeof fetch } }).CONTROL_PLANE;
  if (!binding) throw new Error("Clintware Control Plane binding is unavailable.");

  const stateResponse = await binding.fetch(
    "https://mcp.clintware.internal/api/v1/state?product=neuron7-case",
    {
      method: "GET",
      headers: SERVICE_HEADERS,
    },
  );
  const stateData = await readJson(stateResponse);
  if (!stateResponse.ok) {
    throw new Error(stateData?.error || `Control Plane state probe failed (${stateResponse.status})`);
  }

  // Deliberately omit audio. A 400 audio_required response means service
  // authentication and audio.transcribe capability checks both succeeded.
  const audioResponse = await binding.fetch(
    "https://mcp.clintware.internal/api/v1/audio/transcribe",
    {
      method: "POST",
      headers: {
        ...SERVICE_HEADERS,
        "content-type": "application/json",
      },
      body: JSON.stringify({ product: "neuron7-case" }),
    },
  );
  const audioData = await readJson(audioResponse);
  if (audioResponse.status !== 400 || audioData?.error !== "audio_required") {
    throw new Error(
      audioData?.error ||
        `Control Plane audio authorization probe returned unexpected status ${audioResponse.status}`,
    );
  }

  return {
    ok: true,
    revision: Number(stateData?.revision ?? 0),
    audioTranscribe: "ready" as const,
  };
}
