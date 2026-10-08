export const SIMILARITY_LIMITS = {
  maxSources: 5,
  maxWords: 10_000,
  maxChars: 60_000,
  fileBytes: 256 * 1024,
  passagesPerSource: 150,
  sourceOccurrences: 20,
  repeatGroups: 150,
  occurrencesPerGroup: 100,
  timeoutMs: 15_000,
} as const;

export type MatchLength = 4 | 6 | 8 | 12;
export type CheckMode = "compare" | "repeat";

export interface MatchOptions {
  minWords: MatchLength;
  ignoreCase: boolean;
  excludeQuotes: boolean;
  excludeReferences: boolean;
}

export const DEFAULT_MATCH_OPTIONS: MatchOptions = {
  minWords: 6,
  ignoreCase: true,
  excludeQuotes: false,
  excludeReferences: false,
};

export interface SourceInput {
  id: string;
  label: string;
  text: string;
}

export interface TextRange {
  start: number;
  end: number;
}

export interface TextStats {
  totalWords: number;
  eligibleWords: number;
  excludedWords: number;
  characters: number;
}

export interface MatchingPassage {
  id: string;
  sourceId: string;
  draft: TextRange;
  source: TextRange;
  words: number;
}

export interface SourceResult {
  id: string;
  label: string;
  stats: TextStats;
  matchedWords: number;
  coverage: number | null;
  draftMatchedWords: number;
  /** Complete draft tokens matched by this source and no other source record. */
  exclusiveDraftWords: number;
  /** Complete draft tokens matched by this source and at least one other record. */
  sharedDraftWords: number;
  draftCoverage: number | null;
  draftRanges: TextRange[];
  sourceRanges: TextRange[];
  excludedRanges: TextRange[];
  passages: MatchingPassage[];
  passageCount: number;
}

export interface CompareResult {
  mode: "compare";
  options: MatchOptions;
  draft: {
    stats: TextStats;
    matchedWords: number;
    coverage: number | null;
    /** Complete eligible-token partition; duplicate source records count separately. */
    sourceOverlap: {
      singleSourceWords: number;
      multiSourceWords: number;
      unmatchedWords: number;
    };
    matchRanges: TextRange[];
    excludedRanges: TextRange[];
  };
  sources: SourceResult[];
  warnings: string[];
}

export interface RepeatedSentence {
  id: string;
  text: string;
  words: number;
  occurrences: TextRange[];
  occurrenceCount: number;
}

export interface RepeatResult {
  mode: "repeat";
  options: MatchOptions;
  stats: TextStats;
  groups: RepeatedSentence[];
  groupCount: number;
  repeatedOccurrences: number;
  excludedRanges: TextRange[];
  matchRanges: TextRange[];
  searchPassages: { id: string; text: string; range: TextRange; words: number }[];
  warnings: string[];
}

export type SimilarityResult = CompareResult | RepeatResult;

export interface CheckRequest {
  id: number;
  mode: CheckMode;
  draft: string;
  sources: SourceInput[];
  options: MatchOptions;
}

export type CheckResponse =
  | { id: number; result: SimilarityResult }
  | { id: number; error: string };

export interface ReviewNote {
  status: "unreviewed" | "cited" | "common" | "revise";
  note: string;
}

export interface ReportSnapshot {
  draft: string;
  sources: SourceInput[];
  result: SimilarityResult;
  reviews: Record<string, ReviewNote>;
}