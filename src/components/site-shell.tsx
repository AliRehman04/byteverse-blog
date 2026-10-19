"use client";

import { useEffect, useState } from "react";
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
  const [initialStudio] = useState(studio);

  useEffect(() => {
    // Programmatic and history transitions need a new document too.
    if (initialStudio !== studio) location.reload();
  }, [initialStudio, studio]);

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

  // Do not mount the destination shell while its full-document reload is pending.
  if (initialStudio !== studio) return null;
  const skipLink = <a href="#main-content" className="site-skip-link">Skip to content</a>;
  if (studio) return <>{skipLink}<Header localTool /><main id="main-content" tabIndex={-1} className="flex-1">{children}</main><Footer localTool /></>;
  return <>{skipLink}<Header /><main id="main-content" tabIndex={-1} className="flex-1">{children}</main><Footer /><Chatbot /><ServiceWorkerRegister /><AdSense /><GoogleAnalytics /></>;
}