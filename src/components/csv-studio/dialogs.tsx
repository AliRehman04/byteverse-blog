"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CornerDownLeft, Search, X, type LucideIcon } from "lucide-react";
import { STUDIO_LIMITS, type EncodingId, type EncodingLabResult } from "@/lib/csv-studio/types";
import styles from "./studio.module.css";

export function Modal({ open, title, onClose, children, footer, wide, className, labelledBy }: {
  open: boolean;
  title: string;
  onClose(): void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  className?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const previous = useRef<Element | null>(null);
  const openRef = useRef(open);
  const titleId = labelledBy ?? `csv-studio-dialog-${title.replace(/\W+/g, "-").toLowerCase()}`;
  useEffect(() => {
    openRef.current = open;
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      previous.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => () => { if (ref.current?.open) ref.current.close(); }, []);
  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.dialogWide : ""} ${className ?? ""}`}
      aria-labelledby={titleId}
      onClose={(event) => {
        // The close event is async; a parent that already moved on (e.g. opened another dialog) must not be told again.
        if (openRef.current) onClose();
        const element = previous.current as HTMLElement | null;
        const active = document.activeElement;
        // Only restore focus if the dialog's action didn't already move it somewhere useful.
        const unclaimed = !active || active === document.body || event.currentTarget.contains(active);
        if (unclaimed && element && element !== document.body && typeof element.focus === "function" && document.contains(element)) element.focus({ preventScroll: true });
      }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
    >
      {open && (
        <div className={styles.dialogInner}>
          {!labelledBy && (
            <div className={styles.dialogHead}>
              <h2 id={titleId}>{title}</h2>
              <button type="button" className={styles.iconButton} aria-label="Close dialog" onClick={() => ref.current?.close()}><X size={16} aria-hidden="true" /></button>
            </div>
          )}
          {children}
          {footer && <div className={styles.dialogFoot}>{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export interface PaletteAction { id: string; label: string; group: string; icon: LucideIcon; shortcut?: string; disabled?: boolean; run(): void }

export function CommandPalette({ open, onClose, actions }: { open: boolean; onClose(): void; actions: PaletteAction[] }) {
  return (
    <Modal open={open} title="Command palette" onClose={onClose} className={styles.palette} labelledBy="csv-studio-palette-title">
      <PaletteBody actions={actions} onClose={onClose} />
    </Modal>
  );
}

function PaletteBody({ onClose, actions }: { onClose(): void; actions: PaletteAction[] }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return actions.filter((action) => !action.disabled && words.every((word) => `${action.label} ${action.group}`.toLowerCase().includes(word)));
  }, [actions, query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);
  const run = (action: PaletteAction | undefined) => {
    if (!action) return;
    onClose();
    window.setTimeout(() => action.run(), 0);
  };
  return (
    <>
      <h2 id="csv-studio-palette-title" className={styles.srOnly}>Command palette</h2>
      <div className={styles.paletteInput}>
        <Search size={18} aria-hidden="true" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="csv-studio-palette-list"
          aria-activedescendant={filtered[index] ? `csv-studio-action-${filtered[index].id}` : undefined}
          aria-label="Search commands"
          placeholder="Type a command…"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setIndex(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setIndex((value) => Math.min(value + 1, filtered.length - 1)); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setIndex((value) => Math.max(value - 1, 0)); }
            else if (event.key === "Enter") { event.preventDefault(); run(filtered[index]); }
          }}
        />
        <span className={styles.kbd}>Esc</span>
      </div>
      <div ref={listRef} id="csv-studio-palette-list" role="listbox" aria-label="Commands" className={styles.paletteList}>
        {filtered.length === 0 && <p className={styles.empty}>No matching command.</p>}
        {filtered.map((action, position) => {
          const header = position === 0 || filtered[position - 1].group !== action.group ? <div className={styles.paletteGroup} role="presentation">{action.group}</div> : null;
          const Icon = action.icon;
          return (
            <div key={action.id} role="presentation">
              {header}
              <div
                id={`csv-studio-action-${action.id}`}
                role="option"
                aria-selected={position === index}
                data-index={position}
                className={styles.paletteItem}
                onMouseEnter={() => setIndex(position)}
                onClick={() => run(action)}
              >
                <Icon size={16} aria-hidden={true} />
                {action.label}
                {action.shortcut ? <kbd className={styles.kbd}>{action.shortcut}</kbd> : position === index ? <CornerDownLeft size={14} aria-hidden={true} style={{ marginLeft: "auto" }} /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function highlight(line: string): React.ReactNode[] {
  return line.split(/(\ufffd)/).map((part, index) => (part === "\ufffd" ? <mark key={index} title="Replacement character: these bytes don’t fit this encoding">�</mark> : part));
}

type LabProps = { load(encodings: EncodingId[]): Promise<EncodingLabResult[]>; current: EncodingId; onChoose(encoding: EncodingId): void };

export function EncodingLab({ open, onClose, ...props }: LabProps & { open: boolean; onClose(): void }) {
  return (
    <Modal open={open} title="Encoding Lab" onClose={onClose} wide footer={<button type="button" className={styles.button} onClick={onClose}>Close</button>}>
      <LabBody {...props} />
    </Modal>
  );
}

const NARROW: EncodingId[] = ["utf-8", "windows-1252", "iso-8859-1"];
const WIDE: EncodingId[] = ["utf-8", "windows-1252", "iso-8859-1", "utf-16le", "utf-16be"];

function LabBody({ load, current, onChoose }: LabProps) {
  const [state, setState] = useState<{ wide: boolean; results: EncodingLabResult[] | null; error: string | null }>({ wide: false, results: null, error: null });
  const { wide, results, error } = state;
  useEffect(() => {
    let live = true;
    load(wide ? WIDE : NARROW)
      .then((next) => { if (live) setState((value) => ({ ...value, results: next, error: null })); })
      .catch((reason: Error) => { if (live) setState((value) => ({ ...value, results: null, error: reason.message })); });
    return () => { live = false; };
  }, [load, wide]);
  return (
      <div className={styles.dialogBody}>
        <p className={styles.hint}>The same original bytes, decoded different ways. Pick the version where names, accents and currency symbols read correctly. This is a comparison aid, not automatic detection: CSV files don’t record their encoding.</p>
        <label className={styles.check}><input type="checkbox" checked={wide} onChange={(event) => setState({ wide: event.target.checked, results: null, error: null })} /> Also try UTF-16 LE and BE</label>
        {error && <p className={styles.blocked} role="alert">{error}</p>}
        {!results && !error && <p className={styles.hint} role="status">Decoding a sample…</p>}
        {results && (
          <div className={styles.labGrid}>
            {results.map((result) => (
              <section key={result.encoding} className={styles.labCard} data-recommended={result.recommended || undefined} aria-label={result.label}>
                <div className={styles.labHead}>
                  <div>
                    <strong>{result.label}</strong>{" "}
                    <span>· {result.replacements} unreadable · {result.mojibake} garbled pattern{result.mojibake === 1 ? "" : "s"}{result.recommended ? " · fewest problems" : ""}</span>
                  </div>
                  {result.encoding === current
                    ? <span className={styles.pill}><Check size={12} aria-hidden="true" /> In use</span>
                    : <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => onChoose(result.encoding)}>Use {result.label} <ArrowRight size={13} aria-hidden="true" /></button>}
                </div>
                <pre className={styles.labLines} tabIndex={0}>{result.lines.length ? result.lines.map((line, index) => <span key={index}>{highlight(line)}{"\n"}</span>) : "(no text)"}</pre>
              </section>
            ))}
          </div>
        )}
      </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onClose }: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm(): void;
  onClose(): void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} footer={<>
      <button type="button" className={styles.button} onClick={onClose}>Cancel</button>
      <button type="button" className={danger ? styles.buttonDanger : styles.buttonPrimary} onClick={() => { onConfirm(); onClose(); }} autoFocus>{confirmLabel}</button>
    </>}>
      <div className={styles.dialogBody}>{body}</div>
    </Modal>
  );
}

export function PasteDialog({ open, onClose, onImport }: { open: boolean; onClose(): void; onImport(text: string): void }) {
  return (
    <Modal open={open} title="Paste table data" onClose={onClose} wide>
      <PasteBody onClose={onClose} onImport={onImport} />
    </Modal>
  );
}

function PasteBody({ onClose, onImport }: { onClose(): void; onImport(text: string): void }) {
  const [text, setText] = useState("");
  const tooLong = text.length > STUDIO_LIMITS.maxPasteChars;
  return (
    <>
      <div className={styles.dialogBody}>
        <label className={styles.field} htmlFor="csv-studio-paste">CSV, TSV or cells copied from a spreadsheet
          <textarea id="csv-studio-paste" className={styles.textarea} style={{ minHeight: 240 }} value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} autoFocus placeholder={"id,name,zip\n001,Ava,02115"} aria-describedby="csv-studio-paste-hint" />
        </label>
        <p id="csv-studio-paste-hint" className={tooLong ? styles.blocked : styles.hint}>{tooLong ? `That’s more than ${STUDIO_LIMITS.maxPasteChars.toLocaleString("en-US")} characters. Save it as a file and drop it here instead.` : `${text.length.toLocaleString("en-US")} characters · pasted text stays in this browser tab. Cells copied from Excel or Google Sheets are tab-separated, which Auto detects.`}</p>
      </div>
      <div className={styles.dialogFoot}>
        <button type="button" className={styles.button} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.buttonPrimary} disabled={!text.trim() || tooLong} onClick={() => { onImport(text); onClose(); }}>Inspect pasted data</button>
      </div>
    </>
  );
}

type GoToProps = { rowCount: number; columns: { name: string }[]; initial: { row: number; column: number }; onGo(row: number, column: number): void };

export function GoToDialog({ open, onClose, ...props }: GoToProps & { open: boolean; onClose(): void }) {
  return (
    <Modal open={open} title="Go to cell" onClose={onClose}>
      <GoToBody {...props} onClose={onClose} />
    </Modal>
  );
}

function GoToBody({ rowCount, columns, initial, onGo, onClose }: GoToProps & { onClose(): void }) {
  const [row, setRow] = useState(String(initial.row + 1));
  const [column, setColumn] = useState(Math.min(initial.column, Math.max(columns.length - 1, 0)));
  const value = Number(row);
  const valid = Number.isInteger(value) && value >= 1 && value <= rowCount;
  return (
      <form onSubmit={(event) => { event.preventDefault(); if (valid) { onGo(value - 1, column); onClose(); } }}>
      <div className={styles.dialogBody}>
        <div className={styles.fieldRow}>
          <label className={styles.field}>Row (1–{rowCount.toLocaleString("en-US")})
            <input className={styles.input} inputMode="numeric" value={row} onChange={(event) => setRow(event.target.value.replace(/[^\d]/g, ""))} autoFocus aria-invalid={!valid} />
          </label>
          <label className={styles.field}>Column
            <select className={styles.select} value={column} onChange={(event) => setColumn(Number(event.target.value))}>
              {columns.map((item, index) => <option key={index} value={index}>{item.name || `Untitled ${index + 1}`}</option>)}
            </select>
          </label>
        </div>
        {!valid && <p className={styles.hint} role="alert">Enter a row between 1 and {rowCount.toLocaleString("en-US")}.</p>}
      </div>
      <div className={styles.dialogFoot}>
        <button type="button" className={styles.button} onClick={onClose}>Cancel</button>
        <button type="submit" className={styles.buttonPrimary} disabled={!valid}>Go</button>
      </div>
      </form>
  );
}

export interface MenuItem { id: string; label: string; icon?: LucideIcon; danger?: boolean; disabled?: boolean; run(): void }

export function ColumnMenu({ anchor, items, onClose, label }: { anchor: DOMRect | null; items: MenuItem[]; onClose(): void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!anchor) return;
    const menu = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    menu?.querySelector<HTMLElement>("[role=menuitem]:not([aria-disabled=true])")?.focus();
    return () => {
      const active = document.activeElement;
      if (trigger && trigger !== document.body && document.contains(trigger) && (!active || active === document.body || menu?.contains(active))) trigger.focus({ preventScroll: true });
    };
  }, [anchor]);
  useEffect(() => {
    if (!anchor) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) onClose(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", onClose);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", escape); window.removeEventListener("resize", onClose); };
  }, [anchor, onClose]);
  if (!anchor) return null;
  const top = Math.min(anchor.bottom + 6, (typeof window !== "undefined" ? window.innerHeight : 800) - items.length * 36 - 16);
  const left = Math.min(Math.max(anchor.right - 232, 8), (typeof window !== "undefined" ? window.innerWidth : 1200) - 240);
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className={styles.dialog}
      style={{ position: "fixed", top, left, width: 232, margin: 0, zIndex: 90, padding: 6, display: "block" }}
      onKeyDown={(event) => {
        const options = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])") ?? [])];
        if (!options.length) return;
        const index = options.indexOf(document.activeElement as HTMLElement);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          options[event.key === "Home" ? 0 : options.length - 1]?.focus();
        } else if (event.key === "Tab") onClose();
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            aria-disabled={item.disabled || undefined}
            tabIndex={-1}
            className={styles.paletteItem}
            style={{ height: 34, color: item.danger ? "var(--cs-danger)" : undefined, opacity: item.disabled ? 0.45 : undefined }}
            onClick={() => { if (item.disabled) return; onClose(); item.run(); }}
          >
            {Icon ? <Icon size={15} aria-hidden={true} /> : null}{item.label}
          </button>
        );
      })}
    </div>
  );
}
