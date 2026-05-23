"use client";

import { useState, useCallback } from "react";
import { Copy, Check, X, Search, Sparkles, Tag, Hash, AlertCircle } from "lucide-react";

/* ── Tag generation logic ──────────────────────────────── */
const YOUTUBE_TAG_LIMIT = 500;

/* Priority-ordered tag templates — highest-ranking patterns first */
function generateTags(keyword: string): string[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];

  const words = kw.split(/\s+/);
  const core = words.filter((w) => w.length > 2);

  /* Build candidates in priority order (most valuable first) */
  const candidates: string[] = [];
  const seen = new Set<string>();
  const add = (t: string) => {
    const tag = t.trim().toLowerCase();
    if (tag.length > 1 && tag.length <= 100 && !seen.has(tag)) {
      seen.add(tag);
      candidates.push(tag);
    }
  };

  // ── Tier 1: Exact match + year (highest SEO value) ──
  add(kw);
  add(`${kw} 2026`);
  add(`${kw} 2025`);

  // ── Tier 2: High-intent search modifiers ──
  const highIntent = ["tutorial", "how to", "best", "review", "guide", "tips"];
  highIntent.forEach((m) => {
    add(`${kw} ${m}`);
    add(`${m} ${kw}`);
  });

  // ── Tier 3: YouTube-algorithm boosters ──
  add(`${kw} for beginners`);
  add(`${kw} step by step`);
  add(`${kw} explained`);
  add(`${kw} in hindi`);
  add(`${kw} full course`);
  add(`learn ${kw}`);
  add(`${kw} free`);

  // ── Tier 4: Trending / viral patterns ──
  add(`${kw} trending`);
  add(`${kw} viral`);
  add(`${kw} shorts`);
  add(`${kw} latest`);
  add(`${kw} new`);
  add(`top ${kw}`);
  add(`top 10 ${kw}`);

  // ── Tier 5: Long-tail question tags ──
  add(`what is ${kw}`);
  add(`how to ${kw}`);
  add(`why ${kw}`);
  add(`is ${kw} worth it`);
  add(`${kw} vs`);

  // ── Tier 6: Niche modifiers ──
  const niche = [
    "tricks", "hacks", "mistakes", "secrets", "ideas",
    "examples", "tools", "course", "walkthrough", "complete",
  ];
  niche.forEach((n) => add(`${kw} ${n}`));

  // ── Tier 7: Hashtag + partial combos ──
  add(`#${words.join("")}`);
  if (words.length > 1) {
    add(`#${words[0]}`);
    add(`#${words[words.length - 1]}`);
    // Two-word sub-phrases
    for (let i = 0; i < words.length - 1; i++) {
      add(`${words[i]} ${words[i + 1]}`);
    }
  }
  // Individual core words
  core.forEach((w) => add(w));

  /* ── Enforce 500-char limit ── */
  const result: string[] = [];
  let charCount = 0;
  for (const tag of candidates) {
    const extra = result.length > 0 ? 2 : 0; // ", " separator
    if (charCount + extra + tag.length > YOUTUBE_TAG_LIMIT) continue;
    result.push(tag);
    charCount += extra + tag.length;
  }

  return result;
}

/* ── Component ─────────────────────────────────────────── */
export function YouTubeTagGeneratorTool() {
  const [input, setInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const totalChars = tags.join(", ").length;
  const isOverLimit = totalChars > YOUTUBE_TAG_LIMIT;

  const handleGenerate = useCallback(() => {
    const result = generateTags(input);
    setTags(result);
    setHasGenerated(true);
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate]
  );

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const copyAll = useCallback(async () => {
    if (tags.length === 0) return;
    await navigator.clipboard.writeText(tags.join(", "));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [tags]);

  const copyOne = useCallback(async (tag: string) => {
    await navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  }, []);

  const clearAll = useCallback(() => {
    setTags([]);
    setInput("");
    setHasGenerated(false);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Search Box ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <label className="text-xs font-medium mb-1 block">
          Enter video title or keyword
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. how to learn python, minecraft tips, travel vlog..."
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!input.trim()}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            <Sparkles size={14} />
            Generate
          </button>
        </div>

        {/* Quick examples */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {[
            "minecraft",
            "learn react in 2026",
            "top 10 travel destinations",
            "fitness workout",
            "cooking recipes easy",
          ].map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setInput(ex);
                const result = generateTags(ex);
                setTags(result);
                setHasGenerated(true);
              }}
              className="text-xs px-2.5 py-1 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results ── */}
      {hasGenerated && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          {/* Stats bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Tag size={14} />
                <strong className="text-foreground">{tags.length}</strong> tags
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  isOverLimit ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                <Hash size={14} />
                <strong className={isOverLimit ? "text-red-500" : "text-foreground"}>
                  {totalChars}
                </strong>
                / {YOUTUBE_TAG_LIMIT} chars
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={copyAll}
                disabled={tags.length === 0}
                className="text-xs font-medium px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                {copiedAll ? "Copied!" : "Copy All Tags"}
              </button>
            </div>
          </div>

          {/* Over-limit warning */}
          {isOverLimit && (
            <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>
                YouTube allows a maximum of {YOUTUBE_TAG_LIMIT} characters for tags. Remove some tags to stay within the limit.
              </span>
            </div>
          )}

          {/* Tags cloud */}
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="group inline-flex items-center gap-1 bg-muted/60 hover:bg-muted border border-border rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer"
                  onClick={() => copyOne(tag)}
                  title="Click to copy"
                >
                  <span className={copiedTag === tag ? "text-green-500" : ""}>
                    {copiedTag === tag ? "Copied!" : tag}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tag);
                    }}
                    className="ml-0.5 text-muted-foreground/50 hover:text-red-500 transition-colors"
                    aria-label={`Remove tag: ${tag}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              All tags removed. Generate new tags or enter a different keyword.
            </p>
          )}

          {/* Comma-separated preview */}
          {tags.length > 0 && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Comma-separated (paste into YouTube)
                </label>
                <button
                  onClick={copyAll}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                  {copiedAll ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground break-all max-h-32 overflow-y-auto font-mono text-xs leading-relaxed">
                {tags.join(", ")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
