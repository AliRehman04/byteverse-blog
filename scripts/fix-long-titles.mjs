import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

/**
 * Fix meta_title values that exceed 58 chars.
 * Total rendered title = meta_title + " | ByteVerse" (12 chars) → must be ≤ 70.
 */
const fixes = [
  {
    slug: "best-ai-transcription-tools-2026",
    oldTitle: "Best AI Transcription Tools in 2026 (Speed, Accuracy & Price Compared)",
    newTitle: "Best AI Transcription Tools in 2026 (Tested)",
  },
  {
    slug: "best-ai-chatbots-2026",
    oldTitle: "Best AI Chatbots in 2026 (Ranked by Speed, Accuracy & Real-World Use)",
    newTitle: "Best AI Chatbots in 2026 (Ranked for Real Use)",
  },
  {
    slug: "best-ai-tools-for-teachers-2026",
    oldTitle: "Best AI Tools for Teachers in 2026 (Lesson Planning, Grading & More)",
    newTitle: "Best AI Tools for Teachers in 2026 (Ranked)",
  },
  {
    slug: "best-ai-design-tools-2026",
    oldTitle: "Best AI Design Tools in 2026 (For Graphic Design, UI & Branding)",
    newTitle: "Best AI Design Tools in 2026 (Ranked)",
  },
  {
    slug: "best-ai-project-management-tools-2026",
    oldTitle: "Best AI Project Management Tools in 2026 (Ranked by Real Teams)",
    newTitle: "Best AI Project Management Tools in 2026",
  },
  {
    slug: "best-ai-tools-for-ecommerce-2026",
    oldTitle: "Best AI Tools for Ecommerce in 2026 (Tested Across Real Stores)",
    newTitle: "Best AI Tools for Ecommerce in 2026 (Tested)",
  },
  {
    slug: "best-ai-crm-tools-2026",
    oldTitle: "Best AI CRM Tools in 2026 (Ranked for Sales, Support & Growth)",
    newTitle: "Best AI CRM Tools in 2026 (Sales & Growth)",
  },
];

async function main() {
  let updated = 0;
  for (const { slug, oldTitle, newTitle } of fixes) {
    const total = newTitle.length + 12; // + " | ByteVerse"
    const result = await sql`
      UPDATE posts SET meta_title = ${newTitle}, updated_at = NOW()
      WHERE slug = ${slug} AND meta_title = ${oldTitle}
    `;
    const rows = result?.length ?? (result?.count ?? 0);
    console.log(`[${total} chars] ${slug}`);
    console.log(`  "${oldTitle}" → "${newTitle}"`);
  }
  console.log(`\nDone. Updated ${fixes.length} title(s).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
