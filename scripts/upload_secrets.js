import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { tmpdir } from "os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseDevVars(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter(l => l.includes("=") && !l.startsWith("#"))
      .map(l => l.split("=", 2).map(s => s.trim()))
  );
}

const secrets = parseDevVars(resolve(root, ".dev.vars"));
const tmp = resolve(tmpdir(), `wrangler-secrets-${Date.now()}.json`);

try {
  writeFileSync(tmp, JSON.stringify(secrets));
  const result = spawnSync("pnpm", ["exec", "wrangler", "secret", "bulk", tmp], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
} finally {
  unlinkSync(tmp);
}
