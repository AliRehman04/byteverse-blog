import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const parent = dirname(root.replace(/[\\/]$/, ""));
const [mode, previous] = process.argv.slice(2);
assert(["--build", "--refresh", "--serve"].includes(mode) && process.argv.length <= 4, "Use --build, --refresh <copy> or --serve <copy>");
assert(mode === "--build" || previous, "A previous task-owned copy is required");
const workspace = previous ? resolve(previous) : await mkdtemp(join(parent, ".byteverse-csv-diff-check-"));
assert(dirname(workspace) === parent && workspace.startsWith(join(parent, ".byteverse-csv-diff-check-")));
assert((await lstat(workspace)).isDirectory());
const env = {};
for (const key of ["PATH", "Path", "PATHEXT", "SystemRoot", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE", "ProgramFiles", "ProgramFiles(x86)"]) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, { NEXT_TELEMETRY_DISABLED: "1", DATABASE_URL: "", GROQ_API_KEY: "", RESEND_API_KEY: "", NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://www.byteverse.fyi" });
async function run(args) {
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, { cwd: workspace, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? accept() : reject(new Error(`Preview command failed (${code})`)));
  });
}

if (mode !== "--serve") {
  for (const entry of ["src", "public", "package.json", "package-lock.json", "tsconfig.json", "next-env.d.ts", "next.config.ts", "postcss.config.mjs", "eslint.config.mjs"]) {
    await cp(join(root, entry), join(workspace, entry), { recursive: true, filter: path => !/(?:^|[\\/])(?:\.env[^\\/]*|\.vercel|\.git)(?:[\\/]|$)/.test(path) });
  }
  await mkdir(join(workspace, "scripts"), { recursive: true });
  for (const entry of ["build-invoice-workspace.mjs", "build-image-studio.mjs"]) await cp(join(root, "scripts", entry), join(workspace, "scripts", entry));
  if (!previous) await symlink(join(root, "node_modules"), join(workspace, "node_modules"), "junction");
  assert(!(await readdir(workspace)).some(name => name.startsWith(".env")));
  const media = join(root, ".next/static/media");
  const fonts = await readdir(media);
  const fontDir = join(workspace, "src/app/_preview-fonts");
  await mkdir(fontDir, { recursive: true });
  let layout = await readFile(join(workspace, "src/app/layout.tsx"), "utf8");
  assert(layout.includes('import { Geist, Geist_Mono } from "next/font/google";'));
  layout = layout.replace('import { Geist, Geist_Mono } from "next/font/google";', 'import localFont from "next/font/local";');
  for (const font of [
    { prefix: "caa3a2e1cccd8315", name: "Geist", variable: "geistSans", cssVariable: "--font-geist-sans", preload: true },
    { prefix: "797e433ab948586e", name: "Geist_Mono", variable: "geistMono", cssVariable: "--font-geist-mono", preload: false },
  ]) {
    const files = fonts.filter(name => name.startsWith(font.prefix) && name.endsWith(".woff2"));
    assert.equal(files.length, 1, `Existing cached ${font.name} font required; no font download in the preview`);
    const bytes = await readFile(join(media, files[0]));
    assert.equal(bytes.subarray(0, 4).toString(), "wOF2");
    await writeFile(join(fontDir, `${font.name}.woff2`), bytes);
    const pattern = new RegExp(`const ${font.variable} = ${font.name}\\(\\{[\\s\\S]*?\\}\\);`);
    assert(pattern.test(layout));
    layout = layout.replace(pattern, `const ${font.variable} = localFont({ src: './_preview-fonts/${font.name}.woff2', variable: '${font.cssVariable}', weight: '100 900', display: 'swap', preload: ${font.preload} });`);
  }
  await writeFile(join(workspace, "src/app/layout.tsx"), layout);
  console.log(`ISOLATED CSV DIFF PREVIEW: ${workspace}; credentials excluded, database disabled, cached fonts only.`);
  await run(["scripts/build-invoice-workspace.mjs"]);
  await run(["scripts/build-image-studio.mjs"]);
  await run(["node_modules/next/dist/bin/next", "build"]);
  console.log(`BUILD PASSED: ${workspace}`);
} else {
  console.log(`CSV DIFF PREVIEW: http://127.0.0.1:3066/tools/csv-diff`);
  await run(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3066"]);
}