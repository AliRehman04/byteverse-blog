import pkg from "@next/env";
const { loadEnvConfig } = pkg;
loadEnvConfig(".");

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

// Shorten borderline blog meta_titles (max 57 chars so total with " | ByteVerse" stays < 70)
const updates = [
  {
    slug: "best-free-hosting-platforms-2026",
    meta_title: "Best Free Hosting Platforms 2026: Top Picks", // 44 + 13 = 57
  },
  {
    slug: "build-portfolio-website-2026",
    meta_title: "Build a Portfolio Website in 2026: Dev Guide", // 45 + 13 = 58
  },
  {
    slug: "typescript-for-beginners-2026-complete-guide",
    meta_title: "TypeScript for Beginners 2026: Starter Guide", // 46 + 13 = 59
  },
  {
    slug: "how-to-start-freelancing-developer-2026",
    meta_title: "Start Freelancing as a Developer in 2026", // 41 + 13 = 54
  },
];

for (const u of updates) {
  await sql`UPDATE posts SET meta_title = ${u.meta_title} WHERE slug = ${u.slug}`;
  console.log(`Updated: ${u.slug} → "${u.meta_title}"`);
}

console.log("Done!");
