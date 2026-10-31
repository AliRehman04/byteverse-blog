import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { Socket } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

// Small controlled in-memory examples, not a perceptual benchmark or live-tool test.
const root = fileURLToPath(new URL('../', import.meta.url));
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const width = 600, height = 400, channels = 3;
const rawOptions = { raw: { width, height, channels } };

function synthetic(kind) {
  const bytes = Buffer.alloc(width * height * channels);
  let state = 0x18c0ffee;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rgb;
      if (kind === 'flat') {
        const band = Math.floor(x / 100) % 3;
        rgb = [[245, 248, 252], [37, 99, 235], [15, 118, 110]][band];
        if (y > 100 && y < 300 && x > 140 && x < 460) rgb = [15, 23, 42];
        if (y > 175 && y < 200 && x > 170 && x < 430) rgb = [245, 248, 252];
      } else {
        rgb = [0, 1, 2].map(channel => {
          state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
          const noise = (state >>> 0) % 81 - 40;
          const gradient = channel === 0 ? x / width * 200 : channel === 1 ? y / height * 200 : (x + y) / (width + height) * 200;
          return Math.max(0, Math.min(255, Math.round(30 + gradient + noise)));
        });
      }
      const offset = (y * width + x) * channels;
      bytes[offset] = rgb[0]; bytes[offset + 1] = rgb[1]; bytes[offset + 2] = rgb[2];
    }
  }
  return bytes;
}

export async function verifyExperiment() {
  const oldFetch = globalThis.fetch, oldConnect = Socket.prototype.connect;
  const blocked = () => { throw new Error('Network forbidden during image measurement'); };
  globalThis.fetch = blocked; Socket.prototype.connect = blocked;
  const hook = registerHooks({ resolve(specifier, context, next) {
    assert(!/^(?:@next\/env|@neondatabase\/serverless|dotenv|pg)(?:\/|$)/.test(specifier), 'Environment/database modules forbidden');
    return next(specifier, context);
  } });
  try {
    const assetPath = resolve(root, 'public/images/tools/image-compressor/hero-moraine-lake.webp');
    const asset = readFileSync(assetPath), originalAssetHash = hash(asset);
    const photo = await sharp(asset).resize(width, height, { fit: 'fill', kernel: 'lanczos3' }).toColourspace('srgb').removeAlpha().raw().toBuffer();
    assert.equal(photo.length, width * height * channels);
    const fixtures = [
      { id: 'landscape', label: 'Landscape derivative', pixels: photo },
      { id: 'flat', label: 'Synthetic flat graphic', pixels: synthetic('flat') },
      { id: 'noise', label: 'Synthetic noisy gradient', pixels: synthetic('noise') },
    ];
    const records = [];
    let decodedOutputs = 0, exactLossless = 0;
    for (const fixture of fixtures) {
      for (const quality of [45, 85]) {
        const input = await sharp(fixture.pixels, rawOptions).jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' }).toBuffer();
        const inputHash = hash(input);
        const decoded = await sharp(input).toColourspace('srgb').removeAlpha().raw().toBuffer();
        const results = [];
        for (const setting of [
          { id: 'lossy80', options: { quality: 80, lossless: false, effort: 6 } },
          { id: 'lossy95', options: { quality: 95, lossless: false, effort: 6 } },
          { id: 'lossless', options: { quality: 100, lossless: true, effort: 6 } },
        ]) {
          const output = await sharp(input).webp(setting.options).toBuffer();
          const metadata = await sharp(output).metadata();
          assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, width); assert.equal(metadata.height, height);
          assert(!metadata.exif && !metadata.icc && !metadata.xmp && !metadata.hasAlpha);
          const outputPixels = await sharp(output).toColourspace('srgb').removeAlpha().raw().toBuffer();
          assert.equal(outputPixels.length, decoded.length); decodedOutputs++;
          const samePixels = outputPixels.equals(decoded);
          if (setting.id === 'lossless') { assert(samePixels, 'Opaque lossless output must preserve decoded JPEG RGB pixels'); exactLossless++; }
          results.push({ setting: setting.id, bytes: output.length, largerThanInput: output.length > input.length,
            identicalToDecodedJpeg: samePixels, sha256: hash(output) });
        }
        assert.equal(hash(input), inputHash);
        records.push({ fixture: fixture.id, label: fixture.label, jpegQuality: quality, sourceBytes: input.length,
          sourceSha256: inputHash, results });
      }
    }
    assert.equal(decodedOutputs, 18); assert.equal(exactLossless, 6);
    assert(records.some(row => row.results.some(output => output.largerThanInput)));
    assert(records.some(row => row.results.some(output => !output.largerThanInput)));
    assert.equal(hash(readFileSync(assetPath)), originalAssetHash, 'Existing asset must remain unchanged');
    return {
      status: 'passed', node: process.version, sharp: sharp.versions.sharp, libwebp: sharp.versions.webp,
      libvips: sharp.versions.vips, mozjpeg: sharp.versions.mozjpeg, width, height, channels,
      basePixelHashes: fixtures.map(fixture => ({ id: fixture.id, sha256: hash(fixture.pixels) })),
      existingAssetSha256: originalAssetHash,
      photoCredit: 'James Wheeler / Pexels417074; existing lossy WebP derivative, not a camera original',
      sourcePage: 'https://www.pexels.com/photo/lake-and-mountain-417074/',
      sourceJpegSettings: { qualities: [45, 85], mozjpeg: true, chromaSubsampling: '4:2:0' },
      records, decodedOutputs, exactLosslessChecks: exactLossless, originalsUnchanged: true,
      imageFilesWritten: 0,
      limits: 'Three illustrative bases, six generated JPEG inputs, eighteen independent WebP encodes. Not representative, quality-matched, SSIM-tested or a browser-tool benchmark. Lossless equality is relative to decoded opaque JPEG pixels, not an earlier original. No network, environment or database access.',
    };
  } finally { globalThis.fetch = oldFetch; Socket.prototype.connect = oldConnect; hook.deregister(); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  assert.equal(process.argv.length, 2);
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ...await verifyExperiment() }, null, 2));
}