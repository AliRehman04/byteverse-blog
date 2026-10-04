import { Component, lazy, Suspense, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { AlertCircle, RotateCcw, ShieldCheck } from "lucide-react";
import "./workspace.css";

const InvoiceWorkspaceApp = lazy(() => import("./app"));

class WorkspaceBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="iw-shell iw-fallback" role="alert">
        <AlertCircle aria-hidden="true" size={30} />
        <h2>The workspace could not continue</h2>
        <p>An unexpected local error stopped this workspace. Nothing was uploaded. Reload to start a new batch; unsaved files and edits will be cleared.</p>
        <button type="button" className="iw-button iw-button-primary" onClick={() => window.location.reload()}><RotateCcw aria-hidden="true" size={16} /> Reload workspace</button>
      </section>
    );
  }
}

function supported(): boolean {
  try {
    return typeof File === "function" && typeof Blob === "function" && typeof FileReader === "function" &&
      typeof Worker === "function" && typeof AbortController === "function" && typeof ResizeObserver === "function" &&
      typeof TextEncoder === "function" && typeof TextDecoder === "function" && typeof BigInt === "function" &&
      typeof crypto !== "undefined" && typeof crypto.subtle?.digest === "function" &&
      typeof URL.createObjectURL === "function" && typeof URL.revokeObjectURL === "function" &&
      typeof Blob.prototype.arrayBuffer === "function" && typeof Object.hasOwn === "function" &&
      typeof Promise.withResolvers === "function" && "download" in document.createElement("a") &&
      Boolean(document.createElement("canvas").getContext("2d"));
  } catch { return false; }
}

function CapabilityGate() {
  if (supported()) return (
    <Suspense fallback={<section className="iw-shell iw-fallback" role="status"><ShieldCheck aria-hidden="true" size={25} /><p>Preparing your isolated workspace…</p></section>}>
      <InvoiceWorkspaceApp />
    </Suspense>
  );
  return (
    <section className="iw-shell iw-fallback" role="status">
      <ShieldCheck aria-hidden="true" size={30} />
      <h2>A newer browser is needed</h2>
      <p>This private workspace needs local file handling, PDF workers, secure hashing and canvas support. Use a current browser on a secure HTTPS page. No files have been processed.</p>
      <p>There is no upload fallback. If your browser blocks isolated workers or downloads, use another supported browser rather than disabling the privacy boundary.</p>
    </section>
  );
}

function FrameBridge({ element }: { element: HTMLElement }) {
  useLayoutEffect(() => {
    let previousHeight = 0;
    let stopped = false;
    const measure = () => {
      if (stopped || window.parent === window) return;
      const measured = Math.ceil(element.getBoundingClientRect().height);
      if (!Number.isFinite(measured)) return;
      const height = Math.max(1, Math.min(2400, measured));
      if (height === previousHeight) return;
      previousHeight = height;
      window.parent.postMessage({ type: "byteverse-invoice-resize", height }, "*");
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    measure();
    const receiveTheme = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || window.parent === window || !event.data || typeof event.data !== "object" || Array.isArray(event.data)) return;
      const data = event.data as Record<string, unknown>;
      if (data.type !== "byteverse-invoice-theme" || typeof data.dark !== "boolean") return;
      if (Object.keys(data).length !== 2) return;
      document.documentElement.dataset.theme = data.dark ? "dark" : "light";
    };
    window.addEventListener("message", receiveTheme);
    return () => {
      stopped = true;
      observer?.disconnect();
      window.removeEventListener("message", receiveTheme);
    };
  }, [element]);
  return null;
}

const element = document.getElementById("invoice-app");
if (element) {
  const root = createRoot(element, {
    onCaughtError: () => {},
    onUncaughtError: () => {},
    onRecoverableError: () => {},
  });
  flushSync(() => root.render(<><FrameBridge element={element} /><WorkspaceBoundary><CapabilityGate /></WorkspaceBoundary></>));
}