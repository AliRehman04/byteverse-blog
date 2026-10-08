import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const imageDirectory = fileURLToPath(new URL('../public/blog/csv-excel/', import.meta.url));
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 24, fill = '#deebf1', weight = 400, anchor = 'start') => `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${xml(value)}</text>`;
const box = (x, y, width, height, fill = '#102332', stroke = '#294250', radius = 20) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const arrow = (x, y, length = 40, color = '#6e91a2') => `<path d="M${x} ${y} h${length} m-10 -8 10 8 -10 8" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const background = `<defs>
  <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07161f"/><stop offset="1" stop-color="#101b30"/></linearGradient>
  <radialGradient id="halo"><stop stop-color="#23bdb2" stop-opacity="0.2"/><stop offset="1" stop-color="#23bdb2" stop-opacity="0"/></radialGradient>
  <linearGradient id="accent"><stop stop-color="#74efd1"/><stop offset="1" stop-color="#8fdaff"/></linearGradient>
  <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M54 0 H0 V54" fill="none" stroke="#b1dfeb" stroke-opacity="0.045"/></pattern>
</defs><rect width="1200" height="675" fill="url(#background)"/><rect width="1200" height="675" fill="url(#grid)"/><ellipse cx="800" cy="350" rx="550" ry="400" fill="url(#halo)"/>`;
const frame = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">${background}${body}</svg>`;
const credit = () => text(600, 640, 'BYTEVERSE  /  Original illustration, not an Excel screenshot', 16, '#8daab6', 400, 'middle');

// Core cover content avoids the side crop and the featured-card badges.
const cover = frame(`
  <circle cx="145" cy="327" r="70" fill="none" stroke="#294d57" stroke-dasharray="7 10"/>
  ${text(145, 350, '0', 74, '#3b7881', 700, 'middle')}
  <circle cx="1070" cy="327" r="70" fill="none" stroke="#294d57" stroke-dasharray="7 10"/>
  ${text(1070, 350, '0', 74, '#3b7881', 700, 'middle')}
  ${box(427, 122, 346, 38, '#143339', '#357766', 19)}
  ${text(600, 147, 'EXCEL + CSV  /  DATA GUIDE', 17, '#a4efd7', 700, 'middle')}
  ${text(600, 237, 'Leading zeros', 76, '#ffffff', 800, 'middle')}
  ${text(600, 320, 'disappearing?', 78, 'url(#accent)', 800, 'middle')}
  ${box(265, 366, 285, 158, '#2c2328', '#795254')}
  ${text(407, 403, 'AUTO-CONVERTED', 16, '#ffa894', 700, 'middle')}
  ${text(407, 475, '123', 65, '#ffb19f', 800, 'middle')}
  ${arrow(572, 445, 50, '#a4efd7')}
  ${box(648, 366, 285, 158, '#11382f', '#399c79')}
  ${text(791, 403, 'IMPORT AS TEXT', 16, '#9ceec9', 700, 'middle')}
  ${text(791, 475, '000123', 58, '#afffd8', 800, 'middle')}
  ${text(600, 572, 'Keep IDs intact. Check the source first.', 27, '#d6e8ef', 600, 'middle')}
  ${text(600, 634, 'byteverse.fyi', 18, '#9bb1bd', 600, 'middle')}
`);

const source = frame(`
  ${text(60, 87, 'Where did the zeros disappear?', 44, '#ffffff', 800)}
  ${text(60, 128, 'Check the original text, the imported value and the saved export separately.', 24, '#b5cdd8')}
  ${box(60, 190, 314, 300)}
  ${text(86, 233, '1  ORIGINAL CSV', 19, '#a4efd7', 700)}
  ${text(217, 327, '000123', 57, '#afffd8', 800, 'middle')}
  ${text(86, 398, 'Still here in a text editor?', 21)}
  ${text(86, 433, 'Your source is intact.', 21)}
  ${arrow(385, 336, 26)}
  ${box(433, 190, 314, 300, '#2c2328', '#795254')}
  ${text(459, 233, '2  NUMBER CONVERSION', 18, '#ffb19f', 700)}
  ${text(590, 327, '123', 64, '#ffb19f', 800, 'middle')}
  ${text(459, 398, 'Reimport as Text before', 21)}
  ${text(459, 433, 'numeric conversion.', 21)}
  ${arrow(759, 336, 26)}
  ${box(806, 190, 334, 300)}
  ${text(832, 233, '3  SAVED CSV', 19, '#ffcba0', 700)}
  ${text(973, 327, '123', 64, '#ffd5a9', 800, 'middle')}
  ${text(832, 398, 'Shortened in the file too?', 21)}
  ${text(832, 433, 'Use the original or backup.', 21)}
  ${box(60, 529, 1080, 61, '#133034', '#326a63', 14)}
  ${text(600, 568, 'Changing the damaged value to Text does not restore its missing characters.', 24, '#b9f4dc', 600, 'middle')}
  ${credit()}
`);

const pipeline = frame(`
  ${text(60, 85, 'Import order matters', 46, '#ffffff', 800)}
  ${text(60, 126, 'Set identifier columns to Text before they become numbers.', 26, '#b5cdd8')}
  ${box(60, 184, 510, 345, '#2b242a', '#78575e')}
  ${text(87, 228, 'AVOID THIS ORDER', 19, '#ffa894', 700)}
  ${text(87, 291, 'Source: 000123', 33, '#ffffff', 700)}
  ${text(87, 351, 'Number: 123', 33, '#ffb19f', 700)}
  ${text(87, 411, 'Then Text: "123"', 33, '#ffb19f', 700)}
  ${text(87, 480, 'A later Text step cannot undo the loss.', 23)}
  ${box(606, 184, 534, 345, '#10362f', '#368d75')}
  ${text(633, 228, 'PRESERVE THE ORIGINAL', 19, '#9ceec9', 700)}
  ${text(633, 291, 'Original CSV', 33, '#ffffff', 700)}
  ${text(633, 351, 'No guessed numeric types', 30, '#afffd8', 700)}
  ${text(633, 411, 'ID as Text: "000123"', 33, '#afffd8', 700)}
  ${text(633, 480, 'Convert amount columns separately.', 23)}
  ${text(600, 581, 'Inspect Applied Steps: replace or remove an unwanted Changed Type step.', 23, '#c5e2ea', 600, 'middle')}
  ${credit()}
`);

export const diagrams = { 'cover.png': cover, 'source-vs-import.png': source, 'import-order.png': pipeline };

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
    const directory = await mkdtemp(resolve(tmpdir(), 'byteverse-csv-images-'));
    for (const [file, svg] of Object.entries(diagrams)) await sharp(Buffer.from(svg)).png().toFile(resolve(directory, file));
    await sharp(Buffer.from(cover)).resize(600, 600, { fit: 'cover' }).png().toFile(resolve(directory, 'square-crop.png'));
    console.log(JSON.stringify({ directory, images: await buildImages() }, null, 2));
  } else console.log(JSON.stringify(await buildImages(true), null, 2));
}