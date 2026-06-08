import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

const img = (id) => `https://images.unsplash.com/photo-${id}?w=1200&h=675&fit=crop&auto=format&q=80`;

const sharedScheduledPlacements = [
  "## Why This Topic Matters",
  "## How to Choose the Right Keywords",
  "## Example Publishing Order",
  "## 30-Minute Action Plan",
];

const posts = [
  {
    slug: "how-many-blog-posts-before-traffic-starts-2026",
    placements: [
      "## The Short Answer",
      "## What Usually Happens After 20 to 30 Posts",
      "## The 90-Day Roadmap for a New Blog",
      "## What If You Have 30 Posts and No Traffic?",
    ],
    images: [
      {
        url: img("1499750310107-5fef28a66643"),
        alt: "blogger planning article milestones in a notebook beside a laptop",
        caption: "Planning post milestones helps a new blog grow with a clear publishing target.",
      },
      {
        url: img("1460925895917-afdab827c52f"),
        alt: "analytics dashboard on a laptop for tracking early blog traffic",
        caption: "Early impressions and clicks matter more than raw post count in the first months.",
      },
      {
        url: img("1506784983877-45594efa4cbe"),
        alt: "content calendar and planning notes for a new blog schedule",
        caption: "A simple 90-day content calendar keeps a new blog focused on one cluster.",
      },
      {
        url: img("1516321318423-f06f85e504b3"),
        alt: "person reviewing blog SEO checklist on a laptop workspace",
        caption: "Reviewing Search Console and updating older posts turns early signals into traffic.",
      },
    ],
  },
  {
    slug: "90-day-blog-content-plan-new-websites-2026",
    placements: sharedScheduledPlacements,
    images: [
      {
        url: img("1497366754035-f200968a6e72"),
        alt: "workspace with notebook calendar and laptop for a 90 day content plan",
        caption: "A realistic 90-day plan gives every blog post a clear job in the cluster.",
      },
      {
        url: img("1506784983877-45594efa4cbe"),
        alt: "weekly content calendar with tasks and publishing notes",
        caption: "Weekly planning is easier when pillar posts and support posts are mapped first.",
      },
      {
        url: img("1454165804606-c3d57bc86b40"),
        alt: "team reviewing content performance charts on a laptop",
        caption: "Performance reviews help decide which posts should be updated before publishing more.",
      },
      {
        url: img("1517245386807-bb43f82c33c4"),
        alt: "desk with planning notes and laptop for content workflow updates",
        caption: "A repeatable update routine keeps the 90-day plan from becoming stale.",
      },
    ],
  },
  {
    slug: "blog-post-ideas-new-bloggers-2026",
    placements: sharedScheduledPlacements,
    images: [
      {
        url: img("1455390582262-044cdead277a"),
        alt: "blog post ideas written in a notebook beside a laptop",
        caption: "Good blog ideas start with specific reader problems, not broad topics.",
      },
      {
        url: img("1522202176988-66273c2fd55f"),
        alt: "person brainstorming content ideas on a laptop with notes",
        caption: "Brainstorming works best when ideas are grouped by search intent.",
      },
      {
        url: img("1499750310107-5fef28a66643"),
        alt: "writer organizing blog topic ideas at a desk",
        caption: "Turning ideas into a publishing order prevents random posting.",
      },
      {
        url: img("1519389950473-47ba0277781c"),
        alt: "content planning workspace with laptop and research notes",
        caption: "Research notes make it easier to turn one keyword into several useful posts.",
      },
    ],
  },
  {
    slug: "build-topical-authority-new-blog-2026",
    placements: sharedScheduledPlacements,
    images: [
      {
        url: img("1551288049-bebda4e38f71"),
        alt: "analytics and content strategy dashboard for topical authority planning",
        caption: "Topical authority grows when related pages support the same subject.",
      },
      {
        url: img("1454165804606-c3d57bc86b40"),
        alt: "content team reviewing topic cluster performance on a laptop",
        caption: "A focused cluster is easier to improve than a scattered list of articles.",
      },
      {
        url: img("1497366811353-6870744d04b2"),
        alt: "person mapping a website content structure with notes",
        caption: "Mapping the cluster before publishing helps each support post connect naturally.",
      },
      {
        url: img("1516321318423-f06f85e504b3"),
        alt: "laptop showing planning work for SEO content improvements",
        caption: "Internal links and updates turn topic coverage into a stronger site signal.",
      },
    ],
  },
  {
    slug: "google-search-console-new-blogs-2026",
    placements: sharedScheduledPlacements,
    images: [
      {
        url: img("1460925895917-afdab827c52f"),
        alt: "analytics dashboard showing charts for blog traffic tracking",
        caption: "Search Console impressions are often the first sign that Google is testing a new blog.",
      },
      {
        url: img("1551288049-bebda4e38f71"),
        alt: "SEO analytics dashboard with charts and performance metrics",
        caption: "Tracking queries helps decide what to improve before writing more content.",
      },
      {
        url: img("1497366754035-f200968a6e72"),
        alt: "notebook and laptop used for weekly blog performance review",
        caption: "A weekly review keeps Search Console data actionable instead of overwhelming.",
      },
      {
        url: img("1517245386807-bb43f82c33c4"),
        alt: "workspace for updating blog posts after reviewing SEO metrics",
        caption: "Pages with impressions but low clicks are usually the best update candidates.",
      },
    ],
  },
  {
    slug: "blog-seo-checklist-before-publishing-2026",
    placements: sharedScheduledPlacements,
    images: [
      {
        url: img("1484480974693-6ca0a78fb36b"),
        alt: "checklist on paper beside a laptop before publishing a blog post",
        caption: "A pre-publish SEO checklist catches small issues before they become ranking problems.",
      },
      {
        url: img("1516321318423-f06f85e504b3"),
        alt: "person checking blog post details on a laptop before publishing",
        caption: "Titles, headings, images, and internal links should be reviewed before publishing.",
      },
      {
        url: img("1455390582262-044cdead277a"),
        alt: "editorial notes for optimizing a blog post checklist",
        caption: "Clear notes make it easier to repeat the same quality process for every post.",
      },
      {
        url: img("1497366811353-6870744d04b2"),
        alt: "content editor organizing SEO checklist and article structure",
        caption: "A checklist connects strategy, formatting, metadata, and internal links in one pass.",
      },
    ],
  },
  {
    slug: "update-old-blog-posts-for-more-traffic-2026",
    placements: sharedScheduledPlacements,
    images: [
      {
        url: img("1517245386807-bb43f82c33c4"),
        alt: "person updating old blog content using a laptop and notes",
        caption: "Updating old posts is often faster than publishing from scratch.",
      },
      {
        url: img("1460925895917-afdab827c52f"),
        alt: "traffic analytics dashboard used to find old blog posts worth updating",
        caption: "Search Console data shows which old posts already have ranking potential.",
      },
      {
        url: img("1499750310107-5fef28a66643"),
        alt: "writer reviewing and editing an older blog article at a desk",
        caption: "Refreshing examples and internal links can make an old article useful again.",
      },
      {
        url: img("1506784983877-45594efa4cbe"),
        alt: "calendar used to schedule recurring blog content updates",
        caption: "A recurring update schedule keeps important posts from becoming outdated.",
      },
    ],
  },
];

function imageMarkdown(image) {
  return `![${image.alt}](${image.url} "${image.caption}")`;
}

function insertAfterHeading(content, heading, image) {
  if (content.includes(image.url)) return content;

  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) {
    return `${content.trimEnd()}\n\n${imageMarkdown(image)}\n`;
  }

  const nextHeadingIndex = content.indexOf("\n## ", headingIndex + heading.length);
  const insertAt = nextHeadingIndex === -1 ? content.length : nextHeadingIndex;
  const before = content.slice(0, insertAt).trimEnd();
  const after = content.slice(insertAt);

  return `${before}\n\n${imageMarkdown(image)}\n${after}`;
}

async function main() {
  const results = [];

  for (const post of posts) {
    const [row] = await sql`SELECT id, slug, title, content FROM posts WHERE slug = ${post.slug} LIMIT 1`;
    if (!row) {
      throw new Error(`Post not found: ${post.slug}`);
    }

    let content = row.content;
    post.images.forEach((image, index) => {
      content = insertAfterHeading(content, post.placements[index] || post.placements.at(-1), image);
    });

    await sql`UPDATE posts SET content = ${content}, updated_at = NOW() WHERE slug = ${post.slug}`;

    const markdownImages = [...content.matchAll(/!\[[^\]]*\]\([^)]+\)/g)].length;
    results.push({ id: row.id, slug: row.slug, markdownImages });
  }

  console.log(JSON.stringify({ updated: results.length, posts: results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});