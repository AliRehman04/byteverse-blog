"use client";

import { useState, useCallback } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";

const WORDS = [
  "lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit","sed","do",
  "eiusmod","tempor","incididunt","ut","labore","et","dolore","magna","aliqua","enim",
  "ad","minim","veniam","quis","nostrud","exercitation","ullamco","laboris","nisi",
  "aliquip","ex","ea","commodo","consequat","duis","aute","irure","in","reprehenderit",
  "voluptate","velit","esse","cillum","fugiat","nulla","pariatur","excepteur","sint",
  "occaecat","cupidatat","non","proident","sunt","culpa","qui","officia","deserunt",
  "mollit","anim","id","est","laborum","at","vero","eos","accusamus","iusto","odio",
  "dignissimos","ducimus","blanditiis","praesentium","voluptatum","deleniti","atque",
  "corrupti","quos","dolores","quas","molestias","excepturi","obcaecati","cupiditate",
  "provident","similique","mollitia","animi","fuga","harum","rerum","necessitatibus",
  "saepe","eveniet","aut","recusandae","perspiciatis","unde","omnis","iste","natus",
  "error","voluptatem","accusantium","doloremque","laudantium","totam","rem","aperiam",
  "eaque","ipsa","quae","ab","illo","inventore","veritatis","quasi","architecto",
  "beatae","vitae","dicta","explicabo","nemo","ipsam","voluptas","aspernatur",
  "odit","fugit","consequuntur","magni","dolorum","ratione","sequi","nesciunt",
  "neque","porro","quisquam","nihil","impedit","quo","minus","quod","maxime",
  "placeat","facere","possimus","assumenda","repellendus","temporibus","quibusdam",
  "illum","libero","tempore","soluta","nobis","eligendi","optio","cumque","nihil",
  "sapiente","delectus","reiciendis","voluptatibus","maiores","alias","perferendis",
  "doloribus","asperiores","repellat",
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSentence(minWords: number, maxWords: number): string {
  const len = randInt(minWords, maxWords);
  const sentence: string[] = [];
  for (let i = 0; i < len; i++) {
    sentence.push(WORDS[randInt(0, WORDS.length - 1)]);
  }
  sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1);
  return sentence.join(" ") + ".";
}

function generateParagraph(minSentences: number, maxSentences: number): string {
  const len = randInt(minSentences, maxSentences);
  const sentences: string[] = [];
  for (let i = 0; i < len; i++) {
    sentences.push(generateSentence(6, 16));
  }
  return sentences.join(" ");
}

function generateWords(count: number): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(WORDS[randInt(0, WORDS.length - 1)]);
  }
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
}

function generateSentences(count: number): string {
  const sentences: string[] = [];
  for (let i = 0; i < count; i++) {
    sentences.push(generateSentence(6, 16));
  }
  return sentences.join(" ");
}

function generateParagraphs(count: number, startWithLorem: boolean): string {
  const paragraphs: string[] = [];
  for (let i = 0; i < count; i++) {
    paragraphs.push(generateParagraph(3, 6));
  }
  if (startWithLorem && paragraphs.length > 0) {
    paragraphs[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " + paragraphs[0];
  }
  return paragraphs.join("\n\n");
}

type OutputType = "paragraphs" | "sentences" | "words";

export function LoremIpsumTool() {
  const [type, setType] = useState<OutputType>("paragraphs");
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [includeHtml, setIncludeHtml] = useState(false);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    let text = "";
    if (type === "paragraphs") {
      text = generateParagraphs(count, startWithLorem);
    } else if (type === "sentences") {
      text = generateSentences(count);
      if (startWithLorem) {
        text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " + text;
      }
    } else {
      text = generateWords(count);
      if (startWithLorem) {
        text = "Lorem ipsum dolor sit amet " + text.charAt(0).toLowerCase() + text.slice(1);
      }
    }

    if (includeHtml && type === "paragraphs") {
      text = text.split("\n\n").map((p) => `<p>${p}</p>`).join("\n\n");
    }

    setOutput(text);
  }, [type, count, startWithLorem, includeHtml]);

  const copy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const wordCount = output ? output.split(/\s+/).filter(Boolean).length : 0;
  const charCount = output.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Controls */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as OutputType)}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="paragraphs">Paragraphs</option>
              <option value="sentences">Sentences</option>
              <option value="words">Words</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Count</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={startWithLorem}
                onChange={(e) => setStartWithLorem(e.target.checked)}
                className="rounded border-border"
              />
              Start with &quot;Lorem&quot;
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={includeHtml}
                onChange={(e) => setIncludeHtml(e.target.checked)}
                className="rounded border-border"
              />
              Wrap in &lt;p&gt; tags
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={generate}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={14} /> Generate
          </button>
          <button
            onClick={copy}
            disabled={!output}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-40"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Generated Text</label>
          {output && (
            <span className="text-xs text-muted-foreground">{wordCount} words · {charCount} characters</span>
          )}
        </div>
        <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm min-h-[10rem] max-h-[30rem] overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {output || <span className="text-muted-foreground">Click &quot;Generate&quot; to create lorem ipsum text...</span>}
        </div>
      </div>
    </div>
  );
}
