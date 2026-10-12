import { uniqueOutputName } from "./filenames";
import type { OutputFormat } from "./types";

export interface DownloadItem { name: string; format: OutputFormat; blob: Blob }
export function namedDownloads(items: DownloadItem[]) {
  const used = new Set<string>();
  return items.map(item => ({ ...item, filename: uniqueOutputName(item.name, item.format, used) }));
}
export function requestDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.rel = "noopener";
  document.body.append(anchor); anchor.click(); anchor.remove();
  const release = () => URL.revokeObjectURL(url);
  setTimeout(release, 30_000);
  window.addEventListener("pagehide", release, { once: true });
}
export async function downloadZip(items: DownloadItem[]) {
  if (!items.length) throw new Error("No completed images to export.");
  if (items.reduce((sum, item) => sum + item.blob.size, 0) > 200_000_000) throw new Error("This ZIP would exceed the 200 MB export memory budget. Download images individually or in smaller batches.");
  const { zip } = await import("fflate");
  const files: Record<string, Uint8Array> = Object.create(null);
  for (const item of namedDownloads(items)) files[item.filename] = new Uint8Array(await item.blob.arrayBuffer());
  const bytes = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => zip(files, { level: 0 }, (error, output) => error ? reject(new Error("The ZIP could not be created. Download the files individually.")) : resolve(new Uint8Array(output))));
  requestDownload(new Blob([bytes], { type: "application/zip" }), "byteverse-optimized-images.zip");
}
interface WritableFile { write(blob: Blob): Promise<void>; close(): Promise<void>; abort(): Promise<void> }
interface OutputFile { createWritable(): Promise<WritableFile> }
interface OutputDirectory { getFileHandle(name: string, options?: { create?: boolean }): Promise<OutputFile> }
type FolderWindow = Window & { showDirectoryPicker?: (options: { mode: "readwrite" }) => Promise<OutputDirectory> };
export function supportsFolderSave() { return typeof window !== "undefined" && typeof (window as FolderWindow).showDirectoryPicker === "function"; }
export async function saveToFolder(items: DownloadItem[]) {
  const picker = (window as FolderWindow).showDirectoryPicker;
  if (!picker) throw new Error("Folder saving is unavailable; use ZIP or individual downloads.");
  // Ask in the original user gesture. Do not write outside the chosen folder.
  const directory = await picker({ mode: "readwrite" });
  let written = 0;
  for (const item of namedDownloads(items)) {
    let filename = item.filename;
    const dot = filename.lastIndexOf(".");
    for (let suffix = 2; suffix < 10000; suffix++) {
      try { await directory.getFileHandle(filename); }
      catch (error) { if (error instanceof DOMException && error.name === "NotFoundError") break; throw new Error(`Folder access failed after ${written} saved files.`); }
      filename = `${item.filename.slice(0, dot)}-${suffix}${item.filename.slice(dot)}`;
      if (suffix === 9999) throw new Error(`Could not find an unused filename after ${written} saved files.`);
    }
    const handle = await directory.getFileHandle(filename, { create: true });
    const stream = await handle.createWritable();
    try { await stream.write(item.blob); await stream.close(); written++; }
    catch { await stream.abort().catch(() => {}); throw new Error(`Folder save stopped after ${written} files. Check folder permissions or free space; completed files remain saved.`); }
  }
  return written;
}
export function canShareImage(item: DownloadItem) {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try { return navigator.canShare({ files: [new File([item.blob], namedDownloads([item])[0].filename, { type: item.blob.type })] }); }
  catch { return false; }
}
export async function shareImage(item: DownloadItem) {
  const file = new File([item.blob], namedDownloads([item])[0].filename, { type: item.blob.type });
  if (!navigator.canShare?.({ files: [file] })) throw new Error("Image sharing is unavailable in this browser. Download instead.");
  await navigator.share({ files: [file], title: "Optimized image" });
}