import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const OLD_COVER = 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=1600&q=80';
const NEW_COVER = 'https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&w=1600&q=80';

const IMG = {
  gettingStarted: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1600&q=80',
  fourModes: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80',
  imagine: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80',
  vsField: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=80',
};

const [row] = await sql`SELECT content FROM posts WHERE id = 218 AND published = true`;
if (!row) throw new Error('post 218 not found or not published');
let c = row.content;

function replaceOnce(marker, replacement, label) {
  const n = c.split(marker).length - 1;
  if (n !== 1) throw new Error(label + ': marker occurs ' + n + 'x, expected 1');
  c = c.replace(marker, replacement);
  console.log('ok: ' + label);
}

// 1) improve cover (replace embedded cover image + swap cover_image column later)
replaceOnce(
  `![Abstract light streaks across a dark sky, representing real-time information flow](${OLD_COVER} "How to use Grok in 2026 - complete beginner guide")`,
  `![Rows of illuminated servers in a modern data center, representing real-time information flow](${NEW_COVER} "How to use Grok in 2026 - complete beginner guide")`,
  'cover embed'
);

// 2) body image after "Getting Started" H2
replaceOnce(
  `## Getting Started: Free in Two Minutes\n\n1. **Open`,
  `## Getting Started: Free in Two Minutes\n\n![Person checking a phone app while sitting outdoors](${IMG.gettingStarted} "Opening Grok for the first time")\n\n1. **Open`,
  'getting started image'
);

// 3) body image after "The Four Modes" H2 intro line
replaceOnce(
  `## The Four Modes (This Is the Whole Skill)\n\nGrok's power lives in its mode selector.`,
  `## The Four Modes (This Is the Whole Skill)\n\n![Close-up of an illuminated microchip representing parallel AI processing](${IMG.fourModes} "Grok's four modes: Fast, Multi-agent, Search, Imagine")\n\nGrok's power lives in its mode selector.`,
  'four modes image'
);

// 4) body image after "Grok Imagine" H2 intro line
replaceOnce(
  `## Grok Imagine: Free Video and Images (What's Actually Free)\n\nThe most-searched Grok question`,
  `## Grok Imagine: Free Video and Images (What's Actually Free)\n\n![Colorful abstract digital artwork representing AI-generated imagery](${IMG.imagine} "Grok Imagine: text-to-image and text-to-video")\n\nThe most-searched Grok question`,
  'imagine image'
);

// 5) body image after "vs ChatGPT, Gemini, and the Field" H2 intro
replaceOnce(
  `## Grok vs ChatGPT, Gemini, and the Field\n\nThe 30-second positioning:`,
  `## Grok vs ChatGPT, Gemini, and the Field\n\n![Two paths diverging in different directions, representing a decision between AI assistants](${IMG.vsField} "Choosing between Grok and the field")\n\nThe 30-second positioning:`,
  'vs field image'
);

// verify: 5 images total, all HTTP 200, none reused elsewhere on the site
const imgUrls = [...c.matchAll(/!\[[^\]]*\]\((https:\/\/images\.unsplash\.com\/[^)\s]+)/g)].map(m => m[1]);
console.log('\nTOTAL IMAGES IN POST:', imgUrls.length);
for (const u of imgUrls) {
  const r = await fetch(u, { method: 'HEAD' });
  console.log('  ' + r.status + ' ' + u);
  if (r.status !== 200) throw new Error('image not reachable: ' + u);
}
const others = await sql`SELECT slug, cover_image, content FROM posts WHERE id <> 218`;
for (const u of imgUrls) {
  const id = (u.match(/photo-([0-9a-zA-Z-]+)/) || [])[1];
  const clash = others.find(o => (o.cover_image || '').includes(id) || o.content.includes(id));
  if (clash) throw new Error('image reused elsewhere: ' + id + ' in ' + clash.slug);
}
console.log('all images unique site-wide: OK');

const words = c.split(/\s+/).filter(Boolean).length;
console.log('WORD COUNT (unchanged expected ~2052):', words);

await sql`UPDATE posts SET content = ${c}, cover_image = ${NEW_COVER}, updated_at = NOW() WHERE id = 218`;
const [v] = await sql`SELECT cover_image, published, LENGTH(content) AS len FROM posts WHERE id = 218`;
console.log('\nUPDATED. cover:', v.cover_image, '| published:', v.published, '| len:', v.len);
