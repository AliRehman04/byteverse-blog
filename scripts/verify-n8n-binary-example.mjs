import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

// Synthetic JavaScript item-shape checks, NOT the n8n engine or a real workflow.
// No environment files, database, network, writes or external services.
export const auditCode = `const expected = 'attachment_0';
const items = $input.all();

return items.map((item, index) => ({
  json: {
    itemIndex: index,
    binaryKeys: Object.keys(item.binary ?? {}),
    expectedKeyPresent: Object.hasOwn(item.binary ?? {}, expected),
  },
  pairedItem: { item: index },
}));`;

export const preserveCode = `const items = $input.all();

for (const item of items) {
  item.json = { ...item.json, reviewed: true };
}

return items;`;

const plain = value => JSON.parse(JSON.stringify(value));
function execute(code, items) {
  const blocked = () => { throw new Error('External access forbidden in synthetic example'); };
  const context = vm.createContext({ $input: { all: () => items }, fetch: blocked,
    console: { log: blocked, error: blocked }, process: undefined, require: undefined },
  { codeGeneration: { strings: false, wasm: false } });
  return new vm.Script(`(function () {\n${code}\n})()`, { filename: 'synthetic-n8n-snippet.js' })
    .runInContext(context, { timeout: 1000 });
}

export function verifyExamples() {
  const groups = [];
  const check = (name, fn) => { fn(); groups.push(name); };
  const fixture = () => [{
    json: { record_id: 'BV-101', message: 'ByteVerse test file.' },
    binary: { attachment_0: { data: Buffer.from('ByteVerse test file.').toString('base64'), mimeType: 'text/plain', fileName: 'byteverse-test.txt' } },
  }];
  check('named binary descriptor is not a JSON field or file name', () => {
    const [item] = fixture();
    assert.equal(Object.hasOwn(item.json, 'attachment_0'), false);
    assert.equal(Object.hasOwn(item.binary, 'attachment_0'), true);
    assert.equal(Object.hasOwn(item.binary, 'data'), false);
    assert.equal(Object.hasOwn(item.binary, 'byteverse-test.txt'), false);
    assert.equal(String(item.binary.attachment_0), '[object Object]');
  });
  check('diagnostic reports exact key with no file payload', () => {
    const result = plain(execute(auditCode, fixture()));
    assert.deepEqual(result, [{ json: { itemIndex: 0, binaryKeys: ['attachment_0'], expectedKeyPresent: true }, pairedItem: { item: 0 } }]);
    assert(!JSON.stringify(result).includes('ByteVerse test file.'));
    assert(!JSON.stringify(result).includes('byteverse-test.txt'));
    assert(!JSON.stringify(result).includes('mimeType'));
    assert.equal(Object.hasOwn(result[0], 'binary'), false);
  });
  check('wrong case is not the same binary key', () => {
    const items = fixture(); items[0].binary = { Attachment_0: items[0].binary.attachment_0 };
    assert.equal(execute(auditCode, items)[0].json.expectedKeyPresent, false);
  });
  check('missing binary and JSON-only URLs stay missing', () => {
    const items = [{ json: { url: 'https://example.invalid/sample.txt', fileName: 'sample.txt' } }, { json: {}, binary: {} }];
    assert.deepEqual(plain(execute(auditCode, items)).map(row => row.json.expectedKeyPresent), [false, false]);
  });
  check('one-item presence does not cover every input item', () => {
    const items = [{ json: { record_id: 'BV-101', status: 'ready' } }, ...fixture()];
    const output = plain(execute(auditCode, items));
    assert.deepEqual(output.map(row => row.json.expectedKeyPresent), [false, true]);
    assert.deepEqual(output.map(row => row.pairedItem.item), [0, 1]);
  });
  check('different records retain different file references', () => {
    const items = [...fixture(), ...fixture()];
    items[1].json.record_id = 'BV-102';
    items[1].binary.attachment_0.data = Buffer.from('A different fictional file.').toString('base64');
    const references = items.map(item => item.binary.attachment_0);
    const before = items.map(item => item.binary.attachment_0.data);
    const output = execute(preserveCode, items);
    assert.equal(output, items);
    assert.deepEqual(output.map(item => item.json.record_id), ['BV-101', 'BV-102']);
    output.forEach((item, index) => {
      assert.equal(item.binary.attachment_0, references[index]);
      assert.equal(item.binary.attachment_0.data, before[index]);
      assert.equal(item.json.reviewed, true);
    });
  });
  check('preservation keeps other binary keys and item metadata', () => {
    const items = fixture();
    items[0].binary.preview = { data: 'opaque-test-reference', mimeType: 'image/png' };
    items[0].pairedItem = { item: 7 };
    const binary = items[0].binary, pair = items[0].pairedItem;
    const output = execute(preserveCode, items);
    assert.equal(output[0].binary, binary); assert.equal(output[0].pairedItem, pair);
    assert.deepEqual(Object.keys(output[0].binary), ['attachment_0', 'preview']);
  });
  check('returning only json demonstrably drops sibling binary', () => {
    const output = fixture().map(item => ({ json: { ...item.json, reviewed: true } }));
    assert.equal(execute(auditCode, output)[0].json.expectedKeyPresent, false);
  });
  check('descriptor presence does not verify readable bytes', () => {
    const referenceOnly = [{ json: {}, binary: { attachment_0: { data: 'opaque-unresolved-reference', mimeType: 'text/plain' } } }];
    assert.equal(execute(auditCode, referenceOnly)[0].json.expectedKeyPresent, true);
    // No storage resolver is called. Presence must not be reported as byte-read success.
  });
  check('empty file descriptor is not treated as a missing key', () => {
    const empty = [{ json: {}, binary: { attachment_0: { data: '', mimeType: 'text/plain' } } }];
    assert.equal(execute(auditCode, empty)[0].json.expectedKeyPresent, true);
  });
  check('empty input returns no items and no file is invented', () => {
    assert.deepEqual(plain(execute(auditCode, [])), []);
    assert.deepEqual(execute(preserveCode, []), []);
  });
  check('missing attachment is not repaired by preservation alone', () => {
    const items = [{ json: { message: 'No file here' } }];
    const output = execute(preserveCode, items);
    assert.equal(output[0].json.reviewed, true);
    assert.equal(Object.hasOwn(output[0], 'binary'), false);
  });
  return { status: 'passed', node: process.version, groups: groups.length, checks: groups,
    scope: 'JavaScript snippets executed with a synthetic $input.all adapter, not n8n execution',
    limits: 'No real n8n UI, Code runner, Convert/Extract/Merge engine, binary storage, upload, webhook or third-party account was tested.' };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  assert(process.argv.length <= 3 && (!process.argv[2] || process.argv[2] === '--article'));
  const result = verifyExamples();
  if (process.argv[2] === '--article') {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const article = readFileSync(resolve(root, 'scripts/content/n8n-binary-data-not-found.md'), 'utf8').replace(/\r\n?/g, '\n');
    const examples = [...article.matchAll(/^```n8n\n([\s\S]*?)^```/gm)].map(match => match[1].trim());
    assert.deepEqual(examples, [auditCode, preserveCode]);
    result.articleSnippetsMatch = true;
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2));
}