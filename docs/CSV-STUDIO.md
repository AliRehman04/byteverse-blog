# ByteVerse CSV Studio (`/tools/csv-repair`)

Fix your CSV. Keep your data intact. A browser-only workspace that inspects a CSV, explains every problem, applies previewed and undoable repairs, and exports Excel-ready XLSX (or CSV, TSV, JSON).

## Privacy model

- File bytes are read with `File.arrayBuffer()` and handed to one dedicated Web Worker (`src/lib/csv-studio/worker.ts`). Cell values never leave that worker except for the rows currently on screen, the selected cell and the downloaded file.
- No upload API, analytics, ads, chat, translation or AI on this page: `/tools/csv-repair` is listed in `privateToolPaths` (`src/components/site-shell.tsx`), so entering or leaving it forces a fresh document.
- Route CSP (`next.config.ts`): `connect-src 'self'`, `worker-src 'self' blob:`, no external script, frame, object or form targets; `Referrer-Policy: no-referrer`.
- The root service worker ignores the route (`public/sw.js`).
- Recipes (`byteverse.csvStudio.recipes.v1` in `localStorage`) store column names, types and cleanup choices only, never cell values.
- Closing the file terminates the worker. A `beforeunload` prompt appears only when applied changes exist.

## Code map

| File | Purpose |
| --- | --- |
| `src/lib/csv-studio/types.ts` | Limits, contracts, labels |
| `encoding.ts` | BOM/UTF-8/UTF-16/Windows-1252 detection, `.gz`/single-file `.zip` unwrap, refusal of XLSX/XLS/PDF/images/binary, Encoding Lab |
| `parse.ts` | Tokenizer (CRLF/LF/CR, doubled quotes, malformed/stray/unclosed quote accounting) and delimiter detection with reasons |
| `detect.ts`, `convert.ts` | Cell flags (leading zero, long digits, scientific, date-like, formula-like, hidden characters) and typed conversions |
| `table.ts` | Column-major, copy-on-write table state |
| `validate.ts` | Issue catalog, locate, change summary, export blockers |
| `repairs.ts` | All repair operations with previews |
| `export.ts` | Streaming XLSX writer with read-back verification; CSV/TSV/JSON |
| `engine.ts`, `worker.ts`, `client.ts` | Session (history, undo/redo/reset), worker protocol, main-thread client |
| `samples.ts`, `recipes.ts` | Fictional samples; local recipes |
| `src/components/csv-studio/*` | Workspace UI: grid, setup panel, inspector, export dock, dialogs |
| `src/app/tools/csv-repair/*` | Page, education content, FAQ, social image |

## Limits

25 MB of text after unpacking, 10 million pasted characters, 100,000 data rows, 500 columns, 5 million cells, 1 million characters per field, 32,767 characters per cell for XLSX export, 100 skipped rows, 50 undo steps, 200,000 copied cells, 120-second import deadline. Limits reject with an explanation; nothing is silently truncated.

## Import rules

- The tokenizer follows RFC 4180 and keeps going on real-world damage: text after a closing quote is kept and reported, stray quotes inside unquoted fields are kept, an unclosed quote absorbs to the end of the file and is reported as an error with its line.
- Delimiter detection scores comma, semicolon, tab and pipe by how consistently each splits the sampled rows. Near ties are reported as ambiguous instead of guessed.
- Encoding: BOM, then UTF-16 heuristics, then strict UTF-8, otherwise Windows-1252. The Encoding Lab decodes the original bytes several ways for a side-by-side choice.

## Repairs

Every repair is previewed with counts and before/after samples, then applied as one undoable step. The original import is never modified; Reset is itself undoable. Available repairs: trim, normalize spaces, remove control characters, strip BOM, Unicode NFC, repair header names (editable), remove blank or duplicate rows, set type/identifier profile/date format, rename, move, hide, delete, split, merge, pad with leading zeros (explicit length, digit-only values), find and replace (literal or safe regex), fill empty cells, edit and clear cells, use the header row as data.

## Export

- **XLSX**: text and automatic columns are inline-string cells; integer, decimal, date and boolean cells are typed only in columns set to those types, and only when the value parses (otherwise text plus a note). Frozen header, autofilter, optional *Validation summary* and *Applied changes* sheets. The package is re-read before download and must contain zero formula cells.
- **CSV/TSV**: RFC quoting, optional UTF-8 BOM, CRLF or LF, quote-all, and a spreadsheet-safe mode that prefixes formula-like values with an apostrophe while leaving signed numbers alone. This follows common guidance but is not a universal guarantee (see OWASP CSV Injection).
- **JSON**: an array of objects with string values; requires unique, non-blank column names.

## Keyboard

`Ctrl/⌘ K` command palette · `Ctrl/⌘ Z` undo · `Ctrl Y` or `⌘ ⇧ Z` redo · `Ctrl/⌘ G` go to cell · arrows, Page Up/Down, Home/End, Tab in the grid · `Enter`/`F2` edit · `Delete` clear · `Ctrl/⌘ C` copy as TSV · `Ctrl/⌘ A` select all · `Esc` cancel edit, close menus or leave full screen.

## Known limitations

- Values Excel already damaged (missing zeros, digits after the 15th) cannot be recovered.
- No XLSX/XLS/PDF/OCR input, one file at a time, no multi-file archives.
- Dates are only typed when the user picks a format; ambiguous day/month order is never guessed.
- Very large files can be slow on low-memory phones.

## Tests

```bash
node scripts/build-csv-studio-fixtures.mjs   # regenerate byte-exact fixtures (already committed)
npm run test:csv-studio                      # engine tests + SSR/SEO/integration contracts
node scripts/preview-csv-diff.mjs --build    # isolated production build (prints the copy path)
node scripts/preview-csv-diff.mjs --serve <copy>
npm run test:csv-studio:browser              # Edge E2E, downloads read back, axe at 375/768/1280/1440, dark mode
```

Fixtures live in `fixtures/csv-studio/` and are marked `-text` in `.gitattributes` so line endings stay byte-exact.
