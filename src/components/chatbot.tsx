"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MessageCircle, X, Send, ExternalLink, Wrench, Sparkles } from "lucide-react";
import Link from "next/link";

interface ToolResult {
  title: string;
  slug: string;
  excerpt: string;
  type: "tool";
}

interface Message {
  role: "user" | "bot";
  text: string;
  results?: { title: string; slug: string; excerpt: string }[];
  tools?: ToolResult[];
}

const QUICK_SUGGESTIONS = [
  "Best free AI tools?",
  "Plagiarism checker tool",
  "SEO tips for blog",
  "CV builder tool",
  "How to earn from blog?",
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hi! 👋 I'm ByteVerse Bot. I know all about our 35+ free tools and 100+ articles. Ask me anything — in English or Hinglish!",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (overrideQuery?: string) => {
      const q = (overrideQuery || input).trim();
      if (!q || loading) return;

      setInput("");
      setShowSuggestions(false);
      setMessages((prev) => [...prev, { role: "user", text: q }]);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: data.answer || "No answer found.",
            results: data.results,
            tools: data.tools,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: "Something went wrong. Try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading],
  );

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border border-border bg-card flex flex-col overflow-hidden animate-fade-in-up"
          style={{ height: "min(540px, calc(100vh - 8rem))" }}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-linear-to-r from-primary to-violet-600 text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">ByteVerse Bot</p>
              <p className="text-[11px] opacity-80">35+ Tools · 100+ Articles · English & Hinglish</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close chat"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {/* Render text with newlines */}
                  {msg.text.split("\n").map((line, j) => (
                    <p key={j} className={j > 0 ? "mt-1" : ""}>
                      {line}
                    </p>
                  ))}

                  {/* Tool suggestions */}
                  {msg.tools && msg.tools.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-border/30 pt-2">
                      <p className="text-[11px] font-semibold opacity-70 uppercase flex items-center gap-1">
                        <Wrench size={10} /> Recommended Tools
                      </p>
                      {msg.tools.map((t) => (
                        <Link
                          key={t.slug}
                          href={`/${t.slug}`}
                          className="flex items-start gap-2 py-1.5 px-2 rounded-lg text-xs hover:bg-background/50 transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          <Wrench
                            size={10}
                            className="mt-0.5 shrink-0 text-violet-500"
                          />
                          <div>
                            <span className="font-semibold text-foreground">
                              {t.title}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              — {t.excerpt.slice(0, 60)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Related articles */}
                  {msg.results && msg.results.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-border/30 pt-2">
                      <p className="text-[11px] font-semibold opacity-70 uppercase flex items-center gap-1">
                        <ExternalLink size={10} /> Related Articles
                      </p>
                      {msg.results.map((r) => (
                        <Link
                          key={r.slug}
                          href={`/blog/${r.slug}`}
                          className="flex items-start gap-2 py-1.5 px-2 rounded-lg text-xs hover:bg-background/50 transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          <ExternalLink
                            size={10}
                            className="mt-0.5 shrink-0 opacity-60"
                          />
                          <span className="font-medium underline underline-offset-2">
                            {r.title}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Quick Suggestions */}
            {showSuggestions && messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 border-t border-border flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything... (English / Hinglish)"
              className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
