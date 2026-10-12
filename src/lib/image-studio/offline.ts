/** Application files only. This module never accepts a File, Blob, filename,
 * image settings, API URL or user-selected download destination. */
export const IMAGE_STUDIO_OFFLINE_SCOPE = "/tools/image-compressor";
const ASSET_SCOPE = "/image-studio/";
const SCOPES = [IMAGE_STUDIO_OFFLINE_SCOPE, ASSET_SCOPE] as const;
const SCRIPT = "/image-studio-sw.js";
const CHANNEL = "image-studio-offline-v1";
const MAX_FILES = 256;

export interface ImageOfflineStatus {
  ready: boolean;
  reason: "ready" | "partial" | "outdated" | "incomplete" | "removed";
  version: string | null;
  codecBytes: number | null;
  savedBytes: number | null;
  hasSavedFiles: boolean;
}

export interface ImageOfflineProgress {
  phase: "preparing" | "codecs" | "shell" | "verifying";
  loadedBytes: number;
  totalBytes: number;
  completedFiles: number;
  totalFiles: number;
}

export class ImageOfflineError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "ImageOfflineError"; }
}

const messages: Record<string, string> = {
  unsupported: "Offline downloads are unavailable in this browser. The image tool can still be used online.",
  development: "Offline downloads are available in a production build, not the development server.",
  secure: "Offline downloads need HTTPS or localhost.",
  scope: "Open the image compressor page to manage its offline files.",
  control: "Both offline workers must be active. Reopen this tool online to finish offline setup.",
  offline: "Reconnect to download the complete offline pack.",
  manifest: "The codec manifest could not be validated. Reload online and retry.",
  integrity: "An application file failed its size or SHA-256 check. No new complete pack was saved.",
  incomplete: "Some saved files are missing. Reconnect and download the pack again.",
  size: "An application file exceeded the offline download safety limit.",
  shell: "The complete interface could not be saved. Reload online and retry.",
  changed: "The site was updated while this page was open. Reload online, then download again.",
  zip: "The ZIP export code could not be loaded. Reconnect and retry.",
  storage: "There is not enough browser storage, or storage is blocked. Free some space and retry.",
  busy: "An offline download is already running in another image studio tab.",
  timeout: "The offline operation timed out. Check your connection and retry.",
  network: "The download could not finish. Check your connection and available browser storage, then retry.",
};
const errorFor = (code: string) => new ImageOfflineError(code, messages[code] || messages.network);
const cancelled = () => new DOMException("Offline download cancelled.", "AbortError");

function supported() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("caches" in window) || typeof MessageChannel !== "function" || !globalThis.crypto?.subtle || typeof crypto.randomUUID !== "function") throw errorFor("unsupported");
  if (!window.isSecureContext) throw errorFor("secure");
  if (process.env.NODE_ENV !== "production") throw errorFor("development");
  if (![IMAGE_STUDIO_OFFLINE_SCOPE, IMAGE_STUDIO_OFFLINE_SCOPE + "/"].includes(location.pathname)) throw errorFor("scope");
}

function bounded<T>(promise: Promise<T>, milliseconds: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(cancelled()); };
    const timer = setTimeout(() => { cleanup(); reject(errorFor("timeout")); }, milliseconds);
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener("abort", abort, { once: true });
    promise.then((value) => { cleanup(); resolve(value); }, (error: unknown) => { cleanup(); reject(error); });
  });
}

const isOurWorker = (worker: ServiceWorker | null | undefined): worker is ServiceWorker => !!worker && worker.scriptURL === new URL(SCRIPT, location.origin).href;
const registeredOnline = new Set<string>();

async function registrationFor(scope: typeof SCOPES[number], allowRegistration: boolean): Promise<ServiceWorkerRegistration> {
  let registration = await bounded(navigator.serviceWorker.getRegistration(scope), 10_000);
  // getRegistration can return the normal site's broader registration. Never
  // use it, replace it, or register this script at the origin root.
  if (registration?.scope !== new URL(scope, location.origin).href) registration = undefined;
  if (allowRegistration && navigator.onLine && (!isOurWorker(registration?.active) || !registeredOnline.has(scope))) {
    try {
      registration = await bounded(navigator.serviceWorker.register(SCRIPT, {
        scope, updateViaCache: "none",
      }), 15_000);
      registeredOnline.add(scope);
    } catch {
      if (!registration || !isOurWorker(registration.active)) throw errorFor("control");
    }
  }
  if (!registration) throw errorFor(navigator.onLine ? "control" : "offline");
  if (registration.scope !== new URL(scope, location.origin).href) throw errorFor("control");
  return registration;
}

function activated(target: ServiceWorkerRegistration, controlsPage: boolean): Promise<ServiceWorker> {
  return new Promise((resolve, reject) => {
    const watched = new Set<ServiceWorker>();
    let claimSent: ServiceWorker | null = null;
    const timer = setTimeout(() => { cleanup(); reject(errorFor("control")); }, 15_000);
    const cleanup = () => {
      clearTimeout(timer);
      if (controlsPage) navigator.serviceWorker.removeEventListener("controllerchange", check);
      target.removeEventListener("updatefound", check);
      for (const worker of watched) worker.removeEventListener("statechange", check);
    };
    const check = () => {
      for (const worker of [target.installing, target.waiting, target.active]) {
        if (worker && !watched.has(worker)) { watched.add(worker); worker.addEventListener("statechange", check); }
      }
      // Do not resolve against an older active worker while its replacement
      // is installing. skipWaiting/activation are bounded, not polled.
      if (target.installing || target.waiting) return;
      if (!isOurWorker(target.active) || target.active?.state !== "activated") return;
      // The asset registration controls the real worker URL, not this window.
      if (!controlsPage || navigator.serviceWorker.controller === target.active) { cleanup(); resolve(target.active); }
      else if (claimSent !== target.active) {
        claimSent = target.active;
        try { target.active.postMessage({ channel: CHANNEL, type: "CLAIM", id: crypto.randomUUID() }); }
        catch { cleanup(); reject(errorFor("control")); }
      }
    };
    if (controlsPage) navigator.serviceWorker.addEventListener("controllerchange", check);
    target.addEventListener("updatefound", check);
    check();
  });
}

async function connection(allowRegistration: boolean): Promise<ServiceWorker> {
  supported();
  const [page, assets] = await Promise.all(SCOPES.map((scope) => registrationFor(scope, allowRegistration)));
  const [pageWorker, assetWorker] = await Promise.all([activated(page, true), activated(assets, false)]);
  if (page.active !== pageWorker || assets.active !== assetWorker || pageWorker.state !== "activated"
    || assetWorker.state !== "activated" || navigator.serviceWorker.controller !== pageWorker) throw errorFor("control");
  // All messages/writes go to the page registration; the asset SW only reads
  // their shared caches and serves the fixed worker's module/WASM graph.
  return pageWorker;
}

function buildAsset(value: string): string | null {
  try {
    const url = new URL(value, location.origin);
    if (url.origin !== location.origin || url.search && !/^\?dpl=[a-zA-Z0-9_-]{1,128}$/.test(url.search) || url.hash || url.username || url.password || /%(?!5[bBdD])/i.test(url.pathname)) return null;
    return /^\/_next\/static\/[a-zA-Z0-9_@.$%[\]()/~-]+\.(?:js|css|woff2?|ttf|otf)$/.test(url.pathname) ? url.pathname : null;
  } catch { return null; }
}

const observedAssets = new Set<string>();
const assetObservers = new Set<PerformanceObserver>();
function rememberAssets(entries: PerformanceEntry[]) {
  for (const entry of entries) {
    const path = buildAsset(entry.name);
    if (path && observedAssets.size <= MAX_FILES) observedAssets.add(path);
  }
}

/** Event-driven resource observation, not polling. Keeps lazy build chunks even
 * if the browser's default resource-timing buffer fills before a pack click. */
export function observeImageOfflineAssets(): () => void {
  if (typeof PerformanceObserver !== "function") return () => {};
  const observer = new PerformanceObserver((list) => rememberAssets(list.getEntries()));
  try { observer.observe({ type: "resource", buffered: true }); } catch { return () => {}; }
  assetObservers.add(observer);
  return () => { rememberAssets(observer.takeRecords()); observer.disconnect(); assetObservers.delete(observer); };
}

/** Build URLs only: neither DOM text, form values nor file-derived URLs cross
 * the message channel. Resource timing also catches the explicit lazy ZIP chunk. */
function pageAssets(): string[] {
  for (const observer of assetObservers) rememberAssets(observer.takeRecords());
  const paths = new Set(observedAssets);
  const add = (value: string) => { const path = buildAsset(value); if (path) paths.add(path); };
  for (const element of document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]")) {
    add(element instanceof HTMLScriptElement ? element.src : element.href);
  }
  for (const entry of performance.getEntriesByType("resource")) add(entry.name);
  if (paths.size > MAX_FILES) throw errorFor("shell");
  return [...paths];
}

function parseStatus(value: unknown): ImageOfflineStatus {
  if (!value || typeof value !== "object") throw errorFor("network");
  const status = value as ImageOfflineStatus;
  const bytes = (value: unknown) => value === null || typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 90_000_000;
  if (typeof status.ready !== "boolean" || typeof status.hasSavedFiles !== "boolean"
    || !["ready", "partial", "outdated", "incomplete", "removed"].includes(status.reason)
    || (status.version !== null && !/^[a-f0-9]{24}$/.test(status.version))
    || !bytes(status.codecBytes) || !bytes(status.savedBytes) || status.ready !== (status.reason === "ready")) throw errorFor("network");
  return status;
}

function parseProgress(value: unknown): ImageOfflineProgress | null {
  if (!value || typeof value !== "object") return null;
  const progress = value as ImageOfflineProgress;
  return ["preparing", "codecs", "shell", "verifying"].includes(progress.phase)
    && [progress.loadedBytes, progress.totalBytes, progress.completedFiles, progress.totalFiles].every((value) => Number.isSafeInteger(value) && value >= 0 && value <= 90_000_000) ? progress : null;
}

async function request(worker: ServiceWorker, type: "STATUS" | "WARM" | "DOWNLOAD" | "REMOVE", options: {
  signal?: AbortSignal; onProgress?: (progress: ImageOfflineProgress) => void;
} = {}): Promise<ImageOfflineStatus> {
  const id = crypto.randomUUID();
  const assets = type === "REMOVE" ? [] : pageAssets();
  const value = await new Promise<ImageOfflineStatus>((resolve, reject) => {
    const channel = new MessageChannel();
    const maximum = type === "DOWNLOAD" ? 195_000 : type === "WARM" || type === "REMOVE" ? 80_000 : 25_000;
    let settled = false;
    let idle: ReturnType<typeof setTimeout>;
    const deadline = setTimeout(() => finish(errorFor("timeout")), maximum);
    const abort = () => finish(cancelled());
    const finish = (error?: Error, value?: ImageOfflineStatus) => {
      if (settled) return;
      settled = true; clearTimeout(deadline); clearTimeout(idle);
      options.signal?.removeEventListener("abort", abort);
      if (error && type === "DOWNLOAD") {
        try { worker.postMessage({ channel: CHANNEL, type: "CANCEL", id }); } catch { /* Worker may have been terminated. */ }
      }
      channel.port1.close(); channel.port2.close();
      if (error) reject(error); else if (value) resolve(value);
    };
    const resetIdle = () => { clearTimeout(idle); idle = setTimeout(() => finish(errorFor("timeout")), type === "DOWNLOAD" ? 30_000 : maximum); };
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data as { type?: string; code?: string; value?: unknown } | null;
      if (!data) return;
      if (data.type === "progress") {
        const progress = parseProgress(data);
        if (progress) { resetIdle(); options.onProgress?.(progress); }
      } else if (data.type === "error") finish(data.code === "cancelled" ? cancelled() : errorFor(data.code || "network"));
      else if (data.type === "result") {
        try { finish(undefined, parseStatus(data.value)); } catch { finish(errorFor("network")); }
      }
    };
    channel.port1.onmessageerror = () => finish(errorFor("network"));
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener("abort", abort, { once: true });
    resetIdle();
    try { worker.postMessage({ channel: CHANNEL, id, type, assets, ...(type === "DOWNLOAD" ? { zip: true } : {}) }, [channel.port2]); }
    catch { finish(errorFor("network")); }
  });
  // A scope may have been removed/replaced during a download or verification.
  // Never publish ready from the cache marker alone; this check cannot register.
  if (value.ready && await connection(false) !== worker) throw errorFor("control");
  return value;
}

/** Registers only the page and worker-asset scopes. Offline reload reuses both
 * registrations with a local STATUS message: no update, manifest fetch or polling. */
export async function initializeImageOffline(): Promise<ImageOfflineStatus> {
  const worker = await connection(true);
  return request(worker, navigator.onLine ? "WARM" : "STATUS");
}

export async function getImageOfflineStatus(): Promise<ImageOfflineStatus> {
  return request(await connection(false), "STATUS");
}

export async function downloadImageOfflinePack(options: {
  signal: AbortSignal; onProgress?: (progress: ImageOfflineProgress) => void;
}): Promise<ImageOfflineStatus> {
  if (!navigator.onLine) throw errorFor("offline");
  const worker = await bounded(connection(true), 30_000, options.signal);
  // Only this explicit user action warms ZIP. Its script request cannot be
  // cancelled by import(), but abort prevents starting/publishing a codec pack.
  try { await bounded(import("fflate"), 25_000, options.signal); }
  catch (error) { if (options.signal.aborted) throw cancelled(); if (error instanceof ImageOfflineError) throw error; throw errorFor("zip"); }
  if (options.signal.aborted) throw cancelled();
  return request(worker, "DOWNLOAD", options);
}

export async function removeImageOfflinePack(): Promise<ImageOfflineStatus> {
  return request(await connection(false), "REMOVE");
}