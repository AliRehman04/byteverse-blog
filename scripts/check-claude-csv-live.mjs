// Read-only live verification for articles 238/239 and the image studio release.
// Polls the deployment status of the given commit (default HEAD), then checks live pages.
import { execSync } from 'node:child_process';

const site = 'https://www.byteverse.fyi';
const posts = [
  { slug: 'claude-code-not-recognized-windows-2026', dir: 'claude-code-windows', images: ['cover', 'diagnostic-map', 'terminal-environments'], host: 'what-is-claude-code-guide-2026' },
  { slug: 'excel-csv-special-characters-utf8', dir: 'csv-utf8', images: ['cover', 'decode-vs-save', 'recovery-map'], host: 'excel-csv-leading-zeros-2026' },
];
const sha = process.argv[2] ?? execSync('git rev-parse HEAD').toString().trim();
const bust = () => `?v=${Date.now()}`;
const get = async path => {
  const res = await fetch(site + path + bust(), { redirect: 'manual' });
  return { status: res.status, type: res.headers.get('content-type') ?? '', text: await res.text() };
};

const deadline = Date.now() + 10 * 60_000;
let state = 'pending';
while (Date.now() < deadline) {
  const res = await fetch(`https://api.github.com/repos/AliRehman04/byteverse-blog/commits/${sha}/status`);
  state = (await res.json()).state;
  if (state !== 'pending') break;
  await new Promise(resolve => setTimeout(resolve, 20_000));
}
console.log(`deploy ${sha.slice(0, 7)}: ${state}`);
if (state !== 'success') throw new Error(`Deployment not successful (${state}); pass a full commit SHA`);

const results = {};
for (const { slug, dir, images, host } of posts) {
  const article = await get(`/blog/${slug}`);
  results[`article:${slug}`] = article.status === 200
    && article.text.includes(`rel="canonical" href="${site}/blog/${slug}"`)
    && !/name="robots" content="[^"]*noindex/.test(article.text);
  for (const image of images) {
    const res = await get(`/blog/${dir}/${image}.png`);
    results[`image:${dir}/${image}`] = res.status === 200 && res.type.startsWith('image/png');
  }
  results[`backlink:${host}`] = (await get(`/blog/${host}`)).text.includes(`/blog/${slug}`);
  for (const path of ['/blog', '/sitemap.xml', '/feed.xml']) results[`${path}:${slug}`] = (await get(path)).text.includes(slug);
}
for (const draft of ['pdf-to-podcast-notebooklm-2026', 'audacity-noise-reduction-voice-2026']) {
  const page = await get(`/blog/${draft}`);
  results[`hidden:${draft}`] = page.status === 404 || page.text.includes('Post Not Found');
}
const tool = await get('/tools/image-compressor');
results.toolTitle = tool.status === 200 && tool.text.includes('Free Image Compressor, Resizer');
console.log(JSON.stringify(results, null, 2));
process.exitCode = Object.values(results).every(Boolean) ? 0 : 1;
console.log(process.exitCode ? 'FAIL: some live checks did not pass' : 'PASS: live release verified');


