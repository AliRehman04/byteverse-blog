"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, CircleCheck, Eye, EyeOff, Info,
  ListChecks, Locate, OctagonAlert, Redo2, RotateCcw, Save, Search, ShieldCheck, Trash2, TriangleAlert, Undo2, X,
} from "lucide-react";
import { loadRecipes, deleteRecipe, saveRecipe, recipeOps, type Recipe, type RecipeCleanup } from "@/lib/csv-studio/recipes";
import {
  COLUMN_TYPE_LABELS, DATE_FORMAT_LABELS, PROFILE_LABELS,
  type CellDetail, type ColumnInfo, type ColumnProfile, type ColumnType, type DateFormat, type IdentifierProfile, type Issue, type RepairOp, type RepairPreview, type Severity, type StudioSnapshot,
} from "@/lib/csv-studio/types";
import styles from "./studio.module.css";

export type InspectorTab = "issues" | "column" | "changes";
export interface Review { op: RepairOp; preview: RepairPreview }

const SEVERITY_ICON = { error: OctagonAlert, warning: TriangleAlert, info: Info } as const;
const SEVERITY_LABEL: Record<Severity, string> = { error: "Errors", warning: "Warnings", info: "Info" };
const n = (value: number) => value.toLocaleString("en-US");

function SeverityIcon({ severity }: { severity: Severity }) {
  const Icon = SEVERITY_ICON[severity];
  return <span className={styles.sevIcon} data-severity={severity}><Icon size={16} aria-hidden="true" /><span className={styles.srOnly}>{severity}</span></span>;
}

interface IssuesProps {
  snapshot: StudioSnapshot;
  selected: string | null;
  onSelect(id: string | null): void;
  onLocate(issue: Issue, next: boolean): void;
  onFix(issue: Issue): void;
  onDismiss(issue: Issue, dismissed: boolean): void;
}

export function IssuesTab({ snapshot, selected, onSelect, onLocate, onFix, onDismiss }: IssuesProps) {
  const [severities, setSeverities] = useState<Record<Severity, boolean>>({ error: true, warning: true, info: true });
  const [column, setColumn] = useState("all");
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const dismissed = useMemo(() => new Set(snapshot.dismissed), [snapshot.dismissed]);
  const open = snapshot.issues.filter((issue) => !dismissed.has(issue.id));
  const counts = { error: 0, warning: 0, info: 0 } as Record<Severity, number>;
  for (const issue of open) counts[issue.severity]++;
  const columnsWithIssues = [...new Map(open.filter((issue) => issue.column !== null).map((issue) => [issue.column, issue.columnName])).entries()];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = open.filter((issue) => severities[issue.severity]
    && (column === "all" || (column === "file" ? issue.column === null : String(issue.column) === column))
    && words.every((word) => `${issue.name} ${issue.columnName ?? ""} ${issue.category} ${issue.explanation}`.toLowerCase().includes(word)));

  const moveFocus = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-issue]") ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    event.preventDefault();
    buttons[Math.min(Math.max(index + (event.key === "ArrowDown" ? 1 : -1), 0), buttons.length - 1)]?.focus();
  };

  return (
    <div className={styles.panelBody}>
      <div className={styles.severityFilters} role="group" aria-label="Filter by severity">
        {(["error", "warning", "info"] as Severity[]).map((severity) => (
          <button key={severity} type="button" className={styles.severityChip} data-severity={severity} aria-pressed={severities[severity]} onClick={() => setSeverities((current) => ({ ...current, [severity]: !current[severity] }))}>
            <span><SeverityIcon severity={severity} />{SEVERITY_LABEL[severity]}</span>
            <strong>{n(counts[severity])}</strong>
          </button>
        ))}
      </div>
      <div className={styles.issueTools}>
        <label className={styles.searchBox}>
          <span className={styles.srOnly}>Search issues</span>
          <Search size={14} aria-hidden="true" />
          <input className={styles.input} type="search" placeholder="Search issues" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          <span className={styles.srOnly}>Filter by column</span>
          <select className={styles.select} value={column} onChange={(event) => setColumn(event.target.value)}>
            <option value="all">All columns</option>
            <option value="file">Whole file</option>
            {columnsWithIssues.map(([key, name]) => <option key={String(key)} value={String(key)}>{name}</option>)}
          </select>
        </label>
      </div>
      {open.length === 0 ? (
        <div className={styles.empty} role="status">
          <CircleCheck size={28} aria-hidden="true" />
          <strong>No open issues</strong>
          <p>Structure, encoding, identifiers, formulas, whitespace and duplicates were checked. Export when you’re ready.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className={styles.hint} role="status">No issues match these filters.</p>
      ) : (
        <ul ref={listRef} className={styles.issueList} aria-label="Issues" onKeyDown={moveFocus}>
          {visible.map((issue) => {
            const current = issue.id === selected;
            return (
              <li key={issue.id}>
                <button type="button" data-issue className={styles.issueItem} aria-current={current} aria-expanded={current} onClick={() => { onSelect(current ? null : issue.id); if (!current && issue.locatable) onLocate(issue, false); }}>
                  <SeverityIcon severity={issue.severity} />
                  <span>
                    <strong>{issue.name}</strong>
                    <small>{issue.columnName ?? "Whole file"}{issue.row !== null ? ` · first at row ${n(issue.row + 1)}` : ""}</small>
                  </span>
                  <span className={styles.count}>{n(issue.count)}<span className={styles.srOnly}> affected</span></span>
                </button>
                {current && <IssueDetail issue={issue} onLocate={onLocate} onFix={onFix} onDismiss={onDismiss} />}
              </li>
            );
          })}
        </ul>
      )}
      {dismissed.size > 0 && (
        <details className={styles.dismissed}>
          <summary>Dismissed ({snapshot.issues.filter((issue) => dismissed.has(issue.id)).length})</summary>
          <ul className={styles.issueList}>
            {snapshot.issues.filter((issue) => dismissed.has(issue.id)).map((issue) => (
              <li key={issue.id} className={styles.issueItem} style={{ gridTemplateColumns: "18px minmax(0,1fr) auto" }}>
                <SeverityIcon severity={issue.severity} />
                <span><strong>{issue.name}</strong><small>{issue.columnName ?? "Whole file"}</small></span>
                <button type="button" className={`${styles.buttonQuiet} ${styles.small}`} onClick={() => onDismiss(issue, false)}>Restore</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function IssueDetail({ issue, onLocate, onFix, onDismiss }: { issue: Issue; onLocate(issue: Issue, next: boolean): void; onFix(issue: Issue): void; onDismiss(issue: Issue, dismissed: boolean): void }) {
  return (
    <div className={styles.issueDetail}>
      <p>{issue.explanation}</p>
      {issue.examples.length > 0 && (
        <div>
          <p className={styles.label}>Examples</p>
          <div className={styles.examples}>{issue.examples.map((example) => <code key={example} className={styles.example}>{example}</code>)}</div>
        </div>
      )}
      <div><p className={styles.label}>Suggested action</p><p>{issue.proposedAction}</p></div>
      <div><p className={styles.label}>What changes</p><p>{issue.expectedEffect}</p></div>
      <div className={styles.actions}>
        {issue.fix && <button type="button" className={`${styles.buttonPrimary} ${styles.small}`} onClick={() => onFix(issue)}>{issue.fix.label}</button>}
        {issue.locatable && <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => onLocate(issue, true)}><Locate size={13} aria-hidden="true" /> Next cell</button>}
        {issue.dismissible && <button type="button" className={`${styles.buttonQuiet} ${styles.small}`} onClick={() => onDismiss(issue, true)}>Dismiss</button>}
      </div>
    </div>
  );
}

interface ColumnTabProps {
  snapshot: StudioSnapshot;
  column: ColumnInfo | null;
  position: number;
  cell: CellDetail | null;
  profile: ColumnProfile | null;
  focusTool: { tool: "pad" | "find" | "rename"; find?: string } | null;
  onApply(op: RepairOp): void;
  onPreview(op: RepairOp): void;
  onDelete(column: ColumnInfo): void;
}

function Tool({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className={styles.toolCard} open={open}>
      <summary>{title}<ChevronRight size={15} aria-hidden="true" /></summary>
      {children}
    </details>
  );
}

export function ColumnTab({ snapshot, column, position, cell, profile, focusTool, onApply, onPreview, onDelete }: ColumnTabProps) {
  const [name, setName] = useState(column?.name ?? "");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [regex, setRegex] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeCell, setWholeCell] = useState(false);
  const [scope, setScope] = useState<"column" | "all">("column");
  const [separator, setSeparator] = useState(",");
  const [parts, setParts] = useState("2");
  const [keepSource, setKeepSource] = useState(true);
  const [mergeWith, setMergeWith] = useState<number | null>(null);
  const [joiner, setJoiner] = useState(" ");
  const [mergeName, setMergeName] = useState("");
  const [removeSources, setRemoveSources] = useState(false);
  const [padLength, setPadLength] = useState("");
  const [fill, setFill] = useState("");
  const padRef = useRef<HTMLInputElement>(null);
  const findRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const nameKey = column ? `${column.key}:${column.name}` : "";
  const [nameSource, setNameSource] = useState(nameKey);
  if (nameKey !== nameSource) { setNameSource(nameKey); setName(column?.name ?? ""); }
  const [seenTool, setSeenTool] = useState<ColumnTabProps["focusTool"]>(null);
  if (focusTool !== seenTool) {
    setSeenTool(focusTool);
    if (focusTool?.tool === "find") { setFind(focusTool.find ?? ""); setWholeCell(true); setScope("column"); }
  }
  useEffect(() => {
    if (!focusTool) return;
    const timer = window.setTimeout(() => (focusTool.tool === "pad" ? padRef : focusTool.tool === "find" ? findRef : nameRef).current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [focusTool]);

  if (!column) return <div className={styles.panelBody}><p className={styles.hint}>Select a cell or a column header to see its type, Excel risk and tools.</p></div>;
  const visible = snapshot.columns.filter((item) => !item.hidden);
  const others = visible.filter((item) => item.key !== column.key);
  const protectedColumn = column.type === "text" || column.profile !== null;
  const setType = (type: ColumnType, profile: IdentifierProfile | null, dateFormat: DateFormat | null) => onApply({ kind: "setType", columns: [column.key], type, profile, dateFormat });
  const label = column.name || `Untitled column ${position + 1}`;
  const merge = others.some((item) => item.key === mergeWith) ? mergeWith : others[0]?.key ?? null;

  return (
    <div className={styles.panelBody}>
      <section className={styles.section} aria-label="Column settings">
        <form className={styles.inline} onSubmit={(event) => { event.preventDefault(); if (name.trim() && name !== column.name) onApply({ kind: "rename", column: column.key, name: name.trim() }); }}>
          <label className={styles.field}>Column name
            <input ref={nameRef} className={styles.input} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <button type="submit" className={`${styles.button}`} disabled={!name.trim() || name === column.name}>Rename</button>
        </form>
        <div className={styles.fieldRow}>
          <label className={styles.field}>Type
            <select className={styles.select} value={column.profile ? "text" : column.type} onChange={(event) => {
              const type = event.target.value as ColumnType;
              setType(type, null, type === "date" ? column.dateFormat ?? "MDY" : null);
            }}>
              {(Object.keys(COLUMN_TYPE_LABELS) as ColumnType[]).map((type) => <option key={type} value={type}>{COLUMN_TYPE_LABELS[type]}</option>)}
            </select>
          </label>
          <label className={styles.field}>Identifier profile
            <select className={styles.select} value={column.profile ?? ""} onChange={(event) => setType("text", (event.target.value || null) as IdentifierProfile | null, null)}>
              <option value="">None</option>
              {(Object.keys(PROFILE_LABELS) as IdentifierProfile[]).map((profile) => <option key={profile} value={profile}>{PROFILE_LABELS[profile]}</option>)}
            </select>
          </label>
        </div>
        {column.type === "date" && (
          <label className={styles.field}>Date format in this column
            <select className={styles.select} value={column.dateFormat ?? "MDY"} onChange={(event) => setType("date", null, event.target.value as DateFormat)}>
              {(Object.keys(DATE_FORMAT_LABELS) as DateFormat[]).map((format) => <option key={format} value={format}>{DATE_FORMAT_LABELS[format]}</option>)}
            </select>
          </label>
        )}
        {!protectedColumn && <button type="button" className={`${styles.button} ${styles.block}`} onClick={() => setType("text", profile?.suggestion.profile ?? null, null)}><ShieldCheck size={15} aria-hidden="true" /> Keep as text{profile?.suggestion.profile ? ` (${PROFILE_LABELS[profile.suggestion.profile]})` : ""}</button>}
        <p className={styles.hint}>Type settings change how the Excel export writes cells. Values in the grid stay exactly as they are.</p>
      </section>

      {profile && (
        <section className={styles.section} aria-label="Excel preview risk">
          <h3 className={styles.sectionTitle}>Excel preview risk</h3>
          {profile.risk.asNumber && <p className={styles.risk}><TriangleAlert size={15} aria-hidden="true" />{profile.risk.asNumber}</p>}
          <p className={`${styles.risk} ${styles.riskSafe}`}><ShieldCheck size={15} aria-hidden="true" />{profile.risk.asText}</p>
          <dl className={styles.stats}>
            <div className={styles.stat}><dt>Filled</dt><dd>{n(profile.nonEmpty)}</dd></div>
            <div className={styles.stat}><dt>Empty</dt><dd>{n(profile.empty + profile.missing)}</dd></div>
            <div className={styles.stat}><dt>Unique</dt><dd>{n(profile.unique)}</dd></div>
            <div className={styles.stat}><dt>Length</dt><dd>{profile.nonEmpty ? `${n(profile.minLength)}–${n(profile.maxLength)}` : "—"}</dd></div>
            <div className={styles.stat}><dt>Lead zeros</dt><dd>{n(profile.leadingZero)}</dd></div>
            <div className={styles.stat}><dt>Formula-like</dt><dd>{n(profile.formulaLike)}</dd></div>
          </dl>
          <p className={styles.hint}><strong>Suggestion (not applied):</strong> {COLUMN_TYPE_LABELS[profile.suggestion.type]}{profile.suggestion.profile ? ` · ${PROFILE_LABELS[profile.suggestion.profile]}` : ""}. {profile.suggestion.reason}</p>
          {profile.samples.length > 0 && <div className={styles.examples} role="group" aria-label="Sample values">{profile.samples.map((sample) => <code key={sample} className={styles.example}>{sample}</code>)}</div>}
        </section>
      )}

      {cell && (
        <section className={styles.section} aria-label="Selected cell">
          <h3 className={styles.sectionTitle}>Cell · row {n(cell.row + 1)}{cell.line ? ` · source line ${n(cell.line)}` : ""}</h3>
          <div className={styles.compare}>
            <div>
              <p className={styles.label}>{cell.changed ? "Working value" : "Value"} · {n(cell.length)} characters</p>
              <div className={styles.valueBox} tabIndex={0} data-empty={!cell.working || undefined}>{cell.working === null ? "Missing (no field in this row)" : cell.working === "" ? "Empty" : cell.working}</div>
            </div>
            {cell.changed && (
              <div>
                <p className={styles.label}>Imported value</p>
                <div className={styles.valueBox} tabIndex={0} data-empty={!cell.original || undefined}>{cell.original === null ? "Missing" : cell.original === "" ? "Empty" : cell.original}</div>
              </div>
            )}
          </div>
          {cell.quoted !== null && <p className={styles.hint}>{cell.quoted ? "Wrapped in quotes in the source file." : "Not quoted in the source file."}</p>}
          {cell.excelRisk && <p className={styles.risk}><Info size={15} aria-hidden="true" />{cell.excelRisk}</p>}
          {cell.notes.map((note) => <p key={note} className={styles.hint}>{note}</p>)}
          {cell.codePoints.length > 0 && (
            <table className={styles.codeTable}>
              <caption className={styles.srOnly}>Hidden or unusual characters in this cell</caption>
              <thead><tr><th scope="col">Position</th><th scope="col">Code</th><th scope="col">Meaning</th></tr></thead>
              <tbody>{cell.codePoints.map((point) => <tr key={`${point.index}-${point.code}`}><td>{point.index + 1}</td><td className={styles.mono}>{point.code}</td><td>{point.name}</td></tr>)}</tbody>
            </table>
          )}
          {cell.raw !== null && (
            <details>
              <summary className={styles.hint} style={{ cursor: "pointer" }}>Raw source record</summary>
              <div className={styles.valueBox} tabIndex={0} style={{ marginTop: 6 }}>{cell.raw}{cell.rawTruncated ? "…" : ""}</div>
            </details>
          )}
        </section>
      )}

      <section className={styles.section} aria-label="Column tools">
        <h3 className={styles.sectionTitle}>Tools for {label}</h3>
        <Tool title="Find and replace" open={focusTool?.tool === "find"}>
          <label className={styles.field}>Find<input ref={findRef} className={styles.input} value={find} onChange={(event) => setFind(event.target.value)} /></label>
          <label className={styles.field}>Replace with<input className={styles.input} value={replace} onChange={(event) => setReplace(event.target.value)} placeholder="(empty)" /></label>
          <div className={styles.segmented} role="group" aria-label="Scope">
            <button type="button" aria-pressed={scope === "column"} onClick={() => setScope("column")}>This column</button>
            <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>All columns</button>
          </div>
          <label className={styles.check}><input type="checkbox" checked={wholeCell} onChange={(event) => setWholeCell(event.target.checked)} /> Match the whole cell</label>
          <label className={styles.check}><input type="checkbox" checked={matchCase} onChange={(event) => setMatchCase(event.target.checked)} /> Match case</label>
          <label className={styles.check}><input type="checkbox" checked={regex} onChange={(event) => setRegex(event.target.checked)} /> Regular expression<small>Use $1, $2 for groups. Nested repetition is blocked.</small></label>
          <button type="button" className={`${styles.button} ${styles.block}`} disabled={!find} onClick={() => onPreview({ kind: "findReplace", columns: scope === "all" ? "all" : [column.key], find, replace, regex, matchCase, wholeCell })}>Preview replacements</button>
        </Tool>
        <Tool title="Pad with leading zeros" open={focusTool?.tool === "pad"}>
          <p className={styles.hint}>Only digit-only values shorter than the length you type get zeros on the left. Nothing is guessed.</p>
          <label className={styles.field}>Target length (2–64)<input ref={padRef} className={styles.input} inputMode="numeric" value={padLength} onChange={(event) => setPadLength(event.target.value.replace(/[^\d]/g, ""))} placeholder="Type a length, e.g. 5" /></label>
          <button type="button" className={`${styles.button} ${styles.block}`} disabled={!padLength} onClick={() => onPreview({ kind: "padLeft", column: column.key, length: Number(padLength) })}>Preview padding</button>
        </Tool>
        <Tool title="Split column">
          <div className={styles.fieldRow}>
            <label className={styles.field}>Split on<input className={styles.input} value={separator} onChange={(event) => setSeparator(event.target.value)} /></label>
            <label className={styles.field}>Max parts<input className={styles.input} inputMode="numeric" value={parts} onChange={(event) => setParts(event.target.value.replace(/[^\d]/g, ""))} /></label>
          </div>
          <label className={styles.check}><input type="checkbox" checked={keepSource} onChange={(event) => setKeepSource(event.target.checked)} /> Keep the original column</label>
          <button type="button" className={`${styles.button} ${styles.block}`} disabled={!separator} onClick={() => onPreview({ kind: "split", column: column.key, separator, maxParts: Number(parts) || 2, keepSource })}>Preview split</button>
        </Tool>
        {others.length > 0 && (
          <Tool title="Merge with another column">
            <label className={styles.field}>Second column
              <select className={styles.select} value={merge ?? ""} onChange={(event) => setMergeWith(Number(event.target.value))}>
                {others.map((item) => <option key={item.key} value={item.key}>{item.name || "Untitled column"}</option>)}
              </select>
            </label>
            <div className={styles.fieldRow}>
              <label className={styles.field}>Joiner<input className={styles.input} value={joiner} onChange={(event) => setJoiner(event.target.value)} /></label>
              <label className={styles.field}>New name<input className={styles.input} value={mergeName} onChange={(event) => setMergeName(event.target.value)} placeholder={`${column.name} merged`} /></label>
            </div>
            <label className={styles.check}><input type="checkbox" checked={removeSources} onChange={(event) => setRemoveSources(event.target.checked)} /> Remove the two original columns</label>
            <button type="button" className={`${styles.button} ${styles.block}`} disabled={merge === null} onClick={() => merge !== null && onPreview({ kind: "merge", columns: [column.key, merge], joiner, name: mergeName.trim() || `${column.name || "Column"} merged`, removeSources })}>Preview merge</button>
          </Tool>
        )}
        <Tool title="Fill empty cells">
          <p className={styles.hint}>Puts exactly the value you type into empty and missing cells of this column.</p>
          <label className={styles.field}>Value<input className={styles.input} value={fill} onChange={(event) => setFill(event.target.value)} /></label>
          <button type="button" className={`${styles.button} ${styles.block}`} disabled={!fill} onClick={() => onPreview({ kind: "fillEmpty", column: column.key, value: fill })}>Preview fill</button>
        </Tool>
        <div className={styles.actions}>
          <button type="button" className={`${styles.button} ${styles.small}`} disabled={position <= 0} onClick={() => onApply({ kind: "move", column: column.key, offset: -1 })}><ArrowLeft size={13} aria-hidden="true" /> Move left</button>
          <button type="button" className={`${styles.button} ${styles.small}`} disabled={position >= visible.length - 1} onClick={() => onApply({ kind: "move", column: column.key, offset: 1 })}>Move right <ArrowRight size={13} aria-hidden="true" /></button>
          <button type="button" className={`${styles.button} ${styles.small}`} disabled={visible.length <= 1} onClick={() => onApply({ kind: "hide", column: column.key, hidden: true })}><EyeOff size={13} aria-hidden="true" /> Hide</button>
          <button type="button" className={`${styles.buttonDanger} ${styles.small}`} disabled={snapshot.columns.length <= 1} onClick={() => onDelete(column)}><Trash2 size={13} aria-hidden="true" /> Delete</button>
        </div>
        {snapshot.columns.some((item) => item.hidden) && (
          <div className={styles.actions} role="group" aria-label="Hidden columns">
            {snapshot.columns.filter((item) => item.hidden).map((item) => <button key={item.key} type="button" className={`${styles.buttonQuiet} ${styles.small}`} onClick={() => onApply({ kind: "hide", column: item.key, hidden: false })}><Eye size={13} aria-hidden="true" /> Show {item.name || "untitled"}</button>)}
          </div>
        )}
      </section>
    </div>
  );
}

const CLEANUPS: { id: RecipeCleanup; label: string; detail: string; safe: boolean }[] = [
  { id: "trim", label: "Trim leading and trailing whitespace", detail: "All visible columns", safe: true },
  { id: "stripBom", label: "Strip byte-order marks", detail: "Invisible U+FEFF in names and values", safe: true },
  { id: "repairHeaders", label: "Repair header names", detail: "Fill blanks, trim, make duplicates unique", safe: true },
  { id: "normalizeSpaces", label: "Normalize spaces", detail: "No-break spaces and double spaces", safe: false },
  { id: "removeControls", label: "Remove control characters", detail: "Keeps tabs and line breaks", safe: false },
  { id: "nfc", label: "Normalize Unicode (NFC)", detail: "Same-looking accents become identical", safe: false },
];

function cleanupOp(id: RecipeCleanup): RepairOp {
  if (id === "repairHeaders") return { kind: "repairHeaders", names: null };
  if (id === "removeBlankRows") return { kind: "removeBlankRows" };
  return { kind: id, columns: "all" };
}

interface ChangesProps {
  snapshot: StudioSnapshot;
  review: Review | null;
  busy: boolean;
  onPreview(op: RepairOp): void;
  onConfirm(op: RepairOp): void;
  onCancel(): void;
  onUndo(): void;
  onRedo(): void;
  onReset(): void;
  onToast(message: string): void;
}

export function ChangesTab({ snapshot, review, busy, onPreview, onConfirm, onCancel, onUndo, onRedo, onReset, onToast }: ChangesProps) {
  const [selected, setSelected] = useState<Record<RecipeCleanup, boolean>>({ trim: true, stripBom: true, repairHeaders: true, normalizeSpaces: false, removeControls: false, nfc: false, removeBlankRows: false });
  const [names, setNames] = useState<Record<number, string>>({});
  const [inspect, setInspect] = useState<number | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>(() => loadRecipes());
  const [recipeName, setRecipeName] = useState("");
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const [namesFor, setNamesFor] = useState<Review | null>(null);
  if (review !== namesFor) {
    setNamesFor(review);
    setNames(Object.fromEntries((review?.preview.headers ?? []).map((item) => [item.column, item.after])));
  }
  useEffect(() => { if (review) reviewRef.current?.focus(); }, [review]);
  const blank = snapshot.issues.find((issue) => issue.code === "blank-rows");
  const duplicates = snapshot.issues.find((issue) => issue.code === "duplicate-rows");
  const chosen = CLEANUPS.filter((cleanup) => selected[cleanup.id]);
  const { steps, cursor, canUndo, canRedo } = snapshot.history;
  const changes = snapshot.changes;
  const changed = changes.cells + changes.rowsRemoved + changes.rowsAdded + changes.columnsAdded + changes.columnsRemoved + changes.headersChanged + changes.typesChanged > 0;

  return (
    <div>
      {review && (
        <section className={styles.review} aria-labelledby="csv-studio-review-title">
          <h3 id="csv-studio-review-title" ref={reviewRef} tabIndex={-1}>Review: {review.preview.label}</h3>
          {review.preview.reason && <p className={styles.hint}>{review.preview.reason}</p>}
          {review.preview.blocked ? <p className={styles.blocked} role="alert">{review.preview.blocked}</p> : (
            <div className={styles.reviewCounts}>
              <span className={`${styles.pill} ${styles.pillChanged}`}>{n(review.preview.cells)} cell{review.preview.cells === 1 ? "" : "s"}</span>
              {review.preview.rowsRemoved > 0 && <span className={styles.pill}>{n(review.preview.rowsRemoved)} row{review.preview.rowsRemoved === 1 ? "" : "s"} removed</span>}
              {review.preview.rowsAdded > 0 && <span className={styles.pill}>{n(review.preview.rowsAdded)} row added</span>}
              {review.preview.columnsAdded > 0 && <span className={styles.pill}>{n(review.preview.columnsAdded)} column{review.preview.columnsAdded === 1 ? "" : "s"} added</span>}
              {review.preview.columnsRemoved > 0 && <span className={styles.pill}>{n(review.preview.columnsRemoved)} column{review.preview.columnsRemoved === 1 ? "" : "s"} removed</span>}
              {review.preview.headers.length > 0 && <span className={styles.pill}>{n(review.preview.headers.length)} name{review.preview.headers.length === 1 ? "" : "s"}</span>}
            </div>
          )}
          {review.op.kind === "repairHeaders" && review.preview.headers.length > 0 && (
            <div className={styles.section}>
              <p className={styles.label}>Proposed names (edit before applying)</p>
              {review.preview.headers.map((item) => (
                <label key={item.column} className={styles.field}>
                  <span>Was: <code>{item.before ? JSON.stringify(item.before) : "(blank)"}</code></span>
                  <input className={styles.input} value={names[item.column] ?? item.after} onChange={(event) => setNames((current) => ({ ...current, [item.column]: event.target.value }))} />
                </label>
              ))}
            </div>
          )}
          {review.op.kind !== "repairHeaders" && review.preview.headers.length > 0 && (
            <table className={styles.diffTable}>
              <caption className={styles.srOnly}>Column name changes</caption>
              <thead><tr><th scope="col">Column name</th><th scope="col">Becomes</th></tr></thead>
              <tbody>{review.preview.headers.slice(0, 8).map((item) => <tr key={item.column}><td className={styles.before}>{item.before || "(blank)"}</td><td className={styles.after}>{item.after}</td></tr>)}</tbody>
            </table>
          )}
          {review.preview.samples.length > 0 && (
            <table className={styles.diffTable}>
              <caption className={styles.srOnly}>Examples of the proposed change</caption>
              <thead><tr><th scope="col" style={{ width: 52 }}>Row</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>
              <tbody>
                {review.preview.samples.map((sample, index) => (
                  <tr key={index}>
                    <td title={sample.column}>{n(sample.row + 1)}</td>
                    <td className={styles.before}>{sample.before === null ? "—" : sample.before === "" ? "(empty)" : sample.before.replace(/\r\n|\r|\n/g, "↵")}</td>
                    <td className={styles.after}>{sample.after === null ? "(removed)" : sample.after === "" ? "(empty)" : sample.after.replace(/\r\n|\r|\n/g, "↵")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {review.preview.notes.length > 0 && <div className={styles.notes}>{review.preview.notes.map((note) => <p key={note}>{note}</p>)}</div>}
          <div className={styles.actions}>
            <button type="button" className={styles.buttonPrimary} disabled={Boolean(review.preview.blocked) || busy || (!review.preview.cells && !review.preview.rowsRemoved && !review.preview.rowsAdded && !review.preview.columnsAdded && !review.preview.columnsRemoved && !review.preview.headers.length)}
              onClick={() => onConfirm(review.op.kind === "repairHeaders" ? { kind: "repairHeaders", names } : review.op)}>
              <Check size={15} aria-hidden="true" /> Apply
            </button>
            <button type="button" className={styles.button} onClick={onCancel}>Cancel</button>
          </div>
        </section>
      )}

      <div className={styles.panelBody}>
        <section className={styles.section} aria-labelledby="csv-studio-cleanups">
          <h3 id="csv-studio-cleanups" className={styles.sectionTitle}>Cleanups</h3>
          {CLEANUPS.map((cleanup) => (
            <label key={cleanup.id} className={styles.check}>
              <input type="checkbox" checked={selected[cleanup.id]} onChange={(event) => setSelected((current) => ({ ...current, [cleanup.id]: event.target.checked }))} />
              <span>{cleanup.label}{cleanup.safe ? <span className={styles.pill} style={{ marginLeft: 6, height: 18 }}>Safe</span> : null}<small>{cleanup.detail}</small></span>
            </label>
          ))}
          <div className={styles.actions}>
            <button type="button" className={styles.button} disabled={!chosen.length} onClick={() => onPreview({ kind: "batch", label: chosen.every((cleanup) => cleanup.safe) && chosen.length === 3 ? "Apply safe cleanups" : "Apply selected cleanups", ops: chosen.map((cleanup) => cleanupOp(cleanup.id)) })}>Preview cleanups</button>
          </div>
          <p className={styles.hint}>“Safe” cleanups never remove rows or columns. Everything here is previewed first and can be undone.</p>
        </section>

        <section className={styles.section} aria-labelledby="csv-studio-rows">
          <h3 id="csv-studio-rows" className={styles.sectionTitle}>Rows</h3>
          <div className={styles.actions}>
            <button type="button" className={styles.button} disabled={!blank} onClick={() => onPreview({ kind: "removeBlankRows" })}>Remove blank rows{blank ? ` (${n(blank.count)})` : ""}</button>
            <button type="button" className={styles.button} disabled={!duplicates} onClick={() => onPreview({ kind: "removeDuplicateRows" })}>Remove duplicates{duplicates ? ` (${n(duplicates.count)})` : ""}</button>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="csv-studio-history">
          <div className={styles.sectionTitle}>
            <h3 id="csv-studio-history">History</h3>
            <span className={styles.toolGroup}>
              <button type="button" className={styles.iconButton} aria-label="Undo" disabled={!canUndo || busy} onClick={onUndo}><Undo2 size={15} aria-hidden="true" /></button>
              <button type="button" className={styles.iconButton} aria-label="Redo" disabled={!canRedo || busy} onClick={onRedo}><Redo2 size={15} aria-hidden="true" /></button>
            </span>
          </div>
          {changed && (
            <div className={styles.reviewCounts} role="group" aria-label="Changes compared with the imported data">
              {changes.cells > 0 && <span className={`${styles.pill} ${styles.pillChanged}`}>{n(changes.cells)} cells edited</span>}
              {changes.rowsRemoved > 0 && <span className={styles.pill}>{n(changes.rowsRemoved)} rows removed</span>}
              {changes.columnsAdded > 0 && <span className={styles.pill}>{n(changes.columnsAdded)} columns added</span>}
              {changes.columnsRemoved > 0 && <span className={styles.pill}>{n(changes.columnsRemoved)} columns removed</span>}
              {changes.headersChanged > 0 && <span className={styles.pill}>{n(changes.headersChanged)} names</span>}
              {changes.typesChanged > 0 && <span className={styles.pill}>{n(changes.typesChanged)} typed columns</span>}
            </div>
          )}
          <ol className={styles.history} aria-label="Applied steps">
            {steps.map((step, index) => (
              <li key={step.id}>
                <button type="button" className={styles.historyItem} data-current={index === cursor || undefined} data-future={index > cursor || undefined} aria-current={index === cursor ? "step" : undefined} aria-expanded={inspect === step.id} onClick={() => setInspect(inspect === step.id ? null : step.id)}>
                  <span className={styles.historyDot} aria-hidden="true" />
                  <span>
                    <strong>{step.label}</strong>
                    <small>{index === 0 ? "Starting point" : `${step.cells ? `${n(step.cells)} cells` : ""}${step.rowsRemoved ? `${step.cells ? " · " : ""}${n(step.rowsRemoved)} rows removed` : ""}${!step.cells && !step.rowsRemoved ? "Settings or structure" : ""}`}{index > cursor ? " · undone" : ""}</small>
                  </span>
                </button>
                {inspect === step.id && <p className={styles.historyDetail}>{step.detail}</p>}
              </li>
            ))}
          </ol>
          <button type="button" className={`${styles.buttonQuiet} ${styles.small}`} disabled={!changed || busy} onClick={onReset}><RotateCcw size={13} aria-hidden="true" /> Reset to imported data</button>
        </section>

        <section className={styles.section} aria-labelledby="csv-studio-recipes">
          <h3 id="csv-studio-recipes" className={styles.sectionTitle}>Recipes</h3>
          <p className={styles.hint}>Save column types and the cleanups ticked above to reuse on next week’s export. Recipes stay in this browser and never contain cell values.</p>
          <form className={styles.inline} onSubmit={(event) => {
            event.preventDefault();
            const next = saveRecipe(recipeName, snapshot.columns, chosen.map((cleanup) => cleanup.id));
            if (next) { setRecipes(next); setRecipeName(""); onToast("Recipe saved in this browser."); } else onToast("This browser blocked local storage, so the recipe wasn’t saved.");
          }}>
            <label className={styles.field}>Recipe name<input className={styles.input} value={recipeName} onChange={(event) => setRecipeName(event.target.value)} placeholder="Weekly CRM export" maxLength={80} /></label>
            <button type="submit" className={styles.button} disabled={!recipeName.trim()}><Save size={14} aria-hidden="true" /> Save</button>
          </form>
          {recipes.length > 0 && (
            <ul className={styles.issueList} aria-label="Saved recipes">
              {recipes.map((recipe) => (
                <li key={recipe.id} className={styles.issueItem} style={{ gridTemplateColumns: "18px minmax(0,1fr) auto", alignItems: "center" }}>
                  <ListChecks size={15} aria-hidden="true" />
                  <span><strong>{recipe.name}</strong><small>{recipe.columns.length} column rule{recipe.columns.length === 1 ? "" : "s"} · {recipe.cleanups.length} cleanup{recipe.cleanups.length === 1 ? "" : "s"}</small></span>
                  <span className={styles.toolGroup}>
                    <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => {
                      const { op, matched, missing } = recipeOps(recipe, snapshot.columns);
                      onPreview(op);
                      if (missing.length) onToast(`${matched} column rule${matched === 1 ? "" : "s"} matched. Not found here: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}.`);
                    }}>Apply</button>
                    <button type="button" className={styles.iconButton} aria-label={`Delete recipe ${recipe.name}`} onClick={() => setRecipes(deleteRecipe(recipe.id))}><X size={14} aria-hidden="true" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
