import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// Get exact content around insertion points
const ts = await sql`SELECT content FROM posts WHERE id = 37`;
const tsLines = ts[0].content.split('\n');
console.log("=== TS POST lines 136-142 ===");
for (let i = 136; i <= 142; i++) console.log(`L${i}: ${tsLines[i]}`);

console.log("\n=== TS POST lines 188-195 ===");
for (let i = 188; i <= 195; i++) console.log(`L${i}: ${tsLines[i]}`);

console.log("\n=== TS POST lines 370-380 ===");
for (let i = 370; i <= Math.min(380, tsLines.length - 1); i++) console.log(`L${i}: ${tsLines[i]}`);

const apis = await sql`SELECT content FROM posts WHERE id = 41`;
const apiLines = apis[0].content.split('\n');
console.log("\n=== APIS POST lines 163-180 ===");
for (let i = 163; i <= Math.min(180, apiLines.length - 1); i++) console.log(`L${i}: ${apiLines[i]}`);
