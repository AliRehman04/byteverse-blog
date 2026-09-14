import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 220 AND slug = 'what-is-mcp-model-context-protocol-2026' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 220`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

const target = '/blog/what-is-mcp-model-context-protocol-2026';
const link = (t) => `[${t}](${target})`;
const edits = [
  {
    slug: 'what-is-claude-code-guide-2026',
    insert: `\n\nClaude Code connects to external tools through the Model Context Protocol — our guide to ${link('what MCP is and how to use it')} explains the servers, setup, and security rules.\n`,
  },
  {
    slug: 'how-to-use-cursor-ai-2026-guide',
    insert: `\n\nWant Cursor to reach your database, repo, or design files? That runs on MCP — see our guide to ${link('what MCP is and how to set it up')}.\n`,
  },
  {
    slug: 'best-ai-code-editors-2026',
    insert: `\n\nEvery editor here now speaks the same integration standard: our guide to ${link('MCP (Model Context Protocol)')} covers how to plug your own tools and data into them.\n`,
  },
  {
    slug: 'best-ai-agent-builders-2026',
    insert: `\n\nFor the open standard these agents use to reach external tools and data, read our guide to ${link('MCP (Model Context Protocol)')}.\n`,
  },
];
for (const e of edits) {
  const [row] = await sql`SELECT id, content FROM posts WHERE slug = ${e.slug} AND published = true`;
  if (!row) { console.log(e.slug + ': NOT FOUND'); continue; }
  if (row.content.includes(target)) { console.log(e.slug + ': already linked'); continue; }
  const lastH2 = [...row.content.matchAll(/\n## .+/g)].pop();
  if (!lastH2) { console.log(e.slug + ': no H2, skipped'); continue; }
  const updated = row.content.slice(0, lastH2.index) + e.insert + row.content.slice(lastH2.index);
  await sql`UPDATE posts SET content = ${updated}, updated_at = NOW() WHERE id = ${row.id}`;
  console.log(e.slug + ': backlink added before "' + lastH2[0].trim() + '"');
}

const [c] = await sql`SELECT published FROM posts WHERE id = 220`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('220 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
