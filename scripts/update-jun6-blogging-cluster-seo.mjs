import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

const posts = [
  {
    slug: "how-to-start-a-tech-blog-2026-seo-checklist",
    title: "How to Start a Tech Blog in 2026: 17-Step SEO Checklist",
    metaTitle: "How to Start a Tech Blog in 2026: 17-Step Checklist",
    metaDescription: "Start a tech blog in 2026 with a practical SEO checklist covering niche, content, tools, traffic, and monetization steps.",
    clusterLinks: [
      ["How to Get Traffic to a New Blog in 2026", "https://www.byteverse.fyi/blog/how-to-get-traffic-to-a-new-blog-2026"],
      ["Low Competition Keywords for New Blogs", "https://www.byteverse.fyi/blog/low-competition-keywords-for-new-blogs-2026"],
      ["Affiliate Marketing for Beginners", "https://www.byteverse.fyi/blog/affiliate-marketing-for-beginners-2026"],
    ],
  },
  {
    slug: "how-to-get-traffic-to-a-new-blog-2026",
    title: "How to Get Traffic to a New Blog in 2026: 10 Practical SEO Steps",
    metaTitle: "How to Get Traffic to a New Blog: 10 SEO Steps",
    metaDescription: "Get traffic to a new blog in 2026 with 10 practical SEO steps for keywords, internal links, topic clusters, tools, and content updates.",
    clusterLinks: [
      ["Low Competition Keywords for New Blogs", "https://www.byteverse.fyi/blog/low-competition-keywords-for-new-blogs-2026"],
      ["How to Start a Tech Blog in 2026", "https://www.byteverse.fyi/blog/how-to-start-a-tech-blog-2026-seo-checklist"],
      ["Best AI SEO Tools in 2026", "https://www.byteverse.fyi/blog/best-ai-seo-tools-2026"],
      ["SEO Title Analyzer", "https://www.byteverse.fyi/tools/seo-title-analyzer"],
    ],
  },
  {
    slug: "affiliate-marketing-for-beginners-2026",
    title: "Affiliate Marketing for Beginners 2026: 10-Step Tech Blog Plan",
    metaTitle: "Affiliate Marketing for Beginners: 10-Step Blog Plan",
    metaDescription: "Start affiliate marketing with a tech blog in 2026 using this 10-step plan for niche, content, traffic, programs, and SEO.",
    clusterLinks: [
      ["How to Get Traffic to a New Blog", "https://www.byteverse.fyi/blog/how-to-get-traffic-to-a-new-blog-2026"],
      ["Low Competition Keywords for New Blogs", "https://www.byteverse.fyi/blog/low-competition-keywords-for-new-blogs-2026"],
      ["Best AI Writing Tools in 2026", "https://www.byteverse.fyi/blog/best-ai-writing-tools-2026"],
    ],
  },
  {
    slug: "low-competition-keywords-for-new-blogs-2026",
    title: "Low Competition Keywords for New Blogs in 2026: 15 Easy Ideas",
    metaTitle: "Low Competition Keywords for New Blogs: 15 Ideas",
    metaDescription: "Find low competition keywords for new blogs in 2026 with 15 practical ideas, examples, intent checks, and internal linking tips.",
    clusterLinks: [
      ["How to Get Traffic to a New Blog", "https://www.byteverse.fyi/blog/how-to-get-traffic-to-a-new-blog-2026"],
      ["How to Start a Tech Blog in 2026", "https://www.byteverse.fyi/blog/how-to-start-a-tech-blog-2026-seo-checklist"],
      ["SEO Title Analyzer", "https://www.byteverse.fyi/tools/seo-title-analyzer"],
    ],
  },
  {
    slug: "best-ai-writing-tools-2026",
    title: "Best AI Writing Tools for Bloggers in 2026: 10 Tested Picks",
    metaTitle: "Best AI Writing Tools for Bloggers: 10 Tested Picks",
    metaDescription: "Compare 10 AI writing tools for bloggers in 2026. See picks for drafts, SEO content, editing, outlines, and faster publishing.",
    clusterLinks: [
      ["How to Get Traffic to a New Blog", "https://www.byteverse.fyi/blog/how-to-get-traffic-to-a-new-blog-2026"],
      ["Low Competition Keywords for New Blogs", "https://www.byteverse.fyi/blog/low-competition-keywords-for-new-blogs-2026"],
      ["Affiliate Marketing for Beginners", "https://www.byteverse.fyi/blog/affiliate-marketing-for-beginners-2026"],
    ],
  },
  {
    slug: "best-ai-seo-tools-2026",
    title: "Best AI SEO Tools in 2026: 10 Tools to Grow Blog Traffic",
    metaTitle: "Best AI SEO Tools in 2026: 10 Blog Traffic Tools",
    metaDescription: "Compare 10 AI SEO tools in 2026 for keyword research, content optimization, AI Overviews, LLM visibility, and blog traffic growth.",
    clusterLinks: [
      ["How to Get Traffic to a New Blog", "https://www.byteverse.fyi/blog/how-to-get-traffic-to-a-new-blog-2026"],
      ["Low Competition Keywords for New Blogs", "https://www.byteverse.fyi/blog/low-competition-keywords-for-new-blogs-2026"],
      ["SEO Title Analyzer", "https://www.byteverse.fyi/tools/seo-title-analyzer"],
      ["Meta Tag Generator", "https://www.byteverse.fyi/tools/meta-tag-generator"],
    ],
  },
];

function buildClusterBlock(links) {
  return [
    "## Keep Learning in This Blogging SEO Cluster",
    "",
    "If you are working on blog traffic and monetization, read these next:",
    "",
    ...links.map(([label, url]) => `- [${label}](${url})`),
    "",
  ].join("\n");
}

function insertClusterBlock(content, links) {
  if (content.includes("## Keep Learning in This Blogging SEO Cluster")) {
    return content;
  }

  const block = buildClusterBlock(links);
  const firstHeading = content.indexOf("\n\n## ");
  if (firstHeading === -1) {
    return `${content.trim()}\n\n${block}`;
  }

  return `${content.slice(0, firstHeading)}\n\n${block}${content.slice(firstHeading + 2)}`;
}

async function main() {
  console.log("Updating blogging SEO cluster...\n");

  for (const post of posts) {
    const rows = await sql`SELECT content FROM posts WHERE slug = ${post.slug} LIMIT 1`;
    if (!rows.length) {
      throw new Error(`Post not found: ${post.slug}`);
    }

    const content = insertClusterBlock(rows[0].content, post.clusterLinks);

    await sql`
      UPDATE posts
      SET title = ${post.title},
          meta_title = ${post.metaTitle},
          meta_description = ${post.metaDescription},
          content = ${content},
          updated_at = NOW()
      WHERE slug = ${post.slug}
    `;

    console.log(`Updated: ${post.slug}`);
  }

  console.log("\nBlogging SEO cluster update complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});