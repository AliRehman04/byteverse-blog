import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import writeExcelFile from 'write-excel-file/universal';
import readExcelFile from 'read-excel-file/universal';
import { strFromU8, unzipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const modulePaths = ['types', 'parser', 'validation', 'export', 'review-state']
  .map(name => resolve(root, `src/lib/invoice/${name}.ts`));
const allowed = new Set(modulePaths);
const cache = new Map();
const compilerOptions = {
  target: ts.ScriptTarget.ES2017,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
  types: [], strict: true, skipLibCheck: true, noEmit: true, esModuleInterop: true, isolatedModules: true,
};

function load(path) {
  const absolutePath = resolve(root, path);
  assert(allowed.has(absolutePath), 'Only the five trusted invoice modules may be transpiled');
  if (cache.has(absolutePath)) return cache.get(absolutePath).exports;
  const loaded = { exports: {} };
  cache.set(absolutePath, loaded);
  const compiled = ts.transpileModule(readFileSync(absolutePath, 'utf8'), {
    compilerOptions: { ...compilerOptions, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, noEmit: false },
    fileName: absolutePath, reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  function localRequire(specifier) {
    if (specifier === 'write-excel-file/universal') {
      assert.equal(absolutePath, resolve(root, 'src/lib/invoice/export.ts'));
      return { __esModule: true, default: writeExcelFile };
    }
    assert(specifier.startsWith('.'), `Disallowed invoice dependency: ${specifier}`);
    return load(resolve(dirname(absolutePath), `${specifier}.ts`));
  }
  // Trusted source only, with a fixed import allowlist; compilation emits nothing to disk.
  new Function('require', 'module', 'exports', compiled.outputText)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

const { INVOICE_FIELDS } = load('src/lib/invoice/types.ts');
const { extractInvoice } = load('src/lib/invoice/parser.ts');
const { canReview, validateInvoice, getCurrencyTotals } = load('src/lib/invoice/validation.ts');
const { exportableInvoices, buildInvoiceWorkbook, createInvoiceWorkbook, buildInvoiceCsv, INVOICE_CSV_NOTES } = load('src/lib/invoice/export.ts');
const { reconcileReviews, reviewKey } = load('src/lib/invoice/review-state.ts');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const HEADERS = ['Supplier', 'Invoice number', 'Invoice date', 'Currency', 'Subtotal', 'Tax', 'Discount', 'Shipping', 'Invoice total', 'Source file', 'Source page(s)', 'Review notes'];
let sequence = 0;

function record(overrides = {}) {
  const number = ++sequence;
  const { fields = {}, ...rest } = overrides;
  return {
    id: `synthetic-${number}`, fileName: `synthetic-${number}.pdf`, fileHash: `synthetic-hash-${number}`,
    fileSize: 1000, pageCount: 3, lines: [], evidence: {}, extractionIssues: [],
    fields: { vendor: 'Synthetic Labs LLC', invoiceNumber: `INV-${number}`, invoiceDate: '2026-10-03', currency: 'USD',
      subtotal: '100', tax: '10', discount: '', shipping: '', total: '110', ...fields },
    status: 'ready', kind: 'invoice', included: true, reviewed: true, ...rest,
  };
}
function change(value, overrides) {
  const { fields, ...rest } = overrides;
  return { ...value, ...rest, fields: { ...value.fields, ...fields } };
}
function moneyRecord(currency, total) {
  return record({ fields: { currency, total, subtotal: '', tax: '' } });
}
function evidence(page, text = 'Synthetic source', method = 'label') {
  return { lineId: `synthetic-p${page}`, page, text, method };
}
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
const values = row => row.map(cell => cell === null ? null : cell.value);
const hasIssue = (value, records, code) => validateInvoice(value, records).some(issue => issue.code === code);
const rowFrom = records => buildInvoiceWorkbook(records)[0].data[1];

// Independent quote-aware CSV reader: verify CRLF outside cells while retaining embedded line breaks.
function parseCsv(csv, delimiter = ',') {
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  const rows = [];
  let index = 1;
  while (index < csv.length) {
    const row = [];
    for (;;) {
      assert.equal(csv[index++], '"', 'Every exported cell must be quoted');
      let value = '';
      let closed = false;
      while (index < csv.length) {
        const character = csv[index++];
        if (character !== '"') value += character;
        else if (csv[index] === '"') { value += '"'; index++; }
        else { closed = true; break; }
      }
      assert(closed, 'Unclosed CSV cell');
      row.push(value);
      if (csv[index] === delimiter) { index++; continue; }
      assert.equal(csv.slice(index, index + 2), '\r\n', 'Rows must terminate with CRLF');
      index += 2;
      break;
    }
    rows.push(row);
  }
  return rows;
}

async function inspectWorkbook(records) {
  const blob = await createInvoiceWorkbook(records);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const files = unzipSync(bytes);
  const sheets = await readExcelFile(blob, { trim: false });
  return { blob, bytes, files, sheets, xml: path => strFromU8(files[path]) };
}

test('isolated strict ES2017/bundler typecheck, without Next or emitted files', () => {
  const program = ts.createProgram(modulePaths, compilerOptions);
  const errors = ts.getPreEmitDiagnostics(program).filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(item => {
    const point = item.file && item.start !== undefined ? item.file.getLineAndCharacterOfPosition(item.start) : null;
    return `${item.file?.fileName ?? ''}${point ? `:${point.line + 1}` : ''} ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`;
  }).join('\n'));
});
test('helpers have no runtime environment, network, storage, download or Node dependencies', () => {
  const forbidden = new Set(['window', 'document', 'navigator', 'process', 'fetch', 'localStorage', 'sessionStorage',
    'XMLHttpRequest', 'WebSocket', 'Worker', 'createObjectURL', 'toFile', 'toBuffer', 'toStream']);
  for (const name of ['export', 'review-state']) {
    const path = resolve(root, `src/lib/invoice/${name}.ts`);
    const ast = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.ES2017, true);
    function inspect(node) {
      if (ts.isIdentifier(node)) assert(!forbidden.has(node.text), `Unexpected runtime identifier: ${node.text}`);
      if (ts.isImportDeclaration(node)) {
        assert(['./types', './validation', 'write-excel-file/universal'].includes(node.moduleSpecifier.text));
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        assert.equal(name, 'export');
        assert.equal(node.arguments[0].text, 'write-excel-file/universal');
      }
      ts.forEachChild(node, inspect);
    }
    inspect(ast);
  }
});
test('only included, explicitly reviewed, ready and valid records are exportable', () => {
  const good = record();
  const records = deepFreeze([good, record({ reviewed: false }), record({ included: false }),
    record({ status: 'failed' }), record({ kind: 'credit-note' }), record({ fields: { total: '-1' } })]);
  const selected = exportableInvoices(records);
  assert.deepEqual(selected, [good]);
  assert.notEqual(selected, records);
  assert.equal(buildInvoiceWorkbook(records)[0].data.length, 2);
  assert.equal(parseCsv(buildInvoiceCsv(records)).length, 2);
});
for (const status of ['queued', 'processing', 'failed', 'cancelled']) {
  test(`${status} cannot export even with incoming reviewed=true`, () => {
    assert.deepEqual(exportableInvoices([record({ status })]), []);
  });
}
for (const total of ['', '-1', '-0', 'NaN', 'Infinity', '1e3', '1.00', '1.001', '=1+1', '1000000000000']) {
  test(`invalid USD total ${JSON.stringify(total)} is recomputed at export`, () => {
    const value = record({ fields: { total } });
    assert.deepEqual(exportableInvoices([value]), []);
    assert.throws(() => buildInvoiceWorkbook([value]), /No exportable invoices/);
    assert.throws(() => buildInvoiceCsv([value]), /No exportable invoices/);
  });
}
for (const field of ['subtotal', 'tax', 'discount', 'shipping']) {
  test(`negative ${field} never becomes a CSV numeric or formula cell`, () => {
    assert.deepEqual(exportableInvoices([record({ fields: { [field]: '-1' } })]), []);
  });
}
test('all builders reject no rows; filtering alone returns an empty array', async () => {
  for (const records of [[], [record({ reviewed: false })], [record({ included: false })]]) {
    assert.deepEqual(exportableInvoices(records), []);
    assert.throws(() => buildInvoiceWorkbook(records), /No exportable invoices/);
    assert.throws(() => buildInvoiceCsv(records), /No exportable invoices/);
    await assert.rejects(createInvoiceWorkbook(records), /No exportable invoices/);
  }
});
test('document safety errors cannot be bypassed by kind or review flags', () => {
  for (const code of ['multiple_invoices', 'credit_note']) {
    const value = record({ extractionIssues: [{ code, severity: 'warning', field: 'total', message: 'Synthetic blocked source' }] });
    assert.deepEqual(exportableInvoices([value]), []);
  }
});
test('parser output still needs explicit review before any export', () => {
  const texts = ['Supplier: Synthetic Labs LLC', 'Invoice No: 000042', 'Invoice Date: 2026-10-03',
    'Subtotal USD 100.00', 'Tax USD 10.00', 'Grand Total USD 110.00'];
  const lines = texts.map((text, index) => ({ id: `synthetic-${index}`, text, page: 1, x: 40, y: 20 + index * 20, height: 12 }));
  const result = extractInvoice(lines, { numberFormat: 'auto', dateOrder: 'auto' });
  const value = record({ ...result, extractionIssues: result.issues, lines, reviewed: false });
  assert(canReview(value, [value]));
  assert.deepEqual(exportableInvoices([value]), []);
  assert.equal(rowFrom([{ ...value, reviewed: true }])[1].value, '000042');
});
test('workbook uses the v4 three-sheet shape, readable widths and frozen styled headers', () => {
  const sheets = buildInvoiceWorkbook([record()]);
  assert.deepEqual(sheets.map(sheet => sheet.sheet), ['Invoices', 'Currency totals', 'Review notes']);
  assert.deepEqual(values(sheets[0].data[0]), HEADERS);
  for (const sheet of sheets) {
    assert.equal(sheet.stickyRowsCount, 1);
    assert.equal(sheet.columns.length, sheet.data[0].length);
    assert(sheet.columns.every(column => column.width >= 12));
    for (const cell of sheet.data[0]) {
      assert.equal(cell.type, String);
      assert.equal(cell.fontWeight, 'bold');
      assert.equal(cell.textColor, '#FFFFFF');
      assert(['#0F172A', '#0F766E'].includes(cell.backgroundColor));
    }
  }
});
test('every nonblank cell has an explicit String or Number type, with no inferred dates/formulas', () => {
  for (const sheet of buildInvoiceWorkbook([record({ sample: true })])) {
    for (const row of sheet.data) for (const cell of row) {
      if (cell === null) continue;
      assert.equal(cell.type, typeof cell.value === 'string' ? String : Number);
      if (typeof cell.value === 'string') assert.equal(cell.format, '@');
      else assert(Number.isFinite(cell.value));
    }
  }
});
test('optional amounts remain blank; known zero remains a numeric zero', () => {
  const blank = rowFrom([record({ fields: { subtotal: '', tax: '', discount: '', shipping: '' } })]);
  assert.deepEqual(blank.slice(4, 8), [null, null, null, null]);
  const zero = rowFrom([record({ fields: { subtotal: '0', tax: '0', discount: '0', shipping: '0', total: '0' } })]);
  assert.deepEqual(zero.slice(4, 9).map(cell => [cell.type, cell.value]), Array.from({ length: 5 }, () => [Number, 0]));
});
test('supported 15-significant-digit money is numeric, not rounded or forced to text', () => {
  const row = rowFrom([moneyRecord('KWD', '999999999999.999')]);
  assert.equal(row[8].type, Number);
  assert.equal(String(row[8].value), '999999999999.999');
  assert.equal(row[8].format, '0.000');
});
test('source pages are deduplicated and numerically sorted from evidence, never invented from pageCount', () => {
  const value = record({ pageCount: 15, evidence: { total: evidence(10), vendor: evidence(2), tax: evidence(2), invoiceDate: evidence(1) } });
  assert.equal(rowFrom([value])[10].value, '1, 2, 10');
  assert.equal(rowFrom([record({ pageCount: 15 })])[10].value, '');
});
test('notes include current warnings and precise field evidence instead of obsolete extraction errors', () => {
  const value = record({ fields: { total: '120' }, evidence: { total: evidence(3, 'Invoice total USD 120.00'), vendor: evidence(1) },
    extractionIssues: [{ code: 'missing_field', severity: 'warning', field: 'total', message: 'Obsolete total warning' }] });
  const issues = validateInvoice(value, [value]);
  const mismatch = issues.find(issue => issue.code === 'arithmetic_mismatch');
  assert(mismatch);
  const sheets = buildInvoiceWorkbook([value]);
  assert(sheets[0].data[1][11].value.includes(mismatch.message));
  assert(!sheets[0].data[1][11].value.includes('Obsolete'));
  const note = values(sheets[2].data[1]);
  assert.deepEqual(note.slice(0, 9), [value.id, value.fields.vendor, value.fields.invoiceNumber, value.fileName, '3',
    'warning', 'arithmetic_mismatch', 'Invoice total', mismatch.message]);
  assert(note[9].includes('p3 / synthetic-p3 (label)'));
  assert.equal(note[10], 'Invoice total USD 120.00');
});
test('duplicate warnings use the entire batch, even if the other ready record is unreviewed', () => {
  const a = record();
  const b = record({ fileHash: a.fileHash, reviewed: false });
  const sheets = buildInvoiceWorkbook([a, b]);
  assert.equal(sheets[0].data.length, 2);
  assert(sheets[0].data[1][11].value.includes('duplicate_invoice'));
  assert.equal(sheets[2].data[1][6].value, 'duplicate_invoice');
  assert.equal(sheets[1].data[1][1].value, 1);
});
test('acknowledged warnings do not become errors or get silently removed', () => {
  const value = record({ fields: { total: '120' } });
  assert(hasIssue(value, [value], 'arithmetic_mismatch'));
  assert.deepEqual(exportableInvoices([value]), [value]);
  assert.deepEqual(exportableInvoices([{ ...value, reviewed: false }]), []);
});
test('sample invoices are explicitly labelled synthetic in both invoice and review rows', () => {
  const sheets = buildInvoiceWorkbook([record({ sample: true })]);
  assert.match(sheets[0].data[1][11].value, /Synthetic sample invoice; not a real transaction/);
  assert.equal(sheets[2].data[1][6].value, 'synthetic_sample');
});
test('pure export builders do not modify frozen input records or nested evidence', () => {
  const records = deepFreeze([record({ evidence: { vendor: evidence(2) }, sample: true })]);
  const before = JSON.stringify(records);
  exportableInvoices(records);
  buildInvoiceWorkbook(records);
  buildInvoiceCsv(records);
  assert.equal(JSON.stringify(records), before);
});

const formula = '=HYPERLINK("https://example.invalid/","synthetic")';
const fixtureRecords = deepFreeze([
  record({ id: '=1+1', fileName: `  ＝1+1;"synthetic"\npage.pdf`, fields: { vendor: formula, invoiceNumber: '00000123' }, sample: true,
    evidence: { total: evidence(3, formula), vendor: evidence(2, formula), invoiceNumber: evidence(1, '00000123') },
    extractionIssues: [{ code: 'synthetic_check', severity: 'warning', field: 'total', message: 'Ignored filled-field issue' },
      { code: 'source_check', severity: 'warning', message: formula }] }),
  ...['+1+1', '-1+1', '@SUM(1,1)', '＝1+1', '＋1+1', '－1+1', '＠SUM(1,1)'].map(payload =>
    record({ fields: { vendor: payload, invoiceNumber: payload }, fileName: `${payload}.pdf` })),
  moneyRecord('USD', '0.1'), moneyRecord('USD', '0.2'), moneyRecord('EUR', '7.5'),
  moneyRecord('JPY', '12'), moneyRecord('KWD', '1.001'), moneyRecord('KWD', '2.002'),
]);
let fixture;
const workbook = () => fixture ??= inspectWorkbook(fixtureRecords);
test('real universal writer returns an XLSX MIME Blob containing a readable ZIP', async () => {
  const { blob, bytes, files, sheets } = await workbook();
  assert(blob instanceof Blob);
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4B, 0x03, 0x04]);
  assert(files['[Content_Types].xml']);
  assert(files['xl/workbook.xml']);
  assert.deepEqual(sheets.map(sheet => sheet.sheet), ['Invoices', 'Currency totals', 'Review notes']);
});
test('independent XLSX reader preserves leading-zero IDs, ISO date strings, numeric money and blanks', async () => {
  const { sheets } = await workbook();
  assert.deepEqual(sheets[0].data[0], HEADERS);
  const row = sheets[0].data[1];
  assert.equal(row[1], '00000123');
  assert.equal(typeof row[1], 'string');
  assert.equal(row[2], '2026-10-03');
  assert.equal(typeof row[2], 'string');
  assert.equal(row[4], 100);
  assert.equal(row[5], 10);
  assert.equal(row[6], null);
  assert.equal(row[7], null);
  assert.equal(row[8], 110);
  assert.equal(row[10], '1, 2, 3');
});
test('XLSX keeps exact formula-like text without CSV tab prefixes or executable formulas', async () => {
  const { sheets } = await workbook();
  for (const [index, source] of fixtureRecords.entries()) {
    const row = sheets[0].data[index + 1];
    assert.equal(row[0], source.fields.vendor);
    assert.equal(row[1], source.fields.invoiceNumber);
    assert.equal(row[9], source.fileName);
  }
  const note = sheets[2].data.find(row => row[6] === 'source_check');
  assert.equal(note[0], '=1+1');
  assert.equal(note[8], formula);
  assert(note[10].includes(formula));
});
test('every zipped XML part is formula-free and contains no external links, hyperlinks, images or remote relationships', async () => {
  const { files } = await workbook();
  for (const [path, content] of Object.entries(files)) {
    assert(!/externalLinks|\/media\/|\/drawings\//i.test(path), path);
    if (!/\.(?:xml|rels)$/.test(path)) continue;
    const xml = strFromU8(content);
    assert(!/<(?:[\w.-]+:)?f(?:\s|\/?>)/i.test(xml), `Formula element in ${path}`);
    assert(!/<(?:[\w.-]+:)?(?:externalLink|externalReference|hyperlink|drawing)(?:\s|\/?>)/i.test(xml), `External resource in ${path}`);
    assert(!/TargetMode\s*=\s*["']External["']/i.test(xml), `External relationship in ${path}`);
  }
});
test('actual XLSX XML includes frozen first rows, explicit text/number cells, widths and navy/teal/white styles', async () => {
  const { xml } = await workbook();
  for (let index = 1; index <= 3; index++) {
    const sheet = xml(`xl/worksheets/sheet${index}.xml`);
    assert.match(sheet, /<pane\b[^>]*ySplit="1"[^>]*state="frozen"/);
    assert.match(sheet, /<col\b[^>]*width="/);
  }
  assert.match(xml('xl/worksheets/sheet1.xml'), /<c\b[^>]*r="B2"[^>]*t="(?:s|inlineStr)"/);
  const numericCell = xml('xl/worksheets/sheet1.xml').match(/<c\b[^>]*r="I2"[^>]*>/)?.[0];
  assert(numericCell, 'Invoice total cell is present');
  // OOXML defaults to numeric when the optional t attribute is omitted.
  const numericType = numericCell.match(/\bt="([^"]+)"/)?.[1];
  assert(numericType === undefined || numericType === 'n', 'Invoice total is an OOXML numeric cell');
  const styles = xml('xl/styles.xml');
  for (const color of ['0F172A', '0F766E', 'FFFFFF']) assert(styles.includes(color));
});
test('independent reader sees exact per-currency summaries, not a mixed-currency grand total', async () => {
  const { sheets } = await workbook();
  const expected = getCurrencyTotals(fixtureRecords);
  const actual = sheets[1].data.slice(1);
  assert.equal(actual.length, expected.length);
  assert.deepEqual(actual.map(row => row.slice(0, 3)), expected.map(item => [item.currency, item.count, Number(item.total)]));
  assert.equal(actual.find(row => row[0] === 'KWD')[2], 3.003);
});
test('decimal summary uses exact core addition rather than 0.1 + 0.2 floating-point addition', async () => {
  const { sheets } = await inspectWorkbook([moneyRecord('USD', '0.1'), moneyRecord('USD', '0.2')]);
  assert.deepEqual(sheets[1].data[1].slice(0, 3), ['USD', 2, 0.3]);
});
test('huge exact currency sum stays a String with a precision note in both builder and real XLSX', async () => {
  const records = deepFreeze(Array.from({ length: 20 }, () => moneyRecord('KWD', '999999999999.999')));
  const total = '19999999999999.980';
  assert.equal(getCurrencyTotals(records)[0].total, total);
  const built = buildInvoiceWorkbook(records)[1].data[1];
  assert.equal(built[2].type, String);
  assert.equal(built[2].value, total);
  assert.match(built[3].value, /15-significant-digit/);
  const { sheets } = await inspectWorkbook(records);
  assert.equal(sheets[0].data[1][8], Number('999999999999.999'));
  assert.equal(sheets[1].data[1][2], total);
  assert.equal(typeof sheets[1].data[1][2], 'string');
  assert.match(sheets[1].data[1][3], /Exact total stored as text/);
});
test('known zero and unknown optional fields also round-trip independently', async () => {
  const { sheets } = await inspectWorkbook([record({ fields: { subtotal: '', tax: '0', discount: '', shipping: '0', total: '0' } })]);
  assert.deepEqual(sheets[0].data[1].slice(4, 9), [null, 0, null, 0, 0]);
});

for (const delimiter of [',', ';']) {
  test(`CSV ${delimiter} delimiter, UTF-8 BOM, CRLF, quotes and embedded newlines round-trip`, () => {
    const fileName = 'synthetic,semi;"quotes"\r\nsecond\nthird.pdf';
    const message = 'Verify "quoted", semicolon;\nand another line.';
    const value = record({ fileName, fields: { vendor: 'Synthetic, "Labs"; Ltd', invoiceNumber: '000042', subtotal: '', tax: '' },
      extractionIssues: [{ code: 'source_check', severity: 'warning', message }] });
    const csv = buildInvoiceCsv([value], delimiter);
    assert.deepEqual([...Buffer.from(csv, 'utf8').subarray(0, 3)], [0xEF, 0xBB, 0xBF]);
    assert(csv.endsWith('\r\n'));
    assert(!csv.startsWith('\uFEFFsep='));
    const rows = parseCsv(csv, delimiter);
    assert.deepEqual(rows[0], HEADERS);
    assert.equal(rows.length, 2);
    assert(rows.every(row => row.length === 12));
    assert.equal(rows[1][0], value.fields.vendor);
    assert.equal(rows[1][1], '000042');
    assert.deepEqual(rows[1].slice(4, 8), ['', '', '', '']);
    assert.equal(rows[1][8], '110');
    assert.equal(rows[1][9], fileName);
    assert(rows[1][11].includes(message));
    assert(!rows.some(row => row[0] === 'Currency totals'));
  });
}
const unsafeCsvText = ['=1+1', '+1+1', '-1', '@SUM(1,1)', '   =1+1', '\t+1+1', '\r\n-1+1',
  '\u00A0\u3000＝1+1', '\u200B＠SUM(1,1)', ' \uFEFF＋1+1', '\u2066−1+1', '\uFE0F=1+1', '\u0000=1+1',
  '﹢1+1', '﹣1+1', '－1+1', '⁺1+1', '⁻1+1'];
for (const payload of unsafeCsvText) {
  test(`CSV neutralizes leading operator after Unicode/whitespace folding: ${JSON.stringify(payload)}`, () => {
    const value = deepFreeze(record({ fileName: payload }));
    for (const delimiter of [',', ';']) assert.equal(parseCsv(buildInvoiceCsv([value], delimiter), delimiter)[1][9], `\t${payload}`);
    assert.equal(value.fileName, payload);
  });
}
test('CSV defends formula-like supplier/ID text separately from validated numeric cells', () => {
  const value = record({ fields: { vendor: '+SUM(1,1)', invoiceNumber: '-12.5', subtotal: '0', tax: '0', total: '0' } });
  const row = parseCsv(buildInvoiceCsv([value]))[1];
  assert.equal(row[0], '\t+SUM(1,1)');
  assert.equal(row[1], '\t-12.5');
  assert.equal(row[4], '0');
  assert.equal(row[8], '0');
});
test('CSV harmless Unicode, leading spaces and embedded operators are not rewritten', () => {
  const value = record({ fileName: '  résumé + bill = 1.pdf', fields: { vendor: 'Café + Sons', invoiceNumber: '00000001' } });
  const row = parseCsv(buildInvoiceCsv([value]))[1];
  assert.equal(row[0], 'Café + Sons');
  assert.equal(row[1], '00000001');
  assert.equal(row[9], value.fileName);
});
test('CSV default delimiter is comma and unexpected delimiters are rejected at runtime', () => {
  const records = [record()];
  assert.equal(buildInvoiceCsv(records), buildInvoiceCsv(records, ','));
  for (const delimiter of ['\t', '|', '\n', 'sep=;']) assert.throws(() => buildInvoiceCsv(records, delimiter), /delimiter/);
});
test('CSV caveats are available separately for the caller UI, with no leading-zero or universal injection guarantees', () => {
  assert(Object.isFrozen(INVOICE_CSV_NOTES));
  assert.match(INVOICE_CSV_NOTES.scope, /only Invoices/);
  assert.match(INVOICE_CSV_NOTES.identifiers, /Choose XLSX.*leading zeros/);
  assert.match(INVOICE_CSV_NOTES.formulaDefense, /tab/);
  assert.match(INVOICE_CSV_NOTES.formulaDefense, /strip.*re-saving/);
});

test('new records always begin unreviewed, even if incoming reviewed is true', () => {
  const next = [record(), record({ reviewed: false }), record({ status: 'failed' })];
  assert.deepEqual(reconcileReviews([], next).map(value => value.reviewed), [false, false, false]);
});
test('reconciliation cannot promote an unreviewed record or undo explicit unreview', () => {
  const before = record({ reviewed: false });
  assert.equal(reconcileReviews([before], [{ ...before, reviewed: true }])[0].reviewed, false);
  const reviewed = { ...before, reviewed: true };
  assert.equal(reconcileReviews([reviewed], [{ ...reviewed, reviewed: false }])[0].reviewed, false);
});
test('unchanged reviewed records survive; both inputs and nested data remain unmodified', () => {
  const before = deepFreeze([record({ evidence: { vendor: evidence(2) } })]);
  const next = deepFreeze([change(before[0], {})]);
  const snapshots = [JSON.stringify(before), JSON.stringify(next)];
  const output = reconcileReviews(before, next);
  assert.equal(output[0].reviewed, true);
  assert.notEqual(output, next);
  assert.notEqual(output[0], next[0]);
  assert.deepEqual([JSON.stringify(before), JSON.stringify(next)], snapshots);
});
const editedFields = { vendor: 'Other Synthetic LLC', invoiceNumber: 'DIFFERENT', invoiceDate: '2026-10-04', currency: 'EUR',
  subtotal: '101', tax: '11', discount: '1', shipping: '1', total: '111' };
for (const field of INVOICE_FIELDS) {
  test(`editing ${field} invalidates review`, () => {
    const before = record();
    const next = change(before, { fields: { [field]: editedFields[field] } });
    assert.notEqual(reviewKey(before, [before]), reviewKey(next, [next]));
    assert.equal(reconcileReviews([before], [next])[0].reviewed, false);
  });
}
for (const [key, value] of Object.entries({ lineId: 'other-line', page: 2, text: 'Changed source', method: 'manual' })) {
  test(`evidence ${key} changes invalidate review without a field change`, () => {
    const before = record({ evidence: { total: evidence(1) } });
    const next = change(before, { evidence: { total: { ...before.evidence.total, [key]: value } } });
    assert.equal(reconcileReviews([before], [next])[0].reviewed, false);
  });
}
test('adding or removing evidence invalidates review', () => {
  const before = record({ evidence: { total: evidence(1) } });
  for (const nextEvidence of [{}, { ...before.evidence, vendor: evidence(2) }]) {
    assert.equal(reconcileReviews([before], [change(before, { evidence: nextEvidence })])[0].reviewed, false);
  }
});
for (const [key, value] of Object.entries({ fileHash: 'different-raw-file-hash', fileName: 'replacement.pdf', fileSize: 2000, pageCount: 4, sample: true, id: 'new-record-id', kind: 'unknown' })) {
  test(`${key} change invalidates review even with identical extracted fields`, () => {
    const before = record();
    const next = change(before, { [key]: value });
    assert.equal(reconcileReviews([before], [next])[0].reviewed, false);
  });
}
for (const status of ['queued', 'processing', 'failed', 'cancelled']) {
  test(`transition to or from ${status} cannot preserve review`, () => {
    const before = record();
    const changed = change(before, { status });
    assert.equal(reconcileReviews([before], [changed])[0].reviewed, false);
    assert.equal(reconcileReviews([changed], [before])[0].reviewed, false);
  });
}
test('include/exclude toggles invalidate review in both directions', () => {
  for (const included of [true, false]) {
    const before = record({ included });
    assert.equal(reconcileReviews([before], [change(before, { included: !included })])[0].reviewed, false);
  }
});
test('an unchanged invalid record never retains a stale review flag', () => {
  for (const overrides of [{ fields: { total: '-1' } }, { kind: 'multiple' }, { kind: 'credit-note' }]) {
    const before = record(overrides);
    assert.equal(reconcileReviews([before], [change(before, {})])[0].reviewed, false);
  }
});
for (const duplicateBy of ['fileHash', 'identity']) {
  test(`a new duplicate by ${duplicateBy} invalidates the existing review and rejects incoming review`, () => {
    const before = record();
    const duplicate = duplicateBy === 'fileHash' ? record({ fileHash: before.fileHash }) : record({ fields: {
      vendor: before.fields.vendor.toLowerCase(), invoiceNumber: before.fields.invoiceNumber.toLowerCase(), currency: before.fields.currency } });
    const next = [change(before, {}), duplicate];
    assert(hasIssue(next[0], next, 'duplicate_invoice'));
    assert.notEqual(reviewKey(before, [before]), reviewKey(next[0], next));
    const output = reconcileReviews([before], next);
    assert.deepEqual(output.map(value => value.reviewed), [false, false]);
    assert.deepEqual(exportableInvoices(output), []);
  });
}
for (const overrides of [{ included: false }, { status: 'failed' }, { status: 'queued' }, { status: 'processing' }, { status: 'cancelled' }]) {
  test(`excluded/nonready records do not create a duplicate or invalidate an unrelated review: ${JSON.stringify(overrides)}`, () => {
    const before = record();
    const other = record({ fileHash: before.fileHash, ...overrides });
    const next = [change(before, {}), other];
    assert(!hasIssue(next[0], next, 'duplicate_invoice'));
    assert.equal(reviewKey(before, [before]), reviewKey(next[0], next));
    assert.deepEqual(reconcileReviews([before], next).map(value => value.reviewed), [true, false]);
  });
}
test('removing a duplicate warning invalidates its previously acknowledged review', () => {
  const a = record();
  const b = record({ fileHash: a.fileHash });
  assert(hasIssue(a, [a, b], 'duplicate_invoice'));
  assert.equal(reconcileReviews([a, b], [change(a, {})])[0].reviewed, false);
  for (const overrides of [{ included: false }, { status: 'failed' }, { fileHash: 'different' }]) {
    assert.equal(reconcileReviews([a, b], [change(a, {}), change(b, overrides)])[0].reviewed, false);
  }
});
test('changing another invoice into a duplicate resets only affected records', () => {
  const a = record();
  const b = record();
  const c = record();
  const output = reconcileReviews([a, b, c], [change(a, {}), change(b, { fileHash: a.fileHash }), change(c, {})]);
  assert.deepEqual(output.map(value => value.reviewed), [false, false, true]);
  assert.deepEqual(exportableInvoices(output).map(value => value.id), [c.id]);
});
test('an unrelated edit/addition/deletion does not reset the unaffected invoice', () => {
  const a = record();
  const b = record();
  const next = [change(a, {}), change(b, { fields: { total: '120' } }), record()];
  assert.equal(reviewKey(a, [a, b]), reviewKey(next[0], next));
  assert.deepEqual(reconcileReviews([a, b], next).map(value => value.reviewed), [true, false, false]);
  assert.equal(reconcileReviews([a, b], [change(a, {})])[0].reviewed, true);
});
test('adding, removing and changing arithmetic mismatches invalidate the acknowledged snapshot', () => {
  const clean = record();
  const mismatch = change(clean, { fields: { total: '120' } });
  const different = change(mismatch, { fields: { subtotal: '105' } });
  assert(hasIssue(mismatch, [mismatch], 'arithmetic_mismatch'));
  for (const [before, next] of [[clean, mismatch], [mismatch, clean], [mismatch, different]]) {
    assert.notEqual(reviewKey(before, [before]), reviewKey(next, [next]));
    assert.equal(reconcileReviews([before], [next])[0].reviewed, false);
  }
});
test('issue order, object key order and record order do not alter the stable JSON fingerprint', () => {
  const issues = [{ code: 'z_check', severity: 'warning', message: 'Synthetic Z' }, { code: 'a_check', severity: 'info', message: 'Synthetic A' }];
  const before = record({ extractionIssues: issues, evidence: { total: evidence(3), vendor: evidence(1) } });
  const other = record();
  const reordered = change(before, {
    extractionIssues: [...issues].reverse().map(issue => Object.fromEntries(Object.entries(issue).reverse())),
    evidence: Object.fromEntries(Object.entries(before.evidence).reverse().map(([field, item]) => [field, Object.fromEntries(Object.entries(item).reverse())])),
  });
  reordered.fields = Object.fromEntries(Object.entries(before.fields).reverse());
  assert.equal(reviewKey(before, [before, other]), reviewKey(reordered, [other, reordered]));
  assert.doesNotThrow(() => JSON.parse(reviewKey(before, [before])));
  assert.equal(reconcileReviews([before, other], [change(other, {}), reordered])[1].reviewed, true);
});
for (const replacement of [{ code: 'changed_check' }, { severity: 'info' }, { message: 'A changed warning message' }, { field: 'tax' }]) {
  test(`effective issue changes invalidate acknowledgment: ${JSON.stringify(replacement)}`, () => {
    const issue = { code: 'source_check', severity: 'warning', message: 'Synthetic warning' };
    const before = record({ fields: { tax: '' }, extractionIssues: [issue] });
    const next = change(before, { extractionIssues: [{ ...issue, ...replacement }] });
    assert.notEqual(reviewKey(before, [before]), reviewKey(next, [next]));
    assert.equal(reconcileReviews([before], [next])[0].reviewed, false);
  });
}
test('removed/new effective issues reset review, but irrelevant or deduplicated extraction issues do not', () => {
  const issue = { code: 'source_check', severity: 'warning', message: 'Synthetic warning' };
  const before = record({ extractionIssues: [issue] });
  const cleared = change(before, { extractionIssues: [] });
  assert.equal(reconcileReviews([before], [cleared])[0].reviewed, false);
  assert.equal(reconcileReviews([cleared], [before])[0].reviewed, false);
  const ignored = { code: 'missing_field', severity: 'warning', field: 'total', message: 'Obsolete filled-field error' };
  const same = change(before, { extractionIssues: [issue, { ...issue }, ignored] });
  assert.equal(reviewKey(before, [before]), reviewKey(same, [same]));
  assert.equal(reconcileReviews([before], [same])[0].reviewed, true);
});
test('reviewKey excludes reviewed but explicit marking must bypass reconciliation after validation', () => {
  const before = record({ reviewed: false });
  const acknowledgedKey = reviewKey(before, [before]);
  const marked = { ...before, reviewed: true };
  assert(canReview(before, [before]));
  assert.equal(reviewKey(marked, [marked]), acknowledgedKey);
  assert.deepEqual(exportableInvoices([marked]), [marked]);
  assert.equal(reconcileReviews([before], [marked])[0].reviewed, false);
});
test('stale keys cannot acknowledge edited or replaced source files', () => {
  const before = record({ reviewed: false });
  const key = reviewKey(before, [before]);
  for (const overrides of [{ fields: { vendor: 'Changed Supplier LLC' } }, { fileHash: 'replacement-raw-bytes' }]) {
    const next = change(before, overrides);
    assert.notEqual(reviewKey(next, [next]), key);
  }
});
test('ambiguous/empty record IDs cannot inherit review from a map collision', () => {
  const before = record();
  const repeated = change(before, {});
  assert.deepEqual(reconcileReviews([before], [before, repeated]).map(value => value.reviewed), [false, false]);
  assert.equal(reconcileReviews([before, repeated], [change(before, {})])[0].reviewed, false);
  const empty = record({ id: '' });
  assert.equal(reconcileReviews([empty], [change(empty, {})])[0].reviewed, false);
});
test('restoring old field values after an invalidating edit does not resurrect review', () => {
  const before = record();
  const changed = reconcileReviews([before], [change(before, { fields: { total: '120' } })]);
  const restored = reconcileReviews(changed, [change(changed[0], { fields: before.fields, reviewed: true })]);
  assert.equal(restored[0].reviewed, false);
});

let passed = 0;
let failed = 0;
for (const { name, run } of tests) {
  try { await run(); passed++; }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack ?? error}`); }
}
console.log(`${failed ? 'FAIL' : 'PASS'}: ${passed}/${tests.length} invoice-export/review tests; ${failed} failed. Includes strict typecheck, real XLSX/independent reader/ZIP inspection, CSV and review-state boundaries. Synthetic data only; no output files.`);
if (failed) process.exitCode = 1;