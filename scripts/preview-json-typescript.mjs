import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readdir, symlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const parent = dirname(root.replace(/[\\/]$/, ""));
const [mode, previous] = process.argv.slice(2);
assert(["--build", "--serve", "--refresh"].includes(mode), "Use --build, --refresh <copy> or --serve <copy>");
assert(process.argv.length <= 4);
assert(mode === "--build" || previous, "Provide the task-owned copy to refresh or serve");
const workspace = previous ? resolve(previous) : await mkdtemp(join(parent, ".byteverse-json-typescript-check-"));
assert(dirname(workspace) === parent && workspace.startsWith(join(parent, ".byteverse-json-typescript-check-")), "Use only a task-owned validation copy");
assert((await lstat(workspace)).isDirectory());
const env = {};
for (const key of ["PATH", "Path", "PATHEXT", "SystemRoot", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE", "ProgramFiles", "ProgramFiles(x86)"]) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, { NEXT_TELEMETRY_DISABLED: "1", DATABASE_URL: "", GROQ_API_KEY: "", RESEND_API_KEY: "", NODE_ENV: "production" });

async function run(args) {
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, { cwd: workspace, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? accept() : reject(new Error(`Validation command failed (${code})`)));
  });
}

if (mode !== "--serve") {
  for (const entry of ["src", "public", "package.json", "package-lock.json", "tsconfig.json", "next-env.d.ts", "next.config.ts", "postcss.config.mjs", "eslint.config.mjs"]) {
    await cp(join(root, entry), join(workspace, entry), { recursive: true, filter: (path) => !/(?:^|[\\/])(?:\.env[^\\/]*|\.vercel|\.git)(?:[\\/]|$)/.test(path) });
  }
  await mkdir(join(workspace, "scripts"), { recursive: true });
  await cp(join(root, "scripts/build-invoice-workspace.mjs"), join(workspace, "scripts/build-invoice-workspace.mjs"));
  if (!previous) await symlink(join(root, "node_modules"), join(workspace, "node_modules"), "junction");
  assert(!(await readdir(workspace)).some((name) => name.startsWith(".env")), "No environment files allowed in validation copy");
  console.log(`ISOLATED BUILD: ${workspace} (no app credentials or database; existing previews untouched)`);
  await run(["scripts/build-invoice-workspace.mjs"]);
  await run(["node_modules/next/dist/bin/next", "build"]);
  console.log(`BUILD PASSED. Validation copy: ${workspace}`);
} else {
  console.log(`LOCAL PREVIEW: http://127.0.0.1:3044/tools/json-to-typescript - ${workspace}`);
  await run(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3044"]);
}