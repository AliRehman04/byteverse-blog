import type { ReportSnapshot, ReviewNote, TextStats } from "./types";

export const REVIEW_LABELS: Record<ReviewNote["status"], string> = {
  unreviewed: "Not reviewed",
  cited: "Citation checked",
  common: "Common wording",
  revise: "Needs revision",
};

export function formatCoverage(value: number | null): string {
  if (value === null) return "N/A";
  if (value > 0 && value < 0.1) return "<0.1%";
  if (value < 100 && value > 99.9) return ">99.9%";
  return `${Number(value.toFixed(1))}%`;
}

const line = (text: string) => text.replace(/\s+/g, " ").trim();
const words = (stats: TextStats) => `${stats.totalWords} total; ${stats.eligibleWords} eligible; ${stats.excludedWords} excluded`;

export const REPORT_TEXT_BUDGET = 120_000;

export function needsCompactReport({ result, reviews }: ReportSnapshot): boolean {
  let length = 0;
  if (result.mode === "compare") {
    for (const source of result.sources) {
      length += source.label.length;
      for (const passage of source.passages) {
        length += passage.draft.end - passage.draft.start + passage.source.end - passage.source.start + (reviews[passage.id]?.note.length ?? 0);
        if (length > REPORT_TEXT_BUDGET) return true;
      }
    }
  } else {
    for (const group of result.groups) {
      length += group.text.length + (reviews[group.id]?.note.length ?? 0);
      if (length > REPORT_TEXT_BUDGET) return true;
    }
  }
  return length > REPORT_TEXT_BUDGET;
}

export function buildComparisonReport(snapshot: ReportSnapshot, requestedPassages = true): string {
  const { result, draft, sources, reviews } = snapshot;
  const compact = requestedPassages && needsCompactReport(snapshot);
  const includePassages = requestedPassages && !compact;
  const settings = result.options;
  const output = [
    "BYTEVERSE | TEXT SIMILARITY REVIEW",
    "https://www.byteverse.fyi/tools/plagiarism-checker",
    "",
    "Scope: local supplied-text matching, not a web/database scan or plagiarism verdict.",
    "No match does not prove originality. Quotes, common wording and cited passages can match.",
    "Reviewer labels/notes are user decisions, not verified by this tool. They never change coverage.",
    "",
    `Mode: ${result.mode === "compare" ? "Compare supplied sources" : "Find repeated sentences"}`,
    `Minimum consecutive words: ${settings.minWords}`,
    `Ignore case: ${settings.ignoreCase ? "yes" : "no"}`,
    `Exclude paired quotes: ${settings.excludeQuotes ? "yes" : "no"}`,
    `Exclude trailing reference section: ${settings.excludeReferences ? "yes" : "no"}`,
    "Normalization: Unicode NFKC, optional case folding, curly apostrophes normalized; punctuation and spacing ignored. Accents retained.",
    `Matched passages included: ${includePassages ? "yes" : "no (notes and text omitted)"}`,
    ...(compact ? ["TEXT BUDGET: Repeated evidence would exceed 120,000 characters. A stats-only report is used; source labels, passages and notes are omitted. Review full wording in the workspace."] : []),
    "",
  ];
  const addReview = (id: string) => {
    const review = reviews[id];
    output.push(`Reviewer status: ${REVIEW_LABELS[review?.status ?? "unreviewed"]}`);
    if (includePassages && review?.note.trim()) output.push(`Reviewer note: ${line(review.note)}`);
  };
  if (result.mode === "compare") {
    output.push(`DOCUMENT: ${words(result.draft.stats)}`, `Matched document words: ${result.draft.matchedWords}`, `Matched-document coverage: ${formatCoverage(result.draft.coverage)}`, "Each matched document word is counted once across all sources. Do not add source percentages.", "");
    const overlap = result.draft.sourceOverlap;
    output.push(`Matched in exactly one supplied source: ${overlap.singleSourceWords} words`, `Matched in multiple supplied sources: ${overlap.multiSourceWords} words`, `No qualifying match in supplied sources: ${overlap.unmatchedWords} eligible words`, "These categories partition eligible draft words, not the whole web. Duplicate source records count separately; shared wording does not identify an original author.", "");
    for (const [index, source] of result.sources.entries()) {
      const input = sources.find((entry) => entry.id === source.id);
      output.push(`SOURCE ${index + 1}: ${includePassages ? line(source.label) : `Label omitted`}`, `Source words: ${words(source.stats)}`, `Document coverage from this source: ${formatCoverage(source.draftCoverage)} (${source.draftMatchedWords} words)`, `Source covered by document: ${formatCoverage(source.coverage)} (${source.matchedWords} words)`, `Review passages: ${source.passages.length} shown of ${source.passageCount}`, "");
      output.push(`Matched only in this source: ${source.exclusiveDraftWords} document words`, `Also matched in other supplied sources: ${source.sharedDraftWords} document words`, "");
      for (const [passageIndex, passage] of source.passages.entries()) {
        output.push(`Passage ${passageIndex + 1}: ${passage.words} words`, `Document characters: ${passage.draft.start + 1}-${passage.draft.end}; source characters: ${passage.source.start + 1}-${passage.source.end} (UTF-16 positions)`);
        if (includePassages) output.push(`Document: ${draft.slice(passage.draft.start, passage.draft.end)}`, `Source: ${input?.text.slice(passage.source.start, passage.source.end) ?? "Unavailable"}`);
        addReview(passage.id);
        output.push("");
      }
    }
  } else {
    output.push(`DOCUMENT: ${words(result.stats)}`, `Repeated sentence groups: ${result.groupCount}`, `Copies beyond first occurrences: ${result.repeatedOccurrences}`, "No originality score is assigned.", "");
    for (const [index, group] of result.groups.entries()) {
      output.push(`Group ${index + 1}: ${group.words} words; ${group.occurrenceCount} occurrences`, `Occurrence positions shown: ${group.occurrences.map((range) => `${range.start + 1}-${range.end}`).join(", ")} (UTF-16 positions)`);
      if (includePassages) output.push(`Sentence: ${group.text}`);
      addReview(group.id);
      output.push("");
    }
  }
  output.push("METHOD & LIMITATIONS", ...result.warnings.map((warning) => `- ${warning}`));
  return output.join("\n");
}

export function buildComparisonHtmlReport(snapshot: ReportSnapshot, includePassages = true): string {
  const report = buildComparisonReport(snapshot, includePassages);
  const escaped = report.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const result = snapshot.result;
  const metric = result.mode === "compare" ? `${formatCoverage(result.draft.coverage)} matched-document coverage` : `${result.groupCount} repeated sentence groups`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>ByteVerse text similarity review</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#0f172a;font:16px/1.65 system-ui,sans-serif}main{max-width:920px;margin:40px auto;padding:40px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px}header{border-bottom:2px solid #2563eb;padding-bottom:24px;margin-bottom:24px}.brand{font-size:12px;font-weight:700;letter-spacing:.16em;color:#2563eb}h1{font-size:32px;line-height:1.2;letter-spacing:-.04em}p{margin:10px 0}.metric{font-size:20px;font-weight:700}.hint{color:#596573;font-size:13px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.85 ui-monospace,monospace;color:#0f172a}@page{margin:18mm}@media print{body{background:#ffffff}main{margin:0;border:0;border-radius:0;padding:0;max-width:none}.print-help{display:none}h1{font-size:25px}}@media(max-width:600px){main{margin:12px;padding:20px}h1{font-size:26px}}
  </style></head><body><main><header><p class="brand">BYTEVERSE / REVIEW RECORD</p><h1>Text similarity review</h1><p class="metric">${metric}</p><p>Supplied-text evidence. Not an originality certificate or a web scan.</p><p class="hint print-help">Use your browser's Print menu to print or save as PDF. Review the included text and notes before sharing.</p></header><pre>${escaped}</pre></main></body></html>`;
}