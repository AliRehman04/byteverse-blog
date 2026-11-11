"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import type { PlaygroundSource } from "@/lib/html-playground";

type CodeEditorProps = {
  language: PlaygroundSource;
  value: string;
  active: boolean;
  label: string;
  describedBy: string;
  /** `replacedAll` is true when one edit replaced the whole document, for example select all then paste. */
  onChange: (value: string, replacedAll: boolean) => void;
  onRun: () => void;
  onSave: () => void;
};

/** CodeMirror loads after first paint; a plain textarea keeps the tab usable until then, or if the chunk fails. */
export function CodeEditor({ language, value, active, label, describedBy, onChange, onRun, onSave }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const fallback = useRef<HTMLTextAreaElement>(null);
  const view = useRef<EditorView | null>(null);
  const latest = useRef({ value, onChange, onRun, onSave });
  const syncing = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { latest.current = { value, onChange, onRun, onSave }; });

  useEffect(() => {
    let cancelled = false;
    import("./code-editor-runtime").then(({ createEditor }) => {
      if (cancelled || !host.current) return;
      const area = fallback.current;
      const focused = area !== null && document.activeElement === area;
      const selection = area ? { anchor: area.selectionStart, head: area.selectionEnd } : null;
      const editor = createEditor({
        parent: host.current,
        language,
        value: latest.current.value,
        label,
        describedBy,
        onChange: (next, replacedAll) => { if (!syncing.current) latest.current.onChange(next, replacedAll); },
        onRun: () => latest.current.onRun(),
        onSave: () => latest.current.onSave(),
      });
      view.current = editor;
      setReady(true);
      if (focused && selection) {
        editor.dispatch({ selection });
        editor.focus();
      }
    }).catch(() => { /* the textarea stays in place */ });
    return () => {
      cancelled = true;
      view.current?.destroy();
      view.current = null;
    };
  }, [language, label, describedBy]);

  // Templates, imports, formatting and restores change the value from outside the editor.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    syncing.current = true;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    syncing.current = false;
  }, [value, ready]);

  useEffect(() => {
    if (active && ready) view.current?.requestMeasure();
  }, [active, ready]);

  return (
    <div className="h-full min-h-0">
      <div ref={host} className={ready ? "h-full min-h-0" : "hidden"} />
      {!ready && (
        <textarea
          ref={fallback}
          value={value}
          onChange={(event) => onChange(event.target.value, false)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          aria-label={label}
          aria-describedby={describedBy}
          className="block h-full w-full resize-none overflow-auto bg-transparent py-3 pl-[52px] pr-3 font-mono text-[13px] leading-[1.6] text-slate-200 outline-none"
          style={{ tabSize: 2, whiteSpace: "pre" }}
        />
      )}
    </div>
  );
}
