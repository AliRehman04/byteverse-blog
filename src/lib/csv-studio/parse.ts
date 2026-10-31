import { STUDIO_LIMITS, StudioError, delimiterLabel, type DelimiterCandidate } from "./types";

/**
 * Quote-aware CSV tokenizer.
 *
 * Semantics (documented in docs/CSV-STUDIO.md):
 * - CRLF, LF and lone CR all end a record outside quotes; inside quotes they are data.
 * - A doubled quote inside a quoted field is one literal quote.
 * - Text after a closing quote is kept and appended (Excel/Python style) and counted as malformed.
 * - A quote inside an unquoted field is kept literally and counted as a stray quote.
 * - An unclosed quote keeps everything to the end of the file in that field and is reported.
 * - Nothing is trimmed, coerced or dropped. A final line break does not create an extra record.
 */
export interface TokenizerOptions {
  delimiter: string;
  quote: string;
  comment: string;
  mergeDelimiters: boolean;
  maxRecords?: number;
  maxFields?: number;
  maxFieldChars?: number;
}

export interface RecordInfo {
  start: number;
  end: number;
  line: number;
  malformed: number;
  stray: number;
  unclosed: boolean;
  terminated: boolean;
}

export interface TokenizeStats {
  records: number;
  commentLines: number;
  crlf: number;
  lf: number;
  cr: number;
  malformedQuotes: number;
  strayQuotes: number;
  unclosed: { record: number; line: number } | null;
  endsWithNewline: boolean;
  stoppedEarly: boolean;
}

export type RecordHandler = (fields: string[], info: RecordInfo) => boolean | void;

export function tokenize(text: string, options: TokenizerOptions, onRecord: RecordHandler): TokenizeStats {
  const length = text.length;
  const delimiter = options.delimiter;
  const quote = options.quote;
  const comment = options.comment;
  const delimiterCode = delimiter ? delimiter.charCodeAt(0) : -1;
  const quoteCode = quote ? quote.charCodeAt(0) : -1;
  const maxFields = options.maxFields ?? Number.POSITIVE_INFINITY;
  const maxFieldChars = options.maxFieldChars ?? Number.POSITIVE_INFINITY;
  const merge = options.mergeDelimiters && delimiterCode !== -1;
  const stats: TokenizeStats = { records: 0, commentLines: 0, crlf: 0, lf: 0, cr: 0, malformedQuotes: 0, strayQuotes: 0, unclosed: null, endsWithNewline: false, stoppedEarly: false };

  // Cached forward positions keep the whole scan linear.
  let nextDelimiter = delimiter ? text.indexOf(delimiter) : -1;
  let nextLf = text.indexOf("\n");
  let nextCr = text.indexOf("\r");
  const refresh = (from: number) => {
    if (nextDelimiter !== -1 && nextDelimiter < from) nextDelimiter = text.indexOf(delimiter, from);
    if (nextLf !== -1 && nextLf < from) nextLf = text.indexOf("\n", from);
    if (nextCr !== -1 && nextCr < from) nextCr = text.indexOf("\r", from);
  };
  const stopAfter = (from: number) => {
    refresh(from);
    let stop = length;
    if (nextDelimiter !== -1 && nextDelimiter < stop) stop = nextDelimiter;
    if (nextLf !== -1 && nextLf < stop) stop = nextLf;
    if (nextCr !== -1 && nextCr < stop) stop = nextCr;
    return stop;
  };
  const lineEnd = (from: number) => {
    refresh(from);
    let stop = length;
    if (nextLf !== -1 && nextLf < stop) stop = nextLf;
    if (nextCr !== -1 && nextCr < stop) stop = nextCr;
    return stop;
  };
  const countBreaks = (from: number, to: number) => {
    let count = 0;
    for (;;) {
      refresh(from);
      const lf = nextLf !== -1 && nextLf < to ? nextLf : -1;
      const cr = nextCr !== -1 && nextCr < to ? nextCr : -1;
      if (lf === -1 && cr === -1) return count;
      count++;
      if (cr !== -1 && (lf === -1 || cr < lf)) from = text.charCodeAt(cr + 1) === 10 ? cr + 2 : cr + 1;
      else from = lf + 1;
    }
  };
  let line = 1;
  const consumeTerminator = (at: number) => {
    line++;
    if (text.charCodeAt(at) === 13) {
      if (text.charCodeAt(at + 1) === 10) { stats.crlf++; return at + 2; }
      stats.cr++;
      return at + 1;
    }
    stats.lf++;
    return at + 1;
  };
  const tooWide = () => new StudioError("COLUMN_LIMIT", `A row has more than ${STUDIO_LIMITS.maxColumns} fields. CSV Studio supports up to ${STUDIO_LIMITS.maxColumns} columns. Check that the delimiter is right.`);
  const tooLong = (row: number) => new StudioError("FIELD_LIMIT", `Record ${row.toLocaleString("en-US")} contains a single value longer than ${maxFieldChars.toLocaleString("en-US")} characters. That usually means an unclosed quote or an embedded file.`);

  let position = 0;
  let lastTerminated = false;
  while (position < length) {
    if (options.maxRecords !== undefined && stats.records >= options.maxRecords) { stats.stoppedEarly = true; break; }
    const start = position;
    const startLine = line;
    if (comment && text.startsWith(comment, position)) {
      const stop = lineEnd(position);
      stats.commentLines++;
      if (stop >= length) { position = length; lastTerminated = false; break; }
      position = consumeTerminator(stop);
      lastTerminated = true;
      continue;
    }
    if (merge) while (position < length && text.charCodeAt(position) === delimiterCode) position++;
    const fields: string[] = [];
    let malformed = 0;
    let stray = 0;
    let unclosed = false;
    let terminated = false;
    let end = position;
    for (;;) {
      if (fields.length >= maxFields) throw tooWide();
      let stop: number;
      if (quoteCode !== -1 && text.charCodeAt(position) === quoteCode) {
        let value = "";
        let segment = position + 1;
        let cursor = position + 1;
        let after = -1;
        for (;;) {
          const close = text.indexOf(quote, cursor);
          if (close === -1) break;
          if (text.charCodeAt(close + 1) === quoteCode) {
            value += text.slice(segment, close + 1);
            cursor = close + 2;
            segment = cursor;
            continue;
          }
          value += text.slice(segment, close);
          after = close + 1;
          break;
        }
        if (after === -1) {
          value += text.slice(segment);
          line += countBreaks(position + 1, length);
          if (value.length > maxFieldChars) throw tooLong(stats.records + 1);
          unclosed = true;
          malformed++;
          fields.push(value);
          stats.unclosed ??= { record: stats.records + 1, line: startLine };
          end = length;
          position = length;
          lastTerminated = false;
          break;
        }
        line += countBreaks(position + 1, after - 1);
        stop = stopAfter(after);
        if (stop > after) {
          malformed++;
          value += text.slice(after, stop);
        }
        if (value.length > maxFieldChars) throw tooLong(stats.records + 1);
        fields.push(value);
      } else {
        stop = stopAfter(position);
        const value = text.slice(position, stop);
        if (quoteCode !== -1 && value.indexOf(quote) !== -1) stray++;
        if (value.length > maxFieldChars) throw tooLong(stats.records + 1);
        fields.push(value);
      }
      if (stop >= length) { end = length; position = length; lastTerminated = false; break; }
      if (text.charCodeAt(stop) === delimiterCode) {
        position = stop + 1;
        if (merge) {
          while (position < length && text.charCodeAt(position) === delimiterCode) position++;
          const next = text.charCodeAt(position);
          if (position >= length || next === 10 || next === 13) {
            end = stop;
            if (position >= length) { lastTerminated = false; break; }
            position = consumeTerminator(position);
            terminated = true;
            lastTerminated = true;
            break;
          }
        }
        continue;
      }
      end = stop;
      position = consumeTerminator(stop);
      terminated = true;
      lastTerminated = true;
      break;
    }
    stats.records++;
    stats.malformedQuotes += malformed;
    stats.strayQuotes += stray;
    if (onRecord(fields, { start, end, line: startLine, malformed, stray, unclosed, terminated }) === false) { stats.stoppedEarly = true; break; }
  }
  stats.endsWithNewline = lastTerminated;
  return stats;
}

const CANDIDATES = [",", ";", "\t", "|"] as const;

export interface DelimiterDecision { delimiter: string; reason: string; ambiguous: boolean; candidates: DelimiterCandidate[] }

interface Measured extends DelimiterCandidate { malformed: number; headerOk: boolean; multiRows: number; splitRate: number; modeCount: number }

function measure(sample: string, truncated: boolean, delimiter: string, quote: string, comment: string, skipRows: number): Measured {
  const widths = new Map<number, number>();
  const observations: { width: number; malformed: number; header: boolean; headerOk: boolean; unclosed: boolean }[] = [];
  let skipped = 0;
  let first = true;
  tokenize(sample, { delimiter, quote, comment, mergeDelimiters: false, maxRecords: 1_000 + skipRows }, (fields, info) => {
    if (skipped < skipRows) { skipped++; return; }
    if (fields.length === 1 && fields[0] === "") return;
    const header = first;
    first = false;
    observations.push({
      width: fields.length,
      malformed: info.malformed,
      header,
      unclosed: info.unclosed,
      headerOk: header && fields.length > 1 && fields.every((field) => field.trim() !== "") && new Set(fields).size === fields.length,
    });
  });
  // A sample cut mid-file can end inside a quoted field, and an unclosed quote
  // swallows the rest of the file: neither record says anything about the delimiter.
  if (truncated && observations.length > 1) observations.pop();
  const usable = observations.filter((observation) => !observation.unclosed);
  let malformed = 0;
  let multiRows = 0;
  for (const observation of usable) {
    widths.set(observation.width, (widths.get(observation.width) ?? 0) + 1);
    malformed += observation.malformed;
    if (observation.width > 1) multiRows++;
  }
  let width = 1;
  let modeCount = 0;
  for (const [candidate, count] of widths) if (count > modeCount || (count === modeCount && candidate > width)) { width = candidate; modeCount = count; }
  const records = usable.length;
  return {
    delimiter,
    label: delimiterLabel(delimiter),
    width,
    consistency: records ? modeCount / records : 0,
    records,
    malformed,
    headerOk: Boolean(observations[0]?.headerOk),
    multiRows,
    splitRate: records ? multiRows / records : 0,
    modeCount,
  };
}

/** Score candidate delimiters on a sample. Ambiguity keeps a single column instead of guessing. */
export function detectDelimiter(text: string, quote: string, comment: string, skipRows: number): DelimiterDecision {
  let sample = text;
  let truncated = false;
  if (text.length > STUDIO_LIMITS.sampleChars) {
    const cut = Math.max(text.lastIndexOf("\n", STUDIO_LIMITS.sampleChars), text.lastIndexOf("\r", STUDIO_LIMITS.sampleChars));
    sample = text.slice(0, cut > 0 ? cut + 1 : STUDIO_LIMITS.sampleChars);
    truncated = true;
  }
  const measured = CANDIDATES.map((delimiter) => measure(sample, truncated, delimiter, quote, comment, skipRows));
  const candidates = measured.map(({ delimiter, label, width, consistency, records }) => ({ delimiter, label, width, consistency, records }));
  // A real delimiter splits (nearly) every row; ragged rows lower consistency, not viability.
  const score = (item: Measured) => item.consistency + item.splitRate - Math.min(item.malformed / Math.max(item.records, 1), 0.5) + (item.headerOk ? 0.05 : 0);
  const viable = measured.filter((item) => item.width > 1 && item.splitRate >= 0.9 && item.records > 0).sort((a, b) => score(b) - score(a));
  const records = Math.max(...measured.map((item) => item.records), 0);
  if (records === 0) return { delimiter: "", ambiguous: false, candidates, reason: "There are no complete rows to measure, so the file was read as a single column." };
  if (!viable.length) {
    const partial = measured.filter((item) => item.multiRows > 0).sort((a, b) => b.multiRows - a.multiRows)[0];
    return {
      delimiter: "",
      ambiguous: false,
      candidates,
      reason: partial
        ? `${partial.label}s appear in ${partial.multiRows} of ${partial.records} sampled rows but not consistently, so the file was kept as one column. Choose a delimiter if it should have columns.`
        : "No comma, semicolon, tab or pipe separates the sampled rows, so the file was read as a single column.",
    };
  }
  const [best, runnerUp] = viable;
  if (runnerUp && Math.abs(score(best) - score(runnerUp)) < 0.02) {
    return {
      delimiter: "",
      ambiguous: true,
      candidates,
      reason: `${best.label} and ${runnerUp.label.toLowerCase()} both split the sampled rows consistently (${best.width} and ${runnerUp.width} fields). Auto won’t guess, so the file is shown as one column. Choose the delimiter.`,
    };
  }
  const count = (value: number) => value.toLocaleString("en-US");
  const other = measured.find((item) => item !== best && item.multiRows > 0);
  const contrast = other ? ` ${other.label} would split only ${count(other.multiRows)}.` : "";
  const reason = best.modeCount === best.records
    ? `${best.label}: all ${count(best.records)} sampled rows have ${best.width} fields.${contrast}`
    : `${best.label}: ${count(best.multiRows)} of ${count(best.records)} sampled rows split into columns; ${count(best.modeCount)} have ${best.width} fields and the rest differ.${contrast}`;
  return { delimiter: best.delimiter, ambiguous: false, candidates, reason };
}

/** Re-tokenize one record's source text to report quoting per field. */
export function fieldQuoting(record: string, delimiter: string, quote: string): boolean[] {
  const quoted: boolean[] = [];
  if (!quote) {
    tokenize(record, { delimiter, quote: "", comment: "", mergeDelimiters: false, maxRecords: 1 }, (fields) => { for (let index = 0; index < fields.length; index++) quoted.push(false); });
    return quoted;
  }
  let position = 0;
  const length = record.length;
  for (;;) {
    if (record[position] === quote) {
      quoted.push(true);
      let cursor = position + 1;
      for (;;) {
        const close = record.indexOf(quote, cursor);
        if (close === -1) return quoted;
        if (record[close + 1] === quote) { cursor = close + 2; continue; }
        position = close + 1;
        break;
      }
      const next = delimiter ? record.indexOf(delimiter, position) : -1;
      if (next === -1) return quoted;
      position = next + 1;
    } else {
      quoted.push(false);
      const next = delimiter ? record.indexOf(delimiter, position) : -1;
      if (next === -1 || position >= length) return quoted;
      position = next + 1;
    }
  }
}
