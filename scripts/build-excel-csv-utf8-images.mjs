import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TextDecoder } from 'node:util';
import sharp from 'sharp';

// Importing exposes the SVGs and builder without rendering or writing files.
// --preview writes only to its own temporary directory; --write is opt-in.
export const imageDirectory = fileURLToPath(new URL('../public/blog/csv-utf8/', import.meta.url));
const WIDTH = 1200;
const HEIGHT = 675;
const MAX_BYTES = 350000;
const PNG_OPTIONS = { compressionLevel: 9, adaptiveFiltering: true, palette: false };
const FONT = 'Segoe UI, Arial, Liberation Sans, DejaVu Sans, sans-serif';
const MONO = 'Consolas, Liberation Mono, DejaVu Sans Mono, monospace';
const colors = { white: '#f4f7ff', ink: '#cbd7ec', muted: '#9fafd0', blue: '#80beff', violet: '#c0a8ff' };
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const hex = bytes => [...bytes].map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');

// Precomposed U+00E9, not an e followed by a combining accent.
const originalText = '\u00e9';
const wrongText = '\u00c3\u00a9';
const originalBytes = Buffer.from([0xc3, 0xa9]);
const savedBytes = Buffer.from(wrongText, 'utf8');
const originalHex = hex(originalBytes);
const savedHex = hex(savedBytes);

// Keep visible labels ASCII. The meaningful non-ASCII examples below are paths,
// so their accents and copyright sign do not depend on an installed font.
const textChecks = new Map();
function text(x, y, value, size = 24, fill = colors.ink, weight = 400, anchor = 'start', maxWidth, font = FONT) {
  assert(/^[\x20-\x7e]+$/.test(value), `Use a vector glyph for non-ASCII text: ${value}`);
  assert(value.length < 42, `Wrap this label to fewer than 42 characters: ${value}`);
  const available = maxWidth ?? (anchor === 'middle' ? 2 * Math.min(x - 24, WIDTH - 24 - x) : WIDTH - 24 - x);
  const left = anchor === 'middle' ? x - available / 2 : x;
  assert(available > 0 && left >= 0 && left + available <= WIDTH, `Text slot outside canvas: ${value}`);
  assert(y - size >= 0 && y + size * 0.3 <= HEIGHT, `Text baseline outside canvas: ${value}`);
  const key = JSON.stringify([value, size, weight, font]);
  const previous = textChecks.get(key);
  textChecks.set(key, { value, size, weight, font, maxWidth: Math.min(available, previous?.maxWidth ?? available) });
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${xml(value)}</text>`;
}

const box = (x, y, width, height, fill = 'url(#panel)', stroke = '#304266', radius = 22) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
const line = (path, color = colors.blue, width = 3) => `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const arrow = (x1, y1, x2, y2, color = colors.blue) => {
  assert(x1 === x2 || y1 === y2, 'Arrow must be horizontal or vertical');
  assert(x2 > x1 || y2 > y1, 'Arrow must point right or down');
  const head = y1 === y2 ? `M${x2 - 9} ${y2 - 6} L${x2} ${y2} L${x2 - 9} ${y2 + 6}` : `M${x2 - 6} ${y2 - 9} L${x2} ${y2} L${x2 + 6} ${y2 - 9}`;
  return line(`M${x1} ${y1} L${x2} ${y2}`, color) + line(head, color);
};

function character(centerX, top, height, wrong = false, color = colors.blue) {
  const width = wrong ? 144 : 72;
  const scale = height / 104;
  const drawing = wrong
    ? `${line('M7 94 L34 31 L61 94 M18 69 H50', color, 8)}
       ${line('M16 13 C22 3 29 3 36 10 S49 19 56 8', color, 7)}
       <circle cx="108" cy="67" r="25" fill="none" stroke="${color}" stroke-width="6"/>
       ${line('M117 56 C106 44 94 51 94 67 C94 82 108 86 118 76', color, 5.5)}`
    : `${line('M12 63 H59 C60 44 50 32 36 32 C21 32 11 46 11 63 C11 83 22 95 39 95 C48 95 55 91 61 84', color, 8)}
       ${line('M33 16 L46 5', color, 8)}`;
  return `<g transform="translate(${centerX - width * scale / 2} ${top}) scale(${scale})" role="img" aria-label="${xml(wrong ? wrongText : originalText)}"><title>${xml(wrong ? 'U+00C3 and U+00A9: ' + wrongText : 'U+00E9: ' + originalText)}</title>${drawing}</g>`;
}

// Folded paper, byte cells, magnifier, copies and archive: original SVG drawings,
// not Excel UI, font icons, emoji, downloaded artwork or screenshots.
function sheet(x, y, color = colors.blue, scale = 1, missing = false) {
  const cells = [0, 1, 2].map(row => [0, 1, 2].map(column => `<rect x="${14 + column * 17}" y="${39 + row * 16}" width="11" height="9" rx="2" fill="${missing && row === 1 ? 'none' : color}" fill-opacity="${0.32 + column * 0.18}" stroke="${color}" stroke-opacity="0.65"${missing && row === 1 ? ' stroke-dasharray="2 2"' : ''}/>`).join('')).join('');
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M8 1 H51 L77 27 V96 H8 Q1 96 1 89 V8 Q1 1 8 1 Z" fill="#101b32" stroke="${color}" stroke-width="2.5"/>${line('M51 1 V27 H77', color, 2.5)}${cells}</g>`;
}
const inspectIcon = (x, y) => `<g transform="translate(${x} ${y})">${sheet(0, 0)}<circle cx="75" cy="73" r="23" fill="#122642" stroke="${colors.blue}" stroke-width="3"/>${line('M91 90 L108 107', colors.blue, 5)}${line('M64 68 H85 M64 77 H79', colors.blue, 3)}</g>`;
const copiesIcon = (x, y) => `<g transform="translate(${x} ${y})">${sheet(0, 11, '#5a7eaf', 0.86)}${sheet(30, 0, colors.violet, 0.86)}${line('M100 91 C83 116 43 117 24 96 M25 111 L24 96 L40 96', colors.violet, 3)}</g>`;
const archiveIcon = (x, y) => `<g transform="translate(${x} ${y})">${sheet(31, 0, colors.violet, 0.65, true)}${box(8, 54, 100, 53, '#1b2340', '#8e8ddd', 8)}${box(3, 47, 110, 17, '#253154', '#a1a4ed', 5)}${line('M45 79 H73 M50 86 H68', '#c6ceff', 3)}</g>`;

const background = `<defs>
  <linearGradient id="background" x1="0%" y1="0%" x2="100%" y2="100%"><stop stop-color="#070d1c"/><stop offset="1" stop-color="#111329"/></linearGradient>
  <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%"><stop stop-color="#111e35"/><stop offset="1" stop-color="#12172d"/></linearGradient>
  <linearGradient id="accent"><stop stop-color="#83c1ff"/><stop offset="1" stop-color="#c6aaff"/></linearGradient>
  <radialGradient id="blue-glow"><stop stop-color="#236bda" stop-opacity="0.22"/><stop offset="1" stop-color="#236bda" stop-opacity="0"/></radialGradient>
  <radialGradient id="violet-glow"><stop stop-color="#7950d3" stop-opacity="0.20"/><stop offset="1" stop-color="#7950d3" stop-opacity="0"/></radialGradient>
  <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0 H0 V64" fill="none" stroke="#a9c4ff" stroke-opacity="0.045"/></pattern>
</defs><rect width="1200" height="675" fill="url(#background)"/><ellipse cx="235" cy="160" rx="590" ry="430" fill="url(#blue-glow)"/><ellipse cx="1000" cy="530" rx="570" ry="440" fill="url(#violet-glow)"/><rect width="1200" height="675" fill="url(#grid)"/>`;
const frame = (title, description, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img"><title>${xml(title)}</title><desc>${xml(description)}</desc>${background}${body}</svg>`;
const credit = () => text(600, 662, 'BYTEVERSE / ORIGINAL ILLUSTRATION', 16, colors.muted, 600, 'middle');
const byteTile = (x, y, width, height, value, size = 32, color = colors.blue) => box(x, y, width, height, '#08152a', '#36578a', 12) + text(x + width / 2, y + height / 2 + size * 0.34, value, size, color, 700, 'middle', width - 20, MONO);

// All essential cover content stays inside x=300..900. A centered square crop
// retains x=262.5..937.5; only the decorative outer sheets are expendable.
const cover = frame('CSV text broken?', 'Read the bytes before you save. The same C3 A9 bytes decode as ' + originalText + ' with UTF-8 and ' + wrongText + ' with Windows-1252. Original ByteVerse illustration.', `
  <g opacity="0.48" transform="rotate(-12 150 378)">${sheet(83, 284, '#507fbd', 1.65)}</g>
  <g opacity="0.43" transform="rotate(12 1050 378)">${sheet(982, 284, '#9173c3', 1.65)}</g>
  ${line('M65 535 H194 L218 511 M1002 174 H1090 L1123 207', '#38446f', 2)}
  <circle cx="218" cy="511" r="5" fill="#679fe3"/><circle cx="1002" cy="174" r="5" fill="#b093ef"/>
  ${box(445, 66, 310, 40, '#14223c', '#455589', 20)}
  ${text(600, 93, 'EXCEL / CSV ENCODING', 19, '#c9d9ff', 700, 'middle', 286)}
  ${text(600, 211, 'CSV text broken?', 64, 'url(#accent)', 800, 'middle', 600)}
  ${text(600, 263, 'Read the bytes before you save.', 29, '#d7e2f7', 500, 'middle', 600)}
  ${box(300, 307, 600, 276, 'url(#panel)', '#425680', 28)}
  ${text(600, 344, 'SAME ORIGINAL BYTES', 19, colors.muted, 700, 'middle', 550)}
  ${byteTile(491, 361, 94, 60, 'C3', 34)}
  ${byteTile(615, 361, 94, 60, 'A9', 34)}
  ${line('M600 422 V436 H459 M600 436 H741', '#718bc3', 2.5)}
  ${arrow(459, 436, 459, 455)}
  ${arrow(741, 436, 741, 455, colors.violet)}
  ${box(322, 457, 274, 107, '#0e253d', '#386b9d', 16)}
  ${box(604, 457, 274, 107, '#251e3f', '#68528f', 16)}
  ${text(459, 486, 'UTF-8', 21, '#bbdcff', 700, 'middle', 242)}
  ${text(741, 486, 'Windows-1252', 21, '#dccbff', 700, 'middle', 242)}
  ${character(459, 498, 57)}
  ${character(741, 498, 57, true, colors.violet)}
  ${text(600, 628, 'BYTEVERSE / byteverse.fyi', 19, '#b7c6e3', 600, 'middle', 600)}
`);

const decodeVsSave = frame('Reading is not saving', 'The same unchanged C3 A9 bytes decode to ' + originalText + ' in UTF-8 or ' + wrongText + ' in Windows-1252. Saving the wrong characters as UTF-8 produces C3 83 C2 A9 in a new file. Both byte chains are valid UTF-8, which does not prove the intended text.', `
  ${text(52, 44, '01 / DECODE VS SAVE', 18, colors.blue, 700)}
  ${text(52, 100, 'Same bytes. Different text.', 44, colors.white, 800)}
  ${text(52, 143, 'Reading and saving are separate steps.', 25)}
  ${box(52, 180, 260, 247)}
  ${text(182, 217, 'ORIGINAL BYTES', 19, colors.blue, 700, 'middle', 216)}
  ${byteTile(77, 251, 210, 78, originalHex, 42)}
  ${line('M112 358 H251 M112 370 H221', '#4b6289', 3)}
  ${text(182, 400, 'Unchanged by reading', 20, colors.ink, 500, 'middle', 226)}
  ${line('M312 303 H361', '#7994cb')}
  ${line('M361 303 V235 H393', colors.blue)}
  ${arrow(393, 235, 414, 235)}
  ${line('M361 303 V371 H393', colors.violet)}
  ${arrow(393, 371, 414, 371, colors.violet)}
  <circle cx="361" cy="303" r="5" fill="#9bbcf4"/>
  ${box(416, 180, 732, 110, '#10253e', '#386c9f')}
  ${text(444, 219, 'UTF-8', 28, colors.blue, 700, 'start', 318)}
  ${text(444, 260, 'Intended text', 25, colors.white, 600, 'start', 318)}
  ${arrow(803, 235, 885, 235)}
  ${character(1000, 192, 64)}
  ${text(1000, 280, 'U+00E9', 17, '#b7d8f7', 600, 'middle', 238, MONO)}
  ${box(416, 316, 732, 110, '#251f3c', '#6d5498')}
  ${text(444, 355, 'Windows-1252', 28, colors.violet, 700, 'start', 328)}
  ${text(444, 396, 'Wrong text for this example', 23, colors.white, 500, 'start', 330)}
  ${arrow(803, 371, 885, 371, colors.violet)}
  ${character(1000, 329, 62, true, colors.violet)}
  ${text(1000, 415, 'U+00C3 + U+00A9', 17, '#d4c3f5', 600, 'middle', 238, MONO)}
  ${arrow(1000, 428, 1000, 470, colors.violet)}
  ${text(52, 485, 'Reading leaves', 24, colors.ink, 500, 'start', 285)}
  ${text(52, 521, 'the source intact.', 24, colors.ink, 500, 'start', 285)}
  ${box(416, 474, 732, 82, '#191f39', '#7164a6', 18)}
  ${text(444, 507, 'SAVE WRONG TEXT AS UTF-8', 19, colors.violet, 700, 'start', 357)}
  ${text(444, 540, 'New file: text bytes', 24, colors.white, 600, 'start', 357)}
  ${byteTile(831, 489, 289, 52, savedHex, 30, '#dccbff')}
  ${box(52, 579, 1096, 64, '#111e35', '#365581', 16)}
  ${text(600, 605, 'Both byte chains are valid UTF-8.', 23, colors.white, 700, 'middle')}
  ${text(600, 632, 'Validity does not prove intended text.', 23, '#bdcdea', 500, 'middle')}
  ${credit()}
`);

const recoveryMap = frame('What actually survived?', 'Keep the original. Intact bytes need the correct source encoding. Saved mojibake needs a fresh original or a verified lossless reversal. If saved replacements have lost original letters, use source evidence or a backup; never invent the missing text. A replacement seen only on screen does not prove loss of the source bytes.', `
  ${text(52, 44, '02 / RECOVERY MAP', 18, colors.blue, 700)}
  ${text(52, 100, 'What actually survived?', 44, colors.white, 800)}
  ${text(52, 143, 'Preserve the original before any change.', 25)}
  ${box(52, 180, 348, 368, '#102039', '#386695')}
  ${box(426, 180, 348, 368, '#1a2039', '#59538b')}
  ${box(800, 180, 348, 368, '#251f3c', '#6d5498')}
  ${text(76, 217, '01 / ORIGINAL INTACT', 18, colors.blue, 700, 'start', 300)}
  ${text(450, 217, '02 / MOJIBAKE SAVED', 18, '#b7b9ff', 700, 'start', 300)}
  ${text(824, 217, '03 / REPLACEMENTS SAVED', 18, colors.violet, 700, 'start', 300)}
  ${inspectIcon(173, 239)}
  ${copiesIcon(547, 239)}
  ${archiveIcon(918, 239)}
  ${text(76, 384, 'Choose the decoder', 28, colors.white, 700, 'start', 300)}
  ${text(76, 428, 'Reimport the untouched', 24, colors.ink, 400, 'start', 300)}
  ${text(76, 461, 'file with its encoding.', 24, colors.ink, 400, 'start', 300)}
  ${line('M76 488 H376', '#365b86', 1)}
  ${text(76, 524, 'Verify known text.', 22, colors.blue, 600, 'start', 300)}
  ${text(450, 384, 'Fresh original first', 28, colors.white, 700, 'start', 300)}
  ${text(450, 428, 'Or use a verified,', 24, colors.ink, 400, 'start', 300)}
  ${text(450, 461, 'lossless reversal.', 24, colors.ink, 400, 'start', 300)}
  ${line('M450 488 H750', '#514d80', 1)}
  ${text(450, 524, 'Not a universal fix.', 22, '#b7b9ff', 600, 'start', 300)}
  ${text(824, 384, 'Source or backup', 28, colors.white, 700, 'start', 300)}
  ${text(824, 428, 'Lost letters cannot', 24, colors.ink, 400, 'start', 300)}
  ${text(824, 461, 'be inferred from a marker.', 23, colors.ink, 400, 'start', 300)}
  ${line('M824 488 H1124', '#644e87', 1)}
  ${text(824, 524, 'Never guess the original.', 22, colors.violet, 600, 'start', 300)}
  ${box(52, 579, 1096, 64, '#111e35', '#365581', 16)}
  ${text(600, 605, 'A display-only replacement is not proof', 23, colors.white, 700, 'middle')}
  ${text(600, 632, 'that the source bytes have been lost.', 23, '#bdcdea', 500, 'middle')}
  ${credit()}
`);

export const diagrams = Object.freeze({
  'cover.png': cover,
  'decode-vs-save.png': decodeVsSave,
  'recovery-map.png': recoveryMap,
});

function verifyByteExample() {
  const utf8 = new TextDecoder('utf-8', { fatal: true });
  assert.equal(originalHex, 'C3 A9');
  assert.equal(utf8.decode(originalBytes), originalText);
  assert.equal(new TextDecoder('windows-1252', { fatal: true }).decode(originalBytes), wrongText);
  assert.equal(savedHex, 'C3 83 C2 A9');
  assert.equal(utf8.decode(savedBytes), wrongText);
  assert(!originalBytes.equals(savedBytes), 'Reading and re-encoding must remain distinct');
}

async function verifyTextWidths() {
  // Measure the same SVG font stack used in the images, not guessed character
  // widths. An unexpected local fallback fails before any files are written.
  for (const { value, size, weight, font, maxWidth } of textChecks.values()) {
    const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="180"><rect width="2400" height="180" fill="#fff"/><text x="24" y="110" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="#000">${xml(value)}</text></svg>`;
    const { info } = await sharp(Buffer.from(sample, 'utf8')).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
    assert(info.width <= maxWidth, `Text exceeds its ${maxWidth}px slot (${info.width}px): ${value}`);
  }
}

async function validatePng(file, bytes, width = WIDTH, height = HEIGHT) {
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'png', `Unexpected format: ${file}`);
  assert.equal(metadata.width, width, `Unexpected width: ${file}`);
  assert.equal(metadata.height, height, `Unexpected height: ${file}`);
  assert(bytes.length < MAX_BYTES, `Image must be under ${MAX_BYTES} bytes: ${file} (${bytes.length})`);
  return { file, width, height, bytes: bytes.length };
}

async function renderImages() {
  verifyByteExample();
  await verifyTextWidths();
  const images = [];
  for (const [file, svg] of Object.entries(diagrams)) {
    const bytes = await sharp(Buffer.from(svg, 'utf8')).png(PNG_OPTIONS).toBuffer();
    images.push({ bytes, summary: await validatePng(file, bytes) });
  }
  return images;
}

async function assertExistingIdentical(path, bytes) {
  let existing;
  try { existing = await readFile(path); }
  catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  assert(existing.equals(bytes), `Refusing to overwrite a different existing image: ${path}`);
}

async function writeExclusive(path, bytes) {
  try { await writeFile(path, bytes, { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // Recheck after an exclusive-create race. Missing files here are an error,
    // not a successful write, so do not use the optional preflight helper.
    assert((await readFile(path)).equals(bytes), `Refusing to overwrite a different existing image: ${path}`);
  }
}

export async function buildImages(write = false) {
  assert.equal(typeof write, 'boolean', 'buildImages expects a boolean');
  const images = await renderImages();
  if (write) {
    // Catch pre-existing conflicts before creating any assets. Each later write
    // still uses wx; existing files are never truncated, replaced or deleted.
    for (const { bytes, summary } of images) await assertExistingIdentical(resolve(imageDirectory, summary.file), bytes);
    await mkdir(imageDirectory, { recursive: true });
    for (const { bytes, summary } of images) await writeExclusive(resolve(imageDirectory, summary.file), bytes);
  }
  return images.map(({ summary }) => summary);
}

export async function previewImages() {
  const images = await renderImages();
  const coverImage = images.find(({ summary }) => summary.file === 'cover.png');
  assert(coverImage, 'Cover is required for the square-crop preview');
  const crop = await sharp(coverImage.bytes).resize(600, 600, { fit: 'cover', position: 'centre' }).png(PNG_OPTIONS).toBuffer();
  const squareCrop = await validatePng('square-crop.png', crop, 600, 600);
  const directory = await mkdtemp(resolve(tmpdir(), 'byteverse-csv-utf8-images-'));
  for (const { bytes, summary } of images) await writeExclusive(resolve(directory, summary.file), bytes);
  await writeExclusive(resolve(directory, squareCrop.file), crop);
  return { directory, images: images.map(({ summary }) => summary), squareCrop };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const mode = process.argv[2];
  assert(process.argv.length === 3 && ['--preview', '--write'].includes(mode), 'Use --preview or --write');
  const result = mode === '--preview'
    ? await previewImages()
    : { directory: imageDirectory, images: await buildImages(true) };
  console.log(JSON.stringify(result, null, 2));
}