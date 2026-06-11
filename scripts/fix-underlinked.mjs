import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// Add 1 more inbound link to each of the 4 under-linked posts (< 3 inbound)

const updates = [
  // Logo generators (72): from post 22 (ai image generators) - has Related ByteVerse
  { postId: 22, slug: "best-ai-logo-generators-2026", text: "Best AI Logo Generators 2026", section: "related-byteverse" },
  // Voice generators (73): from post 69 (ai presentation makers) - has Related Guides
  { postId: 69, slug: "best-ai-voice-generators-2026", text: "Best AI Voice Generators 2026", section: "related-guides" },
  // Customer service chatbots (74): from post 77 (ai sales tools) - has Related Guides
  { postId: 77, slug: "best-ai-customer-service-chatbots-2026", text: "Best AI Customer Service Chatbots", section: "related-guides" },
  // Spreadsheet tools (78): from post 12 (ai productivity apps) - has Related ByteVerse
  { postId: 12, slug: "best-ai-spreadsheet-tools-2026", text: "Best AI Spreadsheet Tools 2026", section: "related-byteverse" },
];

async function main() {
  for (const u of updates) {
    const rows = await sql`select id, title, content from posts where id = ${u.postId}`;
    const post = rows[0];
    if (!post) { console.log(`❌ Post ${u.postId} not found`); continue; }
    if (post.content.includes(u.slug)) { console.log(`⏭️  [${post.id}] Already has link to /${u.slug}`); continue; }

    const newLink = `[${u.text}](/blog/${u.slug})`;
    let newContent = null;

    if (u.section === "related-byteverse") {
      const nearIdx = post.content.indexOf("Related ByteVerse");
      if (nearIdx === -1) { console.log(`⚠️  [${post.id}] No Related ByteVerse`); continue; }
      const afterSection = post.content.substring(nearIdx);
      const m = afterSection.match(/\n\n(Next, read .+?)(\n\n|$)/s);
      if (m) {
        let updated = m[1].replace(/ to build a stronger workflow around this topic\.?$/, `, ${newLink} to build a stronger workflow around this topic.`);
        if (updated === m[1]) updated = m[1].replace(/ to explore more\.?$/, `, ${newLink} to explore more.`);
        if (updated === m[1]) updated = m[1].trimEnd().replace(/\.?$/, "") + `, and ${newLink}.`;
        newContent = post.content.replace(m[1], updated);
      }
    } else if (u.section === "related-guides") {
      const marker = "## Related Guides";
      const idx = post.content.indexOf(marker);
      if (idx === -1) { console.log(`⚠️  [${post.id}] No Related Guides`); continue; }
      const after = post.content.substring(idx);
      const bm = after.match(/(- \[.+?\]\(.+?\)\n)(?!\s*- )/);
      if (bm) {
        const li = post.content.indexOf(bm[1], idx);
        newContent = post.content.slice(0, li + bm[1].length) + `- ${newLink}\n` + post.content.slice(li + bm[1].length);
      }
    }

    if (!newContent || newContent === post.content) { console.log(`⚠️  [${post.id}] unchanged`); continue; }
    await sql`update posts set content = ${newContent}, updated_at = now() where id = ${u.postId}`;
    console.log(`✅ [${post.id}] Added link to /${u.slug} in: ${post.title}`);
  }
  console.log("Done");
}

main().catch(e => { console.error(e); process.exit(1); });
