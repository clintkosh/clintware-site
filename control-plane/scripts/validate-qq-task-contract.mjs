import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const controlPlaneRoot = path.resolve(here, "..");
const repoRoot = path.resolve(controlPlaneRoot, "..");

const remotePath = path.join(controlPlaneRoot, "quillgeist-remote-tasks.json");
const localPath = path.join(repoRoot, "quillgeist-lite", "tasks.json");
const relayPath = path.join(repoRoot, "quillgeist-lite", "dispatch", "relay.py");
const indexPath = path.join(controlPlaneRoot, "src", "index.js");

const remote = JSON.parse(fs.readFileSync(remotePath, "utf8"));
const local = JSON.parse(fs.readFileSync(localPath, "utf8"));
const relay = fs.readFileSync(relayPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

if (!remote || typeof remote !== "object" || !remote.tasks || typeof remote.tasks !== "object") {
  throw new Error("Remote QQ task registry is malformed.");
}
if (!local || typeof local !== "object" || !local.tasks || typeof local.tasks !== "object") {
  throw new Error("Local QQ task registry is malformed.");
}
if (!Number.isInteger(remote.version) || remote.version < 1) {
  throw new Error("Remote QQ task registry requires a positive integer version.");
}

for (const [taskId, spec] of Object.entries(remote.tasks)) {
  const localSpec = local.tasks[taskId];
  if (!localSpec) {
    throw new Error(`Remote QQ task ${taskId} is missing from quillgeist-lite/tasks.json.`);
  }
  if (spec.runtime !== localSpec.runtime) {
    throw new Error(`Runtime drift for ${taskId}: remote=${spec.runtime} local=${localSpec.runtime}`);
  }
  const remoteParams = Array.isArray(spec.parameters) ? spec.parameters : [];
  const localParams = new Set(Array.isArray(localSpec.parameters) ? localSpec.parameters : []);
  if (new Set(remoteParams).size !== remoteParams.length) {
    throw new Error(`Duplicate remote parameters for ${taskId}.`);
  }
  for (const param of remoteParams) {
    if (!localParams.has(param)) {
      throw new Error(`Remote-only parameter ${taskId}.${param} is not present in the local task registry.`);
    }
  }
}

for (const required of ["big-prompt-plan", "ensure-python", "self-update", "browser-work", "crm-astro-build"]) {
  if (!remote.tasks[required]) {
    throw new Error(`Required remote QQ task is missing: ${required}`);
  }
}

if (!relay.includes("control-plane/quillgeist-remote-tasks.json") ||
    !relay.includes("load_remote_task_allowlist") ||
    relay.includes("\nALLOWED = {")) {
  throw new Error("GitHub QQ relay is not using the canonical remote task registry.");
}

if (!index.includes('import QUILLGEIST_REMOTE_TASK_REGISTRY from "../quillgeist-remote-tasks.json"') ||
    !index.includes("Object.freeze(QUILLGEIST_REMOTE_TASK_REGISTRY.tasks || {})")) {
  throw new Error("Control Plane is not using the canonical remote QQ task registry.");
}

console.log(`QQ_TASK_CONTRACT_OK remote_version=${remote.version} local_version=${local.version} remote_tasks=${Object.keys(remote.tasks).length}`);
