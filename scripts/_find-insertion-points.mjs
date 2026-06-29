import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// Check TypeScript guide for good insertion spot
const ts = await sql`SELECT content FROM posts WHERE id = 37`;
const tsContent = ts[0].content;

// Find sections about types, interfaces, or JSON
const lines = tsContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].toLowerCase();
  if (l.includes('interface') || l.includes('type ') || l.includes('json') || l.includes('api') || l.includes('object') || l.match(/^##/)) {
    console.log(`L${i}: ${lines[i].substring(0, 150)}`);
  }
}

console.log("\n\n=== FREE APIS POST ===");
const apis = await sql`SELECT content FROM posts WHERE id = 41`;
const apiContent = apis[0].content;
const apiLines = apiContent.split('\n');
for (let i = 0; i < apiLines.length; i++) {
  const l = apiLines[i].toLowerCase();
  if (l.includes('typescript') || l.includes('json') || l.includes('type') || l.match(/^##/)) {
    console.log(`L${i}: ${apiLines[i].substring(0, 150)}`);
  }
}
