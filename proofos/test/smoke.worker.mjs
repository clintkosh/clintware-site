// Local smoke test of the ProofOS worker without wrangler:
// exercises routing, session cookies, invalid input, conversion actions,
// the Control Plane research paths (available / unavailable / error), and
// page rendering. The CONTROL_PLANE service binding is stubbed per case.
import worker from "../src/index.js";

let passed = 0;
const failures = [];

function cpBinding(researchResult, events = []) {
  return {
    async fetch(url, init = {}) {
      const path = new URL(url).pathname;
      if (path === "/api/v1/research") {
        const status = researchResult && researchResult.__status ? researchResult.__status : 200;
        return new Response(JSON.stringify(researchResult || {}), { status, headers: { "content-type": "application/json" } });
      }
      if (path === "/api/v1/events") {
        try { events.push(JSON.parse(init.body || "{}")); } catch {}
        return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
      }
      if (path.startsWith("/api/v1/products/proofos/summary")) {
        return new Response(JSON.stringify({ ok: true, events: events.length }), { headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    },
  };
}

async function hit(env, method, path, body, headers = {}) {
  const req = new Request(`https://proof.clintware.com${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ctx = { waitUntil: (p) => Promise.resolve(p).catch(() => {}) };
  return worker.fetch(req, env, ctx);
}

function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`ok - ${name}`);
  } else {
    failures.push(name + (extra ? ` (${extra})` : ""));
    console.log(`FAIL - ${name} ${extra}`);
  }
}

// --- No binding, no token: fully local degradation ---
const bareEnv = {};
const health = await hit(bareEnv, "GET", "/health");
const healthBody = await health.json();
check("health returns 200", health.status === 200);
check("health identifies as proofos", healthBody.service === "proofos");
check("health reports control-plane gateway", healthBody.gateway === "clintware-control-plane");

const page = await hit(bareEnv, "GET", "/");
const pageText = await page.text();
check("page returns 200", page.status === 200);
check("page is html", (page.headers.get("content-type") || "").includes("text/html"));
check("page sets session cookie", Boolean(page.headers.get("set-cookie")));
check("page contains ProofOS branding", pageText.includes("Proof") && pageText.includes("Clintware"));
check("page contains no Perplexity references", !/perplexity/i.test(pageText));
check("page footer shows version", /ProofOS v1\.\d/.test(pageText));

const badInput = await hit(bareEnv, "POST", "/api/brief", { company: "<script>x</script>" });
check("invalid input rejected 400", badInput.status === 400);
const emptyInput = await hit(bareEnv, "POST", "/api/brief", {});
check("missing company rejected 400", emptyInput.status === 400);

// --- Binding: research unavailable (provider not activated) ---
const unavailEvents = [];
const unavailEnv = { CONTROL_PLANE: cpBinding({ ok: true, available: false, provider: "clintware-control-plane", reason: "research_provider_not_configured" }, unavailEvents) };
const unavail = await hit(unavailEnv, "POST", "/api/brief", { company: "Gainsight" });
const unavailBody = await unavail.json();
check("unavailable returns graceful 200", unavail.status === 200, `got ${unavail.status}`);
check("unavailable mode is research_unavailable", unavailBody.mode === "research_unavailable");
check("unavailable carries request id", Boolean(unavailBody.request_id));
check("unavailable notice explains pending activation", /pending activation/i.test(unavailBody.notice || ""));

// --- Binding: research available ---
const availEnv = {
  CONTROL_PLANE: cpBinding({
    ok: true, available: true, provider: "clintware-research", model: "clintware-model-x",
    text: "## Company snapshot\nGainsight is a customer success platform.\n\n## Why this matters for implementations\n- Heavy onboarding lift.",
    citations: ["https://www.gainsight.com/", "https://techcrunch.com/gainsight-news"],
  }),
};
const avail = await hit(availEnv, "POST", "/api/brief", { company: "Gainsight" });
const availBody = await avail.json();
check("available returns 200", avail.status === 200);
check("brief parsed into sections", Array.isArray(availBody.brief) && availBody.brief.length >= 2);
check("sources extracted with first-party detection", availBody.sources.length === 2 && availBody.sources[0].first_party === true);
check("provider surfaced from control plane", availBody.provider === "clintware-research");

// --- Binding: gateway auth error maps to 502 ---
const errEnv = { CONTROL_PLANE: cpBinding({ __status: 401, error: "unauthorized" }) };
const err = await hit(errEnv, "POST", "/api/brief", { company: "Gainsight" });
const errBody = await err.json();
check("gateway auth failure returns 502", err.status === 502, `got ${err.status}`);
check("error class is control_plane_401", errBody.error_class === "control_plane_401");

const action = await hit(bareEnv, "POST", "/api/action", { action: "meeting" });
const actionBody = await action.json();
check("meeting action ok", action.status === 200 && actionBody.target === "https://meet.clintware.com/");
const badAction = await hit(bareEnv, "POST", "/api/action", { action: "nope" });
check("unknown action rejected 400", badAction.status === 400);

const notFound = await hit(bareEnv, "GET", "/nope");
check("unknown route 404", notFound.status === 404);

const summary = await hit(bareEnv, "GET", "/api/summary");
check("summary degrades ok without transport", summary.status === 200);
const summaryBound = await hit(availEnv, "GET", "/api/summary");
check("summary works through binding", summaryBound.status === 200 && (await summaryBound.json()).ok === true);

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.join("\n"));
  process.exit(1);
}
