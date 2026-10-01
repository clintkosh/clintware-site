import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const repoRoot = new URL("../", root);

test("Clintware Control portable plugin points to authenticated MCP", async () => {
  const plugin = JSON.parse(await readFile(new URL("chatgpt-plugin/plugin.json", root), "utf8"));
  const mcp = JSON.parse(await readFile(new URL("chatgpt-plugin/mcp.json", root), "utf8"));

  assert.equal(plugin.name, "clintware-control");
  assert.ok(plugin.version);
  assert.equal(mcp.mcpServers.clintware.type, "streamable-http");
  assert.equal(mcp.mcpServers.clintware.url, "https://mcp.clintware.com/mcp");
});

test("universal LLM routing makes direct MCP primary and user telemetry exceptional", async () => {
  const routing = await readFile(new URL("control-plane/UNIVERSAL-LLM-ROUTING.md", repoRoot), "utf8");
  assert.match(routing, /Direct MCP/i);
  assert.match(routing, /human user is not the normal telemetry transport/i);
  assert.match(routing, /MEMORIA/i);
  assert.match(routing, /DRIZNET/i);
  assert.match(routing, /manual PowerShell\/CMD only/i);
  assert.match(routing, /Autonomous continuation contract/i);
  assert.match(routing, /Do not make the user send another message simply to say "continue."/i);
  assert.match(routing, /known fix/i);
});
