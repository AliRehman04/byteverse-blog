/** Per-cell detectors. Pure, allocation-light, shared by validation, grid marks and export. */
import { STUDIO_LIMITS } from "./types";

export const FLAG = {
  EMPTY: 1 << 0,
  WS_EDGE: 1 << 1,
  WS_INNER: 1 << 2,
  CONTROL: 1 << 3,
  LINEBREAK: 1 << 4,
  REPLACEMENT: 1 << 5,
  BOM: 1 << 6,
  SURROGATE: 1 << 7,
  MOJIBAKE: 1 << 8,
  LEADING_ZERO: 1 << 9,
  LONG_DIGITS: 1 << 10,
  SCIENTIFIC: 1 << 11,
  DATE_LIKE: 1 << 12,
  APOSTROPHE: 1 << 13,
  FORMULA: 1 << 14,
  SENTINEL: 1 << 15,
  TOO_LONG: 1 << 16,
  VERY_LONG: 1 << 17,
  INTEGER: 1 << 18,
  DECIMAL: 1 << 19,
  BOOLEAN: 1 << 20,
  ZIP5: 1 << 21,
  ZIP4: 1 << 22,
  PHONE: 1 << 23,
  SHORT_DIGITS: 1 << 24,
  MISSING: 1 << 25,
  SIGNED_NUMBER: 1 << 26,
} as const;

const DIGITS = /^\d+$/;
const LEADING_ZERO_NUMBER = /^[+-]?0\d+(?:\.\d+)?$/;
const INTEGER = /^-?(?:0|[1-9]\d{0,14})$/;
const GROUPED_INTEGER = /^-?[1-9]\d{0,2}(?:,\d{3}){1,4}$/;
const DECIMAL = /^-?(?:0|[1-9]\d*)\.\d+$/;
const GROUPED_DECIMAL = /^-?[1-9]\d{0,2}(?:,\d{3})+\.\d+$/;
const SIGNED_NUMBER = /^\s*[+-]\d[\d,]*(?:\.\d+)?\s*$/;
const SCIENTIFIC = /^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/;
const ZIP4 = /^\d{5}-\d{4}$/;
const PHONE = /^(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/;
const BOOLEAN = /^(?:true|false|yes|no|y|n)$/i;
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const NUMERIC_DATE = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/;
const ISO_DATE = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
const MONTH_YEAR = /^(\d{1,2})[/-](\d{4})$/;
const NAMED_MONTH_FIRST = new RegExp(`^(?:${MONTHS})[\\s./-]?\\d{1,4}$`, "i");
const NAMED_DAY_FIRST = new RegExp(`^\\d{1,2}[\\s./-]?(?:${MONTHS})(?:[\\s./-]?\\d{2,4})?$`, "i");
const TIME = /^\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?m\.?)?$/i;
const SPECIAL_SPACE = /[\t\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]| {2}/;
const MOJIBAKE_TEST = /Ã[\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]|Â[\u00a0-\u00bf]|â€|ðŸ/;
export const SENTINELS = new Set(["NULL", "N/A", "#N/A", "NA", "NAN", "NONE", "NIL", "UNDEFINED", "-", "--", "#VALUE!", "#REF!", "#DIV/0!", "#NAME?", "#NUM!", "#NULL!"]);

function isEdgeSpace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d || code === 0xa0 || code === 0x1680 || (code >= 0x2000 && code <= 0x200a)
    || code === 0x202f || code === 0x205f || code === 0x3000 || code === 0xfeff;
}

function plausibleMonthDay(a: number, b: number): boolean {
  return a >= 1 && b >= 1 && ((a <= 12 && b <= 31) || (b <= 12 && a <= 31));
}

/** Would Excel's CSV import likely turn this text into a date or time? US settings assumed. */
export function isDateLike(value: string): boolean {
  if (value.length > 24) return false;
  let match = NUMERIC_DATE.exec(value);
  if (match) return plausibleMonthDay(Number(match[1]), Number(match[2]));
  match = ISO_DATE.exec(value);
  if (match) return Number(match[2]) >= 1 && Number(match[2]) <= 12 && Number(match[3]) >= 1 && Number(match[3]) <= 31;
  match = MONTH_YEAR.exec(value);
  if (match) return Number(match[1]) >= 1 && Number(match[1]) <= 12;
  return NAMED_MONTH_FIRST.test(value) || NAMED_DAY_FIRST.test(value) || TIME.test(value);
}

/** Leading = + - @ (including full-width and minus-sign lookalikes) after optional whitespace/control characters. */
export function isFormulaLike(value: string): boolean {
  let index = 0;
  const length = value.length;
  while (index < length) {
    const code = value.charCodeAt(index);
    if (code <= 0x20 || code === 0x7f || code === 0xa0 || code === 0x3000 || code === 0xfeff || (code >= 0x2000 && code <= 0x200b)) index++;
    else break;
  }
  if (index >= length) return false;
  const code = value.charCodeAt(index);
  return code === 0x3d || code === 0x2b || code === 0x2d || code === 0x40
    || code === 0xff1d || code === 0xff0b || code === 0xff0d || code === 0xff20 || code === 0x2212 || code === 0xfe62 || code === 0xfe63;
}

export function isSignedNumber(value: string): boolean {
  return value.length <= 40 && SIGNED_NUMBER.test(value);
}

export function cellFlags(value: string | undefined): number {
  if (value === undefined) return FLAG.MISSING | FLAG.EMPTY;
  const length = value.length;
  if (length === 0) return FLAG.EMPTY;
  let flags = 0;
  const first = value.charCodeAt(0);
  if (isEdgeSpace(first) || isEdgeSpace(value.charCodeAt(length - 1))) flags |= FLAG.WS_EDGE;
  let spaceCandidate = false;
  let mojibakeCandidate = false;
  let previousSpace = false;
  for (let index = 0; index < length; index++) {
    const code = value.charCodeAt(index);
    if (code < 0x20) {
      if (code === 10 || code === 13) flags |= FLAG.LINEBREAK;
      else if (code === 9) spaceCandidate = true;
      else flags |= FLAG.CONTROL;
      previousSpace = false;
      continue;
    }
    if (code === 0x20) {
      if (previousSpace) spaceCandidate = true;
      previousSpace = true;
      continue;
    }
    previousSpace = false;
    if (code < 0x7f) continue;
    if (code === 0x7f || (code >= 0x80 && code <= 0x9f) || code === 0x200b || code === 0x2060) flags |= FLAG.CONTROL;
    else if (code === 0xa0 || code === 0x1680 || (code >= 0x2000 && code <= 0x200a) || code === 0x202f || code === 0x205f || code === 0x3000) spaceCandidate = true;
    else if (code === 0xfeff) flags |= FLAG.BOM;
    else if (code === 0xfffd) flags |= FLAG.REPLACEMENT;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) index++;
      else flags |= FLAG.SURROGATE;
    } else if (code >= 0xdc00 && code <= 0xdfff) flags |= FLAG.SURROGATE;
    else if (code === 0xc3 || code === 0xc2 || code === 0xe2 || code === 0xf0) mojibakeCandidate = true;
  }
  if (spaceCandidate && SPECIAL_SPACE.test(value.trim())) flags |= FLAG.WS_INNER;
  if (mojibakeCandidate && MOJIBAKE_TEST.test(value)) flags |= FLAG.MOJIBAKE;
  if (length > STUDIO_LIMITS.excelCellChars) flags |= FLAG.TOO_LONG;
  else if (length > STUDIO_LIMITS.longCellChars) flags |= FLAG.VERY_LONG;
  if (first === 0x27) flags |= FLAG.APOSTROPHE;
  if (isFormulaLike(value)) {
    flags |= FLAG.FORMULA;
    if (isSignedNumber(value)) flags |= FLAG.SIGNED_NUMBER;
  }
  if (length > 64) return flags;
  if (DIGITS.test(value)) {
    if (length > 1 && first === 0x30) flags |= FLAG.LEADING_ZERO;
    else if (length <= 15) flags |= FLAG.INTEGER | FLAG.DECIMAL;
    if (length >= 16) flags |= FLAG.LONG_DIGITS;
    if (length === 5) flags |= FLAG.ZIP5;
    if (length === 3 || length === 4) flags |= FLAG.SHORT_DIGITS;
    if (length === 10 || (length === 11 && first === 0x31)) flags |= FLAG.PHONE;
    if (value === "0" || value === "1") flags |= FLAG.BOOLEAN;
    return flags;
  }
  if (LEADING_ZERO_NUMBER.test(value)) flags |= FLAG.LEADING_ZERO;
  else if (INTEGER.test(value) || GROUPED_INTEGER.test(value)) flags |= FLAG.INTEGER | FLAG.DECIMAL;
  else if ((DECIMAL.test(value) || GROUPED_DECIMAL.test(value)) && significantDigits(value) <= 15) flags |= FLAG.DECIMAL;
  else if (SCIENTIFIC.test(value)) flags |= FLAG.SCIENTIFIC;
  if (ZIP4.test(value)) flags |= FLAG.ZIP4;
  else if (PHONE.test(value)) flags |= FLAG.PHONE;
  if (isDateLike(value)) flags |= FLAG.DATE_LIKE;
  if (BOOLEAN.test(value)) flags |= FLAG.BOOLEAN;
  if (SENTINELS.has(value.trim().toUpperCase())) flags |= FLAG.SENTINEL;
  return flags;
}

export function significantDigits(value: string): number {
  const digits = value.replace(/[^\d]/g, "").replace(/^0+/, "");
  return digits.length;
}

/** Spreadsheet-safe CSV: prefix an apostrophe to formula-like values that are not plain signed numbers. */
export function spreadsheetSafe(value: string): string {
  return isFormulaLike(value) && !isSignedNumber(value) ? `'${value}` : value;
}

export const NUMBER_PATTERNS = { INTEGER, GROUPED_INTEGER, DECIMAL, GROUPED_DECIMAL };

export function describeCodePoint(code: number): string | null {
  if (code === 0x09) return "Tab";
  if (code === 0x0a) return "Line feed";
  if (code === 0x0d) return "Carriage return";
  if (code < 0x20) return "Control character";
  if (code === 0x7f) return "Delete control";
  if (code >= 0x80 && code <= 0x9f) return "C1 control (often an encoding error)";
  if (code === 0xa0) return "No-break space";
  if (code === 0x200b) return "Zero-width space";
  if (code === 0x2060) return "Word joiner";
  if (code === 0xfeff) return "Byte-order mark";
  if (code === 0xfffd) return "Replacement character (unreadable byte)";
  if (code === 0x1680 || (code >= 0x2000 && code <= 0x200a) || code === 0x202f || code === 0x205f || code === 0x3000) return "Unicode space";
  if (code >= 0xd800 && code <= 0xdfff) return "Unpaired surrogate";
  if (code === 0xff1d || code === 0xff0b || code === 0xff0d || code === 0xff20 || code === 0x2212) return "Full-width or minus-sign lookalike";
  return null;
}
