import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const APPLY = process.argv.includes("--apply");
const TARGET_CONTENT_IMAGES = 4;

const img = (id, width = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const image = (id, alt, caption) => ({ id, url: img(id), alt, caption });

const POOLS = {
  sales: [
    image("1556761175-b413da4baf72", "Sales team reviewing revenue pipeline", "Sales teams need clear pipeline data before automating outreach."),
    image("1551836022-d5d88e9218df", "Account executives planning a customer follow-up", "Human follow-up still matters even when AI handles the repetitive work."),
    image("1542744173-8e7e53415bb0", "Business presentation with a sales team", "Good sales tools make performance reviews easier to understand."),
    image("1557804506-669a67965ba0", "Team discussing growth strategy in an office", "Revenue workflows work best when marketing and sales share the same context."),
    image("1521737604893-d14cc237f11d", "Colleagues comparing customer notes on a laptop", "Shared customer notes help teams personalize outreach without slowing down."),
  ],
  seo: [
    image("1460925895917-afdab827c52f", "Marketer reviewing SEO analytics on a laptop", "SEO tools are most useful when the data leads to a clear publishing decision."),
    image("1551288049-bebda4e38f71", "Search performance dashboard on a monitor", "AI SEO workflows depend on clean dashboards and careful human review."),
    image("1559136555-9303baea8ebd", "Content team planning search growth", "Modern SEO is a mix of research, editorial judgment, and technical hygiene."),
    image("1553028826-f4804a6dba3b", "Analyst comparing marketing reports", "Rank tracking matters more when it is connected to business outcomes."),
    image("1497366811353-6870744d04b2", "Workspace prepared for content research", "A focused research process prevents AI content from becoming generic."),
  ],
  spreadsheet: [
    image("1460925895917-afdab827c52f", "Analyst using spreadsheets and dashboards", "AI spreadsheet tools help teams move from raw rows to decisions faster."),
    image("1551288049-bebda4e38f71", "Business intelligence dashboard on a monitor", "A useful spreadsheet workflow turns messy data into visible patterns."),
    image("1504384308090-c894fdcc538d", "Team reviewing analytics data together", "Shared dashboards are easier to trust when formulas and sources are visible."),
    image("1554224155-6726b3ff858f", "Professional working through financial data", "Finance and operations teams need automation that keeps the source data clear."),
    image("1516321318423-f06f85e504b3", "Laptop workspace for spreadsheet analysis", "Even simple spreadsheet automation can save hours of manual cleanup."),
  ],
  agent: [
    image("1551288049-bebda4e38f71", "Automation dashboard for AI agents", "AI agents need monitoring so teams can trust what they do in production."),
    image("1518770660439-4636190af475", "Developer workstation for automation workflows", "Agent builders work best when business rules are visible and testable."),
    image("1520607162513-77705c0f0d4a", "Team mapping an automation process", "No-code agents still need a human owner who understands the workflow."),
    image("1504639725590-34d0984388bd", "Code editor used to configure automation", "Technical teams can extend no-code agents with custom actions and APIs."),
    image("1531482615713-2afd69097998", "Person working on an AI workflow from a laptop", "The best AI workflows remove repetitive steps without hiding responsibility."),
  ],
  support: [
    image("1553484771-371a605b060b", "Support team handling customer conversations", "Customer service AI should help agents respond faster without losing empathy."),
    image("1521737604893-d14cc237f11d", "Support colleagues reviewing a customer case", "Complex tickets still benefit from people who understand the customer context."),
    image("1551836022-d5d88e9218df", "Team discussing customer experience improvements", "The best chatbot rollout starts with the most common support questions."),
    image("1516321318423-f06f85e504b3", "Customer support dashboard on a laptop", "Support automation is easier to improve when the team can see trends."),
    image("1557804506-669a67965ba0", "Operations team planning a better support workflow", "AI support tools should reduce busywork, not create another inbox."),
  ],
  voice: [
    image("1516280440614-37939bbacd81", "Creator recording audio in a studio", "Voice generation works best when the script and delivery match the audience."),
    image("1478737270239-2f02b77fc618", "Person speaking into a studio microphone", "Human-sounding audio still depends on pacing, tone, and editing choices."),
    image("1516280440614-37939bbacd81", "Podcast microphone setup for voice content", "A clean voice workflow includes script review before publishing."),
    image("1590602847861-f357a9332bbc", "Audio producer reviewing a recording", "Voice tools save time when creators keep quality control in the loop."),
    image("1520170350707-b2da59970118", "Creator editing audio from a laptop", "The best text-to-speech output still needs human review before launch."),
  ],
  design: [
    image("1558655146-d09347e92766", "Designer sketching brand ideas at a desk", "AI design tools are strongest when they support a clear brand direction."),
    image("1559028012-481c04fa702d", "Creative team reviewing visual concepts", "A good logo workflow compares several directions before choosing one."),
    image("1500530855697-b586d89ba3ee", "Workspace with design planning materials", "Visual tools work better when the brief is specific about audience and style."),
    image("1497366754035-f200968a6e72", "Creative professional working on a laptop", "The final design still needs a human eye for consistency and taste."),
    image("1551836022-d5d88e9218df", "Team reviewing brand assets together", "Brand decisions are easier when stakeholders can compare options side by side."),
  ],
  presentation: [
    image("1542744173-8e7e53415bb0", "Presenter explaining slides to a team", "AI presentation makers help most when the story is already clear."),
    image("1552664730-d307ca884978", "Team workshop for slide planning", "Strong presentations start with message structure before slide design."),
    image("1557804506-669a67965ba0", "Business team reviewing a deck", "AI can speed up slide drafts while people refine the argument."),
    image("1520607162513-77705c0f0d4a", "Colleagues planning presentation content", "A useful deck gives the audience a clear next step."),
    image("1521737604893-d14cc237f11d", "Team comparing presentation notes", "Collaborative review keeps AI-generated slides from feeling generic."),
  ],
  email: [
    image("1516321318423-f06f85e504b3", "Professional managing email from a laptop", "Email assistants are most valuable when they protect focus time."),
    image("1551836022-d5d88e9218df", "Team planning better communication workflows", "Shared email rules keep automation consistent across a team."),
    image("1521737604893-d14cc237f11d", "Colleagues reviewing client messages", "AI email drafts still need the right context and tone."),
    image("1497366811353-6870744d04b2", "Quiet workspace for focused email work", "A calm inbox workflow makes it easier to respond thoughtfully."),
    image("1557804506-669a67965ba0", "Office team discussing follow-up messages", "Good email automation helps teams follow up without sounding robotic."),
  ],
  career: [
    image("1522202176988-66273c2fd55f", "Professionals networking around a laptop", "Career tools work best when they help people show real work clearly."),
    image("1551836022-d5d88e9218df", "Candidate preparing job application materials", "A stronger application starts with evidence, not generic claims."),
    image("1573496359142-b8d87734a5a2", "Professional preparing for an interview", "AI resume tools should sharpen the story without inventing experience."),
    image("1521791136064-7986c2920216", "People shaking hands after a meeting", "Networking still depends on trust, timing, and useful follow-up."),
    image("1516321318423-f06f85e504b3", "Laptop open for resume and profile updates", "Small profile improvements can create more recruiter replies."),
  ],
  cybersecurity: [
    image("1555949963-ff9fe0c870eb", "Security professional reviewing code on a screen", "Security habits work best when they are simple enough to repeat."),
    image("1614064641938-3bbee52942c7", "Cybersecurity dashboard in a security workflow", "A visible security checklist makes risky accounts easier to spot."),
    image("1526374965328-7f61d4dc18c5", "Developer reviewing security logs", "Strong account protection combines technical controls with user awareness."),
    image("1633265486064-086b219458ec", "Password security concept on a workstation", "Password managers reduce risk by making unique passwords practical."),
    image("1510511459019-5dda7724fd87", "Person working on privacy and VPN settings", "Privacy tools are useful only when the tradeoffs are clear."),
  ],
  coding: [
    image("1515879218367-8466d910aaa4", "Developer writing code on a laptop", "Good developer tools reduce friction without hiding how the code works."),
    image("1555066931-4365d14bab8c", "Programmer working in a code editor", "AI coding workflows still need tests, review, and clear architecture."),
    image("1484417894907-623942c8ee29", "Code displayed on a development monitor", "A focused setup helps developers debug faster and ship with confidence."),
    image("1531482615713-2afd69097998", "Developer learning from a laptop", "The fastest learning happens when examples turn into small real projects."),
    image("1504639725590-34d0984388bd", "Engineer building software in a code editor", "Modern coding assistants are best used as pair programmers, not autopilot."),
    image("1498050108023-c5249f4df085", "Laptop with web development code", "Reliable web projects come from simple patterns that are easy to maintain."),
  ],
  productivity: [
    image("1497366811353-6870744d04b2", "Focused workspace for planning work", "Productivity systems should make the next action obvious."),
    image("1516321318423-f06f85e504b3", "Person organizing work on a laptop", "The right app should reduce decisions, not add another dashboard to manage."),
    image("1522202176988-66273c2fd55f", "Team collaborating on a productivity workflow", "Shared systems help teams stay aligned without constant meetings."),
    image("1500530855697-b586d89ba3ee", "Desk setup for focused study and planning", "A useful workflow gives time blocks a realistic purpose."),
    image("1551836022-d5d88e9218df", "Professionals reviewing project priorities", "Automation is most helpful when priorities are already clear."),
  ],
  web: [
    image("1498050108023-c5249f4df085", "Developer building a website on a laptop", "A good website workflow balances design, speed, SEO, and maintainability."),
    image("1515879218367-8466d910aaa4", "Web developer coding a frontend project", "Modern web projects move faster when the core structure is simple."),
    image("1555066931-4365d14bab8c", "Engineer testing a web application", "Deployment is less stressful when testing and SEO checks are part of the workflow."),
    image("1531482615713-2afd69097998", "Developer planning a site from a laptop", "The best site builders still need a clear content and conversion plan."),
    image("1522252234503-e356532cafd5", "Workspace for building and reviewing a website", "Fast websites are built through small decisions across images, scripts, and hosting."),
  ],
  business: [
    image("1551836022-d5d88e9218df", "Small business team planning AI adoption", "Small teams should automate the work that repeats every week."),
    image("1557804506-669a67965ba0", "Business team reviewing operational priorities", "AI tools work best when they support a clear business process."),
    image("1552664730-d307ca884978", "Workshop for choosing business software", "The right tool should save time quickly without creating a training burden."),
    image("1521737604893-d14cc237f11d", "Colleagues comparing software options", "A practical AI rollout starts with one workflow and measurable results."),
    image("1520607162513-77705c0f0d4a", "Team mapping a business process on a laptop", "Simple process maps make automation easier to trust."),
  ],
};

const FALLBACK_POOL = [
  ...POOLS.business,
  ...POOLS.coding,
  ...POOLS.productivity,
  ...POOLS.web,
];

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index++) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

function normalizeImageUrl(value) {
  if (!value) return null;
  return value.split("?")[0];
}

function getMarkdownImages(content) {
  return [...content.matchAll(/!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map((match) => ({
    full: match[0],
    url: match[1],
    normalized: normalizeImageUrl(match[1]),
  }));
}

function topicFor(post) {
  const text = `${post.slug} ${post.title} ${post.category_slug || ""}`.toLowerCase();
  if (/spreadsheet|excel|sheets|airtable|rows/.test(text)) return "spreadsheet";
  if (/seo|search|ranking|blog/.test(text)) return "seo";
  if (/sales|crm|prospecting|revenue/.test(text)) return "sales";
  if (/agent|automation|rag|langgraph/.test(text)) return "agent";
  if (/customer|support|chatbot|ticket/.test(text)) return "support";
  if (/voice|audio|speech|podcast/.test(text)) return "voice";
  if (/logo|image|canva|adobe|design|creative|video/.test(text)) return "design";
  if (/presentation|slide|deck/.test(text)) return "presentation";
  if (/email|inbox/.test(text)) return "email";
  if (/linkedin|resume|cv|job|career|freelanc|interview/.test(text)) return "career";
  if (/password|vpn|security|hacked|2fa|passkey|auth|cyber/.test(text)) return "cybersecurity";
  if (/code|coding|developer|programming|javascript|typescript|react|nextjs|docker|git|github|vscode|cursor|copilot|api|wsl|linux|tailwind|hosting/.test(text)) return "coding";
  if (/productivity|notion|obsidian|time|student|workflow|notes/.test(text)) return "productivity";
  if (/website|portfolio|speed|deployment|vercel|builder/.test(text)) return "web";
  if (/business|small/.test(text)) return "business";
  return "business";
}

function selectImages(post, count, usedNormalized = new Set()) {
  const primary = POOLS[topicFor(post)] || [];
  const pool = [...primary, ...FALLBACK_POOL];
  const seenIds = new Set();
  const uniquePool = pool.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
  const start = hash(post.slug) % uniquePool.length;
  const selected = [];

  for (let offset = 0; offset < uniquePool.length && selected.length < count; offset++) {
    const candidate = uniquePool[(start + offset) % uniquePool.length];
    const normalized = normalizeImageUrl(candidate.url);
    if (usedNormalized.has(normalized)) continue;
    usedNormalized.add(normalized);
    selected.push(candidate);
  }

  return selected;
}

function removeCoverDuplicateImages(content, coverImage) {
  const cover = normalizeImageUrl(coverImage);
  if (!cover) return content;
  return content
    .replace(/\n{0,2}!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)\s*(?=\n|$)/g, (match, url) => {
      return normalizeImageUrl(url) === cover ? "\n" : match;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function imageMarkdown(item) {
  return `![${item.alt}](${item.url} "${item.caption}")`;
}

function getInsertionPointAfterHeading(content, headingMatch) {
  const afterHeading = headingMatch.index + headingMatch[0].length;
  const nextHeading = content.slice(afterHeading).search(/\n##\s+/);
  const sectionEnd = nextHeading === -1 ? content.length : afterHeading + nextHeading;
  const section = content.slice(afterHeading, sectionEnd).trimStart();
  if (!section) return afterHeading;

  const sectionStart = sectionEnd - content.slice(afterHeading, sectionEnd).length + content.slice(afterHeading, sectionEnd).search(/\S/);
  const paragraphBreak = content.indexOf("\n\n", sectionStart);
  if (paragraphBreak !== -1 && paragraphBreak < sectionEnd) return paragraphBreak;
  return Math.min(sectionEnd, sectionStart + section.length);
}

function insertImages(content, images) {
  if (images.length === 0) return content;
  const headingMatches = [...content.matchAll(/^##\s+.+$/gm)].filter((match) => !/^##\s+(faq|frequently asked)/i.test(match[0]));
  let updated = content;
  let shift = 0;

  if (headingMatches.length > 0) {
    const slots = images.map((_, index) => Math.min(headingMatches.length - 1, Math.floor(((index + 1) * headingMatches.length) / (images.length + 1))));
    const usedSlots = new Set();

    images.forEach((item, index) => {
      let slot = slots[index];
      while (usedSlots.has(slot) && slot < headingMatches.length - 1) slot++;
      usedSlots.add(slot);
      const position = getInsertionPointAfterHeading(updated, {
        ...headingMatches[slot],
        index: headingMatches[slot].index + shift,
      });
      const block = `\n\n${imageMarkdown(item)}\n\n`;
      updated = `${updated.slice(0, position)}${block}${updated.slice(position)}`;
      shift += block.length;
    });

    return updated.replace(/\n{3,}/g, "\n\n").trim();
  }

  return `${updated.trim()}\n\n${images.map(imageMarkdown).join("\n\n")}`.trim();
}

const posts = await sql`
  SELECT p.id, p.slug, p.title, p.cover_image, p.content, c.slug AS category_slug
  FROM posts p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.published = true
  ORDER BY p.created_at DESC
`;

const coverGroups = new Map();
for (const post of posts) {
  const key = normalizeImageUrl(post.cover_image);
  if (!key) continue;
  coverGroups.set(key, [...(coverGroups.get(key) || []), post.slug]);
}

const usedCoverUrls = new Set(posts.map((post) => normalizeImageUrl(post.cover_image)).filter(Boolean));
const updates = [];

for (const post of posts) {
  const originalContent = post.content;
  let content = removeCoverDuplicateImages(post.content, post.cover_image);
  const coverKey = normalizeImageUrl(post.cover_image);
  let coverImage = post.cover_image;
  let coverChanged = false;

  if (coverKey && (coverGroups.get(coverKey) || []).length > 1 && (coverGroups.get(coverKey) || [])[0] !== post.slug) {
    const [replacementCover] = selectImages(post, 1, usedCoverUrls);
    if (replacementCover) {
      coverImage = replacementCover.url;
      coverChanged = normalizeImageUrl(coverImage) !== coverKey;
      usedCoverUrls.add(normalizeImageUrl(coverImage));
      content = removeCoverDuplicateImages(content, coverImage);
    }
  }

  const existingImages = getMarkdownImages(content);
  const existingNormalized = new Set(existingImages.map((item) => item.normalized).filter(Boolean));
  const contentImageCount = existingNormalized.size;
  const needed = Math.max(0, TARGET_CONTENT_IMAGES - contentImageCount);
  const additions = selectImages(post, needed, new Set([...existingNormalized, normalizeImageUrl(coverImage)].filter(Boolean)));

  if (additions.length > 0) {
    content = insertImages(content, additions);
  }

  const contentChanged = content !== originalContent;
  if (contentChanged || coverChanged) {
    updates.push({
      id: post.id,
      slug: post.slug,
      topic: topicFor(post),
      beforeImages: getMarkdownImages(originalContent).length,
      afterImages: getMarkdownImages(content).length,
      addedImages: additions.length,
      coverChanged,
      coverImage,
      content,
    });
  }
}

console.log(JSON.stringify({
  mode: APPLY ? "apply" : "dry-run",
  publishedPosts: posts.length,
  updates: updates.length,
  coverChanges: updates.filter((item) => item.coverChanged).length,
  postsReceivingImages: updates.filter((item) => item.addedImages > 0).length,
  sample: updates.slice(0, 12).map(({ slug, topic, beforeImages, afterImages, addedImages, coverChanged }) => ({
    slug,
    topic,
    beforeImages,
    afterImages,
    addedImages,
    coverChanged,
  })),
}, null, 2));

if (!APPLY) {
  console.log("Run with --apply to write changes.");
} else {
  for (const update of updates) {
    await sql`
      UPDATE posts
      SET content = ${update.content}, cover_image = ${update.coverImage}, updated_at = NOW()
      WHERE id = ${update.id}
    `;
    console.log(`Updated ${update.slug}: +${update.addedImages} images${update.coverChanged ? ", new cover" : ""}`);
  }

  console.log(`Done. Updated ${updates.length} posts.`);
}