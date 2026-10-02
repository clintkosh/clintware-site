import test from "node:test";
import assert from "node:assert/strict";
import { compileRoute } from "../src/public-api.js";

test("compileRoute preserves explicit primary and sub-search model choices", () => {
  const route = compileRoute({
    task: "Research and synthesize",
    task_type: "fresh",
    policy: "manual",
    main_model: "openai:auto",
    subsearch_model: "google:auto",
    subsearch_enabled: true,
    subsearch_count: 3,
  });
  assert.equal(route.primary.model, "openai:auto");
  assert.equal(route.subsearch.model, "google:auto");
  assert.equal(route.subsearch.branches.length, 3);
  assert.equal(route.execution.requires_fresh_authority, true);
});

test("compileRoute applies local-first policy without overriding external-action authority", () => {
  const local = compileRoute({ task_type: "code", policy: "local_first", main_model: "auto" });
  assert.equal(local.primary.model, "local:auto");
  assert.equal(local.execution.local_first, true);

  const action = compileRoute({ task_type: "action", policy: "local_first", main_model: "auto" });
  assert.equal(action.primary.model, "clintware:action");
  assert.equal(action.execution.authority, "clintware-control-plane");
  assert.equal(action.execution.state_conflict_serialization, true);
});

test("compileRoute bounds sub-search fanout", () => {
  const route = compileRoute({ subsearch_enabled: true, subsearch_count: 99 });
  assert.equal(route.subsearch.branches.length, 8);
});
