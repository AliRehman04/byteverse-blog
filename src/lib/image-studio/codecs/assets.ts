import { wasmAssets, type WasmKey } from "image-studio:assets";
import { StudioError, quiet } from "./errors";

const unavailable = () => new StudioError("codec", "A local image codec could not be loaded. Reconnect or download the complete codec pack, then retry.");

/** This is the only application fetch in the engine. Names, sizes and hashes
 * are compiled from installed binaries. No file contents can select a URL. */
export async function readWasm(key: WasmKey): Promise<Uint8Array<ArrayBuffer>> {
  const asset = wasmAssets[key];
  const origin = globalThis.location?.origin;
  if (!asset || !origin || !/^https?:$/.test(globalThis.location.protocol)
    || !/^\/image-studio\/wasm\/[a-zA-Z0-9._-]+\.wasm$/.test(asset.url)
    || !Number.isSafeInteger(asset.bytes) || asset.bytes < 8 || asset.bytes > 20_000_000) throw unavailable();
  const url = new URL(asset.url, origin);
  if (url.origin !== origin || url.search || url.hash || url.username || url.password) throw unavailable();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url.href, {
      method: "GET", mode: "same-origin", credentials: "omit", redirect: "error",
      referrerPolicy: "no-referrer", cache: "force-cache", signal: controller.signal,
    });
    if (!response.ok || response.redirected || (response.url && response.url !== url.href) || !response.body) throw unavailable();
    const length = response.headers.get("content-length");
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > asset.bytes)) throw unavailable();
    const data = new Uint8Array(asset.bytes);
    const reader = response.body.getReader();
    let offset = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (offset + value.byteLength > data.byteLength) throw unavailable();
        data.set(value, offset);
        offset += value.byteLength;
      }
    } finally {
      await reader.cancel().catch(quiet);
      reader.releaseLock();
    }
    if (offset !== asset.bytes || data[0] !== 0 || data[1] !== 97 || data[2] !== 115 || data[3] !== 109
      || data[4] !== 1 || data[5] !== 0 || data[6] !== 0 || data[7] !== 0) throw unavailable();
    if (globalThis.crypto?.subtle) {
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
      const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== asset.sha256) throw unavailable();
    }
    return data;
  } catch {
    throw unavailable();
  } finally {
    clearTimeout(timer);
  }
}

export async function emscriptenOptions(key: WasmKey): Promise<EmscriptenWasm.ModuleOpts> {
  const wasmBinary = await readWasm(key);
  return {
    wasmBinary, noInitialRun: true, print: quiet, printErr: quiet,
    locateFile(filename: string) {
      if (filename !== wasmAssets[key].filename) throw unavailable();
      return new URL(wasmAssets[key].url, globalThis.location.origin).href;
    },
  };
}