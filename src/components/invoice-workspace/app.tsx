import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  AlertCircle, ArrowRight, BadgeCheck, ChevronDown, Download, FileCheck2, FileClock,
  FilePlus2, FileSpreadsheet, FileText, FlaskConical, Info, LockKeyhole, RotateCcw,
  ShieldCheck, SlidersHorizontal, Square, Trash2, Upload, X,
} from "lucide-react";
import licenses from "invoice:licenses";
import { buildInvoiceCsv, createInvoiceWorkbook, exportableInvoices, INVOICE_CSV_NOTES } from "../../lib/invoice/export";
import { normalizeField, parseMappingProfile } from "../../lib/invoice/parser";
import { extractInvoiceLocally } from "../../lib/invoice/core-client";
import { pdfErrorMessage, readInvoicePdf } from "../../lib/invoice/pdf-client";
import { reconcileReviews, reviewKey } from "../../lib/invoice/review-state";
import { makeSamplePdf, SAMPLE_INVOICES } from "../../lib/invoice/samples";
import { emptyFields, INVOICE_LIMITS } from "../../lib/invoice/types";
import type {
  DateOrder, Evidence, ExtractionOptions, InvoiceField, InvoiceRecord, MappingProfile, NumberFormat, SourceLine,
} from "../../lib/invoice/types";
import { canReview, getCurrencyTotals, validateInvoice } from "../../lib/invoice/validation";
import { InvoiceReview } from "./invoice-review";
import { useLocalDownloads } from "./local-download";
import { MappingEditor } from "./mapping-editor";

type Activity = "idle" | "checking" | "processing" | "reextracting" | "exporting";
type Filter = "all" | "needs-review" | "reviewed" | "failed";
type ExportFormat = "xlsx" | "csv-comma" | "csv-semicolon";
type Confirmation = "clear" | "reextract" | null;
interface Progress { index: number; total: number; name: string; page: number; pages: number; completed: number }
interface Notice { text: string; tone: "neutral" | "success" | "error" }
export interface InvoiceWorkspaceProps { initialOptions?: Partial<ExtractionOptions> }

const DEFAULT_OPTIONS: ExtractionOptions = { numberFormat: "auto", dateOrder: "auto" };
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All files" }, { value: "needs-review", label: "Needs review" },
  { value: "reviewed", label: "Reviewed" }, { value: "failed", label: "Failed" },
];

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function copyOptions(options: ExtractionOptions): ExtractionOptions {
  return {
    numberFormat: options.numberFormat,
    dateOrder: options.dateOrder,
    ...(options.profile ? { profile: { ...options.profile, labels: { ...options.profile.labels } } } : {}),
  };
}

function startingOptions(options?: Partial<ExtractionOptions>): ExtractionOptions {
  const profile = options?.profile ? parseMappingProfile(options.profile) : null;
  return {
    numberFormat: options?.numberFormat === "dot" || options?.numberFormat === "comma" ? options.numberFormat : "auto",
    dateOrder: options?.dateOrder === "dmy" || options?.dateOrder === "mdy" ? options.dateOrder : "auto",
    ...(profile ? { profile } : {}),
  };
}

function duplicatePeers(record: InvoiceRecord, records: readonly InvoiceRecord[]): string {
  if (record.status !== "ready" || !record.included) return "";
  return JSON.stringify(records.filter(other => other.id !== record.id && other.status === "ready" && other.included &&
    validateInvoice(record, [record, other]).some(issue => issue.code === "duplicate_invoice")).map(other => other.id).sort());
}

function checkPdfHeader(file: File, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    const reader = new FileReader();
    const clean = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reader.onload = reader.onerror = reader.onabort = null;
    };
    const stop = () => { clean(); reader.abort(); reject(new Error("The local file check stopped.")); };
    const abort = () => { clean(); reader.abort(); reject(new DOMException("Cancelled", "AbortError")); };
    const timer = window.setTimeout(stop, INVOICE_LIMITS.processMs);
    signal.addEventListener("abort", abort, { once: true });
    reader.onload = () => {
      const buffer = reader.result;
      clean();
      resolve(buffer instanceof ArrayBuffer && new TextDecoder("latin1").decode(buffer).includes("%PDF-"));
    };
    reader.onerror = stop;
    reader.onabort = abort;
    try { reader.readAsArrayBuffer(file.slice(0, 1024)); } catch { stop(); }
  });
}

function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    void work.then(value => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) abort();
      else resolve(value);
    }, error => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
  });
}

export default function InvoiceWorkspaceApp({ initialOptions }: InvoiceWorkspaceProps = {}) {
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [sources, setSources] = useState<Map<string, File>>(() => new Map());
  const [options, setOptions] = useState<ExtractionOptions>(() => startingOptions(initialOptions));
  const [activity, setActivity] = useState<Activity>("idle");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [rejections, setRejections] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [exportError, setExportError] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [reviewRevision, setReviewRevision] = useState(0);
  const [dragging, setDragging] = useState(false);
  const recordsRef = useRef<InvoiceRecord[]>([]);
  const filesRef = useRef(new Map<string, File>());
  const optionsRef = useRef<ExtractionOptions>(options);
  const activityRef = useRef<Activity>("idle");
  const selectedRef = useRef<string | null>(null);
  const confirmationRef = useRef<Confirmation>(null);
  const templateBusyRef = useRef(false);
  const reviewRevisionRef = useRef(0);
  const generation = useRef(0);
  const nextId = useRef(0);
  const mounted = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const pdfLane = useRef<Promise<void>>(Promise.resolve());
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const focusFrame = useRef(0);
  const { download, revokeAll } = useLocalDownloads();

  const invalidateAcknowledgements = useCallback(() => {
    reviewRevisionRef.current++;
    setReviewRevision(reviewRevisionRef.current);
  }, []);

  const updateRecords = useCallback((updater: (previous: InvoiceRecord[]) => InvoiceRecord[], reconcile = true) => {
    if (!mounted.current) return;
    const previous = recordsRef.current;
    const candidate = updater(previous);
    let next = reconcile ? reconcileReviews(previous, candidate) : candidate;
    if (reconcile) {
      const changedPeers = new Set(previous.filter(before => {
        const after = next.find(record => record.id === before.id);
        return after && before.status === "ready" && duplicatePeers(before, previous) !== duplicatePeers(after, next);
      }).map(record => record.id));
      // A third duplicate changes the review context even if its warning text is unchanged.
      if (changedPeers.size) {
        next = next.map(record => changedPeers.has(record.id) ? { ...record, reviewed: false } : record);
        invalidateAcknowledgements();
      }
    }
    recordsRef.current = next;
    setRecords(next);
  }, [invalidateAcknowledgements]);

  const changeActivity = useCallback((value: Activity) => {
    activityRef.current = value;
    if (mounted.current) setActivity(value);
  }, []);

  const selectRecord = useCallback((id: string | null) => {
    selectedRef.current = id;
    setSelectedId(id);
  }, []);

  const openReview = useCallback((id: string) => {
    selectRecord(id);
    window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = window.requestAnimationFrame(() => {
      if (!mounted.current) return;
      const panel = document.getElementById("iw-review-panel");
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({ block: "start" });
    });
  }, [selectRecord]);

  const showConfirmation = useCallback((value: Confirmation) => {
    confirmationRef.current = value;
    setConfirmation(value);
  }, []);

  const changeTemplateBusy = useCallback((busy: boolean) => {
    if (!mounted.current) return;
    templateBusyRef.current = busy;
    setTemplateBusy(busy);
  }, []);

  const disposeWorkspace = useCallback(() => {
    mounted.current = false;
    generation.current++;
    window.cancelAnimationFrame(focusFrame.current);
    controllerRef.current?.abort();
    controllerRef.current = null;
    filesRef.current.clear();
    recordsRef.current = [];
    revokeAll();
  }, [revokeAll]);

  useEffect(() => {
    mounted.current = true;
    return disposeWorkspace;
  }, [disposeWorkspace]);

  useEffect(() => {
    if (!records.length) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!recordsRef.current.length) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [records.length]);

  const exportable = useMemo(() => exportableInvoices(records), [records]);
  const currencyTotals = useMemo(() => getCurrencyTotals(records), [records]);
  const selected = records.find(record => record.id === selectedId);
  const needsReview = records.filter(record => record.status === "ready" && !record.reviewed).length;
  const failed = records.filter(record => record.status === "failed").length;
  const cancelled = records.filter(record => record.status === "cancelled").length;
  const sampleCount = records.filter(record => record.sample).length;
  const totalBytes = records.reduce((sum, record) => sum + record.fileSize, 0);
  const includedReady = records.filter(record => record.status === "ready" && record.included).length;
  const nextToReview = records.find(record => record.id !== selectedId && record.status === "ready" && record.included && !record.reviewed);
  const globalLocked = activity !== "idle" || templateBusy || confirmation !== null;
  const fieldsLocked = activity === "exporting" || activity === "reextracting" || templateBusy || confirmation !== null;
  const visibleRecords = records.filter(record => filter === "all" ||
    filter === "needs-review" && record.status === "ready" && !record.reviewed ||
    filter === "reviewed" && record.status === "ready" && record.reviewed ||
    filter === "failed" && record.status === "failed");

  function current(token: number) { return mounted.current && generation.current === token; }
  function idle() { return activityRef.current === "idle" && !templateBusyRef.current && confirmationRef.current === null; }
  function mutationsLocked() {
    return !mounted.current || activityRef.current === "exporting" || activityRef.current === "reextracting" ||
      templateBusyRef.current || confirmationRef.current !== null;
  }

  async function processQueue(ids: string[], token: number, extractionOptions: ExtractionOptions) {
    if (!current(token)) return;
    changeActivity("processing");
    setProgress({ index: 1, total: ids.length, name: "", page: 0, pages: 0, completed: 0 });
    // Aborted client reads cannot create a worker after their pending file/hash await.
    const job = pdfLane.current.then(async () => {
      let selectedFirstReady = false;
      for (let index = 0; index < ids.length; index++) {
        if (!current(token)) return;
        const id = ids[index];
        const record = recordsRef.current.find(item => item.id === id);
        if (!record || record.status !== "queued") continue;
        const file = filesRef.current.get(id);
        if (!file) {
          updateRecords(previous => previous.map(item => item.id === id ? { ...item, status: "failed", reviewed: false, error: "The source file is no longer available. Remove this record and select the PDF again." } : item));
          continue;
        }
        const controller = new AbortController();
        controllerRef.current = controller;
        let timedOut = false;
        const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, INVOICE_LIMITS.processMs);
        updateRecords(previous => previous.map(item => item.id === id ? { ...item, status: "processing", reviewed: false, error: undefined } : item));
        setProgress({ index: index + 1, total: ids.length, name: file.name, page: 0, pages: 0, completed: index });
        try {
          const pdf = await abortable(readInvoicePdf(file, controller.signal, (page, pages) => {
            if (current(token) && !controller.signal.aborted) {
              setProgress({ index: index + 1, total: ids.length, name: file.name, page, pages, completed: index });
            }
          }), controller.signal);
          if (!current(token)) return;
          if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
          const result = await extractInvoiceLocally(pdf.lines, extractionOptions, controller.signal);
          if (!current(token)) return;
          updateRecords(previous => previous.map(item => item.id === id ? {
            ...item, ...pdf, fields: result.fields, evidence: result.evidence, extractionIssues: result.issues,
            kind: result.kind, status: "ready", reviewed: false, error: undefined,
          } : item));
          if (!selectedFirstReady) {
            const selection = recordsRef.current.find(item => item.id === selectedRef.current);
            if (!selection || selection.status !== "ready") selectRecord(id);
            selectedFirstReady = true;
          }
        } catch (error: unknown) {
          if (!current(token)) return;
          updateRecords(previous => previous.map(item => item.id === id ? {
            ...item, status: controller.signal.aborted && !timedOut ? "cancelled" : "failed", reviewed: false,
            error: timedOut ? "This PDF exceeded the 30-second processing limit. Try a smaller or simpler export." : pdfErrorMessage(error),
          } : item));
        } finally {
          window.clearTimeout(timer);
          if (controllerRef.current === controller) controllerRef.current = null;
        }
        if (current(token)) setProgress(previous => previous ? { ...previous, completed: index + 1 } : previous);
      }
    });
    pdfLane.current = job.catch(() => {});
    try {
      await job;
      if (!current(token)) return;
      const completed = recordsRef.current.filter(record => ids.includes(record.id));
      const readyCount = completed.filter(record => record.status === "ready").length;
      const failureCount = completed.filter(record => record.status === "failed").length;
      setNotice({ tone: failureCount ? "neutral" : "success", text: `${readyCount} ${readyCount === 1 ? "invoice is" : "invoices are"} ready for review.${failureCount ? ` ${failureCount} ${failureCount === 1 ? "file could" : "files could"} not be read; see the file details.` : " Check every field against the original before marking it reviewed."}` });
    } catch {
      if (!current(token)) return;
      updateRecords(previous => previous.map(record => ids.includes(record.id) && ["queued", "processing"].includes(record.status) ? {
        ...record, status: "failed", reviewed: false, error: "Local processing stopped unexpectedly. Retry the file or use a simpler text-based PDF.",
      } : record));
      setNotice({ tone: "error", text: "Local processing stopped. Previously ready invoices were kept; remaining files need a retry." });
    } finally {
      if (current(token)) { changeActivity("idle"); setProgress(null); }
    }
  }

  async function addFiles(incoming: File[], sample = false, initialRejections: string[] = []) {
    if (!idle()) {
      setNotice({ tone: "neutral", text: "These files were not added. Finish or cancel the current operation, then select them again." });
      return;
    }
    if (!incoming.length) {
      setRejections(initialRejections.length ? initialRejections : ["No readable files were selected. Choose individual PDF files, not a folder or link."]);
      return;
    }
    const token = ++generation.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    changeActivity("checking");
    setNotice(null);
    setExportError("");
    setRejections([]);
    const rejected = [...initialRejections];
    const accepted: File[] = [];
    let acceptedBytes = 0;
    try {
      for (let index = 0; index < incoming.length; index++) {
        if (!current(token)) return;
        const file = incoming[index];
        setProgress({ index: index + 1, total: incoming.length, name: file.name, page: 0, pages: 0, completed: index });
        const reject = (reason: string) => rejected.push(`${file.name || "Unnamed file"}: ${reason}`);
        if (file.webkitRelativePath) { reject("Folders are not supported. Select this PDF individually."); continue; }
        if (!/\.pdf$/i.test(file.name)) { reject("Only .pdf files are accepted. Renaming another format does not convert it."); continue; }
        if (!file.size) { reject("This file is empty."); continue; }
        if (file.size > INVOICE_LIMITS.fileBytes) { reject("This PDF exceeds the 10 MB per-file limit."); continue; }
        if (recordsRef.current.length + accepted.length >= INVOICE_LIMITS.files) { reject("The workspace holds at most 20 files. Remove a file before adding this one."); continue; }
        const activeBytes = recordsRef.current.reduce((sum, record) => sum + record.fileSize, 0);
        if (activeBytes + acceptedBytes + file.size > INVOICE_LIMITS.batchBytes) { reject("This PDF would exceed the 50 MB active-batch limit. Remove a file first."); continue; }
        try {
          const validHeader = await checkPdfHeader(file, controller.signal);
          if (!current(token)) return;
          if (!validHeader) { reject("No PDF header was found. Use a real, non-empty PDF export."); continue; }
        } catch {
          if (!current(token) || controller.signal.aborted) return;
          reject("The PDF header could not be checked within 30 seconds. Try selecting the file again.");
          continue;
        }
        accepted.push(file);
        acceptedBytes += file.size;
      }
      if (!current(token)) return;
      setRejections(rejected);
      if (!accepted.length) {
        setNotice({ tone: "error", text: "No files were added. Check the reasons below and choose supported PDFs." });
        return;
      }
      const additions: InvoiceRecord[] = accepted.map(file => {
        const id = `invoice-${token}-${++nextId.current}`;
        filesRef.current.set(id, file);
        return {
          id, fileName: file.name, fileSize: file.size, fileHash: "", pageCount: 0, lines: [],
          fields: emptyFields(), evidence: {}, extractionIssues: [], kind: "unknown", status: "queued",
          included: true, reviewed: false, ...(sample ? { sample: true } : {}),
        };
      });
      setSources(new Map(filesRef.current));
      updateRecords(previous => [...previous, ...additions]);
      selectRecord(additions[0].id);
      setFilter("all");
      if (controllerRef.current === controller) controllerRef.current = null;
      await processQueue(additions.map(record => record.id), token, copyOptions(optionsRef.current));
    } catch {
      if (current(token)) {
        setRejections(rejected);
        setNotice({ tone: "error", text: "The files could not be prepared locally. Your existing invoices were kept. Try selecting the files again." });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (current(token) && activityRef.current === "checking") { changeActivity("idle"); setProgress(null); }
    }
  }

  function cancelProcessing() {
    const wasChecking = activityRef.current === "checking";
    if (!wasChecking && activityRef.current !== "processing") return;
    generation.current++;
    controllerRef.current?.abort();
    controllerRef.current = null;
    updateRecords(previous => previous.map(record => record.status === "queued" || record.status === "processing" ? {
      ...record, status: "cancelled", reviewed: false, error: undefined,
    } : record));
    changeActivity("idle");
    setProgress(null);
    setNotice({ tone: "neutral", text: wasChecking ? "File checks cancelled. No pending files were added; existing invoices were kept." : "Processing cancelled. The current and remaining files are marked cancelled. Previously ready invoices were kept." });
  }

  function retry(ids: string[]) {
    if (!idle()) return;
    const eligible = recordsRef.current.filter(record => ids.includes(record.id) && (record.status === "failed" || record.status === "cancelled"));
    if (!eligible.length) return;
    const retryIds = eligible.map(record => record.id);
    const token = ++generation.current;
    updateRecords(previous => previous.map(record => retryIds.includes(record.id) ? { ...record, status: "queued", reviewed: false, error: undefined } : record));
    setNotice(null);
    setFilter("all");
    void processQueue(retryIds, token, copyOptions(optionsRef.current));
  }

  function editField(id: string, field: InvoiceField, value: string) {
    if (mutationsLocked()) return;
    updateRecords(previous => previous.map(record => record.id === id && record.status === "ready" && record.fields[field] !== value ? {
      ...record, fields: { ...record.fields, [field]: value }, reviewed: false,
    } : record));
  }

  function commitField(id: string, field: InvoiceField, raw: string, source?: SourceLine, format: "dot" | "comma" = "dot") {
    if (mutationsLocked()) return;
    updateRecords(previous => previous.map(record => {
      if (record.id !== id || record.status !== "ready") return record;
      const line = source && record.lines.find(item => item.id === source.id && item.page === source.page && item.text === source.text);
      if (source && !line) return record;
      const normalized = normalizeField(field, raw, {
        ...optionsRef.current, numberFormat: format, dateOrder: source ? optionsRef.current.dateOrder : "auto",
      });
      const value = normalized ?? raw;
      const evidence: Evidence = line ? { lineId: line.id, page: line.page, text: line.text, method: "manual" } :
        record.evidence[field] ? { ...record.evidence[field]!, method: "manual" } :
          { lineId: "manual", page: 0, text: "Manual entry; no original source line was selected.", method: "manual" };
      if (value === record.fields[field] && JSON.stringify(evidence) === JSON.stringify(record.evidence[field])) return record;
      return { ...record, fields: { ...record.fields, [field]: value }, evidence: { ...record.evidence, [field]: evidence }, reviewed: false };
    }));
  }

  function includeRecord(id: string, included: boolean) {
    if (mutationsLocked()) return;
    updateRecords(previous => previous.map(record => record.id === id && record.status === "ready" && record.included !== included ? { ...record, included, reviewed: false } : record));
  }

  function markReviewed(id: string, acknowledgement: string, revision: number) {
    if (mutationsLocked() || revision !== reviewRevisionRef.current) return;
    // Only this action can grant a review; recheck against the current ref snapshot.
    updateRecords(previous => {
      const record = previous.find(item => item.id === id);
      if (!record || !canReview(record, previous) || reviewKey(record, previous) !== acknowledgement) return previous;
      return previous.map(item => item.id === id ? { ...item, reviewed: true } : item);
    }, false);
  }

  function removeRecord(id: string) {
    if (mutationsLocked()) return;
    const record = recordsRef.current.find(item => item.id === id);
    if (!record || record.status === "queued" || record.status === "processing") return;
    filesRef.current.delete(id);
    setSources(new Map(filesRef.current));
    updateRecords(previous => previous.filter(item => item.id !== id));
    if (selectedRef.current === id) selectRecord(recordsRef.current.find(item => item.status === "ready")?.id ?? recordsRef.current[0]?.id ?? null);
  }

  function changeOptions(next: ExtractionOptions) {
    if (!idle()) return;
    const nextOptions = copyOptions(next);
    if (JSON.stringify(nextOptions) === JSON.stringify(optionsRef.current)) return;
    optionsRef.current = nextOptions;
    setOptions(nextOptions);
    invalidateAcknowledgements();
    updateRecords(previous => previous.map(record => record.status === "ready" && record.included ? { ...record, reviewed: false } : record));
    setNotice({ tone: "neutral", text: "Extraction settings changed. Existing fields were kept, and included reviews were cleared. Use Re-extract included invoices to replace those fields, or check and review them as they are." });
  }

  function changeProfile(profile: MappingProfile | undefined) {
    changeOptions({ numberFormat: optionsRef.current.numberFormat, dateOrder: optionsRef.current.dateOrder, ...(profile ? { profile } : {}) });
  }

  async function reextractIncluded() {
    if (activityRef.current !== "idle" || templateBusyRef.current || confirmationRef.current !== "reextract") return;
    const ids = recordsRef.current.filter(record => record.status === "ready" && record.included).map(record => record.id);
    showConfirmation(null);
    if (!ids.length) return;
    const token = ++generation.current;
    const extractionOptions = copyOptions(optionsRef.current);
    const controller = new AbortController();
    controllerRef.current = controller;
    changeActivity("reextracting");
    invalidateAcknowledgements();
    setNotice(null);
    updateRecords(previous => previous.map(record => ids.includes(record.id) ? { ...record, reviewed: false } : record));
    try {
      for (let index = 0; index < ids.length; index++) {
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
        if (!current(token)) return;
        const record = recordsRef.current.find(item => item.id === ids[index] && item.included && item.status === "ready");
        if (!record) continue;
        setProgress({ index: index + 1, total: ids.length, name: record.fileName, page: 0, pages: 0, completed: index });
        const result = await extractInvoiceLocally(record.lines, extractionOptions, controller.signal);
        if (!current(token)) return;
        updateRecords(previous => previous.map(item => item.id === record.id ? {
          ...item, fields: result.fields, evidence: result.evidence, extractionIssues: result.issues, kind: result.kind, reviewed: false,
        } : item));
      }
      if (current(token)) setNotice({ tone: "success", text: `${ids.length} included ${ids.length === 1 ? "invoice was" : "invoices were"} re-extracted from stored text. Manual edits were replaced and reviews cleared. No PDFs were reopened.` });
    } catch {
      if (current(token)) setNotice({ tone: "error", text: "Re-extraction stopped. Some fields may have been replaced; all affected invoices remain unreviewed. Check each one before export." });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (current(token)) { changeActivity("idle"); setProgress(null); }
    }
  }

  function clearWorkspace() {
    generation.current++;
    window.cancelAnimationFrame(focusFrame.current);
    controllerRef.current?.abort();
    controllerRef.current = null;
    revokeAll();
    filesRef.current.clear();
    setSources(new Map());
    updateRecords(() => []);
    optionsRef.current = DEFAULT_OPTIONS;
    setOptions(DEFAULT_OPTIONS);
    selectRecord(null);
    changeActivity("idle");
    changeTemplateBusy(false);
    showConfirmation(null);
    setProgress(null);
    setRejections([]);
    setExportError("");
    setExportFormat("xlsx");
    setFilter("all");
    invalidateAcknowledgements();
    setDragging(false);
    dragDepth.current = 0;
    setWorkspaceVersion(previous => previous + 1);
    if (fileInput.current) fileInput.current.value = "";
    setNotice({ tone: "neutral", text: "Workspace cleared. Files, fields, reviews and templates were removed from this workspace’s memory." });
  }

  async function exportInvoices() {
    if (!idle()) return;
    const snapshot = recordsRef.current.slice();
    const ready = exportableInvoices(snapshot);
    if (!ready.length) { setExportError("Include and explicitly review at least one valid invoice first."); return; }
    const fingerprints = new Map(ready.map(record => [record.id, reviewKey(record, snapshot)]));
    const format = exportFormat;
    const token = ++generation.current;
    changeActivity("exporting");
    setExportError("");
    setNotice(null);
    try {
      const blob = format === "xlsx" ? await createInvoiceWorkbook(snapshot) :
        new Blob([buildInvoiceCsv(snapshot, format === "csv-semicolon" ? ";" : ",")], { type: "text/csv;charset=utf-8" });
      if (!current(token)) return;
      const now = recordsRef.current;
      const stillExportable = exportableInvoices(now);
      if (stillExportable.length !== ready.length || stillExportable.some(record => fingerprints.get(record.id) !== reviewKey(record, now))) {
        setExportError("The batch changed before the download was ready. Nothing was downloaded. Check the reviews and try again.");
        return;
      }
      const extension = format === "xlsx" ? "xlsx" : "csv";
      download(blob, `byteverse-invoices-${new Date().toISOString().slice(0, 10)}.${extension}`);
      setNotice({ tone: "success", text: `Download requested for ${ready.length} reviewed ${ready.length === 1 ? "invoice" : "invoices"}. Check your browser’s downloads. The batch stays here until you clear or reload it.` });
    } catch {
      if (current(token)) setExportError("The local export could not be prepared. Your batch is unchanged. Try again or choose another format.");
    } finally {
      if (current(token)) changeActivity("idle");
    }
  }

  function trySamples() {
    if (!idle()) return;
    try {
      const files = SAMPLE_INVOICES.map(sample => new File([new Uint8Array(makeSamplePdf(sample.lines))], sample.name, { type: "application/pdf" }));
      void addFiles(files, true);
    } catch {
      setNotice({ tone: "error", text: "The fictional samples could not be created in this browser. No invoice data was changed." });
    }
  }

  function dropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    if (!idle()) {
      setNotice({ tone: "neutral", text: "Dropped files were not added while the workspace is busy. Try again after the current operation finishes or is cancelled." });
      return;
    }
    const files: File[] = [];
    const rejected: string[] = [];
    const items = Array.from(event.dataTransfer.items);
    if (items.length) {
      for (const item of items) {
        if (item.kind !== "file") { rejected.push("A dropped link or text item was not added. Drop individual PDF files instead."); continue; }
        try {
          const entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
          if (entry?.isDirectory) { rejected.push(`${entry.name}: Folders are not supported. Select individual PDF files.`); continue; }
          const file = item.getAsFile();
          if (file) files.push(file);
          else rejected.push("A dropped item could not be read as a file. Select the PDF using the file picker.");
        } catch {
          rejected.push("A dropped item could not be inspected safely. Select the PDF using the file picker.");
        }
      }
    } else files.push(...Array.from(event.dataTransfer.files));
    void addFiles(files, false, rejected);
  }

  const progressTitle = activity === "checking" ? "Checking files before processing" : activity === "reextracting" ? "Re-extracting stored text" : "Reading PDFs, one at a time";
  const omission = {
    excluded: records.filter(record => !record.included).length,
    review: records.filter(record => record.included && record.status === "ready" && !exportable.some(item => item.id === record.id)).length,
    failed: records.filter(record => record.included && record.status === "failed").length,
    cancelled: records.filter(record => record.included && record.status === "cancelled").length,
    waiting: records.filter(record => record.included && (record.status === "queued" || record.status === "processing")).length,
  };

  return (
    <main className="iw-shell" aria-labelledby="iw-workspace-title"
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault();
        setNotice({ tone: "neutral", text: "Files were not added. Drop them in the upload area or use Select PDF files." });
      }}>
      <header className="iw-header">
        <div>
          <p className="iw-eyebrow"><LockKeyhole aria-hidden="true" size={13} /> A PRIVATE, ON-DEVICE WORKSPACE</p>
          <h2 id="iw-workspace-title">Your invoice workspace</h2>
          <p className="iw-intro">From PDF to spreadsheet. With a proper check in between.</p>
        </div>
        <div className="iw-header-actions">
          <span className="iw-private-chip"><ShieldCheck aria-hidden="true" size={16} /> No upload</span>
          <button type="button" className="iw-button iw-button-quiet" onClick={() => {
            if (recordsRef.current.length) showConfirmation("clear");
            else clearWorkspace();
          }}><Trash2 aria-hidden="true" size={16} /> Clear workspace</button>
        </div>
      </header>

      {confirmation === "clear" && <section className="iw-confirmation" aria-labelledby="iw-clear-heading">
        <h3 id="iw-clear-heading">Clear this workspace?</h3>
        <p>Remove all files, extracted fields, manual edits, reviews and templates from memory. Any active processing or pending export will be cancelled. Files already downloaded to your device are not deleted.</p>
        <div className="iw-button-row">
          <button type="button" className="iw-button iw-button-danger" onClick={clearWorkspace}>Clear files, fields &amp; templates</button>
          <button type="button" className="iw-button" onClick={() => showConfirmation(null)}>Keep workspace</button>
        </div>
      </section>}

      <ol className="iw-steps" aria-label="Invoice workflow">
        <li className={records.length ? "iw-step-complete" : "iw-step-current"}><span>01</span><div><strong>Add PDFs</strong><small>Digital text, not scans</small></div></li>
        <li className={records.length && !exportable.length ? "iw-step-current" : ""}><span>02</span><div><strong>Review each invoice</strong><small>Your check stays in control</small></div></li>
        <li className={exportable.length ? "iw-step-current" : ""}><span>03</span><div><strong>Export your spreadsheet</strong><small>Only reviewed, included files</small></div></li>
      </ol>

      <section className={`iw-card iw-upload-card ${records.length ? "iw-upload-compact" : ""}`} aria-label="Add invoice PDFs">
        <div className={`iw-dropzone ${dragging ? "iw-dropzone-active" : ""} ${globalLocked ? "iw-dropzone-disabled" : ""}`}
          onDragEnter={event => { event.preventDefault(); dragDepth.current++; if (idle()) setDragging(true); }}
          onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
          onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = globalLocked ? "none" : "copy"; }}
          onDrop={dropFiles}>
          <button type="button" className="iw-dropzone-target" disabled={globalLocked} aria-label="Select PDF files" aria-describedby="iw-upload-limits"
            onClick={() => fileInput.current?.click()}>
            <span className="iw-upload-icon"><Upload aria-hidden="true" size={27} strokeWidth={1.6} /></span>
            <span className="iw-upload-copy"><strong>{records.length ? "Add more invoices" : "Drop your invoices here"}</strong><span>One invoice per PDF. Processed only in this workspace.</span></span>
            <span className="iw-dropzone-cta"><FilePlus2 aria-hidden="true" size={17} /> Select PDF files</span>
          </button>
        </div>
        <input ref={fileInput} type="file" multiple accept=".pdf" className="iw-sr-only" tabIndex={-1} aria-label="Invoice PDF files" disabled={globalLocked}
          onChange={event => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            if (files.length) void addFiles(files);
          }} />
        <div className="iw-upload-footer">
          <div id="iw-upload-limits"><strong>20 PDFs · 10 MB each · digital PDFs</strong><span>50 MB active batch · 15 pages per file · 30 seconds per file</span></div>
          <button type="button" className="iw-text-button iw-sample-button" disabled={globalLocked} onClick={trySamples}>
            <FlaskConical aria-hidden="true" size={16} /> Try sample invoices <span className="iw-small-label">3 fictional PDFs</span><ArrowRight aria-hidden="true" size={15} />
          </button>
        </div>
        <p className="iw-upload-disclaimer">Text-based PDFs only. No OCR, credit notes or multiple invoices in one PDF. Failed and excluded files still count toward the active-batch limits until removed.</p>
      </section>

      <div className="iw-live-region" aria-live="polite" aria-atomic="true" role="status">
        {notice && <p className={`iw-notice iw-notice-${notice.tone}`}><Info aria-hidden="true" size={18} /> {notice.text}</p>}
      </div>
      {rejections.length > 0 && <section className="iw-rejections" aria-labelledby="iw-rejected-heading" role="alert">
        <div className="iw-section-heading"><h3 id="iw-rejected-heading"><AlertCircle aria-hidden="true" size={18} /> {rejections.length} {rejections.length === 1 ? "item was" : "items were"} not added</h3>
          <button type="button" className="iw-icon-button" aria-label="Dismiss rejected-file messages" onClick={() => setRejections([])}><X aria-hidden="true" size={17} /></button></div>
        <ul>{rejections.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
      </section>}

      {(activity === "checking" || activity === "processing" || activity === "reextracting") && <section className="iw-processing" aria-label="Batch progress">
        <div className="iw-section-heading">
          <div className="iw-processing-text" role="status" aria-live="polite" aria-atomic="true">
            <strong><FileClock aria-hidden="true" size={18} /> {progressTitle}</strong>
            {progress && <p>{progress.index} of {progress.total}{progress.name ? ` · ${progress.name}` : " · Preparing local reader…"}{activity === "processing" ? progress.pages ? ` · Page ${progress.page} of ${progress.pages}` : " · Opening PDF" : ""}</p>}
          </div>
          {activity !== "reextracting" && <button type="button" className="iw-button" onClick={cancelProcessing}><Square aria-hidden="true" size={14} /> Cancel processing</button>}
        </div>
        {progress && <progress value={progress.completed} max={Math.max(1, progress.total)} aria-label="Files completed" />}
        <p className="iw-note">{activity === "reextracting" ? "Using stored source lines, without reopening PDFs." : "Ready invoices remain available to check. New duplicates can invalidate an earlier review."}</p>
      </section>}

      {records.length > 0 && <>
        <dl className="iw-stats" aria-label="Workspace totals">
          <div><dt>Total files</dt><dd>{records.length}<FileText aria-hidden="true" size={20} /></dd><span>{fileSize(totalBytes)} in memory</span></div>
          <div><dt>Needs review</dt><dd>{needsReview}<FileCheck2 aria-hidden="true" size={20} /></dd><span>Check fields &amp; warnings</span></div>
          <div className="iw-stat-reviewed"><dt>Reviewed &amp; exportable</dt><dd>{exportable.length}<BadgeCheck aria-hidden="true" size={20} /></dd><span>Valid, reviewed &amp; included</span></div>
          <div><dt>Failed</dt><dd>{failed}<AlertCircle aria-hidden="true" size={20} /></dd><span>{cancelled ? `${cancelled} also cancelled` : "Not eligible for export"}</span></div>
        </dl>
        {sampleCount > 0 && <p className="iw-notice iw-notice-neutral"><FlaskConical aria-hidden="true" size={18} /> This batch contains {sampleCount} fictional {sampleCount === 1 ? "sample" : "samples"}. Exclude or remove samples before exporting real transactions.</p>}
        <div className="iw-workbench">
          <section className="iw-card iw-batch" aria-labelledby="iw-batch-heading">
            <div className="iw-batch-header"><div><p className="iw-eyebrow">YOUR FILES</p><h3 id="iw-batch-heading">Invoice batch <span>{records.length}</span></h3></div></div>
            <div className="iw-filters" aria-label="Filter invoice batch">
              {FILTERS.map(item => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}
            </div>
            {cancelled > 0 && <div className="iw-retry-all"><button type="button" className="iw-button" disabled={globalLocked}
              onClick={() => retry(recordsRef.current.filter(record => record.status === "cancelled").map(record => record.id))}>
              <RotateCcw aria-hidden="true" size={15} /> Retry all cancelled ({cancelled})
            </button></div>}
            <p className="iw-batch-help">The checkbox includes a file in the export selection; it does not mark it reviewed.</p>
            {visibleRecords.length ? <ul className="iw-file-list">
              {visibleRecords.map(record => {
                const invalid = record.status === "ready" && validateInvoice(record, records).some(issue => issue.severity === "error");
                const status = record.status === "ready" ? invalid ? "Needs correction" : record.reviewed ? "Reviewed" : "Needs review" :
                  record.status === "queued" ? "Queued" : record.status === "processing" ? "Reading PDF" : record.status === "cancelled" ? "Cancelled" : "Failed";
                const tone = record.status === "failed" || invalid ? "error" : record.reviewed ? "success" : record.status === "ready" ? "warning" : "neutral";
                return <li key={record.id} className={`iw-file-row ${record.id === selectedId ? "iw-file-selected" : ""}`}>
                  <div className="iw-file-main">
                    <input type="checkbox" checked={record.included} disabled={fieldsLocked || record.status !== "ready"}
                      aria-label={`Include ${record.fileName} in export`} onChange={event => includeRecord(record.id, event.target.checked)} />
                    <div className="iw-file-info"><strong>{record.fileName}</strong><span>{fileSize(record.fileSize)} · {record.pageCount ? `${record.pageCount} ${record.pageCount === 1 ? "page" : "pages"}` : "Pages not read"}</span></div>
                    <button type="button" className="iw-icon-button iw-remove" aria-label={`Remove ${record.fileName}`}
                      disabled={fieldsLocked || record.status === "queued" || record.status === "processing"} onClick={() => removeRecord(record.id)}><Trash2 aria-hidden="true" size={16} /></button>
                  </div>
                  <div className="iw-file-tags"><span className={`iw-pill iw-pill-${tone}`}>{status}</span>{!record.included && <span className="iw-pill iw-pill-neutral">Excluded</span>}{record.sample && <span className="iw-pill iw-pill-sample">Fictional sample</span>}</div>
                  {record.error && <p className="iw-file-error">{record.error}</p>}
                  <div className="iw-file-actions"><button type="button" className="iw-text-button" aria-pressed={record.id === selectedId}
                    aria-controls="iw-review-panel" onClick={() => openReview(record.id)}>{record.status === "ready" ? record.reviewed ? "View review" : "Review" : "File details"}<ArrowRight aria-hidden="true" size={14} /></button>
                    {(record.status === "failed" || record.status === "cancelled") && <button type="button" className="iw-text-button" disabled={globalLocked} onClick={() => retry([record.id])}><RotateCcw aria-hidden="true" size={14} /> Retry</button>}
                  </div>
                </li>;
              })}
            </ul> : <p className="iw-empty-text">No files match this filter. Try All files.</p>}
          </section>

          {selected?.status === "ready" ? <InvoiceReview key={`${workspaceVersion}-${selected.id}`} record={selected} file={sources.get(selected.id)} records={records} options={options}
            reviewRevision={reviewRevision} disabled={fieldsLocked} previewPaused={activity === "checking" || activity === "processing"} hasNext={Boolean(nextToReview)} onFieldChange={editField} onFieldCommit={commitField}
            onIncludeChange={includeRecord} onMarkReviewed={markReviewed} onNext={() => { if (nextToReview) { openReview(nextToReview.id); setFilter("all"); } }} /> :
            <section id="iw-review-panel" tabIndex={-1} className="iw-card iw-review-placeholder" aria-label="Selected file details">
              <span className="iw-placeholder-icon"><FileClock aria-hidden="true" size={34} strokeWidth={1.4} /></span>
              <h3>{selected?.fileName ?? "Choose an invoice to review"}</h3>
              <p>{selected?.status === "failed" ? selected.error ?? "This PDF could not be read." : selected?.status === "cancelled" ? "Processing was cancelled. The source file stays in memory so you can retry it." : selected ? "This file is waiting for its local extraction to finish. Its fields will appear here when ready." : "Select a file from your batch to compare its fields with the original."}</p>
              {selected?.sample && <span className="iw-pill iw-pill-sample">Fictional sample</span>}
              {selected && (selected.status === "failed" || selected.status === "cancelled") && <button type="button" className="iw-button" disabled={globalLocked} onClick={() => retry([selected.id])}><RotateCcw aria-hidden="true" size={16} /> Retry this file</button>}
              <p className="iw-note">Only ready invoices can be reviewed. Scans need OCR outside this tool; no OCR or AI service is connected here.</p>
            </section>}
        </div>
      </>}

      <details className="iw-card iw-advanced">
        <summary><span><SlidersHorizontal aria-hidden="true" size={19} /><span>Extraction settings &amp; templates<small>Optional · never silently overwrites existing fields</small></span></span><ChevronDown aria-hidden="true" size={18} /></summary>
        <div className="iw-advanced-content">
          <fieldset className="iw-fieldset" disabled={globalLocked}>
            <legend>Extraction defaults</legend>
            <div className="iw-field-grid">
              <div className="iw-field"><label htmlFor="iw-number-format">Numbers in the original PDF</label>
                <select id="iw-number-format" value={options.numberFormat} onChange={event => changeOptions({ ...optionsRef.current, numberFormat: event.target.value as NumberFormat })}>
                  <option value="auto">Auto · ambiguous amounts need review</option><option value="dot">1,234.56 · decimal point</option><option value="comma">1.234,56 · decimal comma</option>
                </select><p className="iw-field-hint">Auto does not guess whether 1,234 means a decimal or a thousand. Field editors always use a decimal point.</p>
              </div>
              <div className="iw-field"><label htmlFor="iw-date-order">Dates in the original PDF</label>
                <select id="iw-date-order" value={options.dateOrder} onChange={event => changeOptions({ ...optionsRef.current, dateOrder: event.target.value as DateOrder })}>
                  <option value="auto">Auto · flag ambiguous day/month dates</option><option value="dmy">DD/MM/YYYY · day first</option><option value="mdy">MM/DD/YYYY · month first</option>
                </select><p className="iw-field-hint">For example, 03/04/2026 stays unresolved in Auto. Calendar and ISO dates are not guessed from your locale.</p>
              </div>
            </div>
          </fieldset>
          <div className="iw-reextract">
            <p>Settings apply to newly processed files. Existing manual fields are kept; changing settings clears included reviews. Re-extraction replaces the fields and source evidence of <strong>{includedReady} ready, included {includedReady === 1 ? "invoice" : "invoices"}</strong> using stored text.</p>
            <button type="button" className="iw-button" disabled={globalLocked || !includedReady} onClick={() => showConfirmation("reextract")}><RotateCcw aria-hidden="true" size={16} /> Re-extract included invoices</button>
            {confirmation === "reextract" && <section className="iw-confirmation" aria-labelledby="iw-reextract-heading">
              <h4 id="iw-reextract-heading">Replace fields for {includedReady} included {includedReady === 1 ? "invoice" : "invoices"}?</h4>
              <p>This clears their manual changes and reviews. Excluded, failed and cancelled records are not re-extracted. No PDF is reopened.</p>
              <div className="iw-button-row"><button type="button" className="iw-button iw-button-primary" onClick={() => void reextractIncluded()}>Replace fields &amp; re-extract</button><button type="button" className="iw-button" onClick={() => showConfirmation(null)}>Keep current fields</button></div>
            </section>}
          </div>
          <MappingEditor key={workspaceVersion} profile={options.profile} disabled={globalLocked} onChange={changeProfile} onBusyChange={changeTemplateBusy} onDownload={download} />
        </div>
      </details>

      <section className="iw-card iw-export" aria-labelledby="iw-export-heading" aria-busy={activity === "exporting"}>
        <div className="iw-export-top">
          <div><p className="iw-eyebrow">03 / TAKE IT WITH YOU</p><h3 id="iw-export-heading"><FileSpreadsheet aria-hidden="true" size={22} /> Your spreadsheet, ready when you are</h3><p className="iw-export-summary">Reviewed included only; <strong>{records.length - exportable.length} not exported.</strong></p></div>
          <span className="iw-pill iw-pill-success">{exportable.length} ready to export</span>
        </div>
        {records.length - exportable.length > 0 && <p className="iw-omissions">{[
          omission.excluded ? `${omission.excluded} excluded` : "", omission.review ? `${omission.review} need review or correction` : "",
          omission.failed ? `${omission.failed} failed` : "", omission.cancelled ? `${omission.cancelled} cancelled` : "", omission.waiting ? `${omission.waiting} queued or processing` : "",
        ].filter(Boolean).join(" · ")}. These records will not be in this download.</p>}
        {currencyTotals.length ? <dl className="iw-currency-totals" aria-label="Reviewed invoice totals by currency">
          {currencyTotals.map(total => <div key={total.currency}><dt>{total.currency} <span>{total.count} {total.count === 1 ? "invoice" : "invoices"}</span></dt><dd>{total.total}</dd></div>)}
        </dl> : <p className="iw-export-empty">Currency totals will appear here after you review and include an invoice.</p>}
        <p className="iw-note">Currencies are kept separate. No conversion or combined multi-currency total.</p>
        {exportable.some(record => record.sample) && <p className="iw-sample-note">This export includes {exportable.filter(record => record.sample).length} fictional sample {exportable.filter(record => record.sample).length === 1 ? "invoice" : "invoices"}.</p>}
        <div className="iw-export-controls">
          <div className="iw-field"><label htmlFor="iw-export-format">Download format</label><select id="iw-export-format" value={exportFormat} disabled={globalLocked} onChange={event => setExportFormat(event.target.value as ExportFormat)}>
            <option value="xlsx">XLSX · recommended</option><option value="csv-comma">CSV · comma-separated</option><option value="csv-semicolon">CSV · semicolon-separated</option>
          </select></div>
          <button type="button" className="iw-button iw-button-primary iw-export-button" disabled={globalLocked || !exportable.length} onClick={() => void exportInvoices()}><Download aria-hidden="true" size={18} /> {activity === "exporting" ? "Preparing local export…" : `Export ${exportable.length} reviewed ${exportable.length === 1 ? "invoice" : "invoices"}`}</button>
        </div>
        {activity === "exporting" && <p className="iw-feedback" role="status">Building your file locally. Editing and new uploads are paused. Clearing the workspace cancels this pending download.</p>}
        {exportFormat === "xlsx" ? <p className="iw-export-sheets">3 sheets: <strong>Invoices</strong><span>·</span><strong>Currency totals</strong><span>·</span><strong>Review notes</strong></p> :
          <aside className="iw-csv-notes" aria-label="CSV limitations"><h4>Before choosing CSV</h4><ul>{Object.values(INVOICE_CSV_NOTES).map(note => <li key={note}>{note}</li>)}</ul></aside>}
        {exportError && <p className="iw-inline-error" role="alert">{exportError}</p>}
      </section>

      <footer className="iw-footer">
        <p><ShieldCheck aria-hidden="true" size={18} /><span>Files and invoice values stay in this isolated workspace. No upload, AI or automatic saving. Reloading clears the batch.</span></p>
        <span className="iw-footer-note">Do not rely on a browser close warning. Download anything you want to keep before leaving.</span>
        <details className="iw-licenses"><summary>Open-source licenses</summary><pre>{licenses}</pre></details>
      </footer>
    </main>
  );
}