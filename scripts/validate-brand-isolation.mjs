import { execFileSync } from "node:child_process";
import fs from "node:fs";

const brandNeedle = ["code", "feddy"].join("").toLowerCase();
const policyFiles = new Set([
  "control-plane/MASTER-PROMPT.md",
  "control-plane/src/master-prompt.js",
]);
const forbiddenPublicHosts = [
  ["mcp", "clintware", "com"].join("."),
  ["quillgeist", "clintware", "com"].join("."),
  ["auth", "clintware", "com"].join("."),
];
const privilegedNames = [
  ["CONTROL","PLANE","MCP","TOKEN"].join("_"),
  ["CONTROL","PLANE","ADMIN","TOKEN"].join("_"),
  ["GITHUB","CONTROL","PLANE","TOKEN"].join("_"),
  ["GITHUB","TOKEN","CLINTKOSH"].join("_"),
  ["CLOUDFLARE","CONTROL","PLANE","TOKEN"].join("_"),
];

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const errors = [];

for (const file of files) {
  let buf;
  try { buf = fs.readFileSync(file); } catch { continue; }
  if (buf.includes(0)) continue;
  const text = buf.toString("utf8");
  const lower = text.toLowerCase();

  if (lower.includes(brandNeedle)) {
    if (policyFiles.has(file)) {
      const count = lower.split(brandNeedle).length - 1;
      const requiredA = "do not mix " + brandNeedle + " material into professional clintware";
      const requiredB = "do not infer that " + brandNeedle + " credentials, repos, identities, or services may be substituted for clintware";
      if (count !== 2 || !lower.includes(requiredA) || !lower.includes(requiredB)) {
        errors.push(`BRAND_ISOLATION_FAIL ${file}: canonical policy contains unexpected separate-brand content`);
      }
    } else {
      errors.push(`BRAND_ISOLATION_FAIL ${file}: contains the separate-brand identifier`);
    }
  }

  const publicNodeCode =
    file.startsWith("agentbridge-node/agentbridge_node/") && file.endsWith(".py") ||
    file === "agentbridge-node/launcher.py" ||
    file === "agentbridge-node/desktop_launcher.py";

  if (publicNodeCode) {
    for (const host of forbiddenPublicHosts) {
      if (lower.includes(host)) errors.push(`PUBLIC_NODE_BOUNDARY_FAIL ${file}: embeds forbidden Clintware host ${host}`);
    }
    for (const name of privilegedNames) {
      if (text.includes(name)) errors.push(`PUBLIC_NODE_SECRET_FAIL ${file}: references privileged server credential name ${name}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`BRAND_ISOLATION_OK scanned ${files.length} tracked files; separate-brand identifier restricted to canonical negative policy statements only`);
console.log("PUBLIC_NODE_BOUNDARY_OK downloadable Quillgeist code has no Clintware control host or privileged server credential reference");
