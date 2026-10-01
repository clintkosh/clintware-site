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
  assert.match(markdown, /PROACTIVENESS:/);
  assert.match(markdown, /Anticipate follow-up questions/);
  assert.match(markdown, /Continue automatically until the original objective is verified complete or there is a real human-only blocker\./);
  assert.ok(bootstrap.length < 400, `bootstrap too large: ${bootstrap.length}`);
  assert.match(bootstrap, /clintware_client_handshake/);
  assert.match(bootstrap, /clintware_instruction_manifest_get/);
  assert.match(index, /server\.registerTool\("clintware_master_prompt_get"/);
  assert.match(index, /server\.registerTool\("clintware_instruction_manifest_get"/);
  assert.match(index, /server\.registerTool\("clintware_instruction_file_get"/);
  assert.match(index, /required_before_substantial_work:true/);
  assert.match(index, /instruction_extensions:/);
  assert.match(index, /dynamic_registry:true/);
  assert.match(index, /manifest_first:true/);
  assert.match(index, /persona_path:INSTRUCTION_PERSONA_PATH/);
  assert.match(index, /required_at_session_start:true/);
  assert.match(index, /reload_on_reference:true/);
});

test("instruction manifest keeps full bootstrap, CATShadow, expert mode, and master ordered", async () => {
  const manifest = JSON.parse(await readFile(new URL("control-plane/instruction-manifest.json", repoRoot), "utf8"));
  const fullBootstrap = manifest.documents.find((doc) => doc.id === "catshadow-bootstrap");
  const persona = manifest.documents.find((doc) => doc.id === "catshadow-persona");
  const expert = manifest.documents.find((doc) => doc.id === "clintware-expert-mode");
  const master = manifest.documents.find((doc) => doc.id === "clintware-master-prompt");
  const bootstrapMarkdown = await readFile(new URL("control-plane/instructions/CATSHADOW-DAV1D-CLINTWARE-BOOTSTRAP.md", repoRoot), "utf8");
  const catshadow = await readFile(new URL("control-plane/instructions/CATSHADOW.md", repoRoot), "utf8");
  const legacyPersona = await readFile(new URL("control-plane/instructions/CATSHADOW-PERSONA.md", repoRoot), "utf8");

  assert.equal(manifest.schema, "clintware-instruction-manifest/v1");
  assert.equal(manifest.extension_root, "control-plane/instructions/");
  assert.equal(manifest.refresh.on_session_start, true);
  assert.equal(manifest.refresh.on_instruction_reference, true);
  assert.equal(manifest.refresh.no_cached_assumption, true);

  assert.ok(fullBootstrap);
  assert.equal(fullBootstrap.path, "control-plane/instructions/CATSHADOW-DAV1D-CLINTWARE-BOOTSTRAP.md");
  assert.equal(fullBootstrap.required, true);
  assert.equal(fullBootstrap.loader, "clintware_instruction_file_get");
  assert.ok(bootstrapMarkdown.length < 5000);
  assert.match(bootstrapMarkdown, /^# CATSHADOW \/ D@V1D \/ CLINTWARE BOOTSTRAP/m);
  assert.match(bootstrapMarkdown, /## LOAD ORDER/);
  assert.match(bootstrapMarkdown, /## REFRESH RULE/);
  assert.match(bootstrapMarkdown, /## CACHE \/ VERSION RULE/);
  assert.match(bootstrapMarkdown, /## CONTEXT EFFICIENCY/);
  assert.match(bootstrapMarkdown, /## FAILURE BEHAVIOR/);
  assert.match(bootstrapMarkdown, /## CANONICAL SOURCES/);
  assert.match(bootstrapMarkdown, /## FINAL DIRECTIVE/);
  assert.match(bootstrapMarkdown, /Do not summarize, compress, selectively load, paraphrase, or substitute it\./);
  assert.match(bootstrapMarkdown, /Never claim that the latest prompt\/persona was loaded unless the MCP retrieval actually succeeded\./);

  assert.ok(persona);
  assert.equal(persona.path, "control-plane/instructions/CATSHADOW.md");
  assert.equal(persona.required, true);
  assert.equal(persona.loader, "clintware_instruction_file_get");
  assert.equal(catshadow, legacyPersona);

  assert.ok(expert);
  assert.equal(expert.path, "control-plane/instructions/EXPERT-MODE.md");
  assert.equal(expert.required, true);
  assert.equal(expert.loader, "clintware_instruction_file_get");

  assert.ok(master);
  assert.equal(master.path, "control-plane/MASTER-PROMPT.md");
  assert.equal(master.required, true);
  assert.deepEqual(master.clients, ["*"]);
  assert.equal(master.loader, "clintware_master_prompt_get");

  assert.ok(fullBootstrap.load_order < persona.load_order);
  assert.ok(persona.load_order < expert.load_order);
  assert.ok(expert.load_order < master.load_order);
});
