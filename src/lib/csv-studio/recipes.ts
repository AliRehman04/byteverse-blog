import type { ColumnInfo, ColumnType, DateFormat, IdentifierProfile, RepairOp } from "./types";

/** A repair recipe stores column rules and cleanup choices, never cell values. */
export interface Recipe {
  id: string;
  name: string;
  created: number;
  columns: { name: string; type: ColumnType; profile: IdentifierProfile | null; dateFormat: DateFormat | null }[];
  cleanups: RecipeCleanup[];
}
export type RecipeCleanup = "trim" | "normalizeSpaces" | "removeControls" | "stripBom" | "nfc" | "repairHeaders" | "removeBlankRows";

const KEY = "byteverse.csvStudio.recipes.v1";
const TYPES: ColumnType[] = ["auto", "text", "integer", "decimal", "date", "boolean"];
const PROFILES: IdentifierProfile[] = ["zip", "zip4", "phone", "account", "customer", "sku", "product", "employee", "invoice", "membership", "other"];
const FORMATS: DateFormat[] = ["MDY", "DMY", "YMD"];
const CLEANUPS: RecipeCleanup[] = ["trim", "normalizeSpaces", "removeControls", "stripBom", "nfc", "repairHeaders", "removeBlankRows"];

function valid(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Recipe;
  return typeof recipe.id === "string" && typeof recipe.name === "string" && recipe.name.length <= 80 && typeof recipe.created === "number"
    && Array.isArray(recipe.columns) && recipe.columns.length <= 500
    && recipe.columns.every((column) => column && typeof column.name === "string" && column.name.length <= 256 && TYPES.includes(column.type)
      && (column.profile === null || PROFILES.includes(column.profile)) && (column.dateFormat === null || FORMATS.includes(column.dateFormat)))
    && Array.isArray(recipe.cleanups) && recipe.cleanups.every((cleanup) => CLEANUPS.includes(cleanup));
}

export function loadRecipes(): Recipe[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(valid).slice(0, 20) : [];
  } catch {
    return [];
  }
}

function persist(recipes: Recipe[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(recipes.slice(0, 20)));
    return true;
  } catch {
    return false;
  }
}

export function saveRecipe(name: string, columns: ColumnInfo[], cleanups: RecipeCleanup[]): Recipe[] | null {
  const recipe: Recipe = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 80) || "Untitled recipe",
    created: Date.now(),
    columns: columns.filter((column) => column.type !== "auto" || column.profile).map((column) => ({ name: column.name, type: column.type, profile: column.profile, dateFormat: column.dateFormat })),
    cleanups: cleanups.filter((cleanup) => CLEANUPS.includes(cleanup)),
  };
  const next = [recipe, ...loadRecipes().filter((item) => item.name !== recipe.name)];
  return persist(next) ? next.slice(0, 20) : null;
}

export function deleteRecipe(id: string): Recipe[] {
  const next = loadRecipes().filter((recipe) => recipe.id !== id);
  persist(next);
  return next;
}

export function clearRecipes(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

/** Translate a recipe into one undoable batch for the current columns (matched by exact name). */
export function recipeOps(recipe: Recipe, columns: ColumnInfo[]): { op: RepairOp; matched: number; missing: string[] } {
  const ops: RepairOp[] = [];
  const missing: string[] = [];
  let matched = 0;
  for (const rule of recipe.columns) {
    const column = columns.find((item) => item.name === rule.name);
    if (!column) { missing.push(rule.name); continue; }
    matched++;
    ops.push({ kind: "setType", columns: [column.key], type: rule.type, profile: rule.profile, dateFormat: rule.dateFormat });
  }
  for (const cleanup of recipe.cleanups) {
    if (cleanup === "repairHeaders") ops.push({ kind: "repairHeaders", names: null });
    else if (cleanup === "removeBlankRows") ops.push({ kind: "removeBlankRows" });
    else ops.push({ kind: cleanup, columns: "all" });
  }
  return { op: { kind: "batch", label: `Apply recipe “${recipe.name}”`, ops }, matched, missing };
}
