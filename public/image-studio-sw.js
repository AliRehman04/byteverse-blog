/* Image studio only. CacheStorage is origin-shared, not a security sandbox.
 * Only a fixed anonymous shell, app icons/install metadata, Next build files
 * and validated codecs are stored. No user images, uploads, results or APIs. */
const STUDIO = "/tools/image-compressor";
const ASSET_SCOPE = "/image-studio/";
const MANIFEST = "/image-studio/manifest.json";
const WORKER = "/image-studio/worker.js";
const APP_MANIFEST = "/image-studio.webmanifest";
const APP_SHELL_FILES = new Set([
  APP_MANIFEST, "/favicon.ico", "/favicon-16x16.png", "/favicon-32x32.png",
  "/apple-touch-icon.png", "/android-chrome-192x192.png", "/android-chrome-512x512.png",
  "/logo.png", "/images/tools/image-compressor/hero-moraine-lake.webp",
]);
const CHANNEL = "image-studio-offline-v1";
const PREFIX = "byteverse-image-studio-v1-";
const META = PREFIX + "metadata";
const RUNTIME = PREFIX + "shell";
const COMMIT = "/image-studio/__offline_complete__";
const REMOVED = "/image-studio/__offline_removed__";
const MAX_SHELL_BYTES = 24_000_000;
const MAX_FILES = 256;
const MAX_SHELL_FILES = MAX_FILES + APP_SHELL_FILES.size + 1;
let generation = 0;
let operation = null;
let warming = null;
let refreshing = null;
let warmController = null;
let removing = null;

const online = () => self.navigator.onLine !== false;
const isStudio = (path) => path === STUDIO || path === STUDIO + "/";
const fail = (code) => Object.assign(new Error(code), { code });
const absolute = (path) => new URL(path, self.location.origin).href;
const PAGE_WORKER = self.registration.scope === absolute(STUDIO);
const ASSET_WORKER = self.registration.scope === absolute(ASSET_SCOPE);
const json = (value) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const digest = async (bytes) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");

function localPath(value) {
  if (typeof value !== "string" || value.length > 1000 || /[\\\s]/.test(value)) return null;
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin || !/^https?:$/.test(url.protocol) || url.search || url.hash || url.username || url.password) return null;
    if (/%(?!5[bBdD])/i.test(url.pathname) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(value) || value.includes("//") && !/^https?:\/\//.test(value)) return null;
    return url.pathname;
  } catch { return null; }
}

function nextPath(value) {
  try {
    const url = new URL(value, self.location.origin);
    // Next may append a deployment identifier. Cache only the canonical build
    // path; arbitrary parameters (including user data) are never accepted.
    if (url.search && (!/^\?dpl=[a-zA-Z0-9_-]{1,128}$/.test(url.search))) return null;
    url.search = "";
    const path = localPath(url.href);
    return path && /^\/_next\/static\/[a-zA-Z0-9_@.$%[\]()/~-]+\.(?:js|css|woff2?|ttf|otf)$/.test(path) ? path : null;
  } catch { return null; }
}

function appShellPath(value) {
  if (typeof value !== "string" || value.length > 1000 || /[\\\s]/.test(value)) return null;
  try {
    const url = new URL(value, self.location.origin);
    // Only Next's favicon content-hash forms are canonicalized. No arbitrary
    // query, icon path, or URL read from a web manifest is a fetch interface.
    if (url.search && (url.pathname !== "/favicon.ico" || !/^\?(?:[a-f0-9]{8,64}|favicon\.[a-zA-Z0-9._~-]{1,100}\.ico)$/.test(url.search))) return null;
    url.search = "";
    const path = localPath(url.href);
    return APP_SHELL_FILES.has(path) ? path : null;
  } catch { return null; }
}

const shellFileLimit = (path) => path === STUDIO ? 2_000_000 : path === APP_MANIFEST ? 512_000 : APP_SHELL_FILES.has(path) ? 1_000_000 : 8_000_000;

function codecPath(path, kind) {
  if (localPath(path) !== path) return false;
  const patterns = {
    worker: /^\/image-studio\/worker\.js$/,
    module: /^\/image-studio\/chunks\/[a-zA-Z0-9._-]+\.js$/,
    wasm: /^\/image-studio\/wasm\/[a-zA-Z0-9._-]+\.wasm$/,
    license: /^\/image-studio\/(?:licenses\/[a-zA-Z0-9._-]+\.txt|THIRD-PARTY-NOTICES\.txt)$/,
    source: /^\/image-studio\/sources\/[a-zA-Z0-9._-]+\.txt$/,
  };
  return Object.hasOwn(patterns, kind) && patterns[kind].test(path);
}

async function validateManifest(value) {
  if (!value || value.schemaVersion !== 1 || !/^[a-f0-9]{24}$/.test(value.version)
    || value.workerUrl !== WORKER || value.manifestUrl !== MANIFEST || value.format !== "module"
    || !Array.isArray(value.assets) || value.assets.length < 12 || value.assets.length > MAX_FILES
    || !Number.isSafeInteger(value.totalBytes) || value.totalBytes < 1 || value.totalBytes > 64_000_000) throw fail("manifest");
  const seen = new Set();
  let bytes = 0;
  for (const asset of value.assets) {
    if (!asset || !codecPath(asset.url, asset.kind) || seen.has(asset.url) || asset.required !== true
      || !Number.isSafeInteger(asset.bytes) || asset.bytes < 1 || asset.bytes > 20_000_000
      || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw fail("manifest");
    seen.add(asset.url); bytes += asset.bytes;
  }
  const requiredWasm = ["jpegEncode", "jpegDecode", "webpEncode", "webpDecode", "avifEncode", "avifDecode", "pngDecode", "oxipng", "resize"];
  if (bytes !== value.totalBytes || !seen.has(WORKER) || !seen.has("/image-studio/THIRD-PARTY-NOTICES.txt")
    || !value.assets.some((asset) => asset.kind === "source")
    || !requiredWasm.every((name) => value.assets.some((asset) => asset.kind === "wasm" && asset.url.startsWith(`/image-studio/wasm/${name}-`)))) throw fail("manifest");
  const version = await digest(new TextEncoder().encode(value.assets.map((asset) => `${asset.url}:${asset.sha256}`).join("\n")));
  if (version.slice(0, 24) !== value.version) throw fail("manifest");
  // Attribution/source links are deliberately not part of the fetch interface.
  return value;
}

async function readBytes(response, limit, onBytes) {
  if (!response.ok || response.redirected || response.type === "opaque" || !response.body) throw fail("network");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw fail("size");
      chunks.push(value); onBytes?.(value.byteLength);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function savedResponse(bytes, response, hash) {
  const headers = new Headers(response.headers);
  for (const name of ["content-encoding", "content-length", "transfer-encoding", "set-cookie", "vary", "etag"]) headers.delete(name);
  headers.set("X-Image-Studio-SHA256", hash);
  headers.set("X-Image-Studio-Bytes", String(bytes.byteLength));
  return new Response(bytes, { status: 200, headers });
}

async function fetchFile(path, limit, signal, onBytes) {
  if (!online()) throw fail("offline");
  if (signal?.aborted) throw fail("cancelled");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 25_000);
  try {
    const response = await fetch(absolute(path), {
      method: "GET", mode: "same-origin", credentials: "omit", redirect: "error",
      cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal,
      ...(path === STUDIO ? { headers: { Accept: "text/html" } } : {}),
    });
    if (response.url && response.url !== absolute(path)) throw fail("network");
    const bytes = await readBytes(response, limit, onBytes);
    if (!bytes.byteLength) throw fail("size");
    return { bytes, response };
  } catch (error) {
    if (signal?.aborted) throw fail("cancelled");
    if (controller.signal.aborted) throw fail("timeout");
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}

async function metaValue(key) {
  // CacheStorage.match is read-only, unlike open: the asset registration must
  // not recreate a cache while the page registration is removing the pack.
  const response = await caches.match(key, { cacheName: META });
  if (!response) return null;
  try { return JSON.parse(new TextDecoder().decode(await readBytes(response, 512_000))); }
  catch { return null; }
}

async function storedManifest() {
  const value = await metaValue(MANIFEST);
  if (!value) return null;
  try { return await validateManifest(value); } catch { return null; }
}

async function getManifest(refresh = false, signal) {
  if (!refresh) {
    const stored = await storedManifest();
    if (stored) return stored;
  }
  if (!online()) return storedManifest();
  if (!refreshing) {
    const epoch = generation;
    refreshing = (async () => {
      const { bytes } = await fetchFile(MANIFEST, 512_000, signal);
      const manifest = await validateManifest(JSON.parse(new TextDecoder().decode(bytes)));
      if (PAGE_WORKER && !removing && epoch === generation && !await metaValue(REMOVED)) {
        const metadata = await caches.open(META);
        if (!removing && epoch === generation) await metadata.put(MANIFEST, json(manifest));
      }
      return manifest;
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

function validatePaths(value) {
  if (!Array.isArray(value) || value.length > MAX_FILES || value.some((path) => nextPath(path) !== path)) throw fail("shell");
  return [...new Set(value)];
}

function shellPaths(html) {
  const paths = new Set();
  // Includes script/link attributes AND Next's escaped inline Flight chunk references.
  const text = html.replace(/\\\//g, "/");
  for (const match of text.matchAll(/(?:https?:\/\/[^\s"'<>\\/]+)?\/_next\/static\/[a-zA-Z0-9_@.$%[\]()/~-]+\.(?:js|css|woff2?|ttf|otf)(?:\?[^\s"'<>\\]*)?/g)) {
    const path = nextPath(match[0]);
    if (path) paths.add(path);
  }
  if (!paths.size || paths.size > MAX_FILES) throw fail("shell");
  return [...paths];
}

function shellEntries(html) {
  const paths = new Set();
  for (const tag of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    for (const match of tag[0].matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
      const path = nextPath(match[1]);
      if (path && /\.(?:js|css)$/.test(path)) paths.add(path);
    }
  }
  return [...paths];
}

function cssPaths(bytes, path) {
  const text = new TextDecoder().decode(bytes);
  const values = [];
  for (const match of text.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)|@import\s+["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1] || match[2] || match[3] || match[4], absolute(path));
      const asset = nextPath(url.href);
      if (asset) values.push(asset);
    } catch { /* External/data/image URLs are never cached. */ }
  }
  return values;
}

function checkType(path, response) {
  const mime = (response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  const valid = path === STUDIO ? mime === "text/html"
    : path === APP_MANIFEST ? ["application/manifest+json", "application/json"].includes(mime)
      : APP_SHELL_FILES.has(path) ? path.endsWith(".png") ? mime === "image/png" : path.endsWith(".webp") ? mime === "image/webp" : ["image/x-icon", "image/vnd.microsoft.icon"].includes(mime)
        : path.endsWith(".css") ? mime === "text/css"
          : path.endsWith(".js") ? /^(?:text|application)\/(?:javascript|ecmascript|x-javascript)$/.test(mime)
            : /^(?:font\/|application\/(?:font|x-font|vnd.ms-fontobject|octet-stream))/.test(mime);
  if (!valid) throw fail("shell");
}

async function cacheShell(cache, paths, signal, notify, checkCurrentPage) {
  const shell = await fetchFile(STUDIO, 2_000_000, signal);
  checkType(STUDIO, shell.response);
  const html = new TextDecoder().decode(shell.bytes);
  if (checkCurrentPage && shellEntries(html).some((path) => !paths.includes(path))) throw fail("changed");
  const queue = [...new Set([...shellPaths(html), ...paths, ...APP_SHELL_FILES])];
  if (!queue.some((path) => path.endsWith(".js"))) throw fail("shell");
  const shellHash = await digest(shell.bytes);
  await cache.put(STUDIO, savedResponse(shell.bytes, shell.response, shellHash));
  const files = [{ url: STUDIO, bytes: shell.bytes.byteLength, sha256: shellHash }];
  let total = shell.bytes.byteLength;
  for (let i = 0; i < queue.length; i++) {
    if (signal?.aborted) throw fail("cancelled");
    if (queue.length + 1 > MAX_SHELL_FILES) throw fail("shell");
    const path = queue[i];
    const file = await fetchFile(path, Math.min(shellFileLimit(path), MAX_SHELL_BYTES - total), signal);
    checkType(path, file.response);
    total += file.bytes.byteLength;
    if (total > MAX_SHELL_BYTES) throw fail("size");
    const hash = await digest(file.bytes);
    await cache.put(path, savedResponse(file.bytes, file.response, hash));
    files.push({ url: path, bytes: file.bytes.byteLength, sha256: hash });
    if (path.endsWith(".css")) for (const dependency of cssPaths(file.bytes, path)) if (!queue.includes(dependency)) queue.push(dependency);
    notify?.({ phase: "shell", completedFiles: i + 1, totalFiles: queue.length });
  }
  return { files, bytes: total };
}

async function committed() {
  const marker = await metaValue(COMMIT);
  if (!marker || marker.schema !== 1 || !/^[a-f0-9]{24}$/.test(marker.version)
    || typeof marker.cache !== "string" || !marker.cache.startsWith(`${PREFIX}pack-${marker.version}-`)
    || !/^[a-zA-Z0-9-]+$/.test(marker.cache) || marker.zip !== true
    || !Array.isArray(marker.shell) || !marker.shell.length || marker.shell.length > MAX_SHELL_FILES
    || !Number.isSafeInteger(marker.savedBytes) || marker.savedBytes < 1 || marker.savedBytes > 90_000_000
    || marker.shell.some((file) => !file || (file.url !== STUDIO && nextPath(file.url) !== file.url && !APP_SHELL_FILES.has(file.url))
      || !Number.isSafeInteger(file.bytes) || file.bytes < 1 || file.bytes > shellFileLimit(file.url) || !/^[a-f0-9]{64}$/.test(file.sha256))
    || new Set(marker.shell.map((file) => file.url)).size !== marker.shell.length
    || marker.shell.reduce((total, file) => total + file.bytes, 0) > MAX_SHELL_BYTES
    || !marker.shell.some((file) => file.url === STUDIO)
    || !await caches.has(marker.cache)) return null;
  const cache = { match: (path) => caches.match(path, { cacheName: marker.cache }) };
  const response = await cache.match(MANIFEST);
  if (!response) return null;
  try {
    const manifest = await validateManifest(JSON.parse(new TextDecoder().decode(await readBytes(response, 512_000))));
    return manifest.version === marker.version ? { marker, manifest, cache } : null;
  } catch { return null; }
}

async function verifyFiles(cache, files, signal) {
  for (const file of files) {
    if (signal?.aborted) throw fail("cancelled");
    const response = await cache.match(file.url);
    if (!response) throw fail("incomplete");
    if (file.url === STUDIO || nextPath(file.url) || APP_SHELL_FILES.has(file.url)) checkType(file.url, response);
    const bytes = await readBytes(response, file.bytes);
    if (bytes.byteLength !== file.bytes || await digest(bytes) !== file.sha256) throw fail("integrity");
  }
}

async function status(paths) {
  const [pack, manifest, removed] = await Promise.all([committed(), storedManifest(), metaValue(REMOVED)]);
  let reason = removed ? "removed" : pack ? "ready" : "partial";
  if (pack) {
    if (manifest && manifest.version !== pack.manifest.version || paths.some((path) => !pack.marker.shell.some((file) => file.url === path))) reason = "outdated";
    // Older verified codec packs remain readable, but are not complete until
    // their shell also includes every fixed icon and the install manifest.
    else if ([...APP_SHELL_FILES].some((path) => !pack.marker.shell.some((file) => file.url === path))) reason = "incomplete";
    else {
      try { await verifyFiles(pack.cache, [...pack.manifest.assets, ...pack.marker.shell]); }
      catch { reason = "incomplete"; }
    }
  }
  const names = await caches.keys();
  return {
    ready: reason === "ready", reason, version: (manifest || pack?.manifest)?.version || null,
    codecBytes: (manifest || pack?.manifest)?.totalBytes || null,
    savedBytes: pack?.marker.savedBytes || null,
    hasSavedFiles: names.some((name) => name.startsWith(PREFIX) && name !== META),
  };
}

async function warm(paths) {
  if (removing || !online() || await metaValue(REMOVED)) return;
  const epoch = generation;
  const controller = new AbortController();
  warmController = controller;
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    try { await getManifest(true, controller.signal); } catch { /* Existing validated downloads remain usable. */ }
    if (removing || epoch !== generation || controller.signal.aborted) return;
    await cacheShell(await caches.open(RUNTIME), paths, controller.signal);
  }
  finally {
    clearTimeout(timer);
    if (warmController === controller) warmController = null;
    if (epoch !== generation) await caches.delete(RUNTIME);
  }
}

async function download(data, clientId, port) {
  if (operation || removing) throw fail("busy");
  if (!online()) throw fail("offline");
  if (data.zip !== true) throw fail("zip");
  const paths = validatePaths(data.assets);
  const controller = new AbortController();
  const current = { id: data.id, clientId, controller, done: null };
  operation = current;
  const epoch = generation;
  const timer = setTimeout(() => controller.abort(), 180_000);
  let cacheName;
  let published = false;
  let loadedBytes = 0;
  let lastProgress = 0;
  const notify = (progress) => {
    try { port.postMessage({ type: "progress", ...progress }); } catch { controller.abort(); }
  };
  current.done = (async () => {
    try {
      notify({ phase: "preparing", loadedBytes: 0, totalBytes: 0, completedFiles: 0, totalFiles: 0 });
      const manifest = await getManifest(true, controller.signal);
      if (!manifest) throw fail("manifest");
      cacheName = `${PREFIX}pack-${manifest.version}-${data.id}`;
      const cache = await caches.open(cacheName);
      const manifestResponse = json(manifest);
      const manifestBytes = (await manifestResponse.clone().arrayBuffer()).byteLength;
      await cache.put(MANIFEST, manifestResponse);
      for (let i = 0; i < manifest.assets.length; i++) {
        const asset = manifest.assets[i];
        const progress = () => notify({ phase: "codecs", loadedBytes, totalBytes: manifest.totalBytes, completedFiles: i, totalFiles: manifest.assets.length });
        const file = await fetchFile(asset.url, asset.bytes, controller.signal, (bytes) => {
          loadedBytes += bytes;
          if (Date.now() - lastProgress > 120) { lastProgress = Date.now(); progress(); }
        });
        if (file.bytes.byteLength !== asset.bytes || await digest(file.bytes) !== asset.sha256) throw fail("integrity");
        await cache.put(asset.url, savedResponse(file.bytes, file.response, asset.sha256));
        notify({ phase: "codecs", loadedBytes, totalBytes: manifest.totalBytes, completedFiles: i + 1, totalFiles: manifest.assets.length });
      }
      notify({ phase: "shell", loadedBytes, totalBytes: manifest.totalBytes, completedFiles: 0, totalFiles: paths.length });
      const shell = await cacheShell(cache, paths, controller.signal, (value) => notify({ ...value, loadedBytes, totalBytes: manifest.totalBytes }), true);
      notify({ phase: "verifying", loadedBytes, totalBytes: manifest.totalBytes, completedFiles: 0, totalFiles: 0 });
      await verifyFiles(cache, [...manifest.assets, ...shell.files], controller.signal);
      // One atomic Cache.put publishes only the completely verified staging cache.
      // Failure/cancel before this point leaves the previous complete pack intact.
      if (controller.signal.aborted || epoch !== generation) throw fail("cancelled");
      const metadata = await caches.open(META);
      await metadata.put(COMMIT, json({ schema: 1, version: manifest.version, cache: cacheName, shell: shell.files, zip: true, savedBytes: manifest.totalBytes + manifestBytes + shell.bytes }));
      published = true;
      await metadata.put(MANIFEST, json(manifest));
      await metadata.delete(REMOVED);
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith(PREFIX + "pack-") && name !== cacheName).map((name) => caches.delete(name)));
      return await status(paths);
    } finally {
      clearTimeout(timer);
      if (cacheName && !published) await caches.delete(cacheName);
      if (operation === current) operation = null;
    }
  })();
  return current.done;
}

async function remove() {
  if (removing) return removing;
  generation++;
  const pending = operation;
  pending?.controller.abort();
  warmController?.abort();
  removing = (async () => {
    await pending?.done?.catch(() => {});
    await warming?.catch(() => {});
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(PREFIX)).map((name) => caches.delete(name)));
    // A tiny opt-out tombstone prevents background fetches immediately refilling it.
    await (await caches.open(META)).put(REMOVED, json({ removed: true }));
    return status([]);
  })();
  try { return await removing; } finally { removing = null; }
}

self.addEventListener("install", (event) => { if (PAGE_WORKER || ASSET_WORKER) event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", (event) => { if (PAGE_WORKER || ASSET_WORKER) event.waitUntil(self.clients.claim()); });

self.addEventListener("message", (event) => {
  // One writer/operation lock: asset-scope instances only read shared caches.
  if (!PAGE_WORKER) return;
  const data = event.data;
  if (!data || data.channel !== CHANNEL || !/^[a-f0-9-]{36}$/.test(data.id)) return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    try {
      const client = event.source?.id ? await self.clients.get(event.source.id) : null;
      if (!client || client.type !== "window" || !isStudio(new URL(client.url).pathname) || new URL(client.url).origin !== self.location.origin) throw fail("scope");
      if (data.type === "CLAIM") { await self.clients.claim(); return; }
      if (data.type === "CANCEL") {
        if (operation?.id === data.id && operation.clientId === client.id) operation.controller.abort();
        return;
      }
      if (!port) return;
      let value;
      if (data.type === "STATUS") value = await status(validatePaths(data.assets));
      else if (data.type === "WARM") {
        const paths = validatePaths(data.assets);
        if (!warming) warming = warm(paths).catch(() => {}).finally(() => { warming = null; });
        await warming;
        value = await status(paths);
      } else if (data.type === "DOWNLOAD") value = await download(data, client.id, port);
      else if (data.type === "REMOVE") value = await remove();
      else throw fail("message");
      port.postMessage({ type: "result", value });
    } catch (error) {
      port?.postMessage({ type: "error", code: error?.name === "QuotaExceededError" ? "storage" : error?.code || "network" });
    } finally { port?.close(); }
  })());
});

async function belongsToStudio(event, path) {
  // Worker bootstrap/install-metadata requests can have no Client or referrer.
  // These are fixed public assets, never filenames or user-selected URLs.
  if (APP_SHELL_FILES.has(path) || path === WORKER && event.request.destination === "worker") return true;
  // The browser selects this registration using the worker URL's scope. Its
  // module graph may be fetched before a Worker Client becomes observable.
  // Exact manifest membership and size/SHA checks still gate all codec reads.
  if (ASSET_WORKER && (path === MANIFEST && event.request.destination === ""
    || codecPath(path, "module") && ["script", "worker"].includes(event.request.destination)
    || codecPath(path, "wasm") && event.request.destination === "")) return true;
  const client = event.clientId ? await self.clients.get(event.clientId) : null;
  const value = client?.url || event.request.referrer;
  try {
    const url = new URL(value);
    return url.origin === self.location.origin && (isStudio(url.pathname) || url.pathname === WORKER || codecPath(url.pathname, "module"));
  } catch { return false; }
}

async function matchSaved(path) {
  const pack = await committed();
  const saved = pack && await pack.cache.match(path);
  if (saved) return saved;
  return caches.match(path, { cacheName: RUNTIME });
}

async function saveUsed(cacheName, path, response, epoch) {
  if (!PAGE_WORKER || removing || epoch !== generation || await metaValue(REMOVED)) return;
  const cache = await caches.open(cacheName);
  if (!removing && epoch === generation) await cache.put(path, response);
}

async function navigation() {
  if (online()) {
    try {
      const epoch = generation;
      const file = await fetchFile(STUDIO, 2_000_000);
      checkType(STUDIO, file.response);
      const response = savedResponse(file.bytes, file.response, await digest(file.bytes));
      try { await saveUsed(RUNTIME, STUDIO, response.clone(), epoch); } catch { /* Online use must survive storage denial. */ }
      return response;
    } catch { /* Offline/timeout: never substitute the site's home page. */ }
  }
  const saved = await matchSaved(STUDIO);
  return saved || new Response("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Image studio is not saved offline</title><h1>Reconnect to open Image Studio</h1><p>Open this tool online and choose Download offline pack before going offline.</p></html>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

async function assetRequest(event, path) {
  if (!await belongsToStudio(event, path)) return fetch(event.request);
  if (nextPath(path) || APP_SHELL_FILES.has(path)) {
    const cached = await matchSaved(path);
    if (cached) { checkType(path, cached); return cached; }
    if (!online()) return Response.error();
    const epoch = generation;
    const file = await fetchFile(path, shellFileLimit(path));
    checkType(path, file.response);
    const response = savedResponse(file.bytes, file.response, await digest(file.bytes));
    try { await saveUsed(RUNTIME, path, response.clone(), epoch); } catch { /* Cache is optional for online use. */ }
    return response;
  }
  let manifest;
  try { manifest = await getManifest(PAGE_WORKER && path === WORKER && online()); }
  catch { manifest = await storedManifest(); }
  const pack = await committed();
  if (path === MANIFEST) return manifest ? json(manifest) : pack ? json(pack.manifest) : Response.error();
  let asset = manifest?.assets.find((item) => item.url === path);
  if (!asset) { manifest = pack?.manifest; asset = manifest?.assets.find((item) => item.url === path); }
  if (!asset) return Response.error();
  const cacheName = PREFIX + "used-" + manifest.version;
  const candidates = [];
  if (pack?.manifest.version === manifest.version) candidates.push(await pack.cache.match(path));
  candidates.push(await caches.match(path, { cacheName }));
  for (const cached of candidates) {
    if (cached) {
      const bytes = await readBytes(cached.clone(), asset.bytes);
      if (bytes.byteLength === asset.bytes && await digest(bytes) === asset.sha256) return cached;
    }
  }
  if (!online()) return Response.error();
  const epoch = generation;
  const file = await fetchFile(path, asset.bytes);
  if (file.bytes.byteLength !== asset.bytes || await digest(file.bytes) !== asset.sha256) throw fail("integrity");
  const response = savedResponse(file.bytes, file.response, asset.sha256);
  try { await saveUsed(cacheName, path, response.clone(), epoch); } catch { /* No false ready flag on storage failure. */ }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (!PAGE_WORKER && !ASSET_WORKER) return;
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !/^https?:$/.test(url.protocol)) return;
  if (url.hash || url.username || url.password || request.headers.has("range") || request.headers.has("rsc")) return;
  if (request.mode === "navigate" && isStudio(url.pathname)) {
    if (PAGE_WORKER && !url.search) event.respondWith(navigation());
    return;
  }
  // Only canonical build/codec paths and the exact public install assets above.
  // RSC, APIs, user images, arbitrary queries, blobs and data URLs are excluded.
  const path = nextPath(request.url) || appShellPath(request.url) || localPath(request.url);
  if (!path) return;
  const codec = path === MANIFEST || ["worker", "module", "wasm", "license", "source"].some((kind) => codecPath(path, kind));
  if (ASSET_WORKER && !codec || !codec && !nextPath(path) && !APP_SHELL_FILES.has(path)) return;
  event.respondWith(assetRequest(event, path).catch(() => Response.error()));
});