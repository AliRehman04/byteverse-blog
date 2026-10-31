import type { ColumnInfo, ColumnType, DateFormat, IdentifierProfile } from "./types";

export type Cell = string | undefined;
export type ColumnValues = readonly Cell[];

export const ROW = { BLANK: 1, SHORT: 2, LONG: 4, MALFORMED: 8, UNCLOSED: 16, TRUNCATED: 32 } as const;

export interface ColumnState {
  readonly key: number;
  readonly name: string;
  /** Values indexed by physical row id. `undefined` = the source row had no field here. */
  readonly values: ColumnValues;
  /** Imported column index for 1:1 columns; null for split/merge results. */
  readonly source: number | null;
  readonly derived: boolean;
  readonly synthetic: boolean;
  readonly type: ColumnType;
  readonly profile: IdentifierProfile | null;
  readonly dateFormat: DateFormat | null;
  readonly hidden: boolean;
}

export interface TableState {
  readonly columns: readonly ColumnState[];
  /** Visible order → physical row id. */
  readonly rows: Int32Array;
  readonly physicalRows: number;
  /** Physical row id → source line (0 = created in the studio). */
  readonly lines: Int32Array;
  readonly nextKey: number;
}

/** Immutable import result. Reset always rebuilds from this. */
export interface ImportedTable {
  readonly headers: readonly string[];
  readonly headerWidth: number;
  readonly hasHeader: boolean;
  readonly columns: readonly ColumnValues[];
  readonly rowCount: number;
  readonly rowFlags: Uint8Array;
  readonly spans: Int32Array;
  readonly lines: Int32Array;
  readonly headerSpan: readonly [number, number] | null;
  readonly text: string;
}

export function initialState(imported: ImportedTable): TableState {
  const columns: ColumnState[] = imported.columns.map((values, index) => ({
    key: index,
    name: imported.hasHeader ? (imported.headers[index] ?? "") : `Column ${index + 1}`,
    values,
    source: index,
    derived: false,
    synthetic: !imported.hasHeader,
    type: "auto",
    profile: null,
    dateFormat: null,
    hidden: false,
  }));
  const rows = new Int32Array(imported.rowCount);
  for (let index = 0; index < rows.length; index++) rows[index] = index;
  return { columns, rows, physicalRows: imported.rowCount, lines: imported.lines, nextKey: columns.length };
}

export function visibleColumns(state: TableState): ColumnState[] {
  return state.columns.filter((column) => !column.hidden);
}

export function findColumn(state: TableState, key: number): ColumnState | undefined {
  return state.columns.find((column) => column.key === key);
}

export function originalValue(imported: ImportedTable, column: ColumnState, physical: number): Cell {
  if (column.source === null || physical >= imported.rowCount) return undefined;
  return imported.columns[column.source]?.[physical];
}

export function cellChanged(imported: ImportedTable, column: ColumnState, physical: number): boolean {
  if (column.source === null || physical >= imported.rowCount) return column.values[physical] !== undefined;
  return column.values[physical] !== imported.columns[column.source]?.[physical];
}

export function headerChanged(imported: ImportedTable, column: ColumnState): boolean {
  if (column.source === null) return true;
  const original = imported.hasHeader ? (imported.headers[column.source] ?? "") : `Column ${column.source + 1}`;
  return column.name !== original;
}

export function columnInfo(imported: ImportedTable, column: ColumnState): ColumnInfo {
  return {
    key: column.key,
    name: column.name,
    originalName: column.source === null ? null : imported.hasHeader ? (imported.headers[column.source] ?? "") : null,
    type: column.type,
    profile: column.profile,
    dateFormat: column.dateFormat,
    hidden: column.hidden,
    derived: column.derived,
    synthetic: column.synthetic,
  };
}

export function displayName(column: { name: string; key: number }, position: number): string {
  return column.name.trim() ? column.name : `Untitled column ${position + 1}`;
}

/** Copy-on-write helper: only allocates when the first change happens. */
export class ColumnWriter {
  private next: Cell[] | null = null;
  changed = 0;
  constructor(private readonly base: ColumnValues) {}
  set(physical: number, value: Cell): void {
    const current = (this.next ?? this.base)[physical];
    if (current === value) return;
    if (!this.next) this.next = this.base.slice();
    this.next[physical] = value;
    this.changed++;
  }
  get(physical: number): Cell {
    return (this.next ?? this.base)[physical];
  }
  result(): ColumnValues {
    return this.next ?? this.base;
  }
}

export function replaceColumn(state: TableState, key: number, patch: Partial<ColumnState>): TableState {
  return { ...state, columns: state.columns.map((column) => (column.key === key ? { ...column, ...patch } : column)) };
}
