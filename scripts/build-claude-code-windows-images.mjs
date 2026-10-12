import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const imageDirectory = fileURLToPath(new URL('../public/blog/claude-code-windows/', import.meta.url));
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 24, fill = '#e2e8f0', weight = 400, anchor = 'start') => `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${xml(value)}</text>`;
const box = (x, y, width, height, fill = '#111827', stroke = '#334155', radius = 20) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const arrow = (x, y, length = 40, color = '#60a5fa') => `<path d="M${x} ${y} h${length} m-10 -8 10 8 -10 8" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const background = `<defs>
  <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#09090b"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
  <radialGradient id="halo"><stop stop-color="#2563eb" stop-opacity="0.28"/><stop offset="1" stop-color="#2563eb" stop-opacity="0"/></radialGradient>
  <linearGradient id="accent"><stop stop-color="#60a5fa"/><stop offset="1" stop-color="#a78bfa"/></linearGradient>
  <pattern id="grid" width="52" height="52" patternUnits="userSpaceOnUse"><path d="M52 0 H0 V52" fill="none" stroke="#94a3b8" stroke-opacity="0.065"/></pattern>
</defs><rect width="1200" height="675" fill="url(#background)"/><rect width="1200" height="675" fill="url(#grid)"/><ellipse cx="690" cy="320" rx="590" ry="400" fill="url(#halo)"/>`;
const frame = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">${background}${body}</svg>`;
const credit = () => text(600, 640, 'BYTEVERSE  /  Original illustration, not a product screenshot', 16, '#94a3b8', 400, 'middle');

const cover = frame(`
  ${text(128, 360, '>_', 100, '#1e3a8a', 800, 'middle')}
  ${text(1070, 360, '>_', 100, '#312e81', 800, 'middle')}
  ${box(408, 113, 384, 40, '#172554', '#3b82f6', 20)}
  ${text(600, 140, 'WINDOWS  /  TROUBLESHOOTING', 17, '#bfdbfe', 700, 'middle')}
  ${text(600, 247, 'Claude Code', 78, '#ffffff', 800, 'middle')}
  ${text(600, 332, 'not recognized?', 67, 'url(#accent)', 800, 'middle')}
  ${box(290, 380, 620, 133, '#0b1220', '#3b82f6')}
  ${text(326, 423, 'PS > claude', 27, '#bfdbfe', 600)}
  ${text(326, 465, 'Check the file. Then check PATH.', 29, '#f8fafc', 700)}
  ${text(600, 573, 'Find the cause before reinstalling.', 26, '#cbd5e1', 600, 'middle')}
  ${text(600, 632, 'byteverse.fyi', 18, '#94a3b8', 600, 'middle')}
`);

const diagnostic = frame(`
  ${text(58, 84, 'One error. Three different checks.', 44, '#ffffff', 800)}
  ${text(58, 126, 'Follow the evidence instead of applying every fix.', 26, '#cbd5e1')}
  ${box(58, 187, 328, 333)}
  ${text(84, 232, '01  FILE EXISTS', 19, '#93c5fd', 700)}
  ${text(84, 299, 'Missing?', 35, '#ffffff', 700)}
  ${text(84, 343, 'Check install method', 23)}
  ${text(84, 378, 'or update recovery.', 23)}
  ${text(84, 474, 'PATH cannot restore a file.', 20, '#c4b5fd', 600)}
  ${arrow(395, 355, 29)}
  ${box(442, 187, 326, 333)}
  ${text(468, 232, '02  FULL PATH RUNS', 19, '#93c5fd', 700)}
  ${text(468, 299, 'Version prints?', 33, '#ffffff', 700)}
  ${text(468, 343, 'This launcher works.', 23)}
  ${text(468, 378, 'Now test its name.', 23)}
  ${text(468, 474, 'Not proof of login success.', 20, '#c4b5fd', 600)}
  ${arrow(778, 355, 29)}
  ${box(824, 187, 318, 333, '#172554', '#3b82f6')}
  ${text(850, 232, '03  NAME RESOLVES', 19, '#bfdbfe', 700)}
  ${text(850, 299, 'Wrong or absent?', 30, '#ffffff', 700)}
  ${text(850, 343, 'Check PATH, aliases', 23)}
  ${text(850, 378, 'and this environment.', 23)}
  ${text(850, 474, 'Verify in a fresh terminal.', 20, '#bfdbfe', 600)}
  ${text(600, 581, 'A working full path + a failing bare command narrows the investigation.', 25, '#e2e8f0', 600, 'middle')}
  ${credit()}
`);

const environments = frame(`
  ${text(58, 84, 'Same editor. Different environments.', 43, '#ffffff', 800)}
  ${text(58, 126, 'Success in one place does not install or repair the others.', 25, '#cbd5e1')}
  ${box(60, 187, 344, 351)}
  ${text(88, 235, 'VS CODE PANEL', 22, '#93c5fd', 700)}
  ${text(88, 303, 'Private CLI', 35, '#ffffff', 700)}
  ${text(88, 354, 'Bundled with extension.', 22)}
  ${text(88, 388, 'Not a terminal install.', 22)}
  ${text(88, 482, 'Panel works != PATH fixed', 20, '#c4b5fd', 600)}
  ${box(428, 187, 344, 351, '#172554', '#3b82f6')}
  ${text(456, 235, 'WINDOWS TERMINAL', 21, '#bfdbfe', 700)}
  ${text(456, 303, 'Standalone CLI', 32, '#ffffff', 700)}
  ${text(456, 354, 'Windows command lookup.', 22)}
  ${text(456, 388, 'Its own process PATH.', 22)}
  ${text(456, 482, 'Restart stale terminal hosts.', 20, '#bfdbfe', 600)}
  ${box(796, 187, 344, 351)}
  ${text(824, 235, 'WSL TERMINAL', 22, '#a78bfa', 700)}
  ${text(824, 303, 'Linux install', 35, '#ffffff', 700)}
  ${text(824, 354, 'Inside that distribution.', 22)}
  ${text(824, 388, 'Check what resolves.', 22)}
  ${text(824, 482, 'Do not mix npm environments.', 19, '#c4b5fd', 600)}
  ${text(600, 588, 'Record the terminal type alongside the error before changing anything.', 25, '#e2e8f0', 600, 'middle')}
  ${credit()}
`);

export const diagrams = { 'cover.png': cover, 'diagnostic-map.png': diagnostic, 'terminal-environments.png': environments };

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
    const directory = await mkdtemp(resolve(tmpdir(), 'byteverse-claude-windows-images-'));
    for (const [file, svg] of Object.entries(diagrams)) await sharp(Buffer.from(svg)).png().toFile(resolve(directory, file));
    await sharp(Buffer.from(cover)).resize(600, 600, { fit: 'cover' }).png().toFile(resolve(directory, 'square-crop.png'));
    console.log(JSON.stringify({ directory, images: await buildImages() }, null, 2));
  } else console.log(JSON.stringify(await buildImages(true), null, 2));
}