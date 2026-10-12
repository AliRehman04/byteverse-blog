import { OUTPUT_EXTENSIONS } from "./types";
import type { OutputFormat } from "./types";

/** Leaves room for a containing download path; also below Windows' UTF-16 limit. */
export const MAX_OUTPUT_NAME_BYTES = 180;
const MAX_INPUT_NAME_LENGTH = 4096;
const MAX_USED_NAMES = 10_000;
const reserved = /^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;

function trimName(value: string): string {
  return value.replace(/^[.\s]+|[.\s]+$/g, "");
}

function truncateUtf8(value: string, budget: number): string {
  let result = "";
  let bytes = 0;
  for (const point of value) {
    const code = point.codePointAt(0)!;
    const size = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes + size > budget) break;
    bytes += size;
    result += point;
  }
  return trimName(result);
}

function collisionKey(name: string): string {
  // Conservative Unicode case folding; composed/decomposed names also collide.
  return name.normalize("NFC").replace(/[. ]+$/g, "").toUpperCase();
}

/** Reserve and return a basename, never a path. The supplied Set is the only
 * intentional mutation; existing mixed-case entries are respected as well.
 */
export function uniqueOutputName(original: string, format: OutputFormat, used: Set<string>): string {
  if (typeof original !== "string" || original.length > MAX_INPUT_NAME_LENGTH) throw new RangeError("Input filename is too long or invalid.");
  if (typeof format !== "string" || !Object.prototype.hasOwnProperty.call(OUTPUT_EXTENSIONS, format)) throw new TypeError("Unknown output format.");
  if (Object.prototype.toString.call(used) !== "[object Set]" || used.size > MAX_USED_NAMES) {
    throw new RangeError("Filename reservation set exceeds its budget or is invalid.");
  }
  const leaf = original.split(/[\\/]/).pop() ?? "";
  const stem = leaf.replace(/\.[^.]*$/, "").normalize("NFC");
  let clean = "";
  for (const point of stem) {
    const code = point.codePointAt(0)!;
    if (code <= 31 || (code >= 127 && code <= 159) || (code >= 0xd800 && code <= 0xdfff)
      || code === 0x061c || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e)
      || (code >= 0x2066 && code <= 0x2069) || code === 0xfeff) continue;
    clean += /[<>:"|?*]/.test(point) ? "_" : point;
  }
  clean = trimName(clean) || "image";
  if (reserved.test(clean)) clean = `_${clean}`;
  const taken = new Set<string>();
  for (const name of used) {
    if (typeof name !== "string" || name.length > MAX_INPUT_NAME_LENGTH) throw new RangeError("Invalid reserved filename.");
    taken.add(collisionKey(name));
  }
  const extension = OUTPUT_EXTENSIONS[format];
  // At most used.size collisions are possible; no unbounded suffix search.
  for (let index = 0; index <= used.size; index++) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const base = truncateUtf8(clean, MAX_OUTPUT_NAME_BYTES - extension.length - suffix.length - 1) || "image";
    const name = `${base}${suffix}.${extension}`;
    if (!taken.has(collisionKey(name))) {
      used.add(name);
      return name;
    }
  }
  throw new RangeError("Could not reserve an output filename.");
}