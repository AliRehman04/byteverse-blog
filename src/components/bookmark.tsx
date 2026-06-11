"use client";

import { useState, useEffect, useCallback } from "react";
import { Bookmark, BookmarkCheck, X, ExternalLink } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "byteverse-bookmarks";

interface BookmarkItem {
  slug: string;
  title: string;
  savedAt: number;
}

function getBookmarks(): BookmarkItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBookmarks(items: BookmarkItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Bookmark toggle button for blog post pages */
export function BookmarkButton({ slug, title }: { slug: string; title: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getBookmarks().some((b) => b.slug === slug));
  }, [slug]);

  const toggle = useCallback(() => {
    const bookmarks = getBookmarks();
    const exists = bookmarks.findIndex((b) => b.slug === slug);
    if (exists >= 0) {
      bookmarks.splice(exists, 1);
      setSaved(false);
    } else {
      bookmarks.unshift({ slug, title, savedAt: Date.now() });
      setSaved(true);
    }
    saveBookmarks(bookmarks);
  }, [slug, title]);

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
        saved
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-muted text-muted-foreground border-border hover:text-foreground"
      }`}
      title={saved ? "Remove bookmark" : "Save for later"}
    >
      {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}

/** Reading list panel — shows all saved bookmarks */
export function ReadingList() {
  const [open, setOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  useEffect(() => {
    if (open) setBookmarks(getBookmarks());
  }, [open]);

  const remove = useCallback((slug: string) => {
    const updated = getBookmarks().filter((b) => b.slug !== slug);
    saveBookmarks(updated);
    setBookmarks(updated);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        title="Reading List"
      >
        <Bookmark size={16} />
        <span className="hidden sm:inline">Reading List</span>
      </button>

      {/* Slide-over panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 z-50 w-[380px] max-w-[90vw] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Bookmark size={18} className="text-primary" />
                Reading List
              </h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {bookmarks.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No saved articles yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click the Save button on any article</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((b) => (
                    <div key={b.slug} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-muted transition-colors">
                      <Link
                        href={`/blog/${b.slug}`}
                        className="flex-1 min-w-0"
                        onClick={() => setOpen(false)}
                      >
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {b.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <ExternalLink size={10} />
                          {new Date(b.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </Link>
                      <button
                        onClick={() => remove(b.slug)}
                        className="shrink-0 p-1 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
