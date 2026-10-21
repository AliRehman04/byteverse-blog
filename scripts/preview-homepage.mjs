import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { previewCategories, previewPosts, previewHomePosts } from './homepage-fixtures.mjs';
import { getPublishedHomepagePreview } from './homepage-public-preview.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const parent = dirname(root.replace(/[\\/]$/, ''));
const options = process.argv.slice(2);
const cachedFonts = options.includes('--cached-fonts');
const webpack = options.includes('--webpack');
const publishedContent = options.includes('--public-content');
const args = options.filter(value => !['--cached-fonts', '--webpack', '--public-content'].includes(value));
const [mode, previous] = args;
assert(['--build', '--refresh', '--serve', '--dev', '--sync'].includes(mode));
assert(args.length <= 2 && (mode === '--build' || mode === '--dev' || previous));
const workspace = previous ? resolve(previous) : await mkdtemp(join(parent, '.byteverse-homepage-check-'));
assert(dirname(workspace) === parent && workspace.startsWith(join(parent, '.byteverse-homepage-check-')));
assert((await lstat(workspace)).isDirectory());
const env = {};
for (const key of ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'ProgramFiles', 'ProgramFiles(x86)']) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, { NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: '', GROQ_API_KEY: '', RESEND_API_KEY: '', NODE_ENV: mode === '--dev' ? 'development' : 'production', NEXT_PUBLIC_SITE_URL: 'https://www.byteverse.fyi' });
async function run(args) {
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, { cwd: workspace, env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? accept() : reject(new Error(`Preview command failed (${code})`)));
  });
}
if (mode !== '--serve') {
  const entries = mode === '--sync'
    ? ['src/app/page.tsx', 'src/app/home-premium.module.css', 'src/app/opengraph-image.tsx', 'src/lib/homepage.ts', 'src/components/homepage-tool-finder.tsx', 'src/components/homepage-tool-finder.module.css', 'src/components/homepage-newsletter.tsx', 'src/components/homepage-newsletter.module.css', 'public/blog']
    : ['src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'eslint.config.mjs'];
  for (const entry of entries) {
    await cp(join(root, entry), join(workspace, entry), { recursive: true, filter: path => !/(?:^|[\\/])(?:\.env[^\\/]*|\.vercel|\.git)(?:[\\/]|$)/.test(path) });
  }
  await mkdir(join(workspace, 'scripts'), { recursive: true });
  for (const entry of ['build-invoice-workspace.mjs', 'build-image-studio.mjs']) await cp(join(root, 'scripts', entry), join(workspace, 'scripts', entry));
  if (!previous) await symlink(join(root, 'node_modules'), join(workspace, 'node_modules'), 'junction');
  const homepage = join(workspace, 'src/app/page.tsx');
  const source = await readFile(homepage, 'utf8');
  let publicSnapshot = null;
  const snapshotPath = join(workspace, 'homepage-published.json');
  if (publishedContent) {
    publicSnapshot = await getPublishedHomepagePreview();
    await writeFile(snapshotPath, JSON.stringify(publicSnapshot, null, 2));
  } else if (mode === '--sync') {
    try { publicSnapshot = JSON.parse(await readFile(snapshotPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (publicSnapshot) {
    assert(publicSnapshot.source === 'https://www.byteverse.fyi/feed.xml' && publicSnapshot.posts.length === 9);
    assert(publicSnapshot.posts.every(post => /^[a-z0-9-]+$/.test(post.slug) && typeof post.title === 'string' && Number.isFinite(Date.parse(post.createdAt))));
    // Public preview links open the real article, not a database-free local 404.
    await writeFile(homepage, source.replaceAll('href={`/blog/', 'href={`https://www.byteverse.fyi/blog/')
      .replaceAll('href="/blog"', 'href="https://www.byteverse.fyi/blog"')
      .replaceAll('href={`/category/', 'href={`https://www.byteverse.fyi/category/'));
  }
  if (source.includes('  const dbCategories =')) {
    const start = source.indexOf('  const dbCategories ='), end = source.indexOf('  const categoryIcons:', start);
    assert(start > 0 && end > start);
    const fixtures = `  const allCategories = ${JSON.stringify(previewCategories)}.map(category => ({ ...category, createdAt: new Date('2026-01-01T00:00:00.000Z') }));\n  const cats = allCategories;\n  const latestPosts = ${JSON.stringify(previewPosts)}.map(post => ({ ...post, createdAt: new Date(post.createdAt), updatedAt: new Date(post.updatedAt) }));\n  const popularPosts = latestPosts;\n  const totalPostCount = 170;\n  const categoryMap = new Map(allCategories.map(category => [category.id, category]));\n\n`;
    await writeFile(homepage, source.slice(0, start) + fixtures + source.slice(end));
  } else {
    assert(source.includes('getHomepagePosts'), 'Unknown homepage data boundary');
    await writeFile(join(workspace, 'src/lib/homepage-data.ts'), `import type { HomepagePost } from './homepage';\nexport async function getHomepagePosts(): Promise<HomepagePost[]> { return ${JSON.stringify(publicSnapshot?.posts ?? previewHomePosts)}.map(post => ({ ...post, createdAt: new Date(post.createdAt) })); }\n`);
  }
  if (cachedFonts) {
    // Cached Latin Geist bytes are used only in this disposable preview.
    const media = join(root, '.next/static/media');
    const files = await readdir(media);
    await mkdir(join(workspace, 'src/app/_preview-fonts'), { recursive: true });
    let layout = await readFile(join(workspace, 'src/app/layout.tsx'), 'utf8');
    assert(layout.includes('import { Geist, Geist_Mono } from "next/font/google";'));
    layout = layout.replace('import { Geist, Geist_Mono } from "next/font/google";', 'import localFont from "next/font/local";');
    for (const font of [
      { prefix: 'caa3a2e1cccd8315', name: 'Geist', variable: 'geistSans', cssVariable: '--font-geist-sans', preload: true },
      { prefix: '797e433ab948586e', name: 'Geist_Mono', variable: 'geistMono', cssVariable: '--font-geist-mono', preload: false },
    ]) {
      const candidates = files.filter(name => name.startsWith(font.prefix) && name.endsWith('.woff2'));
      assert.equal(candidates.length, 1, `Cached ${font.name} font is required`);
      const bytes = await readFile(join(media, candidates[0]));
      assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
      await writeFile(join(workspace, 'src/app/_preview-fonts', `${font.name}.woff2`), bytes);
      const pattern = new RegExp(`const ${font.variable} = ${font.name}\\(\\{[\\s\\S]*?\\}\\);`);
      assert(pattern.test(layout));
      layout = layout.replace(pattern, `const ${font.variable} = localFont({ src: './_preview-fonts/${font.name}.woff2', variable: '${font.cssVariable}', weight: '100 900', display: 'swap', preload: ${font.preload} });`);
    }
    await writeFile(join(workspace, 'src/app/layout.tsx'), layout);
    console.log('PREVIEW FONT MODE: cached Geist Latin files; production font configuration unchanged.');
  }
  assert(!(await readdir(workspace)).some(name => name.startsWith('.env')));
  console.log(`HOMEPAGE PREVIEW COPY: ${workspace} (${publicSnapshot ? 'real published public-content snapshot' : 'fictional article fixtures'}, no credentials/database)`);
  if (mode === '--sync') {
    console.log(`Homepage source and ${publicSnapshot ? 'published posts' : 'fictional fixtures'} synced to the existing preview.`);
  } else if (mode === '--dev') {
    await run(['node_modules/next/dist/bin/next', 'dev', ...(webpack ? ['--webpack'] : []), '--hostname', '127.0.0.1', '--port', '3060']);
  } else {
    await run(['scripts/build-invoice-workspace.mjs']);
    await run(['scripts/build-image-studio.mjs']);
    await run(['node_modules/next/dist/bin/next', 'build', ...(webpack ? ['--webpack'] : [])]);
    console.log(`BUILD PASSED: ${workspace}`);
  }
} else {
  console.log(`HOMEPAGE PREVIEW: http://127.0.0.1:3060/ - ${workspace}`);
  await run(['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3060']);
}