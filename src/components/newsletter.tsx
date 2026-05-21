"use client";

import { useState } from "react";
import { Mail, CheckCircle, Loader2 } from "lucide-react";

export function Newsletter({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

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
        setMessage("You're subscribed! Thanks for joining.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (compact) {
    return (
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)] mb-2">
          <Mail size={16} className="text-primary" />
          Weekly Digest
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Best articles delivered weekly. No spam.
        </p>

        {status === "success" ? (
          <div className="flex items-center gap-2 text-green-600 text-sm animate-fade-in">
            <CheckCircle size={16} />
            <span className="font-medium">Subscribed!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              aria-label="Email address"
              className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Subscribe"
              )}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-2 text-xs text-red-500">{message}</p>
        )}
      </div>
    );
  }

  return (
    <section className="relative rounded-2xl overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="relative border border-border rounded-2xl p-8 md:p-12">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-5">
            <Mail size={22} className="text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Stay Updated</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            New guides and tool reviews, straight to your inbox. No spam —
            just useful stuff, once a week.
          </p>

          {status === "success" ? (
            <div className="flex items-center justify-center gap-2 text-green-600 animate-fade-in">
              <CheckCircle size={20} />
              <span className="font-medium">{message}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email address"
                className="flex-1 px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 btn-shimmer"
              >
                {status === "loading" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Subscribe"
                )}
              </button>
            </form>
          )}

          {status === "error" && (
            <p className="mt-3 text-sm text-red-500">{message}</p>
          )}
        </div>
      </div>
    </section>
  );
}
