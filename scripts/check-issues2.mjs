import pkg from "@next/env";
const { loadEnvConfig } = pkg;
loadEnvConfig(".");

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const r = await sql`SELECT slug, title, meta_title FROM posts WHERE slug LIKE '%learn-programming%'`;
console.log("LEARN_PROGRAMMING:", JSON.stringify(r));

const r2 = await sql`SELECT slug, author FROM posts WHERE author ILIKE '%byteverse%' LIMIT 5`;
console.log("BYTEVERSE_AUTHOR:", JSON.stringify(r2));

const r3 = await sql`SELECT DISTINCT author FROM posts LIMIT 10`;
console.log("ALL_AUTHORS:", JSON.stringify(r3));
