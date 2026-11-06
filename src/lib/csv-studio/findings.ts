import type { Issue } from "./types";

export type FindingGroup = "decide" | "excel" | "cleanup" | "notes";

export const FINDING_GROUPS: readonly { id: FindingGroup; title: string; description: string }[] = [
  { id: "decide", title: "Needs your decision", description: "These change how rows or characters are read. Review them before you export." },
  { id: "excel", title: "Excel would change these values", description: "Keep these columns as text, or export Excel (.xlsx), which writes them as text cells." },
  { id: "cleanup", title: "Cleanups", description: "Spaces, header names, blank or duplicate rows. Every cleanup is previewed first and can be undone." },
  { id: "notes", title: "Notes", description: "No action is needed unless something looks wrong." },
];

const CLEANUP_CODES = new Set([
  "whitespace", "inner-whitespace", "control-chars", "bom", "bom-cells", "header-bom", "header-whitespace",
  "blank-header", "duplicate-header", "blank-rows", "duplicate-rows", "empty-column",
]);

/** Codes the one-step safe cleanup (trim, strip BOM, repair header names) can change. */
export const SAFE_CLEANUP_CODES = new Set(["whitespace", "bom-cells", "header-bom", "header-whitespace", "blank-header", "duplicate-header"]);

export function findingGroup(issue: Pick<Issue, "code" | "severity" | "category">): FindingGroup {
  if (issue.severity === "error") return "decide";
  if (CLEANUP_CODES.has(issue.code)) return "cleanup";
  if (issue.category === "identifier" || issue.category === "type" || issue.category === "security") return "excel";
  return issue.severity === "warning" ? "decide" : "notes";
}
