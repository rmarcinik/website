import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEV_URL = "http://localhost:8787";
const PROD_URL = "https://rigelmarcinik.com";

function loadSecret() {
  const text = readFileSync(resolve(root, ".dev.vars"), "utf8");
  for (const line of text.split("\n")) {
    if (line.startsWith("SEED_SECRET=")) return line.slice("SEED_SECRET=".length).trim();
  }
  throw new Error("SEED_SECRET not found in .dev.vars");
}

const prod = process.argv.includes("--prod");
const baseUrl = prod ? PROD_URL : DEV_URL;
const secret = loadSecret();
const data = JSON.parse(readFileSync(resolve(root, "data/projects.json"), "utf8"));

const res = await fetch(`${baseUrl}/api/projects/upload`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(data),
});

console.log(res.status, res.ok ? "OK" : await res.text());
process.exit(res.ok ? 0 : 1);
