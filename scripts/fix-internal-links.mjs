import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// ═══════════════════════════════════════════════════════════
// Internal linking strategy:
// - Add links TO new posts (31,32,33) from relevant old posts
// - Add more cross-links between old posts where natural
// - Update updated_at for freshness signal
// ═══════════════════════════════════════════════════════════

const linkUpdates = [
  // ─── Links TO post 31 (Claude vs ChatGPT) ───
  {
    postId: 8, // best-chatgpt-alternatives
    addLink: { text: "Claude vs ChatGPT 2026: Which AI Is Better?", slug: "claude-vs-chatgpt-2026-comparison" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 18, // copilot-vs-chatgpt-for-coding
    addLink: { text: "Claude vs ChatGPT 2026: Honest Comparison", slug: "claude-vs-chatgpt-2026-comparison" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 23, // best-chatgpt-prompts-for-work
    addLink: { text: "Claude vs ChatGPT 2026: Which AI Is Better?", slug: "claude-vs-chatgpt-2026-comparison" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 20, // perplexity-vs-google-gemini
    addLink: { text: "Claude vs ChatGPT 2026 Comparison", slug: "claude-vs-chatgpt-2026-comparison" },
    nearText: "Related ByteVerse guides",
  },

  // ─── Links TO post 32 (Best AI Apps iPhone) ───
  {
    postId: 1, // 10-best-free-ai-tools
    addLink: { text: "15 Best AI Apps for iPhone 2026", slug: "best-ai-apps-for-iphone-2026" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 6, // best-ai-tools-for-students
    addLink: { text: "Best AI Apps for iPhone 2026", slug: "best-ai-apps-for-iphone-2026" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 7, // best-ai-tools-for-small-business
    addLink: { text: "Best AI Apps for iPhone 2026", slug: "best-ai-apps-for-iphone-2026" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 12, // best-ai-productivity-apps-for-freelancers
    addLink: { text: "15 Best AI Apps for iPhone 2026", slug: "best-ai-apps-for-iphone-2026" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 21, // how-to-make-money-with-ai
    addLink: { text: "Best AI Apps for iPhone 2026", slug: "best-ai-apps-for-iphone-2026" },
    nearText: "Related ByteVerse guides",
  },

  // ─── Links TO post 33 (How to Use Cursor AI) ───
  {
    postId: 5, // best-ai-coding-assistants
    addLink: { text: "How to Use Cursor AI 2026: Complete Guide", slug: "how-to-use-cursor-ai-2026-guide" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 24, // best-vscode-extensions
    addLink: { text: "How to Use Cursor AI 2026 Guide", slug: "how-to-use-cursor-ai-2026-guide" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 25, // how-to-learn-programming
    addLink: { text: "How to Use Cursor AI 2026: Complete Guide", slug: "how-to-use-cursor-ai-2026-guide" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 15, // javascript-roadmap
    addLink: { text: "How to Use Cursor AI 2026 Guide", slug: "how-to-use-cursor-ai-2026-guide" },
    nearText: "Related ByteVerse guides",
  },

  // ─── Extra cross-links between old posts to strengthen web ───
  {
    postId: 3, // ai-productivity-workflow
    addLink: { text: "How to Make Money with AI 2026", slug: "how-to-make-money-with-ai-2026" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 9, // how-to-start-a-tech-blog
    addLink: { text: "How to Learn Programming 2026", slug: "how-to-learn-programming-2026-beginner-roadmap" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 11, // online-security-checklist
    addLink: { text: "Website Speed Optimization 2026", slug: "website-speed-optimization-checklist-2026-core-web-vitals" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 13, // time-blocking-for-students
    addLink: { text: "Best AI Productivity Apps for Freelancers 2026", slug: "best-ai-productivity-apps-for-freelancers-2026" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 14, // notion-vs-obsidian
    addLink: { text: "Best AI Tools for Students 2026", slug: "best-ai-tools-for-students-2026-free-study-apps" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 16, // react-19-best-practices
    addLink: { text: "Best VS Code Extensions 2026", slug: "best-vscode-extensions-2026-web-developers" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 17, // build-rag-chatbot
    addLink: { text: "Best AI Coding Assistants 2026", slug: "best-ai-coding-assistants-2026-copilot-cursor-windsurf" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 19, // canva-ai-vs-adobe-express
    addLink: { text: "Best AI Image Generators 2026", slug: "best-ai-image-generators-2026-free-paid" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 22, // best-ai-image-generators
    addLink: { text: "Canva AI vs Adobe Express 2026", slug: "canva-ai-vs-adobe-express-2026" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 4, // python-ai-agent-tutorial
    addLink: { text: "How to Learn Programming 2026: Beginner Roadmap", slug: "how-to-learn-programming-2026-beginner-roadmap" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 2, // nextjs-16-deployment-guide
    addLink: { text: "Best VS Code Extensions 2026", slug: "best-vscode-extensions-2026-web-developers" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 10, // website-speed-optimization
    addLink: { text: "Build a RAG Chatbot with Next.js 2026", slug: "build-rag-chatbot-nextjs-2026" },
    nearText: "Related ByteVerse guides",
  },

  // ─── Add links between new posts themselves ───
  {
    postId: 31, // claude-vs-chatgpt
    addLink: { text: "Best AI Apps for iPhone 2026", slug: "best-ai-apps-for-iphone-2026" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 32, // best-ai-apps-iphone
    addLink: { text: "Claude vs ChatGPT 2026 Comparison", slug: "claude-vs-chatgpt-2026-comparison" },
    nearText: "Related ByteVerse guides",
  },
  {
    postId: 33, // how-to-use-cursor-ai
    addLink: { text: "Best AI Apps for iPhone 2026", slug: "best-ai-apps-for-iphone-2026" },
    nearText: "Related ByteVerse guides",
  },
];

async function main() {
  let updated = 0;
  let failed = 0;

  for (const update of linkUpdates) {
    const [post] = await sql`select id, title, content from posts where id = ${update.postId}`;
    if (!post) {
      console.log(`❌ Post ${update.postId} not found`);
      failed++;
      continue;
    }

    // Check if link already exists
    if (post.content.includes(update.addLink.slug)) {
      console.log(`⏭️ [${post.id}] Already has link to ${update.addLink.slug}`);
      continue;
    }

    // Find the "Related ByteVerse guides" line and append link after the existing links
    const nearIdx = post.content.indexOf(update.nearText);
    if (nearIdx === -1) {
      console.log(`⚠️ [${post.id}] No "${update.nearText}" section found in: ${post.title}`);
      failed++;
      continue;
    }

    // Find the paragraph after "Related ByteVerse guides" — it contains the existing links
    // The structure is: "## Related ByteVerse guides\n\nNext, read [link1], [link2], and [link3]..."
    const afterSection = post.content.substring(nearIdx);
    const linkParagraphMatch = afterSection.match(/\n\n(Next, read .+?)(\n\n|$)/s);

    let newContent;
    if (linkParagraphMatch) {
      // Append new link to existing paragraph
      const existingParagraph = linkParagraphMatch[1];
      const newLink = `[${update.addLink.text}](/blog/${update.addLink.slug})`;
      // Add before the period/end
      const updatedParagraph = existingParagraph.replace(
        / to build a stronger workflow around this topic\.?$/,
        `, ${newLink} to build a stronger workflow around this topic.`
      );

      if (updatedParagraph === existingParagraph) {
        // Fallback: just append
        const appendedParagraph = existingParagraph.trimEnd().replace(/\.$/, '') + `, and ${newLink}.`;
        newContent = post.content.replace(existingParagraph, appendedParagraph);
      } else {
        newContent = post.content.replace(existingParagraph, updatedParagraph);
      }
    } else {
      // No existing link paragraph, add one
      const newLink = `[${update.addLink.text}](/blog/${update.addLink.slug})`;
      newContent = post.content.replace(
        update.nearText,
        `${update.nearText}\n\nAlso read ${newLink}.`
      );
    }

    if (newContent === post.content) {
      console.log(`⚠️ [${post.id}] Content unchanged for: ${post.title}`);
      failed++;
      continue;
    }

    await sql`update posts set content = ${newContent}, updated_at = now() where id = ${update.postId}`;
    console.log(`✅ [${post.id}] Added link to /${update.addLink.slug} in: ${post.title}`);
    updated++;
  }

  // Also touch updated_at on ALL posts for freshness
  await sql`update posts set updated_at = now()`;

  console.log(`\n════════════════════════════`);
  console.log(`✅ Updated: ${updated} links added`);
  console.log(`⏭️ Skipped: already had the link`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🔄 All posts updated_at refreshed`);
}

main().catch(e => { console.error(e); process.exit(1); });
