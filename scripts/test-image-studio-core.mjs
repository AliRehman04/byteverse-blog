import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

// Synthetic header/encoder fixtures only. No application entry point, codecs,
// environment files, database, network, browser, installs or filesystem writes.
const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "src", "lib", "image-studio");
const names = ["types", "bytes", "sniff", "geometry", "target", "filenames", "settings"];
const allowed = new Set(names);
const sources = new Map(names.map((name) => [name, readFileSync(path.join(directory, `${name}.ts`), "utf8")]));
let deniedAccesses = 0;
const blocked = () => { deniedAccesses++; throw new Error("Unexpected environment, network, storage, DOM or timer access"); };
const sandbox = { console: { log: blocked, warn: blocked, error: blocked } };
for (const name of ["process", "fetch", "window", "document", "navigator", "self", "localStorage", "indexedDB", "caches", "XMLHttpRequest", "WebSocket", "setTimeout", "setInterval"]) {
  Object.defineProperty(sandbox, name, { get: blocked });
}
const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
const cache = new Map();
function load(name) {
  assert.ok(allowed.has(name), "Only the seven owned modules may load");
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(directory, `${name}.ts`);
  const compiled = ts.transpileModule(sources.get(name), {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, strict: true, isolatedModules: true },
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0, `${name}: transpile diagnostics`);
  const moduleRecord = { exports: {} };
  cache.set(name, moduleRecord);
  const wrapper = new vm.Script(`(function(exports, require, module) {\n${compiled.outputText}\n})`, { filename }).runInContext(context);
  wrapper(moduleRecord.exports, (specifier) => {
    assert.match(specifier, /^\.\/(types|bytes|sniff|geometry|target|filenames|settings)$/);
    return load(specifier.slice(2));
  }, moduleRecord);
  return moduleRecord.exports;
}
const types = load("types");
const bytes = load("bytes");
const geometry = load("geometry");
const { sniffImage, SNIFF_LIMITS } = load("sniff");
const { searchTarget, TARGET_SEARCH_LIMITS } = load("target");
const { uniqueOutputName, MAX_OUTPUT_NAME_BYTES } = load("filenames");
const settings = load("settings");
const { DEFAULT_SETTINGS, IMAGE_LIMITS } = types;
const options = (changes = {}) => ({ ...DEFAULT_SETTINGS, ...changes });
const plain = (value) => JSON.parse(JSON.stringify(value));
const invalid = (run, pattern = /must|budget|exceed|unknown|invalid|unexpected|crop|target|quality|setting|KB|KiB|MiB/i) => assert.throws(run, pattern);

test("strict ES2017 no-emit checks with DOM and separately worker libraries", () => {
  for (const lib of [["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"], ["lib.esnext.d.ts", "lib.webworker.d.ts"]]) {
    const program = ts.createProgram(names.map((name) => path.join(directory, `${name}.ts`)), {
      target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib, types: [], strict: true, isolatedModules: true, skipLibCheck: true, noEmit: true, incremental: false,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (filename) => filename, getCurrentDirectory: () => root, getNewLine: () => "\n",
    }));
    assert.deepEqual(program.getSourceFiles().filter((file) => !file.isDeclarationFile).map((file) => path.basename(file.fileName)).sort(),
      names.map((name) => `${name}.ts`).sort());
  }
});

test("exact runtime exports and immutable defaults/budgets", () => {
  const exports = {
    types: ["DEFAULT_SETTINGS", "IMAGE_LIMITS", "OUTPUT_EXTENSIONS", "OUTPUT_MIME"],
    bytes: ["UNIT_BYTES", "formatBytes", "parseTarget", "savings"],
    geometry: ["computeDimensions", "estimateScale", "getCropPixels", "normalizeCrop", "validateDimensions"],
    sniff: ["SNIFF_LIMITS", "sniffImage"], target: ["TARGET_SEARCH_LIMITS", "searchTarget"],
    filenames: ["MAX_OUTPUT_NAME_BYTES", "uniqueOutputName"],
    settings: ["DEFAULT_SETTINGS", "PRESETS", "SETTINGS_TEXT_LIMIT", "applyPreset", "parseLocalSettings", "parseSettingsQuery", "serializeLocalSettings", "serializeSettingsQuery", "validateSettings"],
  };
  for (const [name, expected] of Object.entries(exports)) assert.deepEqual(Object.keys(load(name)).sort(), expected.sort());
  assert.deepEqual(plain(IMAGE_LIMITS), { fileBytes: 50_000_000, pixels: 50_000_000, lowMemoryPixels: 12_000_000,
    batchBytes: 200_000_000, batchFiles: 50, maxDimension: 16384, targetMinBytes: 5000, maxOutputBytes: 100_000_000, jobTimeoutMs: 120000 });
  assert.ok(Object.isFrozen(DEFAULT_SETTINGS) && Object.isFrozen(IMAGE_LIMITS));
  assert.equal(DEFAULT_SETTINGS.format, "webp");
  assert.equal(DEFAULT_SETTINGS.minQuality, 40);
  assert.equal(DEFAULT_SETTINGS.quality, 80);
  assert.equal(bytes.parseTarget(DEFAULT_SETTINGS), 100_000);
});

for (const [value, unit, expected] of [[100, "KB", 100000], [100, "KiB", 102400], [1, "MB", 1000000], [1, "MiB", 1048576],
  [1.5, "MiB", 1572864], [0.005, "MB", 5000], [100, "MB", 100000000], [0.07, "MB", 70000]]) {
  test(`target units: ${value} ${unit}`, () => {
    assert.equal(bytes.parseTarget(value, unit), expected);
    assert.equal(bytes.parseTarget({ targetValue: value, unit }), expected);
  });
}
test("target conversion rejects nonfinite, coerced, fractional-byte and out-of-budget values", () => {
  for (const value of [NaN, Infinity, -Infinity, -1, 0, "100", null, {}, 4.999, 100001]) invalid(() => bytes.parseTarget(value, "KB"));
  invalid(() => bytes.parseTarget(5.1, "KiB"));
  for (const unit of [undefined, "kb", "GB", "toString", "__proto__", {}]) invalid(() => bytes.parseTarget(100, unit), /unit|KB|KiB|MB|MiB/i);
  let coerced = false;
  invalid(() => bytes.parseTarget(100, { toString() { coerced = true; return "KB"; } }), /KB/);
  assert.equal(coerced, false);
});
test("byte display labels decimal/binary correctly and savings never hide growth or round percentages", () => {
  assert.equal(bytes.formatBytes(0), "0 B");
  assert.equal(bytes.formatBytes(999), "999 B");
  assert.equal(bytes.formatBytes(1024, "KB"), "1.02 KB");
  assert.equal(bytes.formatBytes(1024, "KiB"), "1 KiB");
  assert.equal(bytes.formatBytes(1000000), "1 MB");
  assert.equal(bytes.formatBytes(-1500), "-1.5 KB");
  assert.equal(bytes.formatBytes(100001, "B"), "100001 B");
  assert.deepEqual(plain(bytes.savings(100, 140)), { savedBytes: -40, percent: -40 });
  assert.equal(bytes.savings(3, 2).percent, (1 / 3) * 100);
  assert.equal(bytes.savings(100, 0).percent, 100);
  for (const value of [NaN, Infinity, 1.2, "100", Number.MAX_SAFE_INTEGER + 1]) invalid(() => bytes.formatBytes(value));
  invalid(() => bytes.savings(0, 10));
  invalid(() => bytes.savings(100, -1));
});

test("geometry defaults, locked bounding box, percent and longest-side resize", () => {
  assert.deepEqual(plain(geometry.computeDimensions(4000, 3000, options())), { width: 4000, height: 3000 });
  assert.deepEqual(plain(geometry.computeDimensions(4000, 3000, options({ resizeMode: "dimensions" }))), { width: 1920, height: 1440 });
  assert.deepEqual(plain(geometry.computeDimensions(4000, 3000, options({ resizeMode: "percent", percent: 25 }))), { width: 1000, height: 750 });
  assert.deepEqual(plain(geometry.computeDimensions(3000, 4000, options({ resizeMode: "longest", longestSide: 1000 }))), { width: 750, height: 1000 });
});
test("geometry unlocked resizing and upscaling are explicit", () => {
  assert.deepEqual(plain(geometry.computeDimensions(800, 600, options({ resizeMode: "dimensions", width: 1600, height: 300, lockAspect: false }))), { width: 800, height: 300 });
  assert.deepEqual(plain(geometry.computeDimensions(800, 600, options({ resizeMode: "dimensions", width: 1600, height: 300, lockAspect: false, allowUpscale: true }))), { width: 1600, height: 300 });
  assert.deepEqual(plain(geometry.computeDimensions(800, 600, options({ resizeMode: "percent", percent: 200 }))), { width: 800, height: 600 });
  assert.deepEqual(plain(geometry.computeDimensions(800, 600, options({ resizeMode: "percent", percent: 200, allowUpscale: true }))), { width: 1600, height: 1200 });
});
test("crop is clipped in oriented coordinates, covers pixels, and precedes resize", () => {
  assert.deepEqual(plain(geometry.normalizeCrop({ x: -0.25, y: 0.25, width: 0.75, height: 1 })), { x: 0, y: 0.25, width: 0.5, height: 0.75 });
  assert.deepEqual(plain(geometry.getCropPixels(100, 100, { x: 0.1, y: 0.2, width: 0.3, height: 0.4 })), { x: 10, y: 20, width: 30, height: 40 });
  assert.deepEqual(plain(geometry.getCropPixels(100, 100, { x: 0.999999, y: 0.999999, width: 0.000001, height: 0.000001 })), { x: 99, y: 99, width: 1, height: 1 });
  const crop = Object.freeze({ x: 0.25, y: 0, width: 0.5, height: 1 });
  assert.deepEqual(plain(geometry.computeDimensions(4000, 2000, options({ crop, resizeMode: "dimensions", width: 1000, height: 1000 }))), { width: 1000, height: 1000 });
  assert.deepEqual(plain(crop), { x: 0.25, y: 0, width: 0.5, height: 1 });
  for (const bad of [undefined, {}, { x: NaN, y: 0, width: 1, height: 1 }, { x: 0, y: 0, width: 0, height: 1 }, { x: 1, y: 0, width: 1, height: 1 }]) invalid(() => geometry.normalizeCrop(bad));
});
test("decode and output budgets are checked independently, including 1-pixel extreme aspects", () => {
  invalid(() => geometry.validateDimensions(7000, 8000), /pixel budget/);
  invalid(() => geometry.validateDimensions(4000, 4000, IMAGE_LIMITS.lowMemoryPixels), /pixel budget/);
  invalid(() => geometry.computeDimensions(4000, 3000, options({ preserveDimensions: true }), 1000000), /Preserved dimensions/);
  assert.deepEqual(plain(geometry.computeDimensions(4000, 3000, options({ preserveDimensions: true, resizeMode: "percent", percent: 25 }), 1000000)), { width: 1000, height: 750 });
  for (const [width, height] of [[1, 1], [1, 16384], [16384, 1], [4000, 3000], [7071, 7071]]) {
    for (const maxPixels of [1, 7, 1000, 12000000]) {
      for (const resizeMode of ["none", "percent", "longest", "dimensions"]) {
        const result = geometry.computeDimensions(width, height, options({ resizeMode, percent: 1000, width: 16384, height: 16384, longestSide: 16384 }), maxPixels);
        assert.ok(Number.isInteger(result.width) && Number.isInteger(result.height));
        assert.ok(result.width >= 1 && result.height >= 1 && result.width <= width && result.height <= height);
        assert.ok(result.width * result.height <= maxPixels);
      }
    }
  }
});
test("invalid dimensions, resize controls and byte-scale estimates fail closed", () => {
  for (const width of [0, -1, 1.1, 16385, Infinity, NaN, "100"]) invalid(() => geometry.computeDimensions(width, 10, options()));
  for (const maxPixels of [0, 1.5, Infinity, IMAGE_LIMITS.pixels + 1]) invalid(() => geometry.computeDimensions(10, 10, options(), maxPixels));
  for (const patch of [{ resizeMode: "other" }, { resizeMode: "percent", percent: 0 }, { allowUpscale: "false" }]) invalid(() => geometry.computeDimensions(10, 10, options(patch)));
  assert.equal(geometry.estimateScale(10000, 5000), 1);
  assert.equal(geometry.estimateScale(10000, 10000), 1);
  assert.equal(geometry.estimateScale(5000, 100000000), 0.25);
  assert.equal(geometry.estimateScale(9999, 10000), Math.sqrt(9999 / 10000) * 0.95);
  assert.equal(geometry.estimateScale(10000, 100000), Math.sqrt(0.1) * 0.95);
  invalid(() => geometry.estimateScale(1.5, 100));
});

// These are HEADER fixtures, not evidence that a real codec can decode them.
function jpegHeader(width = 640, height = 480, marker = 0xc0, app = Buffer.alloc(0)) {
  const frame = Buffer.from([255, marker, 0, 17, 8, 0, 0, 0, 0, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0]);
  frame.writeUInt16BE(height, 5); frame.writeUInt16BE(width, 7);
  const prefix = Buffer.alloc(app.length ? app.length + 4 : 0);
  if (app.length) { prefix[0] = 255; prefix[1] = 225; prefix.writeUInt16BE(app.length + 2, 2); app.copy(prefix, 4); }
  return Buffer.concat([Buffer.from([255, 216]), prefix, frame]);
}
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data = Buffer.alloc(0)) {
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0); chunk.write(type, 4, "ascii"); data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, chunk.length - 4)), chunk.length - 4);
  return chunk;
}
function pngHeader(width = 320, height = 200, chunks = []) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk("IHDR", ihdr), ...chunks, pngChunk("IDAT"), pngChunk("IEND")]);
}
function webpChunk(type, data) {
  const chunk = Buffer.alloc(8 + data.length + data.length % 2);
  chunk.write(type, 0, "ascii"); chunk.writeUInt32LE(data.length, 4); data.copy(chunk, 8);
  return chunk;
}
function riff(chunks) {
  const body = Buffer.concat(chunks); const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii"); header.writeUInt32LE(body.length + 4, 4); header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
}
function vp8x(width = 320, height = 200, animated = false) {
  const data = Buffer.alloc(10); data[0] = animated ? 2 : 0;
  data.writeUIntLE(width - 1, 4, 3); data.writeUIntLE(height - 1, 7, 3);
  return webpChunk("VP8X", data);
}
function vp8l(width = 320, height = 200) {
  const data = Buffer.alloc(5); data[0] = 47; data.writeUInt32LE(((width - 1) | ((height - 1) << 14)) >>> 0, 1);
  return webpChunk("VP8L", data);
}
function vp8(width = 320, height = 200) {
  const data = Buffer.from([0, 0, 0, 157, 1, 42, 0, 0, 0, 0]); data.writeUInt16LE(width, 6); data.writeUInt16LE(height, 8);
  return webpChunk("VP8 ", data);
}
function gifHeader(frames = 1, before = Buffer.alloc(0)) {
  const header = Buffer.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255]);
  const image = Buffer.from([44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0]);
  return Buffer.concat([header, before, ...Array.from({ length: frames }, () => image), Buffer.from([59])]);
}
function bmpHeader(width = 1, height = 1, core = false) {
  const header = Buffer.alloc(core ? 30 : 58); header.write("BM", 0, "ascii"); header.writeUInt32LE(header.length, 2);
  header.writeUInt32LE(core ? 26 : 54, 10); header.writeUInt32LE(core ? 12 : 40, 14);
  if (core) { header.writeUInt16LE(width, 18); header.writeUInt16LE(height, 20); header.writeUInt16LE(1, 22); header.writeUInt16LE(24, 24); }
  else { header.writeInt32LE(width, 18); header.writeInt32LE(height, 22); header.writeUInt16LE(1, 26); header.writeUInt16LE(24, 28); }
  return header;
}
function box(type, data = Buffer.alloc(0), extended = false) {
  const header = Buffer.alloc(extended ? 16 : 8); header.writeUInt32BE(extended ? 1 : data.length + 8, 0); header.write(type, 4, "ascii");
  if (extended) header.writeUInt32BE(data.length + 16, 12);
  return Buffer.concat([header, data]);
}
function ftyp(major, compatible = [], extended = false) {
  return box("ftyp", Buffer.concat([Buffer.from(major, "ascii"), Buffer.alloc(4), ...compatible.map((brand) => Buffer.from(brand, "ascii"))]), extended);
}

test("JPEG SOF dimensions, progressive headers and byteOffset views", () => {
  for (const marker of [0xc0, 0xc2, 0xc3]) {
    const image = jpegHeader(640, 480, marker, Buffer.from([255, 192, 0, 17, 0, 0, 1, 0, 1]));
    assert.deepEqual(plain(sniffImage(image)), { format: "jpeg", mime: "image/jpeg", width: 640, height: 480, animated: false });
    const wrapped = Buffer.concat([Buffer.alloc(17), image, Buffer.alloc(3)]);
    assert.equal(sniffImage(wrapped.subarray(17, 17 + image.length)).width, 640);
  }
  assert.equal(sniffImage(jpegHeader().subarray(0, 12)), null);
  assert.equal(sniffImage(Buffer.from([255, 216, 255, 224, 0, 1])), null);
  assert.equal(sniffImage(jpegHeader(0, 480)), null);
});
test("PNG validates IHDR, detects framed acTL and ignores animation text inside other chunks", () => {
  const actl = Buffer.alloc(8); actl.writeUInt32BE(2, 0);
  assert.equal(sniffImage(pngHeader(320, 200, [pngChunk("acTL", actl)])).animated, true);
  assert.equal(sniffImage(pngHeader(320, 200, [pngChunk("tEXt", Buffer.from("acTL ANIM"))])).animated, false);
  assert.equal(sniffImage(pngHeader()).width, 320);
  const corrupt = pngHeader(); corrupt[24] = 3; assert.equal(sniffImage(corrupt), null);
  const badLength = pngHeader(); badLength.writeUInt32BE(14, 8); assert.equal(sniffImage(badLength), null);
  const truncated = pngHeader().subarray(0, 40); assert.equal(sniffImage(truncated), null);
  assert.equal(sniffImage(pngHeader(0, 20)), null);
  assert.equal(sniffImage(pngHeader(20, 20, [pngChunk("acTL", Buffer.alloc(8))])), null);
});
test("WebP VP8X, VP8L, VP8 and animation use RIFF chunk framing", () => {
  for (const chunk of [vp8x(), vp8l(), vp8()]) {
    const info = sniffImage(riff([chunk])); assert.equal(info.width, 320); assert.equal(info.height, 200); assert.equal(info.animated, false);
  }
  assert.equal(sniffImage(riff([vp8x(320, 200, true), webpChunk("ANIM", Buffer.alloc(6))])).animated, true);
  assert.equal(sniffImage(riff([vp8x(), webpChunk("ANIM", Buffer.alloc(6))])).animated, true);
  assert.equal(sniffImage(riff([webpChunk("ICCP", Buffer.from("ANIM VP8X")), vp8l()])).animated, false);
  const truncated = riff([vp8l()]); truncated.writeUInt32LE(9999, 16); assert.equal(sniffImage(truncated), null);
  const badRiff = riff([vp8()]); badRiff.writeUInt32LE(1000000, 4); assert.equal(sniffImage(badRiff), null);
  assert.equal(sniffImage(riff([vp8x(321, 200), vp8l()])), null);
  assert.equal(sniffImage(riff([webpChunk("VP8L", Buffer.from([0, 0, 0, 0, 0]))])), null);
});
test("GIF distinguishes single/multiple framed images and reports unknown when bounded", () => {
  assert.equal(sniffImage(gifHeader()).animated, false);
  assert.equal(sniffImage(gifHeader(2)).animated, true);
  assert.equal(sniffImage(gifHeader().subarray(0, 25)), null);
  const blocks = Buffer.alloc((SNIFF_LIMITS.gifBlocks + 1) * 2);
  for (let index = 0; index < blocks.length; index += 2) { blocks[index] = 1; blocks[index + 1] = 65; }
  const comment = Buffer.concat([Buffer.from([33, 254]), blocks, Buffer.from([0])]);
  const info = sniffImage(gifHeader(2, comment));
  assert.equal(info.animated, false); assert.equal(info.animationUnknown, true);
});
test("BMP core/info dimensions include top-down height and reject corrupt framing", () => {
  for (const image of [bmpHeader(4, 3), bmpHeader(4, -3), bmpHeader(4, 3, true)]) {
    const info = sniffImage(image); assert.equal(info.format, "bmp"); assert.equal(info.width, 4); assert.equal(info.height, 3);
  }
  assert.equal(sniffImage(bmpHeader(-1, 3)), null);
  const planes = bmpHeader(); planes.writeUInt16LE(2, 26); assert.equal(sniffImage(planes), null);
  assert.equal(sniffImage(bmpHeader().subarray(0, 30)), null);
});
test("AVIF/HEIF brands are box-aware; arbitrary ispe dimensions are deliberately unknown", () => {
  for (const [brand, format, mime, animated] of [["avif", "avif", "image/avif", false], ["avis", "avif", "image/avif", true],
    ["heic", "heic", "image/heic", false], ["heix", "heic", "image/heic", false], ["mif1", "heic", "image/heif", false], ["msf1", "heic", "image/heif", true]]) {
    const info = sniffImage(Buffer.concat([ftyp(brand), box("ispe", Buffer.alloc(12, 255))]));
    assert.deepEqual(plain(info), { format, mime, animated });
    assert.equal(info.width, undefined); assert.equal(info.height, undefined);
  }
  assert.equal(sniffImage(ftyp("mif1", ["avif"])).format, "avif");
  assert.equal(sniffImage(Buffer.concat([box("free"), ftyp("avif", [], true)])).format, "avif");
  assert.equal(sniffImage(ftyp("isom", ["mp42"])), null);
  assert.equal(sniffImage(box("mdat", Buffer.from("avif heic ftyp"))), null);
  assert.equal(sniffImage(ftyp("avif").subarray(0, 15)), null);
  const overflow = ftyp("avif", [], true); overflow.writeUInt32BE(0x200000, 8); assert.equal(sniffImage(overflow), null);
});
test("sniffing rejects renamed text/SVG, bounded corruption and declared resource bombs", () => {
  for (const value of ["<svg xmlns='http://www.w3.org/2000/svg'></svg>", "<?xml version='1.0'?><svg/>", "image/png", "GIF89a", "RIFFnotWEBP", ""]) {
    assert.equal(sniffImage(Buffer.from(value)), null);
  }
  for (const value of [null, [], new Uint16Array(4), new DataView(new ArrayBuffer(16))]) invalid(() => sniffImage(value), /Uint8Array/);
  invalid(() => sniffImage(pngHeader(7000, 8000)), /pixel budget/);
  invalid(() => sniffImage(jpegHeader(20000, 2)), /Width/);
  invalid(() => sniffImage(new Uint8Array(IMAGE_LIMITS.fileBytes + 1)), /file budget/);
  for (const fixture of [jpegHeader(), pngHeader(), riff([vp8l()]), gifHeader(), bmpHeader(), ftyp("avif")]) {
    for (let cut = 0; cut <= fixture.length; cut++) assert.doesNotThrow(() => sniffImage(fixture.subarray(0, cut)));
  }
});
test("sniffing work is bounded by header bytes and record counts", () => {
  const largeMetadata = pngChunk("tEXt", Buffer.alloc(SNIFF_LIMITS.headerBytes));
  const actl = Buffer.alloc(8); actl.writeUInt32BE(2, 0);
  assert.equal(sniffImage(pngHeader(1, 1, [largeMetadata, pngChunk("acTL", actl)])).animationUnknown, true);
  assert.equal(sniffImage(pngHeader(1, 1, Array.from({ length: SNIFF_LIMITS.records + 1 }, () => pngChunk("tEXt")))).animationUnknown, true);
  const app = Buffer.alloc(60004); app[0] = 255; app[1] = 225; app.writeUInt16BE(60002, 2);
  assert.equal(sniffImage(Buffer.concat([Buffer.from([255, 216]), ...Array.from({ length: 20 }, () => app), jpegHeader().subarray(2)])), null);
  assert.equal(sniffImage(riff([webpChunk("JUNK", Buffer.alloc(SNIFF_LIMITS.headerBytes)), vp8l()])), null);
});

test("filename reservations sanitize paths, devices, ADS, control characters and deduplicate", () => {
  const used = new Set(["PHOTO.JPG"]);
  assert.equal(uniqueOutputName("../../Photo.PNG", "jpeg", used), "Photo-2.jpg");
  assert.equal(uniqueOutputName("C:\\folder\\Photo.png", "jpeg", used), "Photo-3.jpg");
  for (const device of ["CON", "NUL", "PRN", "AUX", "COM1", "LPT9", "COM¹", "CONIN$", "CONOUT$"]) {
    assert.ok(uniqueOutputName(`${device}.png`, "webp", new Set()).startsWith("_"));
  }
  assert.equal(uniqueOutputName("con.txt.png", "png", new Set()), "_con.txt.png");
  assert.equal(uniqueOutputName("name:stream\u0000\u202e?.png", "avif", new Set()), "name_stream_.avif");
  assert.equal(uniqueOutputName("..", "png", new Set()), "image.png");
  assert.equal(used.size, 3);
});
test("filename Unicode normalization and UTF-8 truncation preserve valid characters and suffixes", () => {
  assert.equal(uniqueOutputName("cafe\u0301.png", "jpeg", new Set(["CAFÉ.JPG"])), "café-2.jpg");
  const used = new Set();
  for (let index = 0; index < 50; index++) {
    const name = uniqueOutputName(`${"😀漢é".repeat(500)}.heic`, "avif", used);
    assert.ok(Buffer.byteLength(name, "utf8") <= MAX_OUTPUT_NAME_BYTES);
    assert.equal(Buffer.from(name, "utf8").toString("utf8"), name);
    assert.ok(name.endsWith(".avif"));
  }
  assert.equal(used.size, 50);
  assert.equal(uniqueOutputName("x\ud800y.png", "png", new Set()), "xy.png");
  invalid(() => uniqueOutputName("a".repeat(4097), "png", new Set()));
  invalid(() => uniqueOutputName("a.png", "svg", new Set()));
  invalid(() => uniqueOutputName("a.png", "png", new Set(Array.from({ length: 10001 }, (_, index) => String(index)))));
});

test("all seven immutable presets apply validated target settings without carrying image state", () => {
  assert.deepEqual(Array.from(settings.PRESETS, (item) => item.id), ["20kb", "50kb", "100kb", "200kb", "500kb", "1mb", "2mb"]);
  assert.ok(Object.isFrozen(settings.PRESETS));
  const expected = [20000, 50000, 100000, 200000, 500000, 1000000, 2000000];
  settings.PRESETS.forEach((preset, index) => {
    assert.ok(Object.isFrozen(preset) && Object.isFrozen(preset.settings));
    const applied = settings.applyPreset(preset.id, options({ format: "jpeg", mode: "quality" }));
    assert.equal(applied.mode, "target"); assert.equal(applied.format, "jpeg"); assert.equal(bytes.parseTarget(applied), expected[index]);
  });
  invalid(() => settings.applyPreset("missing"));
});
test("settings validation returns independent defaults and strict canonical values", () => {
  const first = settings.validateSettings({}); const second = settings.validateSettings({});
  first.width = 42; assert.equal(second.width, 1920); assert.equal(DEFAULT_SETTINGS.width, 1920);
  const result = settings.validateSettings({ background: "#AABBCC", paletteColors: 256, pngLevel: 6 });
  assert.equal(result.background, "#aabbcc"); assert.equal(result.paletteColors, 256);
  for (const patch of [{ quality: "80" }, { minQuality: 90, quality: 80 }, { minQuality: 96 }, { quality: 101 }, { quality: NaN },
    { targetValue: Infinity }, { paletteColors: 1 }, { paletteColors: 257 }, { pngLevel: 7 }, { width: 0 }, { height: 1.5 },
    { longestSide: 16385 }, { percent: 1001 }, { lockAspect: "false" }, { preserveDimensions: 0 }, { allowJpegTransparency: 1 },
    { format: "image/jpeg" }, { mode: "magic" }, { autoPreference: "quality" }, { background: "url(secret)" }, { unit: "kb" },
    { crop: { x: -0.1, y: 0, width: 0.5, height: 1 } }, { crop: { x: 0.8, y: 0, width: 0.5, height: 1 } }, { crop: [] }]) invalid(() => settings.validateSettings(patch));
});
test("settings reject unknown fields, prototypes and getters without reading accessor values", () => {
  for (const input of [[], null, new Date(), "{}", { file: "secret.jpg" }, { image: "data:image/png;base64,hidden" }, JSON.parse('{"__proto__":{"polluted":true}}')]) {
    invalid(() => settings.validateSettings(input));
  }
  let reads = 0;
  invalid(() => settings.validateSettings({ get quality() { reads++; return 80; } }), /accessors/);
  assert.equal(reads, 0); assert.equal({}.polluted, undefined);
  const nullRecord = Object.create(null); nullRecord.quality = 85; assert.equal(settings.validateSettings(nullRecord).quality, 85);
});
test("settings-only query and JSON roundtrips include normalized crops and fractional units", () => {
  const input = settings.validateSettings({ mode: "resize", format: "avif", unit: "MiB", targetValue: 1.5, allowUpscale: true,
    crop: { x: 0.0000001, y: 0.2, width: 0.4, height: 0.6 }, background: "#FF00AA" });
  const query = settings.serializeSettingsQuery(input);
  assert.equal(query.startsWith("?"), false);
  assert.deepEqual(plain(settings.parseSettingsQuery(query)), plain(input));
  assert.deepEqual(plain(settings.parseSettingsQuery(`?${query}`)), plain(input));
  assert.deepEqual(plain(settings.parseLocalSettings(settings.serializeLocalSettings(input))), plain(input));
  assert.deepEqual(plain(settings.parseSettingsQuery("")), plain(DEFAULT_SETTINGS));
  assert.equal(settings.parseSettingsQuery("targetValue=20&unit=KB").targetValue, 20);
  invalid(() => settings.serializeSettingsQuery({ ...input, filename: "private.jpg" }));
  invalid(() => settings.serializeLocalSettings({ ...input, image: "private pixels" }));
});
for (const query of ["url=https%3A%2F%2Fevil.invalid", "file=private.jpg", "__proto__=x", "quality=80&quality=90", "quality=80&qual%69ty=90",
  "quality=80junk", "quality=NaN", "quality=Infinity", "quality=0x50", "quality=+80", "quality=%FF", "quality=%", "quality=1e999",
  "lockAspect=1", "crop=0,0,1", "crop=0,0,1,1,1", "crop=-1,0,1,1", "crop=0,0,0,1", "format=svg", "quality", "quality=80&", "https://example.invalid/?quality=80"]) {
  test(`share query rejects ${query}`, () => assert.equal(settings.parseSettingsQuery(query), null));
}
test("invalid, oversized or unrelated saved data is rejected, never restored as image state", () => {
  for (const text of [null, "", "not json", "null", "[]", '{"token":"x"}', '{"constructor":{}}', '{"crop":{"x":0,"y":0,"width":1,"height":1,"image":"x"}}', " ".repeat(4097)]) {
    assert.equal(settings.parseLocalSettings(text), null);
  }
  assert.equal(settings.parseSettingsQuery("quality=80".repeat(500)), null);
});

const targetOptions = (changes = {}) => ({ width: 1600, height: 1200, targetBytes: 100000, minQuality: 40,
  preserveDimensions: true, encode: async ({ quality }) => ({ size: quality * 2000 }), ...changes });
test("target search accepts a measured ceiling match immediately and preserves generic payload identity", async () => {
  const payload = { pixels: "synthetic opaque payload" }; const progress = [];
  const result = await searchTarget(targetOptions({ maxQuality: 100, encode: async (request) => {
    assert.ok(Object.isFrozen(request)); assert.equal(request.quality, 95); return { size: 100000, payload };
  }, onAttempt: (attempt) => progress.push(attempt) }));
  assert.equal(result.attempts, 1); assert.equal(result.quality, 95); assert.equal(result.targetMet, true); assert.equal(result.resized, false);
  assert.equal(result.candidate.payload, payload); assert.ok(Object.isFrozen(progress[0]));
  assert.deepEqual(Object.keys(progress[0]).sort(), ["attempt", "height", "quality", "round", "size", "targetMet", "width"]);
});
test("target quality search returns the highest observed passing candidate, never a miss", async () => {
  const observed = []; const result = await searchTarget(targetOptions({ onAttempt: (attempt) => observed.push(attempt) }));
  const passed = observed.filter((attempt) => attempt.targetMet);
  assert.equal(result.quality, Math.max(...passed.map((attempt) => attempt.quality)));
  assert.equal(result.quality, 50); assert.equal(result.candidate.size, 100000);
  assert.ok(result.targetMet && result.attempts <= 8); assert.equal(new Set(observed.map((attempt) => attempt.quality)).size, observed.length);
});
test("nonmonotonic high-quality islands are probed even when the quality floor fails", async () => {
  const observed = [];
  const result = await searchTarget(targetOptions({ targetBytes: 10000, encode: async ({ quality }) => ({ size: quality >= 75 && quality <= 90 ? 9000 : 13000 }),
    onAttempt: (attempt) => observed.push(attempt) }));
  assert.equal(observed.find((attempt) => attempt.quality === 40).targetMet, false);
  assert.ok(result.targetMet); assert.equal(result.resized, false);
  assert.equal(result.quality, Math.max(...observed.filter((attempt) => attempt.targetMet).map((attempt) => attempt.quality)));
  assert.ok(result.attempts <= 8);
});
test("a higher-quality passing probe beats the smallest passing payload", async () => {
  const observed = [];
  const result = await searchTarget(targetOptions({ targetBytes: 10000, encode: async ({ quality }) => ({ size: quality >= 80 && quality <= 90 ? 9500 : quality <= 55 ? 5000 : 15000 }),
    onAttempt: (attempt) => observed.push(attempt) }));
  assert.ok(result.quality >= 80); assert.equal(result.candidate.size, 9500);
  assert.equal(result.quality, Math.max(...observed.filter((attempt) => attempt.targetMet).map((attempt) => attempt.quality)));
});
test("unreachable preserved targets return the smallest observed payload with false status", async () => {
  const observed = [];
  const result = await searchTarget(targetOptions({ targetBytes: 5000, encode: async ({ quality }) => ({ size: 10000 + (quality - 67) ** 2 }),
    onAttempt: (attempt) => observed.push(attempt) }));
  assert.equal(result.targetMet, false); assert.equal(result.resized, false); assert.equal(result.width, 1600);
  assert.equal(result.candidate.size, Math.min(...observed.map((attempt) => attempt.size)));
  assert.ok(result.attempts <= 8);
});
test("resize search uses measured minimum size and stops at the first passing dimension round", async () => {
  const observed = [];
  const result = await searchTarget(targetOptions({ width: 1000, height: 1000, targetBytes: 10000, preserveDimensions: false,
    encode: async ({ width, height, quality }) => ({ size: Math.ceil(width * height * quality / 1000) }), onAttempt: (attempt) => observed.push(attempt) }));
  assert.ok(result.targetMet && result.resized); assert.equal(result.width, 475); assert.equal(result.height, 475);
  assert.ok(result.candidate.size <= 10000); assert.equal(Math.max(...observed.map((attempt) => attempt.round)), 2);
  assert.ok(result.attempts <= 16);
});
test("hard limits are eight encodes per round and three dimension reductions, even when impossible", async () => {
  const observed = [];
  const result = await searchTarget(targetOptions({ width: 8000, height: 6000, targetBytes: 5000, preserveDimensions: false,
    encode: async ({ quality }) => ({ size: 50000 + (100 - quality) }), onAttempt: (attempt) => observed.push(attempt) }));
  assert.equal(TARGET_SEARCH_LIMITS.encodesPerRound, 8); assert.equal(TARGET_SEARCH_LIMITS.resizeRounds, 3);
  assert.equal(result.targetMet, false); assert.equal(result.attempts, 32);
  assert.equal(result.resized, false, "The smallest output happened at original dimensions; attempts alone do not make the returned output resized");
  const rounds = new Map();
  observed.forEach((attempt) => rounds.set(attempt.round, [...(rounds.get(attempt.round) ?? []), attempt]));
  assert.equal(rounds.size, 4);
  let previous = { width: 8001, height: 6001 };
  for (const attempts of rounds.values()) {
    assert.equal(attempts.length, 8); assert.ok(attempts[0].width < previous.width && attempts[0].height < previous.height);
    assert.ok(attempts.every((attempt) => attempt.quality >= 40 && attempt.quality <= 95)); previous = attempts[0];
  }
});
test("lossless search makes one encode per size; one-encode budgets and degenerate dimensions terminate", async () => {
  const qualities = [];
  const lossless = await searchTarget(targetOptions({ width: 100, height: 100, targetBytes: 5000, lossless: true, preserveDimensions: false,
    encode: async ({ width, height, quality }) => { qualities.push(quality); return { size: width * height }; } }));
  assert.equal(lossless.attempts, 2); assert.ok(lossless.targetMet); assert.deepEqual(qualities, [95, 95]);
  const one = await searchTarget(targetOptions({ maxEncodesPerRound: 1 })); assert.equal(one.attempts, 1); assert.equal(one.quality, 40);
  const pixel = await searchTarget(targetOptions({ width: 1, height: 1, targetBytes: 5000, minQuality: 95, preserveDimensions: false }));
  assert.equal(pixel.attempts, 1); assert.equal(pixel.targetMet, false); assert.equal(pixel.resized, false);
  const noReduction = await searchTarget(targetOptions({ targetBytes: 5000, maxResizeRounds: 0, preserveDimensions: false }));
  assert.ok(noReduction.attempts <= 8); assert.equal(noReduction.resized, false);
});
test("target parameters and encoder measurements require finite integers and bounded resources", async () => {
  for (const patch of [{ targetBytes: 4999 }, { targetBytes: 100000001 }, { targetBytes: NaN }, { targetBytes: 5000.5 },
    { minQuality: 96 }, { minQuality: 40.5 }, { minQuality: 50, maxQuality: 49 }, { maxQuality: Infinity },
    { maxEncodesPerRound: 9 }, { maxEncodesPerRound: 0 }, { maxResizeRounds: 4 }, { maxResizeRounds: 1.5 },
    { width: 0 }, { preserveDimensions: "false" }, { lossless: "true" }]) {
    let calls = 0;
    await assert.rejects(searchTarget(targetOptions({ ...patch, encode: async () => { calls++; return { size: 1 }; } })));
    assert.equal(calls, 0);
  }
  for (const size of [0, -1, 1.5, NaN, Infinity, 100000001, "10000"]) {
    await assert.rejects(searchTarget(targetOptions({ encode: async () => ({ size }) })), /Encoded bytes/);
  }
  await assert.rejects(searchTarget(targetOptions({ encode: async () => null })), /sized candidate/);
});
test("cancellation before encode and during progress performs no extra encodes", async () => {
  const before = new AbortController(); before.abort(); let calls = 0;
  await assert.rejects(searchTarget(targetOptions({ signal: before.signal, encode: async () => { calls++; return { size: 1 }; } })), { name: "AbortError" });
  assert.equal(calls, 0);
  const during = new AbortController();
  await assert.rejects(searchTarget(targetOptions({ signal: during.signal, encode: async () => { calls++; return { size: 200000 }; }, onAttempt: () => during.abort() })), { name: "AbortError" });
  assert.equal(calls, 1);
});
test("in-flight abort rejects without waiting and late encoder rejection is observed", async () => {
  const controller = new AbortController(); let rejectEncoder;
  const pending = searchTarget(targetOptions({ signal: controller.signal, encode: () => new Promise((resolve, reject) => { rejectEncoder = reject; }) }));
  assert.equal(typeof rejectEncoder, "function"); controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  rejectEncoder(new Error("synthetic late encoder error")); await Promise.resolve();
});
test("encoder and observer errors propagate without hidden retries; abort listeners are cleaned", async () => {
  let calls = 0;
  await assert.rejects(searchTarget(targetOptions({ encode: async () => { calls++; throw new Error("synthetic encode failure"); } })), /synthetic encode failure/);
  assert.equal(calls, 1);
  await assert.rejects(searchTarget(targetOptions({ onAttempt: () => { throw new Error("synthetic observer failure"); } })), /synthetic observer failure/);
  const listeners = new Set();
  const signal = { aborted: false, addEventListener: (event, listener) => listeners.add(listener), removeEventListener: (event, listener) => listeners.delete(listener) };
  const result = await searchTarget(targetOptions({ signal })); assert.ok(result.targetMet); assert.equal(listeners.size, 0);
});
test("all exercised core paths remained independent of environment, DOM, network, storage and timers", () => {
  assert.equal(deniedAccesses, 0);
});