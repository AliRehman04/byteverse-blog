import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const imageDirectory = fileURLToPath(new URL('../public/blog/ollama-gpu/', import.meta.url));
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 24, fill = '#dbe8ff', weight = 400) => `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Arial, sans-serif">${xml(value)}</text>`;
const rect = (x, y, width, height, fill, radius = 20, stroke = '#2b4265') => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const frame = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#0c182b"/>${text(56, 57, 'BYTEVERSE  /  LOCAL AI DIAGNOSTICS', 18, '#8fbaff', 700)}${body}<line x1="56" y1="614" x2="1144" y2="614" stroke="#2b4265"/>${text(56, 647, 'Original explanatory diagram. Not a benchmark or terminal screenshot.', 17, '#a5b5cb')}${text(1000, 647, 'byteverse.fyi', 17, '#a5b5cb')}</svg>`;

export const diagrams = {
  'cover.png': frame(
    text(56, 137, 'Ollama not using GPU?', 58, '#ffffff', 700)
    + text(56, 190, 'Windows: check the evidence before changing the setup.', 26, '#b5c8e5')
    + rect(56, 236, 650, 326, '#14253d')
    + text(86, 280, 'START WITH', 17, '#8fbaff', 700)
    + text(86, 338, 'ollama ps', 44, '#ffffff', 700)
    + text(86, 387, 'PROCESSOR tells you where the model is loaded.', 21)
    + text(86, 431, 'It does not measure live GPU activity.', 24, '#7fdfc0', 700)
    + text(86, 493, 'Right server  /  Supported driver  /  Available VRAM', 21)
    + text(86, 531, 'Use the native Windows checks for a native server.', 20, '#a5b5cb')
    + rect(738, 236, 406, 94, '#123c35', 18, '#286353')
    + text(764, 275, '100% GPU', 28, '#92ebc9', 700) + text(764, 307, 'Model in GPU memory', 20)
    + rect(738, 352, 406, 94, '#342e28', 18, '#665544')
    + text(764, 391, '100% CPU', 28, '#f5ce8c', 700) + text(764, 423, 'Model in system memory', 20)
    + rect(738, 468, 406, 94, '#203152', 18, '#435988')
    + text(764, 507, 'CPU / GPU split', 28, '#afc9ff', 700) + text(764, 539, 'Investigate memory and settings', 20)
  ),
  'processor-states.png': frame(
    text(56, 119, 'Read placement, not utilization.', 45, '#ffffff', 700)
    + text(56, 157, 'Illustrative PROCESSOR states from the documented ollama ps meanings.', 22, '#b5c8e5')
    + rect(56, 190, 1088, 112, '#14253d') + text(82, 234, '100% GPU', 28, '#92ebc9', 700)
    + text(82, 273, 'All in GPU memory', 21)
    + rect(510, 222, 596, 29, '#28896e', 8, '#28896e') + text(510, 279, 'This does not mean 100% live GPU activity.', 21)
    + rect(56, 322, 1088, 112, '#14253d') + text(82, 366, '100% CPU', 28, '#f5ce8c', 700)
    + text(82, 405, 'All in system memory', 21)
    + rect(510, 354, 596, 29, '#9f7945', 8, '#9f7945') + text(510, 411, 'Check server, support, drivers and overrides.', 21)
    + rect(56, 454, 1088, 132, '#14253d') + text(82, 498, '48% / 52% CPU / GPU', 27, '#afc9ff', 700)
    + text(82, 537, 'An example split, not a target', 21)
    + rect(510, 486, 286, 29, '#9f7945', 0, '#9f7945') + rect(796, 486, 310, 29, '#28896e', 0, '#28896e')
    + text(510, 549, 'Both memory locations are used.', 21) + text(510, 577, 'The split alone does not establish its cause.', 20, '#a5b5cb')
  ),
  'diagnostic-path.png': frame(
    text(56, 119, 'Choose the next check from the result.', 44, '#ffffff', 700)
    + text(56, 160, 'Use the same server, local model and context for each comparison.', 23, '#b5c8e5')
    + rect(340, 195, 520, 68, '#203152', 16, '#435988') + text(419, 239, 'Model loaded? Run ollama ps', 25, '#ffffff', 700)
    + '<path d="M600 263 V301 H191 M600 301 H1009 M191 301 V326 M464 301 V326 M737 301 V326 M1009 301 V326" fill="none" stroke="#7f9ecb" stroke-width="3"/>'
    + [
      { x: 56, title: 'NO ROWS', color: '#b5c8e5', lines: ['Load a local model.', 'Check the endpoint.', 'An idle model may', 'have been unloaded.'] },
      { x: 332, title: '100% CPU', color: '#f5ce8c', lines: ['Check the server.', 'Verify GPU support.', 'Review drivers and', 'CPU-forcing settings.'] },
      { x: 608, title: 'CPU / GPU', color: '#afc9ff', lines: ['GPU placement exists.', 'Review free VRAM.', 'Compare model size', 'and allocated context.'] },
      { x: 884, title: '100% GPU', color: '#92ebc9', lines: ['GPU placement works.', 'If responses are slow,', 'check the workload.', 'Avoid blind reinstalls.'] },
    ].map(card => rect(card.x, 326, 260, 246, '#14253d') + text(card.x + 20, 370, card.title, 26, card.color, 700)
      + card.lines.map((line, i) => text(card.x + 20, 419 + i * 34, line, 20)).join('')).join('')
  ),
};

export async function buildImages(write = false) {
  if (write) await mkdir(imageDirectory, { recursive: true });
  const outputs = [];
  for (const [file, svg] of Object.entries(diagrams)) {
    const bytes = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 1200); assert.equal(metadata.height, 675);
    assert(bytes.length < 350_000);
    const path = resolve(imageDirectory, file);
    if (write) {
      try { await writeFile(path, bytes, { flag: 'wx' }); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        assert((await readFile(path)).equals(bytes), `Existing illustration differs: ${file}; do not overwrite silently`);
      }
    }
    outputs.push({ file, path, bytes: bytes.length, width: metadata.width, height: metadata.height });
  }
  return outputs;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  assert(process.argv.length === 3 && process.argv[2] === '--write', 'Use --write to create the original PNG assets');
  console.log(JSON.stringify(await buildImages(true), null, 2));
}