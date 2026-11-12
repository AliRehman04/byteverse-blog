"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check, ChevronDown, CircleX, Columns2, Copy, Download, Ellipsis, FileArchive, GripVertical, Info, LockKeyhole,
  Maximize2, Minimize2, Monitor, Play, RotateCcw, RotateCw, Rows2, Ruler, Share2, Smartphone, SquareTerminal,
  Tablet, Trash2, TriangleAlert, Upload, WandSparkles,
} from "lucide-react";
import {
  buildDocument, describeConsoleMessage, parseProject, serializeProject, splitDocument, SOURCE_LABELS,
  type ConsoleLevel, type LineSegment, type PlaygroundProject, type PlaygroundSource,
} from "@/lib/html-playground";
import { CodeEditor } from "./code-editor";
import { TEMPLATES } from "./templates";

const TEMPLATE_PROJECTS: Record<string, PlaygroundProject> = Object.fromEntries(
  Object.entries(TEMPLATES).map(([key, template]) => [key, splitDocument(template.code)]),
);
const DEFAULT_PROJECT = TEMPLATE_PROJECTS.starter;
const DEFAULT_SAVED = serializeProject(DEFAULT_PROJECT);
const STORAGE_KEY = "byteverse.html-editor.v2";
const LEGACY_STORAGE_KEY = "byteverse.html-editor.v1";
const SOURCES: PlaygroundSource[] = ["html", "css", "js"];
const FILE_NAMES: Record<PlaygroundSource, string> = { html: "index.html", css: "styles.css", js: "script.js" };
const EDITOR_LABELS: Record<PlaygroundSource, string> = { html: "HTML source", css: "CSS source", js: "JavaScript source" };
const TAB_DOTS: Record<PlaygroundSource, string> = { html: "bg-orange-400", css: "bg-sky-400", js: "bg-yellow-300" };
const DEVICES = {
  desktop: { label: "Desktop", icon: Monitor, portrait: null, landscape: null },
  tablet: { label: "Tablet 768px", icon: Tablet, portrait: 768, landscape: 1024 },
  phone: { label: "Phone 375px", icon: Smartphone, portrait: 375, landscape: 667 },
  custom: { label: "Custom width", icon: Ruler, portrait: null, landscape: null },
} as const;
type Device = keyof typeof DEVICES;
type ConsoleEntry = { id: number; level: ConsoleLevel; text: string; count: number };
type Status = { text: string; tone: "ok" | "error" };

const CONSOLE_TONES: Record<ConsoleLevel, string> = {
  error: "text-red-200",
  warn: "text-amber-200",
  info: "text-sky-200",
  log: "text-slate-200",
  debug: "text-slate-300",
};
const CONSOLE_PREFIX: Record<ConsoleLevel, string> = { error: "Error: ", warn: "Warning: ", info: "Info: ", log: "", debug: "Debug: " };

const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";
const control = `inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[36px] ${ring}`;
const textButton = `${control} px-3`;
const iconButton = `${control} w-[44px] md:w-9`;
const runButton = `inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-300 md:min-h-[36px] ${ring}`;
const segment = (active: boolean) => `inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[30px] md:min-w-[34px] ${ring} ${active ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-100"}`;
const menuItem = `flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-md px-3 text-left text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 focus-visible:bg-white/10 md:min-h-[36px] ${ring}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function saveFile(data: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

const clearHash = () => window.history.replaceState(null, "", window.location.pathname + window.location.search);

export function HtmlEditorTool() {
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [published, setPublished] = useState(DEFAULT_PROJECT);
  const [runId, setRunId] = useState(0);
  const [tab, setTab] = useState<PlaygroundSource>("html");
  const [autoRun, setAutoRun] = useState(true);
  const [layout, setLayout] = useState<"side" | "stacked">("side");
  const [split, setSplit] = useState(50);
  const [device, setDevice] = useState<Device>("desktop");
  const [rotated, setRotated] = useState(false);
  const [customWidth, setCustomWidth] = useState(1024);
  const [fullscreen, setFullscreen] = useState(false);
  const [template, setTemplate] = useState("starter");
  const [draft, setDraft] = useState<PlaygroundProject | null>(null);
  const [gated, setGated] = useState(false);
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [mod, setMod] = useState("Ctrl");
  const [paneWidth, setPaneWidth] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const segmentsRef = useRef<LineSegment[]>([]);
  const projectRef = useRef(project);
  const sharedRef = useRef<PlaygroundProject | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryId = useRef(0);
  const lastEscape = useRef(0);

  const built = useMemo(() => buildDocument(published, { capture: true }), [published]);
  useEffect(() => { segmentsRef.current = built.segments; }, [built]);
  useEffect(() => { projectRef.current = project; }, [project]);

  const announce = useCallback((text: string, tone: Status["tone"] = "ok") => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus({ text, tone });
    statusTimer.current = setTimeout(() => setStatus(null), 7000);
  }, []);
  useEffect(() => () => { if (statusTimer.current) clearTimeout(statusTimer.current); }, []);

  // Console output belongs to one render, so it is cleared with each new document.
  const publish = useCallback((next: PlaygroundProject) => {
    setPublished(next);
    setEntries([]);
    setRunId((id) => id + 1);
    setGated(false);
  }, []);

  // Once the user changes shared code it becomes their own work: drop the link and allow autosave.
  const leaveSharedLink = useCallback(() => {
    if (!sharedRef.current) return;
    sharedRef.current = null;
    clearHash();
  }, []);

  const loadTemplate = useCallback((key: string) => {
    const next = TEMPLATE_PROJECTS[key];
    if (!next) return;
    leaveSharedLink();
    setTemplate(key);
    setProject(next);
    publish(next);
  }, [leaveSharedLink, publish]);

  const openFromHash = useCallback(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#template=")) {
      const key = hash.slice("#template=".length);
      if (!TEMPLATE_PROJECTS[key]) return;
      loadTemplate(key);
      clearHash();
      sectionRef.current?.scrollIntoView({ block: "start" });
      return;
    }
    if (!hash.startsWith("#code=")) return;
    import("@/lib/html-playground-export").then(({ decodeShare }) => {
      const shared = decodeShare(hash);
      if (!shared) {
        announce("This share link is incomplete or invalid.", "error");
        return;
      }
      sharedRef.current = shared;
      setProject(shared);
      setEntries([]);
      setGated(true);
    }).catch(() => announce("The share link could not be opened.", "error"));
  }, [announce, loadTemplate]);

  // Restore banner: offer the last session instead of silently replacing the starter page.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (/Mac|iPhone|iPad/.test(navigator.platform)) setMod("⌘");
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const legacy = saved === null ? localStorage.getItem(LEGACY_STORAGE_KEY) : null;
        const found = saved !== null ? parseProject(saved) : legacy ? { html: legacy, css: "", js: "" } : null;
        if (found && serializeProject(found) !== DEFAULT_SAVED) setDraft(found);
      } catch { /* storage unavailable */ }
      openFromHash();
    });
    window.addEventListener("hashchange", openFromHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, [openFromHash]);

  // Autosave once the restore decision is made; the starter page and untouched shared code are never stored.
  useEffect(() => {
    if (draft !== null || project === sharedRef.current) return;
    const timer = setTimeout(() => {
      try {
        const saved = serializeProject(project);
        if (saved === DEFAULT_SAVED) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, saved);
      } catch { /* storage unavailable */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [project, draft]);

  // Debounced live preview. Shared code waits for an explicit Run.
  useEffect(() => {
    if (!autoRun || gated || project === published) return;
    const timer = setTimeout(() => publish(project), 150);
    return () => clearTimeout(timer);
  }, [project, published, autoRun, gated, publish]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = describeConsoleMessage(event.data, segmentsRef.current, window.location.href);
      if (!message) return;
      const id = ++entryId.current;
      setEntries((list) => {
        const last = list[list.length - 1];
        if (last && last.level === message.level && last.text === message.text) return [...list.slice(0, -1), { ...last, count: last.count + 1 }];
        return [...list.slice(-199), { id, ...message, count: 1 }];
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Fixed preview widths wider than the pane are scaled down so the whole viewport stays visible.
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((observed) => {
      const entry = observed[0];
      if (entry) setPaneWidth(entry.contentRect.width);
    });
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  // Fullscreen: lock page scroll, exit with Escape, return focus to the toggle.
  useEffect(() => {
    if (!fullscreen) return;
    const toggle = fullscreenButtonRef.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Inside the code area the first Esc releases Tab; only a second Esc leaves full screen.
      if (event.target instanceof Element && event.target.closest(".cm-editor") && Date.now() - lastEscape.current > 2000) {
        lastEscape.current = Date.now();
        return;
      }
      setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  const edit = useCallback((source: PlaygroundSource, value: string, replacedAll: boolean) => {
    leaveSharedLink();
    // Pasting a whole page over a template must not inherit the template's untouched CSS and JS.
    const current = projectRef.current;
    const base = TEMPLATE_PROJECTS[template];
    const replaced = source === "html" && replacedAll;
    const dropCss = replaced && base.css !== "" && current.css === base.css;
    const dropJs = replaced && base.js !== "" && current.js === base.js;
    setProject((now) => (now[source] === value ? now : { ...now, ...(dropCss && { css: "" }), ...(dropJs && { js: "" }), [source]: value }));
    if (dropCss || dropJs) announce("You replaced the whole HTML tab, so the template's unused CSS and JS were cleared. Undo with Ctrl Z in those tabs.");
  }, [announce, leaveSharedLink, template]);

  const run = useCallback(() => publish(project), [project, publish]);

  const download = useCallback(() => {
    saveFile(buildDocument(project).doc, "text/html", "index.html");
  }, [project]);

  const downloadZip = useCallback(async () => {
    try {
      const { zipProject } = await import("@/lib/html-playground-export");
      saveFile(zipProject(project).slice(), "application/zip", "byteverse-html-project.zip");
      announce("ZIP downloaded with index.html and any CSS and JS files.");
    } catch {
      announce("The ZIP file could not be created.", "error");
    }
  }, [announce, project]);

  const copyText = useCallback(async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      announce(done);
      return true;
    } catch {
      announce("Copying was blocked by the browser.", "error");
      return false;
    }
  }, [announce]);

  const copyTab = useCallback(async () => {
    if (!(await copyText(project[tab], `${SOURCE_LABELS[tab]} copied.`))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [copyText, project, tab]);

  const share = useCallback(async () => {
    try {
      const { encodeShare } = await import("@/lib/html-playground-export");
      const hash = encodeShare(project);
      if (!hash) {
        announce("This project is too large for a link. Download it instead.", "error");
        return;
      }
      try {
        await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${hash}`);
        announce("Share link copied. The code runs only after the recipient presses Run.");
      } catch {
        window.history.replaceState(null, "", hash);
        announce("Copying was blocked. The link is now in the address bar.");
      }
    } catch {
      announce("The share link could not be created.", "error");
    }
  }, [announce, project]);

  const format = useCallback(async () => {
    const source = project;
    setFormatting(true);
    try {
      const [prettier, ...plugins] = await Promise.all([
        import("prettier/standalone"),
        import("prettier/plugins/html"),
        import("prettier/plugins/postcss"),
        import("prettier/plugins/babel"),
        import("prettier/plugins/estree"),
      ]);
      const next = { ...source };
      const problems: string[] = [];
      for (const [key, parser] of [["html", "html"], ["css", "css"], ["js", "babel"]] as const) {
        if (!source[key].trim()) continue;
        try {
          next[key] = (await prettier.format(source[key], { parser, plugins, printWidth: 100 })).replace(/\n$/, "");
        } catch (error) {
          problems.push(`${SOURCE_LABELS[key]}: ${String(error instanceof Error ? error.message : error).split("\n")[0]}`);
        }
      }
      if (projectRef.current !== source) {
        announce("The code changed while formatting. Format again.", "error");
        return;
      }
      leaveSharedLink();
      setProject(next);
      if (problems.length) announce(`Not formatted. ${problems.join(" · ")}`, "error");
      else announce("Code formatted. Undo with Ctrl Z in each tab.");
    } catch {
      announce("The formatter could not be loaded.", "error");
    } finally {
      setFormatting(false);
    }
  }, [announce, leaveSharedLink, project]);

  const importFiles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const imported: Partial<PlaygroundProject> = {};
    const names: string[] = [];
    let first: PlaygroundSource | null = null;
    try {
      for (const file of files) {
        if (file.size > 1_000_000) {
          announce(`${file.name} is larger than 1 MB and was not imported.`, "error");
          return;
        }
        const source: PlaygroundSource = /\.css$/i.test(file.name) ? "css" : /\.m?js$/i.test(file.name) ? "js" : "html";
        imported[source] = (await file.text()).replace(/\r\n?/g, "\n");
        names.push(`${file.name} into ${SOURCE_LABELS[source]}`);
        first ??= source;
      }
    } catch {
      announce("The file could not be read.", "error");
      return;
    }
    if (!first) return;
    leaveSharedLink();
    setProject((current) => ({ ...current, ...imported }));
    setTab(first);
    announce(`Imported ${names.join(", ")}.`);
  }, [announce, leaveSharedLink]);

  const reset = useCallback(() => {
    loadTemplate("starter");
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch { /* storage unavailable */ }
    announce("Editor reset to the starter page.");
  }, [announce, loadTemplate]);

  const restoreDraft = useCallback(() => {
    if (draft === null) return;
    leaveSharedLink();
    setProject(draft);
    publish(draft);
    setDraft(null);
    try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* storage unavailable */ }
  }, [draft, leaveSharedLink, publish]);

  const discardDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch { /* storage unavailable */ }
    setDraft(null);
  }, []);

  const closeMenu = useCallback((refocus = true) => {
    setMenuOpen(false);
    if (refocus) menuButtonRef.current?.focus();
  }, []);

  const onMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]")).filter((item) => item.offsetParent !== null);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
    } else if (event.key === "Tab") {
      closeMenu(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    }
  };

  const onTabKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = SOURCES[(SOURCES.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + SOURCES.length) % SOURCES.length];
    setTab(next);
    document.getElementById(`html-editor-tab-${next}`)?.focus();
  };

  const onWorkspaceKey = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || !(event.ctrlKey || event.metaKey)) return;
    if (event.key === "Enter") {
      event.preventDefault();
      run();
    } else if (event.key.toLowerCase() === "s") {
      event.preventDefault();
      download();
    }
  };

  const onSplitDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = bodyRef.current?.getBoundingClientRect();
    if (rect) setSplit(Math.round(clamp(((event.clientX - rect.left) / rect.width) * 100, 25, 75)));
  };

  const onSplitKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const next = event.key === "ArrowLeft" ? split - 2 : event.key === "ArrowRight" ? split + 2 : event.key === "Home" ? 25 : event.key === "End" ? 75 : null;
    if (next === null) return;
    event.preventDefault();
    setSplit(clamp(next, 25, 75));
  };

  const side = layout === "side";
  const dirty = project !== published;
  const preset = DEVICES[device];
  const targetWidth = device === "custom" ? clamp(customWidth, 240, 2560) : rotated ? preset.landscape : preset.portrait;
  const scale = targetWidth !== null && paneWidth > 0 && targetWidth > paneWidth ? paneWidth / targetWidth : 1;
  const scaled = scale < 1;
  const sizeLabel = `${targetWidth === null ? "Fits the pane" : `${targetWidth}px`}${scaled ? ` · scaled to ${Math.round(scale * 100)}%` : ""}${!autoRun && dirty ? " · changes not run yet" : ""}`;
  const consoleShown = consoleOpen ?? entries.length > 0;
  const errorCount = entries.reduce((total, entry) => total + (entry.level === "error" ? entry.count : 0), 0);
  const warningCount = entries.reduce((total, entry) => total + (entry.level === "warn" ? entry.count : 0), 0);
  const lineCount = project[tab].split("\n").length;

  return (
    <section
      ref={sectionRef}
      id="html-editor"
      aria-label="Live HTML editor"
      onKeyDown={onWorkspaceKey}
      data-fullscreen={fullscreen || undefined}
      style={{ colorScheme: "dark" }}
      className={`flex flex-col bg-[#0b1120] text-slate-200 ${fullscreen ? "fixed inset-0 z-[70]" : "scroll-mt-20 rounded-2xl border border-slate-800 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)]"}`}
    >
      {draft !== null && (
        <div role="region" aria-label="Restore last session" className={`flex flex-wrap items-center gap-3 border-b border-sky-400/20 bg-sky-500/10 px-3 py-2.5 text-sm text-slate-100 ${fullscreen ? "" : "rounded-t-2xl"}`}>
          <span className="min-w-[12rem] flex-1">You have unsaved work from your last visit in this browser.</span>
          <button type="button" className={runButton} onClick={restoreDraft}>Restore it</button>
          <button type="button" className={textButton} onClick={discardDraft}>Start fresh</button>
        </div>
      )}

      <div role="toolbar" aria-label="Editor controls" className={`relative z-20 flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0f172a] px-3 py-2.5 ${fullscreen || draft !== null ? "" : "rounded-t-2xl"}`}>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium text-slate-300 sm:flex-none">
          <span className="sr-only sm:not-sr-only">Template</span>
          <select
            value={template}
            onChange={(event) => loadTemplate(event.target.value)}
            aria-label="Template"
            className={`min-h-[44px] w-full min-w-0 cursor-pointer rounded-lg border border-white/10 bg-[#0b1120] px-2.5 text-xs font-medium text-slate-100 sm:w-auto md:min-h-[36px] ${ring}`}
          >
            {Object.entries(TEMPLATES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>

        <button type="button" className={runButton} onClick={run} title={`Run (${mod} Enter)`}>
          <Play size={13} aria-hidden="true" fill="currentColor" /> Run
        </button>
        <label className="inline-flex min-h-[44px] cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-300 md:min-h-[36px]">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-emerald-400"
            checked={autoRun}
            onChange={(event) => setAutoRun(event.target.checked)}
          />
          Auto-run
        </label>

        <div className="hidden flex-1 sm:block" />

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <button type="button" className={`${control} w-[44px] md:w-9 lg:w-auto lg:px-3`} onClick={format} disabled={formatting} aria-label="Format code" title="Format HTML, CSS and JS with Prettier">
            <WandSparkles size={14} aria-hidden="true" /> <span className="hidden lg:inline">{formatting ? "Formatting" : "Format"}</span>
          </button>
          <button type="button" className={`${control} w-[44px] md:w-9 lg:w-auto lg:px-3`} onClick={share} aria-label="Copy share link" title="Copy a link that contains this code">
            <Share2 size={14} aria-hidden="true" /> <span className="hidden lg:inline">Share</span>
          </button>
          <button type="button" className={`${control} w-[44px] md:w-9 lg:w-auto lg:px-3`} onClick={download} aria-label="Download index.html" title={`Download index.html (${mod} S)`}>
            <Download size={14} aria-hidden="true" /> <span className="hidden lg:inline">Download</span>
          </button>
          <div className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              className={iconButton}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="html-editor-menu"
              aria-label="More actions"
              title="More actions"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Ellipsis size={16} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                id="html-editor-menu"
                role="menu"
                aria-label="More actions"
                onKeyDown={onMenuKey}
                className="absolute right-0 top-full z-30 mt-1.5 w-60 rounded-xl border border-white/10 bg-[#111a2e] p-1.5 shadow-2xl shadow-black/50"
              >
                <button type="button" role="menuitem" className={menuItem} onClick={() => { closeMenu(); fileRef.current?.click(); }}>
                  <Upload size={14} aria-hidden="true" /> Import HTML, CSS or JS files
                </button>
                <button type="button" role="menuitem" className={menuItem} onClick={() => { closeMenu(); void copyText(buildDocument(project).doc, "Combined HTML copied."); }}>
                  <Copy size={14} aria-hidden="true" /> Copy combined HTML
                </button>
                <button type="button" role="menuitem" className={menuItem} onClick={() => { closeMenu(); void downloadZip(); }}>
                  <FileArchive size={14} aria-hidden="true" /> Download ZIP
                </button>
                <button type="button" role="menuitem" className={`${menuItem} hidden md:flex`} onClick={() => { closeMenu(); setLayout(side ? "stacked" : "side"); }}>
                  {side ? <Rows2 size={14} aria-hidden="true" /> : <Columns2 size={14} aria-hidden="true" />} {side ? "Stack editor above preview" : "Show side by side"}
                </button>
                <div className="my-1 border-t border-white/10" role="separator" />
                <button type="button" role="menuitem" className={menuItem} onClick={() => { closeMenu(); reset(); }}>
                  <RotateCcw size={14} aria-hidden="true" /> Reset editor
                </button>
              </div>
            )}
          </div>
          <button
            ref={fullscreenButtonRef}
            type="button"
            className={iconButton}
            aria-pressed={fullscreen}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
            onClick={() => setFullscreen((value) => !value)}
          >
            {fullscreen ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
          </button>
        </div>
        <input ref={fileRef} type="file" hidden multiple accept=".html,.htm,.css,.js,.mjs,.txt" onChange={importFiles} />
      </div>

      <div
        ref={bodyRef}
        style={{ "--split": `${split}%` } as React.CSSProperties}
        className={`flex min-h-0 flex-col ${side ? "md:flex-row" : ""} ${fullscreen ? "flex-1" : side ? "md:h-[640px]" : ""}`}
      >
        {/* Code */}
        <div className={`relative flex min-w-0 flex-col after:pointer-events-none after:absolute after:inset-0 after:z-10 focus-within:after:shadow-[inset_0_0_0_2px_#38bdf8] ${fullscreen ? "min-h-0 flex-1" : `h-[380px] ${side ? "md:h-auto" : "md:h-[420px]"}`} ${side ? "md:w-[var(--split)] md:flex-none" : ""}`}>
          <div className="flex items-center gap-2 border-b border-white/10 bg-[#0f172a] pl-1 pr-2">
            <div role="tablist" aria-label="Code tabs" className="flex" onKeyDown={onTabKey}>
              {SOURCES.map((source) => {
                const active = tab === source;
                return (
                  <button
                    key={source}
                    type="button"
                    role="tab"
                    id={`html-editor-tab-${source}`}
                    aria-selected={active}
                    aria-controls={`html-editor-panel-${source}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setTab(source)}
                    className={`relative inline-flex min-h-[44px] cursor-pointer items-center gap-2 px-3.5 text-xs font-semibold transition-colors md:min-h-[40px] ${ring} ${active ? "text-white after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-sky-400" : "text-slate-400 hover:text-slate-100"}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${TAB_DOTS[source]}`} aria-hidden="true" /> {SOURCE_LABELS[source]}
                  </button>
                );
              })}
            </div>
            <span className="ml-auto hidden text-xs text-slate-400 sm:inline" aria-hidden="true">{FILE_NAMES[tab]} · {lineCount} {lineCount === 1 ? "line" : "lines"}</span>
            <button type="button" className={`ml-auto sm:ml-0 ${segment(false)}`} onClick={copyTab} aria-label={`Copy ${SOURCE_LABELS[tab]}`} title={`Copy ${SOURCE_LABELS[tab]}`}>
              {copied ? <Check size={14} aria-hidden="true" className="text-emerald-300" /> : <Copy size={14} aria-hidden="true" />}
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {SOURCES.map((source) => (
              <div key={source} role="tabpanel" id={`html-editor-panel-${source}`} aria-labelledby={`html-editor-tab-${source}`} hidden={tab !== source} className="h-full min-h-0">
                <CodeEditor
                  language={source}
                  value={project[source]}
                  active={tab === source}
                  label={EDITOR_LABELS[source]}
                  describedBy="html-editor-hint"
                  onChange={(value, replacedAll) => edit(source, value, replacedAll)}
                  onRun={run}
                  onSave={download}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Resize editor and preview"
          aria-valuemin={25}
          aria-valuemax={75}
          aria-valuenow={split}
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={onSplitDrag}
          onKeyDown={onSplitKey}
          className={`hidden w-2 shrink-0 cursor-col-resize touch-none items-center justify-center border-x border-white/10 bg-[#0f172a] text-slate-400 transition-colors hover:bg-sky-500/20 hover:text-white ${ring} ${side ? "md:flex" : ""}`}
        >
          <GripVertical size={12} aria-hidden="true" />
        </div>

        {/* Preview */}
        <div className={`flex min-w-0 flex-col border-t border-white/10 ${fullscreen ? "min-h-0 flex-1" : `h-[460px] ${side ? "md:h-auto" : "md:h-[520px]"}`} ${side ? "md:flex-1 md:border-t-0" : ""}`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 bg-[#0f172a] px-3 py-1.5">
            <span className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-600" /><span className="h-2.5 w-2.5 rounded-full bg-slate-600" /><span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
            </span>
            <span className="text-xs font-semibold text-slate-100">Preview</span>
            <span className="text-xs text-slate-400">{sizeLabel}</span>
            <div className="ml-auto flex items-center gap-1.5">
              {device === "custom" && (
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="sr-only">Custom preview width in pixels</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={240}
                    max={2560}
                    value={customWidth}
                    onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) setCustomWidth(next); }}
                    className={`min-h-[44px] w-20 rounded-md border border-white/10 bg-[#0b1120] px-2 text-xs text-slate-100 md:min-h-[30px] ${ring}`}
                  />
                  px
                </label>
              )}
              <div role="group" aria-label="Preview width" className="inline-flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
                {(Object.keys(DEVICES) as Device[]).map((key) => {
                  const Icon = DEVICES[key].icon;
                  return (
                    <button key={key} type="button" className={segment(device === key)} aria-pressed={device === key} aria-label={DEVICES[key].label} title={DEVICES[key].label} onClick={() => setDevice(key)}>
                      <Icon size={14} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={segment(rotated && preset.landscape !== null)}
                aria-pressed={rotated && preset.landscape !== null}
                aria-label="Rotate to landscape"
                title="Rotate to landscape"
                disabled={preset.landscape === null}
                onClick={() => setRotated((value) => !value)}
              >
                <RotateCw size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div ref={paneRef} className={`flex min-h-0 flex-1 justify-center overflow-hidden bg-[#070b14] ${targetWidth === null ? "" : "p-3"}`}>
            {gated ? (
              <div className="m-auto max-w-sm p-6 text-center">
                <Share2 size={22} aria-hidden="true" className="mx-auto mb-3 text-sky-300" />
                <p className="text-sm font-semibold text-white">This code came from a shared link</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">It has not run yet. Check the HTML, CSS and JS tabs first, then run it.</p>
                <button type="button" className={`${runButton} mt-4`} onClick={run}><Play size={13} aria-hidden="true" fill="currentColor" /> Run this code</button>
              </div>
            ) : (
              <div className={`h-full min-h-[280px] overflow-hidden bg-white ${targetWidth === null ? "" : "rounded-lg shadow-[0_0_0_1px_rgba(148,163,184,0.3)]"}`} style={{ width: targetWidth === null ? "100%" : Math.floor(targetWidth * scale) }}>
                <iframe
                  key={runId}
                  ref={frameRef}
                  srcDoc={built.doc}
                  sandbox="allow-scripts allow-modals allow-forms allow-popups"
                  title="Rendered HTML preview"
                  className="block border-0 bg-white"
                  style={scaled
                    ? { width: targetWidth ?? "100%", height: `${100 / scale}%`, minHeight: 280 / scale, transform: `scale(${scale})`, transformOrigin: "top left" }
                    : { width: targetWidth ?? "100%", height: "100%", minHeight: 280 }}
                />
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#0b1120]">
            <div className="flex items-center gap-1 pl-3 pr-2">
              <button
                type="button"
                className={`flex min-h-[44px] flex-1 cursor-pointer items-center gap-2 rounded-md text-left text-xs font-semibold text-slate-100 md:min-h-[36px] ${ring}`}
                aria-expanded={consoleShown}
                aria-controls="html-editor-console"
                onClick={() => setConsoleOpen(!consoleShown)}
              >
                <SquareTerminal size={14} aria-hidden="true" className="text-slate-400" /> Console
                {errorCount > 0 && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-200">{errorCount} {errorCount === 1 ? "error" : "errors"}</span>}
                {warningCount > 0 && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200">{warningCount} {warningCount === 1 ? "warning" : "warnings"}</span>}
                <ChevronDown size={14} aria-hidden="true" className={`ml-auto text-slate-400 transition-transform motion-reduce:transition-none ${consoleShown ? "rotate-180" : ""}`} />
              </button>
              {entries.length > 0 && (
                <button type="button" className={segment(false)} onClick={() => setEntries([])} aria-label="Clear console" title="Clear console">
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>
            <div
              id="html-editor-console"
              role="log"
              aria-label="Preview console"
              tabIndex={0}
              hidden={!consoleShown}
              className={`max-h-40 overflow-auto border-t border-white/10 px-3 py-2 font-mono text-xs leading-relaxed ${ring}`}
            >
              {entries.length === 0 ? (
                <p className="text-slate-400">No output yet. console.log calls, warnings and errors from your code appear here.</p>
              ) : (
                <ul>
                  {entries.map((entry) => (
                    <li key={entry.id} className={`flex items-start gap-2 border-b border-white/5 py-1 last:border-0 ${CONSOLE_TONES[entry.level]}`}>
                      <span className="mt-0.5 w-[13px] shrink-0" aria-hidden="true">
                        {entry.level === "error" ? <CircleX size={13} /> : entry.level === "warn" ? <TriangleAlert size={13} /> : entry.level === "info" ? <Info size={13} /> : null}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words"><span className="sr-only">{CONSOLE_PREFIX[entry.level]}</span>{entry.text}</span>
                      {entry.count > 1 && <span className="shrink-0 rounded-full bg-white/10 px-1.5 text-[11px] text-slate-200">×{entry.count}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 bg-[#0f172a] px-3 py-2 text-xs text-slate-400 ${fullscreen ? "" : "rounded-b-2xl"}`}>
        <span role="status" aria-live="polite" className={`font-medium ${status?.tone === "error" ? "text-red-300" : "text-emerald-300"}`}>{status?.text}</span>
        <span id="html-editor-hint">Tab indents. Press Esc, then Tab, to leave the editor.</span>
        <span className="hidden sm:inline">{mod} Enter runs · {mod} S downloads</span>
        <span className="ml-auto inline-flex items-center gap-1.5"><LockKeyhole size={12} aria-hidden="true" /> Runs in your browser; nothing is uploaded</span>
      </div>
    </section>
  );
}
