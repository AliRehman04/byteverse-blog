import { DEFAULT_SETTINGS, IMAGE_LIMITS } from "./types";
import type { CropRect, ImageSettings } from "./types";
import { parseTarget } from "./bytes";
import { normalizeCrop } from "./geometry";

export { DEFAULT_SETTINGS } from "./types";

export const SETTINGS_TEXT_LIMIT = 4096;
const keys = Object.keys(DEFAULT_SETTINGS) as (keyof ImageSettings)[];
const allowed = new Set<string>(keys);
const cropKeys = new Set(["x", "y", "width", "height"]);
const numericKeys = new Set(["targetValue", "quality", "minQuality", "width", "height", "percent", "longestSide", "pngLevel", "paletteColors"]);
const booleanKeys = new Set(["preserveDimensions", "lockAspect", "allowUpscale", "allowJpegTransparency"]);

/** Copy only own data properties. Accessors, symbols and extra fields are not settings. */
function dataRecord(input: unknown, allowlist: ReadonlySet<string>): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Settings must be a plain object.");
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== null && Object.getPrototypeOf(prototype) !== null) throw new TypeError("Settings must be a plain object.");
  const names = Reflect.ownKeys(input);
  if (names.length > allowlist.size) throw new TypeError("Unexpected settings fields.");
  const result: Record<string, unknown> = Object.create(null);
  for (const name of names) {
    if (typeof name !== "string" || !allowlist.has(name)) throw new TypeError("Unexpected settings field.");
    const descriptor = Object.getOwnPropertyDescriptor(input, name);
    if (!descriptor || !("value" in descriptor)) throw new TypeError("Settings cannot contain accessors.");
    result[name] = descriptor.value;
  }
  return result;
}

function integer(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
}

function validateCrop(input: unknown): CropRect | null {
  if (input === null) return null;
  const value = dataRecord(input, cropKeys);
  const { x, y, width, height } = value;
  if (typeof x !== "number" || typeof y !== "number" || typeof width !== "number" || typeof height !== "number"
    || ![x, y, width, height].every(Number.isFinite)
    || x < 0 || y < 0 || width <= 0 || height <= 0 || x >= 1 || y >= 1 || width > 1 || height > 1
    || x + width > 1 + 1e-12 || y + height > 1 + 1e-12) {
    throw new RangeError("Shared crops must be normalized, positive rectangles inside the oriented image.");
  }
  return normalizeCrop({ x, y, width, height });
}

/** Accept a partial settings object, fill omitted defaults, then validate every
 * field. Invalid/unknown fields throw; no coercion, silent clamping or image data.
 * Returns an independent canonical copy, including the optional crop.
 */
export function validateSettings(input: unknown): ImageSettings {
  const fields = dataRecord(input, allowed);
  const settings = { ...DEFAULT_SETTINGS, ...fields } as ImageSettings;
  if (!["target", "quality", "resize", "auto"].includes(settings.mode)
    || !["auto", "jpeg", "png", "webp", "avif"].includes(settings.format)
    || !["none", "dimensions", "percent", "longest"].includes(settings.resizeMode)
    || !["balanced", "smallest"].includes(settings.autoPreference)) throw new TypeError("Unknown image setting choice.");
  parseTarget(settings);
  integer(settings.quality, 1, 100, "Quality");
  integer(settings.minQuality, 1, 95, "Minimum quality");
  if (settings.minQuality > settings.quality) throw new RangeError("Minimum quality cannot exceed quality.");
  for (const value of [settings.width, settings.height, settings.longestSide]) integer(value, 1, IMAGE_LIMITS.maxDimension, "Dimension");
  integer(settings.percent, 1, 1000, "Resize percent");
  integer(settings.pngLevel, 0, 6, "PNG optimization level");
  if (settings.paletteColors !== 0) integer(settings.paletteColors, 2, 256, "Palette colors");
  for (const key of booleanKeys) {
    if (typeof settings[key as keyof ImageSettings] !== "boolean") throw new TypeError("Image setting flags must be booleans.");
  }
  if (typeof settings.background !== "string" || !/^#[\da-f]{6}$/i.test(settings.background)) {
    throw new TypeError("Background must be a six-digit hexadecimal color.");
  }
  settings.background = settings.background.toLowerCase();
  settings.crop = validateCrop(settings.crop);
  return settings;
}

export interface ImagePreset {
  readonly id: string;
  readonly label: string;
  readonly settings: Readonly<Pick<ImageSettings, "mode" | "targetValue" | "unit">>;
}

/** Seven quick byte-ceiling presets; they do not silently change format or crop. */
export const PRESETS: readonly ImagePreset[] = Object.freeze(([
  [20, "KB"], [50, "KB"], [100, "KB"], [200, "KB"], [500, "KB"], [1, "MB"], [2, "MB"],
] as const).map(([targetValue, unit]) => Object.freeze({
  id: `${targetValue}${unit.toLowerCase()}`,
  label: `${targetValue} ${unit}`,
  settings: Object.freeze({ mode: "target" as const, targetValue, unit }),
})));

export function applyPreset(id: string, base: Readonly<ImageSettings> = DEFAULT_SETTINGS): ImageSettings {
  const preset = PRESETS.find((item) => item.id === id);
  if (!preset) throw new TypeError("Unknown image preset.");
  return validateSettings({ ...validateSettings(base), ...preset.settings });
}

function queryNumber(value: string): number {
  if (value.length > 64 || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d{1,3})?$/i.test(value)) {
    throw new TypeError("Invalid numeric setting.");
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new RangeError("Settings numbers must be finite.");
  return number;
}

/** Query only, with optional leading '?', not a URL. Unknown/duplicate fields,
 * malformed escaping and invalid values reject the whole input (null).
 * Empty query means defaults. No browser storage or navigation is performed.
 */
export function parseSettingsQuery(query: string): ImageSettings | null {
  if (typeof query !== "string" || query.length > SETTINGS_TEXT_LIMIT) return null;
  try {
    const text = query.startsWith("?") ? query.slice(1) : query;
    const fields: Record<string, unknown> = Object.create(null);
    if (text === "") return validateSettings(fields);
    const pairs = text.split("&");
    if (pairs.length > keys.length) return null;
    for (const pair of pairs) {
      const separator = pair.indexOf("=");
      if (separator < 1) return null;
      const key = decodeURIComponent(pair.slice(0, separator).replace(/\+/g, " "));
      const value = decodeURIComponent(pair.slice(separator + 1).replace(/\+/g, " "));
      if (!allowed.has(key) || Object.prototype.hasOwnProperty.call(fields, key)) return null;
      if (numericKeys.has(key)) fields[key] = queryNumber(value);
      else if (booleanKeys.has(key)) {
        if (value !== "true" && value !== "false") return null;
        fields[key] = value === "true";
      } else if (key === "crop") {
        if (value === "none") fields.crop = null;
        else {
          const parts = value.split(",");
          if (parts.length !== 4) return null;
          const [x, y, width, height] = parts.map(queryNumber);
          fields.crop = { x, y, width, height };
        }
      } else fields[key] = value;
    }
    return validateSettings(fields);
  } catch { return null; }
}

/** Returns a query WITHOUT '?'. Always serializes only validated settings. */
export function serializeSettingsQuery(input: Readonly<ImageSettings>): string {
  const settings = validateSettings(input);
  return keys.map((key) => {
    const crop = settings.crop;
    const value = key === "crop" ? (crop === null ? "none" : [crop.x, crop.y, crop.width, crop.height].join(",")) : String(settings[key]);
    return `${key}=${encodeURIComponent(value)}`;
  }).join("&");
}

/** Pure JSON parsing only; the caller owns storage. Bad/old/oversized data is null. */
export function parseLocalSettings(text: string | null): ImageSettings | null {
  if (typeof text !== "string" || text.length > SETTINGS_TEXT_LIMIT) return null;
  try { return validateSettings(JSON.parse(text)); } catch { return null; }
}

export function serializeLocalSettings(input: Readonly<ImageSettings>): string {
  return JSON.stringify(validateSettings(input));
}