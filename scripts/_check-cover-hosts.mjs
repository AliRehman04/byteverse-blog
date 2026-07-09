import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// Check distinct cover image host patterns
const rows = await sql`SELECT slug, cover_image FROM posts WHERE published = true ORDER BY id DESC LIMIT 20`;
for (const r of rows) {
  let host = 'other';
  if (r.cover_image?.includes('unsplash')) host = 'unsplash';
  else if (r.cover_image?.includes('cloudinary')) host = 'cloudinary';
  else if (r.cover_image?.startsWith('/')) host = 'local';
  else if (r.cover_image?.includes('pexels')) host = 'pexels';
  console.log(`${host.padEnd(11)} | ${r.slug}`);
}
