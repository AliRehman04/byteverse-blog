"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  readingTime: string | null;
  createdAt: string;
  category: { name: string; color: string } | null;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const navigate = (slug: string) => {
    setOpen(false);
    router.push(`/blog/${slug}`);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-lg border border-border hover:bg-muted transition-colors"
        aria-label="Search"
      >
        <Search size={15} />
        <span className="hidden lg:inline">Search...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="relative mx-auto mt-[15vh] max-w-xl w-[calc(100%-2rem)] animate-fade-in-up">
        <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles..."
              className="flex-1 py-4 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 hover:bg-muted"
            >
              ESC
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Search size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No results found</p>
                <p className="text-xs mt-1">Try a different keyword</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <ul className="py-2">
                {results.map((post) => (
                  <li key={post.id}>
                    <button
                      onClick={() => navigate(post.slug)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                    >
                      {post.coverImage ? (
                        <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                          <Image
                            src={post.coverImage}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                          📝
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {post.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {post.category && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: post.category.color }}
                            >
                              {post.category.name}
                            </span>
                          )}
                          {post.readingTime && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock size={9} />
                              {post.readingTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!loading && query.length < 2 && (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-sm">Type to search articles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
