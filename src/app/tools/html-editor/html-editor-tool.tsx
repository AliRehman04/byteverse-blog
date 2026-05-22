"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Copy, Download, RotateCcw, Maximize2, Minimize2,
  Columns, Rows, Check, ChevronDown, Smartphone, Monitor,
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

/* ── Main Component ───────────────────────────────────── */
export function HtmlEditorTool() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [layout, setLayout] = useState<"horizontal" | "vertical">("horizontal");
  const [previewWidth, setPreviewWidth] = useState<"full" | "mobile">("full");
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineCountRef = useRef<HTMLDivElement>(null);

  const lines = code.split("\n");
  const charCount = code.length;
  const lineCount = lines.length;

  // Sync scroll between line numbers and textarea
  const handleScroll = useCallback(() => {
    if (editorRef.current && lineCountRef.current) {
      lineCountRef.current.scrollTop = editorRef.current.scrollTop;
    }
  }, []);

  // Close template dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) {
        setTemplateOpen(false);
      }
    }
    if (templateOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [templateOpen]);

  // Handle tab key in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  }, [code]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  }, [code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
  }, [code]);

  const handleTemplate = useCallback((key: string) => {
    setCode(TEMPLATES[key].code);
    setTemplateOpen(false);
  }, []);

  const isHoriz = layout === "horizontal";

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background flex flex-col" : ""}>
      {/* ── Toolbar ────────────────────────────────── */}
      <div className={`flex flex-wrap items-center gap-2 mb-3 ${fullscreen ? "px-4 pt-4" : ""}`}>
        {/* Templates dropdown */}
        <div className="relative" ref={templateRef}>
          <button
            onClick={() => setTemplateOpen(!templateOpen)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            Templates <ChevronDown size={12} />
          </button>
          {templateOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
              {Object.entries(TEMPLATES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => handleTemplate(key)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* Layout toggle */}
        <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setLayout("horizontal")}
            className={`p-1.5 rounded-md transition-colors ${isHoriz ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
            title="Side by side"
          >
            <Columns size={14} />
          </button>
          <button
            onClick={() => setLayout("vertical")}
            className={`p-1.5 rounded-md transition-colors ${!isHoriz ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
            title="Stacked"
          >
            <Rows size={14} />
          </button>
        </div>

        {/* Preview width toggle */}
        <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setPreviewWidth("full")}
            className={`p-1.5 rounded-md transition-colors ${previewWidth === "full" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
            title="Desktop preview"
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => setPreviewWidth("mobile")}
            className={`p-1.5 rounded-md transition-colors ${previewWidth === "mobile" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
            title="Mobile preview (375px)"
          >
            <Smartphone size={14} />
          </button>
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
        >
          {copied ? <><Check size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
        >
          <Download size={12} /> Download
        </button>
        <button
          onClick={() => setCode(DEFAULT_CODE)}
          className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* ── Editor + Preview ───────────────────────── */}
      <div className={`flex-1 grid gap-3 ${isHoriz ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} ${fullscreen ? "px-4 pb-4 min-h-0" : ""}`}
        style={fullscreen ? { height: "calc(100% - 60px)" } : { minHeight: isHoriz ? 600 : 800 }}
      >
        {/* Code Editor */}
        <div className="bg-[#1e1e2e] rounded-xl overflow-hidden flex flex-col border border-border">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-[11px] text-gray-400 font-mono">index.html</span>
            <span className="text-[11px] text-gray-500">{lineCount} lines &middot; {charCount} chars</span>
          </div>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Line numbers */}
            <div
              ref={lineCountRef}
              className="w-10 sm:w-12 flex-shrink-0 overflow-hidden text-right pr-2 pt-3 pb-3 select-none bg-[#16161e]"
              style={{ lineHeight: "1.6", fontSize: "13px" }}
            >
              {lines.map((_, i) => (
                <div key={i} className="text-gray-600 font-mono">{i + 1}</div>
              ))}
            </div>
            {/* Textarea */}
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 bg-transparent text-gray-200 font-mono text-[13px] leading-[1.6] p-3 resize-none outline-none overflow-auto"
              style={{ tabSize: 2 }}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-card rounded-xl overflow-hidden flex flex-col border border-border">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Live Preview</span>
            <span className="text-[11px] text-muted-foreground">
              {previewWidth === "mobile" ? "375px" : "100%"}
            </span>
          </div>
          <div className="flex-1 bg-white flex justify-center overflow-auto" style={{ minHeight: isHoriz ? 0 : 400 }}>
            <iframe
              srcDoc={code}
              sandbox="allow-scripts"
              title="HTML Preview"
              className="border-0 h-full bg-white"
              style={{
                width: previewWidth === "mobile" ? 375 : "100%",
                maxWidth: "100%",
                minHeight: isHoriz ? "100%" : 400,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
