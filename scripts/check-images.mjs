import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const posts = await sql`select id, slug, cover_image from posts where published = true order by id`;

const images = {};
posts.forEach(p => {
  const img = p.cover_image?.split('photo-')[1]?.split('?')[0] || 'none';
  if (!images[img]) images[img] = [];
  images[img].push({ id: p.id, slug: p.slug });
});

const dupes = Object.entries(images).filter(([k,v]) => v.length > 1);

console.log('=== DUPLICATE COVER IMAGES ===\n');
dupes.forEach(([img, posts]) => {
  console.log(`Image: ${img} (used ${posts.length} times):`);
  posts.forEach(p => console.log(`  - ID ${p.id}: ${p.slug}`));
  console.log('');
});

console.log('\n=== ALL POSTS ===\n');
posts.forEach(p => {
  const img = p.cover_image?.split('photo-')[1]?.split('?')[0] || 'none';
  console.log(`${p.id}: ${img}`);
  console.log(`   ${p.slug}\n`);
});
