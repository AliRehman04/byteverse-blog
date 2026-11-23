import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Cloudflare build entry (npm run cf:build). NEXT_PUBLIC_ values are inlined into the bundle at build time, so the
// public settings Vercel keeps as project variables (Google Analytics, giscus comments) are versioned in
// cloudflare/public-build-env.json and set here before `opennextjs-cloudflare build`. The values were read from the
// live site on 23 November 2026. Only NEXT_PUBLIC_ keys are accepted: every visitor's browser receives them anyway.
// Secrets belong in Cloudflare's encrypted settings, never in this file. A Cloudflare build variable with the same
// name takes precedence.
const file = new URL("../cloudflare/public-build-env.json", import.meta.url);
const publicEnv = JSON.parse(readFileSync(file, "utf8"));
for (const [key, value] of Object.entries(publicEnv)) {
  if (!/^NEXT_PUBLIC_[A-Z0-9_]+$/.test(key) || typeof value !== "string") {
    console.error(`cloudflare/public-build-env.json may only contain NEXT_PUBLIC_ string values (found ${key}).`);
    process.exit(1);
  }
  process.env[key] ??= value;
}

const windows = process.platform === "win32";
const build = spawnSync(windows ? "npx.cmd" : "npx", ["opennextjs-cloudflare", "build", ...process.argv.slice(2)], { stdio: "inherit", shell: windows });
process.exit(build.status ?? 1);
