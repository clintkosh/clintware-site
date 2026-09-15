// ProofOS research pipeline — brief parsing and Control Plane response handling.
// Research itself is invoked through the Clintware Control Plane; ProofOS never
// calls a research provider directly and holds no provider credentials.
// Pure logic here is unit-testable.

/** Parse the model's markdown answer into sections. Falls back to a single section. */
export function parseBrief(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const sections = [];
  const lines = raw.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const match = line.match(/^##\s+(.*)$/);
    if (match) {
      if (current) sections.push(current);
      current = { title: match[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      // Preamble before any header goes into an intro section.
      current = { title: "Overview", body: [line] };
    }
  }
  if (current) sections.push(current);
  if (!sections.length) return [{ title: "Brief", body: [raw] }];
  return sections.map((s) => ({ title: s.title, body: s.body.join("\n").trim() })).filter((s) => s.body || s.title);
}

/** Map Control Plane citations into a safe source list with first-party detection. */
export function extractSources(citations, companySlug, hostLabelFn) {
  const list = Array.isArray(citations) ? citations : [];
  const seen = new Set();
  const sources = [];
  for (const c of list) {
    const url = typeof c === "string" ? c : c && typeof c.url === "string" ? c.url : null;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = "";
    }
    const label = (typeof c === "object" && c.title) || hostname || url;
    const firstParty = companySlug
      ? hostLabelFn(hostname).includes(companySlug.split("-")[0]) && companySlug.split("-")[0].length > 2
      : false;
    sources.push({ title: String(label).slice(0, 200), url, domain: hostname, first_party: Boolean(firstParty) });
  }
  return sources;
}

/**
 * Normalize a Control Plane research gateway response into one of:
 *   { ok:true,  available:true,  provider, model, text, citations, usage }
 *   { ok:true,  available:false, reason, provider }   — gateway up, provider not activated
 *   { ok:false, error_class }                          — gateway call failed
 */
export function normalizeResearch(result) {
  if (!result || typeof result !== "object") {
    return { ok: false, error_class: "control_plane_invalid_response" };
  }
  if (result.available === true) {
    if (!result.text) return { ok: false, error_class: "research_empty_response" };
    return {
      ok: true,
      available: true,
      provider: result.provider || "clintware-control-plane",
      model: result.model || "",
      text: result.text,
      citations: Array.isArray(result.citations) ? result.citations : [],
      usage: result.usage || {},
    };
  }
  if (result.available === false) {
    return {
      ok: true,
      available: false,
      reason: result.reason || "research_unavailable",
      provider: result.provider || "clintware-control-plane",
    };
  }
  return { ok: false, error_class: "control_plane_invalid_response" };
}

/** Map a transport error thrown while reaching the Control Plane. */
export function researchErrorClass(error) {
  if (error && error.status) return `control_plane_${error.status}`;
  if (error && (error.name === "AbortError" || /timed?\s?out/i.test(String(error.message || "")))) return "control_plane_timeout";
  return "control_plane_unreachable";
}
