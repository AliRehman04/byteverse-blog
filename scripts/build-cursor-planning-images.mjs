import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

// Original typographic cover for the Cursor "Planning next moves" article. Not a product screenshot.
export const imageDirectory = fileURLToPath(new URL('../public/blog/cursor-planning-next-moves/', import.meta.url));
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 24, fill = '#e2e8f0', weight = 400, anchor = 'start') => `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${xml(value)}</text>`;
const box = (x, y, width, height, fill = '#111827', stroke = '#334155', radius = 20) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const background = `<defs>
  <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#09090b"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
  <radialGradient id="halo"><stop stop-color="#8b5cf6" stop-opacity="0.30"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>
  <radialGradient id="halo2"><stop stop-color="#ec4899" stop-opacity="0.16"/><stop offset="1" stop-color="#ec4899" stop-opacity="0"/></radialGradient>
  <linearGradient id="accent"><stop stop-color="#a78bfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient>
  <pattern id="grid" width="52" height="52" patternUnits="userSpaceOnUse"><path d="M52 0 H0 V52" fill="none" stroke="#94a3b8" stroke-opacity="0.065"/></pattern>
</defs><rect width="1200" height="675" fill="url(#background)"/><rect width="1200" height="675" fill="url(#grid)"/><ellipse cx="330" cy="300" rx="520" ry="380" fill="url(#halo)"/><ellipse cx="980" cy="420" rx="420" ry="320" fill="url(#halo2)"/>`;
const frame = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">${background}${body}</svg>`;

const checks = ['Status page', 'Stop + new chat', 'Full quit', 'Network path', 'Indexing', 'MCP servers', 'Extensions', 'Version'];
const list = checks.map((label, index) => {
  const y = 160 + index * 56;
  return `${box(742, y - 30, 380, 44, index === 3 ? '#2e1065' : '#0b1220', index === 3 ? '#a78bfa' : '#334155', 12)}
  ${text(766, y, String(index + 1).padStart(2, '0'), 20, '#c4b5fd', 700)}
  ${text(812, y, label, 22, '#f8fafc', 600)}`;
}).join('');

const cover = frame(`
  ${box(80, 92, 318, 40, '#2e1065', '#8b5cf6', 20)}
  ${text(239, 119, 'CURSOR  /  TROUBLESHOOTING', 17, '#ddd6fe', 700, 'middle')}
  ${text(80, 215, 'Agent stuck on', 66, '#ffffff', 800)}
  ${text(80, 292, '“Planning next', 66, 'url(#accent)', 800)}
  ${text(80, 369, 'moves”?', 66, 'url(#accent)', 800)}
  ${box(80, 408, 600, 118, '#0b1220', '#8b5cf6')}
  ${text(110, 452, 'Diagnostics can pass while the stream is cut.', 25, '#f8fafc', 700)}
  ${text(110, 494, 'Eight checks, in the order that resolved real threads.', 22, '#cbd5e1', 500)}
  ${text(80, 582, 'byteverse.fyi', 18, '#94a3b8', 600)}
  ${list}
  ${text(600, 640, 'BYTEVERSE  /  Original illustration, not a product screenshot', 16, '#94a3b8', 400, 'middle')}
`);

export const diagrams = { 'cover.png': cover };

export async function buildImages(write = false) {
  if (write) await mkdir(imageDirectory, { recursive: true });
  const output = [];
  for (const [file, svg] of Object.entries(diagrams)) {
    const bytes = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 1200); assert.equal(metadata.height, 675);
    assert(bytes.length < 350000, `Image exceeds size budget: ${file}`);
    const path = resolve(imageDirectory, file);
    if (write) {
      try { await writeFile(path, bytes, { flag: 'wx' }); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        assert((await readFile(path)).equals(bytes), `Existing image differs: ${file}`);
      }
    }
    output.push({ file, width: metadata.width, height: metadata.height, bytes: bytes.length });
  }
  return output;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const mode = process.argv[2];
  assert(process.argv.length === 3 && ['--write', '--preview'].includes(mode), 'Use --write or --preview');
  if (mode === '--preview') {
    const directory = await mkdtemp(resolve(tmpdir(), 'byteverse-cursor-images-'));
    for (const [file, svg] of Object.entries(diagrams)) await sharp(Buffer.from(svg)).png().toFile(resolve(directory, file));
    console.log(JSON.stringify({ directory, images: await buildImages() }, null, 2));
  } else console.log(JSON.stringify(await buildImages(true), null, 2));
}
