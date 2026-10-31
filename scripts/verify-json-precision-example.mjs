import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { Socket } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Synthetic fixtures only. No application entry point, .env, database or network.
// --browser repeats native parsing tests in an offline Edge context.
const mode = process.argv[2] ?? '--offline';
assert(process.argv.length <= 3 && ['--offline', '--browser'].includes(mode));
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const blocked = () => { throw new Error('External access forbidden during precision tests'); };
const oldFetch = globalThis.fetch, oldConnect = Socket.prototype.connect;
const hook = registerHooks({ resolve(specifier, context, next) {
  assert(!/^(?:@next\/env|@neondatabase\/serverless|dotenv|pg|@\/lib\/db)(?:\/|$)/.test(specifier), 'Database/environment modules forbidden');
  return next(specifier, context);
} });

export function parseNumbersAsText(text) {
  if (typeof text !== 'string') throw new TypeError('Pass original JSON text');
  return JSON.parse(text, (_key, value, context) => {
    if (typeof value !== 'number') return value;
    if (typeof context?.source !== 'string') {
      throw new Error('Source-aware JSON parsing unavailable; use a compatible lossless parser');
    }
    return context.source;
  });
}

export async function exerciseNative(parse = parseNumbersAsText) {
  const records = [], checked = [];
  const check = (name, fn) => { fn(); checked.push(name); };
  const cases = [
    ['safe boundary', '9007199254740991', '9007199254740991'],
    ['exact but unsafe', '9007199254740992', '9007199254740992'],
    ['rounded integer', '9007199254740993', '9007199254740992'],
    ['rounded negative', '-9007199254740993', '-9007199254740992'],
    ['ordinary count', '2', '2'],
    ['fraction rounded to safe integer', '1.0000000000000001', '1'],
    ['numeric spelling only', '7.50', '7.5'],
    ['finite exponent', '1e3', '1000'],
    ['overflow', '1e400', 'Infinity'],
    ['underflow', '1e-400', '0'],
    ['negative zero', '-0', '0'],
  ];
  for (const [name, token, expectedNative] of cases) {
    const input = `{"value":${token}}`;
    const native = JSON.parse(input).value;
    check(name, () => {
      assert.equal(String(native), expectedNative);
      assert.equal(parse(input).value, token);
      assert.equal(parse(token), token, 'Scalar roots also preserve numeric spelling');
    });
    records.push({ name, token, nativeDisplay: String(native), nativeSafeInteger: Number.isSafeInteger(native), preservedToken: parse(input).value });
  }
  check('nested arrays and quoted numeric text', () => {
    assert.deepEqual(parse('{"rows":[{"id":9007199254740993},-9007199254740993],"literal":"9007199254740993","note":"colon:123 and 7.50","flag":true,"empty":null}'),
      { rows: [{ id: '9007199254740993' }, '-9007199254740993'], literal: '9007199254740993', note: 'colon:123 and 7.50', flag: true, empty: null });
  });
  check('rounded BigInt cannot recover the source', () => {
    const value = JSON.parse('{"id":9007199254740993}').id;
    assert.equal(BigInt(value).toString(), '9007199254740992');
    assert.notEqual(BigInt(value), 9007199254740993n);
    assert.equal(BigInt('9007199254740993'), 9007199254740993n);
  });
  check('ordinary reviver is too late', () => {
    const parsed = JSON.parse('{"id":9007199254740993}', (key, value) => key === 'id' ? BigInt(value) : value);
    assert.equal(parsed.id.toString(), '9007199254740992');
  });
  check('post-parse safe check cannot certify original decimal', () => {
    assert.equal(Number.isSafeInteger(JSON.parse('1.0000000000000001')), true);
    assert.equal(parse('1.0000000000000001'), '1.0000000000000001');
  });
  check('numeric strings portable and deliberate BigInt serialization', () => {
    const wire = '{"order_id":"9007199254740993","count":2}';
    const parsed = JSON.parse(wire);
    assert.equal(parsed.order_id, '9007199254740993');
    assert.throws(() => JSON.stringify({ id: BigInt(parsed.order_id) }), TypeError);
    assert.equal(JSON.stringify({ order_id: BigInt(parsed.order_id), count: 2 }, (_key, value) => typeof value === 'bigint' ? value.toString() : value), wire);
  });
  check('BigInt does not parse decimals or exponent strings', () => {
    assert.throws(() => BigInt('7.50'), SyntaxError);
    assert.throws(() => BigInt('1e3'), SyntaxError);
  });
  check('syntax errors remain errors', () => {
    for (const input of ['{"id":00123}', '{"id":1,}', '{"id":1n}', '{"id":NaN}']) assert.throws(() => parse(input), SyntaxError);
    assert.throws(() => parse({ id: 1 }), TypeError);
  });
  check('format preservation changes numeric types intentionally', () => {
    const parsed = parse('{"count":2,"price":7.50,"str":"2"}');
    assert.deepEqual(parsed, { count: '2', price: '7.50', str: '2' });
    assert.equal(parsed.count + 1, '21');
    assert.equal(Number(parsed.count) + 1, 3);
  });
  check('ordinary parse retains standard duplicate-key behavior', () => {
    assert.equal(parse('{"id":1,"id":2}').id, '2');
  });
  const source = '{"order_id":9007199254740993,"count":2}';
  const parsedResponse = await new Response(source).json();
  const textResponse = await new Response(source).text();
  check('Response text keeps original tokens before parsing', () => {
    assert.equal(parsedResponse.order_id, 9007199254740992);
    assert.equal(textResponse, source);
    assert.equal(parse(textResponse).order_id, '9007199254740993');
  });
  return { checked, records, response: { jsonId: String(parsedResponse.order_id), textId: parse(textResponse).order_id } };
}

let native, csv;
globalThis.fetch = blocked; Socket.prototype.connect = blocked;
try {
  native = await exerciseNative();
  const legacy = new Function('JSON', `return (${parseNumbersAsText.toString()})`)({
    parse(text, revive) { return JSON.parse(text, function (key, value) { return revive.call(this, key, value); }); },
  });
  assert.throws(() => legacy('{"id":9007199254740993}'), /Source-aware JSON parsing unavailable/);
  const cache = new Map();
  function load(name) {
    assert(['types', 'engine'].includes(name));
    if (cache.has(name)) return cache.get(name);
    const file = resolve(root, `src/lib/json-csv/${name}.ts`);
    const output = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
    assert(!output.diagnostics?.length);
    const record = { exports: {} };
    new Function('require', 'module', 'exports', output.outputText)(specifier => {
      if (specifier === './types') return load('types');
      assert(['jsonc-parser', 'papaparse'].includes(specifier));
      return require(specifier);
    }, record, record.exports);
    cache.set(name, record.exports);
    return record.exports;
  }
  const { convertJson } = load('engine');
  const { DEFAULT_CSV_OPTIONS } = load('types');
  const input = '[{"order_id":9007199254740993,"amount":7.50},{"order_id":"000123","amount":2.00}]';
  const raw = convertJson(input, 'json', { ...DEFAULT_CSV_OPTIONS });
  const rounded = convertJson(JSON.stringify(JSON.parse(input)), 'json', { ...DEFAULT_CSV_OPTIONS });
  const reader = require('papaparse');
  assert.deepEqual(reader.parse(raw.csv.replace(/^\uFEFF/, ''), { header: true }).data,
    [{ order_id: '9007199254740993', amount: '7.50' }, { order_id: '000123', amount: '2.00' }]);
  assert.deepEqual(raw.rows, [['9007199254740993', '7.50'], ['000123', '2.00']]);
  assert.deepEqual(rounded.rows, [['9007199254740992', '7.5'], ['000123', '2']]);
  assert.equal(raw.stats.outputRows, 2); assert.equal(raw.stats.exportedColumns, 2);
  csv = { headers: raw.headers, rawInputRows: raw.rows, preParsedRows: rounded.rows, outputRows: raw.stats.outputRows, columns: raw.stats.exportedColumns, formulaProtection: raw.options.protectFormulas };
} finally { globalThis.fetch = oldFetch; Socket.prototype.connect = oldConnect; hook.deregister(); }

let browserResult = null;
if (mode === '--browser') {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    const observations = await page.evaluate(async source => {
      const parse = new Function(`return (${source})`)();
      const tokens = ['9007199254740991', '9007199254740992', '9007199254740993', '-9007199254740993', '1.0000000000000001', '7.50', '1e400', '1e-400', '-0'];
      const rows = tokens.map(token => ({ token, nativeDisplay: String(JSON.parse(token)), preserved: parse(token) }));
      const text = '{"order_id":9007199254740993}';
      return { rows, responseJson: String((await new Response(text).json()).order_id), responseText: parse(await new Response(text).text()).order_id };
    }, parseNumbersAsText.toString());
    for (const item of observations.rows) {
      const expected = native.records.find(record => record.token === item.token);
      assert.equal(item.preserved, item.token); assert.equal(item.nativeDisplay, expected.nativeDisplay);
    }
    assert.equal(observations.responseJson, '9007199254740992'); assert.equal(observations.responseText, '9007199254740993');
    browserResult = { version: browser.version(), offline: true, numericCases: observations.rows.length, responseChecks: 2, passed: true };
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), mode, status: 'passed', node: process.version,
  nativeGroups: native.checked.length, legacyWithoutContext: 'throws rather than silently rounding', native, csv, browser: browserResult,
  limits: 'Small fictional fixtures. Not a benchmark, exhaustive numeric validator, browser-support survey, live-tool UI or Excel test. No application/database/network access.' }, null, 2));