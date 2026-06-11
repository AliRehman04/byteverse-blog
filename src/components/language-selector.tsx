"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", country: "US" },
  { code: "ur", label: "اردو", country: "PK" },
  { code: "hi", label: "हिन्दी", country: "IN" },
  { code: "ar", label: "العربية", country: "SA" },
  { code: "es", label: "Español", country: "ES" },
  { code: "zh-CN", label: "中文", country: "CN" },
];

/**
 * Language selector using Google Translate widget API.
 * Lazy-loads the script on first dropdown open for performance.
 */
export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("en");
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Detect existing translation from cookie
  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/en\/([a-z-]+)/i);
    if (match) {
      const lang = LANGUAGES.find(
        (l) => l.code === match[1] || l.code.toLowerCase() === match[1].toLowerCase()
      );
      if (lang) setCurrent(lang.code);
    }
  }, []);

  // Load Google Translate script on first dropdown open
  const ensureLoaded = () => {
    if (loaded || typeof window === "undefined") return;
    if (document.getElementById("google-translate-script")) {
      setLoaded(true);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).googleTranslateElementInit = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: false,
          includedLanguages: "en,ur,hi,ar,es,zh-CN",
        },
        "google_translate_element"
      );
      setLoaded(true);
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  };

  const selectLanguage = (code: string) => {
    setCurrent(code);
    setOpen(false);

    if (code === "en") {
      // Remove translation — clear cookies and reload
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." +
        window.location.hostname;
      window.location.reload();
      return;
    }

    // Try the Google Translate combo select
    const trySelect = () => {
      const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (select) {
        select.value = code;
        select.dispatchEvent(new Event("change"));
        return true;
      }
      return false;
    };

    if (!trySelect()) {
      // Widget not ready yet — retry with interval
      const interval = setInterval(() => {
        if (trySelect()) clearInterval(interval);
      }, 300);
      setTimeout(() => clearInterval(interval), 5000);
    }
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
            >
              <span className="text-xs font-bold text-muted-foreground w-6">{lang.country}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hidden Google Translate element */}
      <div id="google_translate_element" className="!hidden" />
    </div>
  );
}
