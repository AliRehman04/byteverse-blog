"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const register = () => {
      if (!navigator.onLine) return;
      // Keep the root worker up to date (including its private-cache exclusions).
      // ImageOfflineControls independently owns the more-specific studio scope.
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    };
    register();
    window.addEventListener("online", register);
    return () => window.removeEventListener("online", register);
  }, []);

  return null;
}
