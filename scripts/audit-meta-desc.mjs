import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const sql = neon(dbUrl);

const rows = await sql`SELECT slug, title, excerpt FROM posts WHERE published = true ORDER BY slug`;

console.log(`\n📊 META DESCRIPTION AUDIT (${rows.length} posts)\n`);

let shortDesc = 0;
let longDesc = 0;
let noDesc = 0;
let good = 0;

for (const r of rows) {
  const desc = r.excerpt?.trim();
  if (!desc) {
    noDesc++;
    console.log(`❌ NO DESC: ${r.slug}`);
  } else if (desc.length < 120) {
    shortDesc++;
    console.log(`⚠️  SHORT (${desc.length}): ${r.slug} → "${desc}"`);
  } else if (desc.length > 160) {
    longDesc++;
    console.log(`⚠️  LONG (${desc.length}): ${r.slug}`);
  } else {
    good++;
  }
}

console.log(`\n✅ Good: ${good} | ⚠️ Short: ${shortDesc} | ⚠️ Long: ${longDesc} | ❌ Missing: ${noDesc}`);
