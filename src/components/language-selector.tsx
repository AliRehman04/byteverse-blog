"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Globe, ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", country: "US", rtl: false },
  { code: "ur", label: "اردو", country: "PK", rtl: true },
  { code: "hi", label: "हिन्दी", country: "IN", rtl: false },
  { code: "ar", label: "العربية", country: "SA", rtl: true },
  { code: "es", label: "Español", country: "ES", rtl: false },
  { code: "zh-CN", label: "中文", country: "CN", rtl: false },
];

const RTL_CODES = new Set(["ur", "ar"]);

function applyDirection(code: string) {
  const html = document.documentElement;
  if (RTL_CODES.has(code)) {
    html.setAttribute("dir", "rtl");
    html.setAttribute("lang", code);
  } else {
    html.setAttribute("dir", "ltr");
    html.setAttribute("lang", code === "zh-CN" ? "zh" : code);
  }
}

export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("en");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Detect existing translation from cookie on mount + preload script
  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/en\/([a-z-]+)/i);
    if (match) {
      const lang = LANGUAGES.find(
        (l) => l.code === match[1] || l.code.toLowerCase() === match[1].toLowerCase()
      );
      if (lang) {
        setCurrent(lang.code);
        applyDirection(lang.code);
      }
    }
    // Preload Google Translate on mount so it's ready when user clicks
    const timer = setTimeout(() => ensureLoaded(), 1000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load Google Translate script
  const ensureLoaded = useCallback(() => {
    if (typeof window === "undefined") return;

    // Already have the widget initialized
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
      setScriptLoaded(true);
      return;
    }

    // Script tag already exists — widget may still be initializing
    if (document.getElementById("google-translate-script")) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).googleTranslateElementInit = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: true,
          includedLanguages: "en,ur,hi,ar,es,zh-CN",
        },
        "google_translate_element"
      );
      setScriptLoaded(true);
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const selectLanguage = (code: string) => {
    setCurrent(code);
    setOpen(false);
    applyDirection(code);

    // Set cookies for Google Translate
    const domain = window.location.hostname;
    if (code === "en") {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain}`;
      window.location.reload();
      return;
    }

    document.cookie = `googtrans=/en/${code}; path=/;`;
    document.cookie = `googtrans=/en/${code}; path=/; domain=.${domain}`;

    // Try to use existing widget first
    const trySelect = () => {
      const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (select) {
        select.value = code;
        select.dispatchEvent(new Event("change"));
        return true;
      }
      return false;
    };

    if (trySelect()) return;

    // Widget not ready — load it, retry, then reload as fallback
    ensureLoaded();
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (trySelect()) {
        clearInterval(interval);
      } else if (attempts > 15) {
        clearInterval(interval);
        // Cookie is set — reload to let Google Translate pick it up
        window.location.reload();
      }
    }, 400);
  };

  const currentLang = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          ensureLoaded();
          setOpen(!open);
        }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        title="Change language"
      >
        <Globe size={16} />
        <span className="hidden sm:inline text-xs font-medium">{currentLang.country}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => selectLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                current === lang.code
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground"
              }`}
              dir={lang.rtl ? "rtl" : "ltr"}
            >
              <span className="text-xs font-bold text-muted-foreground w-6">{lang.country}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Google Translate widget — off-screen but rendered for API to work */}
      <div id="google_translate_element" />
    </div>
  );
}
