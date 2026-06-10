import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(dbUrl);

const rows = await sql`SELECT content FROM posts WHERE slug = 'docker-for-beginners-2026-guide'`;
const content = rows[0].content;

// All URLs (markdown links, bare URLs, HTML href)
const allUrls = [...content.matchAll(/https?:\/\/[^\s\)\"\'>\]]+/g)];
allUrls.forEach(m => console.log(m[0]));
