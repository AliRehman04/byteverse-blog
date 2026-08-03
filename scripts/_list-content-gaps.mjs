import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const gaps = await sql`SELECT id, query, intent, language, count, resolved FROM content_gaps ORDER BY resolved ASC, count DESC, id ASC`;
console.log(`Total gaps: ${gaps.length} | unresolved: ${gaps.filter(g => !g.resolved).length}`);
gaps.forEach(g => console.log(`${g.resolved ? "[done]" : "[OPEN]"} #${g.id} x${g.count} (${g.intent}/${g.language}) ${g.query}`));
