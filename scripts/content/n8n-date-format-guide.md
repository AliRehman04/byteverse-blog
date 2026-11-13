**To format a date in n8n, parse the input, choose the timezone, then convert the result to the string you need.** For a valid ISO timestamp in a field named `eventAt`, this expression displays the time in New York:

```txt
{{ DateTime.fromISO($json.eventAt, { setZone: true }).setZone('America/New_York').toFormat('dd/MM/yyyy HH:mm') }}
```

With `eventAt` set to `2026-11-13T18:45:00Z`, the result is `13/11/2026 13:45`. The timestamp still represents the same instant. Only its timezone and display format changed.

That distinction matters. Changing the pattern cannot repair an invalid input, a missing timezone, or a timestamp expressed in the wrong unit. Those mistakes can produce a believable but incorrect date instead of a visible error. This guide covers the Date & Time node, expressions, native Luxon in the Code node, seconds versus milliseconds, date-only fields, daylight saving transitions, and validation before writing records elsewhere.

The examples were checked on 13 November 2026 using **Luxon 3.7.2** with explicit timezones and fixed test inputs, against the current official n8n documentation. They are not a claim that every n8n release bundles that exact Luxon version. If you are new to expressions and node input, start with the [n8n beginner guide](/blog/how-to-use-n8n-2026-complete-guide).

## Quick reference: common n8n date expressions

Use these in a field switched to **Expression** mode. The examples assume the referenced inputs have already been validated. The text `yyyy-MM-dd` is the Luxon pattern for a four-digit year, two-digit month and two-digit day; the capitalization is important.

For the displayed results, assume `$now` is `2026-11-13T18:45:00.000Z`, `$today` is that date at midnight UTC, `localDate` is `13/11/2026`, and the Unix inputs represent the same reference instant.

| Task | Expression | Result for the reference input |
|---|---|---|
| Current ISO timestamp | `{{ $now.toISO() }}` | `2026-11-13T18:45:00.000Z` |
| Today's calendar date | `{{ $today.toISODate() }}` | `2026-11-13` |
| Year, month, day | `{{ $now.toFormat('yyyy-MM-dd') }}` | `2026-11-13` |
| Day, month, year | `{{ $now.toFormat('dd/MM/yyyy') }}` | `13/11/2026` |
| Seven calendar days ahead | `{{ $now.plus({ days: 7 }).toISODate() }}` | `2026-11-20` |
| Seven calendar days ago | `{{ $today.minus({ days: 7 }).toISODate() }}` | `2026-11-06` |
| First day of next month | `{{ $now.startOf('month').plus({ months: 1 }).toISODate() }}` | `2026-12-01` |
| Parse a known day-first date | `{{ DateTime.fromFormat($json.localDate, 'dd/MM/yyyy', { zone: 'Asia/Karachi' }).toISODate() }}` | `2026-11-13` |
| Unix seconds to ISO | `{{ DateTime.fromSeconds(Number($json.epochSeconds), { zone: 'UTC' }).toISO() }}` | `2026-11-13T18:45:00.000Z` |
| Unix milliseconds to ISO | `{{ DateTime.fromMillis(Number($json.epochMilliseconds), { zone: 'UTC' }).toISO() }}` | `2026-11-13T18:45:00.000Z` |

Your real `$now` and `$today` values follow the workflow's effective timezone, so their output can include an offset rather than `Z`. Do not copy the sample output as a constant into a production workflow. The expressions should calculate it.

## Start with the input contract, not the output pattern

Three different things are often called a date:

- **An instant:** `2026-11-13T18:45:00Z` identifies a particular moment. An explicit offset such as `+05:00` can identify a moment too.
- **A local date and time:** `2026-11-13 09:00` needs a timezone before it identifies a moment. Nine in Karachi and nine in New York are different instants.
- **A calendar date:** `2026-11-13` might mean an invoice date or a birthday. It does not necessarily represent midnight UTC or an appointment time.

Before formatting, decide which of these the source provides and what the destination expects. An API might require an ISO timestamp, a spreadsheet might want an actual date value, and an email might only need a readable label. A single formatted string does not satisfy every destination equally well.

n8n passes date values between nodes as strings. A value received from the previous node therefore is not automatically a live Luxon object with methods such as `toFormat()`. Parse the value when you need date arithmetic or timezone conversion, and serialize the result deliberately at the output boundary.

Keep a machine-friendly field and a display field separately when both are useful. For example, keep `eventAtUtc` for an API or comparison, and `eventAtDisplay` for a human-readable message. Do not overwrite the original timestamp just to make a spreadsheet column look attractive.

## A no-code example with the Date & Time node

Use **Date & Time** when you want an explicit transformation step on the canvas rather than repeating expressions in several downstream fields.

Start with one synthetic item:

```json
{
  "recordId": "INV-1042",
  "eventAt": "2026-11-13T18:45:00Z"
}
```

To produce a display date while retaining the original record:

1. Set the workflow timezone to `America/New_York` for this example.
2. Add a **Date & Time** node and select **Format a Date**.
3. Set **Date** to the expression `{{ $json.eventAt }}`.
4. Choose **Custom Format** and enter `dd/MM/yyyy HH:mm`.
5. Set **Output Field Name** to `eventAtDisplay`.
6. Under Options, enable **Use Workflow Timezone** and **Include Input Fields**.
7. Execute the test node and check the new value, the record ID and the unchanged source timestamp before connecting a write operation.

The intended output is:

```json
{
  "recordId": "INV-1042",
  "eventAt": "2026-11-13T18:45:00Z",
  "eventAtDisplay": "13/11/2026 13:45"
}
```

**Include Input Fields** matters: if it is disabled, the operation outputs only the selected result field. Losing `recordId` can make the next update target the wrong record or fail entirely.

**From Date Format** describes the input, not the output. If the incoming value is `13/11/2026 09:00`, its pattern is `dd/MM/yyyy HH:mm`. The Custom Format field then describes what you want to produce. For local values with no offset, confirm the source timezone separately; a format pattern cannot supply that missing information by itself.

The node's preset labels may use uppercase human-readable descriptions such as YYYY-MM-DD. That does not mean you should copy those uppercase letters into a custom Luxon pattern. For a custom pattern, use Luxon's case-sensitive tokens.

## Luxon format tokens: the mistakes that still look like dates

For the reference time `2026-11-13T18:45:00Z`, these patterns have different meanings:

| Pattern or token | Meaning | Reference result |
|---|---|---|
| `yyyy` | Four-digit calendar year | `2026` |
| `MM` or `LL` | Two-digit month | `11` |
| `mm` | Two-digit minute | `45` |
| `dd` | Day of the month | `13` |
| `HH:mm` | 24-hour time | `18:45` |
| `hh:mm a` | 12-hour time with meridiem, using an English locale | `06:45 PM` |
| `yyyy-MM-dd` | Year, month and day | `2026-11-13` |
| `yyyy-mm-dd` | Year, minute and day, usually a mistake | `2026-45-13` |
| `yyyy-MM-dd 'at' HH:mm` | Quoted text stays literal | `2026-11-13 at 18:45` |

Use `yyyy`, not a pattern copied blindly from Moment, date-fns or another date library. Similarly, `dd` means day of month, while uppercase `DD` is a localized date macro rather than an interchangeable spelling. Tokens are an API, not just a visual description.

When month names or meridiem labels matter, set the locale. For example:

```txt
{{ DateTime.fromISO($json.eventAt, { setZone: true }).setLocale('en-US').toFormat('dd LLL yyyy, hh:mm a') }}
```

The reference output is `13 Nov 2026, 06:45 PM`. Locale controls language and presentation; it does not convert the timezone. Likewise, the timezone determines the clock and calendar values but does not automatically choose your preferred date order.

Do not append the literal letter `Z` to a local timestamp to make it look ISO-compatible. `Z` means UTC, not "this string is a date". Use `.toUTC().toISO()` when UTC is required. Writing a false offset changes what the receiving system thinks the timestamp means.

![A person working in a browser-based task application on a laptop](https://www.byteverse.fyi/blog/gemini-workspace/photo-cover.jpg "Illustrative photograph of a person working in a task application, not a screenshot of n8n. Photo: cottonbro studio / Pexels.")

## Parse ISO, custom text and SQL-style dates differently

Use a parser that matches the source contract:

- **ISO 8601 text:** use `DateTime.fromISO(value, options)`.
- **A known custom pattern:** use `DateTime.fromFormat(value, pattern, options)`.
- **A SQL-style timestamp string:** Luxon also provides `DateTime.fromSQL(value, options)`.
- **A Unix number:** use `fromSeconds()` or `fromMillis()` with the correct unit.

`fromISO('13/11/2026')` is not the right parser for a slash-separated day-first date. This expression is explicit about both the input pattern and the source timezone:

```txt
{{ DateTime.fromFormat($json.localDateTime, 'dd/MM/yyyy HH:mm', { zone: 'Asia/Karachi' }).toUTC().toISO() }}
```

For `localDateTime: "13/11/2026 09:00"`, it produces `2026-11-13T04:00:00.000Z`.

There is no universally safe way to guess whether `04/05/2026` means 4 May or April 5. Both are valid dates. In the tests, `dd/MM/yyyy` produces `2026-05-04`, while `MM/dd/yyyy` produces `2026-04-05`. No parsing error can tell you which the person intended. Obtain a format guarantee from the source, use an unambiguous date picker, or route ambiguous inputs for review.

For named months, the parsing locale must match the source language. A formatter supporting a token does not necessarily mean the parser supports the same token, especially for timezone names and localized macros. Luxon's parsing guide documents these limits; prefer stable technical formats between systems.

Once you receive an Invalid DateTime, inspect the original value and selected parser. Applying another output format to the invalid object cannot recover a missing or incorrectly interpreted input.

## Timezone conversion versus assigning a timezone

These operations sound similar but answer different questions:

**Parsing an offset-free time in a zone** says what the original clock reading meant. `DateTime.fromISO('2026-11-13T09:00:00', { zone: 'Asia/Karachi' })` interprets the input as nine in Karachi.

**Converting an existing instant** changes where you display it. Calling `.setZone('America/New_York')` on a valid timestamp normally preserves its epoch milliseconds and changes its local representation.

**Keeping the local clock while changing zone** changes the instant itself. Luxon's `keepLocalTime: true` option is for deliberate reinterpretation, not routine conversion. Do not use it merely because you dislike the new hour shown after changing zones.

An important boundary example:

```txt
{{ DateTime.fromISO('2026-11-13T01:30:00Z', { setZone: true }).setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm ZZ') }}
```

This produces `2026-11-12 20:30 -05:00`. The previous calendar date is correct in New York. Stripping the date from the original UTC string before doing the conversion would group this event under the wrong local day.

`{ setZone: true }` while parsing preserves the offset carried in the input. It does not invent an IANA region. For example, `-05:00` is a fixed offset; it is not a promise that the source follows New York's future daylight saving rules. Use an explicit region such as `America/New_York` when future calendar arithmetic should follow that region.

n8n's workflow timezone and instance timezone are separate configuration levels. Check the workflow setting first, then the instance setting if the workflow has no override. Self-hosted instances can configure the instance timezone with `GENERIC_TIMEZONE`. Do not assume your laptop's timezone, the browser's display or the container's operating-system timezone is the intended business timezone. The official documentation notes that native JavaScript Date does not respect n8n's workflow-specific timezone in the same way as its Luxon workflow helpers.

## Unix timestamps: seconds and milliseconds are not interchangeable

These two values represent the same reference instant:

```json
{
  "epochSeconds": 1794595500,
  "epochMilliseconds": 1794595500000
}
```

`DateTime.fromSeconds(1794595500, { zone: 'UTC' })` and `DateTime.fromMillis(1794595500000, { zone: 'UTC' })` both produce the reference timestamp. Sending the seconds value into `fromMillis()` instead produces a date in **1970**.

Use the source API's documented unit. Counting digits can be a useful clue while debugging, but it is not a robust data contract across historical dates, negative timestamps and different ranges. Do not guess the unit silently on every execution.

Some APIs send the timestamp as a numeric string, which is why the quick-reference expressions use `Number()`. Validate before coercing: `Number('')` and `Number(null)` are zero, while `Number('abc')` is not a finite number. A missing value can otherwise become the Unix epoch without looking like a conversion failure. Zero itself is a legitimate timestamp, so a truthiness check such as `if (!timestamp)` is not sufficient either.

For APIs expecting whole Unix seconds, remember that `.toSeconds()` can include a fractional part when milliseconds are present. Round only according to the receiving API's contract. Do not remove precision or change units just because two sample responses happen to look similar.

## Date-only values should not accidentally become timestamps

An invoice dated `2026-11-13` and a meeting beginning at midnight UTC are different concepts. Parsing a date-only value creates a DateTime at a default time, but your business record may never have meant a particular instant.

For a date-only field, validate the calendar date and return `.toISODate()` in the intended calendar context. Do not convert it to UTC and then back to a different region just to reformat its text. That can shift the visible day, especially across large offsets.

For birthdays, statement dates and accounting periods, preserve the date semantics that the source specifies. For deadlines or appointments, require a time and timezone, or document the rule that turns a date into a deadline. "End of day" is incomplete until you identify whose day it is.

A spreadsheet's cell format is also separate from the value you send. Changing `2026-11-13` into `13/11/2026` does not guarantee that a connector will store an actual spreadsheet date rather than text. Check the connector's input mode and the target sheet's locale with a small test. Keep a stable ISO field alongside a human-readable field when you need both reliable interchange and presentation.

## Expressions and the Code node do not expose identical methods

n8n adds convenience extensions in expression fields. The Code node uses native Luxon behavior, so some copied expression shortcuts fail or, more dangerously, mean something different.

The official Datetime expression reference explicitly warns about two cases:

- **`.format(pattern)`** is an n8n expression extension. In the Code node, use native `.toFormat(pattern)` instead.
- **`.plus(7, 'days')`** is an expression shorthand. In native Luxon, the numeric argument means milliseconds; the extra argument does not turn it into seven days. Use `.plus({ days: 7 })`.

The same object-based approach applies to subtraction. These are the native forms used throughout this guide, which avoids depending on the expression-only shorthand.

Do not add `require('luxon')` to a Code node just because an example from a standalone Node.js application does. n8n exposes DateTime for JavaScript Code node usage, while external module loading has separate restrictions. Use the provided DateTime object and the correct execution mode. The [Code node guide](/blog/n8n-code-node-guide) explains those boundaries in more detail.

Serialize explicitly when building messages. Instead of concatenating a DateTime object and hoping its coercion produces the format you expect, call `.toISO()`, `.toISODate()`, or `.toFormat()` first. Reparse strings received from earlier nodes before calling date methods on them.

## Validate every input before formatting it

This Code node example is for **Run Once for All Items**. Its contract is deliberately narrow: `eventAt` must be an ISO timestamp containing a time and ending in `Z` or an offset written as `+05:00`. It does not guess slash-separated formats, Unix units or a missing source timezone.

It preserves each input record, adds a validation flag, and returns null outputs for invalid records rather than substituting the current time. Use an If node on `dateValid` before any external write.

```mjs
const targetZone = 'America/New_York';

return $input.all().map((item, inputIndex) => {
  const raw = item.json.eventAt;
  let parsed = null;
  let dateError = null;

  if (typeof raw !== 'string' || raw.trim() === '') {
    dateError = 'eventAt must be a non-empty ISO timestamp';
  } else if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(raw.trim())) {
    dateError = 'eventAt must include a time and an explicit offset';
  } else {
    parsed = DateTime.fromISO(raw.trim(), { setZone: true });
    if (!parsed.isValid) dateError = parsed.invalidReason || 'Invalid timestamp';
  }

  const local = parsed?.isValid ? parsed.setZone(targetZone) : null;
  if (local && !local.isValid) dateError = local.invalidReason || 'Invalid target timezone';

  return {
    json: {
      ...item.json,
      dateValid: dateError === null,
      dateError,
      eventAtUtc: dateError === null ? parsed.toUTC().toISO() : null,
      eventAtDisplay: dateError === null ? local.toFormat('dd/MM/yyyy HH:mm') : null,
    },
    ...(item.binary ? { binary: item.binary } : {}),
    pairedItem: { item: inputIndex },
  };
});
```

For the reference input it adds `dateValid: true`, an ISO UTC field and the New York display value. For an impossible date, missing value or timestamp without an offset, it sets `dateValid: false` and leaves both derived date fields null. The generated error text describes the issue without echoing the whole source record.

The output field names belong to this example. Rename them if your incoming data already uses `dateValid`, `dateError`, `eventAtUtc` or `eventAtDisplay` for something else. Use a consistent schema instead of overwriting an unrelated field accidentally.

The code processes all inputs and keeps item pairing. If an API puts many records inside one array field, expand that array first; the [Split Out guide](/blog/n8n-split-out-node-guide) explains the difference between an array inside one item and separate workflow items. Formatting only `$input.first()` would otherwise silently ignore the other records.

## Add days and months according to the rule you actually mean

Adding one calendar day is not always the same as adding 24 elapsed hours. In New York, the spring daylight saving transition on 8 March 2026 changes the offset.

Starting from `2026-03-07T12:00:00` in `America/New_York`:

| Operation | Local result | Elapsed time |
|---|---|---|
| `.plus({ days: 1 })` | `2026-03-08 12:00 -04:00` | 23 hours |
| `.plus({ hours: 24 })` | `2026-03-08 13:00 -04:00` | 24 hours |

For "same local time tomorrow", calendar-day arithmetic is usually the appropriate starting point. For "exactly 24 hours after this event", elapsed-hour arithmetic expresses that requirement. Neither automatically implements holidays, business days or a specific scheduling policy.

Months bring another edge case. Adding one month to 31 January 2026 produces 28 February, because February has no 31st. Adding another month to that result produces 28 March, whereas adding two months to the original January date produces 31 March. For recurring billing, decide whether the rule is "same numbered day where possible", "last day of every month", or a fixed interval, and calculate from the right anchor.

A formatting expression does not schedule a workflow. Schedule Trigger decides when a workflow starts; the Wait node pauses an existing execution. If the issue is a workflow waiting or resuming at the wrong time, use the [Wait node guide](/blog/n8n-wait-node-guide) alongside the timezone rules here instead of changing the output format and expecting the schedule to change.

## DST gaps and repeated times need an explicit policy

Checking `.isValid` is necessary, but it is not a complete appointment-validation policy.

In the tested library, `2026-03-08 02:30` in New York is moved forward to `03:30`, because the original local clock time did not exist. The result is still considered valid. If your business rule is to reject nonexistent local times rather than adjust them, compare the formatted parsed value back to the original input.

On 1 November 2026, `01:30` in New York happens twice, with two different offsets. Luxon 3.7.2 exposes `getPossibleOffsets()` to inspect that ambiguity. Do not depend on whichever offset a parser happens to select when the record must identify one exact appointment.

This **Run Once for All Items** example rejects both cases for a fixed New York appointment input in the exact format `yyyy-MM-dd HH:mm`:

```mjs
const zone = 'America/New_York';
const pattern = 'yyyy-MM-dd HH:mm';

return $input.all().map((item, inputIndex) => {
  const raw = item.json.appointmentLocal;
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`Input ${inputIndex}: appointmentLocal is required`);
  }

  const value = raw.trim();
  const parsed = DateTime.fromFormat(value, pattern, { zone });
  if (!parsed.isValid || parsed.toFormat(pattern) !== value) {
    throw new Error(`Input ${inputIndex}: invalid or nonexistent local time`);
  }
  if (parsed.getPossibleOffsets().length !== 1) {
    throw new Error(`Input ${inputIndex}: ambiguous local time; require an explicit offset`);
  }

  return {
    json: { ...item.json, appointmentUtc: parsed.toUTC().toISO() },
    ...(item.binary ? { binary: item.binary } : {}),
    pairedItem: { item: inputIndex },
  };
});
```

This strict example stops on an invalid record. Adapt the earlier validation-flag pattern if you need to route bad records for review instead of failing the batch. Check that your bundled Luxon supports `getPossibleOffsets()` before adopting this specific helper; the behavior checks here use 3.7.2.

An explicit offset resolves an instant, but you may still need to validate that it is consistent with the claimed region. For user-entered appointments, store the region and your ambiguity-resolution policy, not only a decorative timezone abbreviation.

## Compare dates as instants or as business-calendar dates

Sorting or comparing `dd/MM/yyyy` strings does not give chronological order. The string `31/10/2026` sorts after `02/11/2026` lexicographically, even though October 31 is earlier.

For instant comparisons, parse and validate both values, then compare `.toMillis()`. Equal epoch milliseconds mean the same instant even when the offsets or formatted strings differ. Strict equality of two DateTime objects is not an instant comparison, and `.equals()` also considers metadata such as zone and locale.

For calendar-day comparisons, convert both values into the same business timezone first. Only then compare their local dates or use the appropriate calendar comparison. The question "are these on the same day?" is incomplete without the calendar context.

Daily reports work well with a half-open range: start is included, next day's start is excluded. A **Run Once for All Items** Code node can produce that single range:

```mjs
const zone = 'America/New_York';
const start = $now.setZone(zone).startOf('day');
const end = start.plus({ days: 1 });

return [{
  json: {
    startInclusive: start.toUTC().toISO(),
    endExclusive: end.toUTC().toISO(),
  },
}];
```

For the November reference instant, the UTC boundaries are `2026-11-13T05:00:00.000Z` and `2026-11-14T05:00:00.000Z`. Filter with `timestamp >= startInclusive` and `timestamp < endExclusive` using the destination's actual datetime comparison, not arbitrary localized strings. At DST transitions this range can span 23 or 25 hours, which is correct for a local calendar day.

Using the next start rather than an inclusive `23:59:59` endpoint avoids excluding fractional-second events and avoids counting midnight in two adjacent reports. If you send these boundaries to an API, preserve them as string values in a valid request object; the [JSON body guide](/blog/n8n-json-parameter-needs-to-be-valid-json) covers that separate formatting problem.

## Fix common n8n date errors

| Symptom | Likely cause | Fix |
|---|---|---|
| Invalid DateTime | Wrong parser, impossible date, unsupported zone or mismatched pattern | Inspect the original input, parser and `.isValid` result |
| `.format is not a function` in Code | An expression-only n8n shortcut was copied into native Luxon code | Use `.toFormat()` |
| Calling date methods on a string fails | The previous node serialized the value | Parse with `fromISO()` or a known `fromFormat()` pattern |
| A date shows minute digits where the month should be | `mm` was used instead of `MM` | Correct the case-sensitive pattern |
| The result is in 1970 | Seconds were interpreted as milliseconds, or a blank became zero | Confirm units and reject missing values before Number conversion |
| Adding seven days barely changes the time | Native Luxon received `.plus(7, 'days')` | Use `.plus({ days: 7 })` |
| A date moves to yesterday or tomorrow | The instant was converted across a timezone boundary | Check whether the field is an instant or a date-only value |
| Original IDs disappear after the Date & Time node | Include Input Fields is disabled | Enable it when downstream steps need those fields |
| An appointment moves from 02:30 to 03:30 | The source local time fell into a DST gap | Apply an explicit reject-or-adjust policy |
| A report includes midnight twice | Both adjacent ranges included their end | Use an included start and excluded next start |

Do not hide bad dates with a fallback to `$now` unless the business rule genuinely permits replacing missing historical data with the present time. A successful execution containing a made-up invoice or event date is worse than a visible validation failure.

Test at least two records with different offsets, one missing value, one invalid date, a seconds/milliseconds pair and one midnight boundary before connecting external writes. If the workflow touches local appointments or calendar-day reports, add DST and month-end cases too. The eight native-library test groups and the article-specific checks used here were built around those boundaries, not only the happy path.

## Frequently Asked Questions

### How do I format a date in n8n?

Parse the incoming value with the parser for its format, select the intended timezone, and call toFormat with a Luxon pattern. You can also use the Date & Time node with Format a Date. Keep a machine friendly timestamp separately when the formatted value is only intended for a person to read.

### Why does n8n return Invalid DateTime?

The input may not match its parser or pattern, may describe an impossible calendar date, or may use an unsupported timezone. Check the raw value and isValid before formatting. A string with slashes needs its known source pattern rather than an assumption that it is ISO. Do not replace invalid dates with today's date unless that is an explicit business rule.

### Should I use yyyy or YYYY in an n8n custom date format?

Use lowercase yyyy for a four digit calendar year in a Luxon custom pattern. Uppercase preset labels are not instructions to copy another library's token syntax. Month and minute also differ: uppercase MM means month, while lowercase mm means minute. Token case is part of the format's meaning.

### How do I convert a Unix timestamp to a date in n8n?

Use DateTime.fromSeconds for Unix seconds or DateTime.fromMillis for milliseconds, then serialize or format the result. Check the documented source unit first. Numeric strings may need conversion, but reject blank or missing values before converting them because they can otherwise become zero and look like a valid date in 1970.

### Why does a date expression work in Edit Fields but fail in the Code node?

n8n adds some methods and shorthand signatures in expression fields that are not native Luxon APIs. In JavaScript Code nodes, use toFormat instead of the custom format method and pass a duration object to plus or minus. Reparse date strings from earlier nodes before calling date methods. The two contexts share many features, but not every convenience extension.

## Verification Notes

The guide was researched on 13 November 2026 using official n8n documentation for date handling, expression extensions and Date & Time node options, alongside Luxon's parsing, timezone and arithmetic documentation. Examples were executed with the real locally installed Luxon 3.7.2 package, fixed inputs and explicit zones. The tests cover token case, parsing ambiguity, invalid output behavior, epoch units, zone conversion, calendar arithmetic, DST gaps and repeated times, the article's expressions and all three Code node examples.

The n8n workflow globals supplied to the Code examples are synthetic, and the no-code configuration is documented guidance rather than an end-to-end n8n instance test. These checks are not a substitute for running the workflow in your own instance. No production API, database update, scheduling action, spreadsheet write or email was executed. Timezone behavior also depends on the runtime's time-zone data; review changing regional rules when scheduling future appointments.

## Sources and Further Reading

- n8n Docs: [Work with dates and times](https://docs.n8n.io/build/work-with-data/handle-special-data-types/work-with-dates-and-times).
- n8n Docs: [Date & Time node operations and options](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.datetime).
- n8n Docs: [Datetime expression reference and Code node limitations](https://docs.n8n.io/build/work-with-data/transform-data/expression-reference/datetime).
- Luxon: [Parsing guide](https://github.com/moment/luxon/blob/3.7.2/docs/parsing.md).
- Luxon: [Timezone and offset guide](https://github.com/moment/luxon/blob/3.7.2/docs/zones.md).
- Luxon: [Calendar arithmetic and time arithmetic](https://github.com/moment/luxon/blob/3.7.2/docs/math.md).
- Luxon: [DateTime implementation, including getPossibleOffsets](https://github.com/moment/luxon/blob/3.7.2/src/datetime.js).
- Cover photograph: [Daniil Komov on Pexels](https://www.pexels.com/photo/focused-coding-session-with-laptop-and-coffee-34803969/). Inline photograph: [cottonbro studio on Pexels](https://www.pexels.com/photo/person-using-a-laptop-on-a-table-7439136/). Both are illustrative photographs under the Pexels licence, not n8n screenshots.