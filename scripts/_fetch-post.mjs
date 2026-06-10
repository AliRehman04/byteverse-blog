import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const slug = '90-day-blog-content-plan-for-new-websites-in-2026';
const post = await sql`SELECT id, title, slug, content FROM posts WHERE slug = ${slug}`;
if (post.length) {
  console.log('ID:', post[0].id);
  console.log('TITLE:', post[0].title);
  console.log('CONTENT_LENGTH:', post[0].content.length);
  console.log('---CONTENT_START---');
  console.log(post[0].content);
  console.log('---CONTENT_END---');
} else {
  console.log('NOT FOUND');
}
