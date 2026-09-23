import { env } from "cloudflare:workers";

export async function probeN7ControlPlane() {
  const binding = (env as unknown as { CONTROL_PLANE?: { fetch: typeof fetch } }).CONTROL_PLANE;
  if (!binding) throw new Error("Clintware Control Plane binding is unavailable.");

  const response = await binding.fetch(
    "https://mcp.clintware.internal/api/v1/state?product=neuron7-case",
    {
      method: "GET",
      headers: {
        "x-clintware-service-product": "neuron7-case",
        "x-clintware-service-worker": "n7-customer-value-os",
      },
    },
  );

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `HTTP ${response.status}` };
  }

  if (!response.ok) {
    throw new Error(data?.error || `Control Plane request failed (${response.status})`);
  }

  return {
    ok: true,
    revision: Number(data?.revision ?? 0),
  };
}
