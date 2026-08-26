"use client";

import { useMemo, useState } from "react";
import { AlignLeft, BookOpen, Check, Copy, GraduationCap, Gauge, Hash, RotateCcw, Type } from "lucide-react";

const SAMPLE_TEXT =
  "Readability is how easy your writing is to understand. Short sentences help. Familiar words help too. When sentences run long and pile clause upon clause, readers slow down, lose the thread, and leave. This tool measures that. Paste your draft, read the score, and trim what drags.";

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w
    .replace(/(?:[^laeiouy]es|[^laeiouy]e|ed)$/, "")
    .replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

interface Analysis {
  words: number;
  sentences: number;
  syllables: number;
  complexWords: number;
  avgWordsPerSentence: number;
  longSentences: number;
  veryLongSentences: number;
  fleschEase: number;
  fkGrade: number;
}

function analyze(text: string): Analysis | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const sentenceParts = trimmed.split(/[.!?]+[\s"')\]]*/).filter((s) => s.trim().length > 0);
  const sentences = Math.max(1, sentenceParts.length);
  const wordList = trimmed.split(/\s+/).filter(Boolean);
  const words = wordList.length;
  if (words < 1) return null;

  let syllables = 0;
  let complexWords = 0;
  for (const word of wordList) {
    const s = countSyllables(word);
    syllables += s;
    if (s >= 3) complexWords++;
  }

  let longSentences = 0;
  let veryLongSentences = 0;
  for (const s of sentenceParts) {
    const len = s.trim().split(/\s+/).filter(Boolean).length;
    if (len > 35) veryLongSentences++;
    else if (len > 25) longSentences++;
  }

  const wps = words / sentences;
  const spw = syllables / words;
  const fleschEase = Math.max(0, Math.min(100, 206.835 - 1.015 * wps - 84.6 * spw));
  const fkGrade = Math.max(0, 0.39 * wps + 11.8 * spw - 15.59);

  return {
    words,
    sentences,
    syllables,
    complexWords,
    avgWordsPerSentence: Math.round(wps * 10) / 10,
    longSentences,
    veryLongSentences,
    fleschEase: Math.round(fleschEase * 10) / 10,
    fkGrade: Math.round(fkGrade * 10) / 10,
  };
}

function scoreBand(score: number): { label: string; color: string; bar: string; advice: string } {
  if (score >= 80) return { label: "Very Easy", color: "text-emerald-500", bar: "bg-emerald-500", advice: "Conversational and effortless — ideal for the widest audience." };
  if (score >= 70) return { label: "Easy", color: "text-green-500", bar: "bg-green-500", advice: "Comfortable for most readers — the sweet spot for blogs and marketing." };
  if (score >= 60) return { label: "Standard", color: "text-lime-500", bar: "bg-lime-500", advice: "Plain English — fine for general web content." };
  if (score >= 50) return { label: "Fairly Difficult", color: "text-amber-500", bar: "bg-amber-500", advice: "Readers start skimming — shorten sentences and simplify words." };
  if (score >= 30) return { label: "Difficult", color: "text-orange-500", bar: "bg-orange-500", advice: "College-level density — expect drop-off unless your audience is expert." };
  return { label: "Very Difficult", color: "text-red-500", bar: "bg-red-500", advice: "Academic-paper territory — rewrite unless this is for specialists." };
}

function gradeLabel(grade: number): string {
  if (grade <= 6) return "6th grade or below";
  if (grade <= 8) return `${Math.round(grade)}th grade`;
  if (grade <= 12) return `${Math.round(grade)}th grade (high school)`;
  if (grade <= 16) return "College level";
  return "Postgraduate level";
}

export function ReadabilityCheckerTool() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const analysis = useMemo(() => analyze(text), [text]);
  const band = analysis ? scoreBand(analysis.fleschEase) : null;

  const copyReport = async () => {
    if (!analysis || !band) return;
    const report = [
      `Readability Report (ByteVerse)`,
      `Flesch Reading Ease: ${analysis.fleschEase} (${band.label})`,
      `Flesch-Kincaid Grade: ${analysis.fkGrade} (${gradeLabel(analysis.fkGrade)})`,
      `Words: ${analysis.words} | Sentences: ${analysis.sentences} | Avg words/sentence: ${analysis.avgWordsPerSentence}`,
      `Complex words (3+ syllables): ${analysis.complexWords} (${Math.round((analysis.complexWords / analysis.words) * 100)}%)`,
      `Long sentences (26-35 words): ${analysis.longSentences} | Very long (35+): ${analysis.veryLongSentences}`,
    ].join("\n");
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const statCards = analysis
    ? [
        { label: "Words", value: analysis.words.toLocaleString(), icon: Type, color: "text-blue-500" },
        { label: "Sentences", value: analysis.sentences.toLocaleString(), icon: AlignLeft, color: "text-violet-500" },
        { label: "Avg Words/Sentence", value: analysis.avgWordsPerSentence.toString(), icon: Hash, color: "text-cyan-500" },
        { label: "Complex Words", value: `${analysis.complexWords} (${Math.round((analysis.complexWords / analysis.words) * 100)}%)`, icon: BookOpen, color: "text-amber-500" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Score panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Gauge size={17} className="text-primary" />
            <h3 className="font-bold text-sm">Flesch Reading Ease</h3>
          </div>
          {analysis && band ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-extrabold ${band.color}`}>{analysis.fleschEase}</span>
                <span className={`text-sm font-bold ${band.color}`}>{band.label}</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${band.bar} transition-all duration-500`} style={{ width: `${analysis.fleschEase}%` }} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{band.advice}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Paste text below to see the score (0–100, higher = easier).</p>
          )}
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap size={17} className="text-primary" />
            <h3 className="font-bold text-sm">Flesch-Kincaid Grade Level</h3>
          </div>
          {analysis ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-foreground">{analysis.fkGrade}</span>
                <span className="text-sm font-semibold text-muted-foreground">{gradeLabel(analysis.fkGrade)}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                The US school grade needed to understand this text on first read. Web content performs best at grade 6–9.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">The US school grade needed to read your text comfortably.</p>
          )}
        </div>
      </div>

      {/* Stats */}
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="p-3 bg-card border border-border rounded-xl text-center">
              <s.icon size={17} className={`mx-auto mb-1 ${s.color}`} />
              <div className="text-base font-bold leading-tight">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sentence warnings */}
      {analysis && (analysis.longSentences > 0 || analysis.veryLongSentences > 0) && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Trim targets: </span>
          {analysis.veryLongSentences > 0 && (
            <>{analysis.veryLongSentences} sentence{analysis.veryLongSentences > 1 ? "s" : ""} over 35 words (split these first){analysis.longSentences > 0 ? ", " : ". "}</>
          )}
          {analysis.longSentences > 0 && (
            <>{analysis.longSentences} between 26–35 words (candidates for a comma-ectomy).</>
          )}
        </div>
      )}

      {/* Input */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your text</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setText(SAMPLE_TEXT)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
            >
              <BookOpen size={13} /> Sample
            </button>
            <button
              type="button"
              onClick={() => setText("")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
              disabled={!text}
            >
              <RotateCcw size={13} /> Clear
            </button>
            <button
              type="button"
              onClick={copyReport}
              disabled={!analysis}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy report"}
            </button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your blog post, email, essay, or any text here — the score updates as you type. Nothing leaves your browser."
          className="w-full min-h-70 p-4 bg-transparent text-sm leading-relaxed resize-y focus:outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
