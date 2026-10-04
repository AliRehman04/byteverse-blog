import { AnnotationMode, getDocument, PDFWorker, PermissionFlag, Util } from "pdfjs-dist";
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import workerSource from "invoice:pdf-worker";
import fontSources from "invoice:pdf-fonts";
import { groupInvoiceTokens } from "./core-client";
import { INVOICE_LIMITS } from "./types";
import type { SourceLine, TextToken } from "./types";

class LocalPdfError extends Error {}

class BundledFontFactory {
  async fetch({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> {
    const source = kind === "standardFontDataUrl" && Object.hasOwn(fontSources, filename) ? fontSources[filename] : null;
    if (!source) throw new LocalPdfError("This PDF needs an unsupported font or decoder. Use a standard text-based PDF export.");
    return Uint8Array.from(atob(source), character => character.charCodeAt(0));
  }
}

export function pdfErrorMessage(error: unknown): string {
  if (error instanceof LocalPdfError) return error.message;
  if (error instanceof Error && error.name === "AbortError") return "Processing cancelled. You can retry this file.";
  if (error instanceof Error && error.name === "PasswordException") return "Password-protected PDFs are not supported. Use an authorized, unlocked export.";
  return "This PDF could not be read safely. Try a standard, text-based PDF export; scans and damaged files are not supported.";
}

function aborted(): DOMException { return new DOMException("Cancelled", "AbortError"); }

async function openPdf(file: File, signal: AbortSignal) {
  if (signal.aborted) throw aborted();
  if (file.size > INVOICE_LIMITS.fileBytes || !file.size) throw new LocalPdfError("Choose a non-empty PDF up to 10 MB.");
  const data = new Uint8Array(await file.arrayBuffer());
  if (signal.aborted) throw aborted();
  const header = new TextDecoder("latin1").decode(data.slice(0, 1024));
  if (!header.includes("%PDF-")) throw new LocalPdfError("The file does not have a PDF header. Renaming a file to .pdf does not convert it.");
  const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  let port: Worker | undefined;
  let task: PDFDocumentLoadingTask | undefined;
  let pdfWorker: PDFWorker | undefined;
  let timedOut = false;
  let closed = false;
  let rejectStop: (reason: Error) => void = () => {};
  const stopped = new Promise<never>((_, reject) => { rejectStop = reject; });
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    if (task) void task.destroy().catch(() => {});
    pdfWorker?.destroy();
    port?.terminate();
    URL.revokeObjectURL(workerUrl);
  };
  const onAbort = () => { rejectStop(aborted()); close(); };
  const timer = setTimeout(() => {
    timedOut = true;
    rejectStop(new LocalPdfError("This PDF exceeded the 30-second processing limit. Try a smaller or simpler export."));
    close();
  }, INVOICE_LIMITS.processMs);
  signal.addEventListener("abort", onAbort, { once: true });
  const wait = async <T>(promise: Promise<T>): Promise<T> => {
    if (signal.aborted) throw aborted();
    if (timedOut) throw new LocalPdfError("This PDF exceeded the processing time limit.");
    return Promise.race([promise, stopped]);
  };
  // A consumed rejection stays handled even if cancellation happens between PDF operations.
  void stopped.catch(() => {});
  try {
    port = new Worker(workerUrl);
    port.addEventListener("error", () => {
      rejectStop(new LocalPdfError("Your browser could not start the isolated PDF reader. Try an up-to-date desktop browser."));
      close();
    }, { once: true });
    pdfWorker = PDFWorker.create({ port, verbosity: 0 });
    task = getDocument({
      data, worker: pdfWorker, verbosity: 0, stopAtErrors: true,
      useWorkerFetch: false, useWasm: false, BinaryDataFactory: BundledFontFactory,
      useSystemFonts: false, enableXfa: false, disableAutoFetch: true, disableRange: true,
      disableStream: true, maxImageSize: 4000000, canvasMaxAreaInBytes: 8000000,
    });
    const pdf = await wait(task.promise);
    if (pdf.numPages > INVOICE_LIMITS.pages) throw new LocalPdfError("This PDF has more than 15 pages. Use one shorter invoice per file.");
    const permissions = await wait(pdf.getPermissions());
    if (permissions && !permissions.has(PermissionFlag.COPY)) throw new LocalPdfError("This PDF restricts copying. Use an authorized export that permits text extraction.");
    return { pdf, close, wait };
  } catch (error) {
    close();
    throw error;
  }
}

export async function readInvoicePdf(file: File, signal: AbortSignal, progress: (page: number, total: number) => void): Promise<{ lines: SourceLine[]; pageCount: number; fileHash: string }> {
  if (signal.aborted) throw aborted();
  if (file.size > INVOICE_LIMITS.fileBytes || !file.size) throw new LocalPdfError("Choose a non-empty PDF up to 10 MB.");
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  if (signal.aborted) throw aborted();
  const fileHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
  const session = await openPdf(file, signal);
  const tokens: TextToken[] = [];
  let characters = 0;
  try {
    for (let number = 1; number <= session.pdf.numPages; number++) {
      const page = await session.wait(session.pdf.getPage(number));
      const viewport = page.getViewport({ scale: 1 });
      const text = await session.wait(page.getTextContent());
      if (text.items.length > INVOICE_LIMITS.pageItems) throw new LocalPdfError("This page is too complex for the local extractor. Use a simpler text PDF.");
      for (const item of text.items) {
        if (!("str" in item)) continue;
        characters += item.str.length;
        if (characters > INVOICE_LIMITS.characters) throw new LocalPdfError("This file exceeds the local text limit. Split it into smaller invoice files.");
        const transform = Util.transform(viewport.transform, item.transform);
        tokens.push({ text: item.str, page: number, x: transform[4], y: transform[5], width: item.width, height: Math.max(1, Math.hypot(transform[2], transform[3])) });
      }
      progress(number, session.pdf.numPages);
      page.cleanup();
    }
    const lines = await session.wait(groupInvoiceTokens(tokens, signal));
    if (!lines.length) throw new LocalPdfError("No readable digital text was found. Scanned, image-only or unsupported-font PDFs need OCR; OCR is not included.");
    return { lines, pageCount: session.pdf.numPages, fileHash };
  } finally {
    session.close();
  }
}

export async function previewInvoicePage(file: File, number: number, canvas: HTMLCanvasElement, signal: AbortSignal): Promise<void> {
  const session = await openPdf(file, signal);
  let rendering: RenderTask | undefined;
  const cancel = () => rendering?.cancel();
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const pdf: PDFDocumentProxy = session.pdf;
    const page = await session.wait(pdf.getPage(Math.max(1, Math.min(number, pdf.numPages))));
    const original = page.getViewport({ scale: 1 });
    const scale = Math.min(1.6, 900 / original.width, Math.sqrt(1500000 / (original.width * original.height)));
    const viewport = page.getViewport({ scale });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    // Print intent does not depend on animation frames in background/sandboxed tabs.
    rendering = page.render({ canvas, viewport, intent: "print", annotationMode: AnnotationMode.DISABLE, background: "#ffffff" });
    await session.wait(rendering.promise);
  } finally {
    signal.removeEventListener("abort", cancel);
    session.close();
  }
}