import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseBrief,
  extractSources,
  normalizeResearch,
  researchErrorClass,
} from "../src/research.js";
import { hostLabel } from "../src/util.js";

test("parseBrief splits H2 sections and keeps bodies", () => {
  const sections = parseBrief(
    "## Company snapshot\nSells CS software.\n\n## Product and customers\n- Mid-market SaaS."
  );
  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, "Company snapshot");
  assert.ok(sections[0].body.includes("CS software"));
  assert.equal(sections[1].title, "Product and customers");
});

test("parseBrief handles preamble and empty input", () => {
  const withPreamble = parseBrief("Intro line.\n## Section\nBody");
  assert.equal(withPreamble[0].title, "Overview");
  assert.deepEqual(parseBrief(""), []);
});

test("extractSources maps citations and flags first-party domains", () => {
  const citations = [
    { title: "Gainsight home", url: "https://www.gainsight.com/" },
    "https://www.techtarget.com/article",
    { title: "Gainsight docs", url: "https://docs.gainsight.com/x" },
    "https://www.gainsight.com/", // duplicate is deduped
  ];
  const sources = extractSources(citations, "gainsight", hostLabel);
  assert.equal(sources.length, 3);
  assert.equal(sources.filter((s) => s.first_party).length, 2);
  assert.equal(sources[0].domain, "www.gainsight.com");
});

test("extractSources survives malformed citations", () => {
  assert.deepEqual(extractSources(null, "x", hostLabel), []);
  assert.deepEqual(extractSources([{}, 5, "not-a-url"], "x", hostLabel).length, 1);
});

test("normalizeResearch maps an available control-plane response", () => {
  const result = normalizeResearch({
    ok: true,
    available: true,
    provider: "clintware-research",
    model: "clintware-model-x",
    text: "## Company snapshot\nOk.",
    citations: ["https://www.example.com"],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, reported_api_cost: 0.001 },
  });
  assert.equal(result.ok, true);
  assert.equal(result.available, true);
  assert.equal(result.provider, "clintware-research");
  assert.equal(result.model, "clintware-model-x");
  assert.equal(result.usage.total_tokens, 30);
  assert.equal(result.usage.reported_api_cost, 0.001);
  assert.deepEqual(result.citations, ["https://www.example.com"]);
});

test("normalizeResearch maps provider-not-activated and invalid responses", () => {
  const unavailable = normalizeResearch({ ok: true, available: false, provider: "clintware-control-plane", reason: "research_provider_not_configured" });
  assert.equal(unavailable.ok, true);
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.reason, "research_provider_not_configured");

  assert.equal(normalizeResearch(null).error_class, "control_plane_invalid_response");
  assert.equal(normalizeResearch("junk").error_class, "control_plane_invalid_response");
  assert.equal(normalizeResearch({ ok: true, available: true, text: "" }).error_class, "research_empty_response");
});

test("researchErrorClass maps transport errors", () => {
  const withStatus = new Error("unauthorized");
  withStatus.status = 401;
  assert.equal(researchErrorClass(withStatus), "control_plane_401");
  const abort = new Error("aborted");
  abort.name = "AbortError";
  assert.equal(researchErrorClass(abort), "control_plane_timeout");
  assert.equal(researchErrorClass(new Error("fetch failed")), "control_plane_unreachable");
  assert.equal(researchErrorClass(null), "control_plane_unreachable");
});
