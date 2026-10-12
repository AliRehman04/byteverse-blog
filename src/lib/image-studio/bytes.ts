import { IMAGE_LIMITS } from "./types";
import type { ByteUnit, ImageSettings } from "./types";

export const UNIT_BYTES: Readonly<Record<ByteUnit, number>> = Object.freeze({
  KB: 1_000, KiB: 1_024, MB: 1_000_000, MiB: 1_048_576,
});

function unitBytes(unit: ByteUnit): number {
  if (typeof unit !== "string" || !Object.prototype.hasOwnProperty.call(UNIT_BYTES, unit)) {
    throw new TypeError("Use KB, KiB, MB or MiB.");
  }
  return UNIT_BYTES[unit];
}

function integerBytes(bytes: number, minimum: number): void {
  if (!Number.isSafeInteger(bytes) || bytes < minimum) {
    throw new RangeError("Byte counts must be finite safe integers in range.");
  }
}

export function parseTarget(settings: Pick<ImageSettings, "targetValue" | "unit">): number;
export function parseTarget(value: number, unit: ByteUnit): number;
/** Fractional units are allowed only when they describe a whole byte count.
 * Tiny floating-point representation errors are tolerated, never rounded down
 * from a genuinely fractional byte or used to increase a requested ceiling.
 */
export function parseTarget(
  value: number | Pick<ImageSettings, "targetValue" | "unit">,
  unit?: ByteUnit,
): number {
  const amount = typeof value === "object" && value !== null ? value.targetValue : value;
  const selectedUnit = typeof value === "object" && value !== null ? value.unit : unit;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || selectedUnit === undefined) {
    throw new RangeError("A positive finite target and an explicit unit are required.");
  }
  const exact = amount * unitBytes(selectedUnit);
  const bytes = Math.round(exact);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(exact)) * 4;
  if (!Number.isSafeInteger(bytes) || Math.abs(exact - bytes) > tolerance
    || bytes < IMAGE_LIMITS.targetMinBytes || bytes > IMAGE_LIMITS.maxOutputBytes) {
    throw new RangeError("Target must be a whole byte count from 5,000 to 100,000,000 bytes.");
  }
  return bytes;
}

/** Display-only rounding; never use this string to decide whether a target met. */
export function formatBytes(bytes: number, unit?: ByteUnit | "B"): string {
  integerBytes(bytes, -Number.MAX_SAFE_INTEGER);
  const absolute = Math.abs(bytes);
  const selected = unit ?? (absolute >= 1_000_000 ? "MB" : absolute >= 1_000 ? "KB" : "B");
  if (selected === "B") return `${bytes} B`;
  return `${Number((bytes / unitBytes(selected)).toFixed(2))} ${selected}`;
}

export interface Savings {
  savedBytes: number;
  /** Unrounded; negative means the output grew. */
  percent: number;
}

export function savings(original: number, output: number): Savings {
  integerBytes(original, 1); // A percentage relative to an empty file is undefined.
  integerBytes(output, 0);
  const savedBytes = original - output;
  return { savedBytes, percent: (savedBytes / original) * 100 };
}