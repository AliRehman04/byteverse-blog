interface SafeHtmlPreviewProps {
  html: string;
  title: string;
  className?: string;
}

export function SafeHtmlPreview({ html, title, className }: SafeHtmlPreviewProps) {
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; base-uri 'none'; form-action 'none'; frame-src 'none'; connect-src 'none'"><style>html{color-scheme:light dark}body{font:14px/1.7 system-ui,sans-serif;margin:16px;overflow-wrap:anywhere}pre{white-space:pre-wrap}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #888;padding:6px}a{color:inherit}</style></head><body>${html}</body></html>`;

  return (
    <iframe
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      className={className || "w-full h-96 rounded-lg border border-border bg-card"}
    />
  );
}