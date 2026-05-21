import { neon } from '@neondatabase/serverless';
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const em = '\u2014';
const rows = await sql`SELECT id FROM posts WHERE content LIKE ${'%'+em+'%'} OR excerpt LIKE ${'%'+em+'%'} OR meta_description LIKE ${'%'+em+'%'}`;
console.log('Remaining posts with em dash:', rows.length);

// Also check meta_description lengths
const long = await sql`SELECT id, title, LENGTH(meta_description) as len FROM posts WHERE LENGTH(meta_description) > 160`;
if (long.length > 0) {
  console.log('\nMeta descriptions over 160 chars:');
  long.forEach(r => console.log(`  ID ${r.id}: ${r.len} chars - ${r.title}`));
} else {
  console.log('All meta descriptions within 160 char limit.');
}
