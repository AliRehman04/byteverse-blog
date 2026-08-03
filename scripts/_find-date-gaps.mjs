import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT to_char(created_at::date, 'YYYY-MM-DD') AS d, count(*) AS n FROM posts GROUP BY d ORDER BY d`;
const have = new Map(rows.map(r => [r.d, Number(r.n)]));
const dates = [...have.keys()].sort();
const first = new Date(dates[0] + "T00:00:00Z");
const last = new Date("2026-08-03T00:00:00Z");
const gaps = [];
for (let d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
  const key = d.toISOString().slice(0, 10);
  if (!have.has(key)) gaps.push(key);
}
console.log(`Range: ${dates[0]} .. 2026-08-03  | days with posts: ${dates.length} | gap days: ${gaps.length}`);
console.log(gaps.join("\n"));
