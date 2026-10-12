import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Local, reproducible asset build only. No environment loading, network,
// package-manager calls, Next bundling, image data or database connections.
const root = fileURLToPath(new URL('../', import.meta.url));
const outdir = resolve(root, 'public/image-studio');
const prefix = '/image-studio/';
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const slash = (path) => path.split(sep).join('/');
const binaries = {
  jpegEncode: '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm',
  jpegDecode: '@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm',
  webpEncode: '@jsquash/webp/codec/enc/webp_enc.wasm',
  webpDecode: '@jsquash/webp/codec/dec/webp_dec.wasm',
  avifEncode: '@jsquash/avif/codec/enc/avif_enc.wasm',
  avifDecode: '@jsquash/avif/codec/dec/avif_dec.wasm',
  pngDecode: '@jsquash/png/codec/pkg/squoosh_png_bg.wasm',
  oxipng: '@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm',
  resize: '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm',
};
const packageVersions = {
  '@jsquash/jpeg': '1.6.0', '@jsquash/png': '3.1.1', '@jsquash/oxipng': '2.3.0',
  '@jsquash/webp': '1.5.0', '@jsquash/avif': '2.1.1', '@jsquash/resize': '2.1.1',
  'libheif-js': '1.23.5', exifr: '7.1.3',
};
const licenseFiles = [
  '@jsquash/jpeg/LICENSE', '@jsquash/jpeg/codec/LICENSE.codec.md',
  '@jsquash/png/LICENSE', '@jsquash/png/codec/LICENSE.codec.md',
  '@jsquash/oxipng/LICENSE', '@jsquash/oxipng/codec/LICENSE.codec.md',
  '@jsquash/webp/LICENSE', '@jsquash/webp/codec/LICENSE.codec.md',
  '@jsquash/avif/LICENSE', '@jsquash/resize/LICENSE',
  '@jsquash/resize/lib/resize/LICENSE.codec.md',
  'libheif-js/LICENSE', 'libheif-js/libheif-wasm/LICENSE', 'exifr/LICENSE',
];
const pending = new Map();
const wasmAssets = {};
const dependencies = [];
for (const [name, expected] of Object.entries(packageVersions)) {
  const pkg = JSON.parse(await readFile(resolve(root, 'node_modules', name, 'package.json'), 'utf8'));
  assert.equal(pkg.version, expected, `Review the ${name} adapter and asset/license paths before changing its verified version`);
  const shortName = name.split('/').at(-1);
  const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  dependencies.push({
    name, version: pkg.version, license: pkg.license,
    source: repository?.startsWith('http') ? repository.replace(/\.git$/, '') : repository?.startsWith('git+')
      ? repository.slice(4).replace(/\.git$/, '') : `https://github.com/${repository}`,
    versionedPackageSource: `https://registry.npmjs.org/${name}/-/${shortName}-${pkg.version}.tgz`,
    ...(name === 'libheif-js' ? {
      variant: 'libheif-js/wasm-bundle, ESM factory with embedded WASM',
      buildSource: 'https://github.com/catdad-experiments/libheif-js/tree/v1.23.5',
      upstreamSource: 'https://github.com/strukturag/libheif',
      modifications: 'Bundled/minified browser glue; console calls removed to avoid leaking file-derived decoder errors. Embedded WASM is unmodified.',
      replacement: 'Replace the installed interface-compatible libheif-js factory and rerun this build; the codec remains a separate lazy chunk. License permits modification and reverse engineering for debugging such modifications.',
    } : {}),
  });
}
for (const [key, source] of Object.entries(binaries)) {
  const data = await readFile(resolve(root, 'node_modules', source));
  assert.equal(data.subarray(0, 8).toString('hex'), '0061736d01000000', `Not a WASM binary: ${source}`);
  const hash = sha256(data);
  const filename = source.split('/').at(-1);
  const output = `wasm/${key}-${hash.slice(0, 16)}.wasm`;
  wasmAssets[key] = { url: prefix + output, filename, bytes: data.byteLength, sha256: hash };
  pending.set(output, { data, kind: 'wasm', source });
}
for (const source of licenseFiles) {
  const data = await readFile(resolve(root, 'node_modules', source));
  const output = `licenses/${source.replace(/^@/, '').replaceAll('/', '--')}.txt`;
  pending.set(output, { data, kind: 'license', source });
}
// Preserve the exact LGPL library's separately replaceable distributed source
// and build metadata, as well as its complete bundled LGPL/GPL license texts.
for (const source of ['libheif-js/libheif-wasm/libheif-bundle.mjs', 'libheif-js/package.json', 'libheif-js/README.md']) {
  const output = `sources/${source.replaceAll('/', '--')}.txt`;
  pending.set(output, { data: await readFile(resolve(root, 'node_modules', source)), kind: 'source', source });
}
const notices = [
  'Image studio third-party codec notices',
  '',
  'This software is based in part on the work of the Independent JPEG Group.',
  'libheif-js / libheif are used under LGPL-3.0; complete installed LGPL/GPL notices accompany these assets.',
  'The HEIC WASM binary is embedded in its lazy JavaScript chunk, not downloaded from a CDN.',
  'The distributed libheif factory source and versioned upstream/build source links accompany the manifest.',
  'Bundling/minification and removal of console calls are the only libheif glue changes; codec WASM is unmodified.',
  'The library may be modified/replaced and reverse engineered for debugging such modifications under its license.',
  'Rebuild with an interface-compatible libheif factory to relink its independent lazy chunk; no integrity restriction is applied to that JS factory.',
  'No decoder makes an image upload request. Source-code links below are attribution, not runtime fetch destinations.',
  '',
  ...dependencies.flatMap((dependency) => [
    `${dependency.name}@${dependency.version} — ${dependency.license}`,
    `Repository: ${dependency.source}`,
    `Versioned package: ${dependency.versionedPackageSource}`,
    ...(dependency.buildSource ? [`Build source: ${dependency.buildSource}`, `Upstream: ${dependency.upstreamSource}`] : []),
    '',
  ]),
].join('\n');
pending.set('THIRD-PARTY-NOTICES.txt', { data: Buffer.from(notices), kind: 'license' });

const result = await build({
  absWorkingDir: root, entryPoints: ['src/lib/image-studio/worker.ts'], outdir,
  entryNames: 'worker', chunkNames: 'chunks/[name]-[hash]', assetNames: 'assets/[name]-[hash]',
  bundle: true, write: false, splitting: true, minify: true, metafile: true,
  platform: 'browser', format: 'esm', target: ['es2022'], charset: 'ascii',
  legalComments: 'inline', treeShaking: true, drop: ['console'],
  define: { process: 'undefined', global: 'globalThis' },
  plugins: [{
    name: 'image-studio-local-assets',
    setup(context) {
      context.onResolve({ filter: /^image-studio:assets$/ }, () => ({ path: 'assets', namespace: 'image-studio' }));
      context.onLoad({ filter: /.*/, namespace: 'image-studio' }, () => ({
        contents: `export const wasmAssets = Object.freeze(${JSON.stringify(wasmAssets)});`, loader: 'js',
      }));
      // Emscripten ships unreachable Node branches in browser distributions.
      // Never turn these into external browser imports, polyfills or fetches.
      context.onResolve({ filter: /^(?:node:)?(?:fs|path|url|module|zlib)$/ }, (args) => ({ path: args.path, namespace: 'node-forbidden' }));
      context.onLoad({ filter: /.*/, namespace: 'node-forbidden' }, () => ({
        contents: 'throw new Error("Node I/O is unavailable in the image worker"); export const createRequire = () => { throw new Error("Node I/O is unavailable"); };', loader: 'js',
      }));
    },
  }],
});
for (const [file, metadata] of Object.entries(result.metafile.outputs)) {
  assert(metadata.imports.every((item) => !item.external), `External import in ${file}`);
}
const inputs = Object.keys(result.metafile.inputs).map(slash);
assert(!inputs.some((file) => /avif_enc_mt|webp_enc_simd|pkg-parallel|wasm-feature-detect|lib\/hqx|lib\/magic-kernel/.test(file)), 'Unexpected SIMD/threaded/unused heavyweight codec dependency');
assert(inputs.some((file) => /libheif-bundle\.mjs$/.test(file)), 'Missing lazy HEIC WASM bundle');
for (const output of result.outputFiles) {
  const path = slash(relative(outdir, output.path));
  assert(path && !path.startsWith('../') && !path.startsWith('/'), 'Build escaped the owned artifact directory');
  pending.set(path, { data: Buffer.from(output.contents), kind: path === 'worker.js' ? 'worker' : 'module' });
}
assert(pending.has('worker.js'), 'Missing stable worker entry');
const assets = [...pending.entries()].map(([file, { data, kind, source }]) => ({
  url: prefix + file, bytes: data.byteLength, sha256: sha256(data), kind,
  required: true, ...(source ? { source } : {}),
})).sort((a, b) => a.url.localeCompare(b.url, 'en'));
const version = sha256(assets.map((asset) => `${asset.url}:${asset.sha256}`).join('\n')).slice(0, 24);
const manifest = {
  schemaVersion: 1, version, workerUrl: prefix + 'worker.js', manifestUrl: prefix + 'manifest.json',
  format: 'module', singleThread: true, crossOriginIsolationRequired: false,
  totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
  totalIncludesManifest: false,
  offlineScope: 'Worker, codecs, binaries, licenses and replaceable library source only. The parent must separately cache the application shell. No user images or metadata are cached by this engine.',
  assets, dependencies,
};
// Finish all validation before replacing any build output. Do not recursively
// remove public/image-studio: another owner may add its service worker there.
for (const [file, { data }] of pending) {
  const path = resolve(outdir, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}
const manifestData = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
await writeFile(resolve(outdir, 'manifest.json'), manifestData);
console.log(`Image studio built: ${assets.length} first-party assets, ${manifest.totalBytes.toLocaleString('en-US')} bytes (+ ${manifestData.byteLength} manifest bytes).`);
console.log(`Worker: ${manifest.workerUrl} (ESM); manifest: ${manifest.manifestUrl}; build ${version}.`);
console.log('All encoders/EXIF/HEIC are lazy; single-thread WASM; no environment, database or network access during build.');