"use client";

/* Blob previews are already sanitized by the local worker. Never route them
 * through Next Image, a server optimizer, a canvas fallback, or remote codecs. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent, FocusEvent } from "react";
import { ArrowDownToLine, Check, ChevronRight, Crop, Download, FileImage, FolderOpen, Gauge, Image as ImageIcon, Link2, Loader2, LockKeyhole, Plus, RotateCcw, Save, Share2, ShieldCheck, SlidersHorizontal, Square, Trash2, Upload, X } from "lucide-react";
import { StudioPool, deviceLimits } from "@/lib/image-studio/client";
import type { ImageInspection, ImageResult } from "@/lib/image-studio/protocol";
import { DEFAULT_SETTINGS, IMAGE_LIMITS } from "@/lib/image-studio/types";
import type { ByteUnit, CropRect, ImageSettings, Mode } from "@/lib/image-studio/types";
import { serializeSettingsQuery, validateSettings } from "@/lib/image-studio/settings";
import { formatBytes, parseTarget, savings, UNIT_BYTES } from "@/lib/image-studio/bytes";
import { canShareImage, downloadZip, namedDownloads, requestDownload, saveToFolder, shareImage, supportsFolderSave } from "@/lib/image-studio/downloads";
import type { DownloadItem } from "@/lib/image-studio/downloads";
import { CUSTOM_PRESET_LIMIT, CUSTOM_PRESET_STORAGE_KEY, USE_CASE_PRESETS, parseCustomPresets, parseWorkspaceSettingsQuery, sanitizePresetName, settingsOnly } from "@/lib/image-studio/presets";
import type { CustomPreset } from "@/lib/image-studio/presets";
import { ImageCompare } from "./image-compare";
import { ImageCropDialog } from "./image-crop-dialog";
import type { CropAspect } from "./image-crop-dialog";
import "./image-studio-workspace.css";

type Status = "inspecting" | "ready" | "processing" | "done" | "error" | "cancelled";
interface StoredResult { value: ImageResult; url: string; referenceUrl: string; settings: ImageSettings; receipt: string; filename: string }
interface QueueItem {
  id: string; file: File; status: Status; progress: number; stage: string;
  inspection: ImageInspection | null; previewUrl: string | null; crop: CropRect | null;
  result: StoredResult | null; error: string | null; exportSelected: boolean;
}
interface Job { controller: AbortController; epoch: number; kind: "inspect" | "process" }
type NumericSetting = "targetValue" | "quality" | "minQuality" | "width" | "height" | "percent" | "longestSide" | "pngLevel";
type FormErrors = Partial<Record<keyof ImageSettings | "general", string>>;
interface Estimate { id: string; status: "measuring" | "done" | "error"; size?: number; width?: number; height?: number; format?: string; error?: string }
interface CropRequest { id: string; image: { name: string; width: number; height: number; previewUrl: string; crop: CropRect | null }; aspect: CropAspect }
const ACCEPT = ".jpg,.jpeg,.png,.webp,.avif,.heic,.heif,.gif,.bmp,image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,image/gif,image/bmp";
const RETAINED_BYTES = 200_000_000;
const exactBytes = (bytes: number) => `${bytes.toLocaleString("en-US")} bytes`;
const errorMessage = (error: unknown) => error instanceof Error ? error.message.slice(0, 400) : "The local operation failed. Try a smaller image or another format.";
const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";
const displayFormat = (format: string) => format === "jpeg" ? "JPG" : format === "webp" ? "WebP" : format.toUpperCase();
const retainedBytes = (items: QueueItem[]) => items.reduce((total, item) => total + (item.inspection?.preview.size ?? 0) + (item.result ? item.result.value.blob.size + item.result.value.reference.size : 0), 0);
function releaseResult(result: StoredResult | null) { if (result) { URL.revokeObjectURL(result.url); URL.revokeObjectURL(result.referenceUrl); } }
function releaseItem(item: QueueItem) { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); releaseResult(item.result); }
function downloadItem(item: QueueItem): DownloadItem | null { return item.result ? { name: item.result.filename, blob: item.result.value.blob, format: item.result.value.format } : null; }

function formValidation(input: ImageSettings): { settings: ImageSettings | null; errors: FormErrors } {
  const errors: FormErrors = {};
  try { parseTarget(input); } catch { errors.targetValue = "Enter a whole-byte ceiling from 5,000 to 100,000,000 bytes (5 KB–100 MB)."; }
  const integer = (key: NumericSetting, min: number, max: number, label: string) => {
    if (!Number.isSafeInteger(input[key]) || input[key] < min || input[key] > max) errors[key] = `${label}: use a whole number from ${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}.`;
  };
  integer("quality", 1, 100, "Quality"); integer("minQuality", 1, 95, "Minimum quality");
  integer("width", 1, IMAGE_LIMITS.maxDimension, "Width"); integer("height", 1, IMAGE_LIMITS.maxDimension, "Height");
  integer("longestSide", 1, IMAGE_LIMITS.maxDimension, "Longest side"); integer("percent", 1, 1000, "Resize percent"); integer("pngLevel", 0, 6, "PNG effort");
  if (!errors.minQuality && input.minQuality > input.quality) errors.minQuality = "Minimum quality cannot exceed quality. Lower the minimum or raise quality.";
  if (input.mode === "resize" && input.resizeMode === "none") errors.resizeMode = "Choose dimensions, a percentage or a longest side for Resize mode.";
  if (Object.keys(errors).length) return { settings: null, errors };
  try { return { settings: validateSettings(input), errors }; }
  catch (error) { return { settings: null, errors: { general: errorMessage(error) } }; }
}

function focusSetting(key: string) {
  requestAnimationFrame(() => {
    const element = document.getElementById(`studio-setting-${key}`) ?? document.getElementById("studio-settings-title");
    element?.focus(); element?.scrollIntoView({ block: "center", behavior: "instant" });
  });
}

function textEditing(target: EventTarget | null) {
  return target instanceof HTMLElement && (!!target.closest("input, textarea, select") || target.isContentEditable || !!target.closest('[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'));
}

export function ImageCompressorTool() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef<QueueItem[]>([]);
  const [settings, setSettings] = useState<ImageSettings>(() => ({ ...DEFAULT_SETTINGS }));
  const settingsRef = useRef<ImageSettings>({ ...DEFAULT_SETTINGS });
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [exportBusy, setExportBusy] = useState(false);
  const exportBusyRef = useRef(false);
  const [message, setMessage] = useState("Add images to begin. Nothing is uploaded.");
  const [inputErrors, setInputErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const [presets, setPresets] = useState<CustomPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [cropRequest, setCropRequest] = useState<CropRequest | null>(null);
  const [capabilities, setCapabilities] = useState({ folderInput: false, folderSave: false, maxPixels: IMAGE_LIMITS.pixels as number, concurrency: 1 });
  const [workspaceVisible, setWorkspaceVisible] = useState(true);
  const [dockHeight, setDockHeight] = useState(100);
  const mounted = useRef(false);
  const epoch = useRef(0);
  const revision = useRef(0);
  const batchSerial = useRef(0);
  const jobs = useRef(new Map<string, Job>());
  const pool = useRef<StudioPool | null>(null);
  const estimateController = useRef<AbortController | null>(null);
  const estimateSerial = useRef(0);
  const workspace = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const browseInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const clearDialog = useRef<HTMLDialogElement>(null);
  const clearCancel = useRef<HTMLButtonElement>(null);
  const clearReturnFocus = useRef<HTMLElement | null>(null);

  // Refs are authoritative only inside events/async callbacks. A completion must
  // own its exact job token, lifetime epoch and queue id before touching state.
  const updateQueue = useCallback((update: (current: QueueItem[]) => QueueItem[]) => {
    queueRef.current = update(queueRef.current);
    if (mounted.current) setQueue(queueRef.current);
  }, []);

  const live = useCallback((id: string, job: Job) => mounted.current && epoch.current === job.epoch
    && jobs.current.get(id) === job && !job.controller.signal.aborted && queueRef.current.some(item => item.id === id), []);

  const cancelEstimate = useCallback(() => {
    estimateSerial.current++; estimateController.current?.abort(); estimateController.current = null;
    if (mounted.current) setEstimate(null);
  }, []);

  const chooseActive = useCallback((id: string | null) => {
    if (id !== null && activeIdRef.current === id) return;
    cancelEstimate(); activeIdRef.current = id; setActiveId(id);
  }, [cancelEstimate]);

  const stopProcessing = useCallback((includeInspections: boolean) => {
    batchSerial.current++; busyRef.current = false; setBusy(false); cancelEstimate();
    const cancelled = new Set<string>();
    for (const [id, job] of jobs.current) {
      if (includeInspections || job.kind === "process") {
        jobs.current.delete(id); cancelled.add(id); job.controller.abort();
      }
    }
    updateQueue(items => items.map(item => cancelled.has(item.id) ? { ...item, status: "cancelled", progress: 0, stage: "Cancelled. Retry when ready.", error: null } : item));
  }, [cancelEstimate, updateQueue]);

  const replaceSettings = useCallback((next: ImageSettings) => {
    if (exportBusyRef.current) return;
    const previous = settingsRef.current;
    if ((Object.keys(DEFAULT_SETTINGS) as (keyof ImageSettings)[]).every(key => Object.is(previous[key], next[key]))) return;
    const hadResults = queueRef.current.some(item => item.result) || busyRef.current;
    stopProcessing(false); revision.current++;
    settingsRef.current = { ...next, crop: null }; setSettings(settingsRef.current); setRecipeId(""); setShareLink("");
    for (const item of queueRef.current) releaseResult(item.result);
    updateQueue(items => items.map(item => item.result ? { ...item, result: null, status: "ready", progress: 0, stage: "Settings changed. Compress again.", error: null } : item));
    if (hadResults) setMessage("Settings changed. Active compression was cancelled and previous outputs were cleared. Compress again for current results.");
  }, [stopProcessing, updateQueue]);

  const changeSettings = useCallback((patch: Partial<ImageSettings>) => replaceSettings({ ...settingsRef.current, ...patch, crop: null }), [replaceSettings]);

  const inspectItem = useCallback(async (id: string) => {
    const item = queueRef.current.find(entry => entry.id === id), currentPool = pool.current;
    if (!item || !currentPool || !mounted.current) return;
    const job: Job = { controller: new AbortController(), epoch: epoch.current, kind: "inspect" };
    jobs.current.set(id, job);
    try {
      const inspection = await currentPool.inspect(item.file, job.controller.signal, (progress, stage) => {
        if (live(id, job)) updateQueue(items => items.map(entry => entry.id === id ? { ...entry, progress, stage } : entry));
      });
      if (!live(id, job)) return;
      if (retainedBytes(queueRef.current) + inspection.preview.size > RETAINED_BYTES) throw new Error("The 200 MB retained-preview/output safety budget is full. Remove some images or clear the queue, then retry.");
      const previewUrl = URL.createObjectURL(inspection.preview);
      updateQueue(items => items.map(entry => entry.id === id ? { ...entry, inspection, previewUrl, status: "ready", progress: 1, stage: "Inspected locally. Ready to compress.", error: null } : entry));
    } catch (error) {
      if (live(id, job)) updateQueue(items => items.map(entry => entry.id === id ? { ...entry, status: "error", progress: 0, stage: "Inspection failed", error: errorMessage(error) } : entry));
    } finally { if (jobs.current.get(id) === job) jobs.current.delete(id); }
  }, [live, updateQueue]);

  const addFiles = useCallback((files: File[]) => {
    if (!mounted.current || !files.length) return;
    const additions: QueueItem[] = [], problems: string[] = [];
    let bytes = queueRef.current.reduce((total, item) => total + item.file.size, 0), rejected = 0;
    for (const file of files) {
      let reason = "";
      if (queueRef.current.length + additions.length >= IMAGE_LIMITS.batchFiles) reason = "50-file queue limit reached";
      else if (file.name.length > 4096) reason = "the source filename exceeds the safe filename length";
      else if (!file.size || file.size > IMAGE_LIMITS.fileBytes) reason = "choose a non-empty file up to 50 MB";
      else if (bytes + file.size > IMAGE_LIMITS.batchBytes) reason = "200 MB input-batch safety limit reached";
      if (reason) { rejected++; if (problems.length < 5) problems.push(`${file.name}: ${reason}.`); continue; }
      bytes += file.size;
      additions.push({ id: crypto.randomUUID(), file, status: "inspecting", progress: 0, stage: "Waiting for local inspection", inspection: null, previewUrl: null, crop: null, result: null, error: null, exportSelected: true });
    }
    if (rejected > problems.length) problems.push(`${rejected - problems.length} more files were not added because of the same resource limits.`);
    setInputErrors(problems);
    if (!additions.length) return;
    updateQueue(items => [...items, ...additions]);
    if (!activeIdRef.current) chooseActive(additions[0].id);
    setMessage(`${additions.length} image${additions.length === 1 ? "" : "s"} added; checking signatures and metadata locally.${busyRef.current ? " These additions are not part of the running batch." : ""}`);
    for (const item of additions) void inspectItem(item.id);
  }, [chooseActive, inspectItem, updateQueue]);

  const startBatch = useCallback(async (scope: "all" | "failed" | "selected" = "all") => {
    if (!mounted.current || busyRef.current || exportBusyRef.current || !pool.current) return;
    const validation = formValidation(settingsRef.current);
    if (!validation.settings) { setMessage("Fix the highlighted settings before starting. No image jobs were started."); focusSetting(Object.keys(validation.errors)[0]); return; }
    let selected = queueRef.current.filter(item => scope === "all" || (scope === "failed" ? item.status === "error" : item.id === activeIdRef.current));
    if (!selected.length) { setMessage(scope === "failed" ? "There are no failed images to retry." : "Add and select an image first."); return; }
    if (selected.some(item => jobs.current.get(item.id)?.kind === "inspect")) { setMessage("Let the local inspection finish before compressing these images."); return; }
    if (validation.settings.format === "jpeg" && !validation.settings.allowJpegTransparency && selected.some(item => item.inspection?.hasAlpha)) {
      setMessage("JPG needs explicit permission to flatten transparency. Choose a background and allow flattening, or use PNG, WebP or AVIF."); focusSetting("allowJpegTransparency"); return;
    }
    const currentPool = pool.current, snapshot = validation.settings, run = ++batchSerial.current, lifetime = epoch.current;
    const ids = new Set(selected.map(item => item.id));
    busyRef.current = true; setBusy(true); cancelEstimate();
    for (const item of selected) releaseResult(item.result);
    // Do not retain last run's Blobs in the async batch closure after clearing
    // their URLs; the retained-output budget must not hide those old buffers.
    selected = selected.map(item => ({ ...item, result: null }));
    updateQueue(items => items.map(item => ids.has(item.id) ? { ...item, result: null, status: "processing", progress: 0, stage: "Waiting for a local worker", error: null } : item));
    setMessage(`Compressing ${selected.length} image${selected.length === 1 ? "" : "s"} with a fixed settings snapshot. Changing settings cancels this work.`);

    await Promise.allSettled(selected.map(async item => {
      const job: Job = { controller: new AbortController(), epoch: lifetime, kind: "process" };
      jobs.current.set(item.id, job);
      try {
        if (!item.inspection) {
          const inspection = await currentPool.inspect(item.file, job.controller.signal, (progress, stage) => {
            if (live(item.id, job)) updateQueue(items => items.map(entry => entry.id === item.id ? { ...entry, progress: progress * 0.15, stage } : entry));
          });
          if (!live(item.id, job)) return;
          if (retainedBytes(queueRef.current) + inspection.preview.size > RETAINED_BYTES) throw new Error("The 200 MB preview/output memory budget is full. Remove some images before retrying.");
          const previewUrl = URL.createObjectURL(inspection.preview);
          updateQueue(items => items.map(entry => entry.id === item.id ? { ...entry, inspection, previewUrl } : entry));
        }
        if (!live(item.id, job)) return;
        const jobSettings = validateSettings({ ...snapshot, crop: item.crop });
        const value = await currentPool.process(item.file, jobSettings, job.controller.signal, (progress, stage) => {
          if (live(item.id, job)) updateQueue(items => items.map(entry => entry.id === item.id ? { ...entry, progress: item.inspection ? progress : 0.15 + progress * 0.85, stage } : entry));
        });
        if (!live(item.id, job) || run !== batchSerial.current) return;
        if (retainedBytes(queueRef.current) + value.blob.size + value.reference.size > RETAINED_BYTES) throw new Error("This result would exceed the 200 MB retained-preview/output limit. It was not retained. Download existing results, remove some images, then retry.");
        const reserved = queueRef.current.filter(entry => entry.result).map(entry => downloadItem(entry)!);
        const filename = namedDownloads([...reserved, { name: item.file.name, format: value.format, blob: value.blob }]).at(-1)!.filename;
        const receipt = crypto.randomUUID();
        const url = URL.createObjectURL(value.blob);
        let referenceUrl: string;
        try { referenceUrl = URL.createObjectURL(value.reference); } catch (error) { URL.revokeObjectURL(url); throw error; }
        const result: StoredResult = { value, url, referenceUrl, settings: jobSettings, receipt, filename };
        updateQueue(items => items.map(entry => entry.id === item.id ? { ...entry, result, status: "done", progress: 1, stage: "Output bytes verified", error: null } : entry));
      } catch (error) {
        if (live(item.id, job)) updateQueue(items => items.map(entry => entry.id === item.id ? { ...entry, status: isAbort(error) ? "cancelled" : "error", progress: 0, stage: "No output retained", error: errorMessage(error) } : entry));
      } finally { if (jobs.current.get(item.id) === job) jobs.current.delete(item.id); }
    }));
    if (!mounted.current || epoch.current !== lifetime || batchSerial.current !== run) return;
    busyRef.current = false; setBusy(false);
    const finished = queueRef.current.filter(item => ids.has(item.id));
    setMessage(`Batch finished: ${finished.filter(item => item.result).length} ready, ${finished.filter(item => item.status === "error").length} failed, ${finished.filter(item => item.status === "cancelled").length} cancelled. Downloads are never started automatically.`);
  }, [cancelEstimate, live, updateQueue]);

  const disposeWorkspace = useCallback((currentPool: StudioPool) => {
    // These are lifetime counters, not DOM refs: invalidate their latest values
    // before aborting so late completions cannot re-enter an unmounted view.
    mounted.current = false; epoch.current++; batchSerial.current++; estimateSerial.current++;
    estimateController.current?.abort(); estimateController.current = null;
    for (const job of jobs.current.values()) job.controller.abort(); jobs.current.clear();
    currentPool.dispose(); if (pool.current === currentPool) pool.current = null;
    for (const item of queueRef.current) releaseItem(item); queueRef.current = [];
  }, []);

  useEffect(() => {
    mounted.current = true; const lifetime = ++epoch.current;
    const currentPool = new StudioPool(); pool.current = currentPool;
    queueMicrotask(() => {
      if (!mounted.current || epoch.current !== lifetime) return;
      const limits = deviceLimits();
      setCapabilities({ folderInput: "webkitdirectory" in document.createElement("input"), folderSave: supportsFolderSave(), maxPixels: limits.maxPixels, concurrency: limits.concurrency });
      const notices: string[] = [];
      try {
        const stored = parseCustomPresets(localStorage.getItem(CUSTOM_PRESET_STORAGE_KEY));
        if (stored) setPresets(stored); else notices.push("Saved presets were invalid and were not restored.");
      } catch { notices.push("Browser storage is unavailable. The tool still works without saved presets."); }
      if (window.location.search) {
        const parsed = parseWorkspaceSettingsQuery(window.location.search);
        if (parsed) {
          settingsRef.current = settingsOnly(parsed); setSettings(settingsRef.current);
          notices.push(parsed.crop ? "Link settings loaded. Per-image crop coordinates were not applied; crop a selected image explicitly." : "Validated settings loaded from the link. Add images to use them.");
        } else notices.push("The settings link contains invalid, duplicate or unknown fields. Default settings were kept.");
      }
      if (notices.length) setMessage(notices.join(" "));
    });
    return () => disposeWorkspace(currentPool);
  }, [disposeWorkspace]);

  useEffect(() => {
    const root = workspace.current, actionBar = dock.current;
    if (!root || !actionBar) return;
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
      if (mounted.current) setWorkspaceVisible(entries[0]?.isIntersecting ?? true);
    }) : null;
    observer?.observe(root);
    const resize = typeof ResizeObserver === "function" ? new ResizeObserver(entries => {
      if (mounted.current) setDockHeight(Math.max(88, Math.ceil(entries[0]?.borderBoxSize?.[0]?.blockSize ?? actionBar.getBoundingClientRect().height)));
    }) : null;
    resize?.observe(actionBar);
    return () => { observer?.disconnect(); resize?.disconnect(); };
  }, []);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || textEditing(event.target) || workspace.current?.querySelector("dialog[open]")) return;
      const files = Array.from(event.clipboardData?.items ?? []).filter(item => item.kind === "file").map(item => item.getAsFile()).filter((file): file is File => file !== null);
      if (files.length) { event.preventDefault(); addFiles(files); }
    };
    const keyboard = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.altKey && !event.repeat && !event.isComposing && !workspace.current?.querySelector("dialog[open]")) {
        event.preventDefault(); void startBatch("all");
      }
    };
    window.addEventListener("paste", paste); window.addEventListener("keydown", keyboard);
    return () => { window.removeEventListener("paste", paste); window.removeEventListener("keydown", keyboard); };
  }, [addFiles, startBatch]);

  const validation = useMemo(() => formValidation(settings), [settings]);
  const selected = queue.find(item => item.id === activeId) ?? null;
  const selectedFile = selected?.file, selectedCrop = selected?.crop, selectedInspection = selected?.inspection;

  useEffect(() => {
    if (!previewEnabled || !activeId || !selectedFile || !selectedInspection || !validation.settings || busy || exportBusy || cropRequest
      || settings.format === "png" || (settings.format === "jpeg" && selectedInspection.hasAlpha && !settings.allowJpegTransparency)) return;
    const controller = new AbortController(), serial = ++estimateSerial.current, generation = revision.current, lifetime = epoch.current;
    const snapshot = validateSettings({ ...validation.settings, mode: "quality", crop: selectedCrop ?? null });
    const current = () => mounted.current && epoch.current === lifetime && revision.current === generation && estimateSerial.current === serial
      && activeIdRef.current === activeId && !busyRef.current && !exportBusyRef.current && !controller.signal.aborted
      && queueRef.current.some(item => item.id === activeId && item.crop === selectedCrop);
    const timer = setTimeout(async () => {
      if (!current() || !pool.current) return;
      estimateController.current = controller;
      setEstimate({ id: activeId, status: "measuring" });
      try {
        // Deliberately store ONLY measurement numbers. The preview's encoded Blob
        // is discarded, never used as a final result, persisted or downloaded.
        const result = await pool.current.process(selectedFile, snapshot, controller.signal);
        if (current()) setEstimate({ id: activeId, status: "done", size: result.blob.size, width: result.width, height: result.height, format: result.format });
      } catch (error) { if (current() && !isAbort(error)) setEstimate({ id: activeId, status: "error", error: errorMessage(error) }); }
      finally { if (estimateController.current === controller) estimateController.current = null; }
    }, 900);
    return () => { clearTimeout(timer); controller.abort(); if (estimateController.current === controller) estimateController.current = null; };
  }, [activeId, selectedFile, selectedCrop, selectedInspection, validation.settings, settings.format, settings.allowJpegTransparency, previewEnabled, busy, exportBusy, cropRequest]);

  function inputChanged(event: ChangeEvent<HTMLInputElement>) { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }
  function drop(event: DragEvent<HTMLButtonElement>) { event.preventDefault(); dragDepth.current = 0; setDragActive(false); addFiles(Array.from(event.dataTransfer.files)); }

  function cancelAll() {
    if (exportBusyRef.current) return;
    setPreviewEnabled(false); stopProcessing(true);
    setMessage("All active image work cancelled; live estimation is now off. Completed outputs remain available. Retry images or re-enable estimation when ready.");
  }

  function cancelFile(id: string) {
    const job = jobs.current.get(id); if (!job) return;
    jobs.current.delete(id); job.controller.abort();
    if (activeIdRef.current === id) cancelEstimate();
    updateQueue(items => items.map(item => item.id === id ? { ...item, status: "cancelled", progress: 0, stage: "Cancelled. Select and compress again to retry.", error: null } : item));
    setMessage("Image operation cancelled. Other images in the batch continue.");
  }

  function removeFile(id: string) {
    if (exportBusyRef.current) return;
    const item = queueRef.current.find(entry => entry.id === id); if (!item) return;
    const job = jobs.current.get(id); jobs.current.delete(id); job?.controller.abort(); releaseItem(item);
    updateQueue(items => items.filter(entry => entry.id !== id));
    if (activeIdRef.current === id) chooseActive(queueRef.current[0]?.id ?? null);
    setMessage("Image removed; its in-memory previews and outputs were released.");
    requestAnimationFrame(() => (document.getElementById(`studio-select-${activeIdRef.current}`) ?? document.getElementById("image-dropzone"))?.focus());
  }

  function clearAll() {
    if (exportBusyRef.current) return;
    stopProcessing(true); epoch.current++;
    for (const item of queueRef.current) releaseItem(item);
    updateQueue(() => []); chooseActive(null); setInputErrors([]); setCropRequest(null);
    clearDialog.current?.close(); setMessage("Queue cleared. Image bytes and preview URLs were released; your original files are unchanged.");
    requestAnimationFrame(() => document.getElementById("image-dropzone")?.focus());
  }

  function openCrop(aspect: CropAspect = "free") {
    const item = queueRef.current.find(entry => entry.id === activeIdRef.current);
    if (!item?.inspection || !item.previewUrl || exportBusyRef.current) return;
    cancelEstimate();
    setCropRequest({ id: item.id, image: { name: item.file.name, width: item.inspection.width, height: item.inspection.height, previewUrl: item.previewUrl, crop: item.crop }, aspect });
  }

  function applyCrop(crop: CropRect | null) {
    if (!cropRequest || exportBusyRef.current) return;
    const item = queueRef.current.find(entry => entry.id === cropRequest.id);
    if (!item) { setCropRequest(null); return; }
    const job = jobs.current.get(item.id); jobs.current.delete(item.id); job?.controller.abort();
    cancelEstimate(); releaseResult(item.result);
    updateQueue(items => items.map(entry => entry.id === item.id ? { ...entry, crop, result: null, status: "ready", progress: 0, stage: "Crop changed. Compress this image again.", error: null } : entry));
    setCropRequest(null); setMessage("Crop applied only to the selected image. Its previous output was cleared; other images and their crops are unchanged.");
  }

  function applyRecipe(id: string) {
    const recipe = USE_CASE_PRESETS.find(preset => preset.id === id); if (!recipe) return;
    replaceSettings(settingsOnly(recipe.settings)); setRecipeId(id);
    setMessage(`${recipe.label} settings applied. Existing per-image crops are unchanged. Review requirements before compressing; presets do not certify compliance.`);
  }

  function savePreset() {
    const current = formValidation(settingsRef.current), name = sanitizePresetName(presetName);
    if (!current.settings) { setMessage("Fix invalid settings before saving a preset."); focusSetting(Object.keys(current.errors)[0]); return; }
    if (!name) { setMessage("Enter a preset name using letters, numbers, spaces or basic punctuation."); return; }
    if (presets.length >= CUSTOM_PRESET_LIMIT) { setMessage("Five presets are already saved. Remove one before adding another."); return; }
    if (presets.some(preset => preset.name.toLowerCase() === name.toLowerCase())) { setMessage("That preset name already exists. Choose another name or remove the existing preset."); return; }
    const next = [...presets, { name, settings: settingsOnly(current.settings) }];
    try { localStorage.setItem(CUSTOM_PRESET_STORAGE_KEY, JSON.stringify(next)); setPresets(next); setPresetName(""); setMessage(`Preset “${name}” saved on this browser. No images, source filenames or crops were stored.`); }
    catch { setMessage("This browser did not allow the preset to be saved. Your images and current settings are still available in this tab."); }
  }

  function removePreset(name: string) {
    const next = presets.filter(preset => preset.name !== name);
    try { if (next.length) localStorage.setItem(CUSTOM_PRESET_STORAGE_KEY, JSON.stringify(next)); else localStorage.removeItem(CUSTOM_PRESET_STORAGE_KEY); setPresets(next); setMessage("Saved preset removed."); }
    catch { setMessage("Browser storage is unavailable; the saved preset could not be removed."); }
  }

  async function copySettingsLink() {
    const current = formValidation(settingsRef.current); if (!current.settings) return;
    const url = new URL(window.location.href); url.search = serializeSettingsQuery(settingsOnly(current.settings)); url.hash = "image-tool";
    const link = url.toString(), lifetime = epoch.current, generation = revision.current; setShareLink(link);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(link);
      if (mounted.current && epoch.current === lifetime && revision.current === generation) setMessage("Settings link copied. It contains settings only, not images, source filenames or per-image crops.");
    } catch {
      if (!mounted.current || epoch.current !== lifetime || revision.current !== generation) return;
      setMessage("Clipboard access was unavailable. The read-only settings link is selected; copy it manually.");
      requestAnimationFrame(() => { linkInput.current?.focus(); linkInput.current?.select(); });
    }
  }

  async function exportImages(kind: "single" | "zip" | "folder" | "share", id?: string) {
    if (exportBusyRef.current) return;
    const completed = queueRef.current.filter(item => item.result);
    const entries = completed.filter(item => id ? item.id === id : item.exportSelected);
    const items = entries.map(item => downloadItem(item)!);
    if (!items.length) { setMessage("Select at least one completed image for export."); return; }
    if (kind === "single") {
      try { requestDownload(items[0].blob, entries[0].result!.filename); setMessage("Download requested. Your browser controls the save location and completion."); }
      catch (error) { setMessage(errorMessage(error)); }
      return;
    }
    const lifetime = epoch.current;
    exportBusyRef.current = true; setExportBusy(true); cancelEstimate();
    try {
      if (kind === "zip") {
        setMessage("Preparing a local ZIP of the selected outputs…"); await downloadZip(items);
        if (mounted.current && epoch.current === lifetime) setMessage(`Download requested for a ZIP containing ${items.length} images. Browser download completion is not verified.`);
      } else if (kind === "folder") {
        // No await before the picker: preserve the original user gesture.
        const count = await saveToFolder(items);
        if (mounted.current && epoch.current === lifetime) setMessage(`${count} file${count === 1 ? "" : "s"} saved to your chosen folder. Existing filenames were not overwritten.`);
      } else {
        await shareImage(items[0]);
        if (mounted.current && epoch.current === lifetime) setMessage("Image handed to the system share service. Delivery to another app is not verified.");
      }
    } catch (error) {
      if (mounted.current && epoch.current === lifetime) setMessage(isAbort(error) ? "Export cancelled. No save or delivery completion is assumed." : errorMessage(error));
    } finally { exportBusyRef.current = false; if (mounted.current) setExportBusy(false); }
  }

  function keepFocusVisible(event: FocusEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest("dialog") || dock.current?.contains(target)) return;
    requestAnimationFrame(() => {
      const actionBar = dock.current;
      if (!mounted.current || !target.isConnected || !actionBar || getComputedStyle(actionBar).position !== "fixed") return;
      const bottom = target.getBoundingClientRect().bottom, top = actionBar.getBoundingClientRect().top;
      if (bottom > top - 16) window.scrollBy({ top: bottom - top + 24, behavior: "instant" });
    });
  }

  const completed = queue.filter(item => item.result);
  const outputNames = new Map(completed.map(item => [item.id, item.result!.filename]));
  const selectedOutputs = completed.filter(item => item.exportSelected);
  const outputTotal = completed.reduce((total, item) => total + item.result!.value.blob.size, 0);
  const inputTotal = queue.reduce((total, item) => total + item.file.size, 0);
  const completedInputTotal = completed.reduce((total, item) => total + item.file.size, 0);
  const inspecting = queue.some(item => item.status === "inspecting");
  const activeWork = queue.some(item => item.status === "inspecting" || item.status === "processing");
  const missingConsent = settings.format === "jpeg" && !settings.allowJpegTransparency && queue.some(item => item.inspection?.hasAlpha);
  const selectedShareItem = selected ? downloadItem(selected) : null;
  const shareAvailable = selectedShareItem ? canShareImage(selectedShareItem) : false;
  const disableStart = !queue.length || busy || exportBusy || inspecting || !validation.settings || missingConsent;
  const failedCount = queue.filter(item => item.status === "error").length;

  return (
    <div id="image-tool" className="image-studio-workspace" ref={workspace} style={{ "--studio-dock-height": `${dockHeight}px` } as CSSProperties} onFocusCapture={keepFocusVisible}>
      <div className="studio-workspace-topline"><span><ShieldCheck size={17} aria-hidden="true" /> On-device image workspace</span><span>No uploads. No account. Your originals stay untouched.</span></div>
      <div className="studio-live-message" role="status" aria-live="polite" aria-atomic="true"><span className="studio-status-dot" aria-hidden="true" />{message}</div>
      <div className="studio-layout">
        <div className="studio-content">
          <section className="studio-card studio-import-card" aria-labelledby="studio-import-title">
            <div className="studio-section-heading"><div><p className="studio-eyebrow">01 / Your images</p><h2 id="studio-import-title">Make room for better images.</h2></div><span className="studio-badge"><LockKeyhole size={13} aria-hidden="true" /> Local processing</span></div>
            <button type="button" id="image-dropzone" className={`studio-dropzone${dragActive ? " is-dragging" : ""}`} onClick={() => browseInput.current?.click()}
              onDragEnter={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); dragDepth.current++; setDragActive(true); } }}
              onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }}
              onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragActive(false); }} onDrop={drop}
              aria-describedby="studio-drop-help studio-safety-limits">
              <span className="studio-upload-icon"><Upload size={28} aria-hidden="true" /></span>
              <strong>{dragActive ? "Drop to add these images" : "Drop images here, or browse files"}</strong>
              <span>JPG, PNG, WebP, AVIF, HEIC, GIF & BMP</span>
              <span className="studio-drop-cta"><Plus size={16} aria-hidden="true" /> Choose images <ChevronRight size={16} aria-hidden="true" /></span>
            </button>
            <input type="file" hidden ref={browseInput} multiple accept={ACCEPT} onChange={inputChanged} aria-label="Choose image files" />
            {capabilities.folderInput && <input type="file" hidden multiple accept={ACCEPT} aria-label="Choose an image folder" ref={element => { folderInput.current = element; element?.setAttribute("webkitdirectory", ""); }} onChange={inputChanged} />}
            <div className="studio-import-footer"><p id="studio-drop-help">Or paste images with <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>V</kbd>. Adding files never replaces the queue.</p>
              {capabilities.folderInput && <button type="button" className="studio-button studio-button-small" onClick={() => folderInput.current?.click()}><FolderOpen size={16} aria-hidden="true" /> Add folder</button>}
            </div>
            <p className="studio-caption" id="studio-safety-limits">Up to 50 files · 50 MB/file · 200 MB of inputs · {capabilities.maxPixels / 1_000_000} MP/image on this device. These are browser safety limits, not paid quotas. Animated inputs use a still frame; decode limitations appear with each image.</p>
            {inputErrors.length > 0 && <div className="studio-error" role="alert"><strong>Some files were not added</strong><ul>{inputErrors.map((error, index) => <li key={index}>{error}</li>)}</ul><button type="button" className="studio-button studio-button-small" onClick={() => setInputErrors([])}>Dismiss</button></div>}
          </section>

          <section className="studio-card" aria-labelledby="studio-queue-title">
            <div className="studio-section-heading"><div><p className="studio-eyebrow">Queue</p><h2 id="studio-queue-title">{queue.length ? `${queue.length} image${queue.length === 1 ? "" : "s"} · ${formatBytes(inputTotal)}` : "Your image queue"}</h2></div>
              <div className="studio-inline-actions"><button type="button" className="studio-icon-button" onClick={() => browseInput.current?.click()} aria-label="Add more images"><Plus size={19} aria-hidden="true" /></button>
                <button type="button" className="studio-button studio-button-small" disabled={!queue.length || exportBusy} onClick={event => { clearReturnFocus.current = event.currentTarget; clearDialog.current?.showModal(); clearCancel.current?.focus(); }}><Trash2 size={15} aria-hidden="true" /> Clear all</button></div>
            </div>
            {!queue.length ? <div className="studio-empty-queue"><FileImage size={32} aria-hidden="true" /><p>One image or a whole batch.</p><span>Check sizes, crop a selected image, and download only the results you want.</span></div> : (
              <><div className="studio-queue-actions"><label className="studio-check"><input type="checkbox" checked={queue.every(item => item.exportSelected)} onChange={event => updateQueue(items => items.map(item => ({ ...item, exportSelected: event.target.checked })))} disabled={exportBusy} /><span>Select all for export</span></label>
                {failedCount > 0 && <button type="button" className="studio-button studio-button-small" disabled={busy || exportBusy || !validation.settings} onClick={() => void startBatch("failed")}><RotateCcw size={15} aria-hidden="true" /> Retry failed ({failedCount})</button>}
              </div>
              <ul className="studio-queue-list">{queue.map(item => <QueueCard key={item.id} item={item} active={item.id === activeId} outputName={outputNames.get(item.id)} locked={exportBusy}
                onSelect={() => chooseActive(item.id)} onToggle={checked => updateQueue(items => items.map(entry => entry.id === item.id ? { ...entry, exportSelected: checked } : entry))}
                onCancel={() => cancelFile(item.id)} onRemove={() => removeFile(item.id)} onDownload={() => void exportImages("single", item.id)} />)}</ul></>
            )}
            {queue.length > 0 && <p className="studio-caption studio-queue-footnote">Progress reports planned stages, not remaining time. {capabilities.concurrency} worker{capabilities.concurrency === 1 ? "" : "s"} maximum; pixel budgets may reduce concurrency. Retained previews + outputs: {formatBytes(retainedBytes(queue))} / 200 MB.</p>}
          </section>

          <section className="studio-card studio-results-card" aria-labelledby="studio-results-title">
            <div className="studio-section-heading"><div><p className="studio-eyebrow">02 / Real results</p><h2 id="studio-results-title">Review before you download.</h2></div><span className="studio-badge">{completed.length} ready</span></div>
            {completed.length > 0 && <>
              <div className="studio-stats"><Stat label="Completed originals" value={formatBytes(completedInputTotal)} detail={exactBytes(completedInputTotal)} /><Stat label="Actual outputs" value={formatBytes(outputTotal)} detail={exactBytes(outputTotal)} /><Stat label={outputTotal > completedInputTotal ? "Batch grew" : "Batch saved"} value={`${Math.abs(savings(completedInputTotal, outputTotal).percent).toFixed(1)}%`} detail={`${formatBytes(Math.abs(completedInputTotal - outputTotal))} ${outputTotal > completedInputTotal ? "larger" : "smaller"}`} warning={outputTotal > completedInputTotal} /></div>
              <div className="studio-export-bar"><span>{selectedOutputs.length} completed image{selectedOutputs.length === 1 ? "" : "s"} selected for export</span><div className="studio-inline-actions">
                <button type="button" className="studio-button studio-button-primary" disabled={!selectedOutputs.length || exportBusy} onClick={() => void exportImages("zip")}><Download size={16} aria-hidden="true" /> {exportBusy ? "Export in progress…" : "Download ZIP"}</button>
                {capabilities.folderSave && <button type="button" className="studio-button" disabled={!selectedOutputs.length || exportBusy} onClick={() => void exportImages("folder")}><FolderOpen size={16} aria-hidden="true" /> Save to folder</button>}
              </div></div>
            </>}
            {selected ? <>
              <div className="studio-selected-header"><div><span className="studio-caption">Selected image</span><h3 className="studio-break-name">{selected.file.name}</h3></div><div className="studio-inline-actions">
                <button type="button" className="studio-button studio-button-small" disabled={!selected.inspection || !selected.previewUrl || exportBusy || busy} onClick={() => openCrop()}><Crop size={16} aria-hidden="true" /> {selected.crop ? "Edit crop" : "Crop"}</button>
                <button type="button" className="studio-button studio-button-small" disabled={busy || exportBusy || !validation.settings || selected.status === "inspecting"} onClick={() => void startBatch("selected")}><RotateCcw size={16} aria-hidden="true" /> Compress again</button>
              </div></div>
              {selected.result ? <><ResultDetails item={selected} outputName={outputNames.get(selected.id) ?? ""} locked={exportBusy} onDownload={() => void exportImages("single", selected.id)}
                onShare={shareAvailable ? () => void exportImages("share", selected.id) : undefined} onChange={changeSettings} />
                <ImageCompare key={selected.result.receipt} result={selected.result.value} outputUrl={selected.result.url} referenceUrl={selected.result.referenceUrl} filename={selected.file.name} /></>
                : <div className="studio-selected-preview">{selected.previewUrl ? <img src={selected.previewUrl} alt={`Metadata-free inspection preview of ${selected.file.name}`} /> : <ImageIcon size={40} aria-hidden="true" />}<p>{selected.status === "processing" ? "The worker is measuring actual encoded results…" : selected.status === "error" ? selected.error : selected.crop ? "A crop is set for this image. Compress again to see its correctly cropped comparison." : "This is an inspection preview. Compress to see measured results and a before/after comparison."}</p></div>}
            </> : <div className="studio-empty-results"><div className="studio-empty-comparison" aria-hidden="true"><ImageIcon size={32} /><span /><ImageIcon size={32} /></div><p>Smaller files. The details are yours to judge.</p><span>After compression, compare the actual output with a matching pre-encode reference. No simulated savings.</span></div>}
          </section>
        </div>

        <aside className="studio-controls studio-card" aria-labelledby="studio-settings-title">
          <div className="studio-section-heading"><div><p className="studio-eyebrow">Your controls</p><h2 id="studio-settings-title" tabIndex={-1}><SlidersHorizontal size={19} aria-hidden="true" /> Compression settings</h2></div></div>
          <div className="studio-desktop-submit">
            <button type="button" className="studio-button studio-button-primary studio-compress-button" disabled={disableStart} onClick={() => void startBatch("all")}>{busy ? <Loader2 size={18} className="studio-spin" aria-hidden="true" /> : <ArrowDownToLine size={18} aria-hidden="true" />}{busy ? "Compressing…" : "Compress images"}</button>
            <p className="studio-caption">{!validation.settings ? "Fix the highlighted settings below." : missingConsent ? "Allow JPG transparency flattening below, or choose another format." : inspecting ? "Checking the queued files before compression." : "Ctrl / ⌘ + Enter to compress the current queue."}</p>
            {activeWork && <button type="button" className="studio-button studio-button-small" disabled={exportBusy} onClick={cancelAll}><Square size={15} aria-hidden="true" /> Cancel all</button>}
          </div>
          <fieldset className="studio-controls-fieldset" disabled={exportBusy}>
            <legend className="studio-sr-only">Image settings</legend>
            <label className="studio-field"><span>Start with a use case</span><select value={recipeId} onChange={event => applyRecipe(event.target.value)}><option value="" disabled>Choose an editable starting point</option>{USE_CASE_PRESETS.map(preset => <option key={preset.id} value={preset.id}>{preset.label} — {preset.description}</option>)}</select></label>
            <p className="studio-caption">Seven editable starting points, not official compliance guarantees. Confirm your destination’s requirements.</p>
            {recipeId === "application" && <button type="button" className="studio-button studio-button-small" disabled={!selected?.inspection || busy} onClick={() => openCrop("3:4")}><Crop size={15} aria-hidden="true" /> Optional 3:4 crop for selected image</button>}
            <SettingsControls settings={settings} errors={validation.errors} missingConsent={missingConsent} onChange={changeSettings} />
            <div className="studio-estimate-box"><label className="studio-check"><input type="checkbox" checked={previewEnabled} onChange={event => { setPreviewEnabled(event.target.checked); cancelEstimate(); }} /><span><Gauge size={15} aria-hidden="true" /> Live size estimate</span></label>
              <p className="studio-caption">A debounced, measured quality-mode encode of the selected image, not the final target-search result. Preview bytes are discarded; nothing is stored.</p>
              <p className="studio-estimate-value" role="status">{busy || exportBusy ? "Paused during compression or export." : !previewEnabled ? "Live estimation is off." : settings.format === "png" ? "PNG has no quality slider. Compress to measure its optimized output." : !validation.settings ? "Fix settings to enable an estimate." : !selected?.inspection ? "Select an inspected image for a measured preview." : settings.format === "jpeg" && selected.inspection.hasAlpha && !settings.allowJpegTransparency ? "Allow JPEG transparency flattening or choose another format." : estimate?.id === activeId && estimate.status === "done" ? `${formatBytes(estimate.size!)} (${exactBytes(estimate.size!)}) · ${displayFormat(estimate.format!)} · ${estimate.width} × ${estimate.height} — measured preview, not final` : estimate?.id === activeId && estimate.status === "error" ? `Preview unavailable: ${estimate.error}` : estimate?.id === activeId && estimate.status === "measuring" ? "Measuring a local preview…" : "Estimate starts after a short pause in editing."}</p>
            </div>
            <div className="studio-privacy-policy"><ShieldCheck size={21} aria-hidden="true" /><div><strong>Source metadata removal · always on</strong><p>EXIF, GPS and camera metadata are discarded on re-encode. Working pixels are 8-bit sRGB; original wide-gamut / HDR profiles are not retained. Browser color conversion can vary.</p></div></div>
            <details className="studio-saved-settings"><summary><Save size={16} aria-hidden="true" /> Save or share settings</summary>
              <p className="studio-caption">Only presets you explicitly save stay on this browser. No image bytes, source filenames or per-image crops enter browser storage or links.</p>
              <label className="studio-field"><span>Custom preset name</span><input type="text" maxLength={80} value={presetName} onChange={event => setPresetName(event.target.value)} autoComplete="off" placeholder="e.g. Product photos" /></label>
              <button type="button" className="studio-button" onClick={savePreset} disabled={!validation.settings || !presetName.trim() || presets.length >= CUSTOM_PRESET_LIMIT}><Save size={15} aria-hidden="true" /> Save preset ({presets.length}/5)</button>
              {presets.length > 0 && <ul className="studio-preset-list">{presets.map(preset => <li key={preset.name}><button type="button" onClick={() => { replaceSettings(settingsOnly(preset.settings)); setMessage(`Saved preset “${preset.name}” loaded. Review settings, then compress.`); }}>{preset.name}</button><button type="button" className="studio-icon-button" onClick={() => removePreset(preset.name)} aria-label={`Remove saved preset ${preset.name}`}><Trash2 size={15} aria-hidden="true" /></button></li>)}</ul>}
              <button type="button" className="studio-button" onClick={() => void copySettingsLink()} disabled={!validation.settings}><Link2 size={16} aria-hidden="true" /> Copy settings link</button>
              {shareLink && <label className="studio-field"><span>Settings-only link · select to copy</span><input readOnly ref={linkInput} value={shareLink} onFocus={event => event.currentTarget.select()} /></label>}
            </details>
            <button type="button" className="studio-button studio-reset-settings" onClick={() => replaceSettings({ ...DEFAULT_SETTINGS })}><RotateCcw size={15} aria-hidden="true" /> Reset settings (keep images & crops)</button>
          </fieldset>
        </aside>
      </div>

      <div ref={dock} className={`studio-actionbar${workspaceVisible ? " is-visible" : ""}`}>
        <div className="studio-action-context"><strong>{busy ? "Working locally…" : inspecting ? "Inspecting images…" : `${queue.length} image${queue.length === 1 ? "" : "s"} in your queue`}</strong><span>{!validation.settings ? "Fix highlighted settings to continue." : missingConsent ? "JPG transparency needs your consent." : "Your files never leave this device."}</span></div>
        <div className="studio-inline-actions">{activeWork && <button type="button" className="studio-button" disabled={exportBusy} onClick={cancelAll}><Square size={15} aria-hidden="true" /> Cancel all</button>}
          <button type="button" className="studio-button studio-button-primary studio-compress-button" disabled={disableStart} onClick={() => void startBatch("all")}>{busy ? <Loader2 size={18} className="studio-spin" aria-hidden="true" /> : <ArrowDownToLine size={18} aria-hidden="true" />}{busy ? "Compressing…" : "Compress images"}<span className="studio-shortcut" aria-hidden="true">⌘ / Ctrl ↵</span></button></div>
      </div>
      <dialog className="studio-dialog studio-confirm-dialog" ref={clearDialog} aria-labelledby="studio-clear-title" aria-describedby="studio-clear-description" onClose={() => { if (clearReturnFocus.current?.isConnected) clearReturnFocus.current.focus(); }}>
        <h2 id="studio-clear-title">Clear all images?</h2><p id="studio-clear-description">Active work will stop and all in-memory previews and outputs will be released. Download anything you want to keep first. Original files and saved presets are unchanged.</p>
        <div className="studio-dialog-actions"><button type="button" ref={clearCancel} className="studio-button" onClick={() => clearDialog.current?.close()}>Keep images</button><button type="button" className="studio-button studio-button-danger" onClick={clearAll}>Clear all images</button></div>
      </dialog>
      {cropRequest && <ImageCropDialog key={cropRequest.id} image={cropRequest.image} initialAspect={cropRequest.aspect} onClose={() => setCropRequest(null)} onApply={applyCrop} />}
    </div>
  );
}

function NumberField({ name, label, value, min, max, step = 1, error, onChange }: {
  name: NumericSetting; label: string; value: number; min: number; max: number; step?: number | "any"; error?: string; onChange: (value: number) => void;
}) {
  const id = `studio-setting-${name}`;
  return <div className="studio-field"><label htmlFor={id}>{label}</label><input id={id} type="number" inputMode={step === "any" ? "decimal" : "numeric"}
    min={min} max={max} step={step} value={Number.isFinite(value) ? value : ""} onChange={event => onChange(event.target.value.trim() === "" ? NaN : Number(event.target.value))}
    aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />{error && <span className="studio-field-error" id={`${id}-error`}>{error}</span>}</div>;
}

function SettingsControls({ settings, errors, missingConsent, onChange }: {
  settings: ImageSettings; errors: FormErrors; missingConsent: boolean; onChange: (patch: Partial<ImageSettings>) => void;
}) {
  const targetMode = settings.mode === "target" || settings.mode === "auto";
  const smallest = settings.mode === "auto" && settings.autoPreference === "smallest";
  const modes: { value: Mode; label: string; description: string }[] = [
    { value: "target", label: "Target", description: "Search for a measured byte ceiling" },
    { value: "quality", label: "Quality", description: "Encode at your chosen quality" },
    { value: "resize", label: "Resize", description: "Set dimensions and encode" },
    { value: "auto", label: "Auto", description: "Compare eligible output formats" },
  ];
  let targetBytes: number | null = null;
  try { targetBytes = parseTarget(settings); } catch { /* The linked target error is shown below. */ }
  function qualityChanged(quality: number) {
    const patch: Partial<ImageSettings> = { quality };
    if (Number.isSafeInteger(quality) && quality >= 1 && quality <= 100 && settings.minQuality > quality) patch.minQuality = Math.min(95, quality);
    onChange(patch);
  }

  return <>
    <div className="studio-mode-switch" role="group" aria-label="Compression mode">{modes.map(mode => <button key={mode.value} type="button" aria-pressed={settings.mode === mode.value} title={mode.description}
      onClick={() => onChange({ mode: mode.value, format: mode.value === "auto" ? "auto" : settings.format === "auto" ? "webp" : settings.format, ...(mode.value === "resize" && settings.resizeMode === "none" ? { resizeMode: "longest" } : {}) })}>{mode.label}</button>)}</div>
    <p className="studio-mode-description">{settings.mode === "target" ? "Meet a size ceiling by searching quality and, if allowed, reducing dimensions. A byte target is a ceiling, never a promise of exact equality."
      : settings.mode === "quality" ? "Encode at the selected quality, with your optional crop and resize. No byte-ceiling search is performed."
      : settings.mode === "resize" ? "Resize to your chosen geometry, then encode at the selected quality. This mode does not chase a byte ceiling."
      : "Measure JPG, WebP and AVIF candidates and select using the policy below. Quality numbers from different codecs are not visually equivalent."}</p>
    {Object.keys(errors).length > 0 && <div className="studio-error studio-settings-errors" role="alert"><strong>Check these settings</strong><ul>{Object.entries(errors).map(([key, error]) => <li key={key}><a href={`#studio-setting-${key}`} onClick={event => { event.preventDefault(); focusSetting(key); }}>{error}</a></li>)}</ul></div>}

    <label className="studio-field"><span>Output format</span><select id="studio-setting-format" value={settings.format} onChange={event => {
      const format = event.target.value as ImageSettings["format"];
      onChange({ format, mode: format === "auto" ? "auto" : settings.mode === "auto" ? "target" : settings.mode });
    }}><option value="webp">WebP — photos & web graphics</option><option value="jpeg">JPG — broad compatibility</option><option value="png">PNG — lossless working pixels</option><option value="avif">AVIF — efficient, more CPU work</option><option value="auto">Auto — compare JPG / WebP / AVIF</option></select></label>
    {settings.format === "avif" && <p className="studio-caption">AVIF encoding can take longer. Downloads work even if your browser cannot display an AVIF preview.</p>}
    {settings.mode === "auto" && <div className="studio-control-group"><label className="studio-field"><span>Auto selection policy</span><select value={settings.autoPreference} onChange={event => onChange({ autoPreference: event.target.value as ImageSettings["autoPreference"] })}><option value="balanced">Balanced — dimensions, sampled error, then bytes</option><option value="smallest">Smallest — minimum-quality encodes, then bytes</option></select></label>
      <p className="studio-caption">{smallest ? "Smallest tests each eligible format at the minimum quality below. It chooses the smallest measured passing file, or the smallest observed miss. It may sacrifice visible detail."
        : "Balanced prefers candidates under the target with the largest pixel area, then the lowest sampled decoded RGBA error, then fewer bytes. This metric is not an objective perceptual score."} Comparison covers completed codecs, not an exhaustive optimum. Transparent images exclude JPG unless you explicitly allow flattening.</p></div>}

    {(targetMode || errors.targetValue) && <div className="studio-control-group">
      <div className="studio-section-heading"><h3>Target size</h3><span className="studio-caption">At or below</span></div>
      {!targetMode && <p className="studio-caption">The shared settings require a valid stored ceiling even outside Target / Auto mode. It will not be used for this encode.</p>}
      <div className="studio-target-fields"><NumberField name="targetValue" label="Maximum file size" value={settings.targetValue} min={IMAGE_LIMITS.targetMinBytes / UNIT_BYTES[settings.unit]} max={IMAGE_LIMITS.maxOutputBytes / UNIT_BYTES[settings.unit]} step="any" error={errors.targetValue} onChange={targetValue => onChange({ targetValue })} />
        <label className="studio-field"><span>Unit</span><select id="studio-setting-unit" value={settings.unit} onChange={event => onChange({ unit: event.target.value as ByteUnit })}>{(["KB", "KiB", "MB", "MiB"] as const).map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></label></div>
      <div className="studio-quick-targets" role="group" aria-label="Quick target ceilings">{([{ value: 20, unit: "KB" }, { value: 50, unit: "KB" }, { value: 100, unit: "KB" }, { value: 200, unit: "KB" }, { value: 500, unit: "KB" }, { value: 1, unit: "MB" }] as const).map(item => <button key={`${item.value}${item.unit}`} type="button" aria-pressed={settings.targetValue === item.value && settings.unit === item.unit}
        onClick={() => onChange({ targetValue: item.value, unit: item.unit, mode: settings.mode === "auto" ? "auto" : "target" })}>{item.value} {item.unit}</button>)}</div>
      <p className="studio-caption">{targetBytes === null ? "Enter a valid byte ceiling to continue." : `Ceiling: ${exactBytes(targetBytes)}.`} KB = 1,000 bytes; KiB = 1,024. MB = 1,000,000; MiB = 1,048,576. The downloaded Blob’s exact bytes determine success.</p>
      <label className="studio-check"><input type="checkbox" checked={settings.preserveDimensions} onChange={event => onChange({ preserveDimensions: event.target.checked })} /><span>Preserve dimensions during target search</span></label>
      <p className="studio-caption">Your explicit crop / resize still applies. When unchecked, the target search may shrink further; when checked, an unreachable target is reported honestly.</p>
    </div>}

    {((settings.format !== "png" && !smallest) || errors.quality || errors.minQuality) && <div className="studio-control-group">
      <div className="studio-section-heading"><h3>{targetMode ? "Maximum quality" : "Output quality"}</h3><span className="studio-quality-value">{Number.isFinite(settings.quality) ? settings.quality : "—"}</span></div>
      {settings.format !== "png" && <input type="range" min={1} max={100} step={1} value={Number.isFinite(settings.quality) ? settings.quality : 80} onChange={event => qualityChanged(Number(event.target.value))} aria-label="Encoder quality slider" aria-describedby="studio-quality-help" />}
      <NumberField name="quality" label="Quality (1–100)" value={settings.quality} min={1} max={100} error={errors.quality} onChange={qualityChanged} />
      <p id="studio-quality-help" className="studio-caption">Quality is an encoder setting, not a measured percent of visual fidelity. Lowering it also lowers the minimum if needed. {targetMode ? "Target searches cap the upper quality at 95; use Quality mode for 96–100." : "Lossy output may still be larger than its source."}</p>
    </div>}
    {((targetMode && settings.format !== "png") || errors.minQuality) && <div className="studio-control-group"><NumberField name="minQuality" label={smallest ? "Auto encoding quality / minimum (1–95)" : "Minimum acceptable quality (1–95)"} value={settings.minQuality} min={1} max={95} error={errors.minQuality} onChange={minQuality => onChange({ minQuality })} />
      <p className="studio-caption">{smallest ? "Smallest encodes at this value for each codec; equal numbers do not mean equal visual quality." : "The target search will not lower encoder quality below this value."} The minimum must not exceed maximum quality.</p></div>}

    {settings.format === "png" && <div className="studio-control-group"><h3>PNG optimization</h3><p className="studio-caption">PNG has no quality slider. Optimization is lossless relative to cropped / resized 8-bit working pixels unless palette reduction is enabled.</p>
      <label className="studio-field"><span>Optimization effort (0–6)</span><select id="studio-setting-pngLevel" value={settings.pngLevel} onChange={event => onChange({ pngLevel: Number(event.target.value) })}>{[0, 1, 2, 3, 4, 5, 6].map(level => <option key={level} value={level}>{level}{level === 0 ? " — fastest" : level === 2 ? " — balanced" : level === 6 ? " — slowest, most effort" : ""}</option>)}</select></label>
      <label className="studio-field"><span>Palette reduction (lossy when enabled)</span><select value={settings.paletteColors} onChange={event => onChange({ paletteColors: Number(event.target.value) })}><option value={0}>Disabled — keep working colors</option>{[16, 64, 128, 256].map(colors => <option key={colors} value={colors}>{colors} colors — lossy reduction</option>)}</select></label>
      {settings.paletteColors > 0 && <p className="studio-notice">Palette reduction changes colors and can create visible banding. Review the actual output before downloading.</p>}
    </div>}

    <div className="studio-control-group"><h3>Resize</h3><label className="studio-field"><span>Resize method</span><select id="studio-setting-resizeMode" value={settings.resizeMode} onChange={event => onChange({ resizeMode: event.target.value as ImageSettings["resizeMode"] })} aria-invalid={!!errors.resizeMode} aria-describedby={errors.resizeMode ? "studio-setting-resizeMode-error" : undefined}>
      <option value="none" disabled={settings.mode === "resize"}>No explicit resize</option><option value="dimensions">Width & height</option><option value="percent">Percentage</option><option value="longest">Longest side</option></select>{errors.resizeMode && <span id="studio-setting-resizeMode-error" className="studio-field-error">{errors.resizeMode}</span>}</label>
      {(settings.resizeMode === "dimensions" || errors.width || errors.height) && <><div className="studio-two-fields"><NumberField name="width" label="Width (px)" value={settings.width} min={1} max={IMAGE_LIMITS.maxDimension} error={errors.width} onChange={width => onChange({ width })} /><NumberField name="height" label="Height (px)" value={settings.height} min={1} max={IMAGE_LIMITS.maxDimension} error={errors.height} onChange={height => onChange({ height })} /></div>
        <label className="studio-check"><input type="checkbox" checked={settings.lockAspect} onChange={event => onChange({ lockAspect: event.target.checked })} /><span>Lock aspect ratio — fit inside these dimensions</span></label><p className="studio-caption">{settings.lockAspect ? "Width and height are a bounding box, not a crop. Each image keeps its own aspect ratio." : "Unlocked dimensions can stretch the image. No-upscale still caps each dimension at its source size."}</p></>}
      {(settings.resizeMode === "percent" || errors.percent) && <NumberField name="percent" label="Scale (%)" value={settings.percent} min={1} max={1000} error={errors.percent} onChange={percent => onChange({ percent })} />}
      {(settings.resizeMode === "longest" || errors.longestSide) && <NumberField name="longestSide" label="Longest side (px)" value={settings.longestSide} min={1} max={IMAGE_LIMITS.maxDimension} error={errors.longestSide} onChange={longestSide => onChange({ longestSide })} />}
      <label className="studio-check"><input type="checkbox" checked={settings.allowUpscale} onChange={event => onChange({ allowUpscale: event.target.checked })} /><span>Allow upscaling smaller images</span></label><p className="studio-caption">Off by default. Upscaling does not restore lost detail. Crop is edited separately for each selected image, before resizing.</p>
    </div>

    {(settings.format === "jpeg" || settings.format === "auto") && <div className="studio-control-group"><h3>Transparency & JPG background</h3>
      <label className="studio-check"><input id="studio-setting-allowJpegTransparency" type="checkbox" checked={settings.allowJpegTransparency} onChange={event => onChange({ allowJpegTransparency: event.target.checked })} aria-invalid={missingConsent} aria-describedby="studio-transparency-help" /><span>I allow transparent pixels to be flattened for JPG</span></label>
      <label className="studio-field studio-color-field"><span>JPG background color</span><input type="color" value={settings.background} onChange={event => onChange({ background: event.target.value })} /><span>{settings.background}</span></label>
      <p id="studio-transparency-help" className={missingConsent ? "studio-field-error" : "studio-caption"}>{missingConsent ? "A queued image has transparency. JPG cannot preserve it; explicit consent is required before the batch starts." : "This permission applies only to JPG output. Auto excludes JPG for transparent images unless checked. PNG, WebP and AVIF can retain transparency."}</p>
    </div>}
  </>;
}

function QueueCard({ item, active, outputName, locked, onSelect, onToggle, onCancel, onRemove, onDownload }: {
  item: QueueItem; active: boolean; outputName?: string; locked: boolean;
  onSelect: () => void; onToggle: (checked: boolean) => void; onCancel: () => void; onRemove: () => void; onDownload: () => void;
}) {
  const running = item.status === "inspecting" || item.status === "processing";
  const statusLabels: Record<Status, string> = { inspecting: "Inspecting", ready: "Ready", processing: "Processing", done: "Complete", error: "Failed", cancelled: "Cancelled" };
  const notices = item.inspection?.notices ?? [];
  return <li className={`studio-queue-card${active ? " is-active" : ""}`}>
    <div className="studio-queue-card-top"><label className="studio-export-check"><input type="checkbox" checked={item.exportSelected} onChange={event => onToggle(event.target.checked)} disabled={locked} /><span className="studio-sr-only">Select {item.file.name} for export</span></label>
      <button type="button" className="studio-queue-select" id={`studio-select-${item.id}`} onClick={onSelect} aria-pressed={active}>
        <span className="studio-thumbnail">{item.previewUrl ? <img src={item.previewUrl} alt="" loading="lazy" draggable={false} /> : <FileImage size={23} aria-hidden="true" />}</span>
        <span className="studio-queue-file"><strong>{item.file.name}</strong><span>{formatBytes(item.file.size)}{item.inspection ? ` · ${item.inspection.width.toLocaleString("en-US")} × ${item.inspection.height.toLocaleString("en-US")} · ${displayFormat(item.inspection.format)}` : " · awaiting inspection"}</span><span className="studio-caption">{active ? "Selected for preview & crop" : "Select to preview & crop"}</span></span>
      </button>
      <button type="button" className="studio-icon-button" onClick={onRemove} disabled={locked} aria-label={`Remove ${item.file.name}`}><X size={17} aria-hidden="true" /></button>
    </div>
    <div className="studio-queue-badges"><span className={`studio-badge${item.status === "error" ? " studio-badge-warning" : item.status === "done" ? " studio-badge-good" : ""}`}>{running && <Loader2 size={12} className="studio-spin" aria-hidden="true" />}{statusLabels[item.status]}</span>
      {item.crop && <span className="studio-badge"><Crop size={12} aria-hidden="true" /> Crop set for this image</span>}
      {item.inspection && <span className={`studio-badge${item.inspection.gps || item.inspection.cameraSerial ? " studio-badge-warning" : ""}`}><ShieldCheck size={12} aria-hidden="true" />{item.inspection.gps ? "GPS found · removed on export" : item.inspection.cameraSerial ? "Camera serial found · removed on export" : !item.inspection.metadataRead ? "Metadata scan limited" : "Source metadata stripped on export"}</span>}
      {item.inspection?.hasAlpha && <span className="studio-badge">Transparency</span>}
    </div>
    {running && <div className="studio-file-progress"><progress max={1} value={item.progress} aria-label={`${statusLabels[item.status]} progress for ${item.file.name}`} /><div><span>{item.stage}</span><span>{Math.round(item.progress * 100)}%</span></div><button type="button" className="studio-button studio-button-small" onClick={onCancel} disabled={locked}><Square size={12} aria-hidden="true" /> Cancel this image</button></div>}
    {item.error && <p className="studio-field-error">{item.error}</p>}
    {item.status === "cancelled" && <p className="studio-caption">Cancelled, not failed. Select this image and use Compress again, or run the batch.</p>}
    {item.result && <div className="studio-queue-output"><div><strong>{formatBytes(item.result.value.blob.size)}</strong><span>{exactBytes(item.result.value.blob.size)} · {displayFormat(item.result.value.format)}</span><span className="studio-output-filename">{outputName}</span></div><button type="button" className="studio-button studio-button-small" onClick={onDownload} disabled={locked} aria-label={`Download optimized ${item.file.name}`}><Download size={15} aria-hidden="true" /> Download</button></div>}
    {(notices.length > 0 || (item.inspection && !item.inspection.metadataRead)) && <details className="studio-file-notices"><summary>Inspection & privacy notes</summary><ul>{!item.inspection?.metadataRead && <li>The source metadata scan was incomplete. Absence of a GPS warning does not prove the source has no private metadata; re-encoding still discards source metadata.</li>}{item.inspection?.cameraSerial && <li>A camera serial marker was found. Its value is not displayed or stored in settings.</li>}{notices.map((notice, index) => <li key={index}>{notice}</li>)}</ul></details>}
  </li>;
}

function ResultDetails({ item, outputName, locked, onDownload, onShare, onChange }: {
  item: QueueItem; outputName: string; locked: boolean; onDownload: () => void; onShare?: () => void; onChange: (patch: Partial<ImageSettings>) => void;
}) {
  const stored = item.result!;
  const result = stored.value, reduction = savings(item.file.size, result.blob.size);
  // Never trust a rounded display size or a status flag to label target success.
  const targetMet = result.targetBytes === null ? null : result.blob.size <= result.targetBytes;
  return <div className="studio-result-details">
    <div className="studio-stats"><Stat label="Original file" value={formatBytes(item.file.size)} detail={exactBytes(item.file.size)} /><Stat label="Actual output" value={formatBytes(result.blob.size)} detail={exactBytes(result.blob.size)} /><Stat label={reduction.savedBytes < 0 ? "Larger, not smaller" : "Size reduction"} value={`${Math.abs(reduction.percent).toFixed(1)}%`} detail={`${formatBytes(Math.abs(reduction.savedBytes))} ${reduction.savedBytes < 0 ? "larger" : "saved"}`} warning={reduction.savedBytes < 0} /></div>
    {targetMet !== null && <div className={targetMet ? "studio-target-result is-met" : "studio-target-result is-missed"}><strong>{targetMet ? <><Check size={16} aria-hidden="true" /> Target met</> : "Closest observed result · target not reached"}</strong><span>{exactBytes(result.blob.size)} actual / {exactBytes(result.targetBytes!)} maximum. {targetMet ? "Verified from the output Blob, without padding." : "The smallest verified candidate observed is still over your ceiling; this is not a guarantee that no better candidate exists."}</span></div>}
    {targetMet === false && <div className="studio-target-recovery"><p>Change a constraint, then explicitly compress again:</p><div className="studio-inline-actions">
      <button type="button" className="studio-button studio-button-small" disabled={locked} onClick={() => onChange(stored.settings.preserveDimensions ? { preserveDimensions: false } : { preserveDimensions: false, resizeMode: "longest", longestSide: Math.max(1, Math.floor(Math.max(result.width, result.height) * 0.75)), lockAspect: true })}>{stored.settings.preserveDimensions ? "Allow smaller dimensions" : "Reduce longest side 25%"}</button>
      <button type="button" className="studio-button studio-button-small" disabled={locked || (stored.settings.format === "webp" && stored.settings.mode !== "auto")} onClick={() => onChange({ format: "webp", mode: "target" })}>Try WebP</button>
      <button type="button" className="studio-button studio-button-small" disabled={locked || stored.settings.minQuality <= 1 || stored.settings.format === "png"} onClick={() => onChange({ minQuality: Math.max(1, stored.settings.minQuality - 10) })}>Lower minimum quality</button>
    </div><p className="studio-caption">These buttons change settings and clear previous outputs. They do not automatically start a new batch.</p></div>}
    {reduction.savedBytes < 0 && <p className="studio-notice">This output is larger than the original. Re-encoding is not guaranteed to save bytes. Try another format, lower quality or smaller dimensions.</p>}
    <dl className="studio-result-facts"><div><dt>Dimensions</dt><dd>{result.width.toLocaleString("en-US")} × {result.height.toLocaleString("en-US")} px</dd></div><div><dt>Format / quality</dt><dd>{displayFormat(result.format)} · {result.quality === null ? stored.settings.paletteColors > 0 ? `${stored.settings.paletteColors}-color lossy palette` : "lossless working pixels" : `encoder quality ${result.quality}`}</dd></div><div><dt>Encoder</dt><dd>{result.codec}</dd></div><div><dt>Measured attempts</dt><dd>{result.attempts}</dd></div></dl>
    {typeof result.comparisonError === "number" && Number.isFinite(result.comparisonError) && <p className="studio-caption">Sampled RGBA error: {result.comparisonError.toFixed(4)}. A low-resolution pixel metric, not a visual-quality percentage or guarantee.</p>}
    <div className="studio-result-download"><div><strong className="studio-break-name">{outputName}</strong><span>{result.blob.type} · {exactBytes(result.blob.size)}</span></div><div className="studio-inline-actions"><button type="button" className="studio-button studio-button-primary" onClick={onDownload} disabled={locked}><Download size={16} aria-hidden="true" /> Download image</button>{onShare && <button type="button" className="studio-button" onClick={onShare} disabled={locked}><Share2 size={16} aria-hidden="true" /> Share image</button>}</div></div>
    {result.notices.length > 0 && <details className="studio-file-notices"><summary>Encoding, color & privacy notes ({result.notices.length})</summary><ul>{result.notices.map((notice, index) => <li key={index}>{notice}</li>)}</ul></details>}
  </div>;
}

function Stat({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return <div className={`studio-stat${warning ? " is-warning" : ""}`}><span>{label}</span><strong>{value}</strong><span>{detail}</span></div>;
}