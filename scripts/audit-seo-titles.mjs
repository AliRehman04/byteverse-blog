import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const sql = neon(dbUrl);

const rows = await sql`
  SELECT slug, title, excerpt, meta_description,
         LENGTH(content) as content_length,
         reading_time,
         created_at, updated_at
  FROM posts
  WHERE published = true
  ORDER BY created_at DESC
`;

console.log(`\n=== TOTAL PUBLISHED POSTS: ${rows.length} ===\n`);

// Check titles
console.log('--- TITLE ISSUES ---');
for (const r of rows) {
  const issues = [];
  if (r.title.length > 60) issues.push(`TOO LONG (${r.title.length} chars)`);
  if (r.title.length < 30) issues.push(`TOO SHORT (${r.title.length} chars)`);
  if (!/\d/.test(r.title)) issues.push('NO NUMBER');
  if (!/202[5-6]/.test(r.title)) issues.push('NO YEAR');
  if (issues.length > 0) {
    console.log(`  ${r.slug}: ${issues.join(', ')}`);
    console.log(`    Title: "${r.title}"`);
  }
}

// Check meta descriptions
console.log('\n--- META DESCRIPTION ISSUES ---');
let noMeta = 0;
for (const r of rows) {
  const meta = r.meta_description || r.excerpt || '';
  if (!meta || meta.length < 50) {
    noMeta++;
    console.log(`  ${r.slug}: MISSING/SHORT meta (${meta.length} chars)`);
  } else if (meta.length > 160) {
    console.log(`  ${r.slug}: TOO LONG meta (${meta.length} chars)`);
  }
}
if (noMeta === 0) console.log('  All good!');

// Check content length (thin content)
console.log('\n--- THIN CONTENT (< 3000 chars ≈ < 500 words) ---');
for (const r of rows) {
  if (r.content_length < 3000) {
    console.log(`  ${r.slug}: ${r.content_length} chars (~${Math.round(r.content_length/6)} words)`);
  }
}

// Summary stats
const avgLen = Math.round(rows.reduce((sum, r) => sum + r.content_length, 0) / rows.length);
const noYear = rows.filter(r => !/202[5-6]/.test(r.title)).length;
const noNum = rows.filter(r => !/\d/.test(r.title)).length;
const longTitle = rows.filter(r => r.title.length > 60).length;

console.log('\n--- SUMMARY ---');
console.log(`Total posts: ${rows.length}`);
console.log(`Avg content length: ${avgLen} chars (~${Math.round(avgLen/6)} words)`);
console.log(`Titles without year: ${noYear}`);
console.log(`Titles without any number: ${noNum}`);
console.log(`Titles too long (>60 chars): ${longTitle}`);
