import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const ids = [86, 84, 85, 87, 89, 88, 40, 42];
for (const id of ids) {
  const r = await sql`select content from posts where id = ${id}`;
  const c = r[0].content;
  const faqIdx = c.search(/^## (?:Frequently Asked Questions|FAQ)\s*$/im);
  if (faqIdx === -1) { console.log(`=== POST ${id}: NO FAQ ===`); continue; }
  console.log(`=== POST ${id} ===`);
  console.log(c.slice(faqIdx, faqIdx + 400));
  console.log("---");
}
