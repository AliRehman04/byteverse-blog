import { DEFAULT_SETTINGS } from "./types";
import type { ImageSettings } from "./types";
import { parseLocalSettings, parseSettingsQuery, SETTINGS_TEXT_LIMIT, validateSettings } from "./settings";

export interface UseCasePreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly settings: Readonly<ImageSettings>;
  readonly optionalCrop?: "3:4";
}

function recipe(id: string, label: string, description: string, patch: Partial<ImageSettings>, optionalCrop?: "3:4"): UseCasePreset {
  return Object.freeze({
    id, label, description, optionalCrop,
    settings: Object.freeze(validateSettings({ ...DEFAULT_SETTINGS, ...patch, crop: null })),
  });
}

/** Starting points, not official upload specifications. Crops require a separate,
 * per-image confirmation; selecting a recipe never crops an entire batch. */
export const USE_CASE_PRESETS: readonly UseCasePreset[] = Object.freeze([
  recipe("application", "Application photo", "50 KB · JPG · optional 3:4 crop", {
    mode: "target", format: "jpeg", targetValue: 50, quality: 90, minQuality: 35,
  }, "3:4"),
  recipe("signature", "Signature", "20 KB · PNG · longest side 600 px", {
    mode: "target", format: "png", targetValue: 20, resizeMode: "longest", longestSide: 600,
  }),
  recipe("email", "Email attachment", "1 MB · JPG · longest side 2,560 px", {
    mode: "target", format: "jpeg", targetValue: 1, unit: "MB", resizeMode: "longest", longestSide: 2560,
  }),
  recipe("hero", "Website hero", "WebP · quality 80 · longest side 1,920 px", {
    mode: "quality", format: "webp", quality: 80, resizeMode: "longest", longestSide: 1920,
  }),
  recipe("blog", "Blog image", "150 KB · WebP · longest side 1,200 px", {
    mode: "target", format: "webp", targetValue: 150, resizeMode: "longest", longestSide: 1200,
  }),
  recipe("social", "Social image", "JPG · quality 85 · longest side 2,048 px", {
    mode: "quality", format: "jpeg", quality: 85, resizeMode: "longest", longestSide: 2048,
  }),
  recipe("smallest", "Maximum compression", "Auto · smallest · minimum quality 20 · 50 KB", {
    mode: "auto", format: "auto", autoPreference: "smallest", minQuality: 20, targetValue: 50,
  }),
]);

export const CUSTOM_PRESET_LIMIT = 5;
export const CUSTOM_PRESET_STORAGE_KEY = "byteverse:image-studio:presets:v1";
export interface CustomPreset { name: string; settings: ImageSettings }

export function sanitizePresetName(name: string): string {
  return Array.from(name.normalize("NFKC").replace(/[^\p{L}\p{N} ._()-]/gu, "").replace(/\s+/g, " ").trim()).slice(0, 40).join("");
}

/** The UI deliberately excludes image-specific crops from persistence/links. */
export function settingsOnly(input: Readonly<ImageSettings>): ImageSettings {
  return validateSettings({ ...input, crop: null });
}

function supportedControls(settings: ImageSettings): boolean {
  return settings.pngLevel <= 6 && [0, 16, 64, 128, 256].includes(settings.paletteColors)
    && (settings.mode === "auto") === (settings.format === "auto");
}

/** Reject the entire untrusted record rather than restoring an unknown shape.
 * Only a user-entered label and the allowlisted settings are accepted. */
export function parseCustomPresets(text: string | null): CustomPreset[] | null {
  if (text === null) return [];
  if (text.length > (SETTINGS_TEXT_LIMIT + 128) * CUSTOM_PRESET_LIMIT) return null;
  try {
    const input: unknown = JSON.parse(text);
    if (!Array.isArray(input) || input.length > CUSTOM_PRESET_LIMIT) return null;
    const names = new Set<string>();
    const output: CustomPreset[] = [];
    for (const item of input) {
      if (!item || typeof item !== "object" || Array.isArray(item)
        || Object.keys(item).length !== 2 || !Object.hasOwn(item, "name") || !Object.hasOwn(item, "settings")) return null;
      const record = item as Record<string, unknown>;
      if (typeof record.name !== "string" || record.name.length > 80) return null;
      const name = sanitizePresetName(record.name);
      const settings = parseLocalSettings(JSON.stringify(record.settings));
      if (!name || names.has(name.toLowerCase()) || !settings || !supportedControls(settings) || settings.crop !== null) return null;
      names.add(name.toLowerCase());
      output.push({ name, settings: settingsOnly(settings) });
    }
    return output;
  } catch { return null; }
}

/** Adapt only the documented `size=50kb` shorthand. URLSearchParams is not a
 * validator: first reject malformed escaping, duplicate keys and alias conflicts,
 * then delegate all values/unknown fields to the shared strict parser. */
export function parseWorkspaceSettingsQuery(query: string): ImageSettings | null {
  if (typeof query !== "string" || query.length > SETTINGS_TEXT_LIMIT) return null;
  try {
    const raw = query.startsWith("?") ? query.slice(1) : query;
    if (!raw) return validateSettings(DEFAULT_SETTINGS);
    for (const part of raw.split("&")) {
      const equals = part.indexOf("=");
      if (equals < 1) return null;
      decodeURIComponent(part.slice(0, equals).replace(/\+/g, " "));
      decodeURIComponent(part.slice(equals + 1).replace(/\+/g, " "));
    }
    const params = new URLSearchParams(raw);
    const seen = new Set<string>();
    for (const key of params.keys()) {
      if (seen.has(key)) return null;
      seen.add(key);
    }
    if (params.has("size")) {
      if (params.has("targetValue") || params.has("unit")) return null;
      const match = /^(\d+(?:\.\d+)?)(kb|kib|mb|mib)$/i.exec(params.get("size") ?? "");
      if (!match) return null;
      const units: Record<string, string> = { kb: "KB", kib: "KiB", mb: "MB", mib: "MiB" };
      params.delete("size");
      params.set("targetValue", String(Number(match[1])));
      params.set("unit", units[match[2].toLowerCase()]);
      if (!params.has("mode")) params.set("mode", "target");
    }
    // An omitted partner is unambiguous; explicitly conflicting Auto choices
    // are rejected rather than showing one format while the engine uses others.
    if (params.get("mode") === "auto" && !params.has("format")) params.set("format", "auto");
    if (params.get("format") === "auto" && !params.has("mode")) params.set("mode", "auto");
    const settings = parseSettingsQuery(params.toString());
    return settings && supportedControls(settings) ? settings : null;
  } catch { return null; }
}