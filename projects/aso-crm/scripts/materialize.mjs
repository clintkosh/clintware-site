import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const project=path.basename(path.resolve(here,".."));
execFileSync(process.execPath,[path.join(repo,"projects","crm-cover-factory","materialize-role.mjs"),project],{cwd:repo,stdio:"inherit"});
