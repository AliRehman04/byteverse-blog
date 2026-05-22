"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, CheckCircle2, AlertTriangle, XCircle,
  RotateCcw, ChevronDown, ChevronUp, Loader2,
  ExternalLink, BarChart3, FileText, ArrowRight, Sparkles,
} from "lucide-react";

/* ── Utility Functions ────────────────────────────────── */
function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+(?=[A-Z"'])/g, "$1|||")
    .split("|||")
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && s.split(/\s+/).length >= 4);
}

function generateNgrams(text: string, n: number): Set<string> {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const ngrams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function cosineSimilarity(text1: string, text2: string): number {
  const freq = (t: string) => {
    const map = new Map<string, number>();
    for (const w of t.toLowerCase().split(/\s+/)) map.set(w, (map.get(w) || 0) + 1);
    return map;
  };
  const f1 = freq(text1);
  const f2 = freq(text2);
  const allWords = new Set([...f1.keys(), ...f2.keys()]);
  let dot = 0, n1 = 0, n2 = 0;
  for (const word of allWords) {
    const v1 = f1.get(word) || 0;
    const v2 = f2.get(word) || 0;
    dot += v1 * v2;
    n1 += v1 * v1;
    n2 += v2 * v2;
  }
  return n1 > 0 && n2 > 0 ? dot / (Math.sqrt(n1) * Math.sqrt(n2)) : 0;
}

function sentenceSimilarity(s1: string, s2: string): number {
  const w1 = new Set(s1.toLowerCase().split(/\s+/).filter(Boolean));
  const w2 = new Set(s2.toLowerCase().split(/\s+/).filter(Boolean));
  let intersection = 0;
  for (const w of w1) if (w2.has(w)) intersection++;
  const union = w1.size + w2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/* ── Types ────────────────────────────────────────────── */
interface UniquenessResult {
  sentences: Array<{
    text: string;
    status: "unique" | "review" | "verify";
    reason: string;
    searchUrl: string;
  }>;
  overallScore: number;
  stats: { total: number; unique: number; review: number; verify: number };
}

interface CompareResult {
  overallSimilarity: number;
  jaccardScore: number;
  cosineScore: number;
  ngramScore: number;
  matchedSentences: Array<{
    source: string;
    match: string;
    similarity: number;
  }>;
  stats: {
    text1Words: number;
    text2Words: number;
    text1Sentences: number;
    text2Sentences: number;
    commonNgrams: number;
  };
}

/* ── Uniqueness Analysis ──────────────────────────────── */

// Well-known stock/placeholder text phrases (always flagged as plagiarized)
const KNOWN_TEXTS: RegExp[] = [
  /lorem ipsum/i,
  /dolor sit amet/i,
  /consectetur adipiscing/i,
  /the quick brown fox jumps over the lazy dog/i,
  /all work and no play makes jack a dull boy/i,
  /to be or not to be/i,
  /it was the best of times/i,
  /call me ishmael/i,
  /four score and seven years ago/i,
];

function analyzeUniqueness(text: string): UniquenessResult {
  const sentences = splitSentences(text);

  // Check if the full text matches known stock/placeholder content
  const lowerFull = text.toLowerCase();
  const hasKnownText = KNOWN_TEXTS.some((rx) => rx.test(lowerFull));

  const results = sentences.map((sent) => {
    const lower = sent.toLowerCase();

    // If sentence itself contains known text phrases → immediate flag
    const sentHasKnown = KNOWN_TEXTS.some((rx) => rx.test(lower));
    if (sentHasKnown) {
      const searchUrl = `https://www.google.com/search?q="${encodeURIComponent(sent.slice(0, 120))}"`;
      return { text: sent, status: "verify" as const, reason: "Known stock/placeholder text — widely copied", searchUrl };
    }

    // If the overall text is known stock content, penalize all sentences heavily
    let score = hasKnownText ? 15 : 68;

    // ── Strong positive signals ──
    const personalMatches = lower.match(/\b(i|i'm|i've|i'd|i'll|my|me|mine|we|we're|our|you|you're|your)\b/g);
    if (personalMatches) score += personalMatches.length * 8;

    if (sent.includes("?")) score += 15;
    if (sent.includes("!")) score += 10;

    const contractionCount = (lower.match(/\w+'(t|re|ve|ll|d|m|s)\b/g) || []).length;
    if (contractionCount) score += contractionCount * 6;

    if (sent.match(/\$\d+/)) score += 12;
    if (sent.match(/\b\d{4}\b/)) score += hasKnownText ? 0 : 8;
    if (sent.match(/\b\d+%/)) score += 8;
    if (sent.match(/\b\d+-\d+\b/)) score += 6;
    if (sent.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)+/)) score += hasKnownText ? 0 : 8;
    if (sent.match(/\b[A-Z]{2,}\b/)) score += 5;

    if (lower.match(/\b(think|believe|feel|love|hate|prefer|opinion|honestly|personally|recommend)\b/)) score += 12;
    if (lower.match(/\b(should|could|might|try|consider)\b/)) score += 5;
    if (lower.match(/\b(great|awesome|terrible|fantastic|solid|decent|pretty good)\b/)) score += 8;
    if (lower.match(/\b(actually|basically|pretty|kinda|gonna|lol|haha|wow|anyway|sure|okay|fine|cool)\b/)) score += 10;
    if (lower.match(/^(update|check|make|use|try|start|build|create|add|clone|review|look)\b/i)) score += 8;

    // ── Negative signals ──
    // No personal voice at all → more likely copied/generic
    if (!personalMatches && !contractionCount && !sent.includes("?") && !sent.includes("!")) {
      score -= 15;
    }

    if (lower.match(/\b(is defined as|refers to|is a (?:type|form|kind) of|can be described as)\b/)) score -= 20;
    if (lower.match(/\b(according to (?:recent )?(?:studies|research)|it has been (?:shown|proven|demonstrated))\b/)) score -= 18;
    if (lower.match(/\b(it is clear that|it is evident that|one of the most important)\b/)) score -= 12;

    // Repetitive phrasing (same word repeated many times = filler/stock)
    const words = lower.split(/\s+/);
    const wordFreq = new Map<string, number>();
    for (const w of words) if (w.length > 3) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    const maxFreq = Math.max(...wordFreq.values(), 0);
    if (maxFreq >= 3 && words.length < 40) score -= 10;

    const clamped = Math.max(0, Math.min(100, score));
    const status: "unique" | "review" | "verify" = clamped >= 55 ? "unique" : clamped >= 30 ? "review" : "verify";
    const reason = status === "unique"
      ? "Contains personal or specific content"
      : status === "review"
        ? "Generic content — review recommended"
        : "Formal/textbook language — verify online";

    const searchUrl = `https://www.google.com/search?q="${encodeURIComponent(sent.slice(0, 120))}"`;

    return { text: sent, status, reason, searchUrl };
  });

  const unique = results.filter((r) => r.status === "unique").length;
  const review = results.filter((r) => r.status === "review").length;
  const verify = results.filter((r) => r.status === "verify").length;
  const overallScore = results.length > 0 ? Math.round(((unique + review * 0.7) / results.length) * 100) : 100;

  return {
    sentences: results,
    overallScore,
    stats: { total: results.length, unique, review, verify },
  };
}

/* ── Text Comparison ──────────────────────────────────── */
function compareTexts(text1: string, text2: string): CompareResult {
  // N-gram similarities
  const ng3a = generateNgrams(text1, 3);
  const ng3b = generateNgrams(text2, 3);
  const ng5a = generateNgrams(text1, 5);
  const ng5b = generateNgrams(text2, 5);

  const jaccard3 = jaccardSimilarity(ng3a, ng3b);
  const jaccard5 = jaccardSimilarity(ng5a, ng5b);
  const jaccardScore = Math.round(((jaccard3 + jaccard5) / 2) * 100);

  const cosineScore = Math.round(cosineSimilarity(text1, text2) * 100);

  // Common 5-grams count
  let commonNgrams = 0;
  for (const ng of ng5a) if (ng5b.has(ng)) commonNgrams++;

  const ngramScore = Math.round(jaccardSimilarity(ng5a, ng5b) * 100);

  // Sentence matching
  const sents1 = splitSentences(text1);
  const sents2 = splitSentences(text2);
  const matchedSentences: CompareResult["matchedSentences"] = [];

  for (const s1 of sents1) {
    let best = { match: "", similarity: 0 };
    for (const s2 of sents2) {
      const sim = sentenceSimilarity(s1, s2);
      if (sim > best.similarity) best = { match: s2, similarity: sim };
    }
    if (best.similarity > 0.35) {
      matchedSentences.push({
        source: s1,
        match: best.match,
        similarity: Math.round(best.similarity * 100),
      });
    }
  }

  matchedSentences.sort((a, b) => b.similarity - a.similarity);

  // Overall similarity: weighted average
  const overallSimilarity = Math.round(cosineScore * 0.4 + jaccardScore * 0.3 + ngramScore * 0.3);

  return {
    overallSimilarity,
    jaccardScore,
    cosineScore,
    ngramScore,
    matchedSentences,
    stats: {
      text1Words: text1.split(/\s+/).filter(Boolean).length,
      text2Words: text2.split(/\s+/).filter(Boolean).length,
      text1Sentences: sents1.length,
      text2Sentences: sents2.length,
      commonNgrams,
    },
  };
}

/* ── Score Gauge ──────────────────────────────────────── */
function ScoreGauge({ score, label, invert }: { score: number; label: string; invert?: boolean }) {
  const size = 140;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const effectiveScore = invert ? 100 - score : score;
  const color = effectiveScore >= 70 ? "#22c55e" : effectiveScore >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/20" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-1000 ease-out"
        />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-2xl font-bold">
          {score}%
        </text>
        <text x={size / 2} y={size / 2 + 18} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[10px]">
          {label}
        </text>
      </svg>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────── */
export function PlagiarismTool() {
  const [mode, setMode] = useState<"uniqueness" | "compare">("uniqueness");
  const [text, setText] = useState("");
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [uResult, setUResult] = useState<UniquenessResult | null>(null);
  const [cResult, setCResult] = useState<CompareResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<{ score: number; verdict: string; style: string; flags: string[]; summary: string } | null>(null);
  const [aiError, setAiError] = useState("");

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wc1 = text1.trim() ? text1.trim().split(/\s+/).length : 0;
  const wc2 = text2.trim() ? text2.trim().split(/\s+/).length : 0;

  const handleCheck = useCallback(() => {
    if (wordCount < 30) return;
    setChecking(true);
    setAiResult(null);
    setAiError("");
    setTimeout(() => {
      setUResult(analyzeUniqueness(text));
      setChecking(false);
    }, 500);
  }, [text, wordCount]);

  const handleAiCheck = useCallback(async () => {
    if (wordCount < 30) return;
    setAiChecking(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai-plagiarism-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Something went wrong.");
        return;
      }
      setAiResult(data);
    } catch {
      setAiError("Network error. Please try again.");
    } finally {
      setAiChecking(false);
    }
  }, [text, wordCount]);

  const handleCompare = useCallback(() => {
    if (wc1 < 20 || wc2 < 20) return;
    setChecking(true);
    setTimeout(() => {
      setCResult(compareTexts(text1, text2));
      setChecking(false);
      setShowMatches(false);
    }, 500);
  }, [text1, text2, wc1, wc2]);

  const statusIcon = (s: string) =>
    s === "unique" ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
    : s === "review" ? <AlertTriangle size={16} className="text-amber-500 shrink-0" />
    : <XCircle size={16} className="text-red-500 shrink-0" />;

  const statusBg = (s: string) =>
    s === "unique" ? "border-l-green-500 bg-green-500/5"
    : s === "review" ? "border-l-amber-500 bg-amber-500/5"
    : "border-l-red-500 bg-red-500/5";

  return (
    <div>
      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode("uniqueness"); setCResult(null); }}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            mode === "uniqueness" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          <FileText size={16} /> Check Uniqueness
        </button>
        <button
          onClick={() => { setMode("compare"); setUResult(null); }}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            mode === "compare" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          <BarChart3 size={16} /> Compare Texts
        </button>
      </div>

      {/* ── Uniqueness Mode ──────────────────────────── */}
      {mode === "uniqueness" && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setUResult(null); }}
              placeholder="Paste your text here to check for uniqueness... (minimum 30 words)"
              className="w-full h-48 sm:h-56 bg-transparent border-0 resize-none outline-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                {wordCount} words
                {wordCount > 0 && wordCount < 30 && <span className="text-amber-500 ml-2">Need at least 30 words</span>}
              </span>
              <div className="flex items-center gap-2">
                {text && (
                  <button onClick={() => { setText(""); setUResult(null); }} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1">
                    <RotateCcw size={12} /> Clear
                  </button>
                )}
                <button
                  onClick={handleCheck}
                  disabled={wordCount < 30 || checking || aiChecking}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {checking ? <><Loader2 size={14} className="animate-spin" /> Checking...</> : <><Search size={14} /> Quick Check</>}
                </button>
                <button
                  onClick={handleAiCheck}
                  disabled={wordCount < 30 || checking || aiChecking}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  {aiChecking ? <><Loader2 size={14} className="animate-spin" /> AI Checking...</> : <><Sparkles size={14} /> AI Check</>}
                </button>
              </div>
            </div>
          </div>

          {uResult && (
            <>
              {/* Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center">
                  <ScoreGauge score={uResult.overallScore} label="Uniqueness" invert={false} />
                </div>
                <div className="md:col-span-3 bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-semibold mb-3">Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{uResult.stats.unique}</p>
                      <p className="text-xs text-muted-foreground">Likely Unique</p>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{uResult.stats.review}</p>
                      <p className="text-xs text-muted-foreground">Review Suggested</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{uResult.stats.verify}</p>
                      <p className="text-xs text-muted-foreground">Verify Online</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Click &ldquo;Search Google&rdquo; next to any sentence to check if it appears elsewhere online.
                  </p>
                </div>
              </div>

              {/* Sentence Results */}
              <div className="bg-card border border-border rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold mb-4">Sentence Analysis ({uResult.stats.total} sentences)</h3>
                <div className="space-y-2">
                  {uResult.sentences.map((sent, i) => (
                    <div key={i} className={`p-3 rounded-lg border-l-4 ${statusBg(sent.status)} flex gap-3`}>
                      <div className="pt-0.5">{statusIcon(sent.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{sent.text}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-xs text-muted-foreground">{sent.reason}</p>
                          <a
                            href={sent.searchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                          >
                            Search Google <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                This analysis uses heuristic text patterns. For comprehensive web-based plagiarism detection, verify flagged sentences using the search links above.
              </p>
            </>
          )}

          {/* AI Analysis Result */}
          {aiError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-sm text-red-500">
              {aiError}
            </div>
          )}
          {aiResult && (
            <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-violet-500" />
                <h3 className="text-sm font-semibold">AI-Powered Analysis</h3>
                <span className="ml-auto text-[10px] bg-violet-500/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">Llama 3.3 70B</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-card rounded-lg border border-border">
                  <p className={`text-2xl font-bold ${aiResult.score >= 70 ? "text-green-500" : aiResult.score >= 40 ? "text-amber-500" : "text-red-500"}`}>
                    {aiResult.score}%
                  </p>
                  <p className="text-xs text-muted-foreground">Originality</p>
                </div>
                <div className="text-center p-3 bg-card rounded-lg border border-border">
                  <p className="text-sm font-semibold capitalize">{aiResult.verdict.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">Verdict</p>
                </div>
                <div className="text-center p-3 bg-card rounded-lg border border-border">
                  <p className="text-sm font-semibold capitalize">{aiResult.style.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">Writing Style</p>
                </div>
              </div>
              <p className="text-sm mb-3">{aiResult.summary}</p>
              {aiResult.flags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Flags:</p>
                  <ul className="space-y-1">
                    {aiResult.flags.map((flag, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Compare Mode ─────────────────────────────── */}
      {mode === "compare" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Text 1 (Original)</span>
                <span className="text-xs text-muted-foreground">{wc1} words</span>
              </div>
              <textarea
                value={text1}
                onChange={(e) => { setText1(e.target.value); setCResult(null); }}
                placeholder="Paste the original text here..."
                className="w-full h-48 bg-transparent border-0 resize-none outline-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
                spellCheck={false}
              />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Text 2 (Compare)</span>
                <span className="text-xs text-muted-foreground">{wc2} words</span>
              </div>
              <textarea
                value={text2}
                onChange={(e) => { setText2(e.target.value); setCResult(null); }}
                placeholder="Paste the text to compare..."
                className="w-full h-48 bg-transparent border-0 resize-none outline-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <span className="text-xs text-muted-foreground">
              {(wc1 > 0 || wc2 > 0) && (wc1 < 20 || wc2 < 20) && "Both texts need at least 20 words"}
            </span>
            <div className="flex items-center gap-2">
              {(text1 || text2) && (
                <button onClick={() => { setText1(""); setText2(""); setCResult(null); }} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1">
                  <RotateCcw size={12} /> Clear
                </button>
              )}
              <button
                onClick={handleCompare}
                disabled={wc1 < 20 || wc2 < 20 || checking}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {checking ? <><Loader2 size={14} className="animate-spin" /> Comparing...</> : <><BarChart3 size={14} /> Compare Texts</>}
              </button>
            </div>
          </div>

          {cResult && (
            <>
              {/* Overall Score */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center">
                  <ScoreGauge score={cResult.overallSimilarity} label="Similarity" invert />
                </div>
                <div className="md:col-span-3 bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-semibold mb-3">Similarity Metrics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Cosine Similarity", value: cResult.cosineScore, desc: "Word frequency overlap" },
                      { label: "Jaccard Index", value: cResult.jaccardScore, desc: "N-gram overlap" },
                      { label: "Phrase Match", value: cResult.ngramScore, desc: "5-word phrase overlap" },
                    ].map((metric) => {
                      const color = metric.value < 30 ? "text-green-600 dark:text-green-400" : metric.value < 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
                      return (
                        <div key={metric.label} className="p-3 bg-muted/40 rounded-lg text-center">
                          <p className={`text-2xl font-bold ${color}`}>{metric.value}%</p>
                          <p className="text-xs font-medium mt-0.5">{metric.label}</p>
                          <p className="text-[10px] text-muted-foreground">{metric.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-sm font-bold">{cResult.stats.text1Words}</p>
                      <p className="text-[10px] text-muted-foreground">Text 1 Words</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">{cResult.stats.text2Words}</p>
                      <p className="text-[10px] text-muted-foreground">Text 2 Words</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">{cResult.matchedSentences.length}</p>
                      <p className="text-[10px] text-muted-foreground">Matched Sentences</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">{cResult.stats.commonNgrams}</p>
                      <p className="text-[10px] text-muted-foreground">Common Phrases</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched Sentences */}
              {cResult.matchedSentences.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4 mb-4">
                  <button
                    onClick={() => setShowMatches(!showMatches)}
                    className="w-full flex items-center justify-between text-sm font-semibold hover:text-primary transition-colors"
                  >
                    <span>Matching Sentences ({cResult.matchedSentences.length})</span>
                    {showMatches ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {showMatches && (
                    <div className="space-y-3 mt-4">
                      {cResult.matchedSentences.map((match, i) => {
                        const simColor = match.similarity >= 70 ? "text-red-500" : match.similarity >= 50 ? "text-amber-500" : "text-yellow-500";
                        return (
                          <div key={i} className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Match #{i + 1}</span>
                              <span className={`text-xs font-bold ${simColor}`}>{match.similarity}% similar</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded text-xs leading-relaxed">
                                <span className="text-[10px] font-medium text-blue-500 block mb-1">Text 1</span>
                                {match.source}
                              </div>
                              <div className="p-2 bg-purple-500/5 border border-purple-500/20 rounded text-xs leading-relaxed">
                                <span className="text-[10px] font-medium text-purple-500 block mb-1">Text 2</span>
                                {match.match}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                All comparison is done locally in your browser. No text is sent to any server.
              </p>

              {/* Cross-link CTA */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Found plagiarism or generic content?</p>
                  <p className="text-xs text-muted-foreground">Rewrite it to make it unique and human-sounding</p>
                </div>
                <div className="flex gap-2">
                  <Link href="/tools/plagiarism-remover" className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5">
                    Plagiarism Remover <ArrowRight size={12} />
                  </Link>
                  <Link href="/tools/ai-content-detector" className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5">
                    AI Detector <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
