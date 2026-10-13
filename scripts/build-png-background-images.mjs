import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { makePngFixtures } from './png-background-fixtures.mjs';

const directory = new URL('../public/blog/png-jpg-background/', import.meta.url);
const xml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const font = 'Segoe UI, Arial, sans-serif';
const text = (x, y, value, size = 26, fill = '#dbeafe', weight = 400, anchor = 'start') => `<text x="${x}" y="${y}" fill="${fill}" font-family="${font}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${xml(value)}</text>`;
const rect = (x, y, w, h, fill = '#132239', stroke = '#3b5374') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${fill}" stroke="${stroke}"/>`;
const img = (bytes, type, x, y, w, h) => `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/${type};base64,${bytes.toString('base64')}"/>`;
const frame = (title, body) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="675" viewBox="0 0 1200 675"><title>${xml(title)}</title><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#081122"/><stop offset="1" stop-color="#19243e"/></linearGradient><pattern id="checks" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#eef2f7"/><path d="M0 0h14v14H0zm14 14h14v14H14z" fill="#cbd5e1"/></pattern></defs><rect width="1200" height="675" fill="url(#bg)"/>${body}${text(600, 646, 'BYTEVERSE  /  ORIGINAL TEST ILLUSTRATION', 16, '#a9bdd8', 600, 'middle')}</svg>`;

export async function buildImages() {
  const { source, whiteJpg, blackJpg } = await makePngFixtures();
  const cover = frame('PNG to JPG: choose the background before export', `
    ${text(600, 85, 'IMAGE EXPORT / TROUBLESHOOTING', 19, '#93c5fd', 700, 'middle')}
    ${text(600, 175, 'PNG turned black?', 58, '#f8fafc', 800, 'middle')}
    ${text(600, 226, 'Check transparency before you export.', 28, '#c4d6f2', 500, 'middle')}
    ${rect(307, 273, 278, 271)}${rect(615, 273, 278, 271)}
    ${text(446, 311, 'BLACK MATTE', 19, '#cbd5e1', 700, 'middle')}
    ${text(754, 311, 'CHOSEN WHITE', 19, '#bfdbfe', 700, 'middle')}
    ${img(blackJpg, 'jpeg', 320, 333, 252, 168)}${img(whiteJpg, 'jpeg', 628, 333, 252, 168)}
    ${text(600, 592, 'Same original. Different background.', 25, '#93c5fd', 650, 'middle')}`);
  const comparisons = frame('Original alpha and two deliberately flattened JPEG variants', `
    ${text(52, 63, '01 / WHAT CHANGED', 18, '#93c5fd', 700)}
    ${text(52, 121, 'Transparency is not a colour.', 45, '#f8fafc', 750)}
    ${text(52, 164, 'Each card starts from the same original test graphic.', 25)}
    ${[52, 429, 806].map(x => rect(x, 210, 342, 344)).join('')}
    ${text(223, 253, 'ORIGINAL PNG', 22, '#93c5fd', 700, 'middle')}
    ${text(600, 253, 'BLACK-BACKGROUND JPG', 20, '#dbeafe', 700, 'middle')}
    ${text(977, 253, 'WHITE-BACKGROUND JPG', 20, '#dbeafe', 700, 'middle')}
    <rect x="65" y="282" width="316" height="211" fill="url(#checks)"/>
    ${img(source, 'png', 65, 282, 316, 211)}${img(blackJpg, 'jpeg', 442, 282, 316, 211)}${img(whiteJpg, 'jpeg', 819, 282, 316, 211)}
    ${text(223, 531, 'Background can show through', 19, '#cbd5e1', 500, 'middle')}
    ${text(600, 531, 'Transparent pixels become black', 18, '#cbd5e1', 500, 'middle')}
    ${text(977, 531, 'Black detail stays black', 19, '#cbd5e1', 500, 'middle')}
    ${text(600, 603, 'The soft blue ring blends with the chosen background.', 25, '#dbeafe', 600, 'middle')}`);
  const recovery = frame('Diagnose the background before changing pixels', `
    ${text(52, 63, '02 / CHOOSE THE RIGHT FIX', 18, '#93c5fd', 700)}
    ${text(52, 121, 'Where is the black coming from?', 44, '#f8fafc', 750)}
    ${text(52, 164, 'Open the original on light and contrasting backgrounds.', 25)}
    ${rect(52, 207, 1096, 111)}${rect(52, 335, 1096, 111)}${rect(52, 463, 1096, 111)}
    ${text(77, 251, 'VIEWER BACKDROP', 22, '#93c5fd', 750)}
    ${text(77, 286, 'Changes with the viewer background', 21)}
    ${text(656, 252, 'Do not erase the image.', 25, '#f8fafc', 650)}
    ${text(656, 286, 'Choose a display background or export fill.', 21)}
    ${text(77, 379, 'TRANSPARENT SOURCE', 22, '#93c5fd', 750)}
    ${text(77, 414, 'Alpha survives in the original PNG', 21)}
    ${text(656, 380, 'Flatten a new copy onto your colour.', 24, '#f8fafc', 650)}
    ${text(656, 414, 'Or keep PNG / WebP for transparency.', 21)}
    ${text(77, 507, 'BLACK PIXELS ALREADY SAVED', 21, '#c4b5fd', 750)}
    ${text(77, 542, 'Stays black on every background', 21)}
    ${text(656, 508, 'Find the original or edit a mask.', 24, '#f8fafc', 650)}
    ${text(656, 542, 'Changing the file extension cannot repair it.', 20)}`);
  await mkdir(directory, { recursive: true });
  const output = [];
  for (const [file, svg] of Object.entries({ 'cover.png': cover, 'alpha-vs-background.png': comparisons, 'recovery-map.png': recovery })) {
    const bytes = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    assert(bytes.length < 350_000);
    await writeFile(new URL(file, directory), bytes);
    output.push({ file, bytes: bytes.length, width: 1200, height: 675 });
  }
  return output;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assert(process.argv.length === 3 && process.argv[2] === '--write', 'Use --write to create the original article images');
  console.log(JSON.stringify(await buildImages(), null, 2));
}