"use client";

import { useState, useCallback } from "react";
import {
  Wand2, Copy, Check, RotateCcw, Loader2,
  ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";
import Link from "next/link";

/* ── SYNONYM DICTIONARY ───────────────────────────────── */
const SYN: Record<string, string[]> = {
  // Common verbs
  achieve: ["accomplish", "reach", "attain"],
  address: ["tackle", "handle", "deal with"],
  allow: ["let", "enable", "permit"],
  analyze: ["examine", "study", "look into"],
  appear: ["seem", "look", "come across as"],
  apply: ["use", "put to use", "employ"],
  assist: ["help", "support", "back up"],
  attempt: ["try", "aim", "strive"],
  begin: ["start", "kick off", "get going"],
  believe: ["think", "feel", "reckon"],
  build: ["create", "develop", "put together"],
  cause: ["lead to", "trigger", "bring about"],
  choose: ["pick", "select", "go with"],
  combine: ["merge", "mix", "blend"],
  complete: ["finish", "wrap up", "finalize"],
  conduct: ["run", "carry out", "do"],
  consider: ["think about", "look at", "weigh"],
  contain: ["hold", "include", "have"],
  continue: ["keep going", "carry on", "press on"],
  contribute: ["add to", "pitch in", "chip in"],
  create: ["build", "make", "develop"],
  decrease: ["drop", "reduce", "lower"],
  demonstrate: ["show", "prove", "display"],
  describe: ["explain", "outline", "lay out"],
  determine: ["figure out", "decide", "find out"],
  develop: ["build", "grow", "create"],
  discover: ["find", "uncover", "come across"],
  discuss: ["talk about", "cover", "go over"],
  display: ["show", "present", "exhibit"],
  eliminate: ["remove", "cut", "get rid of"],
  employ: ["use", "hire", "put to work"],
  enable: ["let", "allow", "make possible"],
  encounter: ["face", "run into", "come across"],
  enhance: ["boost", "improve", "upgrade"],
  ensure: ["make sure", "guarantee", "confirm"],
  establish: ["set up", "create", "build"],
  evaluate: ["assess", "review", "judge"],
  examine: ["look at", "study", "check"],
  execute: ["run", "carry out", "do"],
  exhibit: ["show", "display", "present"],
  expand: ["grow", "broaden", "extend"],
  experience: ["go through", "face", "deal with"],
  explain: ["describe", "break down", "clarify"],
  explore: ["look into", "dig into", "check out"],
  facilitate: ["help", "make easier", "support"],
  generate: ["create", "produce", "come up with"],
  identify: ["spot", "find", "recognize"],
  illustrate: ["show", "highlight", "point out"],
  implement: ["set up", "put in place", "roll out"],
  improve: ["boost", "enhance", "upgrade"],
  include: ["cover", "feature", "have"],
  increase: ["grow", "boost", "raise"],
  indicate: ["show", "suggest", "point to"],
  influence: ["shape", "affect", "impact"],
  introduce: ["bring in", "present", "launch"],
  investigate: ["look into", "explore", "dig into"],
  involve: ["include", "mean", "require"],
  maintain: ["keep", "hold", "preserve"],
  manage: ["handle", "run", "oversee"],
  maximize: ["boost", "get the most from", "optimize"],
  minimize: ["reduce", "cut down", "limit"],
  modify: ["change", "tweak", "adjust"],
  obtain: ["get", "grab", "pick up"],
  occur: ["happen", "take place", "come about"],
  operate: ["run", "work", "function"],
  optimize: ["fine-tune", "improve", "streamline"],
  organize: ["arrange", "sort", "set up"],
  overcome: ["beat", "get past", "push through"],
  participate: ["join", "take part", "get involved"],
  perform: ["do", "carry out", "execute"],
  possess: ["have", "own", "hold"],
  present: ["show", "share", "offer"],
  prevent: ["stop", "block", "avoid"],
  prioritize: ["focus on", "put first", "rank"],
  produce: ["make", "create", "generate"],
  provide: ["give", "offer", "supply"],
  purchase: ["buy", "get", "pick up"],
  recognize: ["spot", "notice", "see"],
  recommend: ["suggest", "advise", "propose"],
  reduce: ["cut", "lower", "shrink"],
  remove: ["take out", "delete", "drop"],
  require: ["need", "call for", "demand"],
  resolve: ["fix", "solve", "sort out"],
  reveal: ["show", "uncover", "expose"],
  select: ["pick", "choose", "go with"],
  significant: ["big", "major", "notable"],
  suggest: ["hint", "propose", "recommend"],
  support: ["back", "help", "assist"],
  transform: ["change", "reshape", "overhaul"],
  utilize: ["use", "apply", "tap into"],
  // Common adjectives
  additional: ["extra", "more", "added"],
  adequate: ["enough", "sufficient", "decent"],
  appropriate: ["right", "fitting", "suitable"],
  beneficial: ["helpful", "useful", "good"],
  comprehensive: ["complete", "thorough", "full"],
  considerable: ["large", "significant", "big"],
  crucial: ["key", "vital", "critical"],
  customizable: ["flexible", "adjustable", "adaptable"],
  diverse: ["varied", "wide-ranging", "mixed"],
  effective: ["working", "proven", "solid"],
  efficient: ["fast", "streamlined", "smooth"],
  essential: ["vital", "key", "must-have"],
  excellent: ["great", "outstanding", "top-notch"],
  exceptional: ["outstanding", "remarkable", "impressive"],
  extensive: ["wide", "broad", "large"],
  fundamental: ["basic", "core", "key"],
  important: ["key", "vital", "major"],
  impressive: ["striking", "remarkable", "notable"],
  innovative: ["creative", "fresh", "new"],
  intricate: ["complex", "detailed", "involved"],
  meaningful: ["real", "valuable", "worthwhile"],
  meticulous: ["careful", "detailed", "thorough"],
  numerous: ["many", "plenty of", "lots of"],
  optimal: ["best", "ideal", "top"],
  paramount: ["top", "key", "highest"],
  pertinent: ["relevant", "related", "on-topic"],
  pivotal: ["key", "central", "critical"],
  plethora: ["lots", "tons", "plenty"],
  potential: ["possible", "likely", "would-be"],
  predominant: ["main", "leading", "top"],
  profound: ["deep", "strong", "powerful"],
  prominent: ["leading", "well-known", "top"],
  robust: ["strong", "solid", "tough"],
  seamless: ["smooth", "easy", "effortless"],
  straightforward: ["simple", "easy", "clear"],
  substantial: ["large", "big", "major"],
  sufficient: ["enough", "adequate", "plenty"],
  superior: ["better", "top", "stronger"],
  tremendous: ["huge", "massive", "enormous"],
  unparalleled: ["unmatched", "unique", "one of a kind"],
  valuable: ["useful", "helpful", "worthwhile"],
  vast: ["huge", "enormous", "massive"],
  // Common adverbs
  additionally: ["also", "plus", "on top of that"],
  approximately: ["about", "around", "roughly"],
  consequently: ["so", "as a result", "therefore"],
  effectively: ["well", "properly", "successfully"],
  essentially: ["basically", "really", "at its core"],
  frequently: ["often", "regularly", "a lot"],
  furthermore: ["also", "plus", "what's more"],
  generally: ["usually", "typically", "mostly"],
  however: ["but", "still", "yet"],
  immediately: ["right away", "instantly", "at once"],
  moreover: ["also", "plus", "besides"],
  nevertheless: ["still", "even so", "but"],
  notably: ["especially", "particularly", "in particular"],
  particularly: ["especially", "mainly", "notably"],
  predominantly: ["mainly", "mostly", "largely"],
  primarily: ["mainly", "mostly", "chiefly"],
  significantly: ["greatly", "a lot", "noticeably"],
  subsequently: ["then", "after that", "later"],
  therefore: ["so", "thus", "hence"],
  ultimately: ["in the end", "finally", "eventually"],
  undoubtedly: ["clearly", "no doubt", "for sure"],
};

/* ── AI PHRASE REPLACEMENTS ───────────────────────────── */
const AI_PHRASES: Array<[RegExp, string[]]> = [
  [/\bin today'?s (?:digital |modern )?(?:landscape|world|era|age)\b/gi, ["today", "these days", "right now"]],
  [/\bit is (?:important|worth|essential) to note (?:that )?/gi, ["note that ", "keep in mind, ", ""]],
  [/\bit is worth (?:mentioning|noting) (?:that )?/gi, ["also, ", "notably, ", ""]],
  [/\bplays a (?:crucial|vital|key|important|significant|pivotal) role\b/gi, ["matters a lot", "is key", "is really important"]],
  [/\ba wide (?:range|variety|array) of\b/gi, ["many", "lots of", "various"]],
  [/\bin order to\b/gi, ["to"]],
  [/\bdue to the fact that\b/gi, ["because", "since"]],
  [/\bat the end of the day\b/gi, ["ultimately", "in the end"]],
  [/\bit goes without saying\b/gi, ["clearly", "obviously"]],
  [/\bneedless to say\b/gi, ["clearly", "obviously"]],
  [/\bin terms of\b/gi, ["regarding", "about", "for"]],
  [/\bon the other hand\b/gi, ["but", "then again", "however"]],
  [/\bas a result\b/gi, ["so", "because of this"]],
  [/\bin conclusion\b/gi, ["to sum up", "overall", "all in all"]],
  [/\bfirst and foremost\b/gi, ["first", "mainly", "above all"]],
  [/\blast but not least\b/gi, ["finally", "also"]],
  [/\bone of the most\b/gi, ["a very", "a highly", "among the most"]],
  [/\bthere is no doubt that\b/gi, ["clearly,", "no question,"]],
  [/\bthe fact that\b/gi, ["that"]],
  [/\bin the realm of\b/gi, ["in", "within"]],
  [/\bserves as\b/gi, ["is", "works as", "acts as"]],
  [/\bthis is because\b/gi, ["because", "since", "the reason:"]],
  [/\bwith that being said\b/gi, ["that said", "still"]],
  [/\bhaving said that\b/gi, ["that said", "but", "however"]],
  [/\bin light of\b/gi, ["given", "considering"]],
  [/\bfor the purpose of\b/gi, ["to", "for"]],
  [/\bin the context of\b/gi, ["in", "within", "for"]],
  [/\bto a great extent\b/gi, ["largely", "mostly", "greatly"]],
  [/\bit is essential\b/gi, ["you need to", "it's vital"]],
  [/\btake into (?:consideration|account)\b/gi, ["consider", "think about"]],
  [/\bon a regular basis\b/gi, ["regularly", "often"]],
  [/\bin a timely manner\b/gi, ["quickly", "on time", "fast"]],
  [/\bat this point in time\b/gi, ["now", "currently"]],
  [/\ba (?:plethora|myriad) of\b/gi, ["many", "lots of", "tons of"]],
  [/\bcan be utilized\b/gi, ["works", "can be used"]],
  [/\bis able to\b/gi, ["can"]],
  [/\bhas the ability to\b/gi, ["can"]],
  [/\bin today'?s (?:fast-paced|rapidly evolving|ever-changing)\b/gi, ["in today's"]],
  [/\bdelve (?:into|deeper)\b/gi, ["look at", "dig into", "explore"]],
  [/\btap into\b/gi, ["use", "access"]],
  [/\bleverage\b/gi, ["use", "take advantage of"]],
  [/\bnavigate the (?:complexities|challenges)\b/gi, ["handle", "deal with", "work through"]],
  [/\bempowers? (?:users?|you|people|individuals)\b/gi, ["lets you", "helps you"]],
  [/\bunlock (?:the )?(?:full )?potential\b/gi, ["get the most out of", "make the most of"]],
  [/\bseamlessly integrate\b/gi, ["easily connect", "smoothly work with"]],
  [/\bcutting-edge\b/gi, ["latest", "modern", "new"]],
  [/\bstate-of-the-art\b/gi, ["latest", "modern", "advanced"]],
  [/\bgame-?changer\b/gi, ["big deal", "breakthrough", "major shift"]],
  [/\bparadigm shift\b/gi, ["big change", "major shift"]],
  [/\brobust (?:and )?(?:scalable )?\b/gi, ["strong ", "solid "]],
  [/\bfoster(?:s|ing)? (?:a )?(?:sense of )?/gi, ["build ", "grow ", "create "]],
  [/\bIt'?s important to remember\b/gi, ["Remember", "Keep in mind"]],
  [/\bBy doing so\b/gi, ["This way", "Doing this"]],
  [/\bThis allows for\b/gi, ["This lets you", "This makes"]],
  [/\bIn (?:essence|summary)\b/gi, ["Basically", "In short"]],
  [/\bAs we (?:move|look) (?:forward|ahead)\b/gi, ["Going forward", "From here"]],
];

/* ── CONTRACTION RULES ────────────────────────────────── */
const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bI am\b/g, "I'm"],
  [/\bI have\b/g, "I've"],
  [/\bI had\b/g, "I'd"],
  [/\bI will\b/g, "I'll"],
  [/\bI would\b/g, "I'd"],
  [/\byou are\b/gi, "you're"],
  [/\byou have\b/gi, "you've"],
  [/\byou will\b/gi, "you'll"],
  [/\byou would\b/gi, "you'd"],
  [/\bwe are\b/gi, "we're"],
  [/\bwe have\b/gi, "we've"],
  [/\bwe will\b/gi, "we'll"],
  [/\bthey are\b/gi, "they're"],
  [/\bthey have\b/gi, "they've"],
  [/\bthey will\b/gi, "they'll"],
  [/\bit is\b/gi, "it's"],
  [/\bit has\b/gi, "it's"],
  [/\bit will\b/gi, "it'll"],
  [/\bthat is\b/gi, "that's"],
  [/\bwhat is\b/gi, "what's"],
  [/\bthere is\b/gi, "there's"],
  [/\bhere is\b/gi, "here's"],
  [/\bwho is\b/gi, "who's"],
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bwill not\b/gi, "won't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bcan not\b/gi, "can't"],
  [/\bcannot\b/gi, "can't"],
  [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"],
  [/\bhas not\b/gi, "hasn't"],
  [/\bhave not\b/gi, "haven't"],
  [/\bhad not\b/gi, "hadn't"],
  [/\bwas not\b/gi, "wasn't"],
  [/\bwere not\b/gi, "weren't"],
  [/\blet us\b/gi, "let's"],
];

/* ── HELPERS ──────────────────────────────────────────── */
function pickOne(arr: string[], seed: number): string {
  return arr[Math.abs(seed) % arr.length];
}

function hashCode(s: string, pos: number): number {
  let h = pos * 31;
  for (let i = 0; i < s.length; i++) h = (h * 37 + s.charCodeAt(i)) | 0;
  return h;
}

function preserveCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement.toLowerCase();
}

/* ── REWRITE ENGINE ───────────────────────────────────── */
interface RewriteOptions {
  strength: number; // 0-100
  synonyms: boolean;
  aiPhrases: boolean;
  contractions: boolean;
}

interface RewriteResult {
  text: string;
  changes: Array<{ from: string; to: string; type: string }>;
}

function rewriteText(text: string, opts: RewriteOptions): RewriteResult {
  let result = text;
  const changes: RewriteResult["changes"] = [];
  const replaceChance = opts.strength / 100;

  // Step 1: Replace AI phrases
  if (opts.aiPhrases) {
    for (const [pattern, replacements] of AI_PHRASES) {
      result = result.replace(pattern, (match) => {
        const rep = pickOne(replacements, hashCode(match, 0));
        const final = preserveCase(match, rep);
        if (final.toLowerCase() !== match.toLowerCase()) {
          changes.push({ from: match, to: final, type: "AI Phrase" });
        }
        return final;
      });
    }
  }

  // Step 2: Add contractions
  if (opts.contractions) {
    for (const [pattern, contraction] of CONTRACTIONS) {
      result = result.replace(pattern, (match) => {
        const final = preserveCase(match, contraction);
        if (final !== match) {
          changes.push({ from: match, to: final, type: "Contraction" });
        }
        return final;
      });
    }
  }

  // Step 3: Synonym replacement
  if (opts.synonyms) {
    const words = result.split(/(\s+|[.,;:!?()\[\]{}"'—–-])/);
    let wordIndex = 0;
    const newWords = words.map((token) => {
      if (/^\s+$/.test(token) || /^[.,;:!?()\[\]{}"'—–-]+$/.test(token)) return token;
      wordIndex++;
      const lower = token.toLowerCase();
      const syns = SYN[lower];
      if (!syns) return token;

      // Probability based on strength
      const h = Math.abs(hashCode(lower, wordIndex));
      if ((h % 100) / 100 > replaceChance) return token;

      const replacement = pickOne(syns, h);
      const final = preserveCase(token, replacement);
      if (final.toLowerCase() !== lower) {
        changes.push({ from: token, to: final, type: "Synonym" });
      }
      return final;
    });
    result = newWords.join("");
  }

  // Step 4: Clean up double spaces and awkward punctuation
  result = result.replace(/ {2,}/g, " ");
  result = result.replace(/ ,/g, ",");
  result = result.replace(/ \./g, ".");
  result = result.replace(/\.\./g, ".");

  return { text: result.trim(), changes };
}

/* ── Score Gauge ──────────────────────────────────────── */
function MiniGauge({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{score}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────── */
export function PlagiarismRemoverTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [changes, setChanges] = useState<RewriteResult["changes"]>([]);
  const [strength, setStrength] = useState(50);
  const [options, setOptions] = useState({
    synonyms: true,
    aiPhrases: true,
    contractions: true,
  });
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const outWordCount = output.trim() ? output.trim().split(/\s+/).length : 0;

  const handleRewrite = useCallback(() => {
    if (wordCount < 20) return;
    setProcessing(true);
    setTimeout(() => {
      const result = rewriteText(input, { strength, ...options });
      setOutput(result.text);
      setChanges(result.changes);
      setProcessing(false);
      setShowChanges(false);
    }, 400);
  }, [input, strength, options, wordCount]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  }, [output]);

  const strengthLabel = strength <= 30 ? "Light" : strength <= 65 ? "Medium" : "Heavy";
  const strengthColor = strength <= 30 ? "text-green-500" : strength <= 65 ? "text-amber-500" : "text-red-500";

  const changeCounts = {
    synonym: changes.filter((c) => c.type === "Synonym").length,
    aiPhrase: changes.filter((c) => c.type === "AI Phrase").length,
    contraction: changes.filter((c) => c.type === "Contraction").length,
  };

  return (
    <div>
      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Paste Your Text</span>
          <span className="text-xs text-muted-foreground">
            {wordCount} words
            {wordCount > 0 && wordCount < 20 && <span className="text-amber-500 ml-2">Need at least 20 words</span>}
          </span>
        </div>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setOutput(""); setChanges([]); }}
          placeholder="Paste your AI-generated or potentially plagiarized text here...&#10;&#10;The tool will rewrite it to make it unique and human-sounding."
          className="w-full h-48 sm:h-56 bg-transparent border-0 resize-none outline-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
          spellCheck={false}
        />
      </div>

      {/* Options */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          {/* Strength slider */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Rewrite Strength</span>
              <span className={`text-xs font-bold ${strengthColor}`}>{strengthLabel} ({strength}%)</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>Light</span>
              <span>Heavy</span>
            </div>
          </div>

          {/* Toggle options */}
          <div className="flex flex-wrap gap-3">
            {[
              { key: "aiPhrases" as const, label: "Remove AI Phrases" },
              { key: "synonyms" as const, label: "Swap Synonyms" },
              { key: "contractions" as const, label: "Add Contractions" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options[opt.key]}
                  onChange={(e) => setOptions((p) => ({ ...p, [opt.key]: e.target.checked }))}
                  className="rounded border-border accent-primary"
                />
                <span className="text-xs font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex gap-2">
            {input && (
              <button
                onClick={() => { setInput(""); setOutput(""); setChanges([]); }}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1"
              >
                <RotateCcw size={12} /> Clear
              </button>
            )}
          </div>
          <button
            onClick={handleRewrite}
            disabled={wordCount < 20 || processing}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {processing ? <><Loader2 size={14} className="animate-spin" /> Rewriting...</> : <><Wand2 size={14} /> Rewrite Text</>}
          </button>
        </div>
      </div>

      {/* Output */}
      {output && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <MiniGauge score={changes.length} label="Total Changes" color="text-primary" />
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <MiniGauge score={changeCounts.aiPhrase} label="AI Phrases Fixed" color="text-rose-500" />
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <MiniGauge score={changeCounts.synonym} label="Words Swapped" color="text-blue-500" />
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <MiniGauge score={changeCounts.contraction} label="Contractions" color="text-green-500" />
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center col-span-2 sm:col-span-1">
              <MiniGauge score={outWordCount} label={`Words (was ${wordCount})`} color="text-muted-foreground" />
            </div>
          </div>

          {/* Rewritten text */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">Rewritten Text</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  {copied ? <><Check size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
            <textarea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              className="w-full h-48 sm:h-56 bg-transparent border-0 resize-none outline-none text-sm leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Changes list */}
          {changes.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <button
                onClick={() => setShowChanges(!showChanges)}
                className="w-full flex items-center justify-between text-sm font-semibold hover:text-primary transition-colors"
              >
                <span>Changes Made ({changes.length})</span>
                {showChanges ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showChanges && (
                <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
                  {changes.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/40">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        c.type === "AI Phrase" ? "bg-rose-500/10 text-rose-500"
                        : c.type === "Synonym" ? "bg-blue-500/10 text-blue-500"
                        : "bg-green-500/10 text-green-500"
                      }`}>
                        {c.type}
                      </span>
                      <span className="line-through text-muted-foreground">{c.from}</span>
                      <ArrowRight size={10} className="shrink-0 text-muted-foreground" />
                      <span className="font-medium">{c.to}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cross-link CTA */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Check your rewritten text</p>
              <p className="text-xs text-muted-foreground">Verify uniqueness and AI detection score</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/tools/plagiarism-checker"
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                Plagiarism Checker <ArrowRight size={12} />
              </Link>
              <Link
                href="/tools/ai-content-detector"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                AI Detector <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </>
      )}

      {!output && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          All processing happens in your browser. No text is sent to any server.
        </p>
      )}
    </div>
  );
}
