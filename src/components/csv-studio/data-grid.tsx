"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MARK, columnLetter, type CellRange, type ColumnInfo, type GridRow, type GridWindow } from "@/lib/csv-studio/types";
import styles from "./studio.module.css";

const BLOCK = 100;
const OVERSCAN_ROWS = 12;
const OVERSCAN_PX = 320;
const MIN_WIDTH = 92;
const MAX_WIDTH = 320;

export interface GridSelection { anchor: { row: number; column: number }; focus: { row: number; column: number } }
export interface DataGridHandle { focus(): void; scrollTo(row: number, column: number): void }

interface Props {
  version: number;
  rowCount: number;
  columns: ColumnInfo[];
  changedHeaders: Set<number>;
  compact: boolean;
  diff: boolean;
  selection: GridSelection;
  onSelection(selection: GridSelection): void;
  fetchWindow(start: number, count: number): Promise<GridWindow>;
  onEdit(row: number, column: number, value: string): void;
  onClear(range: CellRange): void;
  onCopy(range: CellRange): void;
  onColumnMenu(column: ColumnInfo, anchor: DOMRect): void;
  onColumnSelect(column: ColumnInfo): void;
  onAnnounce(message: string): void;
  label: string;
}

export function normalizeRange(selection: GridSelection): CellRange {
  return {
    top: Math.min(selection.anchor.row, selection.focus.row),
    bottom: Math.max(selection.anchor.row, selection.focus.row),
    left: Math.min(selection.anchor.column, selection.focus.column),
    right: Math.max(selection.anchor.column, selection.focus.column),
  };
}

function typeBadge(column: ColumnInfo): { text: string; tone: "protected" | "typed" } | null {
  if (column.profile) return { text: column.profile === "zip4" ? "ZIP+4" : column.profile === "zip" ? "ZIP" : "ID", tone: "protected" };
  switch (column.type) {
    case "text": return { text: "Text", tone: "protected" };
    case "integer": return { text: "Int", tone: "typed" };
    case "decimal": return { text: "Num", tone: "typed" };
    case "date": return { text: "Date", tone: "typed" };
    case "boolean": return { text: "Bool", tone: "typed" };
    default: return null;
  }
}

/** Room for the bold header label, optional type badge, menu button and padding. */
function headerWidth(column: ColumnInfo): number {
  const badge = typeBadge(column);
  return Math.max(column.name.length, 8) * 7.6 + 56 + (badge ? badge.text.length * 6.5 + 20 : 0);
}

function markName(mark: number): "error" | "warning" | "info" | undefined {
  if (mark & MARK.ERROR) return "error";
  if (mark & MARK.WARNING) return "warning";
  if (mark & MARK.INFO) return "info";
  return undefined;
}

function display(value: string): string {
  if (value.length > 400) value = `${value.slice(0, 400)}…`;
  return value.replace(/\r\n|\r|\n/g, " ↵ ").replace(/\t/g, " ⇥ ");
}

export const DataGrid = forwardRef<DataGridHandle, Props>(function DataGrid(props, ref) {
  const { version, rowCount, columns, compact, diff, selection, onSelection, fetchWindow, onEdit, onClear, onCopy, onAnnounce } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [viewport, setViewport] = useState({ top: 0, left: 0, width: 800, height: 480 });
  const [blocks, setBlocks] = useState<Map<number, GridRow[]>>(() => new Map());
  const requested = useRef(new Set<number>());
  const versionRef = useRef(version);
  const [widths, setWidths] = useState<Map<number, number>>(() => new Map());
  const [editing, setEditingState] = useState<{ row: number; column: number; value: string } | null>(null);
  const editingRef = useRef<{ row: number; column: number; value: string } | null>(null);
  const setEditing = (next: { row: number; column: number; value: string } | null) => { editingRef.current = next; setEditingState(next); };
  const dragging = useRef(false);
  const rowHeight = compact ? 24 : 32;
  const headHeight = 38;
  const gutter = 64;

  useEffect(() => {
    versionRef.current = version;
    requested.current.clear();
    setBlocks(new Map());
  }, [version]);

  const columnWidth = useCallback((column: ColumnInfo) => Math.min(Math.max(widths.get(column.key) ?? 0, headerWidth(column), MIN_WIDTH), MAX_WIDTH), [widths]);
  const offsets = useMemo(() => {
    const result: number[] = [0];
    for (const column of columns) result.push(result[result.length - 1] + columnWidth(column));
    return result;
  }, [columns, columnWidth]);
  const totalWidth = offsets[offsets.length - 1];

  const ensureBlock = useCallback((block: number) => {
    if (requested.current.has(block) || block < 0 || block * BLOCK >= rowCount) return;
    requested.current.add(block);
    const requestVersion = versionRef.current;
    fetchWindow(block * BLOCK, BLOCK).then((window) => {
      if (window.version !== versionRef.current || requestVersion !== versionRef.current) return;
      setBlocks((current) => {
        const next = new Map(current);
        next.set(block, window.rows);
        return next;
      });
      setWidths((current) => {
        let changed = false;
        const next = new Map(current);
        columns.forEach((column, index) => {
          if (next.has(column.key)) return;
          let longest = 0;
          for (const row of window.rows) {
            const value = row.cells[index];
            if (value) longest = Math.max(longest, Math.min(display(value).length, 60));
          }
          next.set(column.key, Math.round(longest * 7.2 + 26));
          changed = true;
        });
        return changed ? next : current;
      });
    }).catch(() => { requested.current.delete(block); });
  }, [columns, fetchWindow, rowCount]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setViewport({ top: root.scrollTop, left: root.scrollLeft, width: root.clientWidth, height: root.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const firstRow = Math.max(0, Math.floor((viewport.top - headHeight) / rowHeight) - OVERSCAN_ROWS);
  const lastRow = Math.min(rowCount - 1, Math.ceil((viewport.top + viewport.height) / rowHeight) + OVERSCAN_ROWS);
  let firstColumn = 0;
  while (firstColumn < columns.length - 1 && offsets[firstColumn + 1] < viewport.left - OVERSCAN_PX) firstColumn++;
  let lastColumn = firstColumn;
  while (lastColumn < columns.length - 1 && offsets[lastColumn] < viewport.left + viewport.width + OVERSCAN_PX) lastColumn++;

  useEffect(() => {
    if (rowCount === 0) return;
    for (let block = Math.floor(firstRow / BLOCK); block <= Math.floor(Math.max(lastRow, 0) / BLOCK); block++) ensureBlock(block);
  }, [firstRow, lastRow, ensureBlock, rowCount, version]);

  const rowAt = useCallback((row: number): GridRow | undefined => blocks.get(Math.floor(row / BLOCK))?.[row % BLOCK], [blocks]);
  const range = normalizeRange(selection);
  const active = selection.focus;

  const scrollTo = useCallback((row: number, column: number) => {
    const root = rootRef.current;
    if (!root) return;
    const top = headHeight + row * rowHeight;
    const bottom = top + rowHeight;
    if (top < root.scrollTop + headHeight) root.scrollTop = top - headHeight;
    else if (bottom > root.scrollTop + root.clientHeight) root.scrollTop = bottom - root.clientHeight;
    const left = offsets[column] ?? 0;
    const right = offsets[column + 1] ?? left;
    const visibleWidth = root.clientWidth - gutter;
    if (left < root.scrollLeft) root.scrollLeft = left;
    else if (right > root.scrollLeft + visibleWidth) root.scrollLeft = right - visibleWidth;
  }, [offsets, rowHeight]);

  useImperativeHandle(ref, () => ({ focus: () => rootRef.current?.focus({ preventScroll: true }), scrollTo }), [scrollTo]);

  const select = useCallback((row: number, column: number, extend: boolean) => {
    const target = { row: Math.max(0, Math.min(row, rowCount - 1)), column: Math.max(0, Math.min(column, columns.length - 1)) };
    onSelection({ anchor: extend ? selection.anchor : target, focus: target });
    scrollTo(target.row, target.column);
  }, [columns.length, onSelection, rowCount, scrollTo, selection.anchor]);

  useEffect(() => {
    if (!rowCount || !columns.length || document.activeElement !== rootRef.current) return;
    const row = rowAt(active.row);
    const column = columns[active.column];
    if (!column) return;
    const value = row?.cells[active.column];
    const shown = value === null ? "missing" : value === undefined ? "loading" : value === "" ? "empty" : display(value).slice(0, 80);
    onAnnounce(`Row ${active.row + 1}, ${column.name || `column ${columnLetter(active.column)}`}: ${shown}`);
  }, [active.row, active.column, columns, onAnnounce, rowAt, rowCount]);

  const startEdit = (initial?: string) => {
    const row = rowAt(active.row);
    if (!row) return;
    const value = initial ?? row.cells[active.column] ?? "";
    setEditing({ row: active.row, column: active.column, value });
  };

  useEffect(() => {
    if (!editing) return;
    const element = editorRef.current;
    if (!element) return;
    element.focus();
    const end = element.value.length;
    element.setSelectionRange(end, end);
  }, [editing]);

  const commit = (move: "down" | "right" | "left" | "none") => {
    const current = editingRef.current;
    if (!current) return;
    editingRef.current = null;
    const row = rowAt(current.row);
    const original = row?.cells[current.column] ?? "";
    const column = columns[current.column];
    if (column && current.value !== original) onEdit(current.row, column.key, current.value);
    setEditing(null);
    if (move === "none") return;
    rootRef.current?.focus({ preventScroll: true });
    if (move === "down") select(current.row + 1, current.column, false);
    else if (move === "right") select(current.row, current.column + 1, false);
    else if (move === "left") select(current.row, current.column - 1, false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing || !rowCount || !columns.length) return;
    const mod = event.ctrlKey || event.metaKey;
    const page = Math.max(1, Math.floor((viewport.height - headHeight) / rowHeight) - 1);
    const { row, column } = active;
    let handled = true;
    switch (event.key) {
      case "ArrowDown": select(mod ? rowCount - 1 : row + 1, column, event.shiftKey); break;
      case "ArrowUp": select(mod ? 0 : row - 1, column, event.shiftKey); break;
      case "ArrowRight": select(row, mod ? columns.length - 1 : column + 1, event.shiftKey); break;
      case "ArrowLeft": select(row, mod ? 0 : column - 1, event.shiftKey); break;
      case "PageDown": select(row + page, column, event.shiftKey); break;
      case "PageUp": select(row - page, column, event.shiftKey); break;
      case "Home": select(mod ? 0 : row, 0, event.shiftKey); break;
      case "End": select(mod ? rowCount - 1 : row, columns.length - 1, event.shiftKey); break;
      case "Tab":
        if (event.shiftKey) { if (column > 0) select(row, column - 1, false); else if (row > 0) select(row - 1, columns.length - 1, false); else handled = false; }
        else if (column < columns.length - 1) select(row, column + 1, false);
        else if (row < rowCount - 1) select(row + 1, 0, false);
        else handled = false;
        break;
      case "Enter": case "F2": startEdit(); break;
      case "Escape": onSelection({ anchor: active, focus: active }); break;
      case "Delete": case "Backspace": onClear(range); break;
      default:
        if (mod && event.key.toLowerCase() === "a") onSelection({ anchor: { row: 0, column: 0 }, focus: { row: rowCount - 1, column: columns.length - 1 } });
        else if (mod && event.key.toLowerCase() === "c") onCopy(range);
        else if (!mod && !event.altKey && event.key.length === 1) startEdit(event.key);
        else handled = false;
    }
    if (handled) event.preventDefault();
  };

  const cellFromPoint = (event: React.MouseEvent) => {
    const root = rootRef.current;
    if (!root) return null;
    const rect = root.getBoundingClientRect();
    const y = event.clientY - rect.top + root.scrollTop - headHeight;
    const x = event.clientX - rect.left + root.scrollLeft - gutter;
    if (y < 0 || x < 0) return null;
    const row = Math.floor(y / rowHeight);
    let column = 0;
    while (column < columns.length - 1 && offsets[column + 1] <= x) column++;
    if (row >= rowCount) return null;
    return { row, column };
  };

  const editorStyle = editing ? {
    top: headHeight + editing.row * rowHeight,
    left: gutter + offsets[editing.column],
    width: Math.max(columnWidth(columns[editing.column]), 220),
    height: /\n/.test(editing.value) ? Math.max(rowHeight * 3, 84) : rowHeight,
  } : undefined;

  const rows: React.ReactNode[] = [];
  if (rowCount > 0) {
    for (let index = firstRow; index <= lastRow; index++) {
      const data = rowAt(index);
      const top = headHeight + index * rowHeight;
      const selectedRow = index >= range.top && index <= range.bottom;
      const cells: React.ReactNode[] = [];
      for (let position = firstColumn; position <= lastColumn; position++) {
        const column = columns[position];
        const width = columnWidth(column);
        if (!data) { cells.push(<div key={column.key} className={styles.cell} style={{ width }} role="gridcell" aria-colindex={position + 2}><span className={styles.placeholder} /></div>); continue; }
        const value = data.cells[position];
        const mark = data.marks[position] ?? 0;
        const isActive = index === active.row && position === active.column;
        cells.push(
          <div
            key={column.key}
            id={isActive ? "csv-studio-active-cell" : undefined}
            role="gridcell"
            aria-colindex={position + 2}
            aria-selected={selectedRow && position >= range.left && position <= range.right}
            className={styles.cell}
            style={{ width }}
            data-missing={value === null || undefined}
            data-mark={markName(mark)}
            data-changed={mark & MARK.CHANGED ? "" : undefined}
            data-formula={mark & MARK.FORMULA ? "" : undefined}
            data-identifier={mark & MARK.IDENTIFIER ? "" : undefined}
            title={value && value.length > 30 ? value.slice(0, 500) : undefined}
            dir="auto"
          >{value ? display(value) : ""}</div>,
        );
      }
      const rowMark = data?.rowMark ?? 0;
      rows.push(
        <div key={index} role="row" aria-rowindex={index + 2} className={styles.row} data-alt={index % 2 === 1 || undefined} style={{ top, width: gutter + totalWidth }}>
          <div role="rowheader" className={styles.gutter} data-active={index === active.row || undefined} title={data?.line ? `Source line ${data.line.toLocaleString("en-US")}` : undefined}>
            <span className={styles.gutterMarks} aria-hidden="true">
              {rowMark & MARK.CHANGED ? <span className={`${styles.dot} ${styles.dotChanged}`} /> : null}
              {rowMark & MARK.ERROR ? <span className={`${styles.dot} ${styles.dotError}`} /> : rowMark & MARK.WARNING ? <span className={`${styles.dot} ${styles.dotWarning}`} /> : null}
            </span>
            {(index + 1).toLocaleString("en-US")}
          </div>
          <div className={styles.spacerCell} style={{ width: offsets[firstColumn] }} aria-hidden="true" />
          {cells}
        </div>,
      );
    }
  }

  return (
    <div className={styles.gridShell}>
      <div
        ref={rootRef}
        className={`${styles.gridRoot} ${diff ? styles.diff : ""}`}
        role="grid"
        aria-label={props.label}
        aria-rowcount={rowCount + 1}
        aria-colcount={columns.length + 1}
        aria-multiselectable="true"
        aria-activedescendant={!editing && rowAt(active.row) && active.row >= firstRow && active.row <= lastRow && active.column >= firstColumn && active.column <= lastColumn ? "csv-studio-active-cell" : undefined}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onScroll={(event) => {
          const element = event.currentTarget;
          setViewport((current) => (current.top === element.scrollTop && current.left === element.scrollLeft ? current : { ...current, top: element.scrollTop, left: element.scrollLeft }));
        }}
        onMouseDown={(event) => {
          if (event.button !== 0 || (event.target as HTMLElement).closest("button, textarea, input")) return;
          const cell = cellFromPoint(event);
          if (!cell) return;
          event.preventDefault();
          rootRef.current?.focus({ preventScroll: true });
          dragging.current = true;
          select(cell.row, cell.column, event.shiftKey);
        }}
        onMouseMove={(event) => {
          if (!dragging.current) return;
          const cell = cellFromPoint(event);
          if (cell && (cell.row !== selection.focus.row || cell.column !== selection.focus.column)) onSelection({ anchor: selection.anchor, focus: cell });
        }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        onDoubleClick={(event) => { if (cellFromPoint(event)) startEdit(); }}
      >
        <div className={styles.gridCanvas} style={{ width: gutter + totalWidth, height: headHeight + rowCount * rowHeight }}>
          <div role="row" aria-rowindex={1} className={styles.headRow} style={{ width: gutter + totalWidth }}>
            <div className={styles.corner} role="columnheader" aria-colindex={1}><span className={styles.srOnly}>Row number</span>#</div>
            <div className={styles.spacerCell} style={{ width: offsets[firstColumn] }} aria-hidden="true" />
            {columns.slice(firstColumn, lastColumn + 1).map((column, offset) => {
              const position = firstColumn + offset;
              const badge = typeBadge(column);
              const blank = !column.name.trim();
              return (
                <div key={column.key} role="columnheader" aria-colindex={position + 2} className={styles.headCell} style={{ width: columnWidth(column) }} data-active={position >= range.left && position <= range.right ? "" : undefined}>
                  <button type="button" className={styles.headLabel} data-blank={blank || undefined} data-changed={props.changedHeaders.has(column.key) || undefined} onClick={() => { props.onColumnSelect(column); onSelection({ anchor: { row: 0, column: position }, focus: { row: Math.max(rowCount - 1, 0), column: position } }); }} title={column.name || "Untitled column"}>
                    {blank ? `Untitled ${columnLetter(position)}` : column.name}
                  </button>
                  {badge && <span className={styles.typeBadge} data-protected={badge.tone === "protected" || undefined} data-typed={badge.tone === "typed" || undefined}>{badge.text}</span>}
                  <button type="button" className={styles.headMenu} aria-label={`Column options for ${column.name || `column ${columnLetter(position)}`}`} aria-haspopup="menu" onClick={(event) => props.onColumnMenu(column, event.currentTarget.getBoundingClientRect())}>
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
          {rows}
          {rowCount > 0 && (
            <div className={styles.selectionBox} aria-hidden="true" style={{
              top: headHeight + range.top * rowHeight,
              left: gutter + offsets[range.left],
              width: offsets[range.right + 1] - offsets[range.left],
              height: (range.bottom - range.top + 1) * rowHeight,
              display: range.top === range.bottom && range.left === range.right ? "none" : undefined,
            }} />
          )}
          {rowCount > 0 && !editing && (
            <div className={styles.activeCell} aria-hidden="true" style={{ top: headHeight + active.row * rowHeight, left: gutter + offsets[active.column], width: columnWidth(columns[active.column] ?? columns[0]), height: rowHeight }} />
          )}
          {editing && editorStyle && (
            <textarea
              ref={(element) => { editorRef.current = element; }}
              className={styles.editor}
              style={editorStyle}
              value={editing.value}
              aria-label={`Edit row ${editing.row + 1}, ${columns[editing.column]?.name || "column"}`}
              rows={1}
              spellCheck={false}
              onChange={(event) => setEditing({ ...editing, value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Escape") { event.preventDefault(); setEditing(null); rootRef.current?.focus({ preventScroll: true }); }
                else if (event.key === "Enter" && !event.shiftKey && !event.altKey) { event.preventDefault(); commit("down"); }
                else if (event.key === "Tab") { event.preventDefault(); commit(event.shiftKey ? "left" : "right"); }
              }}
              onBlur={() => commit("none")}
            />
          )}
        </div>
        {rowCount === 0 && <div className={styles.emptyGrid}>No data rows. The header is shown above.</div>}
      </div>
    </div>
  );
});
