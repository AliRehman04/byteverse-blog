import { ColumnWriter, displayName, visibleColumns, type Cell, type ColumnState, type ImportedTable, type TableState } from "./table";
import { COLUMN_TYPE_LABELS, DATE_FORMAT_LABELS, PROFILE_LABELS, STUDIO_LIMITS, type RepairOp, type RepairPreview } from "./types";

export interface RepairResult { state: TableState; preview: RepairPreview }

interface Collector {
  cells: number;
  samples: RepairPreview["samples"];
  cell(row: number, column: ColumnState, position: number, before: Cell, after: Cell): void;
}

function collector(): Collector {
  return {
    cells: 0,
    samples: [],
    cell(row, column, position, before, after) {
      this.cells++;
      if (this.samples.length < STUDIO_LIMITS.previewSamples) this.samples.push({ row, column: displayName(column, position), before: before ?? null, after: after ?? null });
    },
  };
}

function emptyPreview(label: string, reason: string): RepairPreview {
  return { label, reason, cells: 0, rowsRemoved: 0, rowsAdded: 0, columnsAdded: 0, columnsRemoved: 0, samples: [], notes: [], blocked: null, headers: [] };
}

function blocked(label: string, message: string): never {
  throw Object.assign(new Error(message), { blockedLabel: label });
}

function positionOf(state: TableState, key: number): number {
  return visibleColumns(state).findIndex((column) => column.key === key);
}

function targets(state: TableState, columns: "all" | number[]): ColumnState[] {
  if (columns === "all") return visibleColumns(state);
  const keys = new Set(columns);
  return state.columns.filter((column) => keys.has(column.key));
}

function scopeLabel(state: TableState, columns: "all" | number[]): string {
  if (columns === "all") return "all columns";
  const names = targets(state, columns).map((column) => displayName(column, positionOf(state, column.key)));
  return names.length === 1 ? names[0] : `${names.length} columns`;
}

function withColumns(state: TableState, replacements: Map<number, Partial<ColumnState>>): TableState {
  if (!replacements.size) return state;
  return { ...state, columns: state.columns.map((column) => (replacements.has(column.key) ? { ...column, ...replacements.get(column.key) } : column)) };
}

function mapCells(state: TableState, columns: ColumnState[], fn: (value: string) => string, sink: Collector, includeHeaders: boolean, headerChanges: RepairPreview["headers"]): TableState {
  const replacements = new Map<number, Partial<ColumnState>>();
  for (const column of columns) {
    const position = positionOf(state, column.key);
    const writer = new ColumnWriter(column.values);
    for (let row = 0; row < state.rows.length; row++) {
      const physical = state.rows[row];
      const before = column.values[physical];
      if (!before) continue;
      const after = fn(before);
      if (after !== before) {
        writer.set(physical, after);
        sink.cell(row, column, position, before, after);
      }
    }
    const patch: { values?: ColumnState["values"]; name?: string } = {};
    if (writer.changed) patch.values = writer.result();
    if (includeHeaders && column.name) {
      const name = fn(column.name);
      if (name !== column.name) {
        patch.name = name;
        headerChanges.push({ column: column.key, before: column.name, after: name });
      }
    }
    if (Object.keys(patch).length) replacements.set(column.key, patch);
  }
  return withColumns(state, replacements);
}

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b\u2060]/g;
const UNICODE_SPACES = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g;

export function proposeHeaders(state: TableState): { column: number; before: string; after: string }[] {
  const columns = state.columns;
  const proposals: { column: number; before: string; after: string }[] = [];
  const used = new Set<string>();
  const cleaned = columns.map((column, index) => {
    const base = column.name.replace(/\ufeff/g, "").trim();
    return base || `Column ${index + 1}`;
  });
  cleaned.forEach((name, index) => {
    let candidate = name;
    for (let suffix = 2; used.has(candidate); suffix++) candidate = `${name} (${suffix})`;
    used.add(candidate);
    if (candidate !== columns[index].name) proposals.push({ column: columns[index].key, before: columns[index].name, after: candidate });
  });
  return proposals;
}

function safeRegexProblem(pattern: string): string | null {
  if (!pattern) return "Enter a pattern to find.";
  if (pattern.length > 200) return "Patterns are limited to 200 characters.";
  if (/\\[1-9]/.test(pattern)) return "Back-references aren’t supported in CSV Studio patterns.";
  if (/\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*[+*{]/.test(pattern)) return "Nested repetition such as (a+)+ can freeze the browser. Simplify the pattern.";
  try { new RegExp(pattern, "u"); } catch (error) { return `This isn’t a valid pattern: ${(error as Error).message}`; }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitParts(value: string, separator: string, maxParts: number): string[] {
  const parts: string[] = [];
  let start = 0;
  while (parts.length < maxParts - 1) {
    const index = value.indexOf(separator, start);
    if (index === -1) break;
    parts.push(value.slice(start, index));
    start = index + separator.length;
  }
  parts.push(value.slice(start));
  return parts;
}

function uniqueName(state: TableState, wanted: string, extra: Set<string> = new Set()): string {
  const used = new Set([...state.columns.map((column) => column.name), ...extra]);
  let candidate = wanted;
  for (let suffix = 2; used.has(candidate); suffix++) candidate = `${wanted} (${suffix})`;
  return candidate;
}

function blankRow(columns: readonly ColumnState[], physical: number): boolean {
  return columns.every((column) => !column.values[physical]);
}

function rowPreview(columns: readonly ColumnState[], physical: number): string {
  const text = columns.slice(0, 4).map((column) => column.values[physical] ?? "").join(" | ");
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function run(state: TableState, imported: ImportedTable, op: RepairOp): RepairResult {
  const sink = collector();
  const headers: RepairPreview["headers"] = [];
  const finish = (next: TableState, label: string, reason: string, extra: Partial<RepairPreview> = {}): RepairResult => ({
    state: next,
    preview: { ...emptyPreview(label, reason), cells: sink.cells, samples: sink.samples, headers, ...extra },
  });

  switch (op.kind) {
    case "trim": {
      const next = mapCells(state, targets(state, op.columns), (value) => value.trim(), sink, false, headers);
      return finish(next, `Trim whitespace in ${scopeLabel(state, op.columns)}`, "Removes spaces, tabs and line breaks at the start and end of values. Text inside the value is unchanged.");
    }
    case "normalizeSpaces": {
      const next = mapCells(state, targets(state, op.columns), (value) => value.replace(UNICODE_SPACES, " ").replace(/ {2,}/g, " "), sink, false, headers);
      return finish(next, `Normalize spaces in ${scopeLabel(state, op.columns)}`, "Turns no-break and other Unicode spaces into normal spaces and collapses repeated spaces. Tabs and line breaks stay.");
    }
    case "removeControls": {
      const next = mapCells(state, targets(state, op.columns), (value) => value.replace(CONTROL, ""), sink, false, headers);
      return finish(next, `Remove control characters in ${scopeLabel(state, op.columns)}`, "Removes invisible control characters. Tabs and line breaks inside values are kept.");
    }
    case "stripBom": {
      const next = mapCells(state, targets(state, op.columns), (value) => value.replace(/\ufeff/g, ""), sink, true, headers);
      return finish(next, `Strip byte-order marks in ${scopeLabel(state, op.columns)}`, "Removes the invisible U+FEFF mark from column names and values.");
    }
    case "nfc": {
      const next = mapCells(state, targets(state, op.columns), (value) => value.normalize("NFC"), sink, true, headers);
      return finish(next, `Normalize Unicode (NFC) in ${scopeLabel(state, op.columns)}`, "Combines letters and accents that were stored separately, so “é” matches “é”. Visible text doesn’t change.");
    }
    case "repairHeaders": {
      const proposals = proposeHeaders(state);
      const names = new Map<number, string>();
      for (const proposal of proposals) names.set(proposal.column, op.names?.[proposal.column] ?? proposal.after);
      if (op.names) for (const [key, value] of Object.entries(op.names)) names.set(Number(key), value);
      const replacements = new Map<number, Partial<ColumnState>>();
      for (const column of state.columns) {
        const name = names.get(column.key);
        if (name === undefined || name === column.name) continue;
        if (!name.trim()) return blocked("Repair header names", "Every repaired column name must contain text.");
        replacements.set(column.key, { name, synthetic: false });
        headers.push({ column: column.key, before: column.name, after: name });
      }
      const finalNames = state.columns.map((column) => replacements.get(column.key)?.name ?? column.name);
      if (new Set(finalNames).size !== finalNames.length) return blocked("Repair header names", "Two columns would still share a name. Choose unique names.");
      return finish(withColumns(state, replacements), "Repair header names", "Fills blank names, removes outer spaces and hidden marks, and makes duplicate names unique. Cell values are unchanged.");
    }
    case "removeBlankRows": {
      const columns = visibleColumns(state);
      const kept: number[] = [];
      let removed = 0;
      for (let row = 0; row < state.rows.length; row++) {
        const physical = state.rows[row];
        if (blankRow(columns, physical)) {
          removed++;
          if (sink.samples.length < STUDIO_LIMITS.previewSamples) sink.samples.push({ row, column: "Row", before: "(blank row)", after: null });
        } else kept.push(physical);
      }
      return finish(removed ? { ...state, rows: Int32Array.from(kept) } : state, "Remove blank rows", "Removes rows where every visible cell is empty. Rows with any value stay.", { rowsRemoved: removed });
    }
    case "removeDuplicateRows": {
      const columns = visibleColumns(state);
      const kept: number[] = [];
      const seen = new Map<string, number>();
      let removed = 0;
      for (let row = 0; row < state.rows.length; row++) {
        const physical = state.rows[row];
        if (blankRow(columns, physical)) { kept.push(physical); continue; }
        let key = "";
        for (const column of columns) {
          const value = column.values[physical];
          key += value === undefined ? "\u0000" : `${value}\u0001`;
        }
        const original = seen.get(key);
        if (original !== undefined) {
          removed++;
          if (sink.samples.length < STUDIO_LIMITS.previewSamples) sink.samples.push({ row, column: `Same as row ${(original + 1).toLocaleString("en-US")}`, before: rowPreview(columns, physical), after: null });
        } else {
          seen.set(key, row);
          kept.push(physical);
        }
      }
      return finish(removed ? { ...state, rows: Int32Array.from(kept) } : state, "Remove exact duplicate rows", "Keeps the first copy of each row and removes later rows that match it in every visible cell. Blank rows are handled separately.", { rowsRemoved: removed });
    }
    case "setType": {
      const replacements = new Map<number, Partial<ColumnState>>();
      const type = op.profile ? "text" : op.type;
      for (const column of targets(state, op.columns)) {
        replacements.set(column.key, { type, profile: op.profile, dateFormat: type === "date" ? op.dateFormat : null });
      }
      const label = op.profile ? `Keep ${scopeLabel(state, op.columns)} as text (${PROFILE_LABELS[op.profile]})`
        : `Set ${scopeLabel(state, op.columns)} to ${COLUMN_TYPE_LABELS[type]}${type === "date" && op.dateFormat ? ` · ${DATE_FORMAT_LABELS[op.dateFormat]}` : ""}`;
      const reason = type === "text" ? "Exports these cells as Excel text with Text format, so leading zeros and long IDs stay exact. Values are not changed."
        : type === "auto" ? "Exports the original text unchanged."
        : "Values that parse cleanly are exported as typed Excel cells; anything else stays text and is reported. Values in the grid are not changed.";
      return finish(withColumns(state, replacements), label, reason);
    }
    case "rename": {
      const column = state.columns.find((item) => item.key === op.column);
      if (!column) return blocked("Rename column", "That column no longer exists.");
      if (!op.name.trim()) return blocked("Rename column", "Enter a column name.");
      headers.push({ column: column.key, before: column.name, after: op.name });
      const duplicate = state.columns.some((item) => item.key !== column.key && item.name === op.name);
      return finish(withColumns(state, new Map([[column.key, { name: op.name, synthetic: false }]])), `Rename “${displayName(column, positionOf(state, column.key))}” to “${op.name}”`, "Changes only the column name.", { notes: duplicate ? ["Another column already uses this name."] : [] });
    }
    case "move": {
      const columns = [...state.columns];
      const from = columns.findIndex((item) => item.key === op.column);
      if (from === -1) return blocked("Move column", "That column no longer exists.");
      let to = from + op.offset;
      while (to >= 0 && to < columns.length && columns[to].hidden) to += op.offset;
      if (to < 0 || to >= columns.length) return blocked("Move column", "The column is already at the edge.");
      const [moved] = columns.splice(from, 1);
      columns.splice(to, 0, moved);
      return finish({ ...state, columns }, `Move “${displayName(moved, positionOf(state, moved.key))}” ${op.offset < 0 ? "left" : "right"}`, "Changes column order only.");
    }
    case "hide": {
      const column = state.columns.find((item) => item.key === op.column);
      if (!column) return blocked("Hide column", "That column no longer exists.");
      if (op.hidden && visibleColumns(state).length === 1) return blocked("Hide column", "At least one column must stay visible.");
      return finish(withColumns(state, new Map([[column.key, { hidden: op.hidden }]])), `${op.hidden ? "Hide" : "Show"} “${displayName(column, positionOf(state, column.key))}”`, op.hidden ? "Hidden columns stay in memory but are left out of exports unless you include them." : "The column is visible again.");
    }
    case "deleteColumn": {
      const column = state.columns.find((item) => item.key === op.column);
      if (!column) return blocked("Delete column", "That column no longer exists.");
      if (state.columns.length === 1) return blocked("Delete column", "A table needs at least one column.");
      let filled = 0;
      for (let row = 0; row < state.rows.length; row++) if (column.values[state.rows[row]]) filled++;
      return finish({ ...state, columns: state.columns.filter((item) => item.key !== op.column) }, `Delete column “${displayName(column, positionOf(state, column.key))}”`, "Removes the column from the working table. Undo or Reset brings it back.", { columnsRemoved: 1, cells: filled });
    }
    case "split": {
      const column = state.columns.find((item) => item.key === op.column);
      if (!column) return blocked("Split column", "That column no longer exists.");
      if (!op.separator) return blocked("Split column", "Enter the text to split on.");
      const maxParts = Math.min(Math.max(Math.trunc(op.maxParts), 2), 20);
      const parts: Cell[][] = [];
      let width = 1;
      let splitRows = 0;
      const position = positionOf(state, column.key);
      for (let row = 0; row < state.rows.length; row++) {
        const physical = state.rows[row];
        const value = column.values[physical];
        if (value === undefined) continue;
        const pieces = splitParts(value, op.separator, maxParts);
        if (pieces.length > 1) {
          splitRows++;
          if (sink.samples.length < STUDIO_LIMITS.previewSamples) sink.samples.push({ row, column: displayName(column, position), before: value, after: pieces.join("  ·  ") });
        }
        width = Math.max(width, pieces.length);
        parts[physical] = pieces;
      }
      if (width < 2) return blocked("Split column", `No value in this column contains “${op.separator}”.`);
      const added = new Set<string>();
      const created: ColumnState[] = Array.from({ length: width }, (_, index) => {
        const values: Cell[] = new Array(state.physicalRows);
        for (let physical = 0; physical < state.physicalRows; physical++) {
          const pieces = parts[physical];
          values[physical] = pieces ? (pieces[index] ?? "") : undefined;
        }
        const name = uniqueName(state, `${column.name || "Column"} ${index + 1}`, added);
        added.add(name);
        return { key: state.nextKey + index, name, values, source: null, derived: true, synthetic: false, type: "auto", profile: null, dateFormat: null, hidden: false };
      });
      const columns = [...state.columns];
      const at = columns.findIndex((item) => item.key === column.key);
      columns.splice(at + 1, 0, ...created);
      if (!op.keepSource) columns.splice(at, 1);
      sink.cells = splitRows;
      return finish({ ...state, columns, nextKey: state.nextKey + width }, `Split “${displayName(column, position)}” on “${op.separator}”`, `Creates ${width} new columns from the parts${op.keepSource ? " and keeps the original column" : " and removes the original column"}. Extra parts beyond ${maxParts} stay together in the last column.`, { columnsAdded: width, columnsRemoved: op.keepSource ? 0 : 1 });
    }
    case "merge": {
      const [leftKey, rightKey] = op.columns;
      const left = state.columns.find((item) => item.key === leftKey);
      const right = state.columns.find((item) => item.key === rightKey);
      if (!left || !right || left === right) return blocked("Merge columns", "Choose two different columns.");
      if (!op.name.trim()) return blocked("Merge columns", "Enter a name for the merged column.");
      const values: Cell[] = new Array(state.physicalRows);
      for (let physical = 0; physical < state.physicalRows; physical++) {
        const a = left.values[physical];
        const b = right.values[physical];
        values[physical] = a === undefined && b === undefined ? undefined : a && b ? `${a}${op.joiner}${b}` : (a || b || "");
      }
      for (let row = 0; row < state.rows.length && sink.samples.length < STUDIO_LIMITS.previewSamples; row++) {
        const physical = state.rows[row];
        sink.samples.push({ row, column: op.name, before: `${left.values[physical] ?? ""} + ${right.values[physical] ?? ""}`, after: values[physical] ?? null });
      }
      sink.cells = state.rows.length;
      const created: ColumnState = { key: state.nextKey, name: uniqueName(state, op.name), values, source: null, derived: true, synthetic: false, type: "auto", profile: null, dateFormat: null, hidden: false };
      let columns = [...state.columns];
      const at = Math.max(columns.indexOf(left), columns.indexOf(right));
      columns.splice(at + 1, 0, created);
      if (op.removeSources) columns = columns.filter((item) => item.key !== left.key && item.key !== right.key);
      return finish({ ...state, columns, nextKey: state.nextKey + 1 }, `Merge “${displayName(left, positionOf(state, left.key))}” and “${displayName(right, positionOf(state, right.key))}”`, `Joins the two values with “${op.joiner}”. When one side is empty, the other is used without a joiner.`, { columnsAdded: 1, columnsRemoved: op.removeSources ? 2 : 0 });
    }
    case "padLeft": {
      const column = state.columns.find((item) => item.key === op.column);
      if (!column) return blocked("Pad values", "That column no longer exists.");
      const length = Math.trunc(op.length);
      if (!Number.isFinite(length) || length < 2 || length > 64) return blocked("Pad values", "Type a target length between 2 and 64.");
      let skipped = 0;
      const next = mapCells(state, [column], (value) => {
        if (!/^\d+$/.test(value)) { skipped++; return value; }
        return value.length < length ? value.padStart(length, "0") : value;
      }, sink, false, headers);
      return finish(next, `Pad “${displayName(column, positionOf(state, column.key))}” to ${length} digits`, `Adds zeros on the left of digit-only values shorter than ${length} characters. Values with other characters are not touched.`, { notes: skipped ? [`${skipped.toLocaleString("en-US")} values contain non-digit characters and were left unchanged.`] : [] });
    }
    case "findReplace": {
      if (op.regex) {
        const problem = safeRegexProblem(op.find);
        if (problem) return blocked("Find and replace", problem);
      } else if (!op.find) return blocked("Find and replace", "Enter text to find.");
      const flags = `g${op.matchCase ? "" : "i"}u`;
      const source = op.regex ? op.find : escapeRegExp(op.find);
      const pattern = new RegExp(op.wholeCell ? `^(?:${source})$` : source, flags);
      let matches = 0;
      const next = mapCells(state, targets(state, op.columns), (value) => {
        pattern.lastIndex = 0;
        if (!pattern.test(value)) return value;
        pattern.lastIndex = 0;
        return value.replace(pattern, (...args: unknown[]) => {
          matches++;
          if (!op.regex) return op.replace;
          const offset = args.findIndex((arg, index) => index > 0 && typeof arg === "number");
          const groups = args.slice(1, offset) as (string | undefined)[];
          return op.replace.replace(/\$(\d)/g, (_, digit: string) => groups[Number(digit) - 1] ?? "");
        });
      }, sink, false, headers);
      return finish(next, `Replace “${op.find}” with “${op.replace}” in ${scopeLabel(state, op.columns)}`, `${op.wholeCell ? "Replaces whole cells that match exactly" : "Replaces every match inside cells"}${op.matchCase ? ", matching case" : ", ignoring case"}. Empty cells are not changed.`, { notes: [`${matches.toLocaleString("en-US")} match${matches === 1 ? "" : "es"} found.`] });
    }
    case "fillEmpty": {
      const column = state.columns.find((item) => item.key === op.column);
      if (!column) return blocked("Fill empty cells", "That column no longer exists.");
      if (!op.value) return blocked("Fill empty cells", "Type the value to put in empty cells.");
      const position = positionOf(state, column.key);
      const writer = new ColumnWriter(column.values);
      for (let row = 0; row < state.rows.length; row++) {
        const physical = state.rows[row];
        const before = column.values[physical];
        if (before) continue;
        writer.set(physical, op.value);
        sink.cell(row, column, position, before, op.value);
      }
      return finish(writer.changed ? withColumns(state, new Map([[column.key, { values: writer.result() }]])) : state, `Fill empty cells in “${displayName(column, position)}”`, `Puts “${op.value}” into empty and missing cells of this column only. Nothing is guessed.`);
    }
    case "editCells": {
      const columns = visibleColumns(state);
      const writers = new Map<number, ColumnWriter>();
      for (const edit of op.edits) {
        const column = state.columns.find((item) => item.key === edit.column);
        if (!column || edit.row < 0 || edit.row >= state.rows.length) return blocked("Edit cell", "That cell is no longer in the table.");
        if (edit.value.length > STUDIO_LIMITS.maxFieldChars) return blocked("Edit cell", "That value is too long.");
        const physical = state.rows[edit.row];
        let writer = writers.get(column.key);
        if (!writer) { writer = new ColumnWriter(column.values); writers.set(column.key, writer); }
        const before = writer.get(physical);
        if (before === edit.value) continue;
        writer.set(physical, edit.value);
        sink.cell(edit.row, column, columns.indexOf(column), before, edit.value);
      }
      const replacements = new Map<number, Partial<ColumnState>>();
      for (const [key, writer] of writers) if (writer.changed) replacements.set(key, { values: writer.result() });
      const first = sink.samples[0];
      const label = sink.cells === 1 && first ? `Edit ${first.column}, row ${(first.row + 1).toLocaleString("en-US")}` : `Edit ${sink.cells.toLocaleString("en-US")} cells`;
      return finish(withColumns(state, replacements), label, "Manual edit. The imported data is unchanged and Reset restores it.");
    }
    case "clearCells": {
      const columns = visibleColumns(state);
      const { top, bottom, left, right } = op.range;
      const replacements = new Map<number, Partial<ColumnState>>();
      for (let position = Math.max(left, 0); position <= Math.min(right, columns.length - 1); position++) {
        const column = columns[position];
        const writer = new ColumnWriter(column.values);
        for (let row = Math.max(top, 0); row <= Math.min(bottom, state.rows.length - 1); row++) {
          const physical = state.rows[row];
          const before = column.values[physical];
          if (!before) continue;
          writer.set(physical, "");
          sink.cell(row, column, position, before, "");
        }
        if (writer.changed) replacements.set(column.key, { values: writer.result() });
      }
      return finish(withColumns(state, replacements), `Clear ${sink.cells.toLocaleString("en-US")} cell${sink.cells === 1 ? "" : "s"}`, "Empties the selected cells in the working copy.");
    }
    case "demoteHeader": {
      const physical = state.physicalRows;
      const columns = state.columns.map((column, index) => {
        const values = column.values.slice();
        values[physical] = column.name;
        headers.push({ column: column.key, before: column.name, after: `Column ${index + 1}` });
        return { ...column, values, name: `Column ${index + 1}`, synthetic: true };
      });
      const rows = new Int32Array(state.rows.length + 1);
      rows[0] = physical;
      rows.set(state.rows, 1);
      const lines = new Int32Array(physical + 1);
      lines.set(state.lines.subarray(0, physical));
      return finish({ ...state, columns, rows, physicalRows: physical + 1, lines }, "Use first row as data", "Moves the current column names into a new first data row and names the columns Column 1, Column 2…", { rowsAdded: 1 });
    }
    case "batch": {
      let current = state;
      const preview = emptyPreview(op.label, "");
      const reasons: string[] = [];
      for (const step of op.ops) {
        const result = run(current, imported, step);
        current = result.state;
        preview.cells += result.preview.cells;
        preview.rowsRemoved += result.preview.rowsRemoved;
        preview.rowsAdded += result.preview.rowsAdded;
        preview.columnsAdded += result.preview.columnsAdded;
        preview.columnsRemoved += result.preview.columnsRemoved;
        preview.headers.push(...result.preview.headers);
        preview.notes.push(...result.preview.notes);
        for (const sample of result.preview.samples) if (preview.samples.length < STUDIO_LIMITS.previewSamples) preview.samples.push(sample);
        if (result.preview.cells || result.preview.rowsRemoved || result.preview.headers.length || result.preview.columnsAdded) reasons.push(result.preview.label);
      }
      preview.reason = reasons.length ? `Includes: ${reasons.join("; ")}.` : "Nothing needed changing.";
      return { state: current, preview };
    }
  }
}

/** Apply (or dry-run) a repair. Never mutates the input state or the imported table. */
export function applyRepair(state: TableState, imported: ImportedTable, op: RepairOp): RepairResult {
  try {
    return run(state, imported, op);
  } catch (error) {
    const label = (error as { blockedLabel?: string }).blockedLabel;
    if (!label) throw error;
    return { state, preview: { ...emptyPreview(label, ""), blocked: (error as Error).message } };
  }
}

