"use client";

import { useState, useEffect } from "react";
import { X, Mail, CheckCircle, Loader2 } from "lucide-react";

export function NewsletterPopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Don't show if already dismissed or subscribed
    if (localStorage.getItem("newsletter-dismissed")) return;

    const onScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 40) {
        setShow(true);
        window.removeEventListener("scroll", onScroll);
      }
    };

    // Delay listener to not show on quick visits
    const timer = setTimeout(() => {
      window.addEventListener("scroll", onScroll, { passive: true });
    }, 5000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    // Honeypot - if filled, silently succeed (bot)
    if (hp) {
      setStatus("success");
      setMessage("You're in! Check your inbox.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("You're in! Check your inbox.");
        localStorage.setItem("newsletter-dismissed", "subscribed");
        setTimeout(() => setShow(false), 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 animate-fade-in-up">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {status === "success" ? (
          <div className="text-center py-4">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
            <p className="text-lg font-bold text-foreground">{message}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Stay Updated</h3>
                <p className="text-xs text-muted-foreground">Join 500+ developers</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Get the best articles on AI, coding, and tech delivered to your inbox weekly. No spam, unsubscribe anytime.
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="absolute opacity-0 -z-10" aria-hidden="true" tabIndex={-1}>
                <input type="text" value={hp} onChange={e => setHp(e.target.value)} autoComplete="off" tabIndex={-1} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : "Subscribe"}
              </button>
            </form>
            {status === "error" && (
              <p className="text-xs text-red-500 mt-2">{message}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
