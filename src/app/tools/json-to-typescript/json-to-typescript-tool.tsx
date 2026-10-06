"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Braces, ChevronDown, ChevronLeft, ChevronRight, Code2, Copy,
  Download, FileCode2, Info, Layers, ListChecks, Loader2, RotateCcw,
  Settings2, Table2, Upload, X,
} from "lucide-react";
import {
  formatBytes, inputSizeProblem, readTypeScriptJsonFile, typeScriptDownloadDetails,
} from "@/lib/json-typescript/input";
import { rootNameProblem } from "@/lib/json-typescript/naming";
import { JSON_TS_SAMPLES } from "@/lib/json-typescript/samples";
import {
  DEFAULT_JSON_TS_OPTIONS, JSON_TS_LIMITS,
  type JsonTsFormat, type JsonTsInspection, type JsonTsNotice, type JsonTsOptions,
  type JsonTsRequest, type JsonTsResponse, type JsonTsResult,
} from "@/lib/json-typescript/types";
import "./json-typescript.css";

type PendingKind = "read" | "inspect" | "generate";
type DownloadExtension = "ts" | "d.ts";
type Operation =
  | { id: number; kind: "read" }
  | {
    id: number;
    kind: "inspect" | "generate";
    instance: Worker;
    timer: ReturnType<typeof setTimeout> | null;
  };

interface FileCandidate {
  text: string;
  format: JsonTsFormat;
  label: string;
  inspection: JsonTsInspection;
}

type Confirmation = { id: number } & (
  | { kind: "clear" }
  | { kind: "sample"; sampleId: string }
  | { kind: "file"; candidate: FileCandidate }
);

const WORKER_FAULT = "The local worker could not complete this operation. Your input and settings were kept. Try again in a current browser or use a smaller JSON section.";
const WORKER_RESPONSE_FAULT = "The local worker returned an unexpected response. No new result was accepted. Try generating again or importing the file again.";
const number = (value: number) => value.toLocaleString("en-US");
const formatName = (format: JsonTsFormat) => format === "jsonl" ? "JSON Lines" : "JSON";

// Bound labels and make control/bidirectional characters visible, not operative.
// Full source and generated code remain available only in their text editors.
function shortLabel(text: string, limit = 80): string {
  let label = "";
  for (const character of text) {
    const code = character.codePointAt(0)!;
    const control = code < 32 || (code >= 127 && code <= 159) || code === 0x061c
      || code === 0x200e || code === 0x200f || (code >= 0x2028 && code <= 0x202e)
      || (code >= 0x2066 && code <= 0x2069) || code === 0xfeff;
    const part = control ? `\\u${code.toString(16).padStart(4, "0")}` : character;
    if (label.length + part.length > limit) return `${label}…`;
    label += part;
  }
  return label;
}

function lineCount(text: string): number {
  if (!text.length) return 0;
  let count = text.endsWith("\n") ? 0 : 1;
  for (let index = 0; index < text.length; index++) {
    if (text.charCodeAt(index) === 10) count++;
  }
  return count;
}

export function JsonToTypeScriptTool() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<JsonTsFormat>("json");
  const [options, setOptions] = useState<JsonTsOptions>({ ...DEFAULT_JSON_TS_OPTIONS });
  const [result, setResult] = useState<JsonTsResult | null>(null);
  const [pending, setPending] = useState<PendingKind | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [sampleId, setSampleId] = useState(JSON_TS_SAMPLES[0].id);
  const [sampleHint, setSampleHint] = useState("");
  const [importedFile, setImportedFile] = useState<Pick<FileCandidate, "label" | "inspection"> | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [copyPending, setCopyPending] = useState(false);
  const [view, setView] = useState<"code" | "fields">("code");
  const [codeDeclaration, setCodeDeclaration] = useState(-1);
  const [reviewDeclaration, setReviewDeclaration] = useState(0);
  const [fieldPage, setFieldPage] = useState(0);
  const [fieldPageSize, setFieldPageSize] = useState(25);
  const [extension, setExtension] = useState<DownloadExtension>("ts");

  const mounted = useRef(true);
  const revision = useRef(0);
  const resultRevision = useRef(0);
  const operation = useRef<Operation | null>(null);
  const currentResult = useRef<JsonTsResult | null>(null);
  const currentConfirmation = useRef<Confirmation | null>(null);
  const copyInFlight = useRef(false);
  const focusFrame = useRef<number | null>(null);
  const downloadUrls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inputEditor = useRef<HTMLTextAreaElement>(null);
  const codeEditor = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const confirmationGroup = useRef<HTMLDivElement>(null);

  const cancelFocus = useCallback(() => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = null;
  }, []);

  // A late callback must never terminate a newer operation's worker.
  const stopWorker = useCallback((instance: Worker, id: number): boolean => {
    const active = operation.current;
    if (!active || active.kind === "read" || active.instance !== instance || active.id !== id) return false;
    if (active.timer !== null) clearTimeout(active.timer);
    instance.onmessage = null;
    instance.onerror = null;
    instance.onmessageerror = null;
    instance.terminate();
    operation.current = null;
    return true;
  }, []);

  const invalidateLifecycle = useCallback(() => {
    revision.current++;
    resultRevision.current++;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const urls = downloadUrls.current;
    return () => {
      mounted.current = false;
      invalidateLifecycle();
      const active = operation.current;
      if (active && active.kind !== "read") stopWorker(active.instance, active.id);
      operation.current = null;
      currentConfirmation.current = null;
      cancelFocus();
      for (const [url, timer] of urls) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, [cancelFocus, invalidateLifecycle, stopWorker]);

  function scheduleFocus(action: () => void) {
    cancelFocus();
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      if (mounted.current) action();
    });
  }

  function cancelPending() {
    revision.current++;
    const active = operation.current;
    if (active && active.kind !== "read") stopWorker(active.instance, active.id);
    operation.current = null;
    setPending(null);
    cancelFocus();
  }

  function clearConfirmation() {
    currentConfirmation.current = null;
    setConfirmation(null);
  }

  function invalidate(preserveSource = false) {
    cancelPending();
    resultRevision.current++;
    currentResult.current = null;
    setResult(null);
    clearConfirmation();
    setError("");
    setStatus("");
    setCopyNotice("");
    if (!preserveSource) {
      setSampleHint("");
      setImportedFile(null);
    }
    setView("code");
    setCodeDeclaration(-1);
    setReviewDeclaration(0);
    setFieldPage(0);
  }

  function updateInput(text: string) {
    const problem = inputSizeProblem(text);
    if (problem) {
      setError(`${problem} The previous input and result were kept.`);
      return;
    }
    invalidate();
    setInput(text);
  }

  function updateOption<K extends keyof JsonTsOptions>(key: K, value: JsonTsOptions[K]) {
    invalidate();
    setOptions((current) => ({ ...current, [key]: value }));
  }

  function offerConfirmation(action: Confirmation) {
    currentConfirmation.current = action;
    setConfirmation(action);
    setStatus(action.kind === "clear"
      ? "Clear requested. Choose Yes clear or Keep current input; nothing has been cleared."
      : "Replacement ready for review. Choose Replace input or Keep current input; nothing has been replaced.");
    scheduleFocus(() => {
      if (revision.current === action.id && currentConfirmation.current === action) {
        confirmationGroup.current?.focus({ preventScroll: true });
      }
    });
  }

  function focusInput() {
    const id = revision.current;
    scheduleFocus(() => {
      if (revision.current === id) inputEditor.current?.focus({ preventScroll: true });
    });
  }

  function acceptFile(candidate: FileCandidate) {
    invalidate();
    setInput(candidate.text);
    setFormat(candidate.format);
    setOptions((current) => ({ ...current, pointer: "", rootMode: "value" }));
    setImportedFile({ label: candidate.label, inspection: candidate.inspection });
    setStatus("File checked and imported locally. Other settings were retained; the nested path was cleared and root mode is Keep selected value. Generate types when ready.");
    focusInput();
  }

  function loadExample(id: string) {
    const sample = JSON_TS_SAMPLES.find((entry) => entry.id === id);
    if (!sample) return;
    invalidate();
    setInput(sample.text);
    setFormat(sample.format);
    setOptions({ ...DEFAULT_JSON_TS_OPTIONS, ...sample.options });
    setSampleId(sample.id);
    setSampleHint(sample.hint);
    setStatus("Example loaded with its suggested settings. Nothing was generated automatically.");
    focusInput();
  }

  const hasWork = input.length > 0 || result !== null || format !== "json"
    || (Object.keys(DEFAULT_JSON_TS_OPTIONS) as Array<keyof JsonTsOptions>)
      .some((key) => options[key] !== DEFAULT_JSON_TS_OPTIONS[key]);

  function requestExample() {
    cancelPending();
    clearConfirmation();
    setError("");
    setCopyNotice("");
    if (hasWork) offerConfirmation({ id: revision.current, kind: "sample", sampleId });
    else loadExample(sampleId);
  }

  function requestClear() {
    if (!hasWork) return;
    cancelPending();
    setError("");
    setCopyNotice("");
    offerConfirmation({ id: revision.current, kind: "clear" });
  }

  function confirmReplacement() {
    const action = currentConfirmation.current;
    if (!action || revision.current !== action.id || operation.current) return;
    if (action.kind === "file") acceptFile(action.candidate);
    else if (action.kind === "sample") loadExample(action.sampleId);
    else {
      invalidate();
      setInput("");
      setFormat("json");
      setOptions({ ...DEFAULT_JSON_TS_OPTIONS });
      setExtension("ts");
      setFieldPageSize(25);
      setStatus("Workspace cleared. Clipboard contents and downloaded files are unchanged.");
      focusInput();
    }
  }

  function keepCurrentInput() {
    cancelPending();
    clearConfirmation();
    setStatus("Replacement dismissed. Your input, settings and current result were kept.");
    focusInput();
  }

  function isCurrentWorker(instance: Worker, id: number) {
    const active = operation.current;
    return mounted.current && revision.current === id && active !== null
      && active.kind !== "read" && active.instance === instance && active.id === id;
  }

  function runWorker(
    request: JsonTsRequest,
    candidate?: { text: string; format: JsonTsFormat; label: string; needsConfirmation: boolean },
  ) {
    const id = request.id;
    if (!mounted.current || revision.current !== id || operation.current) return;
    let instance: Worker;
    try {
      instance = new Worker(new URL("../../../lib/json-typescript/worker.ts", import.meta.url), { type: "module" });
    } catch {
      if (mounted.current && revision.current === id && operation.current === null) {
        setPending(null);
        setStatus("");
        setError("A current browser with local worker support is required. No new result was accepted and no conversion data was uploaded.");
      }
      return;
    }

    const active: Operation = { id, kind: request.kind, instance, timer: null };
    operation.current = active;
    setPending(request.kind);
    setStatus(request.kind === "inspect"
      ? "Checking the imported file locally. Your current workspace is kept until replacement is accepted."
      : "Generating types in a local worker…");

    const fail = (message: string) => {
      if (!isCurrentWorker(instance, id) || !stopWorker(instance, id)) return;
      setPending(null);
      setStatus("");
      setError(message);
    };

    instance.onmessage = (event: MessageEvent<JsonTsResponse>) => {
      if (!isCurrentWorker(instance, id)) return;
      const response = event.data;
      if (!response || typeof response !== "object" || response.id !== id) return;
      if (response.kind === "error") {
        fail(typeof response.error === "string" && response.error.length <= 600 ? response.error : WORKER_FAULT);
        return;
      }

      if (request.kind === "inspect" && response.kind === "inspect" && candidate) {
        const inspection = response.inspection;
        if (!inspection || inspection.format !== candidate.format || !Number.isSafeInteger(inspection.sampleCount)
          || inspection.sampleCount < 1 || inspection.sampleCount > JSON_TS_LIMITS.samples) {
          fail(WORKER_RESPONSE_FAULT);
          return;
        }
        if (!stopWorker(instance, id)) return;
        setPending(null);
        const checked: FileCandidate = { ...candidate, inspection };
        if (candidate.needsConfirmation) offerConfirmation({ id, kind: "file", candidate: checked });
        else acceptFile(checked);
        return;
      }

      if (request.kind === "generate" && response.kind === "generate") {
        const generated = response.result;
        if (!generated || typeof generated.code !== "string" || !generated.code.length
          || generated.code.length > JSON_TS_LIMITS.outputChars || generated.code.includes("\r")
          || !Array.isArray(generated.declarations) || !generated.declarations.length
          || generated.declarations.length > JSON_TS_LIMITS.declarations
          || !Array.isArray(generated.notices) || !generated.stats
          || generated.options?.rootName !== request.options.rootName) {
          fail(WORKER_RESPONSE_FAULT);
          return;
        }
        if (!stopWorker(instance, id)) return;
        setPending(null);
        resultRevision.current++;
        currentResult.current = generated;
        setResult(generated);
        setStatus("Types generated. Review the full code, field presence and inference notes before copying or downloading. No TypeScript compiler was run.");
        return;
      }

      // A matching ID alone is insufficient: inspect cannot stand in for generate.
      fail(WORKER_RESPONSE_FAULT);
    };
    instance.onerror = (event) => {
      event.preventDefault();
      fail(WORKER_FAULT);
    };
    instance.onmessageerror = () => fail(WORKER_FAULT);
    active.timer = setTimeout(() => {
      if (!isCurrentWorker(instance, id)) return;
      fail("The 15-second processing limit was reached. No new result was accepted. Use a smaller JSON section and try again.");
    }, JSON_TS_LIMITS.timeoutMs);
    try {
      instance.postMessage(request);
    } catch {
      fail(WORKER_FAULT);
    }
  }

  async function importFile(file: File) {
    cancelPending();
    clearConfirmation();
    setError("");
    setCopyNotice("");
    setStatus("Reading the file locally. Your input, settings and current result are unchanged.");
    const reading: Operation = { id: revision.current, kind: "read" };
    operation.current = reading;
    setPending("read");
    try {
      const candidate = await readTypeScriptJsonFile(file, format);
      if (!mounted.current || revision.current !== reading.id || operation.current !== reading) return;
      operation.current = null;
      runWorker(
        { id: reading.id, kind: "inspect", input: candidate.text, format: candidate.format },
        { ...candidate, label: shortLabel(file.name, 90), needsConfirmation: hasWork },
      );
    } catch (caught) {
      if (!mounted.current || revision.current !== reading.id || operation.current !== reading) return;
      operation.current = null;
      setPending(null);
      setStatus("");
      // readTypeScriptJsonFile exposes only its fixed, safe input errors.
      setError(caught instanceof Error ? caught.message : "The file could not be read. Your previous input was kept.");
    }
  }

  function generate() {
    if (!input.trim() || rootNameProblem(options.rootName) || operation.current
      || currentConfirmation.current || copyInFlight.current) return;
    invalidate(true);
    runWorker({ id: revision.current, kind: "generate", input, format, options: { ...options } });
  }

  function cancelOperation() {
    const wasImport = operation.current?.kind === "read" || operation.current?.kind === "inspect";
    cancelPending();
    setError("");
    setStatus(wasImport
      ? "Import cancelled. Your current workspace was kept; any late file-read result will be ignored."
      : "Generation cancelled. Input and settings are unchanged. Generate again when ready.");
  }

  async function copyTypes() {
    const current = currentResult.current;
    if (!current || operation.current || currentConfirmation.current || copyInFlight.current) return;
    const id = resultRevision.current;
    copyInFlight.current = true;
    setCopyPending(true);
    setCopyNotice("");
    setError("");
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(current.code);
      if (!mounted.current) return;
      setCopyNotice(resultRevision.current === id && currentResult.current === current
        ? "All declarations copied, including any module guard. Review the types before using them."
        : "An earlier result was copied. It no longer matches the workspace; generate and copy the current types when ready.");
    } catch {
      if (!mounted.current) return;
      if (resultRevision.current !== id || currentResult.current !== current) {
        setCopyNotice("The earlier clipboard attempt failed. It did not copy the current workspace's types.");
        return;
      }
      if (operation.current || currentConfirmation.current) {
        setCopyNotice("Clipboard access failed. Finish or cancel the pending replacement before copying the retained result again.");
        return;
      }
      setView("code");
      setCodeDeclaration(-1);
      setCopyNotice("Clipboard access was unavailable. Copy the full code manually with Ctrl+C or Cmd+C, or use Download types.");
      scheduleFocus(() => {
        if (resultRevision.current !== id || currentResult.current !== current
          || operation.current || currentConfirmation.current) return;
        const editor = codeEditor.current;
        if (editor?.value === current.code) {
          editor.focus({ preventScroll: true });
          editor.select();
        }
      });
    } finally {
      copyInFlight.current = false;
      if (mounted.current) setCopyPending(false);
    }
  }

  function downloadTypes() {
    const current = currentResult.current;
    if (!current || operation.current || currentConfirmation.current || copyInFlight.current) return;
    let url: string | null = null;
    let anchor: HTMLAnchorElement | null = null;
    try {
      const file = typeScriptDownloadDetails(current, extension);
      const objectUrl = URL.createObjectURL(new Blob([file.contents], { type: file.mime }));
      url = objectUrl;
      const timer = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        downloadUrls.current.delete(objectUrl);
      }, 30_000);
      downloadUrls.current.set(objectUrl, timer);
      anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.fileName;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      anchor.click();
      setError("");
      setCopyNotice(`Download requested: ${file.fileName}. The file includes all declarations, not just the preview.`);
    } catch {
      if (url) {
        const timer = downloadUrls.current.get(url);
        if (timer !== undefined) clearTimeout(timer);
        downloadUrls.current.delete(url);
        URL.revokeObjectURL(url);
      }
      setError("The download could not be started. Try Copy types, or select the full code and save it in your editor.");
    } finally {
      anchor?.remove();
    }
  }

  const nameProblem = rootNameProblem(options.rootName);
  const isPending = pending !== null;
  const heldResult = result !== null && (confirmation !== null || pending === "read" || pending === "inspect");
  const canGenerate = !!input.trim() && !nameProblem && !isPending && !confirmation && !copyPending;
  const canExport = result !== null && !isPending && !confirmation && !copyPending;
  const declarations = result?.declarations ?? [];
  const declaration = declarations[reviewDeclaration];
  const fields = declaration?.properties ?? [];
  const fieldPages = Math.max(1, Math.ceil(fields.length / fieldPageSize));
  const shownPage = Math.min(fieldPage, fieldPages - 1);
  const fieldStart = shownPage * fieldPageSize;
  const partialPreview = codeDeclaration >= 0 && !!declarations[codeDeclaration];
  const previewCode = partialPreview ? declarations[codeDeclaration].code : result?.code ?? "";
  const previewLines = useMemo(() => lineCount(previewCode), [previewCode]);
  const missingFields = useMemo(() => result?.declarations.reduce((total, entry) => (
    total + entry.properties.filter((property) => property.present < property.total).length
  ), 0) ?? 0, [result]);
  const inferenceNotes = useMemo(() => {
    const notes = new Map<string, JsonTsNotice>();
    for (const note of result?.notices ?? []) {
      const previous = notes.get(note.code);
      notes.set(note.code, { ...note, count: note.count + (previous?.count ?? 0) });
    }
    return [...notes.values()];
  }, [result]);
  const downloadName = useMemo(() => {
    if (!result) return "";
    try { return typeScriptDownloadDetails(result, extension).fileName; }
    catch { return ""; }
  }, [result, extension]);

  return (
    <section
      id="json-ts-workspace"
      className="jts-workspace notranslate"
      translate="no"
      dir="ltr"
      aria-label="JSON to TypeScript workspace"
    >
      <div className="jts-toolbar">
        <div className="jts-brand">
          <span className="jts-monogram" aria-hidden="true">TS</span>
          <div>
            <p className="jts-eyebrow">TYPE WORKSPACE</p>
            <p className="jts-brand-caption">A clear shape for your data.</p>
          </div>
        </div>
        <div className="jts-examples">
          <div className="jts-field jts-example-field">
            <label htmlFor="jts-example">Try an example</label>
            <select id="jts-example" value={sampleId} disabled={!!confirmation} onChange={(event) => setSampleId(event.target.value)}>
              {JSON_TS_SAMPLES.map((sample) => <option key={sample.id} value={sample.id}>{sample.label}</option>)}
            </select>
          </div>
          <button id="jts-load-example" type="button" className="jts-button-secondary" disabled={!!confirmation} onClick={requestExample}>
            Load example
          </button>
          <button id="jts-clear" type="button" className="jts-button-quiet" disabled={!hasWork || !!confirmation} onClick={requestClear}>
            <RotateCcw size={16} aria-hidden="true" />
            Clear workspace
          </button>
        </div>
      </div>

      {confirmation && (
        <div ref={confirmationGroup} className="jts-confirmation" role="group" aria-label="Confirm input replacement" tabIndex={-1}>
          <div className="jts-confirmation-copy">
            <strong>
              {confirmation.kind === "clear" ? "Clear your input, settings and types?"
                : confirmation.kind === "sample" ? "Replace your work with this example?"
                  : "The imported file is ready. Replace your input?"}
            </strong>
            {confirmation.kind === "file" && (
              <p className="jts-candidate-meta">
                <bdi>{confirmation.candidate.label}</bdi>
                <span>{number(confirmation.candidate.inspection.sampleCount)} {confirmation.candidate.inspection.sampleCount === 1 ? "sample" : "samples"}</span>
                <span>{formatName(confirmation.candidate.format)}</span>
              </p>
            )}
            <p>
              {confirmation.kind === "file"
                ? "Current input and types are kept until you accept. Your other settings stay; the nested path is cleared and root mode resets to Keep selected value."
                : confirmation.kind === "sample"
                  ? "Your current work is kept until you accept. The example replaces the input and applies its default and suggested settings."
                  : "This resets the workspace only. It does not remove clipboard contents or downloaded files."}
            </p>
          </div>
          <div className="jts-confirmation-actions">
            <button id="jts-confirm-replace" type="button" className="jts-button" onClick={confirmReplacement}>
              {confirmation.kind === "clear" ? "Yes clear" : "Replace input"}
            </button>
            <button id="jts-keep-current" type="button" className="jts-button-secondary" onClick={keepCurrentInput}>
              Keep current input
            </button>
          </div>
        </div>
      )}

      <section className="jts-settings" aria-labelledby="jts-settings-heading">
        <div className="jts-section-heading">
          <div>
            <p className="jts-eyebrow">01 / SET THE SHAPE</p>
            <h2 id="jts-settings-heading">Make the types yours.</h2>
          </div>
          <p>Explicit choices. No guessed paths.</p>
        </div>
        <div className="jts-settings-grid">
          <div className="jts-field">
            <label htmlFor="jts-root-name">Root name</label>
            <input
              id="jts-root-name"
              value={options.rootName}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={!!nameProblem}
              aria-describedby={`jts-root-name-help${nameProblem ? " jts-root-name-error" : ""}`}
              onChange={(event) => updateOption("rootName", event.target.value)}
            />
            <p id="jts-root-name-help">Used exactly as entered, including case. Up to 64 characters.</p>
            {nameProblem && <p id="jts-root-name-error" className="jts-field-error">{nameProblem}</p>}
          </div>
          <div className="jts-field">
            <label htmlFor="jts-declaration-style">Declaration style</label>
            <select id="jts-declaration-style" value={options.declarationStyle} aria-describedby="jts-style-help" onChange={(event) => updateOption("declarationStyle", event.target.value as JsonTsOptions["declarationStyle"])}>
              <option value="interface">interface</option>
              <option value="type">type</option>
            </select>
            <p id="jts-style-help">Object shapes use this style. Scalars, arrays and unions may need a type alias.</p>
          </div>
          <div className="jts-field">
            <label htmlFor="jts-root-mode">Root mode</label>
            <select id="jts-root-mode" value={options.rootMode} aria-describedby="jts-root-mode-help" onChange={(event) => updateOption("rootMode", event.target.value as JsonTsOptions["rootMode"])}>
              <option value="value">Keep selected value</option>
              <option value="array-items">Infer array item</option>
            </select>
            <p id="jts-root-mode-help">Keep the wrapper or array, or infer an item type from the selected array&apos;s items.</p>
          </div>
          <div className="jts-field">
            <label htmlFor="jts-optionality">Optional properties</label>
            <select id="jts-optionality" value={options.optionalProperties} aria-describedby="jts-optionality-help" onChange={(event) => updateOption("optionalProperties", event.target.value as JsonTsOptions["optionalProperties"])}>
              <option value="inferred">Infer from missing fields</option>
              <option value="all">All properties optional</option>
            </select>
            <p id="jts-optionality-help">Missing fields and observed null values are different evidence.</p>
          </div>
        </div>

        <div className="jts-disclosures">
          <details className="jts-details" id="jts-nested-settings">
            <summary>
              <Layers size={17} aria-hidden="true" />
              <span>Select a nested value</span>
              <ChevronDown className="jts-disclosure-chevron" size={16} aria-hidden="true" />
            </summary>
            <div className="jts-details-body jts-field">
              <label htmlFor="jts-pointer">JSON Pointer <span>Optional</span></label>
              <input
                id="jts-pointer"
                value={options.pointer}
                placeholder="/data/projects"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-describedby="jts-pointer-help"
                onChange={(event) => updateOption("pointer", event.target.value)}
              />
              <p id="jts-pointer-help">
                Blank keeps the whole value. Separate keys with <code>/</code>; escape a key&apos;s
                <code> / </code> as <code>~1</code> and <code>~</code> as <code>~0</code>.
                A lone <code>/</code> selects an empty key, not the whole value. The path must resolve
                in every JSON Lines sample. Up to 4,096 characters; no automatic path selection.
              </p>
            </div>
          </details>
          <details className="jts-details" id="jts-more-settings">
            <summary>
              <Settings2 size={17} aria-hidden="true" />
              <span>More settings</span>
              <ChevronDown className="jts-disclosure-chevron" size={16} aria-hidden="true" />
            </summary>
            <div className="jts-details-body">
              <div className="jts-checkbox-grid">
                <label className="jts-checkbox" htmlFor="jts-readonly">
                  <input id="jts-readonly" type="checkbox" checked={options.readonly} onChange={(event) => updateOption("readonly", event.target.checked)} />
                  <span>Readonly properties and arrays<small>Compile-time only; runtime data is not frozen.</small></span>
                </label>
                <label className="jts-checkbox" htmlFor="jts-export-declarations">
                  <input id="jts-export-declarations" type="checkbox" checked={options.exportDeclarations} onChange={(event) => updateOption("exportDeclarations", event.target.checked)} />
                  <span>Export declarations<small>Off keeps a module guard, not global declarations.</small></span>
                </label>
                <label className="jts-checkbox" htmlFor="jts-string-literals">
                  <input id="jts-string-literals" type="checkbox" checked={options.stringLiterals} aria-describedby={options.stringLiterals ? "jts-literal-caution" : undefined} onChange={(event) => updateOption("stringLiterals", event.target.checked)} />
                  <span>Use string literal types<small>Includes observed source string values in code.</small></span>
                </label>
                <label className="jts-checkbox" htmlFor="jts-sort-properties">
                  <input id="jts-sort-properties" type="checkbox" checked={options.sortProperties} onChange={(event) => updateOption("sortProperties", event.target.checked)} />
                  <span>Sort properties<small>Otherwise keep first-observed property order.</small></span>
                </label>
              </div>
              <div className="jts-field jts-indent-field">
                <label htmlFor="jts-indent">Indentation</label>
                <select id="jts-indent" value={options.indent} onChange={(event) => updateOption("indent", event.target.value as JsonTsOptions["indent"])}>
                  <option value="2">2 spaces</option>
                  <option value="4">4 spaces</option>
                  <option value="tab">Tabs</option>
                </select>
              </div>
            </div>
          </details>
        </div>
        {options.stringLiterals && (
          <p className="jts-caution" id="jts-literal-caution">
            <Info size={18} aria-hidden="true" />
            <span><strong>String literal types are on.</strong> Source string values will appear in copied and downloaded code. Observed values do not establish an API enum.</span>
          </p>
        )}
        {!options.exportDeclarations && (
          <p className="jts-option-note">
            Exports are off. The full code still includes <code>export {"{}"};</code> to keep the declarations module-scoped, including in a <code>.d.ts</code> file.
          </p>
        )}
      </section>

      <div className="jts-editors">
        <section className="jts-editor-panel" aria-labelledby="jts-input-heading">
          <div className="jts-panel-heading">
            <div className="jts-panel-title">
              <span className="jts-step">02</span>
              <h2 id="jts-input-heading"><label htmlFor="jts-input">Your JSON</label></h2>
            </div>
            <button id="jts-import" type="button" className="jts-button-quiet" disabled={isPending || !!confirmation} onClick={() => fileInput.current?.click()}>
              <Upload size={16} aria-hidden="true" />
              Import file
            </button>
            <input
              ref={fileInput}
              id="jts-file"
              type="file"
              hidden
              accept=".json,.jsonl,.ndjson,.txt"
              aria-label="Import JSON or JSON Lines file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void importFile(file);
              }}
            />
          </div>
          <div className="jts-input-controls">
            <div className="jts-field">
              <label htmlFor="jts-format">Input format</label>
              <select id="jts-format" value={format} aria-describedby="jts-format-help" onChange={(event) => { invalidate(); setFormat(event.target.value as JsonTsFormat); }}>
                <option value="json">JSON</option>
                <option value="jsonl">JSON Lines / NDJSON</option>
              </select>
            </div>
            <p id="jts-format-help">
              {format === "jsonl"
                ? "Each line is an example of the same root, not an output array. No blank lines."
                : "One complete JSON value. No comments or trailing commas."}
            </p>
          </div>
          {sampleHint && <p className="jts-source-note" id="jts-sample-hint">{sampleHint}</p>}
          {importedFile && (
            <p className="jts-source-note" id="jts-imported-file">
              <bdi>{importedFile.label}</bdi> · {formatName(importedFile.inspection.format)} · {number(importedFile.inspection.sampleCount)} {importedFile.inspection.sampleCount === 1 ? "sample" : "samples"} · {formatBytes(importedFile.inspection.inputBytes)}
            </p>
          )}
          <textarea
            ref={inputEditor}
            id="jts-input"
            className="jts-code-editor jts-input-editor"
            value={input}
            rows={17}
            wrap="off"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Paste your JSON here, or import a local file."
            aria-describedby="jts-format-help jts-input-limits jts-shortcut"
            aria-keyshortcuts="Control+Enter Meta+Enter"
            onChange={(event) => updateInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (canGenerate) generate();
              }
            }}
          />
          <div className="jts-editor-meta" id="jts-input-limits">
            <span>{number(input.length)} / 1,000,000 UTF-16 characters</span>
            <span>2 MiB UTF-8 limit · oversized edits are rejected, not cut</span>
          </div>
          <div className="jts-generate-bar">
            <p id="jts-shortcut"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> or <kbd>Cmd</kbd> + <kbd>Enter</kbd> in this input.</p>
            <div className="jts-generate-actions">
              {isPending && (
                <button id="jts-cancel-operation" type="button" className="jts-button-secondary" onClick={cancelOperation}>
                  <X size={16} aria-hidden="true" />
                  {pending === "generate" ? "Cancel generation" : "Cancel import"}
                </button>
              )}
              <button id="jts-generate" type="button" className="jts-button jts-generate-button" aria-label="Generate types" disabled={!canGenerate} onClick={generate}>
                {pending === "generate" ? <Loader2 className="jts-spin" size={18} aria-hidden="true" /> : <Braces size={18} aria-hidden="true" />}
                {pending === "generate" ? "Generating types…" : "Generate types"}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="jts-editor-panel jts-output-panel" id="jts-result" aria-labelledby="jts-result-heading" data-testid={result ? "json-ts-result" : undefined}>
          <div className="jts-panel-heading">
            <div className="jts-panel-title">
              <span className="jts-step">03</span>
              <h2 id="jts-result-heading">Review your types</h2>
            </div>
            <span className="jts-type-badge">TYPE-ONLY</span>
          </div>
          <div className="jts-result-controls">
            <div className="jts-view-switch" role="group" aria-label="Result view">
              <button id="jts-code-view" type="button" aria-pressed={view === "code"} disabled={!result || heldResult} onClick={() => { cancelFocus(); setView("code"); }}>
                <Code2 size={16} aria-hidden="true" />Code
              </button>
              <button id="jts-fields-view" type="button" aria-pressed={view === "fields"} disabled={!result || heldResult} onClick={() => { cancelFocus(); setView("fields"); }}>
                <Table2 size={16} aria-hidden="true" />Field review
              </button>
            </div>
            <p>Inferred from samples. Not runtime validation.</p>
          </div>

          {!result ? (
            <div className="jts-empty-result" id="jts-empty-result">
              <span className="jts-empty-symbol"><FileCode2 size={29} aria-hidden="true" /></span>
              <h3>A useful starting point.<br />Not a guessed contract.</h3>
              <p>Paste or import JSON, choose your settings, then generate. Your full type definitions will appear here.</p>
              <ul>
                <li><Layers size={19} aria-hidden="true" /><span><strong>Nested shapes, kept readable</strong><small>Named declarations for structures in your samples.</small></span></li>
                <li><ListChecks size={19} aria-hidden="true" /><span><strong>Missing fields, made visible</strong><small>Review optionality and real object-presence counts.</small></span></li>
                <li><Download size={19} aria-hidden="true" /><span><strong>Complete code, your way</strong><small>Copy all types or save a .ts or .d.ts file.</small></span></li>
              </ul>
            </div>
          ) : heldResult ? (
            <div className="jts-held-result" id="jts-held-result">
              {isPending ? <Loader2 size={27} className="jts-spin" aria-hidden="true" /> : <Info size={27} aria-hidden="true" />}
              <h3>Your current types are kept.</h3>
              <p>Finish or cancel the input replacement to review, copy or download them. No new input has been accepted.</p>
            </div>
          ) : view === "code" ? (
            <div className="jts-code-view">
              <div className="jts-field jts-declaration-picker">
                <label htmlFor="jts-code-declaration">Code preview</label>
                <select id="jts-code-declaration" value={codeDeclaration} onChange={(event) => { cancelFocus(); setCodeDeclaration(Number(event.target.value)); }}>
                  <option value={-1}>All declarations ({number(declarations.length)})</option>
                  {declarations.slice(0, JSON_TS_LIMITS.declarations).map((entry, index) => (
                    <option key={index} value={index}>{index + 1}. {shortLabel(entry.name, 48)} · {entry.kind}</option>
                  ))}
                </select>
              </div>
              <p className={`jts-preview-description${partialPreview ? " jts-partial-preview" : ""}`} id="jts-preview-description">
                {partialPreview
                  ? "Partial preview: one declaration only. Copy types and Download types always include the full code and any module guard."
                  : "Full generated code, including all declarations and any module guard. Select this text for manual copying."}
              </p>
              <label htmlFor="jts-output" className="jts-sr-only">{partialPreview ? "Single declaration preview" : "Full TypeScript code"}</label>
              <textarea
                ref={codeEditor}
                id="jts-output"
                className="jts-code-editor jts-output-editor"
                value={previewCode}
                readOnly
                rows={17}
                wrap="off"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                aria-describedby="jts-preview-description jts-code-meta"
              />
              <div className="jts-editor-meta" id="jts-code-meta">
                <span>{number(previewLines)} {previewLines === 1 ? "line" : "lines"} · LF</span>
                <span>{number(previewCode.length)} characters · {partialPreview ? "partial preview" : "complete code"}</span>
              </div>
            </div>
          ) : (
            <div className="jts-field-review">
              <div className="jts-field jts-declaration-picker">
                <label htmlFor="jts-review-declaration">Declaration to review</label>
                <select id="jts-review-declaration" value={reviewDeclaration} onChange={(event) => { setReviewDeclaration(Number(event.target.value)); setFieldPage(0); }}>
                  {declarations.slice(0, JSON_TS_LIMITS.declarations).map((entry, index) => (
                    <option key={index} value={index}>{index + 1}. {shortLabel(entry.name, 48)} · {number(entry.properties.length)} fields</option>
                  ))}
                </select>
              </div>
              <p className="jts-preview-description" id="jts-field-review-help">Presence counts refer to objects at this structural location. Long labels are shortened here; Code contains the complete types.</p>
              {fields.length ? (
                <>
                  <div className="jts-table-scroll" role="region" aria-label="Inferred fields, scrollable table" tabIndex={0}>
                    <table className="jts-field-table" aria-describedby="jts-field-review-help">
                      <caption className="jts-sr-only">Fields for declaration {reviewDeclaration + 1}: {shortLabel(declaration?.name ?? "", 96)}</caption>
                      <thead>
                        <tr>
                          <th scope="col">Property key</th>
                          <th scope="col">Inferred type</th>
                          <th scope="col">Requirement</th>
                          <th scope="col">Present in</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.slice(fieldStart, fieldStart + fieldPageSize).map((property, index) => (
                          <tr key={fieldStart + index}>
                            <th scope="row"><code title={shortLabel(JSON.stringify(property.key), 200)}>{shortLabel(JSON.stringify(property.key), 96)}</code></th>
                            <td><code title={shortLabel(property.type, 400)}>{shortLabel(property.type, 180)}</code></td>
                            <td><span className={property.optional ? "jts-optional" : "jts-required"}>{property.optional ? "Optional" : "Required"}</span></td>
                            <td>{number(property.present)} of {number(property.total)} objects</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="jts-pagination">
                    <p>Fields {number(fieldStart + 1)}–{number(Math.min(fieldStart + fieldPageSize, fields.length))} of {number(fields.length)}</p>
                    <div className="jts-page-controls">
                      <label htmlFor="jts-field-page-size">Fields per page</label>
                      <select id="jts-field-page-size" value={fieldPageSize} onChange={(event) => { setFieldPageSize(Number(event.target.value) === 50 ? 50 : 25); setFieldPage(0); }}>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <button id="jts-fields-previous" type="button" className="jts-icon-button" aria-label="Previous fields" disabled={shownPage === 0} onClick={() => setFieldPage(shownPage - 1)}>
                        <ChevronLeft size={18} aria-hidden="true" />
                      </button>
                      <button id="jts-fields-next" type="button" className="jts-icon-button" aria-label="Next fields" disabled={shownPage === fieldPages - 1} onClick={() => setFieldPage(shownPage + 1)}>
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="jts-no-fields">
                  <Braces size={27} aria-hidden="true" />
                  <h3>No named properties in this declaration.</h3>
                  <p>It may describe an array, scalar, union or empty object. Review its exact definition in Code.</p>
                  <button type="button" className="jts-button-secondary" onClick={() => { setView("code"); setCodeDeclaration(-1); }}>View full code</button>
                </div>
              )}
            </div>
          )}

          <div className="jts-export-bar">
            <div className="jts-download-name">
              <FileCode2 size={16} aria-hidden="true" />
              <span>{result && !heldResult ? downloadName : "Generate and review before exporting"}</span>
            </div>
            <div className="jts-export-actions">
              <button id="jts-copy" type="button" className="jts-button-secondary" disabled={!canExport} onClick={() => void copyTypes()}>
                {copyPending ? <Loader2 className="jts-spin" size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copyPending ? "Copying types…" : "Copy types"}
              </button>
              <div className="jts-download-controls">
                <div className="jts-field">
                  <label htmlFor="jts-download-extension">Download format</label>
                  <select id="jts-download-extension" value={extension} disabled={!canExport} onChange={(event) => setExtension(event.target.value as DownloadExtension)}>
                    <option value="ts">.ts</option>
                    <option value="d.ts">.d.ts</option>
                  </select>
                </div>
                <button id="jts-download" type="button" className="jts-button" disabled={!canExport || !downloadName} onClick={downloadTypes}>
                  <Download size={16} aria-hidden="true" />
                  Download types
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="jts-announcements">
        {error && <p className="jts-error" id="jts-error" role="alert"><Info size={18} aria-hidden="true" /><span>{error}</span></p>}
        <p className="jts-status" id="jts-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
        <p className="jts-copy-status" id="jts-copy-status" role="status" aria-live="polite" aria-atomic="true">{copyNotice}</p>
        {copyPending && <p className="jts-pending-copy">Clipboard write in progress. You can edit the input, but the system clipboard write cannot be cancelled. Generation waits until it finishes.</p>}
      </div>

      {result && !heldResult && (
        <section className="jts-result-summary" aria-label="Inference summary">
          <dl className="jts-stats">
            <div>
              <dt>Declarations</dt>
              <dd data-testid="json-ts-declaration-count">{number(result.declarations.length)}</dd>
              <dd className="jts-stat-caption">Named type definitions</dd>
            </div>
            <div>
              <dt>Properties</dt>
              <dd data-testid="json-ts-property-count">{number(result.stats.properties)}</dd>
              <dd className="jts-stat-caption">Across all declarations</dd>
            </div>
            <div>
              <dt>Inferred optional fields</dt>
              <dd data-testid="json-ts-optional-count">{number(missingFields)}</dd>
              <dd className="jts-stat-caption">{number(result.stats.optionalProperties)} optional in this output</dd>
            </div>
            <div>
              <dt>Selected values</dt>
              <dd data-testid="json-ts-selected-count">{number(result.stats.selectedValues)}</dd>
              <dd className="jts-stat-caption">From {number(result.sampleCount)} input {result.sampleCount === 1 ? "sample" : "samples"}</dd>
            </div>
            <div>
              <dt>Output size</dt>
              <dd>{formatBytes(result.stats.outputBytes)}</dd>
              <dd className="jts-stat-caption">Full code · UTF-8</dd>
            </div>
          </dl>
          <details className="jts-details jts-inference-notes" open>
            <summary>
              <Info size={18} aria-hidden="true" />
              <span>Inference notes</span>
              <span className="jts-note-total">{inferenceNotes.length}</span>
              <ChevronDown className="jts-disclosure-chevron" size={16} aria-hidden="true" />
            </summary>
            <ul>
              {inferenceNotes.map((note) => (
                <li key={note.code} data-notice-code={note.code}>
                  <span>{note.message}</span>
                  {note.count > 1 && <span className="jts-note-count">{number(note.count)} occurrences</span>}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <div className="jts-workspace-footer">
        <Info size={18} aria-hidden="true" />
        <p><strong>Generated types need review; they do not validate runtime responses.</strong> No conversion uploads. Site analytics/ads are separate.</p>
      </div>
    </section>
  );
}
