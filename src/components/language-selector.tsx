"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Globe, ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", short: "EN", rtl: false },
  { code: "ur", label: "Urdu", short: "UR", rtl: true },
  { code: "hi", label: "Hindi", short: "HI", rtl: false },
  { code: "ar", label: "Arabic", short: "AR", rtl: true },
  { code: "es", label: "Español", short: "ES", rtl: false },
  { code: "zh-CN", label: "Chinese", short: "ZH", rtl: false },
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

function saveLanguageCookie(code: string) {
  const domain = window.location.hostname;
  if (code !== "en") {
    document.cookie = `googtrans=/en/${code}; path=/; SameSite=Lax`;
    document.cookie = `googtrans=/en/${code}; path=/; domain=.${domain}; SameSite=Lax`;
    return;
  }
  const expiry = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
  document.cookie = `googtrans=; ${expiry}; path=/;`;
  for (const host of new Set([domain, domain.replace(/^www\./, "")])) {
    document.cookie = `googtrans=; ${expiry}; path=/; domain=${host}`;
    document.cookie = `googtrans=; ${expiry}; path=/; domain=.${host}`;
  }
}

export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("en");
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Only a chosen language (or a saved choice) loads the external translator.
  const ensureLoaded = useCallback(() => {
    if (typeof window === "undefined") return;

    // Already have the widget initialized
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) return;

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
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onerror = () => script.remove();
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-z-]+)/i);
    const language = LANGUAGES.find((item) => item.code.toLowerCase() === match?.[1]?.toLowerCase());
    if (!language || language.code === "en") return;
    queueMicrotask(() => setCurrent(language.code));
    applyDirection(language.code);
    ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    if (current === "en") return;
    const timers = [500, 2000, 4000].map((delay) => setTimeout(hideBanner, delay));
    const observer = new MutationObserver(() => {
      if (document.body.style.top && document.body.style.top !== "0px") document.body.style.top = "0px";
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
    };
  }, [current]);

  const selectLanguage = (code: string) => {
    setOpen(false);
    trigger.current?.focus();
    if (code === current) return;
    setCurrent(code);
    applyDirection(code);
    saveLanguageCookie(code);

    if (code === "en") {
      // Restore via the same-document widget, then reload the original page.
      // Do not inspect a potentially cross-origin translation banner iframe.
      const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (select) {
        select.value = "en";
        select.dispatchEvent(new Event("change"));
      }
      // Small delay to let widget process, then reload
      setTimeout(() => window.location.reload(), 100);
      return;
    }

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
    <div ref={ref} className="relative" onKeyDown={(event) => {
      if (event.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); }
    }}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Change language, current language ${currentLang.label}`}
        aria-expanded={open}
        aria-controls="site-language-options"
        className="flex min-h-9 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        title="Change language"
      >
        <Globe size={16} />
        <span className="hidden sm:inline text-xs font-medium">{currentLang.short}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id="site-language-options" role="group" aria-label="Choose a language" className="absolute top-full right-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              aria-pressed={current === lang.code}
              onClick={() => selectLanguage(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted transition-colors ${
                current === lang.code
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground"
              }`}
            >
              <span className="text-[11px] font-bold text-muted-foreground w-5 shrink-0">{lang.short}</span>
              <span className="truncate">{lang.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Google Translate widget — off-screen but rendered for API to work */}
      <div id="google_translate_element" />
    </div>
  );
}
