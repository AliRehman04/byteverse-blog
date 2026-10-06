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
    for (const [index, source] of result.sources.entries()) {
      const input = sources.find((entry) => entry.id === source.id);
      output.push(`SOURCE ${index + 1}: ${includePassages ? line(source.label) : `Label omitted`}`, `Source words: ${words(source.stats)}`, `Document coverage from this source: ${formatCoverage(source.draftCoverage)} (${source.draftMatchedWords} words)`, `Source covered by document: ${formatCoverage(source.coverage)} (${source.matchedWords} words)`, `Review passages: ${source.passages.length} shown of ${source.passageCount}`, "");
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