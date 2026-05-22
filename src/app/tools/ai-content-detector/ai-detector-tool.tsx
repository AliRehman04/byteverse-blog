"use client";

import { useState, useCallback } from "react";
import {
  Brain, AlertTriangle, CheckCircle2, XCircle,
  RotateCcw, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";

/* ── AI Signature Phrases ─────────────────────────────── */
const AI_PHRASES = [
  "delve", "delves", "delving",
  "it's important to note", "it is important to note",
  "it's worth noting", "it is worth noting", "it is worth mentioning",
  "in today's digital", "in today's fast-paced", "in today's world",
  "in the realm of",
  "landscape", "digital landscape",
  "navigate the", "navigating the",
  "leverage", "leveraging",
  "harness", "harnessing",
  "foster", "fostering",
  "pivotal", "robust",
  "seamless", "seamlessly",
  "streamline", "streamlining",
  "cutting-edge",
  "game-changer", "game changer",
  "multifaceted", "holistic",
  "paradigm", "paradigm shift",
  "meticulous", "meticulously",
  "intricate", "intricacies",
  "nuanced", "nuances",
  "versatile", "tailored",
  "underscores", "encompasses",
  "facilitating", "testament to",
  "plays a crucial role", "plays a vital role",
  "it should be noted", "as we navigate",
  "embark", "embarking",
  "empower", "empowering",
  "commendable", "tapestry", "beacon",
  "paramount", "ever-evolving",
  "groundbreaking", "transformative",
  "indispensable", "unparalleled",
  "elevate", "elevating",
  "comprehensive guide",
  "in conclusion", "furthermore", "moreover",
  "consequently", "in essence",
  "without further ado",
  "boasts", "adept", "realm",
  "myriad", "plethora", "arguably", "undeniably",
  "it's crucial", "it is crucial",
];

const SAMPLE_AI = `In today's rapidly evolving digital landscape, artificial intelligence has emerged as a transformative force that is reshaping industries across the globe. The integration of AI technologies into various sectors has not only streamlined operational processes but has also fostered innovative approaches to problem-solving. It is worth noting that the impact of AI extends far beyond mere automation; it encompasses a holistic paradigm shift in how organizations navigate challenges and leverage data-driven insights to make informed decisions. Furthermore, the seamless adoption of these cutting-edge tools has been pivotal in enhancing productivity and driving sustainable growth. As we delve deeper into the nuances of AI implementation, it becomes increasingly evident that this technology holds unparalleled potential to revolutionize the way we work, learn, and interact with the world around us.`;

const SAMPLE_HUMAN = `I've been messing around with AI tools for about six months now, and honestly? They're useful but not magic. Last week I tried getting ChatGPT to write a blog post about cooking pasta — and it kept adding weird formal phrases that nobody actually says. Like who says "it is important to note" when talking about boiling water? My friend Sarah tried it too and had the same experience. We ended up just writing it ourselves. It took longer but sounded way more natural. I think the best approach is using AI as a starting point and then rewriting everything in your own voice. That way you get the structure without the robotic tone. At least that's what works for me!`;

/* ── Utility Functions ────────────────────────────────── */
function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+(?=[A-Z"'])/g, "$1|||")
    .split("|||")
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.split(/\s+/).length >= 3);
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
}

function cv(arr: number[]): number {
  const m = mean(arr);
  return m > 0 ? stdDev(arr) / m : 0;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/* ── Types ────────────────────────────────────────────── */
interface Signal {
  name: string;
  score: number;
  label: string;
  description: string;
}

interface SentenceResult {
  text: string;
  score: number;
  flags: string[];
}

interface AnalysisResult {
  overallScore: number;
  verdict: "human" | "mixed" | "ai";
  verdictLabel: string;
  signals: Signal[];
  sentenceResults: SentenceResult[];
  foundPhrases: string[];
  stats: { words: number; sentences: number; paragraphs: number; uniqueWords: number; avgSentenceLen: number };
}

/* ── Analysis Engine ──────────────────────────────────── */
function analyzeText(text: string): AnalysisResult {
  const clean = text.trim();
  const sentences = splitSentences(clean);
  const words = clean.split(/\s+/).filter(Boolean);
  const lower = clean.toLowerCase();
  const lowerWords = words.map((w) => w.toLowerCase().replace(/[^a-z']/g, "")).filter(Boolean);
  const uniqueWords = new Set(lowerWords);
  const paragraphs = clean.split(/\n\s*\n/).filter((p) => p.trim());

  // 1. Sentence Length Uniformity
  const sentLens = sentences.map((s) => s.split(/\s+/).length);
  const uniformityScore = clamp(Math.round((1 - cv(sentLens) / 0.7) * 100));

  // 2. Vocabulary Diversity (Corrected TTR)
  const cttr = uniqueWords.size / Math.sqrt(2 * Math.max(words.length, 1));
  const ttrScore = clamp(Math.round((1 - (cttr - 4) / 6) * 100));

  // 3. Burstiness
  const complexities = sentences.map((s) => {
    const w = s.split(/\s+/);
    return w.reduce((sum, word) => sum + word.length, 0) / Math.max(w.length, 1);
  });
  const burstScore = clamp(Math.round((1 - cv(complexities) / 0.25) * 100));

  // 4. AI Phrase Detection
  const foundPhrases: string[] = [];
  const seen = new Set<string>();
  for (const phrase of AI_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      const root = phrase.replace(/(s|ing|ed|ly)$/i, "").slice(0, 6);
      if (!seen.has(root)) {
        seen.add(root);
        foundPhrases.push(phrase);
      }
    }
  }
  const phraseThreshold = Math.max(3, words.length / 200);
  const phraseScore = clamp(Math.round((foundPhrases.length / phraseThreshold) * 100));

  // 5. Paragraph Structure
  const paraLens = paragraphs.map((p) => p.split(/\s+/).length);
  const paraScore = clamp(Math.round((1 - cv(paraLens) / 0.6) * 100));

  // 6. Personal Voice
  const pronouns = (lower.match(/\b(i|i'm|i've|i'd|i'll|my|me|mine|myself)\b/g) || []).length;
  const contractions = (lower.match(/\b\w+'(t|re|ve|ll|d|m)\b/g) || []).length;
  const informal = (lower.match(/\b(actually|honestly|basically|literally|pretty|kinda|gonna|wanna|yeah|ok|okay|lol|haha|wow|anyway|stuff|cool|awesome|crazy)\b/g) || []).length;
  const personalRatio = (pronouns * 2 + contractions + informal) / Math.max(words.length, 1);
  const voiceScore = clamp(Math.round((1 - personalRatio / 0.04) * 100));

  // 7. Sentence Starter Variety
  const starters = sentences.map((s) => s.split(/\s+/).slice(0, 2).join(" ").toLowerCase());
  const uniqueStarters = new Set(starters);
  const starterRatio = starters.length > 0 ? uniqueStarters.size / starters.length : 1;
  const starterScore = clamp(Math.round((1 - starterRatio) * 150));

  // 8. Punctuation Variety
  const punctCount =
    (clean.match(/!/g) || []).length +
    (clean.match(/\?/g) || []).length +
    (clean.match(/[—–]|--/g) || []).length +
    (clean.match(/[()]/g) || []).length +
    (clean.match(/;/g) || []).length;
  const punctRatio = punctCount / Math.max(sentences.length, 1);
  const punctScore = clamp(Math.round((1 - punctRatio / 0.5) * 100));

  // Weighted overall
  const weights = [0.15, 0.10, 0.13, 0.22, 0.10, 0.14, 0.08, 0.08];
  const scores = [uniformityScore, ttrScore, burstScore, phraseScore, paraScore, voiceScore, starterScore, punctScore];
  const overallScore = clamp(Math.round(scores.reduce((sum, s, i) => sum + s * weights[i], 0)));

  const verdict: "human" | "mixed" | "ai" = overallScore < 35 ? "human" : overallScore < 65 ? "mixed" : "ai";
  const verdictLabel = verdict === "human" ? "Likely Human Written" : verdict === "mixed" ? "Mixed / Uncertain" : "Likely AI Generated";

  // Sentence-level
  const sentenceResults: SentenceResult[] = sentences.map((sent) => {
    const sl = sent.toLowerCase();
    const flags: string[] = [];
    let ss = 0;

    const sp = AI_PHRASES.filter((p) => sl.includes(p));
    if (sp.length > 0) {
      flags.push(`AI phrases: ${sp.slice(0, 3).join(", ")}`);
      ss += 25 * Math.min(sp.length, 3);
    }

    const wc = sent.split(/\s+/).length;
    if (wc >= 15 && wc <= 25) ss += 8;
    if (sl.match(/\b(i|i'm|i've|my|me)\b/)) ss -= 25;
    if (sl.match(/\b(actually|honestly|like|anyway|basically)\b/)) ss -= 15;
    if (sl.match(/\b(crucial|essential|vital|paramount|comprehensive|holistic|robust|pivotal)\b/)) ss += 15;

    return { text: sent, score: clamp(ss), flags };
  });

  const signals: Signal[] = [
    { name: "Sentence Uniformity", score: uniformityScore, label: uniformityScore > 60 ? "High" : uniformityScore > 35 ? "Moderate" : "Low", description: "AI writes sentences of similar length." },
    { name: "Vocabulary Diversity", score: ttrScore, label: ttrScore > 60 ? "Limited" : ttrScore > 35 ? "Moderate" : "Rich", description: "AI reuses a smaller set of words." },
    { name: "Burstiness", score: burstScore, label: burstScore > 60 ? "Low" : burstScore > 35 ? "Moderate" : "High", description: "Human writing varies in complexity between sentences." },
    { name: "AI Phrases", score: phraseScore, label: `${foundPhrases.length} found`, description: "ChatGPT signature phrases like 'delve', 'landscape'." },
    { name: "Paragraph Structure", score: paraScore, label: paraScore > 60 ? "Uniform" : paraScore > 35 ? "Moderate" : "Varied", description: "AI tends to write equal-length paragraphs." },
    { name: "Personal Voice", score: voiceScore, label: voiceScore > 60 ? "Weak" : voiceScore > 35 ? "Moderate" : "Strong", description: "Human writing uses personal pronouns and contractions." },
    { name: "Sentence Starters", score: starterScore, label: starterScore > 60 ? "Repetitive" : starterScore > 35 ? "Moderate" : "Diverse", description: "AI often starts sentences in similar ways." },
    { name: "Punctuation", score: punctScore, label: punctScore > 60 ? "Limited" : punctScore > 35 ? "Moderate" : "Rich", description: "Humans use more dashes, parentheses, etc." },
  ];

  return {
    overallScore, verdict, verdictLabel, signals, sentenceResults, foundPhrases,
    stats: {
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      uniqueWords: uniqueWords.size,
      avgSentenceLen: Math.round(mean(sentLens)),
    },
  };
}

/* ── Score Gauge Component ────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const size = 160;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score < 35 ? "#22c55e" : score < 65 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} className="mx-auto">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/20" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-1000 ease-out"
      />
      <text x={size / 2} y={size / 2 - 8} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-3xl font-bold">
        {score}%
      </text>
      <text x={size / 2} y={size / 2 + 18} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-xs">
        AI Probability
      </text>
    </svg>
  );
}

/* ── Main Component ───────────────────────────────────── */
export function AiDetectorTool() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showSentences, setShowSentences] = useState(false);
  const [showPhrases, setShowPhrases] = useState(false);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleAnalyze = useCallback(() => {
    if (wordCount < 50) return;
    setAnalyzing(true);
    setTimeout(() => {
      setResult(analyzeText(text));
      setAnalyzing(false);
      setShowSentences(false);
      setShowPhrases(false);
    }, 600);
  }, [text, wordCount]);

  const handleClear = () => {
    setText("");
    setResult(null);
  };

  const verdictColor = result
    ? result.verdict === "human"
      ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30"
      : result.verdict === "mixed"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
        : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
    : "";

  const verdictIcon = result
    ? result.verdict === "human" ? <CheckCircle2 size={16} /> : result.verdict === "mixed" ? <AlertTriangle size={16} /> : <XCircle size={16} />
    : null;

  return (
    <div>
      {/* Input Area */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="Paste your text here to analyze for AI-generated content... (minimum 50 words)"
          className="w-full h-48 sm:h-56 bg-transparent border-0 resize-none outline-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
          spellCheck={false}
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{wordCount} words</span>
            {wordCount > 0 && wordCount < 50 && (
              <span className="text-amber-500">Need at least 50 words</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setText(SAMPLE_AI); setResult(null); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Try AI Sample
            </button>
            <button
              onClick={() => { setText(SAMPLE_HUMAN); setResult(null); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Try Human Sample
            </button>
            {text && (
              <button onClick={handleClear} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1">
                <RotateCcw size={12} /> Clear
              </button>
            )}
            <button
              onClick={handleAnalyze}
              disabled={wordCount < 50 || analyzing}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {analyzing ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Brain size={14} /> Analyze Text</>}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Score + Verdict + Signals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Score Card */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center">
              <ScoreGauge score={result.overallScore} />
              <span className={`mt-4 px-4 py-1.5 rounded-full text-sm font-semibold border flex items-center gap-1.5 ${verdictColor}`}>
                {verdictIcon} {result.verdictLabel}
              </span>
            </div>

            {/* Signals Grid */}
            <div className="md:col-span-2 bg-card border border-border rounded-xl p-4 sm:p-6">
              <h3 className="text-sm font-semibold mb-4">Analysis Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {result.signals.map((signal) => {
                  const barColor = signal.score < 35 ? "bg-green-500" : signal.score < 65 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <div key={signal.name} className="p-3 bg-muted/40 rounded-lg" title={signal.description}>
                      <p className="text-[11px] text-muted-foreground leading-tight">{signal.name}</p>
                      <p className="text-sm font-semibold mt-0.5">{signal.label}</p>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${signal.score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Text Stats */}
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="grid grid-cols-5 gap-4 text-center">
              {[
                { label: "Words", value: result.stats.words },
                { label: "Sentences", value: result.stats.sentences },
                { label: "Paragraphs", value: result.stats.paragraphs },
                { label: "Unique Words", value: result.stats.uniqueWords },
                { label: "Avg Sentence", value: `${result.stats.avgSentenceLen}w` },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sentence Analysis */}
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <button
              onClick={() => setShowSentences(!showSentences)}
              className="w-full flex items-center justify-between text-sm font-semibold hover:text-primary transition-colors"
            >
              <span>Sentence-by-Sentence Analysis ({result.sentenceResults.length})</span>
              {showSentences ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showSentences && (
              <div className="space-y-2 mt-4">
                {result.sentenceResults.map((sent, i) => {
                  const borderColor = sent.score < 20 ? "border-l-green-500" : sent.score < 50 ? "border-l-amber-500" : "border-l-red-500";
                  const bgColor = sent.score < 20 ? "bg-green-500/5" : sent.score < 50 ? "bg-amber-500/5" : "bg-red-500/5";
                  return (
                    <div key={i} className={`p-3 rounded-lg border-l-4 ${borderColor} ${bgColor}`}>
                      <p className="text-sm leading-relaxed">{sent.text}</p>
                      {sent.flags.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic">{sent.flags.join(" · ")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Found AI Phrases */}
          {result.foundPhrases.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <button
                onClick={() => setShowPhrases(!showPhrases)}
                className="w-full flex items-center justify-between text-sm font-semibold hover:text-primary transition-colors"
              >
                <span>Detected AI Phrases ({result.foundPhrases.length})</span>
                {showPhrases ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showPhrases && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {result.foundPhrases.map((phrase) => (
                    <span key={phrase} className="px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-md text-xs font-medium">
                      &ldquo;{phrase}&rdquo;
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            This tool uses statistical heuristics and is not 100% definitive. Use results as a guide, not as proof. No data is sent to any server.
          </p>
        </>
      )}
    </div>
  );
}
