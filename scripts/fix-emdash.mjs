import { neon } from '@neondatabase/serverless';
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const em = '\u2014';
  
  // Find all posts with em dash
  const posts = await sql`SELECT id, title, content, excerpt, meta_description FROM posts WHERE content LIKE ${'%' + em + '%'} OR excerpt LIKE ${'%' + em + '%'} OR meta_description LIKE ${'%' + em + '%'}`;
  
  console.log(`Found ${posts.length} posts with em dash:\n`);
  
  for (const post of posts) {
    const contentCount = (post.content.match(/\u2014/g) || []).length;
    const excerptCount = (post.excerpt?.match(/\u2014/g) || []).length;
    const metaCount = (post.meta_description?.match(/\u2014/g) || []).length;
    console.log(`  ID ${post.id}: "${post.title}" - content: ${contentCount}, excerpt: ${excerptCount}, meta: ${metaCount}`);
    
    // Replace em dashes with " - " in content, excerpt, meta_description
    const newContent = post.content.replaceAll('\u2014', ' -');
    const newExcerpt = post.excerpt ? post.excerpt.replaceAll('\u2014', ' -') : post.excerpt;
    const newMeta = post.meta_description ? post.meta_description.replaceAll('\u2014', ' -') : post.meta_description;
    
    await sql`UPDATE posts SET content = ${newContent}, excerpt = ${newExcerpt}, meta_description = ${newMeta} WHERE id = ${post.id}`;
    console.log(`    ✅ Fixed`);
  }
  
  console.log(`\nDone! Fixed ${posts.length} posts.`);
}

main().catch(console.error);
