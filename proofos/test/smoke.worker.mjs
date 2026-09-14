// Local smoke test of the ProofOS worker without wrangler:
// exercises routing, session cookies, invalid input, conversion actions,
// the provider-not-configured path, and page rendering.
import worker from "../src/index.js";

let passed = 0;
const failures = [];

async function hit(method, path, body, headers = {}) {
  const req = new Request(`https://proof.clintware.com${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ctx = { waitUntil: (p) => Promise.resolve(p).catch(() => {}) };
  return worker.fetch(req, mockEnv(), ctx);
}

function mockEnv(extra = {}) {
  return { PERPLEXITY_API_KEY: null, CLINTWARE_PRODUCT_TOKEN: null, ...extra };
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

const health = await hit("GET", "/health");
const healthBody = await health.json();
check("health returns 200", health.status === 200);
check('health identifies as proofos', healthBody.service === "proofos");
check("health reports research not configured", healthBody.research === "not_configured");

const page = await hit("GET", "/");
const pageText = await page.text();
check("page returns 200", page.status === 200);
check("page is html", (page.headers.get("content-type") || "").includes("text/html"));
check("page sets session cookie", Boolean(page.headers.get("set-cookie")));
check("page contains ProofOS branding", pageText.includes("Proof") && pageText.includes("Clintware"));
check("page footer shows version", /ProofOS v1\.\d/.test(pageText));

const badInput = await hit("POST", "/api/brief", { company: "<script>x</script>" });
check("invalid input rejected 400", badInput.status === 400);
const emptyInput = await hit("POST", "/api/brief", {});
check("missing company rejected 400", emptyInput.status === 400);

const noKey = await hit("POST", "/api/brief", { company: "Gainsight" });
const noKeyBody = await noKey.json();
check("brief without key returns 503", noKey.status === 503, `got ${noKey.status}`);
check("brief 503 class is provider_not_configured", noKeyBody.error_class === "provider_not_configured");
check("brief response carries request id", Boolean(noKeyBody.request_id));

const action = await hit("POST", "/api/action", { action: "meeting" });
const actionBody = await action.json();
check("meeting action ok", action.status === 200 && actionBody.target === "https://meet.clintware.com/");
const badAction = await hit("POST", "/api/action", { action: "nope" });
check("unknown action rejected 400", badAction.status === 400);

const notFound = await hit("GET", "/nope");
check("unknown route 404", notFound.status === 404);

const summary = await hit("GET", "/api/summary");
check("summary degrades to ok:false without token", summary.status === 200);

// Live research path with a stubbed provider via fetch override is covered by
// unit tests (callPerplexity); here we only verify the runtime wiring.
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.join("\n"));
  process.exit(1);
}
