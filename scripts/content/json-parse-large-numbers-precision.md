If **JSON.parse changes the last digits of a large number**, preserve the original JSON text and fix how that number enters JavaScript. For identifiers, the most portable solution is to **send the ID as a JSON string**. If you cannot change the producer, use source-aware handling or a suitable lossless parser on the original text instead of relying on a rounded Number.

Changing an already-rounded value to a string or BigInt does not restore its original digits. Neither does a successful JSON syntax check prove that every number survived intact.

This guide separates three things that often get confused: **the characters in the response, the numeric value stored in memory, and the format used when exporting it again**. The examples use fictional records and were checked in Node.js and desktop Edge; they do not require a real API or customer data.

## See exactly where JSON.parse changes the number

Start with this small reproduction:

```javascript
const source = '{"order_id":9007199254740993}';
const parsed = JSON.parse(source);

console.log(parsed.order_id.toString());
// "9007199254740992"

console.log(BigInt(parsed.order_id) === 9007199254740993n);
// false
```

The source contains an ID ending in **993**. The parsed value ends in **992**. Parsing succeeded, but the identifier changed.

JavaScript's ordinary `Number` uses IEEE 754 double-precision floating point. Its [maximum safe integer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) is `9007199254740991`, or 2 to the power of 53 minus 1. Within the corresponding positive and negative safe range, every integer is representable exactly. Beyond it, not every consecutive integer has a distinct representation.

**Being outside the safe range does not mean every number changes.** For example, `9007199254740992` is exactly representable, but the next integer rounds to that same value. This is why checking only the number of digits is an unreliable rule.

Avoid comparing a parsed ID with another unsafe numeric literal. The literal can round too, making the comparison look correct. Compare with an exact string or a BigInt created from trustworthy source digits instead.

[RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) defines JSON number syntax and permits implementations to limit accepted range and precision. Valid JSON therefore does not imply an exact JavaScript `Number` representation.

## Separate lost value from changed formatting

The following results were reproduced with ordinary parsing. The source-token column contains text, not JavaScript number literals.

| Original JSON number token | Ordinary parsed display | What happened |
| --- | --- | --- |
| `9007199254740991` | `9007199254740991` | Safe integer boundary; unchanged |
| `9007199254740992` | `9007199254740992` | Exactly represented, but outside the safe-integer range |
| `9007199254740993` | `9007199254740992` | Integer value changed |
| `-9007199254740993` | `-9007199254740992` | Negative integer value changed |
| `1.0000000000000001` | `1` | Fractional information disappeared |
| `7.50` | `7.5` | Original spelling changed; the mathematical value is the same |
| `1e400` | `Infinity` | Magnitude exceeded the finite Number range |
| `1e-400` | `0` | Nonzero value underflowed to zero |

`Number.isSafeInteger()` checks the value **after conversion**. It cannot certify the original token. For instance, it returns true for the parsed result of `1.0000000000000001`, because that result is already the integer `1`. It also returns true for the zero produced by the underflow example.

Likewise, comparing the original JSON string with a stringify result is not a complete precision test. Whitespace, property ordering and numeric spellings can change without changing the represented value. Check the fields and exactness requirements that matter to your application.

## First check: keep the response as text

Inspect the original response before running it through a viewer, formatter or SDK that may parse numbers. A pretty object preview can already contain rounded values. For a real service, compare an approved raw-response capture with the value your application receives, without pasting credentials or private records into public tools.

The native [Response.json() method](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) reads and parses the response; its instance method does not accept a reviver. [Response.text()](https://developer.mozilla.org/en-US/docs/Web/API/Response/text) instead gives you the decoded text so you can select the parser yourself.

This self-contained example makes no network request:

```javascript
(async () => {
  const payload = '{"order_id":9007199254740993}';
  const automatic = await new Response(payload).json();
  const original = await new Response(payload).text();

  console.log(automatic.order_id.toString());
  // "9007199254740992"
  console.log(original);
  // '{"order_id":9007199254740993}'
})();
```

In an application, make the same choice at the real response boundary: check the HTTP status, read the body once as text, then apply the intended parsing strategy. If a library automatically parses JSON, configure that boundary according to its documentation. Serializing its already-parsed object is not a way to retrieve the original response.

If the raw response already has the wrong ID, investigate the producer or an earlier intermediary. A different browser parser cannot reconstruct digits that never arrived.

## Best default for IDs: use strings on the wire

An order ID is usually a label, not a quantity. An explicit string contract avoids requiring every consumer to support the same integer range:

```json
{
  "order_id": "9007199254740993",
  "customer_code": "000123",
  "count": 2
}
```

This also preserves leading zeros. An unquoted number token such as `000123` is not valid JSON; a quoted string is.

Make the change **where the original value is still exact**. If the backend has already converted a database ID to an unsafe JavaScript Number, calling `String(id)` merely sends the wrong ID as text. Preserve an exact string or supported integer representation through the database driver, serializer and API response.

Changing an API field from number to string is a contract change. Update client types, validation and consumers together; do not silently break existing integrations. Keep ordinary counts numeric where that matches their schema and validated range.

When arithmetic on a large integer is genuinely required, create [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) from the exact string:

```javascript
const record = JSON.parse('{"sequence":"9007199254740993"}');
const next = BigInt(record.sequence) + 1n;

console.log(next.toString());
// "9007199254740994"
```

BigInt is for integers, not decimal fractions. Converting `7.50` or `1e3` directly from text with `BigInt()` throws, even though `1e3` denotes an integer mathematically. Use a representation and conversion rule appropriate to the field, rather than converting every numeric-looking string.

## Cannot change the API: preserve numeric source tokens

Modern JavaScript engines can supply a third `context` argument to the `JSON.parse` reviver. Its [context.source property](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) contains the original token text for primitive values. The callback's numeric `value` may already be rounded; use the source text rather than converting that value.

For a small import or inspection workflow, this helper deliberately returns **every JSON number as a string**:

```javascript
function parseNumbersAsText(text) {
  if (typeof text !== 'string') throw new TypeError('Pass original JSON text');
  return JSON.parse(text, (_key, value, context) => {
    if (typeof value !== 'number') return value;
    if (typeof context?.source !== 'string') {
      throw new Error('Source-aware JSON parsing unavailable; use a compatible lossless parser');
    }
    return context.source;
  });
}

const fields = parseNumbersAsText(
  '{"order_id":9007199254740993,"count":2,"amount":7.50}'
);
console.log(fields.order_id); // "9007199254740993"
console.log(fields.count);    // "2"
console.log(fields.amount);   // "7.50"
```

The guard is important. An older engine can ignore the extra callback argument. Falling back to `String(value)` in that situation would quietly reintroduce rounding. This helper instead stops when a numeric token lacks source access.

MDN's compatibility table, checked October 14, 2026, lists source-aware revivers in Chrome and Edge 114+, Firefox 135+, Safari 18.4+ and Node.js 21+. These are documented availability floors, **not recommendations to install old runtimes**. Use a maintained release and check the actual browsers, embedded webviews or test runtime you support.

### Know what this helper does not preserve

The helper is not a drop-in, general-purpose lossless JSON data model:

- Counts become strings too. `fields.count + 1` produces `"21"`, not `3`.
- Original numeric tokens and original numeric-looking strings can become indistinguishable in the result. Retain the original text or a typed representation if that distinction matters.
- Stringifying this projection emits quoted strings, not the original numeric tokens.
- JSON whitespace and duplicate members are not preserved. Native parsing's usual duplicate-key behavior still applies.
- It does not perform decimal arithmetic, validate an API schema, reject all unsafe application inputs, or impose production size and depth limits.

Use it only where the downstream code intentionally expects this projection. Convert known fields according to a validated schema; do not guess types from their appearance. Avoid a generic “all keys named id” transformation if different objects use that name for different purposes.

For older environments or a richer numeric data model, consider a maintained library such as [lossless-json](https://github.com/josdejong/lossless-json). Its documentation describes token-preserving numeric wrappers and configurable parsing. Check the exact installed version, duplicate-key policy, serializer and downstream library compatibility. Preserving a token is not the same as making every later arithmetic operation exact.

## False fixes that leave the wrong number intact

The traditional two-argument reviver sees the already-parsed value. So this approach is too late:

```javascript
const result = JSON.parse('{"id":9007199254740993}', (key, value) => {
  return key === 'id' ? BigInt(value) : value;
});

console.log(result.id.toString());
// "9007199254740992" — still wrong
```

`Math.round()`, `parseInt()`, `toFixed()` and converting the result to text cannot invent the discarded digit. Adding an arbitrary correction is not recovery: different original integers can map to the same Number.

Other traps to avoid:

- **Quoting numbers with a regular expression.** JSON includes escaped strings, arrays, negative numbers and exponent notation. A broad replacement is not a JSON tokenizer.
- **Treating TypeScript annotations as runtime conversion.** Declaring a field `bigint` or casting an object does not change how the response was parsed.
- **Using decimal-length heuristics for exactness.** Safe range depends on value, while decimal precision and source formatting are separate requirements.
- **Using a formatting tool as recovery software.** A tool that receives only rounded data has no original digits to restore. Check its numeric handling before trusting a reformatted output.

## Serialize the fixed value deliberately

Native `JSON.stringify()` does not serialize BigInt values by default; it throws a [BigInt serialization TypeError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/BigInt_not_serializable). If your agreed API contract uses strings, an explicit replacer can implement that contract:

```javascript
const output = JSON.stringify(
  { order_id: 9007199254740993n, count: 2 },
  (_key, value) => typeof value === 'bigint' ? value.toString() : value
);

console.log(output);
// '{"order_id":"9007199254740993","count":2}'
```

This sends a JSON string for the ID, not a JSON number. The receiving application needs the same documented expectation. Do not convert the BigInt back to Number just to silence the error.

If a receiving system explicitly requires a numeric token, use a serializer and receiving parser that support that contract. Emitting exact digits alone cannot force another JavaScript client to parse them without rounding. Avoid changing global BigInt serialization behavior merely to fix one request.

## A JSON-to-CSV check before Excel gets involved

There can be more than one conversion boundary. The following fictional sample was checked against the actual engine used by the [ByteVerse JSON to CSV converter](/tools/json-to-csv):

```json
[
  {"order_id":9007199254740993,"amount":7.50},
  {"order_id":"000123","amount":2.00}
]
```

With the root array selected, the engine returned two rows and two columns:

| Path into the converter | First order ID | First amount text | Second order ID |
| --- | --- | --- | --- |
| Original JSON text | `9007199254740993` | `7.50` | `000123` |
| Ordinary parse, then stringify, then conversion | `9007199254740992` | `7.5` | `000123` |

The original-text path preserved the numeric tokens. The second path faithfully exported data that had already changed. Neither result proves how a spreadsheet will interpret the CSV afterward.

The converter's purpose is a text table, not arbitrary-precision arithmetic. It also rejects duplicate JSON keys, unlike the small native helper above. Keep its formula-risk protection enabled for untrusted input, and review warnings rather than assuming any CSV is universally safe.

When opening the export in Excel, [import identifier columns as Text](/blog/excel-csv-leading-zeros-2026) before numeric conversion. CSV quotes and a UTF-8 BOM are not instructions that force Excel to preserve an ID. Test with fictional data; a browser-based workflow is not permission to upload or paste confidential exports anywhere.

## Add a small regression test at the boundary

A good regression test starts with **text fixtures**, so a numeric literal does not become rounded before the test begins. Include:

- The safe boundary, plus one exactly representable integer outside it.
- An adjacent integer that rounds, and a negative counterpart.
- A quoted identifier with leading zeros.
- A decimal such as `1.0000000000000001` that becomes a safe integer after parsing.
- Large and tiny exponents if the API permits them.
- The actual export-and-reimport path used by the next consumer.

Assert against exact strings or BigInts created from exact strings. Test the unsupported-runtime path too: a compatibility failure should not silently switch to a lossy fallback.

If promises and API response handling are unfamiliar, the asynchronous section of our [JavaScript learning roadmap](/blog/javascript-roadmap-2026-beginner-job-ready) provides the wider learning path. For this problem, the immediate next step is smaller: capture one harmless raw record, locate the first conversion that changes it, and add a test there.

## Frequently Asked Questions

### Why does JSON.parse round large numbers without an error?

The number token can be valid JSON even when JavaScript Number cannot represent its value exactly. Native parsing converts the token to that numeric representation; it is not required to throw merely because precision changes.

### Can BigInt fix a number after JSON.parse has rounded it?

No. BigInt created from the rounded Number preserves the rounded integer. Use an exact original string, parsing that preserves original tokens, or a compatible lossless parser before the original digits disappear.

### Is Number.isSafeInteger enough to detect lost precision?

No. It checks the resulting Number, not the original JSON token. A tiny nonzero value can underflow to zero, or a decimal can round to an integer, and that result can pass the check. Preserve the source and validate the intended field type.

### Can response.json accept a reviver for large IDs?

No. The native Response instance json method has no reviver parameter. Read the body as text and select the parser yourself, or configure a library's response transformation before it performs numeric conversion.

### Should all JSON numbers become strings?

Not automatically. Strings are a portable choice for identifiers and explicitly documented exact values. Counts and measurements can remain numeric when their range and precision fit the application. A helper that converts every number to text intentionally changes types and needs matching downstream code.

## Verification Notes

Checked October 14, 2026 with **Node.js 24.12.0** and **Microsoft Edge 155.0.4283.45**. Local tests covered 21 native example groups, an emulated reviver without source access, the two CSV input paths, and an offline browser subset with nine numeric tokens plus two response checks.

These are reproducible, fictional examples—not a performance benchmark, an exhaustive precision validator, a live API test, a test of every browser, or a hands-on Excel result. The optional lossless-json library was documentation-reviewed, not installed or benchmarked for this article.

## Sources and Further Reading

- [MDN: JSON.parse, revivers, source access and compatibility](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse).
- [MDN: Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER).
- [RFC 8259: JSON number grammar and interoperability](https://www.rfc-editor.org/rfc/rfc8259).
- [MDN: Response.json](https://developer.mozilla.org/en-US/docs/Web/API/Response/json).
- [MDN: Response.text](https://developer.mozilla.org/en-US/docs/Web/API/Response/text).
- [MDN: BigInt semantics and JSON usage](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt).
- [MDN: BigInt serialization errors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/BigInt_not_serializable).
- [lossless-json: maintainer documentation and integration options](https://github.com/josdejong/lossless-json).