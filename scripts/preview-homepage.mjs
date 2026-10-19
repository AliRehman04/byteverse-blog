import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { previewCategories, previewPosts, previewHomePosts } from './homepage-fixtures.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const parent = dirname(root.replace(/[\\/]$/, ''));
const [mode, previous] = process.argv.slice(2);
assert(['--build', '--refresh', '--serve'].includes(mode));
assert(process.argv.length <= 4 && (mode === '--build' || previous));
const workspace = previous ? resolve(previous) : await mkdtemp(join(parent, '.byteverse-homepage-check-'));
assert(dirname(workspace) === parent && workspace.startsWith(join(parent, '.byteverse-homepage-check-')));
assert((await lstat(workspace)).isDirectory());
const env = {};
for (const key of ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'ProgramFiles', 'ProgramFiles(x86)']) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, { NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: '', GROQ_API_KEY: '', RESEND_API_KEY: '', NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://www.byteverse.fyi' });
async function run(args) {
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, { cwd: workspace, env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? accept() : reject(new Error(`Preview command failed (${code})`)));
  });
}
if (mode !== '--serve') {
  for (const entry of ['src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'eslint.config.mjs']) {
    await cp(join(root, entry), join(workspace, entry), { recursive: true, filter: path => !/(?:^|[\\/])(?:\.env[^\\/]*|\.vercel|\.git)(?:[\\/]|$)/.test(path) });
  }
  await mkdir(join(workspace, 'scripts'), { recursive: true });
  for (const entry of ['build-invoice-workspace.mjs', 'build-image-studio.mjs']) await cp(join(root, 'scripts', entry), join(workspace, 'scripts', entry));
  if (!previous) await symlink(join(root, 'node_modules'), join(workspace, 'node_modules'), 'junction');
  const homepage = join(workspace, 'src/app/page.tsx');
  const source = await readFile(homepage, 'utf8');
  if (source.includes('  const dbCategories =')) {
    const start = source.indexOf('  const dbCategories ='), end = source.indexOf('  const categoryIcons:', start);
    assert(start > 0 && end > start);
    const fixtures = `  const allCategories = ${JSON.stringify(previewCategories)}.map(category => ({ ...category, createdAt: new Date('2026-01-01T00:00:00.000Z') }));\n  const cats = allCategories;\n  const latestPosts = ${JSON.stringify(previewPosts)}.map(post => ({ ...post, createdAt: new Date(post.createdAt), updatedAt: new Date(post.updatedAt) }));\n  const popularPosts = latestPosts;\n  const totalPostCount = 170;\n  const categoryMap = new Map(allCategories.map(category => [category.id, category]));\n\n`;
    await writeFile(homepage, source.slice(0, start) + fixtures + source.slice(end));
  } else {
    assert(source.includes('getHomepagePosts'), 'Unknown homepage data boundary');
    await writeFile(join(workspace, 'src/lib/homepage-data.ts'), `import type { HomepagePost } from './homepage';\nexport async function getHomepagePosts(): Promise<HomepagePost[]> { return ${JSON.stringify(previewHomePosts)}.map(post => ({ ...post, createdAt: new Date(post.createdAt) })); }\n`);
  }
  assert(!(await readdir(workspace)).some(name => name.startsWith('.env')));
  console.log(`HOMEPAGE PREVIEW COPY: ${workspace} (fictional article fixtures, no credentials/database)`);
  await run(['scripts/build-invoice-workspace.mjs']);
  await run(['scripts/build-image-studio.mjs']);
  await run(['node_modules/next/dist/bin/next', 'build']);
  console.log(`BUILD PASSED: ${workspace}`);
} else {
  console.log(`HOMEPAGE PREVIEW: http://127.0.0.1:3060/ - ${workspace}`);
  await run(['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3060']);
}