import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const APPLY = process.argv.includes("--apply");
const IMAGES_PER_POST = 4;

const pexels = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;

const IDS = {
  business: [3184291, 3184357, 3184465, 3184339, 3184639, 3184405, 3182773, 3182812, 3183197, 3184325, 3184418, 3182763, 3183170, 3182811, 3184292],
  meetings: [1181406, 1181396, 1181435, 1181355, 1181345, 1181263, 1181244, 1181298, 1181316, 1181467, 1181675, 1181715, 1181605, 1181243, 1181414],
  coding: [574071, 577585, 3861969, 3861972, 3861958, 3861964, 3861976, 3861959, 3861943, 3861947, 3862132, 3862130],
  remote: [4050315, 4050291, 4050288, 4050420, 4050319, 4050295, 4050347, 4050318],
  analytics: [3183150, 3183153, 3183190, 3184360, 3184396, 3184460, 3184306, 3184431, 3184433, 3184611],
  study: [3760067, 3760069, 3760072, 3760074, 3760077, 3760081, 3760089],
  design: [4065624, 4065876, 4065906, 4065878, 4065877, 4065907],
  support: [5473955, 5473951, 5473950, 5473957, 5473956, 5473959],
  career: [7567443, 7567434, 7567460, 7567522, 7567431, 7567466],
  security: [8297452, 8297478, 8297484, 8297455, 8297465, 8297483],
  productivity: [6963944, 6963945, 6963946, 6963947, 6963953],
  presentation: [590016, 590020, 590022, 590037, 590041, 590045],
  audio: [927022, 927451, 927629, 928178, 928184, 928199],
};

const COPY = {
  sales: {
    alt: ["Sales team reviewing a customer pipeline", "Account executives planning a follow-up workflow", "Revenue team discussing outreach performance", "Business team comparing CRM notes"],
    caption: ["Sales automation works best when people can still see the customer context.", "A clear pipeline helps teams choose which AI sales tasks to automate first.", "Human review keeps outreach from sounding generic.", "CRM data is more useful when the whole team trusts it."],
  },
  seo: {
    alt: ["Marketing team reviewing search analytics", "SEO strategist comparing performance dashboards", "Content team planning organic traffic growth", "Analyst studying search visibility reports"],
    caption: ["AI SEO tools are most valuable when the data leads to a clear editorial decision.", "Search visibility work needs human judgment, not just automation.", "A strong SEO workflow connects research, content quality, and technical checks.", "Teams should use AI search data to improve pages, not to publish generic content."],
  },
  spreadsheet: {
    alt: ["Analyst reviewing spreadsheet data with a team", "Operations team comparing business dashboards", "Professional working through spreadsheet reports", "Team using analytics to make a planning decision"],
    caption: ["AI spreadsheet tools help people turn messy rows into useful decisions.", "The best spreadsheet workflows keep source data visible and explainable.", "Analytics tools save time when teams can trust the formulas behind the result.", "Spreadsheet automation should make review easier, not hide important assumptions."],
  },
  agent: {
    alt: ["Team mapping an AI automation workflow", "Developer configuring an automation project", "Operations team reviewing AI workflow steps", "Professional testing a business automation system"],
    caption: ["AI agents need clear ownership before they are trusted with real workflows.", "Automation is safer when teams can inspect each step.", "No-code agents still work best with human monitoring.", "A practical AI agent starts with one repetitive workflow and measurable results."],
  },
  support: {
    alt: ["Customer support team reviewing service requests", "Support agents discussing customer conversations", "Team improving a help desk workflow", "Professional responding to customer messages"],
    caption: ["Customer support AI should help agents respond faster without losing empathy.", "The best chatbot rollout starts with the questions customers ask most often.", "Support automation is easier to improve when teams can review conversation patterns.", "Human escalation remains important for sensitive or complex customer issues."],
  },
  voice: {
    alt: ["Creator recording voice content in a studio", "Audio producer reviewing a recording", "Person speaking into a microphone", "Creator editing audio on a laptop"],
    caption: ["AI voice tools still need human direction for tone, pacing, and context.", "Audio quality improves when creators review scripts before generating voiceovers.", "Voice generation works best when the delivery matches the audience.", "A good audio workflow combines automation with careful editing."],
  },
  design: {
    alt: ["Designer reviewing creative work on a laptop", "Creative team discussing brand visuals", "Professional sketching visual ideas", "Team comparing design concepts"],
    caption: ["AI design tools are strongest when the brief is specific.", "Brand work still needs human taste and consistency checks.", "Creative tools help teams explore options faster, but people choose the direction.", "Good design workflows compare several ideas before committing."],
  },
  presentation: {
    alt: ["Presenter explaining slides to a team", "Business team reviewing a presentation", "Colleagues planning a slide deck", "Professional preparing presentation notes"],
    caption: ["AI presentation makers save time when the story is already clear.", "Strong decks start with a message, not a template.", "Human review keeps AI-generated slides from feeling generic.", "A useful presentation gives the audience a clear next step."],
  },
  email: {
    alt: ["Professional managing email from a laptop", "Team planning a better communication workflow", "Colleagues reviewing client messages", "Office team discussing follow-up work"],
    caption: ["Email assistants are most useful when they protect focus time.", "AI drafts still need the right context and tone.", "Teams should automate repetitive email work without losing the human voice.", "Good follow-up workflows help people respond faster and more thoughtfully."],
  },
  career: {
    alt: ["Professional preparing job application materials", "Candidate reviewing career notes on a laptop", "People discussing an interview process", "Professional networking in a work setting"],
    caption: ["Career tools should help people show real work clearly.", "A stronger application starts with evidence, not generic claims.", "AI resume tools should improve clarity without inventing experience.", "Networking still depends on trust, timing, and useful follow-up."],
  },
  cybersecurity: {
    alt: ["Security professional reviewing account protection steps", "Cybersecurity analyst checking a security workflow", "Professional working on privacy settings", "Team reviewing security risks"],
    caption: ["Security habits work best when they are simple enough to repeat.", "Strong account protection combines tools with user awareness.", "A visible checklist makes risky accounts easier to spot.", "Privacy tools are useful when the tradeoffs are clear."],
  },
  coding: {
    alt: ["Developer writing code on a laptop", "Engineer reviewing a software project", "Programmer debugging code in an office", "Developer learning with a real project"],
    caption: ["Good developer tools reduce friction without hiding how the code works.", "AI coding workflows still need tests, review, and clear architecture.", "The fastest learning happens when examples turn into real projects.", "Modern coding assistants are best used as pair programmers, not autopilot."],
  },
  productivity: {
    alt: ["Professional organizing focused work on a laptop", "Team reviewing project priorities", "Student planning a study workflow", "Freelancer managing tasks from a workspace"],
    caption: ["Productivity systems should make the next action obvious.", "The right app should reduce decisions, not add another dashboard to manage.", "Shared workflows help teams stay aligned without constant meetings.", "Automation is most helpful when priorities are already clear."],
  },
  web: {
    alt: ["Web developer building a website", "Team reviewing a website project", "Developer testing a web application", "Professional planning a site launch"],
    caption: ["A good website workflow balances design, speed, SEO, and maintainability.", "Modern web projects move faster when the core structure is simple.", "Deployment is easier when testing and SEO checks are part of the workflow.", "Fast websites come from small decisions across images, scripts, and hosting."],
  },
  business: {
    alt: ["Small business team planning a software workflow", "Team comparing business tools", "Professionals discussing operational priorities", "Colleagues mapping a business process"],
    caption: ["Small teams should automate the work that repeats every week.", "The right tool should save time quickly without creating a training burden.", "AI works best when it supports a clear business process.", "Simple process maps make automation easier to trust."],
  },
};

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index++) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result;
}

function norm(src) {
  return src ? src.split("?")[0] : null;
}

function buildImages(topic, idGroups) {
  const copy = COPY[topic] || COPY.business;
  const ids = idGroups.flatMap((group) => IDS[group] || []);
  return ids.map((id, index) => ({
    id,
    topic,
    url: pexels(id),
    alt: copy.alt[index % copy.alt.length],
    caption: copy.caption[index % copy.caption.length],
  }));
}

const POOLS = {
  sales: buildImages("sales", ["business", "meetings", "analytics"]),
  seo: buildImages("seo", ["analytics", "meetings", "business"]),
  spreadsheet: buildImages("spreadsheet", ["analytics", "business", "remote"]),
  agent: buildImages("agent", ["coding", "meetings", "business"]),
  support: buildImages("support", ["support", "meetings", "business"]),
  voice: buildImages("voice", ["audio", "remote", "business"]),
  design: buildImages("design", ["design", "business", "remote"]),
  presentation: buildImages("presentation", ["presentation", "meetings", "business"]),
  email: buildImages("email", ["remote", "business", "meetings"]),
  career: buildImages("career", ["career", "remote", "meetings"]),
  cybersecurity: buildImages("cybersecurity", ["security", "coding", "remote"]),
  coding: buildImages("coding", ["coding", "remote", "study"]),
  productivity: buildImages("productivity", ["productivity", "remote", "study", "business"]),
  web: buildImages("web", ["coding", "remote", "business"]),
  business: buildImages("business", ["business", "meetings", "remote"]),
};

const ALL_IMAGES = Object.values(POOLS)
  .flat()
  .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index);

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
  return "business";
}

function imageMarkdown(item) {
  return `![${item.alt}](${item.url} "${item.caption}")`;
}

function removeMarkdownImages(content) {
  return content
    .replace(/\n{0,2}!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)\s*(?=\n|$)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getInsertionPointAfterHeading(content, headingMatch) {
  const afterHeading = headingMatch.index + headingMatch[0].length;
  const nextHeading = content.slice(afterHeading).search(/\n##\s+/);
  const sectionEnd = nextHeading === -1 ? content.length : afterHeading + nextHeading;
  const sectionRaw = content.slice(afterHeading, sectionEnd);
  const firstNonWhitespace = sectionRaw.search(/\S/);
  if (firstNonWhitespace === -1) return afterHeading;
  const sectionStart = afterHeading + firstNonWhitespace;
  const paragraphBreak = content.indexOf("\n\n", sectionStart);
  if (paragraphBreak !== -1 && paragraphBreak < sectionEnd) return paragraphBreak;
  return sectionEnd;
}

function insertImages(content, images) {
  const headingMatches = [...content.matchAll(/^##\s+.+$/gm)].filter((match) => !/^##\s+(faq|frequently asked)/i.test(match[0]));
  let updated = content;
  let shift = 0;

  if (headingMatches.length > 0) {
    const usedSlots = new Set();
    images.forEach((item, index) => {
      let slot = Math.min(headingMatches.length - 1, Math.floor(((index + 1) * headingMatches.length) / (images.length + 1)));
      while (usedSlots.has(slot) && slot < headingMatches.length - 1) slot++;
      usedSlots.add(slot);
      const position = getInsertionPointAfterHeading(updated, { ...headingMatches[slot], index: headingMatches[slot].index + shift });
      const block = `\n\n${imageMarkdown(item)}\n\n`;
      updated = `${updated.slice(0, position)}${block}${updated.slice(position)}`;
      shift += block.length;
    });
    return updated.replace(/\n{3,}/g, "\n\n").trim();
  }

  return `${updated.trim()}\n\n${images.map(imageMarkdown).join("\n\n")}`.trim();
}

function getMarkdownImageUrls(content) {
  return [...content.matchAll(/!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map((match) => norm(match[1]));
}

function chooseImages(post, count, usage, exclude = new Set()) {
  const topic = topicFor(post);
  const topicPool = POOLS[topic] || POOLS.business;
  const candidates = [...topicPool, ...ALL_IMAGES].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index);
  const seed = hash(post.slug);

  return candidates
    .filter((item) => !exclude.has(norm(item.url)))
    .sort((a, b) => {
      const usageDiff = (usage.get(norm(a.url)) || 0) - (usage.get(norm(b.url)) || 0);
      if (usageDiff !== 0) return usageDiff;
      const topicDiff = (a.topic === topic ? 0 : 1) - (b.topic === topic ? 0 : 1);
      if (topicDiff !== 0) return topicDiff;
      return ((hash(`${post.slug}:${a.id}`) + seed) % 10000) - ((hash(`${post.slug}:${b.id}`) + seed) % 10000);
    })
    .slice(0, count)
    .map((item) => {
      usage.set(norm(item.url), (usage.get(norm(item.url)) || 0) + 1);
      return item;
    });
}

const posts = await sql`
  SELECT p.id, p.slug, p.title, p.cover_image, p.content, c.slug AS category_slug
  FROM posts p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.published = true
  ORDER BY p.created_at DESC
`;

const bodyUsage = new Map();
const coverUsage = new Map();
const updates = [];

for (const post of posts) {
  const coverImage = chooseImages(post, 1, coverUsage)[0]?.url || post.cover_image;
  const exclude = new Set([norm(coverImage)].filter(Boolean));
  const bodyImages = chooseImages(post, IMAGES_PER_POST, bodyUsage, exclude);
  const contentWithoutImages = removeMarkdownImages(post.content);
  const content = insertImages(contentWithoutImages, bodyImages);
  const existingBody = getMarkdownImageUrls(post.content);
  const nextBody = getMarkdownImageUrls(content);

  updates.push({
    id: post.id,
    slug: post.slug,
    topic: topicFor(post),
    coverImage,
    content,
    beforeImages: existingBody.length,
    afterImages: nextBody.length,
    coverChanged: norm(coverImage) !== norm(post.cover_image),
  });
}

const repeatedBody = [...bodyUsage.entries()].filter(([, count]) => count > 4).sort((a, b) => b[1] - a[1]);
const repeatedCovers = [...coverUsage.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]);

console.log(JSON.stringify({
  mode: APPLY ? "apply" : "dry-run",
  publishedPosts: posts.length,
  updates: updates.length,
  coverChanges: updates.filter((item) => item.coverChanged).length,
  bodyImagePoolSize: bodyUsage.size,
  coverImagePoolSize: coverUsage.size,
  maxBodyImageRepeat: Math.max(...bodyUsage.values()),
  maxCoverRepeat: Math.max(...coverUsage.values()),
  repeatedBodyOver4: repeatedBody.length,
  repeatedCoverOver1: repeatedCovers.length,
  sample: updates.slice(0, 12).map(({ slug, topic, beforeImages, afterImages, coverChanged }) => ({ slug, topic, beforeImages, afterImages, coverChanged })),
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
    console.log(`Updated ${update.slug}: ${update.afterImages} body images${update.coverChanged ? ", new cover" : ""}`);
  }
  console.log(`Done. Updated ${updates.length} posts.`);
}