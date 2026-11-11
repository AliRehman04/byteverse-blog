export type PlaygroundSource = "html" | "css" | "js";
export type PlaygroundProject = Record<PlaygroundSource, string>;
export type LineSegment = { source: PlaygroundSource; docLine: number; sourceLine: number; lines: number };
export type BuiltDocument = { doc: string; segments: LineSegment[] };
export type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";
export type ConsoleMessage = { level: ConsoleLevel; text: string };

export const SOURCE_LABELS: Record<PlaygroundSource, string> = { html: "HTML", css: "CSS", js: "JS" };
export const MAX_PROJECT_CHARS = 300_000;
const CONSOLE_LEVELS: readonly unknown[] = ["log", "info", "warn", "error", "debug"];

// Kept on one line so it can sit beside <head> without shifting the line numbers of the user's code.
const CAPTURE_SCRIPT = "<script data-byteverse-preview>" + [
  "(function(){var count=0,limit=300;",
  "var send=function(level,message,line,file){if(count>limit)return;count++;",
  'if(count>limit){level="warn";message="Console output paused after "+limit+" messages in this run.";line=0;file=""}',
  'try{parent.postMessage({byteversePreview:true,level:level,message:String(message).slice(0,2000),line:line||0,file:file||""},"*")}catch(e){}};',
  'var show=function(a){if(typeof a==="string")return a;',
  'if(a instanceof Error)return a.name+": "+a.message;',
  'if(typeof a==="function")return "function "+(a.name||"anonymous")+"()";',
  'if(a===undefined)return "undefined";',
  'if(typeof Element!=="undefined"&&a instanceof Element)return "<"+a.tagName.toLowerCase()+(a.id?"#"+a.id:"")+">";',
  'if(typeof a==="object"&&a!==null){try{var seen=[];return JSON.stringify(a,function(k,v){if(typeof v==="object"&&v!==null){if(seen.indexOf(v)>-1)return "[repeated]";seen.push(v)}return v})}catch(_){}}',
  "return String(a)};",
  'window.addEventListener("error",function(e){send("error",e.message||"Script error",e.lineno,e.filename)});',
  'window.addEventListener("unhandledrejection",function(e){var r=e.reason;send("error","Unhandled promise rejection: "+(r&&r.message?r.message:show(r)))});',
  '["log","info","warn","error","debug"].forEach(function(level){var original=console[level];',
  'console[level]=function(){send(level,Array.prototype.map.call(arguments,show).join(" "));if(original)original.apply(console,arguments)}})})()',
].join("") + "</script>";

type Piece = { text: string; source?: PlaygroundSource; offset?: number };

function countNewlines(text: string) {
  let count = 0;
  for (let index = text.indexOf("\n"); index !== -1; index = text.indexOf("\n", index + 1)) count++;
  return count;
}

// A closing tag inside the tab's own code would end the injected block early.
const escapeClosing = (text: string, tag: "style" | "script") => text.replace(new RegExp(`</(${tag})`, "gi"), "<\\/$1");

function assemble(pieces: Piece[], project: PlaygroundProject): BuiltDocument {
  const segments: LineSegment[] = [];
  let doc = "";
  let docLine = 1;
  for (const piece of pieces) {
    if (!piece.text) continue;
    const breaks = countNewlines(piece.text);
    if (piece.source) {
      const sourceLine = 1 + countNewlines(project[piece.source].slice(0, piece.offset ?? 0));
      segments.push({ source: piece.source, docLine, sourceLine, lines: breaks + 1 });
    }
    doc += piece.text;
    docLine += breaks;
  }
  return { doc, segments };
}

/**
 * Combines the three tabs into one document. The HTML tab may hold a fragment or a complete page;
 * `external` links styles.css and script.js instead of inlining them (used for the ZIP export).
 */
export function buildDocument(project: PlaygroundProject, options: { capture?: boolean; external?: boolean } = {}): BuiltDocument {
  const { html, css, js } = project;
  const capture = options.capture ? CAPTURE_SCRIPT : "";
  const style: Piece[] = !css.trim() ? []
    : options.external ? [{ text: '<link rel="stylesheet" href="styles.css">\n' }]
    : [{ text: "<style>\n" }, { text: escapeClosing(css, "style"), source: "css", offset: 0 }, { text: "\n</style>\n" }];
  const script: Piece[] = !js.trim() ? []
    : options.external ? [{ text: '<script src="script.js"></script>\n' }]
    : [{ text: "<script>\n" }, { text: escapeClosing(js, "script"), source: "js", offset: 0 }, { text: "\n</script>\n" }];

  if (!/<!doctype\s|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html)) {
    return assemble([
      { text: `<!DOCTYPE html>\n<html lang="en">\n<head>${capture}\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>My Page</title>\n` },
      ...style,
      { text: "</head>\n<body>\n" },
      { text: html, source: "html", offset: 0 },
      { text: "\n" },
      ...script,
      { text: "</body>\n</html>\n" },
    ], project);
  }

  const lower = html.toLowerCase();
  const anchor = /<head(?:\s[^>]*)?>/i.exec(html) ?? /<html(?:\s[^>]*)?>/i.exec(html) ?? /<!doctype[^>]*>/i.exec(html);
  const captureAt = anchor ? anchor.index + anchor[0].length : 0;
  const headEnd = lower.indexOf("</head>");
  const body = /<body(?:\s[^>]*)?>/i.exec(html);
  const styleAt = Math.max(headEnd !== -1 ? headEnd : body ? body.index : captureAt, captureAt);
  const bodyEnd = lower.lastIndexOf("</body>");
  const htmlEnd = lower.lastIndexOf("</html>");
  const scriptAt = Math.max(bodyEnd !== -1 ? bodyEnd : htmlEnd !== -1 ? htmlEnd : html.length, styleAt);

  return assemble([
    { text: html.slice(0, captureAt), source: "html", offset: 0 },
    { text: capture },
    { text: html.slice(captureAt, styleAt), source: "html", offset: captureAt },
    ...style,
    { text: html.slice(styleAt, scriptAt), source: "html", offset: styleAt },
    ...script,
    { text: html.slice(scriptAt), source: "html", offset: scriptAt },
  ], project);
}

/** Translates a line of the combined document back to the tab and line the user typed it on. */
export function mapLine(segments: LineSegment[], docLine: number): { source: PlaygroundSource; line: number } | null {
  for (const segment of segments) {
    if (docLine >= segment.docLine && docLine < segment.docLine + segment.lines) {
      return { source: segment.source, line: segment.sourceLine + docLine - segment.docLine };
    }
  }
  return null;
}

function dedent(block: string) {
  const lines = block.replace(/\s+$/, "").split("\n");
  const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length));
  return lines.map((line) => line.slice(Number.isFinite(indent) ? indent : 0)).join("\n");
}

/** Moves plain <style> and <script> blocks of a single-file page into the CSS and JS tabs. */
export function splitDocument(code: string): PlaygroundProject {
  const css: string[] = [];
  const js: string[] = [];
  const html = code
    .replace(/^[ \t]*<style>\n?([\s\S]*?)<\/style>[ \t]*\n?/gim, (_, block: string) => { css.push(dedent(block)); return ""; })
    .replace(/^[ \t]*<script>\n?([\s\S]*?)<\/script>[ \t]*\n?/gim, (_, block: string) => { js.push(dedent(block)); return ""; });
  return { html, css: css.join("\n\n"), js: js.join("\n\n") };
}

/** A script-free copy of a trusted template for thumbnails; this is not a sanitizer for arbitrary HTML. */
export function staticPreview(code: string) {
  const { html, css } = splitDocument(code);
  return buildDocument({ html: html.replace(/\son[a-z]+="[^"]*"/gi, ""), css, js: "" }).doc;
}

export const serializeProject = (project: PlaygroundProject) => JSON.stringify({ v: 1, html: project.html, css: project.css, js: project.js });

export function parseProject(text: string): PlaygroundProject | null {
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object") return null;
    const { v, html, css, js } = data as Record<string, unknown>;
    if (v !== 1 || typeof html !== "string" || typeof css !== "string" || typeof js !== "string") return null;
    if (html.length + css.length + js.length > MAX_PROJECT_CHARS) return null;
    return { html, css, js };
  } catch {
    return null;
  }
}

const withoutHash = (url: string) => url.split("#")[0];

/** Validates a message posted by the preview frame and adds the tab and line it came from. */
export function describeConsoleMessage(data: unknown, segments: LineSegment[], pageUrl = ""): ConsoleMessage | null {
  if (!data || typeof data !== "object") return null;
  const { byteversePreview, level, message, line, file } = data as Record<string, unknown>;
  if (byteversePreview !== true || typeof message !== "string" || !CONSOLE_LEVELS.includes(level)) return null;
  let text = message.slice(0, 2000);
  if (typeof line === "number" && Number.isInteger(line) && line > 0) {
    const external = typeof file === "string" && /^https?:/i.test(file) && withoutHash(file) !== withoutHash(pageUrl);
    if (external) {
      text += ` (${(file as string).split(/[?#]/)[0].split("/").pop() || "script"}:${line})`;
    } else {
      const mapped = mapLine(segments, line);
      text += mapped ? ` (${SOURCE_LABELS[mapped.source]} line ${mapped.line})` : ` (line ${line})`;
    }
  }
  return { level: level as ConsoleLevel, text };
}
