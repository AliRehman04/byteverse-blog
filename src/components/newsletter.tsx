"use client";

import { useState } from "react";
import { Mail, CheckCircle, Loader2, Sparkles } from "lucide-react";

export function Newsletter() {
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
        setMessage("You're subscribed! Check your inbox.");
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

  return (
    <section className="relative overflow-hidden rounded-3xl glass-strong p-8 md:p-14">
      {/* Orbs */}
      <div className="orb w-72 h-72 bg-violet-500/15 -top-36 -right-36" />
      <div className="orb w-56 h-56 bg-pink-500/10 -bottom-28 -left-28" style={{ animationDelay: "-10s" }} />

      <div className="relative z-10 max-w-xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary text-sm font-semibold mb-6">
          <Sparkles size={14} className="animate-pulse" />
          Newsletter
        </div>

        <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          Stay <span className="gradient-text">Updated</span>
        </h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
          Get the latest AI tools, tech guides, and productivity tips delivered
          to your inbox. No spam, unsubscribe anytime.
        </p>

        {status === "success" ? (
          <div className="flex items-center justify-center gap-2 text-green-500 animate-fade-in">
            <CheckCircle size={20} />
            <span className="font-medium">{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow placeholder:text-muted-foreground/60"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-7 py-3.5 gradient-bg text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 glow-sm"
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
          <p className="mt-4 text-sm text-red-500 font-medium">{message}</p>
        )}
      </div>
    </section>
  );
}
