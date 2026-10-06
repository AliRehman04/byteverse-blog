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

// Key content stays inside x 220-980 / y >= 120: blog cards crop both sides and overlay badges top-left.
const sans = 'Segoe UI, Arial, sans-serif';
const mono = 'Consolas, Courier New, monospace';
const t = (x, y, value, { size = 20, fill = '#e2e8f0', weight = 400, family = sans, anchor = 'start', spacing = 0 } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${family}" text-anchor="${anchor}" letter-spacing="${spacing}">${xml(value)}</text>`;
const chip = (x, y, width, label, active) => `<rect x="${x}" y="${y}" width="${width}" height="38" rx="19" fill="${active ? '#22c55e' : '#ffffff'}" fill-opacity="${active ? 1 : 0.06}" stroke="${active ? '#4ade80' : '#475569'}"/>`
  + t(x + width / 2, y + 25, label, { size: 17, weight: 700, fill: active ? '#052e16' : '#cbd5e1', anchor: 'middle' });
const chipRow = (y, labels) => {
  const widths = labels.map(label => Math.round(label.length * 10 + 40));
  let x = 600 - (widths.reduce((sum, width) => sum + width, 0) + 12 * (labels.length - 1)) / 2;
  return labels.map((label, i) => { const out = chip(x, y, widths[i], label, i === 0); x += widths[i] + 12; return out; }).join('');
};
const pins = (x, y, size, color) => [0, 1, 2, 3].map(i => {
  const p = x + 22 + i * ((size - 44) / 3);
  const q = y + 22 + i * ((size - 44) / 3);
  return `<path d="M${p} ${y - 14} V${y} M${p} ${y + size} V${y + size + 14} M${x - 14} ${q} H${x} M${x + size} ${q} H${x + size + 14}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;
}).join('');
const fan = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="30" fill="#052e16" stroke="#4ade80" stroke-width="3"/>`
  + [0, 120, 240].map(angle => `<path d="M${cx} ${cy} q14 -22 0 -26" fill="none" stroke="#86efac" stroke-width="4" stroke-linecap="round" transform="rotate(${angle} ${cx} ${cy})"/>`).join('')
  + `<circle cx="${cx}" cy="${cy}" r="6" fill="#86efac"/>`;

const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#050816"/><stop offset="0.55" stop-color="#0a1530"/><stop offset="1" stop-color="#140a2e"/></linearGradient>
  <radialGradient id="gpuGlow" cx="0.88" cy="0.5" r="0.42"><stop offset="0" stop-color="#22c55e" stop-opacity="0.38"/><stop offset="1" stop-color="#22c55e" stop-opacity="0"/></radialGradient>
  <radialGradient id="cpuGlow" cx="0.1" cy="0.55" r="0.36"><stop offset="0" stop-color="#f59e0b" stop-opacity="0.26"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient>
  <radialGradient id="centerGlow" cx="0.5" cy="0.42" r="0.45"><stop offset="0" stop-color="#6366f1" stop-opacity="0.28"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></radialGradient>
  <linearGradient id="headline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.045"/></pattern>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.6"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
</defs>
<rect width="1200" height="675" fill="url(#bg)"/>
<rect width="1200" height="675" fill="url(#grid)"/>
<rect width="1200" height="675" fill="url(#cpuGlow)"/>
<rect width="1200" height="675" fill="url(#gpuGlow)"/>
<rect width="1200" height="675" fill="url(#centerGlow)"/>

<g opacity="0.75">
  <rect x="62" y="262" width="120" height="120" rx="16" fill="#1c1408" stroke="#f59e0b" stroke-width="3"/>
  ${pins(62, 262, 120, '#b45309')}
  <rect x="90" y="290" width="64" height="64" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="#fbbf24" stroke-width="2"/>
  ${t(122, 331, 'CPU', { size: 22, weight: 800, fill: '#fbbf24', anchor: 'middle' })}
</g>
<path d="M200 322 C 245 322, 255 440, 296 440" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="8 8" stroke-opacity="0.6"/>

<rect x="996" y="252" width="184" height="138" rx="16" fill="#22c55e" fill-opacity="0.35" filter="url(#soft)"/>
<rect x="996" y="252" width="184" height="138" rx="16" fill="#071a10" stroke="#4ade80" stroke-width="3"/>
${fan(1046, 311)}${fan(1128, 311)}
<rect x="1012" y="358" width="152" height="18" rx="4" fill="#4ade80" fill-opacity="0.18"/>
${t(1088, 372, 'GPU', { size: 15, weight: 800, fill: '#86efac', anchor: 'middle', spacing: 3 })}
<path d="M1010 390 V404 M1030 390 V404 M1050 390 V404 M1070 390 V404 M1090 390 V404 M1110 390 V404" stroke="#facc15" stroke-width="5" stroke-opacity="0.7"/>
<path d="M904 440 C 945 440, 950 322, 986 322" fill="none" stroke="#4ade80" stroke-width="3" stroke-dasharray="8 8"/>
<path d="M976 312 L990 322 L976 332" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

<rect x="384" y="122" width="432" height="38" rx="19" fill="#ffffff" fill-opacity="0.07" stroke="#818cf8" stroke-opacity="0.6"/>
<circle cx="410" cy="141" r="5" fill="#4ade80"/>
${t(608, 147, 'WINDOWS  ·  LOCAL AI TROUBLESHOOTING', { size: 16, weight: 700, fill: '#c7d2fe', anchor: 'middle', spacing: 1.5 })}
${t(600, 240, 'Ollama not using', { size: 74, weight: 800, fill: '#ffffff', anchor: 'middle' })}
${t(600, 322, 'your GPU?', { size: 82, weight: 800, fill: 'url(#headline)', anchor: 'middle' })}

<g filter="url(#shadow)">
  <rect x="296" y="358" width="608" height="172" rx="16" fill="#0b1222" stroke="#334155"/>
</g>
<path d="M296 374 a16 16 0 0 1 16 -16 H888 a16 16 0 0 1 16 16 V392 H296 Z" fill="#131c31"/>
<circle cx="320" cy="375" r="6" fill="#f87171"/><circle cx="340" cy="375" r="6" fill="#fbbf24"/><circle cx="360" cy="375" r="6" fill="#34d399"/>
${t(600, 381, 'Windows PowerShell', { size: 14, fill: '#94a3b8', anchor: 'middle' })}
${t(886, 381, 'illustration', { size: 12, fill: '#64748b', anchor: 'end' })}
${t(322, 428, 'PS>', { size: 21, weight: 700, fill: '#60a5fa', family: mono })}${t(368, 428, 'ollama ps', { size: 21, fill: '#f8fafc', family: mono })}
${t(322, 462, 'NAME', { size: 15, fill: '#64748b', family: mono, spacing: 1 })}${t(552, 462, 'PROCESSOR', { size: 15, fill: '#64748b', family: mono, spacing: 1 })}
${t(322, 503, 'llama3.2', { size: 21, fill: '#e2e8f0', family: mono })}
<rect x="540" y="478" width="132" height="36" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b"/>
${t(606, 503, '100% CPU', { size: 20, weight: 700, fill: '#fbbf24', family: mono, anchor: 'middle' })}
<path d="M688 496 H736 M726 486 L738 496 L726 506" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="752" y="478" width="132" height="36" rx="8" fill="#22c55e" fill-opacity="0.18" stroke="#4ade80"/>
${t(818, 503, '100% GPU', { size: 20, weight: 700, fill: '#4ade80', family: mono, anchor: 'middle' })}

${chipRow(556, ['7 CHECKS', 'Server', 'Driver', 'VRAM', 'Context', 'Logs'])}
${t(600, 640, 'byteverse.fyi', { size: 17, weight: 600, fill: '#64748b', anchor: 'middle', spacing: 1 })}
</svg>`;

export const diagrams = {
  'cover-v2.png': cover,
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