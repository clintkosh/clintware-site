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
  if (!fs.existsSync(configPath)) {
    failures.push(`${dir}: missing wrangler.jsonc`);
    continue;
  }

  const configText = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(configText.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""));

  if (!String(config.name || "").startsWith("clintware-")) failures.push(`${dir}: Worker name must start with clintware-`);
  if (Array.isArray(config.routes) && config.routes.some((route) => route?.custom_domain !== true)) failures.push(`${dir}: configured product routes must use custom_domain:true`);

  const isStaticAssetsOnly = Boolean(config.assets?.directory) && !config.main;
  if (isStaticAssetsOnly) {
    const assetsPath = path.resolve(root, dir, config.assets.directory);
    if (!fs.existsSync(assetsPath) || !fs.statSync(assetsPath).isDirectory()) failures.push(`${dir}: configured static assets directory does not exist`);
    continue;
  }

  const sourcePath = path.resolve(root, dir, config.main || "src/index.js");
  if (!fs.existsSync(sourcePath)) {
    failures.push(`${dir}: configured Worker entrypoint does not exist: ${config.main || "src/index.js"}`);
    continue;
  }

  fs.readFileSync(sourcePath, "utf8");
  if (!config.observability?.enabled) failures.push(`${dir}: observability must be enabled`);
  if (config.observability?.head_sampling_rate != null && config.observability.head_sampling_rate !== 1) failures.push(`${dir}: observability head_sampling_rate must be 1 when configured`);
}

if (!workerDirs.length) failures.push("No *-worker product directories found");

if (failures.length) {
  console.error("Clintware product Worker contract failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Clintware product Worker contract passed for: ${workerDirs.join(", ")}`);
