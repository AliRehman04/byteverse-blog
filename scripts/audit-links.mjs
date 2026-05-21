import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const posts = await sql`select id, title, slug, content, category_id, updated_at from posts order by id`;

console.log(`\nTotal posts: ${posts.length}\n`);

// Get all slugs for reference
const allSlugs = posts.map(p => p.slug);

// Check each post for internal links
for (const post of posts) {
  const internalLinks = [];
  const regex = /\[([^\]]+)\]\(\/blog\/([^)]+)\)/g;
  let match;
  while ((match = regex.exec(post.content)) !== null) {
    internalLinks.push(match[2]);
  }
  
  const hasRelatedSection = post.content.includes('Related ByteVerse') || post.content.includes('related ByteVerse');
  const daysSinceUpdate = Math.floor((Date.now() - new Date(post.updated_at).getTime()) / (1000*60*60*24));
  
  const status = internalLinks.length === 0 ? '❌ NO LINKS' : 
                 internalLinks.length < 3 ? '⚠️ FEW LINKS' : '✅ OK';
  
  console.log(`[${post.id}] ${status} | ${internalLinks.length} links | Updated ${daysSinceUpdate}d ago | ${post.title}`);
  if (internalLinks.length > 0) {
    internalLinks.forEach(l => console.log(`     → ${l}`));
  }
}

// Print slug list for reference
console.log('\n--- ALL SLUGS ---');
posts.forEach(p => console.log(`[${p.id}] /blog/${p.slug} (cat:${p.category_id})`));
