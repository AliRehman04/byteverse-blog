import pkg from "@next/env";
const { loadEnvConfig } = pkg;
loadEnvConfig(".");

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const authors = await sql`SELECT id, name, slug FROM authors`;
console.log("AUTHORS:", JSON.stringify(authors));

const slugs = [
  "build-portfolio-website-2026",
  "typescript-for-beginners-2026-complete-guide",
  "best-free-hosting-platforms-2026",
  "how-to-start-freelancing-developer-2026",
  "how-to-learn-programming-2026-complete-guide",
];
const posts = await sql`SELECT slug, meta_title, title FROM posts WHERE slug = ANY(${slugs})`;
console.log("POSTS:", JSON.stringify(posts));
