import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMessages,
  parseBrief,
  extractSources,
  callPerplexity,
} from "../src/research.js";
import { hostLabel } from "../src/util.js";

test("buildMessages requests the fixed section structure", () => {
  const messages = buildMessages("Gainsight");
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "system");
  assert.ok(messages[1].content.includes("Gainsight"));
  for (const title of [
    "Company snapshot",
    "Implementation model",
    "Recent signals",
  ]) {
    assert.ok(messages[1].content.includes(`## ${title}`), `missing section ${title}`);
  }
});

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

test("callPerplexity returns merged research on success", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "sonar",
      choices: [{ message: { content: "## Company snapshot\nOk." } }],
      citations: ["https://www.example.com"],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, cost: 0.001 },
    }),
  });
  const result = await callPerplexity({ company: "Example", apiKey: "k", fetchImpl: fakeFetch });
  assert.equal(result.model, "sonar");
  assert.equal(result.usage.total_tokens, 30);
  assert.equal(result.usage.reported_api_cost, 0.001);
  assert.deepEqual(result.citations, ["https://www.example.com"]);
});

test("callPerplexity surfaces configuration and provider errors", async () => {
  await assert.rejects(
    () => callPerplexity({ company: "X", apiKey: "" }),
    (e) => e.code === "provider_not_configured"
  );
  await assert.rejects(
    () =>
      callPerplexity({
        company: "X",
        apiKey: "k",
        fetchImpl: async () => ({ ok: false, status: 429, text: async () => "rate limited" }),
      }),
    (e) => e.code === "provider_http_429"
  );
  await assert.rejects(
    () =>
      callPerplexity({
        company: "X",
        apiKey: "k",
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ choices: [{ message: { content: "" } }] }),
        }),
      }),
    (e) => e.code === "provider_empty"
  );
});
