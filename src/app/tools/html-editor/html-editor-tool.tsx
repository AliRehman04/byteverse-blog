"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Copy, Download, RotateCcw, Maximize2, Minimize2,
  Columns, Rows, Check, Smartphone, Monitor, Tablet, Play, TriangleAlert, LockKeyhole,
} from "lucide-react";

/* ── Templates ────────────────────────────────────────── */
const TEMPLATES: Record<string, { label: string; code: string }> = {
  starter: {
    label: "Starter Page",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      padding: 2rem;
      background: #fafafa;
    }
    h1 { color: #e94560; margin-bottom: 0.5rem; }
    p { color: #555; max-width: 600px; }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Start editing this HTML to see live changes in the preview panel. You can add any HTML, CSS, and JavaScript.</p>
</body>
</html>`,
  },
  card: {
    label: "Profile Card",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 320px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .avatar {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f093fb, #f5576c);
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: white;
    }
    .card h2 { font-size: 1.3rem; color: #1a1a2e; }
    .card p { color: #888; font-size: 0.9rem; margin: 0.3rem 0 1.2rem; }
    .stats {
      display: flex;
      justify-content: space-around;
      border-top: 1px solid #eee;
      padding-top: 1rem;
    }
    .stats div { text-align: center; }
    .stats strong { display: block; color: #1a1a2e; font-size: 1.1rem; }
    .stats span { font-size: 0.75rem; color: #aaa; text-transform: uppercase; }
    .btn {
      display: inline-block;
      margin-top: 1.2rem;
      padding: 0.6rem 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 0.9rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="avatar">JD</div>
    <h2>Jane Doe</h2>
    <p>Full-Stack Developer</p>
    <div class="stats">
      <div><strong>142</strong><span>Projects</span></div>
      <div><strong>8.5k</strong><span>Followers</span></div>
      <div><strong>320</strong><span>Following</span></div>
    </div>
    <button class="btn">Follow</button>
  </div>
</body>
</html>`,
  },
  form: {
    label: "Contact Form",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f4f8;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    .form-container {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      width: 400px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    h2 { margin-bottom: 0.3rem; color: #1a1a2e; }
    .subtitle { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .field { margin-bottom: 1rem; }
    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.3rem;
    }
    input, textarea {
      width: 100%;
      padding: 0.65rem 0.8rem;
      border: 1.5px solid #ddd;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: inherit;
      transition: border 0.2s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
    }
    textarea { resize: vertical; min-height: 100px; }
    .btn {
      width: 100%;
      padding: 0.75rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #5a6fd6; }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>Get in Touch</h2>
    <p class="subtitle">We'd love to hear from you</p>
    <form onsubmit="event.preventDefault(); alert('Message sent!')">
      <div class="field">
        <label for="name">Full Name</label>
        <input type="text" id="name" placeholder="John Doe" required>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input type="email" id="email" placeholder="john@example.com" required>
      </div>
      <div class="field">
        <label for="msg">Message</label>
        <textarea id="msg" placeholder="Your message..." required></textarea>
      </div>
      <button type="submit" class="btn">Send Message</button>
    </form>
  </div>
</body>
</html>`,
  },
  grid: {
    label: "CSS Grid Gallery",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #111;
      padding: 1.5rem;
    }
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      max-width: 800px;
      margin: 0 auto;
    }
    .item {
      aspect-ratio: 1;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      transition: transform 0.3s;
    }
    .item:hover { transform: scale(1.03); }
    .item:nth-child(1) { background: linear-gradient(135deg, #f093fb, #f5576c); }
    .item:nth-child(2) { background: linear-gradient(135deg, #4facfe, #00f2fe); }
    .item:nth-child(3) { background: linear-gradient(135deg, #43e97b, #38f9d7); }
    .item:nth-child(4) { background: linear-gradient(135deg, #fa709a, #fee140); }
    .item:nth-child(5) { background: linear-gradient(135deg, #a18cd1, #fbc2eb); }
    .item:nth-child(6) { background: linear-gradient(135deg, #fccb90, #d57eeb); }
    .item:nth-child(7) { background: linear-gradient(135deg, #667eea, #764ba2); }
    .item:nth-child(8) { background: linear-gradient(135deg, #ff9a9e, #fecfef); }
    .label {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0.8rem;
      background: rgba(0,0,0,0.5);
      color: white;
      font-size: 0.85rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>CSS Grid Gallery</h1>
  <div class="gallery">
    <div class="item"><div class="label">Sunset</div></div>
    <div class="item"><div class="label">Ocean</div></div>
    <div class="item"><div class="label">Forest</div></div>
    <div class="item"><div class="label">Desert</div></div>
    <div class="item"><div class="label">Mountains</div></div>
    <div class="item"><div class="label">Aurora</div></div>
    <div class="item"><div class="label">Galaxy</div></div>
    <div class="item"><div class="label">Clouds</div></div>
  </div>
</body>
</html>`,
  },
  navbar: {
    label: "Responsive Navbar",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #fafafa; }
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.8rem 2rem;
      background: white;
      box-shadow: 0 1px 8px rgba(0,0,0,0.08);
      position: sticky;
      top: 0;
    }
    .logo {
      font-size: 1.3rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-links { display: flex; gap: 1.5rem; list-style: none; }
    .nav-links a {
      text-decoration: none;
      color: #555;
      font-weight: 500;
      font-size: 0.95rem;
      transition: color 0.2s;
    }
    .nav-links a:hover { color: #667eea; }
    .cta {
      padding: 0.5rem 1.2rem;
      background: #667eea;
      color: white !important;
      border-radius: 6px;
      -webkit-text-fill-color: white;
    }
    .hero {
      text-align: center;
      padding: 5rem 2rem;
    }
    .hero h1 { font-size: 2.5rem; color: #1a1a2e; margin-bottom: 0.8rem; }
    .hero p { color: #888; font-size: 1.1rem; max-width: 500px; margin: 0 auto; }
  </style>
</head>
<body>
  <nav>
    <div class="logo">Brand</div>
    <ul class="nav-links">
      <li><a href="#">Home</a></li>
      <li><a href="#">Features</a></li>
      <li><a href="#">Pricing</a></li>
      <li><a href="#" class="cta">Get Started</a></li>
    </ul>
  </nav>
  <div class="hero">
    <h1>Build Something Amazing</h1>
    <p>A beautiful responsive navbar built with pure HTML and CSS. No JavaScript needed.</p>
  </div>
</body>
</html>`,
  },
  animation: {
    label: "CSS Animation",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0f0f23;
      font-family: 'Segoe UI', system-ui, sans-serif;
      overflow: hidden;
    }
    .loader {
      display: flex;
      gap: 8px;
      margin-bottom: 2rem;
    }
    .loader span {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      animation: bounce 1.4s ease-in-out infinite;
    }
    .loader span:nth-child(1) { background: #f5576c; animation-delay: 0s; }
    .loader span:nth-child(2) { background: #ffd93d; animation-delay: 0.15s; }
    .loader span:nth-child(3) { background: #6bcb77; animation-delay: 0.3s; }
    .loader span:nth-child(4) { background: #4d96ff; animation-delay: 0.45s; }
    .loader span:nth-child(5) { background: #a855f7; animation-delay: 0.6s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.2); opacity: 1; }
    }

    .text {
      color: white;
      font-size: 1.5rem;
      font-weight: 300;
      letter-spacing: 0.5em;
      text-transform: uppercase;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .ring {
      width: 120px;
      height: 120px;
      border: 3px solid transparent;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1.5s linear infinite;
      margin-bottom: 2rem;
      position: relative;
    }
    .ring::before {
      content: '';
      position: absolute;
      inset: 6px;
      border: 3px solid transparent;
      border-top-color: #f5576c;
      border-radius: 50%;
      animation: spin 1s linear reverse infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="ring"></div>
  <div class="loader">
    <span></span><span></span><span></span><span></span><span></span>
  </div>
  <div class="text">Loading</div>
</body>
</html>`,
  },
  landing: {
    label: "Mini Landing Page",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; }
    .hero {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
    }
    .hero h1 { font-size: 2.5rem; margin-bottom: 0.8rem; }
    .hero p { font-size: 1.1rem; opacity: 0.9; max-width: 500px; margin: 0 auto 1.5rem; }
    .hero-btn {
      display: inline-block;
      padding: 0.8rem 2rem;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 1rem;
      transition: transform 0.2s;
    }
    .hero-btn:hover { transform: translateY(-2px); }
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      max-width: 800px;
      margin: -3rem auto 3rem;
      padding: 0 1.5rem;
    }
    .feature {
      background: white;
      padding: 1.8rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      text-align: center;
    }
    .feature .icon { font-size: 2rem; margin-bottom: 0.8rem; }
    .feature h3 { margin-bottom: 0.4rem; font-size: 1rem; }
    .feature p { font-size: 0.85rem; color: #666; line-height: 1.5; }
    footer {
      text-align: center;
      padding: 1.5rem;
      background: #f8f9fa;
      color: #888;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="hero">
    <div>
      <h1>Ship Faster</h1>
      <p>Build beautiful web experiences with clean HTML and CSS. No frameworks, no build tools, just code.</p>
      <a href="#features" class="hero-btn">Explore Features</a>
    </div>
  </div>
  <div class="features" id="features">
    <div class="feature">
      <div class="icon">\u26A1</div>
      <h3>Lightning Fast</h3>
      <p>Zero dependencies means instant load times.</p>
    </div>
    <div class="feature">
      <div class="icon">\uD83C\uDFA8</div>
      <h3>Beautiful Design</h3>
      <p>Modern gradients and clean typography.</p>
    </div>
    <div class="feature">
      <div class="icon">\uD83D\uDD12</div>
      <h3>Secure by Default</h3>
      <p>No external requests, fully self-contained.</p>
    </div>
  </div>
  <footer>&copy; 2026 MyApp. Built with HTML &amp; CSS.</footer>
</body>
</html>`,
  },
};

const DEFAULT_CODE = TEMPLATES.starter.code;
const STORAGE_KEY = "byteverse.html-editor.v1";
const PREVIEW_WIDTHS = {
  desktop: { label: "Desktop", width: "100%" as const, hint: "Full width" },
  tablet: { label: "Tablet", width: 768, hint: "768px" },
  phone: { label: "Phone", width: 375, hint: "375px" },
};
type PreviewWidth = keyof typeof PREVIEW_WIDTHS;
type PreviewError = { id: number; message: string };

// Injected on the same line as <head> so reported line numbers still match the editor.
const CAPTURE_SCRIPT = '<script data-byteverse-preview>(function(){var send=function(kind,message){try{parent.postMessage({byteversePreview:true,kind:kind,message:String(message).slice(0,500)},"*")}catch(e){}};window.addEventListener("error",function(e){send("error",(e.message||"Script error")+(e.lineno?" (line "+e.lineno+")":""))});window.addEventListener("unhandledrejection",function(e){var r=e.reason;send("error","Unhandled promise rejection: "+(r&&r.message?r.message:r))});var original=console.error;console.error=function(){send("error",Array.prototype.map.call(arguments,function(a){if(typeof a==="string")return a;try{return JSON.stringify(a)}catch(_){return String(a)}}).join(" "));original.apply(console,arguments)}})()</script>';

function withErrorCapture(code: string) {
  const head = code.match(/<head[^>]*>/i);
  if (head?.index !== undefined) return code.slice(0, head.index + head[0].length) + CAPTURE_SCRIPT + code.slice(head.index + head[0].length);
  const html = code.match(/<html[^>]*>/i);
  if (html?.index !== undefined) return code.slice(0, html.index + html[0].length) + CAPTURE_SCRIPT + code.slice(html.index + html[0].length);
  return CAPTURE_SCRIPT + code;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

const toolButton = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground min-h-[44px] sm:min-h-[34px] hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed";
const segment = (active: boolean) => `inline-flex items-center gap-1.5 rounded-md px-2.5 min-h-[44px] sm:min-h-[30px] text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;

/* ── Main Component ───────────────────────────────────── */
export function HtmlEditorTool() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [previewCode, setPreviewCode] = useState(DEFAULT_CODE);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [layout, setLayout] = useState<"side" | "stacked">("side");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [template, setTemplate] = useState("starter");
  const [draft, setDraft] = useState<string | null>(null);
  const [errors, setErrors] = useState<PreviewError[]>([]);
  const [hint, setHint] = useState("Tab inserts two spaces. Press Esc, then Tab, to leave the editor.");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineCountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const tabCapture = useRef(true);
  const errorId = useRef(0);
  const [paneWidth, setPaneWidth] = useState(0);

  const lines = code.split("\n");
  const lineCount = lines.length;
  const charCount = code.length;
  const dirty = code !== previewCode;

  // Restore banner: offer the last session instead of silently replacing the default template.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved !== DEFAULT_CODE) setDraft(saved);
      } catch { /* storage unavailable */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Autosave once the restore decision is made; the default template is never stored.
  useEffect(() => {
    if (draft !== null) return;
    const timer = setTimeout(() => {
      try {
        if (code === DEFAULT_CODE) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, code);
      } catch { /* storage unavailable */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [code, draft]);

  // Debounced live preview. Errors belong to one render, so they are cleared with each new document.
  const publish = useCallback((next: string) => { setPreviewCode(next); setErrors([]); }, []);
  useEffect(() => {
    if (!autoUpdate) return;
    const timer = setTimeout(() => publish(code), 150);
    return () => clearTimeout(timer);
  }, [code, autoUpdate, publish]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { byteversePreview?: boolean; message?: unknown } | null;
      if (!data || data.byteversePreview !== true || typeof data.message !== "string") return;
      const message = data.message;
      setErrors((list) => [...list.slice(-19), { id: ++errorId.current, message }]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Fixed preview widths wider than the pane are scaled down so the whole viewport stays visible.
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
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
      if (event.key !== "Escape") return;
      if (document.activeElement === editorRef.current && tabCapture.current) return;
      setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [fullscreen]);

  const handleScroll = useCallback(() => {
    if (editorRef.current && lineCountRef.current) lineCountRef.current.scrollTop = editorRef.current.scrollTop;
  }, []);

  const run = useCallback(() => publish(code), [code, publish]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "index.html";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [code]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = event.ctrlKey || event.metaKey;
    if (event.key === "Escape" && tabCapture.current) {
      event.preventDefault();
      tabCapture.current = false;
      setHint("Tab now moves focus. Click or type in the editor to make Tab indent again.");
      return;
    }
    if (mod && event.key === "Enter") { event.preventDefault(); run(); return; }
    if (mod && event.key.toLowerCase() === "s") { event.preventDefault(); handleDownload(); return; }
    if (event.key === "Tab" && !event.shiftKey && tabCapture.current) {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      setCode(code.substring(0, start) + "  " + code.substring(end));
      requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + 2; });
    }
  }, [code, handleDownload, run]);

  const reenableTab = useCallback(() => {
    if (tabCapture.current) return;
    tabCapture.current = true;
    setHint("Tab inserts two spaces. Press Esc, then Tab, to leave the editor.");
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }, [code]);

  const handleTemplate = useCallback((key: string) => {
    setTemplate(key);
    setCode(TEMPLATES[key].code);
    if (!autoUpdate) publish(TEMPLATES[key].code);
  }, [autoUpdate, publish]);

  const handleReset = useCallback(() => {
    setTemplate("starter");
    setCode(DEFAULT_CODE);
    publish(DEFAULT_CODE);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  }, [publish]);

  const restoreDraft = useCallback(() => {
    if (draft === null) return;
    setCode(draft);
    publish(draft);
    setDraft(null);
  }, [draft, publish]);

  const discardDraft = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    setDraft(null);
  }, []);

  const side = layout === "side";
  const width = PREVIEW_WIDTHS[previewWidth];
  const targetWidth = typeof width.width === "number" ? width.width : null;
  const scale = targetWidth !== null && paneWidth > 0 && targetWidth > paneWidth ? paneWidth / targetWidth : 1;
  const scaled = scale < 1;

  return (
    <section
      id="html-editor"
      aria-label="Live HTML editor"
      className={fullscreen ? "fixed inset-0 z-[70] flex flex-col bg-background p-3 sm:p-4" : "scroll-mt-20"}
      data-fullscreen={fullscreen || undefined}
    >
      {draft !== null && (
        <div role="region" aria-label="Restore last session" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="flex-1 min-w-[12rem]">You have unsaved work from your last visit in this browser.</span>
          <button type="button" className={`${toolButton} bg-primary text-primary-foreground border-primary hover:bg-primary/90`} onClick={restoreDraft}>Restore it</button>
          <button type="button" className={toolButton} onClick={discardDraft}>Start fresh</button>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────── */}
      <div role="toolbar" aria-label="Editor controls" className="flex flex-wrap items-center gap-2 mb-3">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Template</span>
          <select
            value={template}
            onChange={(event) => handleTemplate(event.target.value)}
            aria-label="Template"
            className="rounded-lg border border-border bg-card px-3 min-h-[44px] sm:min-h-[34px] text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {Object.entries(TEMPLATES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>

        <div className="hidden md:inline-flex items-center gap-1 rounded-lg bg-muted p-0.5" role="group" aria-label="Layout">
          <button type="button" className={segment(side)} aria-pressed={side} onClick={() => setLayout("side")}><Columns size={14} aria-hidden="true" /> Side by side</button>
          <button type="button" className={segment(!side)} aria-pressed={!side} onClick={() => setLayout("stacked")}><Rows size={14} aria-hidden="true" /> Stacked</button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-0.5" role="group" aria-label="Preview width">
          <button type="button" className={segment(previewWidth === "desktop")} aria-pressed={previewWidth === "desktop"} onClick={() => setPreviewWidth("desktop")}><Monitor size={14} aria-hidden="true" /> Desktop</button>
          <button type="button" className={segment(previewWidth === "tablet")} aria-pressed={previewWidth === "tablet"} onClick={() => setPreviewWidth("tablet")}><Tablet size={14} aria-hidden="true" /> 768</button>
          <button type="button" className={segment(previewWidth === "phone")} aria-pressed={previewWidth === "phone"} onClick={() => setPreviewWidth("phone")}><Smartphone size={14} aria-hidden="true" /> 375</button>
        </div>

        <div className="flex-1" />

        <label className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground min-h-[44px] sm:min-h-[34px] cursor-pointer select-none">
          <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={autoUpdate} onChange={(event) => { setAutoUpdate(event.target.checked); if (event.target.checked) publish(code); }} />
          Auto-update
        </label>
        {!autoUpdate && (
          <button type="button" className={`${toolButton} bg-primary text-primary-foreground border-primary hover:bg-primary/90`} onClick={run} disabled={!dirty} title={`Run (${MOD} Enter)`}>
            <Play size={13} aria-hidden="true" /> Run
          </button>
        )}
        <button type="button" className={toolButton} onClick={handleCopy}>
          {copied ? <><Check size={13} aria-hidden="true" className="text-emerald-600" /> Copied</> : <><Copy size={13} aria-hidden="true" /> Copy</>}
        </button>
        <button type="button" className={toolButton} onClick={handleDownload} title={`Download index.html (${MOD} S)`}>
          <Download size={13} aria-hidden="true" /> Download
        </button>
        <button type="button" className={toolButton} onClick={handleReset}>
          <RotateCcw size={13} aria-hidden="true" /> Reset
        </button>
        <button
          ref={fullscreenButtonRef}
          type="button"
          className={toolButton}
          aria-pressed={fullscreen}
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
          onClick={() => setFullscreen((value) => !value)}
        >
          {fullscreen ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
          <span className="hidden sm:inline">{fullscreen ? "Exit" : "Full screen"}</span>
        </button>
      </div>

      {/* ── Editor + Preview ───────────────────────── */}
      <div
        className={`grid gap-3 ${side ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} ${fullscreen ? "flex-1 min-h-0" : ""}`}
        style={fullscreen ? undefined : { minHeight: side ? 560 : 820 }}
      >
        {/* Code editor */}
        <div className={`flex flex-col overflow-hidden rounded-xl border border-border bg-[#1e1e2e] ${fullscreen ? "min-h-0" : "min-h-[320px] md:min-h-0"}`} style={fullscreen ? undefined : { height: side ? undefined : 420 }}>
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/10">
            <span className="text-[11px] font-mono text-gray-300" id="html-editor-label">index.html</span>
            <span className="text-[11px] text-gray-400" aria-hidden="true">{lineCount} lines · {charCount} chars</span>
          </div>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div ref={lineCountRef} aria-hidden="true" className="w-10 sm:w-12 shrink-0 overflow-hidden bg-[#16161e] pt-3 pb-3 pr-2 text-right font-mono text-[13px] leading-[1.6] text-gray-400 select-none">
              {lines.map((_, index) => <div key={index}>{index + 1}</div>)}
            </div>
            <textarea
              ref={editorRef}
              value={code}
              onChange={(event) => { reenableTab(); setCode(event.target.value); }}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              onFocus={reenableTab}
              onPointerDown={reenableTab}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              aria-label="HTML source"
              aria-describedby="html-editor-hint"
              className="flex-1 resize-none overflow-auto bg-transparent p-3 font-mono text-[13px] leading-[1.6] text-gray-100 outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--primary)]"
              style={{ tabSize: 2, whiteSpace: "pre" }}
            />
          </div>
        </div>

        {/* Preview */}
        <div className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card ${fullscreen ? "min-h-0" : "min-h-[360px] md:min-h-0"}`} style={fullscreen ? undefined : { height: side ? undefined : 400 }}>
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Live preview</span>
            <span className="text-[11px] text-muted-foreground">{width.hint}{scaled ? ` · scaled to ${Math.round(scale * 100)}%` : ""}{!autoUpdate && dirty ? " · changes not run yet" : ""}</span>
          </div>
          <div ref={paneRef} className="flex flex-1 justify-center overflow-hidden bg-neutral-200/60 dark:bg-neutral-800/60 min-h-0">
            <div className="h-full min-h-[320px] overflow-hidden" style={{ width: targetWidth === null ? "100%" : Math.floor(targetWidth * scale) }}>
              <iframe
                ref={frameRef}
                srcDoc={withErrorCapture(previewCode)}
                sandbox="allow-scripts allow-modals allow-forms allow-popups"
                title="Rendered HTML preview"
                className="block border-0 bg-white"
                style={scaled
                  ? { width: targetWidth ?? "100%", height: `${100 / scale}%`, minHeight: 320 / scale, transform: `scale(${scale})`, transformOrigin: "top left" }
                  : { width: targetWidth ?? "100%", height: "100%", minHeight: 320 }}
              />
            </div>
          </div>
          {errors.length > 0 && (
            <div role="status" aria-live="polite" className="border-t border-border bg-card px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1.5"><TriangleAlert size={13} aria-hidden="true" /> {errors.length} preview error{errors.length === 1 ? "" : "s"}</span>
                <button type="button" className="px-2 text-muted-foreground hover:text-foreground underline underline-offset-2 min-h-[44px] sm:min-h-[28px]" onClick={() => setErrors([])}>Clear</button>
              </div>
              <ul className="mt-1 max-h-24 overflow-auto font-mono text-[11px] leading-relaxed text-foreground">
                {errors.map((error) => <li key={error.id}>{error.message}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      <p id="html-editor-hint" role="status" className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>{hint}</span>
        <span className="hidden sm:inline">{MOD} Enter runs · {MOD} S downloads</span>
        <span className="ml-auto inline-flex items-center gap-1"><LockKeyhole size={11} aria-hidden="true" /> Runs in your browser; nothing is uploaded</span>
      </p>
    </section>
  );
}
