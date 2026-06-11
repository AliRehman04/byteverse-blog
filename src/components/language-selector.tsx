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

function hideBanner() {
  // Remove the Google Translate top banner iframe
  const banner = document.querySelector<HTMLIFrameElement>(".goog-te-banner-frame");
  if (banner) banner.style.display = "none";
  // Remove any skiptranslate divs that push content
  document.querySelectorAll<HTMLElement>(".skiptranslate").forEach((el) => {
    if (el.tagName === "DIV" || el.querySelector("iframe")) {
      el.style.display = "none";
      el.style.height = "0";
    }
  });
  // Reset body position Google Translate pushes down
  document.body.style.top = "0px";
  document.body.style.position = "";
  document.body.style.marginTop = "0px";
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
      // Hide banner on page load when already translated
      setTimeout(hideBanner, 500);
      setTimeout(hideBanner, 2000);
      setTimeout(hideBanner, 4000);
    }

    // Watch for Google Translate modifying body.style.top and reset it
    const observer = new MutationObserver(() => {
      if (document.body.style.top && document.body.style.top !== "0px") {
        document.body.style.top = "0px";
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    // Preload Google Translate on mount so it's ready when user clicks
    const timer = setTimeout(() => ensureLoaded(), 1000);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
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
      // First try to restore original via Google Translate widget
      const iframe = document.querySelector<HTMLIFrameElement>(".goog-te-banner-frame");
      if (iframe?.contentDocument) {
        const restoreBtn = iframe.contentDocument.querySelector<HTMLButtonElement>("#\\:1\\.restore, button.goog-close-link, [id$='.restore']");
        if (restoreBtn) restoreBtn.click();
      }
      // Also try the combo box approach
      const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (select) {
        select.value = "en";
        select.dispatchEvent(new Event("change"));
      }
      // Clear all possible googtrans cookie variations
      const expiry = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
      document.cookie = `googtrans=; ${expiry}; path=/;`;
      document.cookie = `googtrans=; ${expiry}; path=/; domain=${domain}`;
      document.cookie = `googtrans=; ${expiry}; path=/; domain=.${domain}`;
      // Also clear the root domain (e.g. byteverse.fyi without www)
      const rootDomain = domain.replace(/^www\./, "");
      if (rootDomain !== domain) {
        document.cookie = `googtrans=; ${expiry}; path=/; domain=.${rootDomain}`;
        document.cookie = `googtrans=; ${expiry}; path=/; domain=${rootDomain}`;
      }
      // Small delay to let widget process, then reload
      setTimeout(() => window.location.reload(), 100);
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
        // Hide banner after a short delay to let it render
        setTimeout(hideBanner, 500);
        setTimeout(hideBanner, 1500);
        setTimeout(hideBanner, 3000);
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
