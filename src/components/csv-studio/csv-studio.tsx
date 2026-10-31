"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft, ArrowRight, CircleAlert, ClipboardPaste, Columns3, Command, Eraser, EyeOff, FileExclamationPoint, FileSpreadsheet, FileText, FlaskConical,
  Highlighter, History, Locate, LockKeyhole, Maximize2, Minimize2, PanelRightOpen, Redo2, Replace, RotateCcw, Rows3, ShieldCheck, Trash2, Type,
  Undo2, Upload, WandSparkles, X,
} from "lucide-react";
import { StudioClient } from "@/lib/csv-studio/client";
import { STUDIO_SAMPLES, type StudioSample } from "@/lib/csv-studio/samples";
import {
  DEFAULT_IMPORT_OPTIONS, STUDIO_LIMITS, StudioError, columnLetter, encodingLabel,
  type CellDetail, type CellRange, type ColumnInfo, type ColumnProfile, type EncodingId, type EncodingLabResult, type ExportOptions, type ExportResult,
  type GridWindow, type ImportOptions, type Issue, type RepairOp, type RepairPreview, type SelectionStats, type SourceMeta, type StudioSnapshot,
} from "@/lib/csv-studio/types";
import { DataGrid, normalizeRange, type DataGridHandle, type GridSelection } from "./data-grid";
import { ColumnMenu, CommandPalette, ConfirmDialog, EncodingLab, GoToDialog, PasteDialog, type MenuItem, type PaletteAction } from "./dialogs";
import { ExportDock, type ExportState } from "./export-dock";
import { ChangesTab, ColumnTab, IssuesTab, type InspectorTab, type Review } from "./inspector";
import { SetupPanel, formatBytes, sameOptions } from "./setup-panel";
import styles from "./studio.module.css";

type Phase = "idle" | "working" | "ready" | "failed";
interface SourcePayload { bytes: ArrayBuffer | null; text: string | null; source: SourceMeta }
interface Failure { title: string; message: string; retry: { payload: SourcePayload; options: ImportOptions } | null }
interface ToastState { id: number; message: string; undo: boolean }
interface ActiveReview extends Review { version: number }
type DialogName = "palette" | "lab" | "paste" | "goto" | "reimport" | "delete" | "close" | null;
type FocusTool = { tool: "pad" | "find" | "rename"; find?: string } | null;

const ACCEPT = ".csv,.tsv,.tab,.txt,.psv,.dat,.gz,.zip,text/csv,text/plain,text/tab-separated-values";
const START: GridSelection = { anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } };
const TABS: InspectorTab[] = ["issues", "column", "changes"];
const n = (value: number) => value.toLocaleString("en-US");
const noop = () => {};
const subscribeNothing = () => noop;

const FAILURE_TITLES: Record<string, string> = {
  FILE_LIMIT: "This file is too large",
  PASTE_LIMIT: "Too much pasted text",
  ROW_LIMIT: "Too many rows",
  COLUMN_LIMIT: "Too many columns",
  CELL_LIMIT: "Too many cells",
  FIELD_LIMIT: "A single field is too large",
  EMPTY_FILE: "Nothing to repair",
  BINARY_FILE: "This isn’t a text file",
  XLSX_FILE: "This is already an Excel workbook",
  XLS_FILE: "This is an old Excel workbook",
  PDF_FILE: "This is a PDF",
  IMAGE_FILE: "This is an image",
  ZIP_CONTENTS: "This archive can’t be opened here",
  ZIP_ERROR: "This archive is damaged",
  GZIP_ERROR: "This archive is damaged",
  UNSUPPORTED_ENCODING: "Unsupported text encoding",
  NO_HEADER: "No header row left",
  INVALID_DELIMITER: "Check the custom delimiter",
  TIMEOUT: "This took too long",
  WORKER_UNAVAILABLE: "This browser can’t run CSV Studio",
};

function messageOf(error: unknown): string {
  return error instanceof StudioError ? error.message : "Something went wrong in your browser. Your original file is unchanged.";
}

function clampSelection(selection: GridSelection, rows: number, columns: number): GridSelection {
  const clamp = (point: { row: number; column: number }) => ({ row: Math.max(0, Math.min(point.row, rows - 1)), column: Math.max(0, Math.min(point.column, columns - 1)) });
  return { anchor: clamp(selection.anchor), focus: clamp(selection.focus) };
}

function editable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (Boolean(target.closest("input, textarea, select, [contenteditable='true']")) || target.isContentEditable);
}

function baseNameOf(name: string): string {
  return name.replace(/\.(gz|zip)$/i, "").replace(/\.[a-z0-9]{1,5}$/i, "").trim() || "data";
}

function cellRef(row: number, column: number): string {
  return `${columnLetter(column)}${row + 1}`;
}

export default function CsvStudio() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [snapshot, setSnapshot] = useState<StudioSnapshot | null>(null);
  const [progress, setProgress] = useState<{ phase: string; done: number; total: number } | null>(null);
  const [workingName, setWorkingName] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [draft, setDraft] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS);
  const [selection, setSelection] = useState<GridSelection>(START);
  const [tab, setTab] = useState<InspectorTab>("issues");
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [review, setReview] = useState<ActiveReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [diff, setDiff] = useState(true);
  const [compact, setCompact] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [setupCollapsed, setSetupCollapsed] = useState(true);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [pendingOptions, setPendingOptions] = useState<ImportOptions | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ColumnInfo | null>(null);
  const [menu, setMenu] = useState<{ column: ColumnInfo; anchor: DOMRect; items: MenuItem[] } | null>(null);
  const [paletteItems, setPaletteItems] = useState<PaletteAction[]>([]);
  const [cell, setCell] = useState<CellDetail | null>(null);
  const [profile, setProfile] = useState<ColumnProfile | null>(null);
  const [stats, setStats] = useState<SelectionStats | null>(null);
  const [focusTool, setFocusTool] = useState<FocusTool>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [live, setLive] = useState({ id: 0, message: "" });
  const [dragging, setDragging] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });
  const [docKey, setDocKey] = useState(0);

  const clientRef = useRef<StudioClient | null>(null);
  const pendingRef = useRef<StudioClient | null>(null);
  const sourceRef = useRef<SourcePayload | null>(null);
  const importToken = useRef(0);
  const busyRef = useRef(false);
  const exportUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<DataGridHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragDepth = useRef(0);
  const inspectorToggleRef = useRef<HTMLButtonElement>(null);
  const isMac = useSyncExternalStore(subscribeNothing, () => /Mac|iPhone|iPad/.test(navigator.platform), () => false);
  const mod = isMac ? "⌘" : "Ctrl";

  const ready = phase === "ready" && snapshot !== null;
  const visibleColumns = useMemo(() => snapshot?.columns.filter((column) => !column.hidden) ?? [], [snapshot]);
  const version = snapshot?.version ?? 0;
  const rowCount = snapshot?.rowCount ?? 0;
  const activeColumn = visibleColumns[selection.focus.column] ?? null;
  const activeKey = activeColumn?.key ?? null;
  const range = normalizeRange(selection);
  const multiCell = range.top !== range.bottom || range.left !== range.right;
  const editCount = snapshot?.history.cursor ?? 0;
  const openIssues = useMemo(() => {
    if (!snapshot) return { total: 0, errors: 0, warnings: 0 };
    const dismissed = new Set(snapshot.dismissed);
    const open = snapshot.issues.filter((issue) => !dismissed.has(issue.id));
    return { total: open.length, errors: open.filter((issue) => issue.severity === "error").length, warnings: open.filter((issue) => issue.severity === "warning").length };
  }, [snapshot]);
  const changedHeaders = useMemo(() => new Set((snapshot?.columns ?? []).filter((column) => column.derived || (column.originalName !== null ? column.name !== column.originalName : !/^Column \d+$/.test(column.name))).map((column) => column.key)), [snapshot]);

  const announce = useCallback((message: string) => setLive((current) => ({ id: current.id + 1, message })), []);
  const closeMenu = useCallback(() => setMenu(null), []);
  const showToast = useCallback((message: string, undo = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message, undo }));
    announce(message);
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6500 : 4500);
  }, [announce]);

  const releaseExport = useCallback(() => {
    if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
    exportUrlRef.current = null;
  }, []);

  useEffect(() => () => {
    clientRef.current?.dispose();
    pendingRef.current?.dispose();
    if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // ---------- import ----------
  const importSource = useCallback(async (payload: SourcePayload, options: ImportOptions) => {
    pendingRef.current?.dispose();
    const token = ++importToken.current;
    setMenu(null);
    setDialog(null);
    setFailure(null);
    setWorkingName(payload.source.name);
    setProgress({ phase: "Reading", done: 0, total: 0 });
    setPhase("working");
    let client: StudioClient;
    try {
      client = StudioClient.create();
    } catch (error) {
      setFailure({ title: FAILURE_TITLES.WORKER_UNAVAILABLE, message: messageOf(error), retry: null });
      setPhase("failed");
      return;
    }
    pendingRef.current = client;
    const bytes = payload.bytes ? payload.bytes.slice(0) : null;
    try {
      const next = await client.request<StudioSnapshot>("import", { bytes, text: payload.text, source: payload.source, options }, {
        transfer: bytes ? [bytes] : [],
        timeoutMs: STUDIO_LIMITS.importTimeoutMs,
        onProgress: (value) => { if (token === importToken.current) setProgress(value); },
      });
      if (token !== importToken.current) { client.dispose(); return; }
      clientRef.current?.dispose();
      clientRef.current = client;
      pendingRef.current = null;
      sourceRef.current = payload;
      releaseExport();
      setSnapshot(next);
      setDraft(next.options);
      setSelection(START);
      setReview(null);
      setSelectedIssue(null);
      setCell(null);
      setProfile(null);
      setStats(null);
      setFocusTool(null);
      setExportState({ kind: "idle" });
      setTab("issues");
      setDocKey((value) => value + 1);
      setPhase("ready");
      const dismissed = new Set(next.dismissed);
      const open = next.issues.filter((issue) => !dismissed.has(issue.id));
      const errors = open.filter((issue) => issue.severity === "error").length;
      const warnings = open.filter((issue) => issue.severity === "warning").length;
      announce(`Opened ${next.source.name}: ${n(next.rowCount)} rows, ${n(next.columns.length)} columns. ${errors ? `${n(errors)} errors, ` : ""}${n(warnings)} warnings, ${n(open.length - errors - warnings)} notes.`);
    } catch (error) {
      if (token !== importToken.current) return;
      client.dispose();
      pendingRef.current = null;
      const code = error instanceof StudioError ? error.code : "INTERNAL";
      setFailure({ title: FAILURE_TITLES[code] ?? "This file couldn’t be opened", message: messageOf(error), retry: sameOptions(options, DEFAULT_IMPORT_OPTIONS) ? null : { payload, options } });
      setPhase("failed");
    }
  }, [announce, releaseExport]);

  const cancelImport = () => {
    importToken.current++;
    pendingRef.current?.dispose();
    pendingRef.current = null;
    setPhase(clientRef.current && snapshot ? "ready" : "idle");
  };

  const openFile = useCallback(async (file: File) => {
    const source: SourceMeta = { name: file.name || "Untitled.csv", size: file.size, lastModified: file.lastModified || null, kind: "file", container: "plain", innerName: null };
    if (file.size > STUDIO_LIMITS.maxBytes) {
      setFailure({ title: FAILURE_TITLES.FILE_LIMIT, message: `This file is ${(file.size / 1048576).toFixed(1)} MB. CSV Studio handles files up to ${STUDIO_LIMITS.maxBytes / 1048576} MB in the browser. Split it into smaller files.`, retry: null });
      setPhase("failed");
      return;
    }
    let bytes: ArrayBuffer;
    try {
      bytes = await file.arrayBuffer();
    } catch {
      setFailure({ title: "This file couldn’t be read", message: "Your browser couldn’t read this file. It may have been moved or is still syncing. Try again.", retry: null });
      setPhase("failed");
      return;
    }
    void importSource({ bytes, text: null, source }, DEFAULT_IMPORT_OPTIONS);
  }, [importSource]);

  const openText = useCallback((text: string) => {
    void importSource({ bytes: null, text, source: { name: "Pasted data", size: text.length, lastModified: null, kind: "paste", container: "plain", innerName: null } }, DEFAULT_IMPORT_OPTIONS);
  }, [importSource]);

  const openSample = (sample: StudioSample) => {
    const data = sample.bytes();
    const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    void importSource({ bytes, text: null, source: { name: sample.fileName, size: data.byteLength, lastModified: null, kind: "sample", container: "plain", innerName: null } }, DEFAULT_IMPORT_OPTIONS);
  };

  const requestReimport = (options: ImportOptions) => {
    if (!sourceRef.current) return;
    if (editCount > 0) { setPendingOptions(options); setDialog("reimport"); return; }
    void importSource(sourceRef.current, options);
  };

  const closeDocument = () => {
    importToken.current++;
    clientRef.current?.dispose();
    clientRef.current = null;
    pendingRef.current?.dispose();
    pendingRef.current = null;
    sourceRef.current = null;
    releaseExport();
    setSnapshot(null);
    setReview(null);
    setCell(null);
    setProfile(null);
    setStats(null);
    setExpanded(false);
    setInspectorOpen(false);
    setExportState({ kind: "idle" });
    setDraft(DEFAULT_IMPORT_OPTIONS);
    setPhase("idle");
    announce("File closed. Nothing was kept.");
  };

  const pickFile = () => fileInputRef.current?.click();

  // ---------- requests ----------
  const fetchWindow = useCallback((start: number, count: number) => {
    const client = clientRef.current;
    if (!client) return Promise.reject(new StudioError("CLOSED", "No document."));
    return client.request<GridWindow>("window", { start, count });
  }, []);

  const adopt = (next: StudioSnapshot) => {
    setSnapshot(next);
    setSelection((current) => clampSelection(current, next.rowCount, next.columns.filter((column) => !column.hidden).length));
  };

  const apply = async (op: RepairOp) => {
    const client = clientRef.current;
    if (!client || busyRef.current || !snapshot) return;
    const before = snapshot.version;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await client.request<{ snapshot: StudioSnapshot; preview: RepairPreview }>("apply", { op });
      adopt(result.snapshot);
      setReview(null);
      const changed = result.snapshot.version !== before;
      const cells = result.preview.cells;
      const message = changed ? `${result.preview.label}${cells ? ` · ${n(cells)} cell${cells === 1 ? "" : "s"}` : ""}${result.preview.rowsRemoved ? ` · ${n(result.preview.rowsRemoved)} rows removed` : ""}` : "Nothing needed changing.";
      showToast(message, changed);
    } catch (error) {
      showToast(messageOf(error));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const preview = async (op: RepairOp) => {
    const client = clientRef.current;
    if (!client || !snapshot) return;
    try {
      const result = await client.request<RepairPreview>("preview", { op });
      setReview({ op, preview: result, version: snapshot.version });
      setTab("changes");
      setInspectorOpen(true);
      announce(result.blocked ? `${result.label}: ${result.blocked}` : `Review ${result.label}: ${n(result.cells)} cells would change.`);
    } catch (error) {
      showToast(messageOf(error));
    }
  };

  const step = async (type: "undo" | "redo" | "reset") => {
    const client = clientRef.current;
    if (!client || busyRef.current || !snapshot) return;
    const { steps, cursor } = snapshot.history;
    const label = type === "undo" ? steps[cursor]?.label : type === "redo" ? steps[cursor + 1]?.label : "Reset to imported data";
    if ((type === "undo" && cursor === 0) || (type === "redo" && cursor >= steps.length - 1)) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const next = await client.request<StudioSnapshot>(type);
      adopt(next);
      const message = type === "undo" ? `Undone: ${label}` : type === "redo" ? `Redone: ${label}` : "Reset to the imported data. Undo brings your changes back.";
      showToast(message, false);
    } catch (error) {
      showToast(messageOf(error));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const dismissIssue = async (issue: Issue, dismissed: boolean) => {
    const client = clientRef.current;
    if (!client) return;
    try {
      setSnapshot(await client.request<StudioSnapshot>("dismiss", { issueId: issue.id, dismissed }));
      if (dismissed) setSelectedIssue(null);
      showToast(dismissed ? `Dismissed “${issue.name}”. Restore it from the Dismissed list.` : `Restored “${issue.name}”.`);
    } catch (error) {
      showToast(messageOf(error));
    }
  };

  const moveTo = useCallback((row: number, column: number, focusGrid: boolean) => {
    const target = { row, column };
    setSelection({ anchor: target, focus: target });
    requestAnimationFrame(() => {
      gridRef.current?.scrollTo(row, column);
      if (focusGrid) gridRef.current?.focus();
    });
  }, []);

  const locateIssue = async (issue: Issue, next: boolean) => {
    const client = clientRef.current;
    if (!client) return;
    try {
      const hit = await client.request<{ row: number; column: number } | null>("locate", { issueId: issue.id, after: next ? selection.focus.row : -1 });
      if (!hit) { showToast("There’s no cell to show for this issue."); return; }
      moveTo(hit.row, hit.column, next);
      if (next) announce(`Row ${n(hit.row + 1)}, ${visibleColumns[hit.column]?.name || `column ${columnLetter(hit.column)}`}`);
    } catch (error) {
      showToast(messageOf(error));
    }
  };

  const focusColumnKey = (key: number) => {
    const position = visibleColumns.findIndex((column) => column.key === key);
    if (position >= 0) moveTo(selection.focus.row, position, false);
  };

  const openColumnTool = (key: number | null, tool: NonNullable<FocusTool>) => {
    if (key !== null) focusColumnKey(key);
    setTab("column");
    setInspectorOpen(true);
    setFocusTool({ ...tool });
  };

  const fixIssue = (issue: Issue) => {
    const fix = issue.fix;
    if (!fix || !snapshot) return;
    switch (fix.kind) {
      case "op": if (fix.op.kind === "setType") void apply(fix.op); else void preview(fix.op); break;
      case "reimport": requestReimport({ ...snapshot.options, ...fix.patch }); break;
      case "encoding-lab": setDialog("lab"); break;
      case "pad": openColumnTool(fix.column, { tool: "pad" }); break;
      case "find-replace": openColumnTool(fix.column, { tool: "find", find: fix.find }); break;
    }
  };

  const copyRange = async (target: CellRange) => {
    const client = clientRef.current;
    if (!client) return;
    try {
      const text = await client.request<string>("copy", { range: target });
      await navigator.clipboard.writeText(text);
      const cells = (target.bottom - target.top + 1) * (target.right - target.left + 1);
      showToast(`Copied ${n(cells)} cell${cells === 1 ? "" : "s"} as tab-separated text.`);
    } catch (error) {
      showToast(error instanceof StudioError ? error.message : "Your browser blocked clipboard access. Select fewer cells or use Export.");
    }
  };

  const loadLab = useCallback((encodings: EncodingId[]) => {
    const client = clientRef.current;
    if (!client) return Promise.reject(new StudioError("CLOSED", "No document."));
    return client.request<EncodingLabResult[]>("lab", { encodings });
  }, []);

  const runExport = async (options: ExportOptions) => {
    const client = clientRef.current;
    if (!client) return;
    setExportState({ kind: "running", done: 0, total: 0 });
    try {
      const result = await client.request<ExportResult & { buffer: ArrayBuffer }>("export", { options }, {
        onProgress: (value) => setExportState({ kind: "running", done: value.done, total: value.total }),
      });
      const { buffer, ...summary } = result;
      releaseExport();
      const url = URL.createObjectURL(new Blob([buffer], { type: summary.mime }));
      exportUrlRef.current = url;
      const link = document.createElement("a");
      link.href = url;
      link.download = summary.fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportState({ kind: "done", result: summary, url });
      announce(`Downloaded ${summary.fileName}, ${formatBytes(summary.size)}.`);
    } catch (error) {
      if (error instanceof StudioError && error.code === "CANCELLED" && clientRef.current === client) {
        setExportState({ kind: "idle" });
        showToast("Export cancelled. Your working data is unchanged.");
        return;
      }
      setExportState({ kind: "failed", message: messageOf(error) });
    }
  };

  // ---------- derived requests (cell, stats, profile, review) ----------
  useEffect(() => {
    const client = clientRef.current;
    if (!ready || !client || rowCount === 0 || !visibleColumns.length) return;
    let live = true;
    const { focus } = selection;
    const area = normalizeRange(selection);
    const timer = setTimeout(() => {
      client.request<CellDetail>("cell", { row: focus.row, column: focus.column }).then((detail) => { if (live) setCell(detail); }).catch(noop);
      if (area.top !== area.bottom || area.left !== area.right) client.request<SelectionStats>("stats", { range: area }).then((value) => { if (live) setStats(value); }).catch(noop);
      else setStats(null);
    }, 70);
    return () => { live = false; clearTimeout(timer); };
  }, [ready, selection, version, rowCount, visibleColumns.length]);

  useEffect(() => {
    const client = clientRef.current;
    if (!ready || !client || activeKey === null || tab !== "column") return;
    let live = true;
    client.request<ColumnProfile>("profile", { column: activeKey }).then((value) => { if (live) setProfile(value); }).catch(noop);
    return () => { live = false; };
  }, [ready, activeKey, version, tab]);

  useEffect(() => {
    const client = clientRef.current;
    if (!review || !client || review.version === version) return;
    let live = true;
    client.request<RepairPreview>("preview", { op: review.op })
      .then((result) => { if (live) setReview({ op: review.op, preview: result, version }); })
      .catch(() => { if (live) setReview(null); });
    return () => { live = false; };
  }, [review, version]);

  // ---------- global listeners ----------
  useEffect(() => {
    const guard = (event: DragEvent) => { if (event.dataTransfer?.types.includes("Files")) event.preventDefault(); };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => { window.removeEventListener("dragover", guard); window.removeEventListener("drop", guard); };
  }, []);

  useEffect(() => {
    if (editCount === 0) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editCount]);

  useEffect(() => {
    if (!expanded) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = previous; };
  }, [expanded]);

  useEffect(() => {
    if (phase !== "idle") return;
    const paste = (event: ClipboardEvent) => {
      if (editable(event.target) || document.querySelector("dialog[open]")) return;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      event.preventDefault();
      openText(text);
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [phase, openText]);

  // ---------- drag & drop ----------
  const onDragEnter = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current++;
    setDragging(true);
  };
  const onDragLeave = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = event.dataTransfer.files;
    if (!files.length) return;
    if (files.length > 1) showToast(`Opened ${files[0].name}. CSV Studio works on one file at a time.`);
    void openFile(files[0]);
  };

  // ---------- menus & palette ----------
  const columnMenuItems = (column: ColumnInfo): MenuItem[] => {
    const position = visibleColumns.findIndex((item) => item.key === column.key);
    const protectedColumn = column.type === "text" || column.profile !== null;
    return [
      { id: "text", label: protectedColumn ? "Kept as text" : "Keep as text", icon: ShieldCheck, disabled: protectedColumn, run: () => void apply({ kind: "setType", columns: [column.key], type: "text", profile: null, dateFormat: null }) },
      { id: "type", label: "Type and profile…", icon: Type, run: () => openColumnTool(column.key, { tool: "rename" }) },
      { id: "find", label: "Find and replace…", icon: Replace, run: () => openColumnTool(column.key, { tool: "find" }) },
      { id: "pad", label: "Pad with leading zeros…", icon: Columns3, run: () => openColumnTool(column.key, { tool: "pad" }) },
      { id: "left", label: "Move left", icon: ArrowLeft, disabled: position <= 0, run: () => void apply({ kind: "move", column: column.key, offset: -1 }) },
      { id: "right", label: "Move right", icon: ArrowRight, disabled: position >= visibleColumns.length - 1, run: () => void apply({ kind: "move", column: column.key, offset: 1 }) },
      { id: "hide", label: "Hide column", icon: EyeOff, disabled: visibleColumns.length <= 1, run: () => void apply({ kind: "hide", column: column.key, hidden: true }) },
      { id: "delete", label: "Delete column…", icon: Trash2, danger: true, disabled: (snapshot?.columns.length ?? 0) <= 1, run: () => { setDeleteTarget(column); setDialog("delete"); } },
    ];
  };

  const paletteActions = (): PaletteAction[] => {
    const actions: PaletteAction[] = [
      { id: "open", label: ready ? "Open another file" : "Open a file", group: "File", icon: Upload, run: pickFile },
      { id: "paste", label: "Paste table data", group: "File", icon: ClipboardPaste, run: () => setDialog("paste") },
    ];
    if (!ready) {
      for (const sample of STUDIO_SAMPLES) actions.push({ id: `sample-${sample.id}`, label: `Try sample: ${sample.name}`, group: "Samples", icon: FileText, run: () => openSample(sample) });
      return actions;
    }
    const blank = snapshot.issues.some((issue) => issue.code === "blank-rows");
    const duplicates = snapshot.issues.some((issue) => issue.code === "duplicate-rows");
    actions.push(
      { id: "lab", label: "Compare encodings (Encoding Lab)", group: "File", icon: FlaskConical, disabled: snapshot.source.kind === "paste", run: () => setDialog("lab") },
      { id: "close", label: "Close file", group: "File", icon: X, run: () => (editCount > 0 ? setDialog("close") : closeDocument()) },
      { id: "undo", label: "Undo", group: "Edit", icon: Undo2, shortcut: `${mod} Z`, disabled: !snapshot.history.canUndo, run: () => void step("undo") },
      { id: "redo", label: "Redo", group: "Edit", icon: Redo2, shortcut: isMac ? "⌘ ⇧ Z" : "Ctrl Y", disabled: !snapshot.history.canRedo, run: () => void step("redo") },
      { id: "goto", label: "Go to cell", group: "Edit", icon: Locate, shortcut: `${mod} G`, run: () => setDialog("goto") },
      { id: "reset", label: "Reset to imported data", group: "Edit", icon: RotateCcw, disabled: editCount === 0, run: () => void step("reset") },
      { id: "safe", label: "Preview safe cleanups (trim, BOM, headers)", group: "Repair", icon: WandSparkles, run: () => void preview({ kind: "batch", label: "Apply safe cleanups", ops: [{ kind: "trim", columns: "all" }, { kind: "stripBom", columns: "all" }, { kind: "repairHeaders", names: null }] }) },
      { id: "blank", label: "Remove blank rows", group: "Repair", icon: Eraser, disabled: !blank, run: () => void preview({ kind: "removeBlankRows" }) },
      { id: "dupes", label: "Remove duplicate rows", group: "Repair", icon: Rows3, disabled: !duplicates, run: () => void preview({ kind: "removeDuplicateRows" }) },
    );
    if (activeColumn) {
      const name = activeColumn.name || `column ${columnLetter(selection.focus.column)}`;
      actions.push(
        { id: "protect", label: `Keep “${name}” as text`, group: "Repair", icon: ShieldCheck, disabled: activeColumn.type === "text" || activeColumn.profile !== null, run: () => void apply({ kind: "setType", columns: [activeColumn.key], type: "text", profile: null, dateFormat: null }) },
        { id: "find", label: `Find and replace in “${name}”`, group: "Repair", icon: Replace, run: () => openColumnTool(activeColumn.key, { tool: "find" }) },
      );
    }
    actions.push(
      { id: "issues", label: "Show issues", group: "View", icon: FileExclamationPoint, run: () => { setTab("issues"); setInspectorOpen(true); } },
      { id: "column", label: "Show column details", group: "View", icon: Columns3, run: () => { setTab("column"); setInspectorOpen(true); } },
      { id: "changes", label: "Show changes and history", group: "View", icon: History, run: () => { setTab("changes"); setInspectorOpen(true); } },
      { id: "diff", label: diff ? "Hide change highlights" : "Highlight changed cells", group: "View", icon: Highlighter, run: () => setDiff((value) => !value) },
      { id: "density", label: compact ? "Comfortable rows" : "Compact rows", group: "View", icon: Rows3, run: () => setCompact((value) => !value) },
      { id: "expand", label: expanded ? "Exit full screen" : "Full screen workspace", group: "View", icon: expanded ? Minimize2 : Maximize2, run: () => setExpanded((value) => !value) },
      { id: "export", label: "Export…", group: "Export", icon: FileSpreadsheet, run: () => { const button = document.getElementById("csv-studio-export-primary"); button?.scrollIntoView({ block: "center" }); button?.focus({ preventScroll: true }); } },
    );
    return actions;
  };

  const openPalette = () => {
    setPaletteItems(paletteActions());
    setDialog("palette");
  };

  const keyHandler = useRef<(event: KeyboardEvent) => void>(noop);
  // Layout effect: a shortcut pressed right after a commit must see the new snapshot.
  useLayoutEffect(() => {
    keyHandler.current = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector("dialog[open]")) return;
      const modKey = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (modKey && key === "k" && !event.shiftKey && !event.altKey) { event.preventDefault(); openPalette(); return; }
      if (event.key === "Escape" && expanded && !menu) { setExpanded(false); return; }
      if (event.key === "Escape" && inspectorOpen && !menu) { setInspectorOpen(false); inspectorToggleRef.current?.focus(); return; }
      if (!ready || editable(event.target)) return;
      const inStudio = rootRef.current?.contains(event.target as Node) || event.target === document.body;
      if (!inStudio) return;
      if (modKey && key === "z" && !event.shiftKey) { event.preventDefault(); void step("undo"); }
      else if (modKey && (key === "y" || (key === "z" && event.shiftKey))) { event.preventDefault(); void step("redo"); }
      else if (modKey && key === "g") { event.preventDefault(); setDialog("goto"); }
    };
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandler.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // ---------- render ----------
  const tabLabel = (value: InspectorTab) => value === "issues" ? "Issues" : value === "column" ? "Column" : "Changes";
  const onTabKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const index = TABS.indexOf(tab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[next]);
    setFocusTool(null);
    document.getElementById(`csv-studio-tab-${TABS[next]}`)?.focus();
  };

  const stage = () => {
    if (phase === "working") {
      const percent = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : null;
      return (
        <div className={styles.working} role="status" aria-live="polite">
          <h2>Reading {workingName}</h2>
          <p>{progress?.phase ?? "Reading"}{percent !== null ? ` · ${percent}%` : "…"} Everything happens in this browser tab.</p>
          <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${percent ?? 0}%` }} data-indeterminate={percent === null || undefined} /></div>
          <button type="button" className={styles.button} onClick={cancelImport}>Cancel</button>
        </div>
      );
    }
    if (phase === "failed" && failure) {
      const retry = failure.retry;
      return (
        <div className={styles.errorCard} role="alert">
          <h2><CircleAlert size={18} aria-hidden="true" /> {failure.title}</h2>
          <p>{failure.message}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonPrimary} onClick={pickFile}><Upload size={15} aria-hidden="true" /> Choose another file</button>
            {retry && <button type="button" className={styles.button} onClick={() => void importSource(retry.payload, DEFAULT_IMPORT_OPTIONS)}>Retry with automatic settings</button>}
            {snapshot && <button type="button" className={styles.button} onClick={() => setPhase("ready")}>Back to {snapshot.source.name}</button>}
          </div>
        </div>
      );
    }
    return (
      <div className={styles.dropzone} data-active={dragging || undefined}>
        <span className={styles.dropIcon}><Upload size={24} aria-hidden="true" /></span>
        <h2>Drop a CSV file to inspect and repair</h2>
        <p>CSV or delimited TXT. Processed in your browser.</p>
        <div className={styles.dropActions}>
          <button type="button" className={styles.buttonPrimary} onClick={pickFile}><Upload size={15} aria-hidden="true" /> Choose a file</button>
          <button type="button" className={styles.button} onClick={() => setDialog("paste")}><ClipboardPaste size={15} aria-hidden="true" /> Paste data</button>
        </div>
        <div className={styles.samples} role="group" aria-label="Sample files">
          {STUDIO_SAMPLES.map((sample) => (
            <button key={sample.id} type="button" className={styles.sample} onClick={() => openSample(sample)}>
              <strong>{sample.name}</strong>
              <span>{sample.description}</span>
            </button>
          ))}
        </div>
        <p className={styles.limits}>
          <span>Up to {STUDIO_LIMITS.maxBytes / 1048576} MB</span>
          <span>{n(STUDIO_LIMITS.maxRows)} rows</span>
          <span>{n(STUDIO_LIMITS.maxColumns)} columns</span>
          <span>.csv .tsv .txt .gz .zip</span>
        </p>
      </div>
    );
  };

  const selectionSummary = () => {
    if (!ready || !rowCount) return null;
    if (!multiCell) return <><strong>{cellRef(selection.focus.row, selection.focus.column)}</strong> {activeColumn?.name ? `· ${activeColumn.name}` : ""}</>;
    const cells = (range.bottom - range.top + 1) * (range.right - range.left + 1);
    return (
      <>
        <strong>{cellRef(range.top, range.left)}:{cellRef(range.bottom, range.right)}</strong>
        <span>· {n(cells)} cells</span>
        {stats && <span>· {n(stats.nonEmpty)} filled</span>}
        {stats?.sum !== null && stats?.sum !== undefined && <span>· Sum {stats.sum}</span>}
        {stats?.average !== null && stats?.average !== undefined && <span>· Average {stats.average}</span>}
      </>
    );
  };

  const selectedRows = ready && range.bottom > range.top ? { top: range.top, bottom: range.bottom } : null;

  return (
    <div
      ref={rootRef}
      className={`${styles.studio} ${compact ? styles.compact : ""}`}
      data-expanded={expanded || undefined}
      onDragEnter={onDragEnter}
      onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void openFile(file);
        }}
      />
      <div className={styles.frame} data-empty={!ready || undefined} data-alone={!ready || undefined}>
        <div className={styles.toolbar} role="toolbar" aria-label="CSV Studio">
          <span className={styles.brand}><span className={styles.brandMark}><FileSpreadsheet size={14} aria-hidden="true" /></span><span>CSV Studio</span></span>
          {ready && (
            <>
              <span className={styles.fileChip} title={snapshot.source.name}><FileText size={13} aria-hidden="true" /><span>{snapshot.source.name}</span></span>
              <span className={styles.divider} aria-hidden="true" />
              <span className={styles.toolGroup}>
                <button type="button" className={styles.iconButton} aria-label={`Undo (${mod} Z)`} title={`Undo (${mod} Z)`} disabled={!snapshot.history.canUndo || busy} onClick={() => void step("undo")}><Undo2 size={16} aria-hidden="true" /></button>
                <button type="button" className={styles.iconButton} aria-label="Redo" title={isMac ? "Redo (⌘ ⇧ Z)" : "Redo (Ctrl Y)"} disabled={!snapshot.history.canRedo || busy} onClick={() => void step("redo")}><Redo2 size={16} aria-hidden="true" /></button>
              </span>
              <span className={`${styles.divider} ${styles.hideMobile}`} aria-hidden="true" />
              <span className={`${styles.toolGroup} ${styles.hideMobile}`}>
                <button type="button" className={styles.iconButton} aria-pressed={diff} aria-label="Highlight changed cells" title="Highlight changed cells" onClick={() => setDiff((value) => !value)}><Highlighter size={16} aria-hidden="true" /></button>
                <button type="button" className={styles.iconButton} aria-pressed={compact} aria-label="Compact rows" title="Compact rows" onClick={() => setCompact((value) => !value)}><Rows3 size={16} aria-hidden="true" /></button>
              </span>
            </>
          )}
          <span className={styles.spacer} />
          <button type="button" className={styles.commandButton} onClick={() => openPalette()} aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}>
            <Command size={14} aria-hidden="true" /> Commands <span className={styles.kbd}>{mod} K</span>
          </button>
          {ready && (
            <button ref={inspectorToggleRef} type="button" className={`${styles.button} ${styles.small} ${styles.panelToggle}`} aria-expanded={inspectorOpen} aria-controls="csv-studio-inspector" onClick={() => { setInspectorOpen(true); requestAnimationFrame(() => document.getElementById(`csv-studio-tab-${tab}`)?.focus()); }}>
              <PanelRightOpen size={14} aria-hidden="true" /> Issues <span className={styles.count}>{n(openIssues.total)}</span>
            </button>
          )}
          {ready && (
            <button type="button" className={styles.iconButton} aria-pressed={expanded} aria-label={expanded ? "Exit full screen" : "Full screen workspace"} title={expanded ? "Exit full screen (Esc)" : "Full screen workspace"} onClick={() => setExpanded((value) => !value)}>
              {expanded ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
            </button>
          )}
        </div>

        {ready && (
          <SetupPanel
            snapshot={snapshot}
            draft={draft}
            busy={busy}
            collapsed={setupCollapsed}
            editCount={editCount}
            onDraft={setDraft}
            onApply={() => requestReimport(draft)}
            onLab={() => setDialog("lab")}
            onReplace={pickFile}
            onPaste={() => setDialog("paste")}
            onClose={() => (editCount > 0 ? setDialog("close") : closeDocument())}
            onToggle={() => setSetupCollapsed((value) => !value)}
          />
        )}

        <section className={styles.center} aria-label={ready ? "Data grid" : "Open a file"}>
          {ready ? (
            <>
              <div className={styles.gridBar} aria-live="off">
                <span>{selectionSummary()}</span>
                <span className={styles.legend} aria-hidden="true">
                  <span><span className={`${styles.dot} ${styles.dotChanged}`} /> Changed</span>
                  <span><span className={`${styles.dot} ${styles.dotError}`} /> Error</span>
                  <span><span className={`${styles.dot} ${styles.dotWarning}`} /> Warning</span>
                  <span style={{ color: "var(--cs-ok)" }}>Protected ID</span>
                  <span style={{ color: "var(--cs-warn)" }}>Formula-like</span>
                </span>
              </div>
              <DataGrid
                ref={gridRef}
                key={docKey}
                version={version}
                rowCount={rowCount}
                columns={visibleColumns}
                changedHeaders={changedHeaders}
                compact={compact}
                diff={diff}
                selection={selection}
                onSelection={setSelection}
                fetchWindow={fetchWindow}
                onEdit={(row, column, value) => void apply({ kind: "editCells", edits: [{ row, column, value }] })}
                onClear={(target) => void apply({ kind: "clearCells", range: target })}
                onCopy={(target) => void copyRange(target)}
                onColumnMenu={(column, anchor) => setMenu({ column, anchor, items: columnMenuItems(column) })}
                onColumnSelect={(column) => { setTab("column"); announce(`Column ${column.name || "untitled"} selected.`); }}
                onAnnounce={noop}
                label={`${snapshot.source.name}: ${n(rowCount)} rows, ${n(visibleColumns.length)} columns`}
              />
            </>
          ) : (
            <div className={styles.stage}>{stage()}</div>
          )}
          {dragging && ready && <div className={styles.dropOverlay}>Drop to open this file instead</div>}
          {toast && (
            <div className={styles.toast} key={toast.id}>
              <span>{toast.message}</span>
              {toast.undo && <button type="button" className={styles.toastAction} onClick={() => { setToast(null); void step("undo"); }}>Undo</button>}
              <button type="button" aria-label="Dismiss message" onClick={() => setToast(null)}><X size={14} aria-hidden="true" /></button>
            </div>
          )}
        </section>

        {ready && (
          <>
            <div className={styles.drawerBackdrop} data-open={inspectorOpen || undefined} onClick={() => setInspectorOpen(false)} aria-hidden="true" />
            <aside id="csv-studio-inspector" className={styles.right} data-open={inspectorOpen || undefined} aria-label="Inspector">
              <div className={styles.tabs}>
                <div className={styles.tabList} role="tablist" aria-label="Inspector" onKeyDown={onTabKey}>
                  {TABS.map((value) => (
                    <button
                      key={value}
                      id={`csv-studio-tab-${value}`}
                      type="button"
                      role="tab"
                      className={styles.tab}
                      aria-selected={tab === value}
                      aria-controls="csv-studio-tabpanel"
                      tabIndex={tab === value ? 0 : -1}
                      onClick={() => { setTab(value); setFocusTool(null); }}
                    >
                      {value === "issues" ? <FileExclamationPoint size={14} aria-hidden="true" /> : value === "column" ? <Columns3 size={14} aria-hidden="true" /> : <History size={14} aria-hidden="true" />}
                      {tabLabel(value)}
                      {value === "issues" && <span className={styles.count}>{n(openIssues.total)}</span>}
                      {value === "changes" && editCount > 0 && <span className={styles.count}>{n(editCount)}</span>}
                    </button>
                  ))}
                </div>
                <span className={styles.spacer} />
                <button type="button" className={`${styles.iconButton} ${styles.panelToggle}`} aria-label="Close inspector" onClick={() => { setInspectorOpen(false); inspectorToggleRef.current?.focus(); }}><X size={16} aria-hidden="true" /></button>
              </div>
              <div id="csv-studio-tabpanel" role="tabpanel" aria-labelledby={`csv-studio-tab-${tab}`} className={styles.inspectorBody} tabIndex={-1}>
                {tab === "issues" && (
                  <IssuesTab snapshot={snapshot} selected={selectedIssue} onSelect={setSelectedIssue} onLocate={(issue, next) => void locateIssue(issue, next)} onFix={fixIssue} onDismiss={(issue, value) => void dismissIssue(issue, value)} />
                )}
                {tab === "column" && (
                  <ColumnTab
                    snapshot={snapshot}
                    column={activeColumn}
                    position={selection.focus.column}
                    cell={cell && cell.row === selection.focus.row && cell.column === activeKey ? cell : null}
                    profile={profile && profile.column === activeKey ? profile : null}
                    focusTool={focusTool}
                    onApply={(op) => void apply(op)}
                    onPreview={(op) => void preview(op)}
                    onDelete={(column) => { setDeleteTarget(column); setDialog("delete"); }}
                  />
                )}
                {tab === "changes" && (
                  <ChangesTab
                    snapshot={snapshot}
                    review={review}
                    busy={busy}
                    onPreview={(op) => void preview(op)}
                    onConfirm={(op) => void apply(op)}
                    onCancel={() => setReview(null)}
                    onUndo={() => void step("undo")}
                    onRedo={() => void step("redo")}
                    onReset={() => void step("reset")}
                    onToast={showToast}
                  />
                )}
              </div>
            </aside>
          </>
        )}

        <div className={styles.status}>
          {ready ? (
            <>
              <span><strong>{n(rowCount)}</strong> rows × <strong>{n(visibleColumns.length)}</strong> columns</span>
              <span>{openIssues.errors ? <><strong style={{ color: "var(--cs-danger)" }}>{n(openIssues.errors)}</strong> errors · </> : null}<strong>{n(openIssues.warnings)}</strong> warnings</span>
              <span>{snapshot.report.delimiter.label}</span>
              <span>{encodingLabel(snapshot.report.encoding.used)}</span>
              <span>{snapshot.report.lineEndings.style} line endings</span>
              <span>{editCount ? `${n(editCount)} change${editCount === 1 ? "" : "s"} applied` : "No changes yet"}</span>
            </>
          ) : (
            <span>{phase === "working" ? "Reading…" : "No file open"}</span>
          )}
          <span className={styles.statusEnd}><LockKeyhole size={12} aria-hidden="true" /> Processed in your browser</span>
        </div>
      </div>

      {ready && (
        <ExportDock
          key={docKey}
          snapshot={snapshot}
          baseName={baseNameOf(snapshot.source.name)}
          selectedRows={selectedRows}
          state={exportState}
          onExport={(options) => void runExport(options)}
          onCancel={() => clientRef.current?.cancelExport()}
          onDismiss={() => setExportState({ kind: "idle" })}
        />
      )}

      <div className={styles.notesRow} id="csv-studio-privacy">
        <p className={styles.noteCard}><LockKeyhole size={16} aria-hidden="true" /><span><strong>Processed in your browser</strong>Files are processed in your browser. ByteVerse does not receive your spreadsheet contents in this tool’s normal workflow.</span></p>
        <p className={styles.noteCard}><History size={16} aria-hidden="true" /><span><strong>Your original stays untouched</strong>Repairs change a working copy with undo and a change log. The file on your device is never modified.</span></p>
        <p className={styles.noteCard}><ShieldCheck size={16} aria-hidden="true" /><span><strong>Lost zeros can’t be restored</strong>If leading zeros are already missing from the file you uploaded, this tool cannot invent them.</span></p>
      </div>

      <div className={styles.srOnly} aria-live="polite" role="status"><span key={live.id}>{live.message}</span></div>

      {menu && <ColumnMenu anchor={menu.anchor} label={`Options for ${menu.column.name || "column"}`} items={menu.items} onClose={closeMenu} />}
      <CommandPalette open={dialog === "palette"} onClose={() => setDialog(null)} actions={paletteItems} />
      <PasteDialog open={dialog === "paste"} onClose={() => setDialog(null)} onImport={openText} />
      {ready && (
        <>
          <EncodingLab open={dialog === "lab"} onClose={() => setDialog(null)} load={loadLab} current={snapshot.report.encoding.used} onChoose={(encoding) => { setDialog(null); requestReimport({ ...snapshot.options, encoding }); }} />
          <GoToDialog open={dialog === "goto"} onClose={() => setDialog(null)} rowCount={rowCount} columns={visibleColumns} initial={selection.focus} onGo={(row, column) => moveTo(row, column, true)} />
          <ConfirmDialog
            open={dialog === "reimport"}
            title="Re-read the file?"
            body={<p>Re-reading with new settings starts a fresh working copy. Your {n(editCount)} applied change{editCount === 1 ? "" : "s"} will be cleared, and this can’t be undone. Export first if you need them.</p>}
            confirmLabel="Re-read and clear changes"
            danger
            onConfirm={() => { if (pendingOptions && sourceRef.current) void importSource(sourceRef.current, pendingOptions); }}
            onClose={() => setDialog(null)}
          />
          <ConfirmDialog
            open={dialog === "delete" && deleteTarget !== null}
            title="Delete this column?"
            body={<p>“{deleteTarget?.name || "Untitled column"}” will be removed from the working copy. Undo brings it back, and your original file is unchanged.</p>}
            confirmLabel="Delete column"
            danger
            onConfirm={() => { if (deleteTarget) void apply({ kind: "deleteColumn", column: deleteTarget.key }); }}
            onClose={() => { setDialog(null); setDeleteTarget(null); }}
          />
          <ConfirmDialog
            open={dialog === "close"}
            title="Close this file?"
            body={<p>Your {n(editCount)} applied change{editCount === 1 ? "" : "s"} will be discarded. Nothing is stored after you close the file, so export first if you need the repaired data.</p>}
            confirmLabel="Close without exporting"
            danger
            onConfirm={closeDocument}
            onClose={() => setDialog(null)}
          />
        </>
      )}
    </div>
  );
}
