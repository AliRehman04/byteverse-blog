"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Header } from "./header";
import { Footer } from "./footer";
import { ServiceWorkerRegister } from "./sw-register";

const AdSense = dynamic(() => import("./adsense").then(module => module.AdSense), { ssr: false });
const GoogleAnalytics = dynamic(() => import("./analytics").then(module => module.GoogleAnalytics), { ssr: false });
const Chatbot = dynamic(() => import("./chatbot").then(module => module.Chatbot), { ssr: false });
const studioPath = "/tools/image-compressor";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const studio = pathname?.replace(/\/$/, "") === studioPath;
  const wasStudio = useRef(studio);

  useEffect(() => {
    // Covers programmatic router.push/replace and history transitions: a client
    // navigation that crosses the studio boundary reloads for a clean document
    // so site scripts never share a document with the private workspace.
    if (wasStudio.current !== studio) location.reload();
  }, [studio]);

  useEffect(() => {
    // Third-party scripts cannot be undone by unmounting. Always enter/leave the
    // private tool through a new document, including links in article content.
    function navigate(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href);
      const nextStudio = url.origin === location.origin && url.pathname.replace(/\/$/, "") === studioPath;
      if (url.origin === location.origin && nextStudio !== studio) {
        event.preventDefault(); event.stopPropagation(); location.assign(url.href);
      }
    }
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, [studio]);

  if (studio) return <main className="flex-1">{children}</main>;
  return <><Header /><main className="flex-1">{children}</main><Footer /><Chatbot /><ServiceWorkerRegister /><AdSense /><GoogleAnalytics /></>;
}