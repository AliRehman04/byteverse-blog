import { useCallback, useEffect, useRef } from "react";

export function useLocalDownloads() {
  const pending = useRef(new Map<string, number>());

  const revokeAll = useCallback(() => {
    for (const [url, timer] of pending.current) {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
    }
    pending.current.clear();
  }, []);

  useEffect(() => revokeAll, [revokeAll]);

  const download = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.hidden = true;
    try {
      document.body.appendChild(anchor);
      anchor.click();
      // Some browsers consume the URL after the click handler returns.
      const timer = window.setTimeout(() => {
        URL.revokeObjectURL(url);
        pending.current.delete(url);
      }, 60_000);
      pending.current.set(url, timer);
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("The local download could not be started.");
    } finally {
      anchor.remove();
    }
  }, []);

  return { download, revokeAll };
}