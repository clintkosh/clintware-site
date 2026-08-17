import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workerDirs = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.endsWith("-worker"))
  .map((entry) => entry.name)
  .sort();

const failures = [];

for (const dir of workerDirs) {
  const configPath = path.join(root, dir, "wrangler.jsonc");
  const sourcePath = path.join(root, dir, "src", "index.js");
  if (!fs.existsSync(configPath)) {
    failures.push(`${dir}: missing wrangler.jsonc`);
    continue;
  }
  if (!fs.existsSync(sourcePath)) {
    failures.push(`${dir}: missing src/index.js`);
    continue;
  }

  const configText = fs.readFileSync(configPath, "utf8");
  const source = fs.readFileSync(sourcePath, "utf8");
  const config = JSON.parse(configText.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""));

  if (!String(config.name || "").startsWith("clintware-")) failures.push(`${dir}: Worker name must start with clintware-`);
  if (!Array.isArray(config.compatibility_flags) || !config.compatibility_flags.includes("nodejs_compat")) failures.push(`${dir}: nodejs_compat must be enabled`);
  if (!config.observability?.enabled) failures.push(`${dir}: observability must be enabled`);
  if (config.observability?.head_sampling_rate !== 1) failures.push(`${dir}: observability head_sampling_rate must be 1`);
  if (!Array.isArray(config.routes) || config.routes.length !== 1) failures.push(`${dir}: each product Worker must own exactly one custom domain route`);
  if (Array.isArray(config.routes) && config.routes.some((route) => route?.custom_domain !== true)) failures.push(`${dir}: product route must use custom_domain:true`);

  const requiredSourceMarkers = [
    '"Cascadia Code"',
    'font-size:24px',
    'font-size:20px',
    'letter-spacing:-.02em',
    'max-width:48ch',
    'A Clintware product.'
  ];
  for (const marker of requiredSourceMarkers) {
    if (!source.includes(marker)) failures.push(`${dir}: missing design-contract marker ${marker}`);
  }

  const bannedPatterns = [
    [/font-size:clamp\([^)]*3rem/i, "billboard clamp heading"],
    [/font-size:\s*(?:3[0-9]|4[0-9]|5[0-9])px/i, "oversized heading"],
    [/font-family:[^;]*(?:cursive|serif)/i, "non-terminal display font"]
  ];
  for (const [pattern, label] of bannedPatterns) {
    if (pattern.test(source)) failures.push(`${dir}: contains ${label}`);
  }
}

if (!workerDirs.length) failures.push("No *-worker product directories found");

if (failures.length) {
  console.error("Clintware product Worker contract failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Clintware product Worker contract passed for: ${workerDirs.join(", ")}`);
