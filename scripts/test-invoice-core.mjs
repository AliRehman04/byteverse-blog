import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Synthetic fixtures only; no framework, environment or database initialization.
const root = fileURLToPath(new URL('../', import.meta.url));
const modulePaths = ['src/lib/invoice/types.ts', 'src/lib/invoice/validation.ts', 'src/lib/invoice/parser.ts']
  .map(path => resolve(root, path));
const allowed = new Set(modulePaths);
const cache = new Map();
const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  target: ts.ScriptTarget.ES2017,
  lib: ['lib.esnext.d.ts'],
  types: [],
  strict: true,
  skipLibCheck: true,
  noEmit: true,
};

function load(path) {
  const absolutePath = resolve(root, path);
  assert(allowed.has(absolutePath), 'Only the three invoice contract/core modules may be loaded');
  if (cache.has(absolutePath)) return cache.get(absolutePath).exports;
  const loaded = { exports: {} };
  cache.set(absolutePath, loaded);
  const source = readFileSync(absolutePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { ...compilerOptions, noEmit: false },
    fileName: absolutePath,
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  function localRequire(specifier) {
    assert(specifier.startsWith('.'), 'Invoice core must not load external or Node runtime dependencies');
    return load(resolve(dirname(absolutePath), `${specifier}.ts`));
  }
  // The source is trusted local code; imported template JSON is never executable.
  new Function('require', 'module', 'exports', compiled.outputText)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

const { groupTextTokens, extractInvoice, parseAmount, parseInvoiceDate, normalizeField, parseMappingProfile } = load('src/lib/invoice/parser.ts');
const { CURRENCIES, validateInvoice, canReview, getCurrencyTotals } = load('src/lib/invoice/validation.ts');
const { INVOICE_FIELDS, INVOICE_LIMITS, emptyFields } = load('src/lib/invoice/types.ts');
const auto = Object.freeze({ numberFormat: 'auto', dateOrder: 'auto' });
let passed = 0;
let failed = 0;

function test(name, run) {
  try { run(); passed++; }
  catch (error) {
    failed++;
    console.error(`FAIL: ${name}\n${error.stack ?? error}`);
  }
}

function lines(texts) {
  return texts.map((text, index) => ({ id: `synthetic-l${index + 1}`, page: 1, x: 40, y: 10 + index * 20, height: 12,
    ...(typeof text === 'string' ? { text } : text) }));
}
function extract(texts, options = auto) { return extractInvoice(lines(texts), options); }
function invoiceRows() {
  return ['Supplier: Acme Labs LLC', 'Invoice No: INV-001', 'Invoice Date: 2026-10-03',
    'Subtotal USD 100.00', 'Tax USD 10.00', 'Grand Total USD 110.00'];
}
const has = (issues, code, field) => issues.some(issue => issue.code === code && (field === undefined || issue.field === field));
const errors = record => validateInvoice(record, [record]).filter(issue => issue.severity === 'error');
let recordSequence = 0;
function record(overrides = {}) {
  const number = ++recordSequence;
  const { fields = {}, ...rest } = overrides;
  return {
    id: `synthetic-${number}`, fileName: `synthetic-${number}.pdf`, fileSize: 1000,
    fileHash: `synthetic-hash-${number}`, pageCount: 1, lines: [], evidence: {}, extractionIssues: [],
    fields: { vendor: 'Acme Labs LLC', invoiceNumber: `INV-${number}`, invoiceDate: '2026-10-03', currency: 'USD',
      subtotal: '100', tax: '10', shipping: '', discount: '', total: '110', ...fields },
    status: 'ready', kind: 'invoice', included: true, reviewed: false, ...rest,
  };
}
function extractedRecord(extraction, overrides = {}) {
  return record({ ...overrides, fields: extraction.fields, evidence: extraction.evidence,
    extractionIssues: extraction.issues, kind: extraction.kind });
}
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

test('isolated strict ES2017 typecheck, without Next or project config', () => {
  const program = ts.createProgram(modulePaths, compilerOptions);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.equal(diagnostics.length, 0, diagnostics.map(item => {
    const point = item.file && item.start !== undefined ? item.file.getLineAndCharacterOfPosition(item.start) : null;
    return `${item.file?.fileName ?? ''}${point ? `:${point.line + 1}` : ''} ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`;
  }).join('\n'));
});
test('contract field order is unchanged', () => {
  assert.deepEqual(INVOICE_FIELDS, ['vendor', 'invoiceNumber', 'invoiceDate', 'currency', 'subtotal', 'tax', 'discount', 'shipping', 'total']);
  assert.deepEqual(Object.keys(emptyFields()), INVOICE_FIELDS);
});
test('core has no browser globals, env or runtime I/O dependencies', () => {
  const forbidden = new Set(['window', 'document', 'navigator', 'process', 'fetch', 'localStorage']);
  for (const path of modulePaths) {
    const source = readFileSync(path, 'utf8');
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.ES2017, true);
    function inspect(node) {
      assert(!ts.isBigIntLiteral(node), 'Use BigInt() rather than literals with the ES2017 target');
      if (ts.isIdentifier(node) && forbidden.has(node.text)) {
        const parent = node.parent;
        assert(!((ts.isCallExpression(parent) || ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node),
          `Unexpected runtime access: ${node.text}`);
      }
      ts.forEachChild(node, inspect);
    }
    inspect(ast);
  }
});

const moneyCases = [
  ['0', '0'], ['10', '10'], ['0010', '10'], ['000.00', '0'], ['1.20', '1.2'],
  ['1,234.56', '1234.56'], ['1.234,56', '1234.56'], ['1 234.56', '1234.56'],
  ['1\u2009234,56', '1234.56'], ['1\u202f234\u202f567,89', '1234567.89'], ['1\u00a0234.00', '1234'],
  ['1,234,567', '1234567'], ['1.234.567', '1234567'], ['123 456 789', '123456789'],
  ['USD 1,200.00', '1200'], ['eur1.234,56', '1234.56'], ['1,200.00 GBP', '1200'],
  ['US$123.45', '123.45'], ['$12.50 USD', '12.5'], ['£0.10', '0.1'], ['€ 0,10', '0.1'],
  ['Rs. 1,234.56', '1234.56'], ['¥100', '100'], ['₹ 100.00', '100'],
  ['(1,234.56)', '-1234.56'], ['(USD 12.50)', '-12.5'], ['USD (12.50)', '-12.5'],
  ['-$12.50', '-12.5'], ['$-12.50', '-12.5'], ['+12.50', '12.5'], ['(-0)', null], ['-0.00', '0'],
  ['1,234', null], ['1.234', null], ['0.125', null], ['1,234', '1234', 'dot'],
  ['1.234', '1.234', 'dot'], ['1.234', '1234', 'comma'], ['1,234', '1.234', 'comma'],
  ['1,234.567', '1234.567'], ['1.234,567', '1234.567'], ['999999999999.99', '999999999999.99'],
  ['999999999999.999', '999999999999.999', 'dot'], ['1000000000000', null],
  ['999,999,999,999.999', '999999999999.999'], ['1000000000000.001', null, 'dot'],
  ['1,23,456.78', null], ['12,34.56', null], ['1.23.456,78', null], ['1 23 456', null],
  ['1,234 567.89', null], ['1 234,567.89', null], ['1,,234.56', null], ['1..234,56', null],
  ['1,234,56', null], ['1.2.3', null], ['10 20', null], ['10.00 20.00', null],
  ['100\n200', null], ['100\t200', null], ['100\r\n200', null], ['100\u2028200', null], ['100\u2029200', null],
  ['USD 10 EUR 20', null], ['$10/$20', null], ['10,00;20,00', null], ['USD 10 EUR', null],
  ['£10 USD', null], ['US$10 CAD', null], ['USDUSD10', null], ['dollars 10', null],
  ['FOO 10', null], ['USD 10 junk', null], ['12e3', null], ['1E+3', null], ['Infinity', null],
  ['NaN', null], ['10%', null], ['10 % USD', null], ['(10%)', null], ['--10', null], ['+-10', null],
  ['(10', null], ['10)', null], ['-(10)', null], ['((10))', null], ['.50', null], ['1.', null],
  ['1,', null], ['1.2345', null], ['12.3456', null, 'dot'], ['', null], [' ', null],
  ['10\u0000', null], ['1\u202e0', null], ['１２３', null], ['12', null, 'other'],
];
for (const [input, expected, format = 'auto'] of moneyCases) {
  test(`money ${JSON.stringify(input)} (${format})`, () => assert.equal(parseAmount(input, format), expected));
}
test('non-string money is rejected rather than coerced', () => {
  for (const value of [null, undefined, 12, {}, { toString() { throw new Error('Must not execute'); } }]) assert.equal(parseAmount(value), null);
});
test('overlong money is rejected before parsing', () => assert.equal(parseAmount('0'.repeat(257)), null));

const dateCases = [
  ['2026-10-03', '2026-10-03'], ['2026/10/03', '2026-10-03'], ['2026.10.03', '2026-10-03'],
  ['2024-02-29', '2024-02-29'], ['2000-02-29', '2000-02-29'], ['1900-02-29', null], ['2026-02-29', null],
  ['2026-04-31', null], ['2026-00-01', null], ['2026-13-01', null], ['2026-01-00', null], ['0000-01-01', null],
  ['03/04/2026', null], ['03/04/2026', '2026-04-03', 'dmy'], ['03/04/2026', '2026-03-04', 'mdy'],
  ['03/03/2026', '2026-03-03'], ['13/04/2026', '2026-04-13'], ['04/13/2026', '2026-04-13'],
  ['29/02/2024', '2024-02-29'], ['29/02/2026', null], ['31/04/2026', null], ['13/13/2026', null],
  ['03/04/26', null], ['26-03-04', null], ['3 October 2026', '2026-10-03'],
  ['03-Oct-2026', '2026-10-03'], ['October 3, 2026', '2026-10-03'], ['Oct. 3 2026', '2026-10-03'],
  ['October 3,2026', '2026-10-03'],
  ['3 Sept 2026', '2026-09-03'], ['February 29, 2024', '2024-02-29'], ['February 29, 2026', null],
  ['30 February 2026', null], ['Octopus 3 2026', null], ['Due Date: 2026-10-03', null],
  ['2026-10-03T00:00:00Z', null], ['03/04-2026', null], ['', null], ['today', null],
  ['2026-10-03', null, 'other'], ['2026-10-03\u202e', null],
];
for (const [input, expected, order = 'auto'] of dateCases) {
  test(`date ${JSON.stringify(input)} (${order})`, () => assert.equal(parseInvoiceDate(input, order), expected));
}

for (const field of ['subtotal', 'tax', 'discount', 'shipping']) {
  test(`${field} permits an optional blank`, () => assert.equal(normalizeField(field, ' \t', auto), ''));
}
for (const field of ['vendor', 'invoiceNumber', 'invoiceDate', 'currency', 'total']) {
  test(`${field} does not normalize a required blank into a value`, () => assert.equal(normalizeField(field, ' ', auto), null));
}
for (const [input, expected] of [['usd', 'USD'], ['£', 'GBP'], ['€', 'EUR'], ['US$', 'USD'], ['CAD', 'CAD'],
  ['$', null], ['Rs', null], ['¥', null], ['US dollars', null], ['ZZZ', null], ['USD/EUR', null]]) {
  test(`currency normalization ${input}`, () => assert.equal(normalizeField('currency', input, auto), expected));
}
test('field whitespace, limits and controls', () => {
  assert.equal(normalizeField('vendor', '  Acme\t Labs\nLLC ', auto), 'Acme Labs LLC');
  assert.equal(normalizeField('vendor', 'V'.repeat(160), auto), 'V'.repeat(160));
  assert.equal(normalizeField('vendor', 'V'.repeat(161), auto), null);
  assert.equal(normalizeField('invoiceNumber', 'N'.repeat(96), auto), 'N'.repeat(96));
  assert.equal(normalizeField('invoiceNumber', 'N'.repeat(97), auto), null);
  assert.equal(normalizeField('vendor', 'Acme\u0000LLC', auto), null);
  assert.equal(normalizeField('total', '1.234', { ...auto, numberFormat: 'dot' }), '1.234');
  assert.equal(normalizeField('total', '100\n200', auto), null);
  assert.equal(normalizeField('total', '100\t200', auto), null);
  assert.equal(normalizeField('notAField', 'x', auto), null);
});

const validProfile = { version: 1, name: 'My supplier', labels: { vendor: 'Issuer', invoiceNumber: 'Document ID', total: 'Amount (tax included)' } };
test('profile returns a fresh normalized copy containing labels only', () => {
  const input = { ...validProfile, labels: { ...validProfile.labels } };
  const profile = parseMappingProfile(input);
  assert.deepEqual(profile, validProfile);
  assert.notEqual(profile.labels, input.labels);
  assert.deepEqual(parseMappingProfile({ version: 1, name: ' Empty ', labels: {} }), { version: 1, name: 'Empty', labels: {} });
});
const badProfiles = [
  null, [], 'JSON string is not parsed data', 1, new Date(), { version: 2, name: 'X', labels: {} },
  { version: '1', name: 'X', labels: {} }, { version: 1, name: '', labels: {} },
  { version: 1, name: ' ', labels: {} }, { version: 1, name: 'X'.repeat(61), labels: {} },
  { version: 1, name: 'X\nY', labels: {} }, { version: 1, name: 'X', labels: [] },
  { version: 1, name: 'X', labels: { total: 12 } }, { version: 1, name: 'X', labels: { total: '' } },
  { version: 1, name: 'X', labels: { total: 'X'.repeat(61) } }, { version: 1, name: 'X', labels: { total: '\tTotal' } },
  { version: 1, name: 'X', labels: { total: 'T\u202eotal' } }, { version: 1, name: 'X', labels: { customer: 'Customer' } },
  { version: 1, name: 'X', labels: {}, values: { total: '100' } },
  { version: 1, name: 'X', labels: {}, sourceFiles: ['private.pdf'] }, { version: 1, name: 'X' },
  JSON.parse('{"version":1,"name":"X","labels":{"__proto__":"bad"}}'),
  JSON.parse('{"version":1,"name":"X","labels":{},"__proto__":{}}'),
  { version: 1, name: 'X', labels: { constructor: 'Total' } },
  { version: 1, name: 'X', labels: { prototype: 'Total' } },
];
badProfiles.forEach((profile, index) => test(`profile sanitization ${index + 1}`, () => assert.equal(parseMappingProfile(profile), null)));
test('profile rejects accessors without evaluating them', () => {
  let calls = 0;
  const profile = { version: 1, name: 'X', get labels() { calls++; return {}; } };
  assert.equal(parseMappingProfile(profile), null);
  assert.equal(calls, 0);
  const labels = { get total() { calls++; return 'Total'; } };
  assert.equal(parseMappingProfile({ version: 1, name: 'X', labels }), null);
  assert.equal(calls, 0);
});
test('profile rejects custom prototypes, symbols and hidden properties', () => {
  assert.equal(parseMappingProfile(Object.assign(Object.create({ surprise: true }), validProfile)), null);
  assert.equal(parseMappingProfile({ ...validProfile, [Symbol('hidden')]: 'bad' }), null);
  assert.equal(parseMappingProfile({ ...validProfile, labels: Object.defineProperty({}, 'total', { value: 'Total' }) }), null);
});
test('regex-looking labels are inert literals', () => {
  const profile = parseMappingProfile({ version: 1, name: 'Literal', labels: { total: '(a+)+$' } });
  assert(profile);
  assert.equal(extract(invoiceRows(), { ...auto, profile }).fields.total, '');
  assert.equal(extract([...invoiceRows(), '(a+)+$: USD 25.00'], { ...auto, profile }).fields.total, '25');
});

const token = (text, x, y, page = 1, width = text.length * 5, height = 10) => ({ text, x, y, page, width, height });
test('letter tokens join without inserted spaces', () => {
  const grouped = groupTextTokens([token('V', 20, 10), token('I', 10, 10.5), token('N', 15, 10.2)]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].text, 'INV');
});
test('word gaps and explicit whitespace remain word boundaries', () => {
  assert.equal(groupTextTokens([token('Acme', 10, 10), token('Labs', 34, 10)])[0].text, 'Acme Labs');
  assert.equal(groupTextTokens([token('Invoice\t No: ', 10, 10, 1, 60), token(' INV-001', 70, 10)])[0].text, 'Invoice No: INV-001');
});
test('wide columns are separate source lines, not a combined monetary value', () => {
  const grouped = groupTextTokens([token('100', 10, 10), token('200', 300, 10)]);
  assert.deepEqual(grouped.map(line => [line.text, line.x]), [['100', 10], ['200', 300]]);
});
test('page, top-down row and x order; stable per-page one-based ids', () => {
  const input = [token('second', 10, 30), token('page 2', 10, 1, 2), token('right', 300, 10), token('first', 10, 10)];
  const grouped = groupTextTokens(input);
  assert.deepEqual(grouped.map(line => line.id), ['p1-l1', 'p1-l2', 'p1-l3', 'p2-l1']);
  assert.deepEqual(grouped.map(line => line.text), ['first', 'right', 'second', 'page 2']);
  assert.deepEqual(groupTextTokens([...input].reverse()), grouped);
});
test('baseline tolerance does not chain adjacent rows', () => {
  assert.deepEqual(groupTextTokens([token('A', 10, 10), token('B', 20, 12), token('C', 30, 14)]).map(line => line.text), ['A B', 'C']);
});
test('duplicate painted tokens are deduplicated, different pages are not', () => {
  const a = token('Acme', 10, 10);
  assert.deepEqual(groupTextTokens([a, { ...a }, { ...a, page: 2 }]).map(line => line.text), ['Acme', 'Acme']);
});
test('grouper does not mutate its inputs', () => {
  const input = deepFreeze([token('B', 30, 10), token('A', 10, 10)]);
  assert.equal(groupTextTokens(input)[0].text, 'A B');
});
test('grouper fails closed on bad geometry and text bounds', () => {
  for (const bad of [{ ...token('A', 0, 0), x: NaN }, { ...token('A', 0, 0), height: 0 }, token('A', 0, 0, 0),
    token('A', 0, 0, 16), token('A'.repeat(4097), 0, 0), token('bad\u0000', 0, 0)]) assert.deepEqual(groupTextTokens([bad]), []);
  assert.deepEqual(groupTextTokens(Array.from({ length: INVOICE_LIMITS.pageItems + 1 }, () => token('x', 0, 0))), []);
});

test('healthy US invoice, raw evidence and exact adjustments', () => {
  const result = extract(['Supplier: Acme Labs LLC', 'Invoice No: INV-001', 'Invoice Date: October 3, 2026',
    'Subtotal USD 1,200.00', 'Sales Tax USD 120.00', 'Shipping USD 10.00', 'Discount USD 30.00', 'Invoice Total USD 1,300.00']);
  assert.deepEqual(result.fields, { vendor: 'Acme Labs LLC', invoiceNumber: 'INV-001', invoiceDate: '2026-10-03', currency: 'USD',
    subtotal: '1200', tax: '120', shipping: '10', discount: '30', total: '1300' });
  assert.equal(result.kind, 'invoice');
  assert.equal(result.evidence.subtotal.text, 'Subtotal USD 1,200.00');
  assert.equal(result.evidence.subtotal.method, 'label');
  assert.equal(errors(extractedRecord(result)).length, 0);
});
test('healthy EU invoice', () => {
  const result = extract(['Vendor: Example GmbH', 'Invoice Number: EU-001', 'Invoice Date: 13/04/2026',
    'Subtotal EUR 1.200,00', 'VAT EUR 240,00', 'Grand Total EUR 1.440,00']);
  assert.equal(result.fields.currency, 'EUR');
  assert.equal(result.fields.invoiceDate, '2026-04-13');
  assert.equal(result.fields.total, '1440');
  assert.equal(result.fields.tax, '240');
  assert.equal(errors(extractedRecord(result)).length, 0);
});
test('PDF token grouping to labeled extraction', () => {
  const tokens = [token('Supplier: Acme Labs LLC', 40, 20), token('Invoice No:', 40, 40, 1, 55), token('INV-001', 180, 40),
    token('Invoice Date: 2026-10-03', 40, 60), token('Subtotal USD 100.00', 40, 80), token('Tax USD 10.00', 40, 100),
    token('Grand Total', 40, 120, 1, 55), token('USD 110.00', 180, 120)];
  const result = extractInvoice(groupTextTokens(tokens), auto);
  assert.equal(result.fields.invoiceNumber, 'INV-001');
  assert.equal(result.fields.total, '110');
  assert.equal(errors(extractedRecord(result)).length, 0);
});
test('label-then-next-line values with raw two-line evidence', () => {
  const result = extract(['Supplier:', 'Acme Labs LLC', 'Invoice No:', 'INV-001', 'Invoice Date:', '2026-10-03', 'Invoice Total:', 'USD 110.00']);
  assert.equal(result.fields.vendor, 'Acme Labs LLC');
  assert.equal(result.fields.invoiceNumber, 'INV-001');
  assert.equal(result.fields.invoiceDate, '2026-10-03');
  assert.equal(result.fields.total, '110');
  assert.equal(result.evidence.total.text, 'Invoice Total:\nUSD 110.00');
});
for (const [name, valueLine] of [
  ['page', { text: 'USD 100.00', page: 2, x: 40, y: 12 }],
  ['vertical distance', { text: 'USD 100.00', y: 100 }],
  ['column', { text: 'USD 100.00', x: 400, y: 30 }],
]) {
  test(`label does not consume value across ${name}`, () => assert.equal(extract(['Invoice Total:', valueLine]).fields.total, ''));
}
test('two adjacent bare amount columns are not selected arbitrarily', () => {
  const result = extract([{ text: 'Invoice Total:', x: 40, y: 10 }, { text: '100', x: 180, y: 10 }, { text: '200', x: 260, y: 10 }]);
  assert.equal(result.fields.total, '');
  assert(has(result.issues, 'multi_column_layout'));
});
test('wrapped explicit supplier is kept together, address is not appended', () => {
  const result = extract(['Supplier:', 'Acme International', 'Trading Ltd', '123 Main Street', ...invoiceRows().slice(1)]);
  assert.equal(result.fields.vendor, 'Acme International Trading Ltd');
  assert.equal(result.evidence.vendor.text, 'Supplier:\nAcme International\nTrading Ltd');
  assert(has(result.issues, 'supplier_wrapped', 'vendor'));
});
test('unlabelled supplier header is a suggestion, never verified', () => {
  const result = extract(['INVOICE', 'Acme Labs LLC', '123 Main Street', 'Bill to: Example Customer', ...invoiceRows().slice(1)]);
  assert.equal(result.fields.vendor, 'Acme Labs LLC');
  assert.equal(result.evidence.vendor.method, 'header');
  assert(has(result.issues, 'supplier_suggested', 'vendor'));
});
test('document title, address, email and customer are not suppliers', () => {
  const result = extract(['TAX INVOICE', '123 Main Street', 'billing@example.test', 'Bill to:', 'Example Customer LLC', ...invoiceRows().slice(1)]);
  assert.equal(result.fields.vendor, '');
});
test('postal-address header is not suggested as supplier', () => {
  const result = extract(['INVOICE', 'London, UK', 'SW1A 1AA', 'Bill to: Example Customer', ...invoiceRows().slice(1)]);
  assert.equal(result.fields.vendor, '');
});
test('unlabelled city after an address is not suggested as supplier', () => {
  assert.equal(extract(['INVOICE', '123 Main Street', 'London', 'United Kingdom', ...invoiceRows().slice(1)]).fields.vendor, '');
});
test('uppercase corporate suffix is not mistaken for a city/country', () => {
  assert.equal(extract(invoiceRows().map(row => row.startsWith('Supplier:') ? 'Supplier: Acme, INC' : row)).fields.vendor, 'Acme, INC');
});
test('standalone original/copy document markers are not supplier names', () => {
  assert.equal(extract(['ORIGINAL', 'INVOICE', 'Acme Labs LLC', ...invoiceRows().slice(1)]).fields.vendor, 'Acme Labs LLC');
});
test('invalid explicit supplier does not fall back to customer/header', () => {
  assert.equal(extract(['Other Company', 'Supplier: customer@example.test', 'Bill to: Customer LLC', ...invoiceRows().slice(1)]).fields.vendor, '');
});
test('due date does not become invoice date, even via a custom label', () => {
  const rows = invoiceRows().filter(row => !row.startsWith('Invoice Date:'));
  assert.equal(extract([...rows, 'Due Date: 2026-11-03']).fields.invoiceDate, '');
  const profile = { version: 1, name: 'Unsafe due date mapping', labels: { invoiceDate: 'Due Date' } };
  assert.equal(extract([...rows, 'Due Date: 2026-11-03'], { ...auto, profile }).fields.invoiceDate, '');
});
test('ambiguous invoice date is blank, explicit date order resolves it', () => {
  const rows = invoiceRows().map(row => row.startsWith('Invoice Date:') ? 'Invoice Date: 03/04/2026' : row);
  assert.equal(extract(rows).fields.invoiceDate, '');
  assert.equal(extract(rows, { ...auto, dateOrder: 'dmy' }).fields.invoiceDate, '2026-04-03');
});
test('amount/balance due, payments and subtotal cannot replace invoice total', () => {
  const rows = invoiceRows().filter(row => !row.startsWith('Grand Total'));
  const extra = ['Amount Due USD 80.00', 'Balance Due USD 80.00', 'Amount Paid USD 30.00', 'Total Due USD 80.00', 'Total Paid USD 30.00'];
  assert.equal(extract([...rows, ...extra]).fields.total, '');
  assert.equal(extract([...rows, ...extra, 'Invoice Total USD 110.00']).fields.total, '110');
  assert.equal(extract([...rows, ...extra, 'Total incl tax USD 110.00']).fields.total, '110');
});
test('total template does not bypass amount-due exclusion', () => {
  const profile = { version: 1, name: 'Unsafe total mapping', labels: { total: 'Amount Due' } };
  assert.equal(extract([...invoiceRows(), 'Amount Due USD 80.00'], { ...auto, profile }).fields.total, '');
});
for (const label of ['Tax', 'Tax amount', 'Total tax', 'Sales tax', 'VAT', 'VAT amount', 'GST', 'GST amount', 'HST']) {
  test(`literal tax label ${label}`, () => {
    const result = extract(invoiceRows().map(row => row.startsWith('Tax ') ? `${label} USD 10.00` : row));
    assert.equal(result.fields.tax, '10');
  });
}
for (const tax of ['Tax 10%', 'Tax rate: 10%', 'VAT (10%)', 'VAT ID: 123456']) {
  test(`${tax} is not a tax amount`, () => assert.equal(extract(invoiceRows().map(row => row.startsWith('Tax ') ? tax : row)).fields.tax, ''));
}
test('percentage annotation plus an explicit tax amount is supported', () => {
  assert.equal(extract(invoiceRows().map(row => row.startsWith('Tax ') ? 'VAT (10%): USD 10.00' : row)).fields.tax, '10');
});
test('a rate label may read a separate nearby money amount, never the rate itself', () => {
  const result = extract(['VAT (10%)', 'USD 10.00']);
  assert.equal(result.fields.tax, '10');
  assert.equal(result.evidence.tax.text, 'VAT (10%)\nUSD 10.00');
  assert.equal(extract(['VAT (10%)', { text: 'USD 10.00', page: 2 }]).fields.tax, '');
});
test('zero tax is retained; a separate rate-only label is not a conflicting amount', () => {
  const result = extract(invoiceRows().map(row => row.startsWith('Tax ') ? 'Tax amount USD 0.00' : row).concat('VAT 0%'));
  assert.equal(result.fields.tax, '0');
});
test('separate tax components are not mistaken for the total or automatically added', () => {
  const rows = invoiceRows().filter(row => !row.startsWith('Tax ')).concat('CGST USD 5.00', 'SGST USD 5.00');
  const result = extract(rows);
  assert.equal(result.fields.tax, '');
  assert(has(result.issues, 'tax_components', 'tax'));
  assert.equal(extract([...rows, 'Total tax USD 10.00']).fields.tax, '10');
});
test('repeated page headers are deduplicated without a second-invoice flag', () => {
  const rows = [1, 2].flatMap(page => invoiceRows().map((text, index) => ({ text, page, y: 10 + index * 20 })));
  const result = extract(rows);
  assert.equal(result.kind, 'invoice');
  assert.equal(result.fields.invoiceNumber, 'INV-001');
  assert.equal(result.fields.total, '110');
  assert(!has(result.issues, 'duplicate_totals'));
  assert(!has(result.issues, 'conflicting_candidates'));
});
test('conflicting total candidates stay blank rather than favoring one number', () => {
  const result = extract([...invoiceRows(), 'Total USD 120.00']);
  assert.equal(result.fields.total, '');
  assert(has(result.issues, 'conflicting_candidates', 'total'));
  assert(has(result.issues, 'duplicate_totals'));
});
test('equal duplicate totals warn and prefer authoritative evidence', () => {
  const result = extract([...invoiceRows(), 'Total USD 110.00']);
  assert.equal(result.fields.total, '110');
  assert.equal(result.evidence.total.text, 'Grand Total USD 110.00');
  assert(has(result.issues, 'duplicate_totals'));
});
test('conflicting supplier and date values are left blank', () => {
  const result = extract([...invoiceRows(), 'Supplier: Other Labs LLC', 'Invoice Date: 2026-10-04']);
  assert.equal(result.fields.vendor, '');
  assert.equal(result.fields.invoiceDate, '');
});
for (const page of [1, 2]) {
  test(`two invoice numbers on page ${page} block the document`, () => {
    const result = extract([...invoiceRows(), { text: 'Invoice No: INV-002', page }]);
    assert.equal(result.kind, 'multiple');
    assert.equal(result.fields.invoiceNumber, '');
    assert(has(result.issues, 'multiple_invoices'));
    assert(!canReview(extractedRecord(result), []));
  });
}
test('template override cannot hide a second default invoice number', () => {
  const profile = { version: 1, name: 'Document label', labels: { invoiceNumber: 'Document ID' } };
  const result = extract([...invoiceRows(), 'Document ID: A', { text: 'Invoice No: INV-002', page: 2 }], { ...auto, profile });
  assert.equal(result.kind, 'multiple');
});
for (const label of ['Document ID', 'DocumentID']) {
  const profile = { version: 1, name: 'Document label', labels: { invoiceNumber: label } };
  const rows = invoiceRows().map(row => row.startsWith('Invoice No:') ? 'Invoice No: INV-A' : row);
  for (const page of [1, 2]) {
    test(`one default and one distinct ${label} on page ${page} block the document`, () => {
      const result = extract([...rows, { text: `${label}: INV-B`, page }], { ...auto, profile });
      assert.equal(result.kind, 'multiple');
      assert.equal(result.fields.invoiceNumber, '');
      assert(result.issues.some(issue => issue.code === 'multiple_invoices' && issue.severity === 'error'));
      const current = extractedRecord(result, { reviewed: true });
      assert(!canReview(current, [current]));
      assert.deepEqual(getCurrencyTotals([current]), []);
      const edited = { ...current, kind: 'invoice', fields: { ...current.fields, invoiceNumber: 'INV-B' } };
      assert(!canReview(edited, [edited]));
      assert.deepEqual(getCurrencyTotals([edited]), []);
    });
    test(`matching default and ${label} on page ${page} do not block the document`, () => {
      for (const value of ['INV-A', '  inv-a  ']) {
        const result = extract([...rows, { text: `${label}: ${value}`, page }], { ...auto, profile });
        assert.equal(result.kind, 'invoice');
        assert.equal(result.fields.invoiceNumber, value.trim());
        assert.equal(result.evidence.invoiceNumber.text, `${label}: ${value}`);
        assert(!has(result.issues, 'multiple_invoices'));
        const current = extractedRecord(result);
        assert.equal(errors(current).length, 0);
        assert(canReview(current, [current]));
      }
    });
  }
}
test('two custom invoice numbers still block without any default number', () => {
  const profile = { version: 1, name: 'Document label', labels: { invoiceNumber: 'Document ID' } };
  const rows = invoiceRows().map(row => row.startsWith('Invoice No:') ? 'Document ID: INV-A' : row);
  const result = extract([...rows, 'Document ID: INV-B'], { ...auto, profile });
  assert.equal(result.kind, 'multiple');
  assert.equal(result.fields.invoiceNumber, '');
  assert(has(result.issues, 'multiple_invoices'));
});
for (const [date, expected] of [['2026-10-03', '2026-10-03'], ['2026-10-04', '']]) {
  test(`another invoice date ${date} with matching default/custom IDs is not multiple invoices`, () => {
    const profile = { version: 1, name: 'Document label', labels: { invoiceNumber: 'Document ID' } };
    const result = extract([...invoiceRows(), 'Document ID: INV-001', `Invoice Date: ${date}`], { ...auto, profile });
    assert.equal(result.kind, 'invoice');
    assert.equal(result.fields.invoiceNumber, 'INV-001');
    assert.equal(result.fields.invoiceDate, expected);
    assert.equal(has(result.issues, 'conflicting_candidates', 'invoiceDate'), expected === '');
    assert(!has(result.issues, 'multiple_invoices'));
  });
}
for (const heading of ['CREDIT NOTE', 'Credit Memo: CN-1', 'REFUND', 'Refund Invoice', 'Document Type: Credit Note']) {
  test(`${heading} is explicitly unsupported`, () => {
    const result = extract([heading, ...invoiceRows()]);
    assert.equal(result.kind, 'credit-note');
    assert(has(result.issues, 'credit_note'));
    assert(!canReview(extractedRecord(result), []));
  });
}
test('refund policy prose and credit-card payments are not credit-note headings', () => {
  assert.equal(extract([...invoiceRows(), 'Refund policy: contact support within 14 days', 'Payment method: credit card']).kind, 'invoice');
});
test('negative total is an unsupported credit, including conflicting totals', () => {
  assert.equal(extract(invoiceRows().map(row => row.startsWith('Grand Total') ? 'Grand Total (USD 110.00)' : row)).kind, 'credit-note');
  assert.equal(extract([...invoiceRows(), 'Invoice Total (USD 110.00)']).kind, 'credit-note');
});
for (const symbol of ['$', 'Rs', '¥']) {
  test(`ambiguous global currency ${symbol} is not guessed`, () => {
    const result = extract(invoiceRows().map(row => row.replaceAll('USD', symbol)));
    assert.equal(result.fields.currency, '');
    assert(has(result.issues, 'ambiguous_currency', 'currency'));
  });
}
for (const [symbol, expected] of [['US$', 'USD'], ['£', 'GBP'], ['€', 'EUR'], ['₹', 'INR'], ['CAD', 'CAD']]) {
  test(`unambiguous currency ${symbol}`, () => assert.equal(extract(invoiceRows().map(row => row.replaceAll('USD', symbol))).fields.currency, expected));
}
test('a global ISO code can disambiguate its compatible symbol', () => {
  assert.equal(extract([...invoiceRows().map(row => row.replaceAll('USD', '$')), 'All amounts in CAD.']).fields.currency, 'CAD');
  assert.equal(extract([...invoiceRows().map(row => row.replaceAll('USD', 'Rs')), 'Currency: PKR']).fields.currency, 'PKR');
});
test('conflicting ISO codes or incompatible symbols blank currency', () => {
  assert.equal(extract([...invoiceRows(), 'Currency: EUR']).fields.currency, '');
  assert.equal(extract([...invoiceRows().map(row => row.replaceAll('USD', '$')), 'Currency: EUR']).fields.currency, '');
  assert.equal(extract([...invoiceRows(), 'Bank currency: EUR']).fields.currency, '');
});
test('explicit template labels replace, rather than extend, aliases', () => {
  const profile = { version: 1, name: 'Custom', labels: { vendor: 'Issuer', invoiceNumber: 'Document ID', invoiceDate: 'Issued', total: 'Amount (tax included)' } };
  const options = { ...auto, profile };
  const missing = extract(invoiceRows(), options);
  for (const field of ['vendor', 'invoiceNumber', 'invoiceDate', 'total']) assert.equal(missing.fields[field], '');
  const result = extract([...invoiceRows(), 'Issuer: Other Labs LLC', 'Document ID: INV-001', 'Issued: 2026-10-05', 'Amount (tax included): USD 99.00'], options);
  assert.equal(result.fields.vendor, 'Other Labs LLC');
  assert.equal(result.fields.invoiceNumber, 'INV-001');
  assert.equal(result.evidence.invoiceNumber.text, 'Document ID: INV-001');
  assert.equal(result.fields.invoiceDate, '2026-10-05');
  assert.equal(result.fields.total, '99');
  assert.equal(result.kind, 'invoice');
  assert(!has(result.issues, 'multiple_invoices'));
});
test('overridden currency label cannot silently fall back to old alias/global codes', () => {
  const profile = { version: 1, name: 'Custom currency', labels: { currency: 'Billing currency' } };
  assert.equal(extract([...invoiceRows(), 'Currency: USD'], { ...auto, profile }).fields.currency, '');
  assert.equal(extract([...invoiceRows(), 'Billing currency: USD'], { ...auto, profile }).fields.currency, 'USD');
});
test('inline labels are bounded and longest literal labels remain intact', () => {
  const profile = { version: 1, name: 'Explicit date only', labels: { invoiceDate: 'Invoice Date' } };
  const result = extract(['Supplier: Acme Labs LLC', 'Invoice No: INV-001 Invoice Date: 2026-10-03', 'Invoice Total USD 110.00'], { ...auto, profile });
  assert.equal(result.fields.invoiceNumber, 'INV-001');
  assert.equal(result.fields.invoiceDate, '2026-10-03');
});
test('inline due date cannot be relabeled as plain Date', () => {
  const result = extract(['Supplier: Acme Labs LLC', 'Invoice No: INV-001 Due Date: 2026-10-20', 'Invoice Total USD 110.00']);
  assert.equal(result.fields.invoiceDate, '');
  assert(!result.fields.invoiceNumber.includes('Due'));
});
test('currency evidence on a supplier row survives explicit column boundaries', () => {
  const result = extract(['Supplier: Acme Labs LLC | Invoice Total: USD 110.00', 'Invoice No: INV-001', 'Invoice Date: 2026-10-03']);
  assert.equal(result.fields.currency, 'USD');
  assert.equal(result.fields.total, '110');
});
test('a second unlabelled amount beside an inline total makes the column ambiguous', () => {
  const result = extract(['Supplier: Acme Labs LLC', 'Invoice No: INV-001', 'Invoice Date: 2026-10-03', 'Invoice Total: USD 100.00 | 200.00']);
  assert.equal(result.fields.total, '');
  assert(has(result.issues, 'multi_column_layout'));
});
test('attached invoice hash label is still a literal label boundary', () => {
  assert.equal(extract(['Invoice #INV-001']).fields.invoiceNumber, 'INV-001');
});
test('a lower-case English word is not a currency code', () => {
  assert.equal(extract([...invoiceRows(), 'Please try again if payment fails.']).fields.currency, 'USD');
});
test('template labels that collide across fields fail closed', () => {
  for (const labels of [{ vendor: 'Same label', invoiceNumber: 'Same label' }, { total: 'Tax' }]) {
    const result = extract(invoiceRows(), { ...auto, profile: { version: 1, name: 'Collision', labels } });
    assert(has(result.issues, 'ambiguous_profile'));
    assert.deepEqual(result.fields, emptyFields());
  }
});
test('a present template currency symbol may be disambiguated by a global ISO code', () => {
  const profile = { version: 1, name: 'Currency', labels: { currency: 'Billing currency' } };
  assert.equal(extract([...invoiceRows().map(row => row.replaceAll('USD', 'CAD')), 'Billing currency: $'], { ...auto, profile }).fields.currency, 'CAD');
});
test('from-date and payment dates cannot leak into invoice date through an inline boundary', () => {
  const result = extract(['Invoice No: INV-001 From Date: 2026-10-01', 'Payment Date: 2026-10-10']);
  assert.equal(result.fields.invoiceDate, '');
  assert.equal(result.fields.vendor, '');
});
test('a wrapped amount after another label is not borrowed as invoice total', () => {
  const result = extract([{ text: 'Invoice Total:', x: 40, y: 10 }, { text: 'Amount Due:', x: 80, y: 10 }, { text: 'USD 80.00', x: 40, y: 30 }]);
  assert.equal(result.fields.total, '');
});
test('invalid and duplicate source ids/geometry fail closed', () => {
  const source = lines(invoiceRows());
  for (const bad of [source.map(line => ({ ...line, id: 'same' })), [{ ...source[0], id: 'bad\n' }],
    [{ ...source[0], x: Infinity }], [{ ...source[0], height: 0 }], [{ ...source[0], page: 16 }]]) {
    const result = extractInvoice(bad, auto);
    assert(has(result.issues, 'unsupported_text'));
    assert.deepEqual(result.fields, emptyFields());
  }
});
test('source character budget is checked before partial extraction', () => {
  const result = extractInvoice(lines(Array.from({ length: 31 }, () => 'x'.repeat(4000))), auto);
  assert(has(result.issues, 'unsupported_text'));
  assert.deepEqual(result.fields, emptyFields());
});
test('extraction sorts a copy into page/top-down order', () => {
  const input = lines(invoiceRows());
  assert.deepEqual(extractInvoice([...input].reverse(), auto), extractInvoice(input, auto));
});
test('no text, invalid options/profile and exceeded limits fail closed', () => {
  for (const result of [extract([]), extract([' ']), extract(['A'.repeat(4097)]),
    extract(invoiceRows(), { ...auto, numberFormat: 'other' }), extract(invoiceRows(), { ...auto, profile: { ...validProfile, version: 2 } })]) {
    assert(result.issues.some(issue => issue.severity === 'error'));
    assert.deepEqual(result.fields, emptyFields());
  }
});
test('extraction does not mutate lines or profile/options', () => {
  const input = deepFreeze(lines(invoiceRows()));
  const options = deepFreeze({ ...auto, profile: { version: 1, name: 'Defaults', labels: {} } });
  assert.equal(extractInvoice(input, options).fields.total, '110');
});

test('supported currency codes include zero/two/three-decimal currencies and are immutable', () => {
  for (const code of ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'CAD', 'AUD', 'CHF', 'NZD', 'SGD', 'JPY', 'CNY', 'HKD', 'KWD', 'BHD', 'OMR']) assert(CURRENCIES.includes(code));
  assert(Object.isFrozen(CURRENCIES));
});
test('healthy ready record is reviewable without silently marking it reviewed', () => {
  const value = deepFreeze(record());
  assert.equal(errors(value).length, 0);
  assert(canReview(value, [value]));
  assert.equal(value.reviewed, false);
});
for (const field of ['vendor', 'invoiceNumber', 'invoiceDate', 'currency', 'total']) {
  test(`missing required ${field} blocks review/export`, () => {
    const value = record({ reviewed: true, fields: { [field]: '' } });
    assert(has(errors(value), 'required_field', field));
    assert(!canReview(value, [value]));
    assert.deepEqual(getCurrencyTotals([value]), []);
  });
}
const invalidFields = [
  ['vendor', 'v'.repeat(161)], ['invoiceNumber', 'i'.repeat(97)], ['vendor', ' Acme '], ['vendor', 'Acme\u0000LLC'],
  ['invoiceNumber', 'A\tB'], ['currency', 'usd'], ['currency', '$'], ['currency', 'ZZZ'],
  ['invoiceDate', '2026-02-29'], ['invoiceDate', '03/04/2026'], ['invoiceDate', '2026-1-01'],
  ['total', '01'], ['total', '1.00'], ['total', '1,000'], ['total', 'USD 10'], ['total', '1e3'],
  ['total', 'NaN'], ['total', 'Infinity'], ['total', '1000000000000'], ['total', '-0'], ['total', '1.2345'],
  ['total', 110], ['tax', ' '], ['subtotal', '100.00'],
];
invalidFields.forEach(([field, value], index) => test(`canonical field validation ${index + 1}: ${field}`, () => {
  const current = record({ fields: { [field]: value } });
  assert(errors(current).some(issue => issue.field === field));
  assert(!canReview(current, [current]));
}));
for (const field of ['subtotal', 'tax', 'shipping', 'discount', 'total']) {
  test(`negative ${field} is an error`, () => assert(errors(record({ fields: { [field]: '-1' } })).some(issue => issue.field === field)));
}
for (const currency of ['KWD', 'BHD', 'OMR', 'JOD', 'TND']) {
  test(`${currency} supports exact three-decimal amounts`, () => {
    const value = record({ fields: { currency, subtotal: '1', tax: '0.005', total: '1.005' } });
    assert.equal(errors(value).length, 0);
    assert(!has(validateInvoice(value, [value]), 'arithmetic_mismatch'));
  });
}
for (const currency of ['JPY', 'KRW', 'VND', 'CLP', 'ISK']) {
  test(`${currency} does not permit fractional money`, () => {
    assert(has(errors(record({ fields: { currency, total: '110.1' } })), 'currency_precision', 'total'));
    assert.equal(errors(record({ fields: { currency } })).length, 0);
  });
}
test('USD cannot silently round three decimal places', () => {
  assert(has(errors(record({ fields: { total: '110.001' } })), 'currency_precision', 'total'));
});
test('zero subtotal/tax/total are valid and exactly checked', () => {
  const value = record({ fields: { subtotal: '0', tax: '0', total: '0' } });
  assert.equal(errors(value).length, 0);
  assert(!has(validateInvoice(value, [value]), 'arithmetic_mismatch'));
});
test('optional missing subtotal/tax never claim arithmetic reconciliation', () => {
  for (const field of ['subtotal', 'tax']) {
    const value = record({ fields: { [field]: '', total: '999' } });
    assert.equal(errors(value).length, 0);
    assert(!validateInvoice(value, [value]).some(issue => /reconciled|arithmetic_mismatch/.test(issue.code)));
  }
});
test('shipping minus discount is applied with blank adjustments equal to zero', () => {
  const value = record({ fields: { shipping: '5', discount: '2', total: '113' } });
  assert(!has(validateInvoice(value, [value]), 'arithmetic_mismatch'));
  assert(!has(validateInvoice(record(), []), 'arithmetic_mismatch'));
});
for (const [currency, total, mismatch] of [['USD', '110.01', false], ['USD', '110.02', true],
  ['USD', '109.99', false], ['USD', '109.98', true], ['JPY', '111', false], ['JPY', '112', true],
  ['KWD', '110.001', false], ['KWD', '110.002', true]]) {
  test(`${currency} arithmetic tolerance for ${total}`, () => {
    const value = record({ fields: { currency, total } });
    assert.equal(has(validateInvoice(value, [value]), 'arithmetic_mismatch'), mismatch);
  });
}
test('large amounts reconcile using integer math, not binary floating point', () => {
  const value = record({ fields: { subtotal: '999999999999.9', tax: '0.09', total: '999999999999.99' } });
  assert(!has(validateInvoice(value, [value]), 'arithmetic_mismatch'));
});
for (const status of ['queued', 'processing', 'failed', 'cancelled']) {
  test(`${status} record cannot be reviewed or included in totals`, () => {
    const value = record({ status, reviewed: true });
    assert(has(errors(value), 'not_ready'));
    assert(!canReview(value, [value]));
    assert.deepEqual(getCurrencyTotals([value]), []);
  });
}
for (const kind of ['multiple', 'credit-note']) {
  test(`${kind} cannot be exported after field edits`, () => {
    const value = record({ kind, reviewed: true });
    assert(!canReview(value, [value]));
    assert.deepEqual(getCurrencyTotals([value]), []);
  });
}
test('document-level extraction safety flags persist independently of field/kind edits', () => {
  for (const code of ['multiple_invoices', 'credit_note']) {
    const value = record({ extractionIssues: [{ code, severity: 'warning', field: 'total', message: 'Source remains unsupported' }] });
    assert(!canReview(value, [value]));
    assert(has(errors(value), code));
  }
});
test('identical content hashes warn even when every invoice identity field differs', () => {
  const a = record({ fileHash: 'abc123' });
  const b = record({ fileHash: 'ABC123', fields: { vendor: 'Other LLC', invoiceNumber: 'OTHER', currency: 'EUR' } });
  assert(has(validateInvoice(a, [a, b]), 'duplicate_invoice'));
  assert(has(validateInvoice(b, [a, b]), 'duplicate_invoice'));
});
test('duplicate identity is case/whitespace folded and excludes date and amount', () => {
  const a = record({ fields: { invoiceNumber: 'INV-X' } });
  const b = record({ fields: { vendor: 'acme labs llc', invoiceNumber: 'inv-x', total: '200', invoiceDate: '2026-10-04' } });
  assert(has(validateInvoice(a, [a, b]), 'duplicate_invoice'));
  const differentCurrency = { ...b, fields: { ...b.fields, currency: 'EUR' } };
  assert(!has(validateInvoice(a, [a, differentCurrency]), 'duplicate_invoice'));
});
test('duplicates require both records to be included and ready', () => {
  const a = record({ fileHash: 'same' });
  for (const overrides of [{ included: false }, { status: 'failed' }, { status: 'cancelled' }, { status: 'processing' }, { status: 'queued' }]) {
    const b = record({ fileHash: 'same', ...overrides });
    assert(!has(validateInvoice(a, [a, b]), 'duplicate_invoice'));
    assert(!has(validateInvoice(b, [a, b]), 'duplicate_invoice'));
  }
});
test('empty hashes and self snapshots are not duplicates', () => {
  const a = record({ fileHash: '' });
  const b = record({ fileHash: '' });
  assert(!has(validateInvoice(a, [a, b, { ...a }]), 'duplicate_invoice'));
});
test('duplicate warnings do not discard records or prohibit review', () => {
  const a = record({ reviewed: true, fileHash: 'same' });
  const b = record({ reviewed: true, fileHash: 'same' });
  const records = deepFreeze([a, b]);
  assert(canReview(a, records));
  assert.deepEqual(getCurrencyTotals(records), [{ currency: 'USD', total: '220.00', count: 2 }]);
});
test('stale missing/ambiguous field issues disappear after correction; invalid edits still fail', () => {
  const extractionIssues = [{ code: 'missing_field', severity: 'warning', message: 'Old missing total', field: 'total' },
    { code: 'conflicting_currency', severity: 'warning', message: 'Old currency ambiguity', field: 'currency' }];
  const value = record({ extractionIssues });
  assert(!has(validateInvoice(value, [value]), 'missing_field'));
  assert(!has(validateInvoice(value, [value]), 'conflicting_currency'));
  const invalid = { ...value, reviewed: true, fields: { ...value.fields, total: 'invalid' } };
  assert(!canReview(invalid, [invalid]));
  assert.deepEqual(getCurrencyTotals([invalid]), []);
  assert.equal(invalid.reviewed, true, 'The UI, not the pure core, resets reviewed on changes');
});
test('supplier suggestion remains only while the current value matches its evidence', () => {
  const value = record({ evidence: { vendor: { lineId: 'header', page: 1, text: 'Acme Labs LLC', method: 'header' } },
    extractionIssues: [{ code: 'supplier_suggested', severity: 'warning', message: 'Suggestion', field: 'vendor' }] });
  assert(has(validateInvoice(value, [value]), 'supplier_suggested'));
  const changed = { ...value, fields: { ...value.fields, vendor: 'Corrected Supplier LLC' } };
  assert(!has(validateInvoice(changed, [changed]), 'supplier_suggested'));
});
test('warnings permit canReview but not aggregation without reviewed', () => {
  const value = record({ fields: { total: '120' } });
  assert(has(validateInvoice(value, [value]), 'arithmetic_mismatch'));
  assert(canReview(value, [value]));
  assert.deepEqual(getCurrencyTotals([value]), []);
});
test('currency totals are separate, sorted, exact and padded to currency precision', () => {
  const records = [
    record({ reviewed: true, fields: { currency: 'USD', subtotal: '', tax: '', total: '0.1' } }),
    record({ reviewed: true, fields: { currency: 'USD', subtotal: '', tax: '', total: '0.2' } }),
    record({ reviewed: true, fields: { currency: 'EUR', total: '50' } }),
    record({ reviewed: true, fields: { currency: 'JPY', total: '12' } }),
    record({ reviewed: true, fields: { currency: 'KWD', total: '1.001' } }),
    record({ reviewed: true, fields: { currency: 'KWD', total: '2.002' } }),
  ];
  assert.deepEqual(getCurrencyTotals(deepFreeze(records)), [
    { currency: 'EUR', total: '50.00', count: 1 }, { currency: 'JPY', total: '12', count: 1 },
    { currency: 'KWD', total: '3.003', count: 2 }, { currency: 'USD', total: '0.30', count: 2 },
  ]);
});
test('totals ignore excluded/unreviewed/not-ready/invalid/unsupported records', () => {
  const records = [record({ reviewed: true }), record(), record({ reviewed: true, included: false }),
    record({ reviewed: true, status: 'failed' }), record({ reviewed: true, kind: 'credit-note' }),
    record({ reviewed: true, kind: 'multiple' }), record({ reviewed: true, fields: { currency: '$' } }),
    record({ reviewed: true, fields: { invoiceDate: '' } }), record({ reviewed: true, fields: { total: '-1' } })];
  assert.deepEqual(getCurrencyTotals(records), [{ currency: 'USD', total: '110.00', count: 1 }]);
});
test('large batch sum can exceed single-invoice bounds without rounding', () => {
  const records = Array.from({ length: 20 }, () => record({ reviewed: true, fields: { currency: 'KWD', total: '999999999999.999' } }));
  assert.deepEqual(getCurrencyTotals(records), [{ currency: 'KWD', total: '19999999999999.980', count: 20 }]);
});
test('empty and zero totals behave correctly', () => {
  assert.deepEqual(getCurrencyTotals([]), []);
  const value = record({ reviewed: true, fields: { subtotal: '0', tax: '0', total: '0' } });
  assert.deepEqual(getCurrencyTotals([value]), [{ currency: 'USD', total: '0.00', count: 1 }]);
});

console.log(`${failed ? 'FAIL' : 'PASS'}: ${passed}/${passed + failed} invoice-core tests; ${failed} failed. Includes isolated strict ES2017 typecheck.`);
if (failed) process.exitCode = 1;