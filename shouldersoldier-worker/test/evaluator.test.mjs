import assert from "node:assert/strict";
import test from "node:test";
import { analyzeInteraction } from "../src/index.js";

test("credential urgency is high risk and explainable", () => {
  const result = analyzeInteraction({ channel: "email", content: "URGENT: your account will be locked. Send your MFA code immediately." });
  assert.equal(result.tier, "high");
  assert.ok(result.signals.some((s) => s.id === "CREDENTIAL_REQUEST"));
  assert.ok(result.signals.some((s) => s.id === "URGENCY_PRESSURE"));
});

test("agent external action requires extra friction without being malicious by definition", () => {
  const result = analyzeInteraction({ channel: "agent_action", requestedAction: "Send the prepared post to the customer" });
  assert.ok(result.signals.some((s) => s.id === "AGENT_EXTERNAL_ACTION"));
  assert.ok(result.score < 30);
});

test("raw IP and executable attachment increase risk", () => {
  const result = analyzeInteraction({ channel: "message", content: "Install this update", url: "http://192.0.2.10/login", attachment: "update.ps1" });
  assert.ok(result.signals.some((s) => s.id === "IP_LITERAL_LINK"));
  assert.ok(result.signals.some((s) => s.id === "HIGH_RISK_ATTACHMENT"));
  assert.equal(result.tier, "high");
});

test("ordinary interaction is not falsely declared safe", () => {
  const result = analyzeInteraction({ channel: "message", content: "Can we move our meeting to Tuesday?" });
  assert.equal(result.score, 0);
  assert.equal(result.tier, "low");
  assert.match(result.boundary, /no message or action is automatically blocked/i);
});
