import { NUMBER_PATTERNS, significantDigits } from "./detect";
import type { DateFormat } from "./types";

/** Strict integer (optional US thousands separators). Returns the plain digits or null. */
export function parseIntegerCell(value: string): string | null {
  if (NUMBER_PATTERNS.INTEGER.test(value)) return value === "-0" ? "0" : value;
  if (NUMBER_PATTERNS.GROUPED_INTEGER.test(value)) {
    const plain = value.replace(/,/g, "");
    return significantDigits(plain) <= 15 ? plain : null;
  }
  return null;
}

/** Strict decimal with at most 15 significant digits, so Excel stores it exactly as shown. */
export function parseDecimalCell(value: string): string | null {
  const integer = parseIntegerCell(value);
  if (integer !== null) return integer;
  if (NUMBER_PATTERNS.DECIMAL.test(value) || NUMBER_PATTERNS.GROUPED_DECIMAL.test(value)) {
    const plain = value.replace(/,/g, "");
    if (significantDigits(plain) > 15) return null;
    return /^-0(?:\.0+)?$/.test(plain) ? plain.slice(1) : plain;
  }
  return null;
}

export function parseBooleanCell(value: string): boolean | null {
  if (/^(?:true|yes|y|1)$/i.test(value)) return true;
  if (/^(?:false|no|n|0)$/i.test(value)) return false;
  return null;
}

const SEPARATED = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/;
const ISO = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** Explicit-format date → Excel serial day (1900 date system). No guessing between formats. */
export function parseDateCell(value: string, format: DateFormat): number | null {
  let year: number;
  let month: number;
  let day: number;
  if (format === "YMD") {
    const match = ISO.exec(value);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    const match = SEPARATED.exec(value);
    if (!match) return null;
    const first = Number(match[1]);
    const second = Number(match[2]);
    year = Number(match[3]);
    if (match[3].length === 2) year += year < 30 ? 2000 : 1900;
    month = format === "MDY" ? first : second;
    day = format === "MDY" ? second : first;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || year > 9999) return null;
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  // Excel's 1900 system treats 1900 as a leap year; only dates from March 1900 map cleanly.
  if (year < 1900 || (year === 1900 && month < 3)) return null;
  return Math.round((time - EXCEL_EPOCH) / 86_400_000);
}

export function describeSerial(serial: number): string {
  const date = new Date(EXCEL_EPOCH + serial * 86_400_000);
  return date.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}

export function dateStyle(value: string): "separated" | "iso" | null {
  if (SEPARATED.test(value)) return "separated";
  if (ISO.test(value)) return "iso";
  return null;
}
