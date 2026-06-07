"use client";

import { useCallback, useMemo, useState } from "react";
import { BarChart3, Check, Copy, Lightbulb, Search, Sparkles, TriangleAlert } from "lucide-react";

type CheckItem = {
  label: string;
  passed: boolean;
  note: string;
};

type Tone = "emerald" | "blue" | "amber" | "red";

const sampleTitles = [
  "How to Get Traffic to a New Blog in 2026",
  "Best AI Writing Tools for Bloggers in 2026",
  "SEO Checklist for New Websites: 17 Fixes to Make Today",
  "Resume.io vs Novoresume: Which CV Builder Is Better?",
];

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasPowerPhrase(text: string) {
  return /\b(best|how|guide|checklist|free|vs|review|compare|steps|tips)\b/i.test(text);
}

function hasNumber(text: string) {
  return /\b\d+\b/.test(text);
}

function hasYear(text: string) {
  return /\b20\d{2}\b/.test(text);
}

export function SeoTitleAnalyzerTool() {
  const [title, setTitle] = useState("How to Get Traffic to a New Blog in 2026");
  const [copied, setCopied] = useState(false);

  const analysis = useMemo(() => {
    const chars = title.length;
    const words = wordCount(title);
    const checks: CheckItem[] = [
      {
        label: "Title length",
        passed: chars >= 45 && chars <= 65,
        note: "Aim for roughly 45-65 characters so the title stays readable in search results.",
      },
      {
        label: "Word count",
        passed: words >= 7 && words <= 12,
        note: "Most strong SEO titles land between 7 and 12 words.",
      },
      {
        label: "Intent phrase",
        passed: hasPowerPhrase(title),
        note: "Use terms like best, how, guide, checklist, review, or vs to match search intent.",
      },
      {
        label: "Specificity",
        passed: hasNumber(title) || hasYear(title),
        note: "Numbers or a current year often improve click-through rate by making the promise clearer.",
      },
      {
        label: "Not stuffed",
        passed: !/(\b\w+\b)(?:.*\b\1\b){2,}/i.test(title),
        note: "Avoid repeating the same keyword too many times.",
      },
    ];

    let score = 0;
    if (checks[0].passed) score += 25;
    if (checks[1].passed) score += 20;
    if (checks[2].passed) score += 20;
    if (checks[3].passed) score += 20;
    if (checks[4].passed) score += 15;

    const verdict = score >= 85 ? "Strong" : score >= 65 ? "Good" : score >= 45 ? "Needs work" : "Weak";
    const tone: Tone = score >= 85 ? "emerald" : score >= 65 ? "blue" : score >= 45 ? "amber" : "red";

    const suggestions: string[] = [];
    if (!checks[0].passed) suggestions.push("Adjust the title length closer to 45-65 characters.");
    if (!checks[1].passed) suggestions.push("Tighten the title to 7-12 words for better readability.");
    if (!checks[2].passed) suggestions.push("Add an intent word like best, how, guide, review, or checklist.");
    if (!checks[3].passed) suggestions.push("Consider adding a number or the current year to make the title more specific.");
    if (!checks[4].passed) suggestions.push("Reduce keyword repetition so the title sounds natural.");
    if (!title.includes(":")) suggestions.push("A colon can help separate the hook from the payoff in long titles.");

    return { chars, words, checks, score, verdict, tone, suggestions };
  }, [title]);

  const copy = useCallback(async () => {
    if (!title) return;
    await navigator.clipboard.writeText(title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [title]);

  const toneClasses = {
    emerald: "bg-emerald-500 text-white",
    blue: "bg-blue-500 text-white",
    amber: "bg-amber-500 text-white",
    red: "bg-red-500 text-white",
  } as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analyze your title</p>
            <h2 className="text-xl font-semibold mt-1">Check if your blog title is built to win clicks</h2>
          </div>
          <button onClick={copy} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <label htmlFor="seo-title-input" className="sr-only">Blog title or SEO headline</label>
        <textarea
          id="seo-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Enter a blog title, SEO title, or headline..."
        />

        <div className="flex flex-wrap gap-2">
          {sampleTitles.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setTitle(sample)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><BarChart3 size={16} /> Score</div>
          <div className="mt-3 flex items-end gap-3">
            <div className="text-4xl font-black">{analysis.score}</div>
            <div className={`mb-1 rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[analysis.tone]}`}>{analysis.verdict}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Search size={16} /> Characters</div>
          <div className="mt-3 text-4xl font-black">{analysis.chars}</div>
          <p className="mt-2 text-xs text-muted-foreground">SERP-safe range: 45-65</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles size={16} /> Words</div>
          <div className="mt-3 text-4xl font-black">{analysis.words}</div>
          <p className="mt-2 text-xs text-muted-foreground">Recommended: 7-12 words</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-lg font-semibold">Checklist</h3>
          {analysis.checks.map((check) => (
            <div key={check.label} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-start gap-3">
                {check.passed ? <Check size={16} className="mt-0.5 text-emerald-500" /> : <TriangleAlert size={16} className="mt-0.5 text-amber-500" />}
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{check.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-lg font-semibold">Improvement tips</h3>
          {analysis.suggestions.length > 0 ? (
            <div className="space-y-3">
              {analysis.suggestions.map((tip) => (
                <div key={tip} className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-3 text-sm">
                  <Lightbulb size={15} className="mt-0.5 text-amber-500 shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              This title is in strong shape. If the post still gets low clicks, test a sharper angle rather than stuffing more keywords.
            </div>
          )}

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick rule</p>
            <p className="mt-2 text-sm text-muted-foreground">A better SEO title is usually clearer, more specific, and more useful, not just longer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}