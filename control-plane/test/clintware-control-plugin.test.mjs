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
  assert.match(routing, /Canonical master contract/);
  assert.match(routing, /control-plane\/MASTER-PROMPT\.md/);
  assert.match(routing, /clintware_master_prompt_get/);
  assert.match(routing, /complete 1–30 operating contract/);
  assert.match(routing, /current MCP-served .*MASTER-PROMPT\.md.*authoritative/i);
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
  const requiredSections = [
    "1. EXPERT OPERATING MODE",
    "2. CLINTWARE IS THE AUTHORITY BOUNDARY",
    "3. LIVE DISCOVERY OVERRIDES HARDCODED ASSUMPTIONS",
    "4. EXECUTION HIERARCHY",
    "5. QQ BIG-PROMPT PROTOCOL",
    "6. ROUTING RULES",
    "7. ADAPTIVE CPU / RAM / GPU PARALLELISM",
    "8. GPU ROUTING",
    "9. MULTI-MACHINE EXECUTION",
    "10. LOCAL-FIRST OWNER DEFAULT",
    "11. CWInteract™ / WINDOWS UI CONTROL",
    "12. SCHEDULED TASK / FOCUS PROTECTION",
    "13. STATE RECOVERY BEFORE REBUILDING",
    "14. HANDOFF CONTRACT",
    "15. PROMPT TICKET CONTRACT",
    "16. AUTONOMOUS CONTINUATION",
    "17. LONG-RUNNING WORK",
    "18. VERIFICATION REQUIREMENTS",
    "19. HUNG-WORK DETECTION",
    "20. FAILURE RECOVERY",
    "21. FRESH INFORMATION",
    "22. WORKSPACE / BRAND ISOLATION",
    "23. GITHUB / PROVIDER AUTHORITY",
    "24. MODEL COOPERATION",
    "25. OWNER MODEL PREFERENCES",
    "26. USER EXPERIENCE",
    "27. EXECUTION SAFETY",
    "28. DEFINITION OF DONE",
    "29. DEFAULT OPERATIONAL LOOP",
    "30. CURRENT REVIEWED CAPABILITY EXAMPLES"
  ];
  for (const section of requiredSections) {
    assert.ok(markdown.includes(section), `canonical master missing section: ${section}`);
  }
  assert.match(markdown, /planned -> dispatched -> delivered -> executing -> passed\/failed -> verified/);
  assert.match(markdown, /capabilities -> status -> checkin when needed -> run -> job\/result -> diagnostics -> verification/);
  assert.match(markdown, /RAW REQUEST[\s\S]*RECOVER STATE[\s\S]*DEPENDENCY GRAPH[\s\S]*END-TO-END VERIFICATION/);
  assert.match(markdown, /MEMORIA evidence belongs to MEMORIA\./);
  assert.match(markdown, /DRIZNET evidence belongs to DRIZNET\./);
  assert.match(markdown, /CUDA_VISIBLE_DEVICES/);
  assert.match(markdown, /HIP_VISIBLE_DEVICES/);
  assert.match(markdown, /clintware-handoff\/v1/);
  assert.match(markdown, /verified_done/);
  assert.match(markdown, /carried_forward/);
  assert.match(markdown, /PROACTIVENESS:/);
  assert.match(markdown, /Anticipate follow-up questions/);
  assert.match(markdown, /Continue automatically until the original objective is verified complete or there is a real human-only blocker\./);
  assert.match(markdown, /CLIENT BINDING \/ TOOL AVAILABILITY/);
  assert.match(markdown, /mcp_binding_not_exposed/);
  assert.match(markdown, /Never invent commands such as `qq send \.\.\.`/);
  assert.match(markdown, /Never tell the user to paste local logs\/status back into chat/);
  assert.match(markdown, /https:\/\/mcp\.clintware\.com\/connect/);
  assert.match(markdown, /Distinguish registration, authentication, authorization, tool exposure, and server reachability as separate states/);
  assert.ok(bootstrap.length < 400, `bootstrap too large: ${bootstrap.length}`);
  assert.match(bootstrap, /clintware_client_handshake/);
  assert.match(bootstrap, /clintware_instruction_manifest_get/);
  assert.match(bootstrap, /mcp\.clintware\.com\/connect/);
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
  assert.match(index, /mcp_binding_not_exposed/);
  assert.match(index, /Never fabricate qq send\/status\/jobs syntax/);
  assert.match(index, /missing client-side MCP binding as proof that Clintware itself is unreachable/);
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
  assert.ok(bootstrapMarkdown.length < 7000, `instruction bootstrap too large: ${bootstrapMarkdown.length}`);
  assert.match(bootstrapMarkdown, /^# CATSHADOW \/ D@V1D \/ CLINTWARE BOOTSTRAP/m);
  assert.match(bootstrapMarkdown, /## LOAD ORDER/);
  assert.match(bootstrapMarkdown, /## REFRESH RULE/);
  assert.match(bootstrapMarkdown, /## CACHE \/ VERSION RULE/);
  assert.match(bootstrapMarkdown, /## MASTER CONTRACT INTEGRITY/);
  assert.match(bootstrapMarkdown, /1\. EXPERT OPERATING MODE.*30\. CURRENT REVIEWED CAPABILITY EXAMPLES/s);
  assert.match(bootstrapMarkdown, /Continue automatically until the original objective is verified complete or there is a real human-only blocker\./);
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
