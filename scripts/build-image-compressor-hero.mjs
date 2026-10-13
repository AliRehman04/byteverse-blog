import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// James Wheeler, Pexels 417074; https://www.pexels.com/license/ permits website use and adaptation.
const source = 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?cs=srgb&w=1400&fit=max';
const response = await fetch(source, { signal: AbortSignal.timeout(30_000) });
assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), 'Photo download failed');
const bytes = Buffer.from(await response.arrayBuffer());
assert(bytes.length > 1000 && bytes.length < 10_000_000, 'Unexpected source photo size');
const image = await sharp(bytes).rotate().resize(1200, 800, { fit: 'cover', position: 'centre' }).webp({ quality: 86, effort: 6 }).toBuffer();
assert(image.length < 250_000, 'Hero photo exceeds its static asset budget');
const directory = new URL('../public/images/tools/image-compressor/', import.meta.url);
await mkdir(directory, { recursive: true });
const output = new URL('hero-moraine-lake.webp', directory);
await writeFile(output, image);
console.log(JSON.stringify({ file: fileURLToPath(output), width: 1200, height: 800, bytes: image.length,
  credit: 'James Wheeler / Pexels', sourcePage: 'https://www.pexels.com/photo/lake-and-mountain-417074/' }));