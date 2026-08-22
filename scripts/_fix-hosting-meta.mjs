import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// CTR fix: GSC queries are "best free web hosting 2026" (564 imp) + "best free hosting 2026" (549 imp), 0 clicks.
// Old meta title lacked "web" and any click hook.
const [r] = await sql`
  UPDATE posts SET
    title = 'Best Free Web Hosting for Developers in 2026 (Truly Free)',
    meta_title = 'Best Free Web Hosting 2026: 8 Truly Free Sites',
    meta_description = 'The best free web hosting in 2026 tested: Vercel, Netlify, Cloudflare Pages, Render and more — real limits, no hidden fees, and which to pick for your project.',
    updated_at = NOW()
  WHERE slug = 'best-free-hosting-platforms-2026'
  RETURNING title, meta_title, length(meta_title) AS mt, length(meta_description) AS md
`;
console.log(r);
