import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'public/invoice-workspace/frame.html');
// Classic Blob workers work in opaque sandboxes without a module-origin check.
const workerBuild = await build({
  absWorkingDir: root, entryPoints: ['node_modules/pdfjs-dist/build/pdf.worker.mjs'],
  bundle: true, write: false, minify: true, platform: 'browser', format: 'iife',
  target: ['es2022'], define: { 'import.meta.url': '"about:blank"' }, legalComments: 'inline',
});
const worker = workerBuild.outputFiles[0].text;
const coreBuild = await build({
  absWorkingDir: root, entryPoints: ['src/lib/invoice/core-worker.ts'], bundle: true,
  write: false, minify: true, platform: 'browser', format: 'iife', target: ['es2022'],
});
const fonts = {};
const fontDirectory = resolve(root, 'node_modules/pdfjs-dist/standard_fonts');
for (const file of (await readdir(fontDirectory)).filter(file => /\.(?:pfb|ttf)$/.test(file))) {
  fonts[file] = (await readFile(resolve(fontDirectory, file))).toString('base64');
}
const licensePaths = [
  'pdfjs-dist/LICENSE', 'pdfjs-dist/standard_fonts/LICENSE_FOXIT', 'pdfjs-dist/standard_fonts/LICENSE_LIBERATION',
  'write-excel-file/LICENSE', 'fflate/LICENSE', 'react/LICENSE', 'react-dom/LICENSE', 'scheduler/LICENSE', 'lucide-react/LICENSE',
];
const licenses = (await Promise.all(licensePaths.map(async file => `${file}\n${await readFile(resolve(root, 'node_modules', file), 'utf8')}`))).join('\n\n------\n\n');
const virtual = { 'invoice:pdf-worker': worker, 'invoice:core-worker': coreBuild.outputFiles[0].text, 'invoice:pdf-fonts': fonts, 'invoice:licenses': licenses };
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/components/invoice-workspace/entry.tsx'],
  outdir: '.invoice-build',
  bundle: true, write: false, splitting: false, minify: true, metafile: true,
  platform: 'browser', target: ['es2022'], format: 'iife', legalComments: 'inline',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'invoice-local-assets', setup(context) {
    context.onResolve({ filter: /^invoice:/ }, args => {
      assert(Object.hasOwn(virtual, args.path), 'Unknown invoice asset');
      return { path: args.path, namespace: 'invoice' };
    });
    context.onLoad({ filter: /.*/, namespace: 'invoice' }, args => ({ contents: `export default ${JSON.stringify(virtual[args.path])}`, loader: 'js' }));
  } }],
});
const javascript = result.outputFiles.find(file => file.path.endsWith('.js'))?.text.replace(/<\/script/gi, '<\\/script');
const css = result.outputFiles.find(file => file.path.endsWith('.css'))?.text;
assert(javascript && css, 'Missing workspace bundle');
assert(Object.values(result.metafile.outputs).every(file => file.imports.length === 0), 'Private workspace must not load external chunks');
const hash = createHash('sha256').update(javascript).digest('base64');
const policy = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; worker-src blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Private invoice workspace — ByteVerse</title><style>${css}</style></head><body><div id="invoice-app"></div><noscript>This private invoice tool requires JavaScript to process files locally. No files are uploaded.</noscript><script>${javascript}</script></body></html>`;
await mkdir(resolve(root, 'public/invoice-workspace'), { recursive: true });
await writeFile(output, html, 'utf8');
console.log(`Invoice sandbox built: ${Math.round(Buffer.byteLength(html) / 1024)} KB, inline hashed script/CSS, bundled PDF worker/fonts, no external chunks.`);