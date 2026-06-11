import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// ═══════════════════════════════════════════════════════════
// Fix 7 orphan pages by adding inbound links from related posts
// Orphans: 83, 44, 88, 89, 53, 49, 57
// ═══════════════════════════════════════════════════════════

const linkUpdates = [
  // ─── Links TO post 83 (Best AI PDF Tools) ───
  {
    postId: 1,
    addLink: { text: "Best AI PDF Tools 2026", slug: "best-ai-pdf-tools-2026" },
    section: "related-byteverse",
  },
  {
    postId: 6,
    addLink: { text: "Best AI PDF Tools 2026", slug: "best-ai-pdf-tools-2026" },
    section: "related-byteverse",
  },
  {
    postId: 7,
    addLink: { text: "Best AI PDF Tools 2026", slug: "best-ai-pdf-tools-2026" },
    section: "related-byteverse",
  },
  {
    postId: 81,
    addLink: { text: "Best AI PDF Tools", slug: "best-ai-pdf-tools-2026" },
    section: "related-guides",
  },

  // ─── Links TO post 44 (Top Programming Languages) ───
  {
    postId: 25,
    addLink: { text: "Top 10 Programming Languages 2026", slug: "top-programming-languages-2026" },
    section: "related-byteverse",
  },
  {
    postId: 15,
    addLink: { text: "Top Programming Languages 2026", slug: "top-programming-languages-2026" },
    section: "related-byteverse",
  },
  {
    postId: 4,
    addLink: { text: "Top Programming Languages 2026", slug: "top-programming-languages-2026" },
    section: "related-byteverse",
  },
  {
    postId: 37,
    addLink: { text: "Top 10 Programming Languages 2026", slug: "top-programming-languages-2026" },
    section: "before-final",
    finalHeading: "## Final Thoughts",
  },

  // ─── Links TO post 88 (90-Day Blog Content Plan) ───
  {
    postId: 9,
    addLink: { text: "90-Day Blog Content Plan 2026", slug: "90-day-blog-content-plan-for-new-websites-in-2026" },
    section: "related-byteverse",
  },
  {
    postId: 85,
    addLink: { text: "90-Day Blog Content Plan for New Websites", slug: "90-day-blog-content-plan-for-new-websites-in-2026" },
    section: "before-final",
    finalHeading: "## Final Thoughts",
  },
  {
    postId: 87,
    addLink: { text: "90-Day Blog Content Plan", slug: "90-day-blog-content-plan-for-new-websites-in-2026" },
    section: "before-final",
    finalHeading: "## Final Answer",
  },
  {
    postId: 84,
    addLink: { text: "90-Day Blog Content Plan for New Websites", slug: "90-day-blog-content-plan-for-new-websites-in-2026" },
    section: "before-final",
    finalHeading: "## Final Thoughts",
  },

  // ─── Links TO post 89 (50 Blog Post Ideas) ───
  {
    postId: 85,
    addLink: { text: "50 Blog Post Ideas for New Bloggers", slug: "50-blog-post-ideas-for-new-bloggers-in-2026" },
    section: "before-final",
    finalHeading: "## Final Thoughts",
  },
  {
    postId: 87,
    addLink: { text: "50 Blog Post Ideas", slug: "50-blog-post-ideas-for-new-bloggers-in-2026" },
    section: "before-final",
    finalHeading: "## Final Answer",
  },
  {
    postId: 86,
    addLink: { text: "50 Blog Post Ideas for New Bloggers", slug: "50-blog-post-ideas-for-new-bloggers-in-2026" },
    section: "before-final",
    finalHeading: "## Final Thoughts",
  },
  {
    postId: 88,
    addLink: { text: "50 Blog Post Ideas for New Bloggers", slug: "50-blog-post-ideas-for-new-bloggers-in-2026" },
    section: "before-final",
    finalHeading: "## FAQ",
  },

  // ─── Links TO post 53 (Apify Review) ───
  {
    postId: 76,
    addLink: { text: "Apify Review 2026", slug: "apify-review-web-scraping-ai-platform-2026" },
    section: "related-guides",
  },
  {
    postId: 81,
    addLink: { text: "Apify Review", slug: "apify-review-web-scraping-ai-platform-2026" },
    section: "related-guides",
  },
  {
    postId: 4,
    addLink: { text: "Apify Review 2026: Web Scraping & AI Platform", slug: "apify-review-web-scraping-ai-platform-2026" },
    section: "related-byteverse",
  },
  {
    postId: 41,
    addLink: { text: "Apify Review 2026", slug: "apify-review-web-scraping-ai-platform-2026" },
    section: "related-guides",
  },

  // ─── Links TO post 49 (Docker for Beginners) ───
  {
    postId: 34,
    addLink: { text: "Docker for Beginners 2026", slug: "docker-for-beginners-complete-guide" },
    section: "related-byteverse",
  },
  {
    postId: 38,
    addLink: { text: "Docker for Beginners", slug: "docker-for-beginners-complete-guide" },
    section: "keep-reading",
  },
  {
    postId: 25,
    addLink: { text: "Docker for Beginners Guide", slug: "docker-for-beginners-complete-guide" },
    section: "related-byteverse",
  },
  {
    postId: 45,
    addLink: { text: "Docker for Beginners", slug: "docker-for-beginners-complete-guide" },
    section: "related-guides",
  },

  // ─── Links TO post 57 (Best Chrome Extensions) ───
  {
    postId: 12,
    addLink: { text: "Best Chrome Extensions for Developers 2026", slug: "best-chrome-extensions-developers-2026" },
    section: "related-byteverse",
  },
  {
    postId: 5,
    addLink: { text: "Best Chrome Extensions for Developers", slug: "best-chrome-extensions-developers-2026" },
    section: "related-byteverse",
  },
  {
    postId: 39,
    addLink: { text: "Best Chrome Extensions for Developers", slug: "best-chrome-extensions-developers-2026" },
    section: "keep-reading",
  },
];

async function main() {
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const update of linkUpdates) {
    const rows = await sql`select id, title, content from posts where id = ${update.postId}`;
    const post = rows[0];
    if (!post) {
      console.log(`❌ Post ${update.postId} not found`);
      failed++;
      continue;
    }

    // Skip if link already exists
    if (post.content.includes(update.addLink.slug)) {
      console.log(`⏭️  [${post.id}] Already has link to /${update.addLink.slug}`);
      skipped++;
      continue;
    }

    const newLink = `[${update.addLink.text}](/blog/${update.addLink.slug})`;
    let newContent = null;

    if (update.section === "related-byteverse") {
      // Append to "Related ByteVerse guides" paragraph
      const nearIdx = post.content.indexOf("Related ByteVerse");
      if (nearIdx === -1) {
        console.log(`⚠️  [${post.id}] No "Related ByteVerse" section in: ${post.title}`);
        failed++;
        continue;
      }
      const afterSection = post.content.substring(nearIdx);
      const linkParagraphMatch = afterSection.match(/\n\n(Next, read .+?)(\n\n|$)/s);
      if (linkParagraphMatch) {
        const existingParagraph = linkParagraphMatch[1];
        // Try to insert before closing phrase
        let updatedParagraph = existingParagraph.replace(
          / to build a stronger workflow around this topic\.?$/,
          `, ${newLink} to build a stronger workflow around this topic.`
        );
        if (updatedParagraph === existingParagraph) {
          let updatedP2 = existingParagraph.replace(
            / to explore more\.?$/,
            `, ${newLink} to explore more.`
          );
          if (updatedP2 === existingParagraph) {
            // Fallback: append with comma
            updatedParagraph = existingParagraph.trimEnd().replace(/\.?$/, "") + `, and ${newLink}.`;
          } else {
            updatedParagraph = updatedP2;
          }
        }
        newContent = post.content.replace(existingParagraph, updatedParagraph);
      } else {
        // No existing paragraph, add one
        newContent = post.content.replace(
          "Related ByteVerse",
          `Related ByteVerse guides\n\nAlso read ${newLink}.`
        );
      }
    } else if (update.section === "related-guides") {
      // Add bullet to "## Related Guides" section
      const marker = "## Related Guides";
      const idx = post.content.indexOf(marker);
      if (idx === -1) {
        console.log(`⚠️  [${post.id}] No "Related Guides" section in: ${post.title}`);
        failed++;
        continue;
      }
      // Find the last bullet in this section
      const afterMarker = post.content.substring(idx);
      const bulletMatch = afterMarker.match(/(- \[.+?\]\(.+?\)\n)(?!\s*- )/);
      if (bulletMatch) {
        const lastBullet = bulletMatch[1];
        const lastBulletIdx = post.content.indexOf(lastBullet, idx);
        newContent =
          post.content.slice(0, lastBulletIdx + lastBullet.length) +
          `- ${newLink}\n` +
          post.content.slice(lastBulletIdx + lastBullet.length);
      } else {
        // Add after heading
        newContent = post.content.replace(
          marker,
          `${marker}\n\n- ${newLink}`
        );
      }
    } else if (update.section === "keep-reading") {
      // Add bullet to "## Keep Reading" section
      const marker = "## Keep Reading";
      const idx = post.content.indexOf(marker);
      if (idx === -1) {
        console.log(`⚠️  [${post.id}] No "Keep Reading" section in: ${post.title}`);
        failed++;
        continue;
      }
      const afterMarker = post.content.substring(idx);
      const bulletMatch = afterMarker.match(/(- \[.+?\]\(.+?\)\n)(?!\s*- )/);
      if (bulletMatch) {
        const lastBullet = bulletMatch[1];
        const lastBulletIdx = post.content.indexOf(lastBullet, idx);
        newContent =
          post.content.slice(0, lastBulletIdx + lastBullet.length) +
          `- ${newLink}\n` +
          post.content.slice(lastBulletIdx + lastBullet.length);
      } else {
        newContent = post.content.replace(
          marker,
          `${marker}\n\n- ${newLink}`
        );
      }
    } else if (update.section === "before-final") {
      // Add a Related Guides section before the final heading
      const heading = update.finalHeading;
      const idx = post.content.indexOf(heading);
      if (idx === -1) {
        console.log(`⚠️  [${post.id}] No "${heading}" section in: ${post.title}`);
        failed++;
        continue;
      }
      // Check if there's already a "Related Guides" section
      const relatedIdx = post.content.indexOf("## Related Guides");
      if (relatedIdx !== -1 && relatedIdx < idx) {
        // Already has Related Guides, add bullet there
        const afterRelated = post.content.substring(relatedIdx);
        const bulletMatch = afterRelated.match(/(- \[.+?\]\(.+?\)\n)(?!\s*- )/);
        if (bulletMatch) {
          const lastBullet = bulletMatch[1];
          const lastBulletIdx = post.content.indexOf(lastBullet, relatedIdx);
          newContent =
            post.content.slice(0, lastBulletIdx + lastBullet.length) +
            `- ${newLink}\n` +
            post.content.slice(lastBulletIdx + lastBullet.length);
        }
      }
      if (!newContent) {
        // Insert new Related Guides section before the final heading
        newContent = post.content.replace(
          heading,
          `## Related Guides\n\n- ${newLink}\n\n${heading}`
        );
      }
    }

    if (!newContent || newContent === post.content) {
      console.log(`⚠️  [${post.id}] Content unchanged for: ${post.title}`);
      failed++;
      continue;
    }

    await sql`update posts set content = ${newContent}, updated_at = now() where id = ${update.postId}`;
    console.log(`✅ [${post.id}] Added link to /${update.addLink.slug} in: ${post.title}`);
    updated++;
  }

  console.log(`\n════════════════════════════`);
  console.log(`✅ Updated: ${updated} links added`);
  console.log(`⏭️  Skipped: ${skipped} (already had link)`);
  console.log(`❌ Failed: ${failed}`);

  // Verify orphans remaining
  console.log(`\n── Verifying orphans ──`);
  const posts = await sql`select id, slug, content from posts where published = true`;
  const slugs = posts.map((p) => p.slug);
  const inbound = {};
  slugs.forEach((s) => (inbound[s] = 0));
  posts.forEach((p) => {
    const matches = p.content.match(/\/blog\/([a-z0-9-]+)/g) || [];
    matches.forEach((m) => {
      const s = m.replace("/blog/", "");
      if (inbound[s] !== undefined) inbound[s]++;
    });
  });
  const orphans = slugs.filter((s) => inbound[s] === 0);
  console.log(`Remaining orphans: ${orphans.length}`);
  orphans.forEach((s) => console.log(`  - ${s}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
