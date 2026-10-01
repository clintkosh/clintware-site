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


test("canonical master prompt is MCP-bundled byte-for-byte and bootstrap stays compact", async () => {
  const markdown = await readFile(new URL("control-plane/MASTER-PROMPT.md", repoRoot), "utf8");
  const bootstrap = await readFile(new URL("control-plane/MASTER-PROMPT-BOOTSTRAP.txt", repoRoot), "utf8");
  const mod = await import(new URL("../src/master-prompt.js", import.meta.url));
  const index = await readFile(new URL("src/index.js", root), "utf8");

  assert.equal(mod.CLINTWARE_MASTER_PROMPT, markdown);
  assert.equal(mod.CLINTWARE_MASTER_PROMPT_PATH, "control-plane/MASTER-PROMPT.md");
  assert.match(markdown, /^CLINTWARE UNIVERSAL MASTER PROMPT/m);
  assert.match(markdown, /30\. CURRENT REVIEWED CAPABILITY EXAMPLES/);
  assert.match(markdown, /Continue automatically until the original objective is verified complete or there is a real human-only blocker\./);
  assert.ok(bootstrap.length < 400, `bootstrap too large: ${bootstrap.length}`);
  assert.match(bootstrap, /clintware_client_handshake/);
  assert.match(bootstrap, /clintware_master_prompt_get/);
  assert.match(bootstrap, /clintware_instruction_manifest_get/);
  assert.match(bootstrap, /clintware_instruction_file_get/);
  assert.match(index, /server\.registerTool\("clintware_master_prompt_get"/);
  assert.match(index, /server\.registerTool\("clintware_instruction_manifest_get"/);
  assert.match(index, /server\.registerTool\("clintware_instruction_file_get"/);
  assert.match(index, /required_before_substantial_work:true/);
  assert.match(index, /instruction_extensions:/);
  assert.match(index, /dynamic_registry:true/);
  assert.match(index, /required_at_session_start:true/);
  assert.match(index, /reload_on_reference:true/);
});

test("instruction manifest keeps extension loading explicit and client-aware", async () => {
  const manifest = JSON.parse(await readFile(new URL("control-plane/instruction-manifest.json", repoRoot), "utf8"));
  const master = manifest.documents.find((doc) => doc.id === "clintware-master-prompt");
  assert.equal(manifest.schema, "clintware-instruction-manifest/v1");
  assert.equal(manifest.extension_root, "control-plane/instructions/");
  assert.equal(manifest.refresh.on_session_start, true);
  assert.equal(manifest.refresh.on_instruction_reference, true);
  assert.equal(manifest.refresh.no_cached_assumption, true);
  assert.ok(master);
  assert.equal(master.path, "control-plane/MASTER-PROMPT.md");
  assert.equal(master.required, true);
  assert.deepEqual(master.clients, ["*"]);
  assert.equal(master.loader, "clintware_master_prompt_get");
});
