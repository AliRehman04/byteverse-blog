import { deflateSync, inflateSync, strFromU8, strToU8, zipSync } from "fflate";
import { buildDocument, MAX_PROJECT_CHARS, parseProject, serializeProject, type PlaygroundProject } from "./html-playground";

export const SHARE_PREFIX = "#code=";
const MAX_SHARE_CHARS = 12_000;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** Returns a URL fragment holding the compressed project, or null when it is too long for a link. */
export function encodeShare(project: PlaygroundProject): string | null {
  const encoded = toBase64Url(deflateSync(strToU8(serializeProject(project)), { level: 9 }));
  return encoded.length > MAX_SHARE_CHARS ? null : SHARE_PREFIX + encoded;
}

export function decodeShare(hash: string): PlaygroundProject | null {
  const body = hash.startsWith(SHARE_PREFIX) ? hash.slice(SHARE_PREFIX.length) : "";
  if (!body || body.length > MAX_SHARE_CHARS || !/^[A-Za-z0-9_-]+$/.test(body)) return null;
  try {
    const bytes = inflateSync(fromBase64Url(body));
    return bytes.length > MAX_PROJECT_CHARS * 4 ? null : parseProject(strFromU8(bytes));
  } catch {
    return null;
  }
}

/** index.html linking styles.css and script.js, as a ZIP archive. */
export function zipProject(project: PlaygroundProject): Uint8Array {
  const files: Record<string, Uint8Array> = { "index.html": strToU8(buildDocument(project, { external: true }).doc) };
  if (project.css.trim()) files["styles.css"] = strToU8(project.css);
  if (project.js.trim()) files["script.js"] = strToU8(project.js);
  return zipSync(files, { level: 6 });
}
