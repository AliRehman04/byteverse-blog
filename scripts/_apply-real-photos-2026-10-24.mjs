import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';

// Default: read-only preflight showing exactly what would change. --apply swaps the six covers and body images
// to the reviewed real photographs in ONE serializable transaction guarded by the exact pre-read content.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');
const root = fileURLToPath(new URL('../', import.meta.url));
const ledger = JSON.parse(readFileSync(resolve(root, 'docs/real-photos-2026-10-24.json'), 'utf8'));
const site = 'https://www.byteverse.fyi';
const credit = id => { const p = ledger.photos[id]; assert(p?.photographer, `credit missing ${id}`); return `[${p.photographer}](${p.photographerUrl}) via Pexels`; };
const plainCredit = id => `${ledger.photos[id].photographer} / Pexels`;
const photo = (dir, file, alt, caption) => `![${alt}](${site}/blog/${dir}/${file} "${caption}")`;

const edits = [
  {
    slug: 'ollama-not-using-gpu-windows-2026', dir: 'ollama-gpu', cover: 17576302, inline: 33693626,
    replace: [
      ['![Three Ollama PROCESSOR states showing GPU-memory placement, CPU-memory placement and a CPU/GPU split](https://www.byteverse.fyi/blog/ollama-gpu/processor-states.png "Illustrative memory-placement states, not measured utilization or an actual terminal capture. ByteVerse original diagram.")',
        photo('ollama-gpu', 'photo-inline.jpg', 'GeForce RTX graphics card installed inside a desktop PC with liquid cooling', `A discrete GPU inside a desktop PC. Ollama only uses it when the driver, runtime and model placement all line up. Photo: ${plainCredit(33693626)}.`)],
      ['\n![Diagnostic decision map separating no loaded model, full CPU placement, partial GPU offload and full GPU placement](https://www.byteverse.fyi/blog/ollama-gpu/diagnostic-path.png "Follow the observed state before changing settings. No result in this diagram is a performance guarantee. ByteVerse original diagram.")\n', '\n'],
      ['The cover and two diagrams are **ByteVerse original illustrations**. They explain diagnostic choices and memory placement; they are not screenshots, measured hardware results or a claim of endorsement by Ollama, NVIDIA, AMD or Microsoft.',
        `Cover photo: ${credit(17576302)}. Inline photo: ${credit(33693626)}. Both are photographs of consumer PC hardware used for illustration; they are not screenshots, measured hardware results or a claim of endorsement by Ollama, NVIDIA, AMD or Microsoft.`],
    ],
  },
  {
    slug: 'gemini-not-showing-google-docs-gmail-2026', dir: 'gemini-workspace', cover: 7439136, inline: 20716656,
    replace: [
      ['![Eligibility map showing which Google Workspace editions and Google AI plans list Gemini features for Gmail compared with Docs and Sheets](https://www.byteverse.fyi/blog/gemini-workspace/eligibility-map.png "Gmail and Docs are gated separately: several tiers include one but not the other")',
        photo('gemini-workspace', 'photo-inline.jpg', 'Smartphone showing the Gmail logo on a wooden desk', `Gmail and Docs are gated separately: several plan tiers include Gemini in one app but not the other. Photo: ${plainCredit(20716656)}.`)],
      ['\n![Decision path from the account type to the setting most likely hiding Gemini: plan tier, age, smart features, account language and administrator controls](https://www.byteverse.fyi/blog/gemini-workspace/settings-path.png "Work through the account-level gates in order; each one hides the button completely when it fails")\n', '\n'],
      ["The cover and two diagrams are **ByteVerse original illustrations**. They summarize Google's published eligibility rules as of the date above; they are not screenshots of Google products, not a guarantee that a particular account will gain access, and not a claim of endorsement by Google.",
        `Cover photo: ${credit(7439136)}. Inline photo: ${credit(20716656)}. The photographs are illustrative; they are not screenshots of Google products, not a guarantee that a particular account will gain access, and not a claim of endorsement by Google.`],
    ],
  },
  {
    slug: 'excel-csv-leading-zeros-2026', dir: 'csv-excel', cover: 8297058, inline: 34639577,
    replace: [
      ['![Three stages distinguish intact CSV text, Excel numeric conversion and a changed saved export](https://www.byteverse.fyi/blog/csv-excel/source-vs-import.png "Check the original file before trying to repair an imported identifier")',
        photo('csv-excel', 'photo-inline.jpg', 'Person reviewing a spreadsheet of numeric records on a laptop', `Check the original CSV in a text editor before repairing an identifier that Excel has already converted. Photo: ${plainCredit(34639577)}.`)],
      ['\n![An import pipeline keeps identifier columns as Text before any numeric conversion and converts amounts separately](https://www.byteverse.fyi/blog/csv-excel/import-order.png "Preserve identifiers first; apply numeric types only to columns used for arithmetic")\n', '\n'],
      ['The cover and two diagrams are **ByteVerse original illustrations**. All sample records are fictional. Images explain data-handling choices; they are not product screenshots, measured Excel results or an endorsement by Microsoft. The exact converter example is a local reproducibility check, not a guarantee for other files or spreadsheet versions.',
        `Cover photo: ${credit(8297058)}. Inline photo: ${credit(34639577)}. The photographs are illustrative office scenes, not screenshots of this article's examples. All sample records are fictional; the exact converter example is a local reproducibility check, not a guarantee for other files or spreadsheet versions, and nothing here is an endorsement by Microsoft.`],
    ],
  },
  {
    slug: 'claude-code-not-recognized-windows-2026', dir: 'claude-code-windows', cover: 34803969, inline: 5473892,
    replace: [
      ['![Decision map separating a missing Claude executable from a working full-path launcher that the terminal cannot find](https://www.byteverse.fyi/blog/claude-code-windows/diagnostic-map.png "Check file existence, then execution, then command lookup—three different questions.")',
        photo('claude-code-windows', 'photo-inline.jpg', 'Hands typing on a laptop keyboard in low light', `Check file existence, then execution, then command lookup: three different questions, each answered in a fresh terminal. Photo: ${plainCredit(5473892)}.`)],
      ['\n![Separate lanes for the Claude Code extension panel, Windows terminal CLI and a WSL Linux terminal](https://www.byteverse.fyi/blog/claude-code-windows/terminal-environments.png "One editor can host three different execution contexts; success in one does not validate the others.")\n', '\n'],
      ['Cover, diagnostic map and terminal-environment diagram: ByteVerse original illustrations. Product names identify the software discussed; this is an independent troubleshooting guide, not an Anthropic endorsement.',
        `Cover photo: ${credit(34803969)}. Inline photo: ${credit(5473892)}. The photographs are illustrative, not screenshots of Claude Code. Product names identify the software discussed; this is an independent troubleshooting guide, not an Anthropic endorsement.`],
    ],
  },
  {
    slug: 'png-to-jpg-black-background', dir: 'png-jpg-background', cover: 16313513, inline: 7971542,
    replace: [
      ['![Decision map separating a viewer backdrop, a transparent original and an already opaque black-background image](https://www.byteverse.fyi/blog/png-jpg-background/recovery-map.png "Choose the repair based on what the source still contains, not on the file extension alone.")',
        photo('png-jpg-background', 'photo-inline.jpg', 'Designer retouching a portrait in photo-editing software on a desktop monitor', `Choose the repair based on what the source still contains, not on the file extension alone. Photo: ${plainCredit(7971542)}.`)],
      ['Cover, comparison and decision-map artwork: original ByteVerse illustrations made for this guide. The synthetic graphic contains no user photograph, signature or third-party artwork.',
        `Cover photo: ${credit(16313513)}. Inline photo: ${credit(7971542)}. The comparison graphic in "What the original test showed" is an original ByteVerse illustration made for this guide; the synthetic graphic contains no user photograph, signature or third-party artwork.`],
    ],
  },
  {
    slug: 'cursor-agent-stuck-planning-next-moves-2026', dir: 'cursor-planning-next-moves', cover: 4974912, inline: 5473309,
    replace: [
      ['\n## Check 1: Rule out a Cursor or model-provider incident',
        `\n${photo('cursor-planning-next-moves', 'photo-inline.jpg', 'Developer looking at a dark code editor on a monitor in a dim room', `Waiting on an agent that never continues: the checks below separate a slow model turn from a stalled connection. Photo: ${plainCredit(5473309)}.`)}\n\n## Check 1: Rule out a Cursor or model-provider incident`],
      ['- Related on ByteVerse: [How to use Cursor AI](/blog/how-to-use-cursor-ai-2026-guide), [GitHub Copilot not working in VS Code](/blog/github-copilot-not-working-vscode-2026), [Claude Code not recognized on Windows](/blog/claude-code-not-recognized-windows-2026)',
        `- Related on ByteVerse: [How to use Cursor AI](/blog/how-to-use-cursor-ai-2026-guide), [GitHub Copilot not working in VS Code](/blog/github-copilot-not-working-vscode-2026), [Claude Code not recognized on Windows](/blog/claude-code-not-recognized-windows-2026)\n- Photos: cover ${credit(4974912)}; inline ${credit(5473309)}. Illustrative photographs, not Cursor screenshots.`],
    ],
  },
  {
    slug: 'excel-csv-special-characters-utf8', dir: 'csv-utf8', cover: 6779570, inline: 7735769,
    replace: [
      ['![The bytes C3 A9 decode to an accented e under UTF-8 but to two different characters under Windows-1252; saving that wrong text changes the bytes](https://www.byteverse.fyi/blog/csv-utf8/decode-vs-save.png "Reading with the wrong decoder and saving the wrong text are separate events.")',
        photo('csv-utf8', 'photo-inline.jpg', 'Person reviewing a printed spreadsheet with tables and charts at an office desk', `Reading a file with the wrong decoder and saving the wrong text are separate events; check which one happened before fixing anything. Photo: ${plainCredit(7735769)}.`)],
      ['\n![Three recovery paths distinguish an intact source that needs the right decoder, saved mojibake that needs the original or a verified reversal, and lost characters that require source evidence](https://www.byteverse.fyi/blog/csv-utf8/recovery-map.png "A different encoding choice can re-read surviving bytes; it cannot invent missing characters.")\n', '\n'],
      ['Cover and both diagrams: ByteVerse original illustrations. Microsoft, Excel and VS Code are product names used to identify the relevant workflow; this independent guide is not an endorsement by Microsoft.',
        `Cover photo: ${credit(6779570)}. Inline photo: ${credit(7735769)}. The photographs are illustrative office scenes, not screenshots of the examples in this guide. Microsoft, Excel and VS Code are product names used to identify the relevant workflow; this independent guide is not an endorsement by Microsoft.`],
    ],
  },
];

for (const edit of edits) for (const file of ['photo-cover.jpg', 'photo-inline.jpg']) assert(existsSync(resolve(root, 'public/blog', edit.dir, file)), `Missing asset ${edit.dir}/${file}`);

nextEnv.loadEnvConfig(root);
assert(process.env.DATABASE_URL, 'Database configuration is required');
const sql = neon(process.env.DATABASE_URL);
const slugs = edits.map(edit => edit.slug);
const rows = await sql`SELECT id, slug, published, cover_image, content FROM posts WHERE slug = ANY(${slugs}::text[]) ORDER BY id`;
assert.equal(rows.length, edits.length, 'All planned posts must exist');
const planned = [];
for (const edit of edits) {
  const row = rows.find(r => r.slug === edit.slug);
  assert(row.published, `${edit.slug} not published`);
  const newCover = `${site}/blog/${edit.dir}/photo-cover.jpg`;
  if (row.cover_image === newCover && row.content.includes(`/blog/${edit.dir}/photo-inline.jpg`)) { planned.push({ id: row.id, slug: edit.slug, status: 'already applied' }); continue; }
  let content = row.content;
  for (const [from, to] of edit.replace) {
    const occurrences = content.split(from).length - 1;
    assert.equal(occurrences, 1, `${edit.slug}: anchor must occur exactly once (${occurrences}): ${from.slice(0, 70)}`);
    content = content.replace(from, () => to);
  }
  assert(!/ByteVerse original diagram|original ByteVerse illustrations made for this guide\. The synthetic graphic/.test(content) || edit.slug === 'png-to-jpg-black-background');
  assert.equal((content.match(/photo-inline\.jpg/g) ?? []).length, 1);
  planned.push({ id: row.id, slug: edit.slug, status: 'pending', oldCover: row.cover_image, newCover, oldContent: row.content, newContent: content, images: (content.match(/!\[[^\]]*\]\(([^\s)]+)/g) ?? []).map(m => m.replace(/^!\[[^\]]*\]\(/, '')) });
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'read-only', plan: planned.map(p => ({ id: p.id, slug: p.slug, status: p.status, newCover: p.newCover, images: p.images, delta: p.newContent ? p.newContent.length - p.oldContent.length : 0 })) }, null, 1));
if (!apply) { console.log('PASS: preflight only. No database writes.'); process.exit(0); }
const pending = planned.filter(p => p.status === 'pending');
assert(pending.length > 0, 'Nothing to apply');
// Each UPDATE only matches when the row still holds the exact pre-read content; the trailing guard fails (rolls back) unless every row changed.
await sql.transaction(tx => [
  ...pending.map(p => tx`UPDATE posts SET cover_image = ${p.newCover}, content = ${p.newContent}, updated_at = NOW() WHERE id = ${p.id} AND slug = ${p.slug} AND published = true AND content = ${p.oldContent} AND cover_image = ${p.oldCover}`),
  tx`SELECT 1 / (CASE WHEN count(*) = ${pending.length} THEN 1 ELSE 0 END) AS all_updated FROM posts WHERE id = ANY(${pending.map(p => p.id)}::int[]) AND cover_image LIKE '%/photo-cover.jpg' AND content LIKE '%/photo-inline.jpg%'`,
], { isolationLevel: 'Serializable' });
const after = await sql`SELECT id, slug, cover_image, md5(content) AS content_md5 FROM posts WHERE id = ANY(${pending.map(p => p.id)}::int[]) ORDER BY id`;
for (const p of pending) { const row = after.find(r => r.id === p.id); assert.equal(row.cover_image, p.newCover); }
console.log('APPLIED:', JSON.stringify(after));
