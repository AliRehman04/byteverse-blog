import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const slug = '90-day-blog-content-plan-for-new-websites-in-2026';
const rows = await sql`SELECT id, content FROM posts WHERE slug = ${slug}`;
if (!rows.length) { console.log('NOT FOUND'); process.exit(1); }

let content = rows[0].content;
const id = rows[0].id;

// --- 1. Days 1-30: link "low-competition keywords" ---
content = content.replace(
  'Choose low-competition keywords, answer clear questions, and link every article to the cluster pillar. Do not chase broad terms yet.',
  'Choose [low-competition keywords](/blog/low-competition-keywords-for-new-blogs-2026), answer clear questions, and link every article to the cluster pillar. Do not chase broad terms yet.'
);

// --- 2. Days 1-30: expand the repeated boilerplate with useful linked content ---
// The "Days 1-30" section's "A useful way to apply this..." paragraph
content = content.replace(
  '## Days 1-30: Build the Foundation\n\nPublish 8 to 12 posts around one specific problem. Choose [low-competition keywords](/blog/low-competition-keywords-for-new-blogs-2026), answer clear questions, and link every article to the cluster pillar. Do not chase broad terms yet.\n\nA useful way to apply this is to ask what a beginner would need next. If the answer belongs in another article, link to it. If the answer belongs on the same page, add a clearer section. This keeps the cluster focused without making every post too broad.',
  '## Days 1-30: Build the Foundation\n\nPublish 8 to 12 posts around one specific problem. Choose [low-competition keywords](/blog/low-competition-keywords-for-new-blogs-2026), answer clear questions, and link every article to the cluster pillar. Do not chase broad terms yet.\n\nIf you are starting from scratch, our [how to start a tech blog checklist](/blog/how-to-start-a-tech-blog-2026-seo-checklist) covers hosting, SEO setup, and first-post strategy before you begin writing.\n\nA useful way to apply this is to ask what a beginner would need next. If the answer belongs in another article, link to it. If the answer belongs on the same page, add a clearer section. This keeps the cluster focused without making every post too broad.'
);

// --- 3. Days 31-60: add AI writing tools link ---
content = content.replace(
  '## Days 31-60: Expand the Cluster\n\nAdd 8 to 12 supporting posts that cover comparisons, beginner mistakes, tools, and practical workflows. This gives readers multiple paths through the topic.',
  '## Days 31-60: Expand the Cluster\n\nAdd 8 to 12 supporting posts that cover comparisons, beginner mistakes, tools, and practical workflows. This gives readers multiple paths through the topic. If you need to produce drafts faster, [AI writing tools](/blog/best-ai-writing-tools-2026) can help you outline and polish posts without sacrificing quality.'
);

// --- 4. Days 61-90: add SEO meta tags + AI SEO tools links ---
content = content.replace(
  'Open Search Console and look for impressions. Improve titles, intros, tables, and internal links on posts that are already being tested.',
  'Open Search Console and look for impressions. Improve [titles and meta descriptions](/blog/seo-meta-tags-generator-guide-2026), intros, tables, and internal links on posts that are already being tested. [AI SEO tools](/blog/best-ai-seo-tools-2026) can identify which pages to prioritize during this phase.'
);

// --- 5. Weekly Publishing Rhythm: add productivity link ---
content = content.replace(
  '## Weekly Publishing Rhythm\n\nA realistic rhythm is two strong articles and one update pass each week. If you can publish more without lowering quality, add a third article.',
  '## Weekly Publishing Rhythm\n\nA realistic rhythm is two strong articles and one update pass each week. If you can publish more without lowering quality, add a third article. An [AI productivity workflow](/blog/ai-productivity-workflow-2026-time-blocking-automation) helps you batch research, writing, and editing into focused blocks so you stay consistent.'
);

// --- 6. What to Measure: add traffic guide link ---
content = content.replace(
  'Track indexing, impressions, average position, click-through rate, and internal links. Pageviews are useful later, but early signals matter first.',
  'Track indexing, impressions, average position, click-through rate, and internal links. Pageviews are useful later, but early signals matter first. Our guide on [how to get traffic to a new blog](/blog/how-to-get-traffic-to-a-new-blog-2026) breaks down each metric and explains what to do when numbers plateau.'
);

// --- 7. How to Choose the Right Keywords: add a sentence after the first paragraph ---
content = content.replace(
  'A specific keyword may have less volume, but the reader\'s need is easier to understand.',
  'A specific keyword may have less volume, but the reader\'s need is easier to understand. Our [low-competition keyword ideas](/blog/low-competition-keywords-for-new-blogs-2026) list gives you 15 ready-to-use examples for new blogs.'
);

// --- 8. How This Fits Into the Weekly Cluster: link to how many posts ---
content = content.replace(
  'The Monday pillar explains when traffic usually starts.',
  'The Monday pillar explains [when traffic usually starts](/blog/how-many-blog-posts-before-traffic-starts-2026).'
);

// --- 9. Example Publishing Order: link "measurement post" ---
content = content.replace(
  '4. Publish one measurement post that explains what to track.',
  '4. Publish one measurement post that explains what to track — our [blog traffic guide](/blog/how-to-get-traffic-to-a-new-blog-2026) is a good model.'
);

// --- 10. Common Mistakes - Publishing unrelated topics: expand with link ---
content = content.replace(
  '### Publishing unrelated topics\n\nThis mistake slows down new blogs because it weakens the cluster signal. Fix it early, then keep the process simple enough to repeat every week.',
  '### Publishing unrelated topics\n\nThis mistake slows down new blogs because it weakens the cluster signal. Before adding a new topic, check whether it fits your existing cluster. A [step-by-step blog checklist](/blog/how-to-start-a-tech-blog-2026-seo-checklist) can help you stay on track. Fix it early, then keep the process simple enough to repeat every week.'
);

// --- 11. Common Mistakes - Ignoring Search Console: expand with link ---
content = content.replace(
  '### Ignoring Search Console\n\nThis mistake slows down new blogs because it weakens the cluster signal. Fix it early, then keep the process simple enough to repeat every week.',
  '### Ignoring Search Console\n\nWithout Search Console data, you are guessing which posts Google is testing and which titles need work. Start checking impressions by day 30 — you can use [AI SEO tools](/blog/best-ai-seo-tools-2026) to automate parts of the analysis. Fix issues early, then keep the process simple enough to repeat every week.'
);

// --- 12. 30-Minute Action Plan: add ChatGPT prompts link ---
content = content.replace(
  '5. Save one future article idea from the gaps you found',
  '5. Save one future article idea from the gaps you found\n\nNeed help writing faster? Try these [ChatGPT prompts for work](/blog/best-chatgpt-prompts-for-work-2026) to outline posts, generate titles, and brainstorm angles in minutes.'
);

// --- 13. Final Thoughts: add affiliate marketing link for monetization ---
content = content.replace(
  'That is how a small blog starts earning impressions, clicks, and eventually consistent traffic.',
  'That is how a small blog starts earning impressions, clicks, and eventually consistent traffic. Once traffic is consistent, you can explore [affiliate marketing](/blog/affiliate-marketing-for-beginners-2026) to turn that audience into revenue.'
);

// Update the post
await sql`UPDATE posts SET content = ${content}, updated_at = NOW() WHERE id = ${id}`;
console.log('✅ Post updated with internal links. ID:', id);

// Verify link count
const linkMatches = content.match(/\]\(\/blog\//g);
const toolLinks = content.match(/\]\(\/tools\//g);
console.log('Internal blog links:', linkMatches ? linkMatches.length : 0);
console.log('Internal tool links:', toolLinks ? toolLinks.length : 0);
