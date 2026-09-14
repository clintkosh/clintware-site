// ProofOS research pipeline — Perplexity provider integration and brief parsing.
// Pure logic here is unit-testable; network access is injected for tests.

export const DEFAULT_MODEL = "sonar";
export const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions";

const SECTION_TITLES = [
  "Company snapshot",
  "Product and customers",
  "Implementation model",
  "Recent signals",
  "Why this matters for implementations",
];

/** Build the research prompt for an implementation-focused company brief. */
export function buildMessages(company) {
  const system = [
    "You are ProofOS, an implementation-intelligence analyst.",
    "You research software companies for an experienced Implementation Manager preparing for a customer conversation or interview.",
    "Answer with verifiable facts from current web sources and cite them inline.",
    "If evidence is thin or conflicting, say so plainly instead of guessing.",
    "Never fabricate metrics, dates, names, or customers.",
  ].join(" ");
  const user = [
    `Prepare an implementation-focused brief on "${company}".`,
    "",
    "Use exactly these markdown H2 sections, in this order:",
    ...SECTION_TITLES.map((t) => `## ${t}`),
    "",
    "Guidance:",
    "- Company snapshot: what they sell, who buys it, scale/stage if reliably known.",
    "- Product and customers: core product lines, named customer segments or notable customers, ecosystem/integrations.",
    "- Implementation model: onboarding and delivery model, services partners, typical rollout pattern, known complexity drivers.",
    "- Recent signals: last ~12 months of funding, launches, leadership, M&A, or migration news relevant to implementations.",
    "- Why this matters for implementations: 3-5 bullets an Implementation Manager would act on.",
    "",
    "Keep the whole brief under 500 words. Be specific and evidence-based.",
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

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

/** Map Perplexity citations into a safe source list with first-party detection. */
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
 * Run one live research call against Perplexity.
 * fetchImpl is injected so tests can stub the network.
 */
export async function callPerplexity({ company, apiKey, model = DEFAULT_MODEL, fetchImpl = fetch, timeoutMs = 45000 }) {
  if (!apiKey) {
    const err = new Error("research provider not configured");
    err.code = "provider_not_configured";
    throw err;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(PERPLEXITY_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(company),
        temperature: 0.2,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    const err = new Error(e && e.name === "AbortError" ? "research request timed out" : "research request failed");
    err.code = e && e.name === "AbortError" ? "provider_timeout" : "provider_network";
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const err = new Error(`research provider returned ${response.status}`);
    err.code = `provider_http_${response.status}`;
    try {
      err.body = await response.text();
    } catch {
      err.body = "";
    }
    throw err;
  }
  const data = await response.json();
  const choice = data && data.choices && data.choices[0];
  const text = choice && choice.message ? choice.message.content : "";
  if (!text) {
    const err = new Error("research provider returned an empty answer");
    err.code = "provider_empty";
    throw err;
  }
  const usage = (data.usage && typeof data.usage === "object" && data.usage) || {};
  return {
    text,
    model: data.model || model,
    citations: Array.isArray(data.citations) ? data.citations : [],
    usage: {
      prompt_tokens: usage.prompt_tokens ?? null,
      completion_tokens: usage.completion_tokens ?? null,
      total_tokens: usage.total_tokens ?? null,
      reported_api_cost: usage.cost ?? null,
    },
  };
}
