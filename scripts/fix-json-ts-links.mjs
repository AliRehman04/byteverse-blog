import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1. TypeScript beginner guide — add tip after interface vs type section
const tsOld = "- Both work for most cases  - pick one and stay consistent\n\n## Functions in TypeScript";
const tsNew = `- Both work for most cases  - pick one and stay consistent

> **Tip:** When working with API data, paste a sample JSON response into a JSON to TypeScript converter to instantly generate accurate interfaces instead of writing them by hand.

## Functions in TypeScript`;

const ts = await sql`
  UPDATE posts SET content = REPLACE(content, ${tsOld}, ${tsNew}), updated_at = NOW()
  WHERE id = 37 AND content LIKE ${'%' + tsOld + '%'}
`;
console.log("TypeScript guide updated:", ts.length !== undefined ? "✓" : "✗");

// 2. Free APIs post — add tip about TypeScript types in Pro Tips
const apiOld = "5. Use try/catch and loading states in your UI\n\nThese 30 APIs";
const apiNew = `5. Use try/catch and loading states in your UI
6. If you use TypeScript, run API responses through a JSON to TypeScript converter to generate type-safe interfaces

These 30 APIs`;

const api = await sql`
  UPDATE posts SET content = REPLACE(content, ${apiOld}, ${apiNew}), updated_at = NOW()
  WHERE id = 41 AND content LIKE ${'%' + apiOld + '%'}
`;
console.log("Free APIs guide updated:", api.length !== undefined ? "✓" : "✗");

// Verify
const verify = await sql`SELECT id, slug FROM posts WHERE content LIKE ${'%JSON to TypeScript%'}`;
console.log(`\nPosts now mentioning "JSON to TypeScript": ${verify.length}`);
for (const r of verify) console.log(`  [${r.id}] ${r.slug}`);
