import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const imageDirectory = fileURLToPath(new URL('../public/blog/gemini-workspace/', import.meta.url));
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const sans = 'Segoe UI, Arial, sans-serif';
const t = (x, y, value, { size = 20, fill = '#e2e8f0', weight = 400, anchor = 'start', spacing = 0, opacity = 1 } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${sans}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}">${xml(value)}</text>`;
const rect = (x, y, w, h, fill, { r = 14, stroke = 'none', sw = 1, opacity = 1 } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`;
// Four-point sparkle: a generic "AI" marker, not a product logo.
const spark = (cx, cy, r, fill) => `<path d="M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z" fill="${fill}"/>`;
const check = (cx, cy, color) => `<circle cx="${cx}" cy="${cy}" r="15" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2"/><path d="M${cx - 7} ${cy} L${cx - 2} ${cy + 5} L${cx + 8} ${cy - 6}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const dash = (cx, cy, color) => `<circle cx="${cx}" cy="${cy}" r="15" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2"/><path d="M${cx - 7} ${cy} H${cx + 7}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070b1a"/><stop offset="0.55" stop-color="#0b1430"/><stop offset="1" stop-color="#101a3d"/></linearGradient>
  <radialGradient id="glowBlue" cx="0.2" cy="0.3" r="0.5"><stop offset="0" stop-color="#4285f4" stop-opacity="0.32"/><stop offset="1" stop-color="#4285f4" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowViolet" cx="0.85" cy="0.75" r="0.5"><stop offset="0" stop-color="#a855f7" stop-opacity="0.28"/><stop offset="1" stop-color="#a855f7" stop-opacity="0"/></radialGradient>
  <linearGradient id="headline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8ab4f8"/><stop offset="0.5" stop-color="#c084fc"/><stop offset="1" stop-color="#f28b82"/></linearGradient>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.04"/></pattern>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.55"/></filter>
</defs>`;
const frame = (body, footer = true) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">${defs}
<rect width="1200" height="675" fill="url(#bg)"/><rect width="1200" height="675" fill="url(#grid)"/>
<rect width="1200" height="675" fill="url(#glowBlue)"/><rect width="1200" height="675" fill="url(#glowViolet)"/>${body}
${footer ? t(600, 646, 'byteverse.fyi  ·  original explanatory diagram, not a screenshot', { size: 16, fill: '#64748b', anchor: 'middle', spacing: 0.5 }) : ''}</svg>`;

// Blog cards crop both sides and overlay badges top-left: keep key content inside x 220-980, y >= 120.
const chipRow = (y, labels) => {
  const widths = labels.map(label => Math.round(label.length * 9.6 + 36));
  let x = 600 - (widths.reduce((sum, width) => sum + width, 0) + 12 * (labels.length - 1)) / 2;
  return labels.map((label, i) => {
    const active = i === 0;
    const out = rect(x, y, widths[i], 38, active ? '#8ab4f8' : '#ffffff', { r: 19, stroke: active ? '#c3d7ff' : '#475569', opacity: active ? 1 : 0.9 })
      + (active ? '' : rect(x, y, widths[i], 38, '#0b1430', { r: 19, opacity: 0.94 }))
      + t(x + widths[i] / 2, y + 25, label, { size: 17, weight: 700, fill: active ? '#0b1430' : '#cbd5e1', anchor: 'middle' });
    x += widths[i] + 12; return out;
  }).join('');
};
const cover = frame(`
${rect(372, 122, 456, 38, '#ffffff', { r: 19, opacity: 0.07 })}${rect(372, 122, 456, 38, 'none', { r: 19, stroke: '#8ab4f8', sw: 1 })}
<circle cx="398" cy="141" r="5" fill="#34a853"/>
${t(612, 147, 'GOOGLE WORKSPACE  ·  TROUBLESHOOTING', { size: 16, weight: 700, fill: '#c7d2fe', anchor: 'middle', spacing: 1.5 })}
${t(600, 236, 'Gemini not showing', { size: 74, weight: 800, fill: '#ffffff', anchor: 'middle' })}
${t(600, 316, 'in Docs or Gmail?', { size: 78, weight: 800, fill: 'url(#headline)', anchor: 'middle' })}
<g filter="url(#shadow)">${rect(286, 352, 628, 178, '#0f172a', { r: 16, stroke: '#334155' })}</g>
<path d="M286 368 a16 16 0 0 1 16 -16 H898 a16 16 0 0 1 16 16 V388 H286 Z" fill="#162034"/>
<circle cx="310" cy="370" r="6" fill="#f87171"/><circle cx="330" cy="370" r="6" fill="#fbbf24"/><circle cx="350" cy="370" r="6" fill="#34d399"/>
${t(600, 375, 'docs.google.com  ·  illustration', { size: 14, fill: '#94a3b8', anchor: 'middle' })}
${rect(306, 404, 40, 40, '#4285f4', { r: 8 })}<path d="M318 414 H334 M318 422 H334 M318 430 H328" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
${t(360, 423, 'Quarterly plan', { size: 21, weight: 600, fill: '#f8fafc' })}
${t(360, 446, 'File   Edit   View   Insert   Format   Tools   Help', { size: 14, fill: '#94a3b8' })}
${rect(776, 404, 112, 40, '#c2e7ff', { r: 20 })}${t(832, 430, 'Share', { size: 18, weight: 700, fill: '#001d35', anchor: 'middle' })}
<rect x="610" y="404" width="150" height="40" rx="20" fill="none" stroke="#f28b82" stroke-width="2.5" stroke-dasharray="7 6"/>
${spark(636, 424, 10, '#f28b82')}${t(698, 430, 'Ask Gemini', { size: 17, weight: 700, fill: '#f28b82', anchor: 'middle' })}
<path d="M685 446 V468" fill="none" stroke="#f28b82" stroke-width="2" stroke-dasharray="5 5"/>
${t(685, 490, 'button missing', { size: 15, weight: 600, fill: '#f28b82', anchor: 'middle' })}
${rect(306, 466, 254, 10, '#1e293b', { r: 5 })}${rect(306, 486, 230, 10, '#1e293b', { r: 5 })}${rect(306, 506, 254, 10, '#1e293b', { r: 5 })}
${chipRow(556, ['5 GATES', 'Plan tier', 'Age 18+', 'Smart features', 'Language', 'Admin'])}
`);

const tiers = [
  { name: 'Business Starter · Enterprise Starter', gmail: true, docs: false },
  { name: 'Business Standard / Plus · Enterprise Standard / Plus', gmail: true, docs: true },
  { name: 'Frontline Plus', gmail: true, docs: false },
  { name: 'Google AI Plus (personal)', gmail: true, docs: false },
  { name: 'Google AI Pro · Google AI Ultra (personal)', gmail: true, docs: true, note: 'US Gmail: in-line features may replace the panel' },
  { name: 'Free personal account', gmail: 'partial', docs: false, note: 'US only: Help me write, AI Overviews, Suggested Replies' },
];
const eligibility = frame(`
${t(60, 88, 'Gmail and Docs are gated separately', { size: 40, weight: 800, fill: '#ffffff' })}
${t(60, 124, 'Gemini features Google lists per plan on its comparison page, checked October 7, 2026', { size: 19, fill: '#b5c8e5' })}
${rect(60, 150, 1080, 44, '#ffffff', { r: 10, opacity: 0.06 })}
${t(84, 179, 'ACCOUNT OR PLAN', { size: 15, weight: 700, fill: '#8ab4f8', spacing: 1.5 })}
${t(770, 179, 'GMAIL', { size: 15, weight: 700, fill: '#8ab4f8', anchor: 'middle', spacing: 1.5 })}
${t(905, 179, 'DOCS & SHEETS', { size: 15, weight: 700, fill: '#8ab4f8', anchor: 'middle', spacing: 1.5 })}
${tiers.map((tier, i) => {
  const y = 206 + i * 66;
  const docsColor = tier.docs ? '#34a853' : '#f28b82';
  return rect(60, y, 1080, 58, '#0f172a', { r: 12, stroke: '#1e293b' })
    + t(84, y + (tier.note ? 28 : 36), tier.name, { size: 20, weight: 600, fill: '#f1f5f9' })
    + (tier.note ? t(84, y + 48, tier.note, { size: 14, fill: '#94a3b8' }) : '')
    + (tier.gmail === 'partial' ? dash(770, y + 29, '#fbbf24') : check(770, y + 29, '#34a853'))
    + (tier.docs ? check(905, y + 29, '#34a853') : dash(905, y + 29, '#f28b82'))
    + t(1118, y + 35, tier.docs ? 'all panels' : 'no Docs panel', { size: 14, weight: 600, fill: docsColor, anchor: 'end' });
}).join('')}
${check(84, 616, '#34a853')}${t(108, 621, 'listed', { size: 15, fill: '#cbd5e1' })}
${dash(190, 616, '#f28b82')}${t(214, 621, 'not listed', { size: 15, fill: '#cbd5e1' })}
${dash(330, 616, '#fbbf24')}${t(354, 621, 'some features, no side panel', { size: 15, fill: '#cbd5e1' })}
`, false) .replace('</svg>', t(1140, 621, 'byteverse.fyi  ·  original diagram', { size: 15, fill: '#64748b', anchor: 'end' }) + '</svg>');

const gates = [
  { title: 'Plan tier', lines: ['Docs & Sheets need', 'Standard+, Pro or Ultra'], color: '#8ab4f8' },
  { title: 'Age 18+', lines: ['Account birthday,', 'not real age'], color: '#c084fc' },
  { title: 'Smart features', lines: ['Off by default in', 'EEA, Japan, CH, UK'], color: '#fbbf24' },
  { title: 'Language', lines: ['29 listed languages;', 'Hindi/Urdu not listed'], color: '#34d399' },
  { title: 'Admin switches', lines: ['Feature access · Beta', 'not the Gemini app toggle'], color: '#f28b82' },
];
const path = frame(`
${t(60, 84, 'Work through the gates in order', { size: 40, weight: 800, fill: '#ffffff' })}
${t(60, 120, 'Each closed gate hides the Ask Gemini button completely; the document never says which one failed', { size: 19, fill: '#b5c8e5' })}
${rect(60, 160, 250, 70, '#0f172a', { r: 14, stroke: '#334155' })}${spark(96, 195, 12, '#f28b82')}
${t(120, 189, 'Ask Gemini missing?', { size: 19, weight: 700, fill: '#f8fafc' })}${t(120, 212, 'Start with the account', { size: 14, fill: '#94a3b8' })}
<path d="M310 195 H352" stroke="#7f9ecb" stroke-width="3"/><path d="M344 186 L354 195 L344 204" fill="none" stroke="#7f9ecb" stroke-width="3" stroke-linecap="round"/>
${rect(360, 160, 240, 70, '#0f172a', { r: 14, stroke: '#334155' })}${t(380, 189, 'Personal account', { size: 18, weight: 700, fill: '#f8fafc' })}${t(380, 212, 'Google AI plan or Experiments', { size: 14, fill: '#94a3b8' })}
${rect(620, 160, 240, 70, '#0f172a', { r: 14, stroke: '#334155' })}${t(640, 189, 'Work or school', { size: 18, weight: 700, fill: '#f8fafc' })}${t(640, 212, 'Workspace edition + admin', { size: 14, fill: '#94a3b8' })}
${rect(880, 160, 260, 70, '#0f172a', { r: 14, stroke: '#334155' })}${t(900, 189, 'Intentional cases', { size: 18, weight: 700, fill: '#fbbf24' })}${t(900, 212, 'US Gmail in-line · exited Experiments', { size: 14, fill: '#94a3b8' })}
<path d="M480 230 V262 M740 230 V262 M480 262 H740" fill="none" stroke="#7f9ecb" stroke-width="3"/>
<path d="M600 262 V286" stroke="#7f9ecb" stroke-width="3"/>
${gates.map((gate, i) => {
  const x = 60 + i * 216;
  return rect(x, 290, 200, 150, '#0f172a', { r: 14, stroke: gate.color, sw: 1.5 })
    + rect(x, 290, 200, 6, gate.color, { r: 3 })
    + t(x + 100, 334, String(i + 1), { size: 30, weight: 800, fill: gate.color, anchor: 'middle' })
    + t(x + 100, 372, gate.title, { size: 20, weight: 700, fill: '#f8fafc', anchor: 'middle' })
    + t(x + 100, 400, gate.lines[0], { size: 14, fill: '#cbd5e1', anchor: 'middle' })
    + t(x + 100, 420, gate.lines[1], { size: 14, fill: '#cbd5e1', anchor: 'middle' })
    + (i < gates.length - 1 ? `<path d="M${x + 204} 365 H${x + 212}" stroke="#7f9ecb" stroke-width="3"/>` : '');
}).join('')}
<path d="M600 440 V470" stroke="#7f9ecb" stroke-width="3"/>
${rect(240, 474, 720, 100, '#052e16', { r: 16, stroke: '#34a853', sw: 2 })}
${check(280, 524, '#34a853')}
${t(312, 516, 'Button appears by itself once every gate is open', { size: 21, weight: 700, fill: '#bbf7d0' })}
${t(312, 546, 'Panel present but refusing? Usage limit or admin switch, not eligibility.', { size: 15, fill: '#86efac' })}
`);

export const diagrams = { 'cover.png': cover, 'eligibility-map.png': eligibility, 'settings-path.png': path };

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
  assert(process.argv.length === 3 && ['--write', '--preview'].includes(process.argv[2]), 'Use --write to create the PNG assets or --preview for temp renders');
  if (process.argv[2] === '--preview') {
    const { tmpdir } = await import('node:os');
    for (const [file, svg] of Object.entries(diagrams)) {
      const out = resolve(tmpdir(), `gemini-${file}`);
      await sharp(Buffer.from(svg)).png().toFile(out);
      console.log(out);
    }
  } else console.log(JSON.stringify(await buildImages(true), null, 2));
}
