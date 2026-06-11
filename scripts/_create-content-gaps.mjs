import fs from "fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(".env.local", "utf8");
const m = env.match(/DATABASE_URL=(.+)/);
const url = m[1].trim();
const sql = neon(url);

await sql`CREATE TABLE IF NOT EXISTS content_gaps (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  intent VARCHAR(50) NOT NULL DEFAULT 'unknown',
  language VARCHAR(20) NOT NULL DEFAULT 'english',
  count INTEGER NOT NULL DEFAULT 1,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;

console.log("content_gaps table created!");

const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
console.log("Tables:", tables.map(t => t.table_name));
