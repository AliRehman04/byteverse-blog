"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { imageStudioBrand } from "@/lib/image-studio/brand";

const sections = [
  { id: "image-tool", label: "Tool" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "faq", label: "FAQ" },
] as const;

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function isPlainClick(event: MouseEvent<HTMLAnchorElement>) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function focusSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  // These are the existing workspace hooks, not a second uploader or queue.
  const focusTarget = id === "image-tool" ? document.getElementById("image-dropzone") : section;
  focusTarget?.focus({ preventScroll: true });
  // Keep query-string settings and Next's history state intact.
  if (window.location.hash !== `#${id}`) window.history.replaceState(window.history.state, "", `#${id}`);
  section.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}

/** An ordinary anchor before hydration; scrolls and focuses the real dropzone after it. */
export function ImageStudioStartLink({ children, className }: { children: ReactNode; className?: string }) {
  return <a href="#image-tool" className={className} onClick={event => {
    if (!isPlainClick(event)) return;
    event.preventDefault(); focusSection("image-tool");
  }}>{children}</a>;
}

export function ImageStudioHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  const isDark = hydrated && resolvedTheme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const desktopTool = useRef<HTMLAnchorElement>(null);
  const pendingSection = useRef<string | null>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 960px)");
    const closeOnDesktop = () => {
      if (desktop.matches && dialog.current?.open) dialog.current.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);

  function closeMenu() { dialog.current?.close(); }

  function restoreFocus() {
    const destination = pendingSection.current;
    pendingSection.current = null;
    setMenuOpen(false);
    requestAnimationFrame(() => {
      if (!dialog.current?.isConnected) return;
      if (destination) focusSection(destination);
      else if (menuTrigger.current?.getClientRects().length) menuTrigger.current.focus({ preventScroll: true });
      else desktopTool.current?.focus({ preventScroll: true });
    });
  }

  function followSection(event: MouseEvent<HTMLAnchorElement>, id: string, fromDialog = false) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    if (fromDialog) { pendingSection.current = id; closeMenu(); }
    else focusSection(id);
  }

  function containKeyboard(event: KeyboardEvent<HTMLDialogElement>) {
    // The workspace has window-level paste/compress shortcuts. A navigation
    // dialog must not accidentally add files or start a batch behind itself.
    event.stopPropagation();
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)"));
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  return <>
    <ImageStudioStartLink className="isp-skip-link">Skip to image tool</ImageStudioStartLink>
    <header className="isp-header">
      <div className="isp-container isp-header-inner">
        <a className="isp-brand" href="#image-studio-top" onClick={event => followSection(event, "image-studio-top")} aria-label={`${imageStudioBrand.name} by ${imageStudioBrand.publisher}, back to top`}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="34" height="34" rx="11" fill="#2563eb" />
            <path d="M11 9H9v7m16-7h2v7M9 23v4h7m11-4v4h-7" stroke="#dbeafe" strokeWidth="2" strokeLinecap="round" />
            <path d="m12 22 5-6 4 4 3-3v7H12v-2Z" fill="#fff" />
            <circle cx="23" cy="13" r="2" fill="#c4b5fd" />
          </svg>
          <span><strong>{imageStudioBrand.name}</strong><span>by {imageStudioBrand.publisher}</span></span>
        </a>

        <nav className="isp-desktop-nav" aria-label="Image studio sections">
          {sections.map(section => <a key={section.id} ref={section.id === "image-tool" ? desktopTool : undefined} href={`#${section.id}`} onClick={event => followSection(event, section.id)}>{section.label}</a>)}
        </nav>

        <div className="isp-header-actions">
          {/* Full-document links preserve the studio's third-party-script-free shell. */}
          <a className="isp-all-tools" href={imageStudioBrand.links.tools}>All tools</a>
          <button type="button" className="isp-icon-button" disabled={!hydrated} onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"} title={isDark ? "Switch to light theme" : "Switch to dark theme"}>
            {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>
          <ImageStudioStartLink className="isp-button isp-button-primary isp-header-start">Start compressing <ArrowRight size={15} aria-hidden="true" /></ImageStudioStartLink>
          <button ref={menuTrigger} type="button" className="isp-icon-button isp-menu-trigger" aria-label="Open navigation menu" aria-controls="image-studio-menu" aria-expanded={menuOpen} aria-haspopup="dialog" onClick={() => {
            if (!dialog.current || dialog.current.open) return;
            pendingSection.current = null;
            dialog.current.showModal(); setMenuOpen(true); closeButton.current?.focus();
          }}><Menu size={21} aria-hidden="true" /></button>
        </div>
      </div>
    </header>

    <dialog ref={dialog} id="image-studio-menu" className="isp-mobile-dialog" aria-labelledby="image-studio-menu-title" aria-modal="true" onClose={restoreFocus} onCancel={event => { event.preventDefault(); closeMenu(); }} onKeyDown={containKeyboard} onPaste={event => event.stopPropagation()}>
      <div className="isp-dialog-heading"><h2 id="image-studio-menu-title">Explore {imageStudioBrand.name}</h2><button ref={closeButton} type="button" className="isp-icon-button" onClick={closeMenu} aria-label="Close navigation menu"><X size={21} aria-hidden="true" /></button></div>
      <nav className="isp-mobile-nav" aria-label="Mobile image studio sections">
        {sections.map(section => <a key={section.id} href={`#${section.id}`} onClick={event => followSection(event, section.id, true)}>{section.label}<ArrowRight size={17} aria-hidden="true" /></a>)}
        <a href="#image-tool" className="isp-button isp-button-primary" onClick={event => followSection(event, "image-tool", true)}>Start compressing <ArrowRight size={16} aria-hidden="true" /></a>
      </nav>
      <nav className="isp-mobile-site-links" aria-label={imageStudioBrand.publisher}>
        <a href={imageStudioBrand.links.home}>{imageStudioBrand.publisher} home</a>
        <a href={imageStudioBrand.links.tools}>All free tools</a>
        <a href={imageStudioBrand.links.blog}>Blog</a>
      </nav>
      <p className="isp-dialog-note">Image processing stays in this tab. No account needed.</p>
    </dialog>
  </>;
}