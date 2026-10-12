"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Download, HardDriveDownload, Loader2, Trash2, WifiOff, X } from "lucide-react";
import { downloadImageOfflinePack, getImageOfflineStatus, ImageOfflineError, initializeImageOffline, observeImageOfflineAssets, removeImageOfflinePack } from "@/lib/image-studio/offline";
import type { ImageOfflineProgress, ImageOfflineStatus } from "@/lib/image-studio/offline";
import "./image-offline.css";

type Mode = "checking" | "available" | "ready" | "downloading" | "removing" | "unavailable" | "error";
const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(2)} MB`;
const description = (status: ImageOfflineStatus) => status.ready
  ? `Complete pack verified on this device${status.savedBytes ? ` · ${megabytes(status.savedBytes)} saved` : ""}.`
  : status.reason === "removed" ? "This tool’s cached application files, icons and install metadata were removed. Automatic caching stays paused until you download again."
    : status.reason === "outdated" ? "This page or codec version has changed. Download again to update the complete pack."
      : status.reason === "incomplete" ? "Some saved files are missing or invalid. Download again while online."
        : "Only previously cached features may work offline. Save the full pack for all codecs and ZIP export.";

export function ImageOfflineControls() {
  const id = useId();
  const [mode, setMode] = useState<Mode>("checking");
  const [status, setStatus] = useState<ImageOfflineStatus | null>(null);
  const [progress, setProgress] = useState<ImageOfflineProgress | null>(null);
  const [message, setMessage] = useState("Checking this device’s offline storage…");
  const [isOnline, setIsOnline] = useState(true);
  const mounted = useRef(false);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);

  function applyStatus(value: ImageOfflineStatus) {
    if (!mounted.current) return;
    setStatus(value); setMode(value.ready ? "ready" : "available"); setMessage(description(value));
  }

  function showError(error: unknown) {
    if (!mounted.current) return;
    const unavailable = error instanceof ImageOfflineError && ["unsupported", "development", "secure", "scope", "control"].includes(error.code);
    setMode(unavailable ? "unavailable" : "error");
    setMessage(error instanceof Error ? error.message : "Offline storage could not be accessed. Try again online.");
  }

  useEffect(() => {
    mounted.current = true;
    const stopObserving = observeImageOfflineAssets();
    let disposed = false;
    let refreshing = false;
    const refresh = async (warm: boolean) => {
      if (busy.current || refreshing) return;
      refreshing = true;
      try {
        const value = await (warm ? initializeImageOffline() : getImageOfflineStatus());
        if (!disposed && !busy.current) applyStatus(value);
      } catch (error) { if (!disposed && !busy.current) showError(error); }
      finally { refreshing = false; if (!disposed) setIsOnline(navigator.onLine); }
    };
    const reconnected = () => { setIsOnline(true); void refresh(true); };
    const disconnected = () => { setIsOnline(false); void refresh(false); };
    const visible = () => { if (document.visibilityState === "visible") void refresh(false); };
    void refresh(true);
    window.addEventListener("online", reconnected);
    window.addEventListener("offline", disconnected);
    window.addEventListener("pageshow", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true; mounted.current = false; controller.current?.abort(); stopObserving();
      window.removeEventListener("online", reconnected);
      window.removeEventListener("offline", disconnected);
      window.removeEventListener("pageshow", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  async function download() {
    if (busy.current) return;
    busy.current = true;
    const abort = new AbortController(); controller.current = abort;
    setMode("downloading"); setProgress(null); setMessage("Preparing the ZIP dependency and offline download…");
    try {
      applyStatus(await downloadImageOfflinePack({
        signal: abort.signal,
        onProgress: (value) => {
          if (!mounted.current || abort.signal.aborted) return;
          setProgress(value);
          setMessage(value.phase === "codecs" ? `Verified ${value.completedFiles} of ${value.totalFiles} codec and license files.`
            : value.phase === "shell" ? `Saving interface files, fonts and app icons: ${value.completedFiles} of ${value.totalFiles}.`
              : value.phase === "verifying" ? "Verifying every saved file before marking the pack ready…"
                : "Checking the current codec manifest…");
        },
      }));
    } catch (error) {
      if (abort.signal.aborted) {
        try {
          const value = await getImageOfflineStatus();
          applyStatus(value);
          if (mounted.current) setMessage(value.ready ? "Download cancelled. The previously verified complete pack is still available." : "Download cancelled. No complete offline pack is ready.");
        } catch { if (mounted.current) { setMode("available"); setMessage("Download cancelled. Recheck the saved pack before going offline."); } }
      } else showError(error);
    } finally { busy.current = false; controller.current = null; if (mounted.current) setProgress(null); }
  }

  async function remove() {
    if (busy.current) return;
    busy.current = true; setMode("removing"); setMessage("Removing this tool’s saved application files…");
    try { applyStatus(await removeImageOfflinePack()); }
    catch (error) { showError(error); }
    finally { busy.current = false; }
  }

  const working = mode === "downloading" || mode === "removing";
  const checking = mode === "checking";
  const unavailable = mode === "unavailable";
  const codecProgress = progress?.phase === "codecs" && progress.totalBytes > 0;
  const title = mode === "ready" ? "Ready offline" : "Take Image Studio offline";

  return (
    <section className="image-offline" aria-labelledby={`${id}-title`} aria-describedby={`${id}-privacy`} data-ready={mode === "ready"}>
      <div className="image-offline__heading">
        <span className="image-offline__icon" aria-hidden="true">{mode === "ready" ? <Check size={20} /> : <HardDriveDownload size={20} />}</span>
        <div><h2 id={`${id}-title`}>{title}</h2><p>{status?.codecBytes ? `${megabytes(status.codecBytes)} codec pack + interface files` : "All codecs, interface files, fonts and ZIP export"}</p></div>
        {!isOnline && <span className="image-offline__badge"><WifiOff size={14} aria-hidden="true" /> Offline</span>}
      </div>
      <p className="image-offline__status" id={`${id}-status`} role="status" aria-live="polite" aria-atomic="true">{message}</p>
      {mode === "downloading" && <div className="image-offline__progress">
        <label htmlFor={`${id}-progress`}>{codecProgress ? `${megabytes(progress.loadedBytes)} / ${megabytes(progress.totalBytes)} codecs received` : progress?.phase === "shell" ? "Saving the interface and fonts" : "Preparing and verifying files"}</label>
        <progress id={`${id}-progress`} max={codecProgress ? progress.totalBytes : 1} value={codecProgress ? Math.min(progress.loadedBytes, progress.totalBytes) : undefined} />
      </div>}
      <div className="image-offline__actions">
        {mode === "downloading" ? <button type="button" className="image-offline__secondary" onClick={() => { controller.current?.abort(); setMessage("Cancelling the download…"); }}><X size={16} aria-hidden="true" /> Cancel download</button>
          : mode !== "ready" && <button type="button" className="image-offline__primary" onClick={() => void download()} disabled={working || checking || unavailable || !isOnline} aria-describedby={`${id}-status`}>
            {checking ? <Loader2 className="image-offline__spinner" size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
            {checking ? "Checking offline support" : mode === "error" ? "Retry offline download" : "Download offline pack"}
          </button>}
        {status?.hasSavedFiles && mode !== "downloading" && <button type="button" className="image-offline__secondary" onClick={() => void remove()} disabled={working || checking || unavailable}>
          <Trash2 size={16} aria-hidden="true" /> {mode === "removing" ? "Removing…" : "Remove offline files"}
        </button>}
      </div>
      <p className="image-offline__privacy" id={`${id}-privacy`}>This offline cache saves application code, fonts, app icons and install metadata—not your images, filenames or results. Browser storage can be cleared or evicted; check the ready status before disconnecting.</p>
    </section>
  );
}