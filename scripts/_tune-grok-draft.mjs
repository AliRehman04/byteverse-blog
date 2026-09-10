import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const [row] = await sql`SELECT id, content, published FROM posts WHERE id = 218 AND slug = 'how-to-use-grok-2026-complete-guide'`;
if (!row || row.published) throw new Error('draft 218 not found or already published');
let c = row.content;

function replaceOnce(marker, replacement, label) {
  const n = c.split(marker).length - 1;
  if (n !== 1) throw new Error(label + ': marker found ' + n + 'x');
  c = c.replace(marker, replacement);
  console.log('edit ok: ' + label);
}

// 1) Shorten Imagine bullet (details move to dedicated section)
replaceOnce(
  `**Imagine** — text-to-image and text-to-video in the conversation. Images up to 2K resolution, videos up to 15 seconds, with follow-up edits ("same scene, golden hour, closer crop"). It will not dethrone the dedicated tools in our [AI image generators comparison](/blog/best-ai-image-generators-2026-free-paid) for fine art direction, but for fast visual drafts inside a chat it is remarkably frictionless.`,
  `**Imagine** — text-to-image and text-to-video inside the conversation. This is the most-searched Grok feature of 2026, so it gets its own section next.`,
  'imagine bullet'
);

// 2) New dedicated Imagine section (answers the "free/limits/unlimited" demand) before Prompting
replaceOnce(
  `\n## Prompting Grok: What Actually Works`,
  `\n## Grok Imagine: Free Video and Images (What's Actually Free)

The most-searched Grok question in 2026 is some variant of "is Grok's video generator free?" — so here is the straight answer. Imagine generates images up to 2K resolution and videos up to 15 seconds with audio, from a text prompt or a reference photo, and free accounts get a real but **capped** allowance of generations. The "free unlimited" version half the internet searches for does not exist — heavy generation is precisely what SuperGrok's higher limits are for, and video burns through allowance much faster than images.

Two habits stretch a free allowance a long way. First, **iterate with follow-up edits** ("same scene, golden hour, tighter crop") instead of regenerating from scratch — edit passes converge faster than fresh prompts. Second, **draft the prompt in Fast mode first**: describe the shot, ask Grok to tighten it, then send the refined version to Imagine once. For fine-grained art direction, dedicated tools still lead — our [AI image generators](/blog/best-ai-image-generators-2026-free-paid) and [AI video generators](/blog/best-ai-video-generators-2026) roundups cover those — but for visual drafts that never leave the conversation, Imagine's zero-friction loop is the entire point.

## Prompting Grok: What Actually Works`,
  'imagine section'
);

// 3) FAQ: replace generic FAQ with the two highest-demand questions
replaceOnce(
  `### What is Grok actually good for?

Real-time questions are its moat: breaking news, trends, sports, markets, and anything happening on X right now, answered with live citations. Beyond that it is a capable generalist — writing, coding, voice, image and video generation — but real-time is where it clearly beats ChatGPT and Gemini.`,
  `### Is Grok's video generator free?

Partly. Free accounts get a capped allowance of Imagine generations — enough to test and make occasional clips (up to 15 seconds, with audio), not for heavy daily output. No genuinely unlimited free tier exists; sustained video work is what SuperGrok's higher limits are for.

### Is Grok better than ChatGPT?

For real-time questions — breaking news, trends, anything happening on X — yes, clearly. For ecosystem depth (Projects, custom GPTs, integrations) and polished agents, ChatGPT stays ahead. Many power users run both: Grok for *now*, ChatGPT for building.`,
  'faq swap'
);

// 4) Update SEO fields to match live demand phrasing
const metaDesc = 'Learn how to use Grok in 2026: what is free, Grok Imagine video limits, using Grok without an X account, SuperGrok pricing, and how it compares to ChatGPT.';
if (metaDesc.length > 160) throw new Error('meta too long: ' + metaDesc.length);
const keywords = 'how to use grok, how to use grok for free, grok ai, what is grok, is grok free, grok ai video generator, grok imagine free, grok video generator free limit, grok imagine, supergrok pricing, can i use grok without x account, is grok better than chatgpt, grok vs chatgpt, grok tutorial 2026, xai grok';

// verify all links still valid + counts
const words = c.split(/\s+/).filter(Boolean).length;
const linkSlugs = [...c.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)].map(m => m[1]);
let bad = 0;
for (const s of [...new Set(linkSlugs)]) {
  const r = await sql`SELECT published FROM posts WHERE slug = ${s}`;
  if (!(r.length && r[0].published)) { bad++; console.log('!!BAD ' + s); }
}
console.log('WORDS:', words, '| LINKS:', linkSlugs.length, '(unique ' + new Set(linkSlugs).size + ') | bad:', bad);
if (words < 1800 || bad > 0) throw new Error('checks failed');

await sql`UPDATE posts SET content = ${c}, meta_description = ${metaDesc}, keywords = ${keywords}, updated_at = NOW() WHERE id = 218`;
const [v] = await sql`SELECT published, LENGTH(content) AS len, meta_description FROM posts WHERE id = 218`;
console.log('UPDATED | still draft:', !v.published, '| content len:', v.len, '| meta len:', v.meta_description.length);
