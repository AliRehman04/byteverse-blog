import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const r = await sql`SELECT * FROM categories ORDER BY id`;
console.log(JSON.stringify(r, null, 2));
