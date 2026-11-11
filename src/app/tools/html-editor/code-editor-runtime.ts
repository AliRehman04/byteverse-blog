import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Prec } from "@codemirror/state";
import { indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import type { PlaygroundSource } from "@/lib/html-playground";

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", color: "#e2e8f0", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono), ui-monospace, monospace", lineHeight: "1.6" },
  ".cm-content": { caretColor: "#f8fafc", padding: "12px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#f8fafc" },
  ".cm-gutters": { backgroundColor: "#0b1120", color: "#94a3b8", border: "none", borderRight: "1px solid rgba(148,163,184,0.14)" },
  ".cm-activeLineGutter": { backgroundColor: "rgba(148,163,184,0.14)", color: "#f1f5f9" },
  ".cm-activeLine": { backgroundColor: "rgba(148,163,184,0.07)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "rgba(96,165,250,0.35)" },
  ".cm-selectionMatch": { backgroundColor: "rgba(148,163,184,0.25)" },
  "&.cm-focused .cm-matchingBracket": { backgroundColor: "rgba(52,211,153,0.22)", outline: "1px solid rgba(52,211,153,0.6)" },
  ".cm-foldPlaceholder": { backgroundColor: "#1e293b", color: "#cbd5e1", border: "none" },
  ".cm-panels": { backgroundColor: "#111a2e", color: "#e2e8f0" },
  ".cm-panels.cm-panels-top": { borderBottom: "1px solid rgba(148,163,184,0.2)" },
  ".cm-panels.cm-panels-bottom": { borderTop: "1px solid rgba(148,163,184,0.2)" },
  ".cm-textfield": { backgroundColor: "#0b1120", color: "#f8fafc", border: "1px solid rgba(148,163,184,0.4)", borderRadius: "6px" },
  ".cm-button": { backgroundImage: "none", backgroundColor: "#1e293b", color: "#f8fafc", border: "1px solid rgba(148,163,184,0.4)", borderRadius: "6px" },
  ".cm-panel.cm-search label": { color: "#cbd5e1" },
  ".cm-panel.cm-search [name=close]": { color: "#cbd5e1" },
  ".cm-tooltip": { backgroundColor: "#111a2e", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.3)", borderRadius: "8px" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "#2563eb", color: "#ffffff" },
}, { dark: true });

const highlight = HighlightStyle.define([
  { tag: [tags.comment, tags.meta, tags.documentMeta], color: "#93a1b8", fontStyle: "italic" },
  { tag: [tags.tagName, tags.angleBracket], color: "#7dd3fc" },
  { tag: tags.attributeName, color: "#c4b5fd" },
  { tag: [tags.string, tags.attributeValue, tags.special(tags.string)], color: "#86efac" },
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier, tags.definitionKeyword], color: "#f0abfc" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom, tags.unit, tags.color], color: "#fdba74" },
  { tag: tags.propertyName, color: "#93c5fd" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.className, tags.labelName], color: "#fde68a" },
  { tag: [tags.typeName, tags.namespace], color: "#5eead4" },
  { tag: [tags.regexp, tags.escape], color: "#fca5a5" },
  { tag: [tags.operator, tags.punctuation, tags.bracket], color: "#cbd5e1" },
  { tag: tags.invalid, color: "#fca5a5" },
]);

type EditorOptions = {
  parent: HTMLElement;
  language: PlaygroundSource;
  value: string;
  label: string;
  describedBy: string;
  onChange: (value: string, replacedAll: boolean) => void;
  onRun: () => void;
  onSave: () => void;
};

export function createEditor({ parent, language, value, label, describedBy, onChange, onRun, onSave }: EditorOptions) {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc: value,
      extensions: [
        Prec.highest(keymap.of([
          { key: "Mod-Enter", run: () => { onRun(); return true; } },
          { key: "Mod-s", run: () => { onSave(); return true; } },
        ])),
        basicSetup,
        // Esc followed by Tab leaves the editor; CodeMirror releases Tab for two seconds after Esc.
        keymap.of([indentWithTab]),
        language === "html" ? html() : language === "css" ? css() : javascript(),
        EditorState.tabSize.of(2),
        theme,
        syntaxHighlighting(highlight),
        EditorView.contentAttributes.of({ "aria-label": label, "aria-describedby": describedBy, tabindex: "0", spellcheck: "false", autocapitalize: "off", autocorrect: "off" }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const before = update.startState.doc.length;
          let replacedAll = false;
          update.changes.iterChanges((from, to) => { if (before > 0 && from === 0 && to === before) replacedAll = true; });
          onChange(update.state.doc.toString(), replacedAll);
        }),
      ],
    }),
  });
}
