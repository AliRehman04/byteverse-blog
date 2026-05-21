import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const author = "Ali Rehman";

const imageUrl = (id, width = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const newPosts = [
  // ═══════════════════════════════════════════════════════
  // 1. HOW TO MAKE MONEY WITH AI — massive search volume
  // ═══════════════════════════════════════════════════════
  {
    category: "ai-tools",
    title: "How to Make Money with AI in 2026: 12 Real Ways That Work",
    slug: "how-to-make-money-with-ai-2026",
    excerpt:
      "Discover 12 proven ways to make money with AI in 2026 — from freelancing and content creation to building AI-powered apps and automation services.",
    metaTitle: "How to Make Money with AI in 2026: 12 Real Ways",
    metaDescription:
      "Learn 12 proven ways to make money with AI in 2026 including freelancing, content, apps, automation, and consulting.",
    keywords:
      "how to make money with AI 2026, AI side hustle, make money AI tools, AI business ideas 2026, earn money with ChatGPT",
    cover: "1556761175-b413da4baf72",
    content: `If you have been searching for **how to make money with AI in 2026**, you are not alone. AI is no longer a futuristic experiment — it is a practical toolkit that thousands of people are using right now to earn real income.

This guide covers 12 real ways to make money with AI. No hype, no overnight-rich promises — just methods that work when you put in the effort.

![Person working on laptop with AI tools for income generation](${imageUrl("1556761175-b413da4baf72")} "Making money with AI in 2026")

## Why AI Is a Real Income Opportunity in 2026

AI tools have matured dramatically. ChatGPT, Claude, Midjourney, and dozens of specialized tools now handle tasks that used to take hours. This means:

- **Lower barriers to entry** — you do not need a CS degree to use AI profitably
- **Faster delivery** — freelancers can deliver work 3-5x faster
- **New service categories** — AI consulting, prompt engineering, and automation are real jobs now
- **Scalable products** — build once, sell forever with AI-powered apps

## How to Make Money with AI: 12 Proven Methods

### 1. **AI-Powered Freelance Writing**

Use AI to draft blog posts, ad copy, email sequences, and social media content. Edit and add your expertise on top. Platforms like Upwork, Fiverr, and Contra have thousands of gigs for AI-assisted writers.

**Earning potential:** $500 - $5,000/month depending on niche and volume.

**How to start:**
1. Pick a niche (SaaS, health, finance, tech)
2. Use ChatGPT or Claude to draft content
3. Edit thoroughly — AI drafts need human polish
4. Build a portfolio with 3-5 sample articles
5. Apply on freelance platforms with clear pricing

### 2. **AI Chatbot Development for Businesses**

Small businesses need custom chatbots for customer support, lead generation, and FAQ handling. You can build these using no-code tools like Botpress, Voiceflow, or custom solutions with OpenAI API.

**Earning potential:** $1,000 - $10,000 per project.

![Developer building AI chatbot for business clients](${imageUrl("1515879218367-8466d910aaa4")} "Building AI chatbots for businesses")

### 3. **AI Automation Consulting**

Businesses waste hours on repetitive tasks. Offer services to automate their workflows using tools like Zapier AI, Make.com, and custom Python scripts with AI APIs.

**What to automate:**
- Email classification and routing
- Invoice processing
- Social media scheduling
- Lead scoring and CRM updates
- Report generation

**Earning potential:** $2,000 - $15,000/month as a consultant.

### 4. **Create and Sell AI-Generated Art**

Use Midjourney, DALL-E 3, or Stable Diffusion to create:
- Print-on-demand designs (t-shirts, mugs, posters)
- Stock photos and illustrations
- Custom brand assets for clients
- NFT collections

**Platforms to sell:** Redbubble, Etsy, Adobe Stock, Shutterstock.

**Earning potential:** $200 - $3,000/month passive income.

### 5. **Build AI-Powered SaaS Products**

The biggest earning potential. Build software that uses AI under the hood:
- AI writing assistants for specific niches
- Resume builders with AI optimization
- AI-powered SEO tools
- Automated social media managers

**Earning potential:** $1,000 - $50,000+/month depending on product-market fit.

### 6. **AI Course Creation and Teaching**

If you understand AI tools well, teach others. Create courses on:
- Platforms: Udemy, Skillshare, Gumroad, your own site
- Topics: ChatGPT for business, AI for marketers, prompt engineering
- Formats: video courses, live workshops, ebooks

**Earning potential:** $500 - $10,000/month.

![AI course creation and online teaching setup](${imageUrl("1522202176988-66273c2fd55f")} "Creating AI courses for passive income")

### 7. **Prompt Engineering Services**

Companies need optimized prompts for their AI workflows. Offer prompt libraries, custom prompt development, and prompt optimization consulting.

**What clients need:**
- Customer support prompt templates
- Content generation prompts for marketing teams
- Code generation prompts for dev teams
- Data analysis prompts for business intelligence

**Earning potential:** $1,000 - $5,000 per project.

### 8. **AI-Enhanced Video and Content Creation**

Use AI for:
- Script writing with ChatGPT/Claude
- Voiceovers with ElevenLabs
- Video editing with Descript or Opus Clip
- Thumbnail creation with Midjourney
- YouTube SEO optimization

**Earning potential:** $1,000 - $20,000/month through YouTube, sponsorships, and client work.

### 9. **AI Data Analysis and Reporting**

Many businesses have data but no one to analyze it. Use AI tools like ChatGPT Advanced Data Analysis, Julius AI, or Python with AI libraries to:
- Clean and visualize datasets
- Create automated reports
- Build predictive dashboards
- Extract insights from unstructured data

**Earning potential:** $3,000 - $10,000/month.

### 10. **Build an AI-Powered Blog (Like This One)**

Start a blog in a profitable niche, use AI to help with:
- Content research and outlining
- First draft generation
- SEO keyword research
- Image creation
- Social media promotion

Monetize through ads, affiliate marketing, sponsored posts, and digital products.

**Earning potential:** $500 - $10,000/month after 6-12 months.

### 11. **AI Translation and Localization Services**

Use AI translation tools combined with human editing to offer:
- Website localization
- Document translation
- Subtitle creation for videos
- Multi-language content marketing

**Earning potential:** $1,000 - $5,000/month.

### 12. **AI-Powered E-commerce Optimization**

Help online stores with:
- AI product descriptions at scale
- Automated customer review analysis
- Dynamic pricing suggestions
- Personalized email campaigns
- Chatbot-based shopping assistants

**Earning potential:** $2,000 - $8,000/month per client.

## How to Get Started Today

1. **Pick ONE method** — do not try everything at once
2. **Learn the tools** — spend a week mastering the relevant AI tools
3. **Build proof** — create samples, case studies, or a portfolio
4. **Find clients** — use freelance platforms, LinkedIn, or cold outreach
5. **Deliver quality** — AI is the assistant, your expertise is the product
6. **Scale** — once you have a working system, increase volume or raise prices

![Workflow for building AI-powered income streams](${imageUrl("1460925895917-afdab827c52f")} "AI income workflow planning")

## Common Mistakes to Avoid

- **Selling raw AI output** — clients can smell unedited AI content
- **Trying too many methods** — focus beats diversification early on
- **Ignoring your niche** — generic AI services compete on price, niche services compete on value
- **Skipping the learning phase** — understand the tools deeply before selling services
- **Promising magic results** — set realistic expectations with clients

## Related ByteVerse guides

Next, read [10 Best Free AI Tools in 2026 That Will Blow Your Mind](/blog/10-best-free-ai-tools-in-2026-that-will-blow-your-mind), [Best AI Tools for Small Business 2026](/blog/best-ai-tools-for-small-business-2026), and [Best AI Productivity Apps for Freelancers 2026](/blog/best-ai-productivity-apps-for-freelancers-2026) to build a stronger workflow around this topic.

## Frequently Asked Questions

### Can you really make money with AI in 2026?

Yes. People are earning real income with AI through freelancing, consulting, product building, content creation, and automation services. The key is combining AI tools with genuine expertise in a specific area.

### What is the easiest way to start making money with AI?

AI-powered freelance writing or content creation is the easiest entry point. You need minimal upfront investment, and platforms like Upwork have immediate demand for AI-assisted content.

### How much money can you make with AI?

Income varies widely from $500/month for side projects to $50,000+/month for successful AI SaaS products. Most people start in the $1,000-$5,000/month range within the first few months.

### Do I need coding skills to make money with AI?

Not necessarily. Many methods like content creation, consulting, and course creation require zero coding. Building AI apps and automation does require some technical skills, but no-code tools are making this more accessible.

## Final Recommendation

The smartest approach to making money with AI in 2026 is to start with one method that matches your existing skills, master the relevant tools, and deliver genuine value to real clients. AI is the accelerator — your expertise and consistency are the engine.

Pick one path from this list, commit to it for 30 days, and measure your results. That is worth more than reading ten more guides.`,
  },

  // ═══════════════════════════════════════════════════════
  // 2. BEST AI IMAGE GENERATORS — very high search volume
  // ═══════════════════════════════════════════════════════
  {
    category: "software-reviews",
    title: "Best AI Image Generators 2026: Free and Paid Tools Compared",
    slug: "best-ai-image-generators-2026-free-paid",
    excerpt:
      "Compare the best AI image generators in 2026 including Midjourney, DALL-E 3, Stable Diffusion, Ideogram, and Adobe Firefly with real examples.",
    metaTitle: "Best AI Image Generators 2026: Free and Paid Tools",
    metaDescription:
      "Compare the best AI image generators in 2026: Midjourney, DALL-E 3, Stable Diffusion, Ideogram, Firefly with pros and cons.",
    keywords:
      "best AI image generators 2026, free AI image generator, Midjourney vs DALL-E 3, AI art tools 2026, text to image AI",
    cover: "1557804506-669a67965ba0",
    content: `Looking for the **best AI image generators in 2026**? The landscape has exploded — from Midjourney's photorealistic outputs to free tools that rival what cost $20/month last year.

This guide compares every major AI image generator with honest pros, cons, pricing, and real use cases so you can pick the right tool.

![AI image generation tools comparison on designer workspace](${imageUrl("1557804506-669a67965ba0")} "Best AI image generators 2026 comparison")

## Quick Comparison Table

| Tool | Best For | Free Plan | Price | Quality |
|------|----------|-----------|-------|---------|
| Midjourney | Photorealism, art | No | $10/mo | Excellent |
| DALL-E 3 | Text in images, ChatGPT users | Limited | $20/mo (Plus) | Very Good |
| Stable Diffusion | Local control, customization | Yes (open source) | Free / GPU costs | Excellent |
| Ideogram | Typography, logos | Yes | Free / $7/mo | Very Good |
| Adobe Firefly | Commercial safe, brand work | Yes | $4.99/mo | Good |
| Leonardo AI | Game art, character design | Yes | Free / $12/mo | Very Good |
| Flux | Open source quality | Yes | Free / API costs | Excellent |

## 1. Midjourney — Best Overall Quality

Midjourney remains the gold standard for AI image quality in 2026. Version 7 produces stunning photorealistic images, concept art, and illustrations that are difficult to distinguish from professional photography.

**Pros:**
- Best-in-class image quality and coherence
- Excellent understanding of artistic styles
- Strong community and prompt sharing
- Web interface (no more Discord-only)

**Cons:**
- No free plan
- Less control over specific details
- Commercial licensing requires paid plan

**Best for:** Professional creatives, marketers, content creators who need premium quality.

**Price:** $10/month (Basic), $30/month (Standard), $60/month (Pro).

![Midjourney AI generated photorealistic landscape example](${imageUrl("1506905925346-21bda4d32df4")} "Midjourney photorealistic image quality")

## 2. DALL-E 3 — Best for ChatGPT Users

OpenAI's DALL-E 3 integrates directly with ChatGPT, making it incredibly easy to generate and iterate on images through conversation.

**Pros:**
- Natural language prompting through ChatGPT
- Excellent text rendering in images
- Strong safety filters
- Easy iteration through conversation

**Cons:**
- Requires ChatGPT Plus ($20/month)
- Less artistic range than Midjourney
- Limited style control

**Best for:** Anyone already using ChatGPT who needs quick, high-quality images.

## 3. Stable Diffusion — Best Free Option

Stable Diffusion is open source and can run locally on your own GPU. With ComfyUI or Automatic1111, you get unlimited free generations with full control.

**Pros:**
- Completely free and open source
- Run locally — no data sent to cloud
- Massive community of models and plugins
- Full customization with LoRAs and ControlNet

**Cons:**
- Requires technical setup
- Needs a decent GPU (8GB+ VRAM)
- Steeper learning curve

**Best for:** Developers, artists who want full control, privacy-focused users.

## 4. Ideogram — Best for Text and Logos

Ideogram specializes in generating images with readable text — something most AI tools struggle with. Perfect for social media graphics, logos, and marketing materials.

**Pros:**
- Best text rendering in AI images
- Good free plan (25 generations/day)
- Clean UI for quick creation
- Logo and brand asset generation

**Cons:**
- Less photorealistic than Midjourney
- Smaller community
- Limited advanced controls

**Best for:** Social media managers, small businesses, anyone needing text-in-image designs.

![AI generated logo and brand design with text](${imageUrl("1542744173-8e7e53415bb0")} "AI text and logo generation with Ideogram")

## 5. Adobe Firefly — Best for Commercial Safety

Adobe Firefly is trained only on licensed content, making it the safest choice for commercial use without copyright concerns.

**Pros:**
- Commercially safe — trained on licensed data
- Integrated with Photoshop and Illustrator
- Generative fill and expand features
- Good for brand-consistent content

**Cons:**
- Lower quality than Midjourney
- Limited artistic creativity
- Requires Adobe subscription for full features

**Best for:** Businesses, agencies, anyone concerned about copyright and licensing.

## 6. Leonardo AI — Best for Game and Character Art

Leonardo AI excels at consistent character design, game assets, and stylized illustrations. Great for game developers and digital artists.

**Pros:**
- Excellent character consistency
- Good free plan (150 tokens/day)
- Multiple specialized models
- Real-time canvas generation

**Cons:**
- Less photorealistic
- Token system can be confusing
- Some models require paid plan

**Best for:** Game developers, character designers, digital artists.

## 7. Flux — Best Open Source Alternative

Flux by Black Forest Labs is the newest challenger offering Midjourney-level quality as an open source model.

**Pros:**
- Open source with commercial license
- Excellent image quality
- Fast generation
- Can run locally or via API

**Cons:**
- Fewer community resources (still new)
- Requires technical knowledge for local setup
- API costs for cloud usage

**Best for:** Developers who want open source quality without Midjourney's price.

## How to Choose the Right AI Image Generator

1. **Define your use case** — social media, blog images, product photos, art?
2. **Check your budget** — free tools are surprisingly good now
3. **Consider commercial rights** — Adobe Firefly is safest for business use
4. **Test with your actual prompts** — quality varies by style and subject
5. **Evaluate the workflow** — does it integrate with your existing tools?

![Comparison of AI image generator outputs side by side](${imageUrl("1551288049-bebda4e38f71")} "AI image generator quality comparison")

## Common Mistakes When Using AI Image Generators

- **Using vague prompts** — be specific about style, lighting, composition, and mood
- **Ignoring copyright** — check commercial licensing before using images professionally
- **Not editing outputs** — AI images often need cropping, color correction, or touch-ups
- **Sticking to one tool** — different generators excel at different styles
- **Forgetting attribution** — some platforms require crediting AI generation

## Related ByteVerse guides

Next, read [Canva AI vs Adobe Express 2026](/blog/canva-ai-vs-adobe-express-2026), [Best AI Tools for Small Business 2026](/blog/best-ai-tools-for-small-business-2026), and [10 Best Free AI Tools in 2026 That Will Blow Your Mind](/blog/10-best-free-ai-tools-in-2026-that-will-blow-your-mind) to build a stronger workflow around this topic.

## Frequently Asked Questions

### What is the best free AI image generator in 2026?

Stable Diffusion is the best completely free option if you have a GPU. For browser-based free generation, Ideogram and Leonardo AI both offer generous free plans with good quality.

### Is Midjourney worth paying for?

Yes, if you need the highest quality images consistently. For professional content creation, marketing, and creative projects, Midjourney V7 produces results that save hours of manual design work.

### Can I use AI-generated images commercially?

It depends on the tool. Adobe Firefly is designed for commercial use. Midjourney allows commercial use on paid plans. Always check the specific platform's terms of service before using images for business.

### Which AI image generator has the best text rendering?

Ideogram leads in text-in-image quality. DALL-E 3 is second best. Most other generators still struggle with readable text in images.

## Final Recommendation

For most people, start with **Ideogram** (free) or **DALL-E 3** (if you have ChatGPT Plus). Move to **Midjourney** when you need premium quality. Use **Stable Diffusion** if you want full control and unlimited free generations. Choose **Adobe Firefly** for commercial safety.`,
  },

  // ═══════════════════════════════════════════════════════
  // 3. CHATGPT PROMPTS — extremely high search volume
  // ═══════════════════════════════════════════════════════
  {
    category: "productivity",
    title: "50 Best ChatGPT Prompts for Work 2026: Copy-Paste Templates",
    slug: "best-chatgpt-prompts-for-work-2026",
    excerpt:
      "50 ready-to-use ChatGPT prompts for emails, reports, meetings, marketing, coding, and daily work tasks with copy-paste templates.",
    metaTitle: "50 Best ChatGPT Prompts for Work 2026: Templates",
    metaDescription:
      "Copy-paste 50 powerful ChatGPT prompts for emails, reports, meetings, marketing, coding, and productivity at work.",
    keywords:
      "best ChatGPT prompts 2026, ChatGPT prompts for work, ChatGPT templates, AI prompts for productivity, ChatGPT copy paste",
    cover: "1516321318423-f06f85e504b3",
    content: `Stop staring at a blank ChatGPT window. These **50 ChatGPT prompts for work** are ready to copy-paste and use immediately. Each one is tested, practical, and designed for real work situations.

Bookmark this page — you will come back to it every day.

![Professional using ChatGPT prompts on laptop at work](${imageUrl("1516321318423-f06f85e504b3")} "Best ChatGPT prompts for work 2026")

## How to Use These Prompts

1. **Copy the prompt** exactly as written
2. **Replace the [brackets]** with your specific information
3. **Review and edit** the output — never send raw AI text
4. **Iterate** — ask follow-up questions to refine the result

## Email Prompts

### 1. Professional Email Reply
\`\`\`
Write a professional reply to this email. Keep it concise, friendly, and action-oriented.

Original email: [paste the email]

Key points to address: [your main points]

Tone: [professional/casual/formal]
\`\`\`

### 2. Cold Outreach Email
\`\`\`
Write a cold outreach email to [target role] at [company type]. I offer [your service]. Keep it under 100 words. Include one specific observation about their company and a clear call to action.
\`\`\`

### 3. Follow-Up Email After No Response
\`\`\`
Write a follow-up email for someone who did not reply to my initial message about [topic]. Be polite, add new value, and suggest a specific time to connect. Keep it under 80 words.
\`\`\`

### 4. Difficult Conversation Email
\`\`\`
Help me write a professional email about [difficult topic, e.g., project delay, budget issue, deadline change]. The recipient is [their role]. I need to be honest but maintain the relationship. Suggest a solution.
\`\`\`

### 5. Meeting Request Email
\`\`\`
Write a brief email requesting a 30-minute meeting with [person/role] about [topic]. Include 2-3 specific agenda points and suggest 2 time slots.
\`\`\`

![Email productivity with AI prompts workflow](${imageUrl("1484480974693-6ca0a78fb36b")} "ChatGPT email prompt templates for professionals")

## Writing and Content Prompts

### 6. Blog Post Outline
\`\`\`
Create a detailed blog post outline for the topic: [topic]. Target audience: [audience]. Include an attention-grabbing intro, 5-7 main sections with subpoints, FAQ section with 4 questions, and a conclusion with CTA. Optimize for the keyword: [keyword].
\`\`\`

### 7. LinkedIn Post
\`\`\`
Write a LinkedIn post about [topic/experience]. Use a hook in the first line, tell a brief story, share 3 actionable takeaways, and end with a question for engagement. Keep it under 200 words. No hashtags.
\`\`\`

### 8. Product Description
\`\`\`
Write a compelling product description for [product]. Target customer: [who]. Highlight 3 key benefits (not just features). Include a sense of urgency. Keep it under 150 words.
\`\`\`

### 9. Social Media Caption
\`\`\`
Write 5 Instagram/Twitter caption variations for [topic/product]. Each should be under 100 words, include a hook, and end with a CTA. Tone: [casual/professional/witty].
\`\`\`

### 10. Newsletter Introduction
\`\`\`
Write an engaging newsletter intro about [this week's topic]. Make it personal, reference a current trend, and preview what the reader will learn. Keep it under 100 words.
\`\`\`

## Meeting and Planning Prompts

### 11. Meeting Agenda
\`\`\`
Create a structured meeting agenda for a [duration]-minute meeting about [topic]. Include: objectives, discussion points with time allocations, action items section, and next steps. Attendees: [roles].
\`\`\`

### 12. Meeting Notes Summary
\`\`\`
Summarize these meeting notes into: 1) Key decisions made, 2) Action items with owners and deadlines, 3) Open questions, 4) Next meeting topics.

Notes: [paste notes]
\`\`\`

### 13. Project Status Update
\`\`\`
Write a concise project status update for [project name]. Include: progress this week, blockers, next week's priorities, and any risks. Keep it professional and under 200 words. Audience: [stakeholders].
\`\`\`

### 14. Weekly Plan
\`\`\`
Help me plan my work week. My priorities are: [list priorities]. I have [X hours] available. Create a day-by-day plan with time blocks, and flag which tasks are most important vs can be postponed.
\`\`\`

### 15. Quarterly Goals
\`\`\`
Help me set 3-5 quarterly goals for [my role/team]. Each goal should be specific, measurable, and have clear milestones. Current challenges: [list challenges]. Company priorities: [list priorities].
\`\`\`

## Analysis and Research Prompts

### 16. SWOT Analysis
\`\`\`
Create a SWOT analysis for [company/product/project]. Be specific with each point and include actionable recommendations for each weakness and threat.
\`\`\`

### 17. Competitor Analysis
\`\`\`
Analyze [competitor name] compared to [your company/product]. Cover: positioning, pricing, key features, target audience, strengths, and weaknesses. Present as a comparison table.
\`\`\`

### 18. Data Interpretation
\`\`\`
Analyze this data and provide insights: [paste data]. Focus on: trends, anomalies, actionable recommendations, and what questions we should investigate further.
\`\`\`

### 19. Market Research Summary
\`\`\`
Summarize key trends in the [industry] market for 2026. Cover: growth drivers, challenges, emerging technologies, consumer behavior changes, and opportunities for [company type].
\`\`\`

### 20. Decision Framework
\`\`\`
Help me decide between [option A] and [option B] for [context]. Create a pros/cons comparison, weighted criteria evaluation, and give a final recommendation with reasoning.
\`\`\`

![AI-powered data analysis and research workflow](${imageUrl("1460925895917-afdab827c52f")} "ChatGPT research and analysis prompts")

## Marketing Prompts

### 21. Ad Copy Variations
\`\`\`
Write 5 ad copy variations for [product/service]. Target: [audience]. Platform: [Google/Facebook/LinkedIn]. Each should have a headline (under 30 chars), description (under 90 chars), and CTA.
\`\`\`

### 22. SEO Meta Description
\`\`\`
Write 3 SEO meta description options for a page about [topic]. Target keyword: [keyword]. Each should be under 155 characters, include the keyword naturally, and have a compelling CTA.
\`\`\`

### 23. Content Calendar
\`\`\`
Create a 4-week content calendar for [brand/niche] on [platforms]. Include: post topics, content type (carousel, video, text), posting times, and relevant themes or events. Audience: [target audience].
\`\`\`

### 24. Customer Testimonial Request
\`\`\`
Write a friendly email asking [client name] for a testimonial about [project/service]. Make it easy for them by including 3 specific questions they can answer. Keep it under 120 words.
\`\`\`

### 25. Landing Page Copy
\`\`\`
Write landing page copy for [product/service]. Include: headline, subheadline, 3 benefit sections, social proof section, FAQ (4 questions), and CTA. Target: [audience]. Tone: [professional/casual].
\`\`\`

## Coding and Technical Prompts

### 26. Code Review
\`\`\`
Review this code for bugs, performance issues, and best practices. Suggest improvements with explanations.

Language: [language]
Code: [paste code]
\`\`\`

### 27. Debug Help
\`\`\`
I am getting this error: [paste error]. Here is my code: [paste code]. Environment: [language/framework/version]. Explain what is wrong and provide a fix.
\`\`\`

### 28. Write Unit Tests
\`\`\`
Write unit tests for this function using [testing framework]. Cover: happy path, edge cases, error handling, and boundary conditions.

Function: [paste function]
\`\`\`

### 29. API Documentation
\`\`\`
Write API documentation for this endpoint. Include: description, method, URL, parameters, request body example, response example, error codes, and usage notes.

Endpoint details: [describe endpoint]
\`\`\`

### 30. Database Query
\`\`\`
Write a [SQL/MongoDB] query to [describe what you need]. Table/collection structure: [describe schema]. Optimize for performance and explain the approach.
\`\`\`

## HR and Management Prompts

### 31. Job Description
\`\`\`
Write a job description for [role] at [company type]. Include: role summary, 5-7 responsibilities, required qualifications, nice-to-haves, benefits, and company culture section. Make it inclusive and clear.
\`\`\`

### 32. Performance Review
\`\`\`
Help me write constructive performance feedback for [employee role]. Strengths: [list]. Areas for improvement: [list]. Use the SBI framework (Situation, Behavior, Impact) and suggest development goals.
\`\`\`

### 33. Interview Questions
\`\`\`
Create 10 interview questions for a [role] position. Mix behavioral, technical, and situational questions. Include what a strong answer looks like for each.
\`\`\`

### 34. Team Retrospective
\`\`\`
Facilitate a team retrospective. Create questions for: What went well, What could improve, Action items. Include a format that encourages honest feedback without blame.
\`\`\`

### 35. Onboarding Checklist
\`\`\`
Create a 30-60-90 day onboarding plan for a new [role]. Include: learning goals, key meetings, deliverables, and success metrics for each phase.
\`\`\`

## Strategy and Business Prompts

### 36. Pitch Deck Outline
\`\`\`
Create a 10-slide pitch deck outline for [business/product]. Include: problem, solution, market size, business model, traction, team, competition, financial projections, ask, and timeline.
\`\`\`

### 37. Business Plan Executive Summary
\`\`\`
Write an executive summary for a business plan. Business: [describe]. Cover: mission, problem, solution, target market, revenue model, competitive advantage, and funding needs. Keep it under 500 words.
\`\`\`

### 38. Pricing Strategy
\`\`\`
Help me develop a pricing strategy for [product/service]. Current cost: [cost]. Competitors charge: [range]. Target customer: [who]. Suggest 3 pricing tiers with justification.
\`\`\`

### 39. Partnership Proposal
\`\`\`
Write a partnership proposal email to [company/person]. We offer [your value]. We want [their value]. Include specific collaboration ideas and mutual benefits. Keep it professional and under 200 words.
\`\`\`

### 40. Risk Assessment
\`\`\`
Create a risk assessment for [project/initiative]. Identify 5-7 risks, rate each by likelihood and impact (high/medium/low), and suggest mitigation strategies for each.
\`\`\`

## Personal Productivity Prompts

### 41. Daily Priority Setting
\`\`\`
I have these tasks today: [list tasks]. Help me prioritize using the Eisenhower Matrix (urgent/important). Suggest which to do first, delegate, schedule, or skip.
\`\`\`

### 42. Problem Solving
\`\`\`
I am stuck on this problem: [describe problem]. Help me think through it using the 5 Whys technique. Then suggest 3 possible solutions with pros and cons for each.
\`\`\`

### 43. Learning Plan
\`\`\`
Create a 4-week learning plan for [skill/topic]. I can dedicate [X hours/week]. Include: resources, milestones, practice exercises, and how to measure progress.
\`\`\`

### 44. Negotiation Preparation
\`\`\`
Help me prepare for a negotiation about [topic, e.g., salary, contract, vendor pricing]. My position: [what you want]. Their likely position: [their perspective]. Suggest talking points, BATNA, and anchoring strategy.
\`\`\`

### 45. Presentation Outline
\`\`\`
Create a presentation outline for [topic]. Duration: [minutes]. Audience: [who]. Include: opening hook, 3-4 main points with supporting data, transitions, and a memorable closing with CTA.
\`\`\`

## Advanced Power Prompts

### 46. Rewrite for Different Audience
\`\`\`
Rewrite this text for [new audience, e.g., executives/beginners/technical team]: [paste text]. Keep the core message but adjust vocabulary, detail level, and examples.
\`\`\`

### 47. Extract Action Items
\`\`\`
Extract all action items from this text. Format as: Task | Owner (if mentioned) | Deadline (if mentioned) | Priority (if inferable).

Text: [paste document/email/notes]
\`\`\`

### 48. Create Standard Operating Procedure
\`\`\`
Create an SOP for [process, e.g., client onboarding, content publishing, bug triage]. Include: purpose, scope, step-by-step instructions, responsible parties, tools needed, and quality checklist.
\`\`\`

### 49. Summarize Long Document
\`\`\`
Summarize this document in 3 levels:
1. One-sentence summary
2. Key points (5 bullets)
3. Detailed summary (200 words)

Document: [paste document]
\`\`\`

### 50. Weekly Review Template
\`\`\`
Help me do a weekly review. Ask me these questions one at a time:
1. What were my top 3 achievements this week?
2. What did not go as planned?
3. What did I learn?
4. What are my top 3 priorities for next week?
5. What do I need to say no to?
\`\`\`

## Pro Tips for Better ChatGPT Results

- **Be specific** — "Write a 200-word LinkedIn post about remote work challenges for engineering managers" beats "Write about remote work"
- **Set the role** — Start with "Act as a senior marketing manager" for context-appropriate responses
- **Specify format** — Ask for bullet points, tables, numbered lists, or specific structures
- **Give examples** — Include sample text of the style or tone you want
- **Iterate** — Your first prompt rarely gives the best result, refine with follow-ups

## Related ByteVerse guides

Next, read [Best ChatGPT Alternatives 2026: Free and Paid](/blog/best-chatgpt-alternatives-2026-free-paid), [AI Productivity Workflow 2026: Work Smarter](/blog/ai-productivity-workflow-2026-time-blocking-automation), and [Best AI Productivity Apps for Freelancers 2026](/blog/best-ai-productivity-apps-for-freelancers-2026) to build a stronger workflow around this topic.

## Frequently Asked Questions

### What are the best ChatGPT prompts for work?

The best prompts are specific, include context, define the format you want, and set the tone. The prompts in this guide cover emails, reports, meetings, marketing, coding, and daily productivity.

### How do I get better results from ChatGPT?

Be specific with your requests, provide context, set a role, specify the format and length, include examples of what you want, and iterate on the output with follow-up prompts.

### Can I use these prompts with Claude or Gemini?

Yes. These prompts work with any AI assistant including Claude, Gemini, Copilot, and Perplexity. Adjust based on each tool's strengths.

## Final Recommendation

Save this page and use 2-3 prompts daily. Within a week, you will save hours on emails, reports, and planning. The key is consistency — make AI prompts part of your daily workflow, not a one-time experiment.`,
  },

  // ═══════════════════════════════════════════════════════
  // 4. BEST VS CODE EXTENSIONS — steady developer traffic
  // ═══════════════════════════════════════════════════════
  {
    category: "coding",
    title: "25 Best VS Code Extensions 2026 for Web Developers",
    slug: "best-vscode-extensions-2026-web-developers",
    excerpt:
      "The 25 best VS Code extensions for web developers in 2026 covering AI, productivity, debugging, formatting, Git, and frontend tools.",
    metaTitle: "25 Best VS Code Extensions 2026 for Web Developers",
    metaDescription:
      "Install the 25 best VS Code extensions for 2026: AI assistants, productivity, debugging, Git, formatting, and frontend tools.",
    keywords:
      "best VS Code extensions 2026, VS Code extensions web development, must have VS Code extensions, VS Code productivity",
    cover: "1555066931-4365d14bab8c",
    content: `Your VS Code setup can make or break your productivity. These are the **25 best VS Code extensions for web developers in 2026** — tested, practical, and actively maintained.

No bloated lists with 100 extensions you will never use. Just the ones that actually make a difference.

![VS Code editor with extensions for web development](${imageUrl("1555066931-4365d14bab8c")} "Best VS Code extensions 2026 for web developers")

## AI-Powered Extensions

### 1. GitHub Copilot
The gold standard for AI code completion. Copilot understands context across files and generates accurate suggestions for almost any language.

**Why install:** Saves 30-50% coding time on repetitive tasks, tests, and boilerplate.

**Price:** $10/month (free for students and open source maintainers).

### 2. Codeium
Free alternative to Copilot with surprisingly good autocomplete. Supports 70+ languages and does not require a subscription.

**Why install:** Best free AI coding assistant, fast completions, good for side projects.

### 3. Continue
Open source AI code assistant that works with any model — Claude, GPT-4, Llama, or your own. Full chat, autocomplete, and inline editing.

**Why install:** Use your preferred AI model directly in VS Code with no vendor lock-in.

## Productivity Extensions

### 4. Error Lens
Shows errors and warnings inline in your code, right next to the problematic line. No more squinting at the Problems panel.

**Why install:** Catch errors instantly without switching panels.

### 5. Todo Tree
Scans your codebase for TODO, FIXME, HACK comments and displays them in a searchable tree view.

**Why install:** Never lose track of incomplete work or technical debt.

### 6. Turbo Console Log
Insert meaningful console.log statements with one shortcut (Ctrl+Alt+L). Includes variable name, file, and line number.

**Why install:** Debug faster with structured logs instead of typing console.log manually.

### 7. Auto Rename Tag
Automatically renames the matching HTML/JSX tag when you edit one. Simple but saves hundreds of small edits per day.

**Why install:** Eliminates mismatched tag errors in HTML and JSX.

![Developer productivity tools and extensions setup](${imageUrl("1517694712202-14dd9538aa97")} "VS Code productivity extensions workspace")

## Formatting and Code Quality

### 8. Prettier
The industry standard code formatter. Set it up once and never argue about code style again.

**Why install:** Consistent formatting across your entire team with zero effort.

### 9. ESLint
Catches JavaScript/TypeScript bugs and enforces coding standards. Combined with Prettier, your code stays clean automatically.

**Why install:** Prevents bugs before they happen and enforces team standards.

### 10. Stylelint
Does for CSS what ESLint does for JavaScript. Catches errors, enforces conventions, and auto-fixes issues.

**Why install:** Clean, consistent CSS without manual review.

### 11. EditorConfig
Maintains consistent coding styles across different editors and IDEs using a simple .editorconfig file.

**Why install:** Team members with different editors get the same formatting.

## Git and Version Control

### 12. GitLens
Supercharges VS Code's Git capabilities. See who changed what line, browse file history, compare branches, and more.

**Why install:** Understand code history without leaving the editor.

### 13. Git Graph
Beautiful visual Git log showing branches, merges, and commits as an interactive graph.

**Why install:** Visualize complex Git history at a glance.

### 14. Conventional Commits
Helps write structured commit messages following the Conventional Commits standard. Auto-suggests types, scopes, and formatting.

**Why install:** Clean commit history that works with automated changelogs.

## Frontend Development

### 15. Tailwind CSS IntelliSense
Autocomplete, syntax highlighting, and linting for Tailwind CSS classes. Essential if you use Tailwind.

**Why install:** Never guess class names again, see color previews inline.

### 16. CSS Peek
Peek at CSS definitions directly from HTML class attributes. Ctrl+click on a class name to jump to its definition.

**Why install:** Navigate between HTML and CSS instantly.

### 17. Path Intellisense
Autocompletes file paths in import statements. Works with JavaScript, TypeScript, HTML, CSS, and more.

**Why install:** No more typos in import paths.

### 18. Image Preview
Shows image previews in the gutter next to image paths and on hover. Great for catching wrong image references.

**Why install:** Visual confirmation that you are referencing the right image.

![Frontend development tools and VS Code extensions](${imageUrl("1498050108023-c5249f4df085")} "VS Code frontend development extensions")

## Debugging and Testing

### 19. REST Client
Send HTTP requests directly from VS Code using .http or .rest files. No need for Postman for simple API testing.

**Why install:** Test APIs without leaving the editor.

### 20. Thunder Client
Full-featured API client inside VS Code with collections, environments, and tests. Like Postman but built into your editor.

**Why install:** Complete API testing workflow without switching apps.

### 21. Vitest Explorer
Run and debug Vitest tests directly from the editor with inline results, watch mode, and coverage visualization.

**Why install:** Fastest test feedback loop for Vitest users.

## Quality of Life

### 22. Better Comments
Color-codes comments by type: TODOs, alerts, queries, highlights, and strikethroughs for commented-out code.

**Why install:** Scannable, meaningful comments at a glance.

### 23. Material Icon Theme
Beautiful file and folder icons that make the explorer panel easier to scan. Distinguishes file types instantly.

**Why install:** Faster visual navigation of project files.

### 24. Bracket Pair Color DeLighter
Although VS Code now has built-in bracket coloring, this extension adds custom themes and more visible matching.

**Why install:** Navigate deeply nested code without losing track.

### 25. Live Server
Launch a local development server with live reload for static HTML/CSS/JS files. One click to preview.

**Why install:** Instant preview for static sites and HTML prototypes.

## My Recommended Setup

For a clean, fast VS Code setup in 2026, install these 10 first:

1. **GitHub Copilot** (or Codeium if free)
2. **Prettier** + **ESLint**
3. **Error Lens**
4. **GitLens**
5. **Tailwind CSS IntelliSense** (if using Tailwind)
6. **Auto Rename Tag**
7. **Path Intellisense**
8. **REST Client**
9. **Material Icon Theme**
10. **Todo Tree**

This gives you AI assistance, formatting, error visibility, Git superpowers, and quality of life improvements without bloating your editor.

## Common Mistakes with VS Code Extensions

- **Installing too many** — every extension slows startup, keep it under 20 active
- **Not configuring them** — Prettier and ESLint need project-level config to work well
- **Ignoring workspace recommendations** — use .vscode/extensions.json for team consistency
- **Forgetting to disable unused ones** — disable extensions you do not use in specific workspaces

## Related ByteVerse guides

Next, read [Best AI Coding Assistants 2026: Copilot vs Cursor vs Windsurf](/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf), [JavaScript Roadmap 2026: Beginner to Job Ready](/blog/javascript-roadmap-2026-beginner-job-ready), and [React 19 Best Practices 2026: Faster Apps](/blog/react-19-best-practices-2026-faster-apps) to build a stronger workflow around this topic.

## Frequently Asked Questions

### What are the must-have VS Code extensions in 2026?

GitHub Copilot (or Codeium), Prettier, ESLint, Error Lens, GitLens, and Tailwind CSS IntelliSense are the most impactful for web developers.

### How many VS Code extensions should I install?

Keep it under 15-20 active extensions. Too many extensions slow down startup, increase memory usage, and can cause conflicts.

### Is GitHub Copilot worth it for VS Code?

Yes, for most professional developers. It saves significant time on boilerplate, tests, and repetitive code. The free Codeium extension is a good alternative if budget is a concern.

### Do VS Code extensions slow down the editor?

Some can. Heavy extensions like full-featured AI assistants use more memory. Disable extensions you do not need in specific workspaces to keep VS Code fast.

## Final Recommendation

Start with 5-7 extensions, master them, then add more only when you feel a specific pain point. A lean, well-configured VS Code setup beats a bloated one every time.`,
  },

  // ═══════════════════════════════════════════════════════
  // 5. LEARN PROGRAMMING 2026 — evergreen high volume
  // ═══════════════════════════════════════════════════════
  {
    category: "tech-guides",
    title: "How to Learn Programming in 2026: Complete Beginner Roadmap",
    slug: "how-to-learn-programming-2026-beginner-roadmap",
    excerpt:
      "A complete roadmap to learn programming in 2026 from zero. Covers which language to start with, free resources, projects, and how to get your first job.",
    metaTitle: "How to Learn Programming in 2026: Beginner Roadmap",
    metaDescription:
      "Learn programming in 2026 from scratch with this complete roadmap covering languages, resources, projects, and career tips.",
    keywords:
      "how to learn programming 2026, learn coding for beginners, programming roadmap 2026, best programming language to learn, learn to code free",
    cover: "1517694712202-14dd9538aa97",
    content: `Want to **learn programming in 2026** but do not know where to start? You are in the right place. This roadmap takes you from complete beginner to building real projects — no CS degree required.

The tech industry still needs developers. AI has not replaced programmers — it has made them more productive. Learning to code in 2026 is one of the highest-ROI skills you can invest in.

![Beginner programmer learning to code on laptop](${imageUrl("1517694712202-14dd9538aa97")} "Learning programming in 2026 beginner roadmap")

## Which Programming Language Should You Learn First?

This is the most common question, and the answer depends on your goal:

| Your Goal | Best First Language | Why |
|-----------|-------------------|-----|
| Web development | JavaScript | Runs in browsers, huge job market |
| Data science / AI | Python | Simple syntax, best AI libraries |
| Mobile apps | JavaScript (React Native) or Swift/Kotlin | Cross-platform or native |
| General purpose | Python | Easiest to learn, very versatile |
| Game development | C# (Unity) | Industry standard for indie games |

**My recommendation for most beginners: Start with Python or JavaScript.** Both have simple syntax, massive communities, free resources, and strong job markets.

## Phase 1: Fundamentals (Week 1-4)

### What to Learn

Every programming language shares these core concepts. Master them in your chosen language:

1. **Variables and data types** — storing information (strings, numbers, booleans)
2. **Conditionals** — if/else logic for decision making
3. **Loops** — repeating actions (for, while)
4. **Functions** — reusable blocks of code
5. **Arrays/Lists** — storing collections of data
6. **Objects/Dictionaries** — key-value data structures
7. **Basic input/output** — reading and displaying data

### Free Resources

- **Python:** [Python.org tutorial](https://docs.python.org/3/tutorial/), freeCodeCamp Python course
- **JavaScript:** [javascript.info](https://javascript.info/), freeCodeCamp JavaScript course
- **Both:** CS50 by Harvard (free on YouTube)

### First Projects

- Calculator app
- Number guessing game
- To-do list (console-based)
- Temperature converter
- Simple quiz game

![Programming fundamentals and first coding projects](${imageUrl("1542831371-29b0f74f9713")} "Learning programming fundamentals with projects")

## Phase 2: Build Real Things (Week 5-8)

### Web Development Path (JavaScript)

1. **HTML and CSS** — structure and style web pages
2. **DOM manipulation** — make pages interactive
3. **Fetch API** — get data from servers
4. **Responsive design** — mobile-friendly layouts
5. **Git basics** — version control your code

### Python Path

1. **File handling** — read/write files
2. **API requests** — get data from the internet
3. **Basic web scraping** — extract data from websites
4. **Simple automation** — automate repetitive tasks
5. **Git basics** — version control

### Projects to Build

- Personal portfolio website (HTML/CSS/JS)
- Weather app using a free API
- Web scraper for price tracking (Python)
- Bookmark manager with local storage
- Expense tracker

## Phase 3: Level Up (Week 9-16)

### For Web Developers

1. **React or Next.js** — modern frontend frameworks
2. **Node.js** — server-side JavaScript
3. **Databases** — PostgreSQL or MongoDB basics
4. **REST APIs** — build your own backend
5. **Deployment** — put your projects online (Vercel, Netlify)

### For Python Developers

1. **Flask or FastAPI** — build web APIs
2. **Databases** — SQLite, PostgreSQL
3. **Data analysis** — pandas, matplotlib
4. **Basic ML** — scikit-learn fundamentals
5. **Deployment** — host your apps (Railway, Render)

### Projects to Build

- Full-stack blog with user authentication
- Task management app with database
- AI chatbot using OpenAI API
- Data dashboard with charts
- E-commerce product page with cart

![Advanced programming projects and portfolio building](${imageUrl("1498050108023-c5249f4df085")} "Building advanced programming projects")

## Phase 4: Get Job Ready (Week 17-24)

### Build a Portfolio

Your portfolio is more important than a certificate. Include:

1. **3-5 polished projects** on GitHub with clean README files
2. **A personal website** showcasing your work
3. **Live deployments** — every project should have a working URL
4. **Code quality** — clean, commented, well-structured code

### Learn These Non-Coding Skills

- **Git and GitHub** — every company uses version control
- **Terminal/Command line** — basic navigation and commands
- **Problem solving** — practice on LeetCode or HackerRank (start easy)
- **Communication** — explain your code and decisions clearly
- **Reading documentation** — the most underrated developer skill

### Where to Find Your First Job

| Platform | Best For |
|----------|---------|
| LinkedIn | Full-time roles, networking |
| Indeed | Entry-level positions |
| Wellfound (AngelList) | Startup jobs |
| Upwork/Fiverr | Freelance projects |
| GitHub Jobs | Developer-specific roles |
| Local meetups | Networking, referrals |
| Twitter/X | Tech community connections |

## How AI Changes Learning to Code in 2026

AI tools like GitHub Copilot and ChatGPT are incredibly helpful for learners, but use them correctly:

**Do:**
- Use AI to explain code you do not understand
- Ask AI to review your code and suggest improvements
- Generate practice problems and exercises
- Get help debugging when truly stuck

**Do not:**
- Copy-paste AI code without understanding it
- Skip learning fundamentals because AI can write code
- Rely on AI for exam or interview preparation
- Stop reading documentation

**The developers who will thrive in 2026 are those who understand code AND know how to leverage AI tools effectively.**

## Common Mistakes Beginners Make

1. **Tutorial hell** — watching tutorials without building your own projects
2. **Switching languages** — stick with one language for at least 3 months
3. **Skipping fundamentals** — jumping to React before understanding JavaScript
4. **Not using Git** — start using version control from day one
5. **Perfectionism** — ship imperfect projects, improve them later
6. **Isolation** — join communities, find study partners, ask questions
7. **Ignoring errors** — error messages are your best debugging tool, read them carefully

## Daily Learning Schedule (2 Hours/Day)

| Time | Activity |
|------|----------|
| 0-30 min | Review yesterday's concepts |
| 30-80 min | Learn new concept + practice exercises |
| 80-110 min | Work on your current project |
| 110-120 min | Write notes on what you learned |

Consistency beats intensity. Two focused hours daily beats eight hours on weekends.

## Related ByteVerse guides

Next, read [JavaScript Roadmap 2026: Beginner to Job Ready](/blog/javascript-roadmap-2026-beginner-job-ready), [Best AI Coding Assistants 2026: Copilot vs Cursor vs Windsurf](/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf), and [How to Start a Tech Blog in 2026: SEO Checklist](/blog/how-to-start-a-tech-blog-2026-seo-checklist) to build a stronger workflow around this topic.

## Frequently Asked Questions

### Is it too late to learn programming in 2026?

Absolutely not. The demand for developers continues to grow. AI tools make developers more productive, not obsolete. Companies need people who can build, maintain, and improve software.

### Can I learn programming for free?

Yes. freeCodeCamp, The Odin Project, CS50, Python.org, and javascript.info are all free and excellent. You do not need to pay for courses to get started.

### How long does it take to learn programming?

With consistent daily practice (2 hours/day), you can build basic projects in 4-6 weeks, intermediate projects in 3-4 months, and be job-ready in 6-9 months. Everyone's pace is different.

### Should I learn AI/ML or web development first?

Web development is the easier entry point with more entry-level jobs. Learn web development basics first, then specialize in AI/ML if that interests you.

### Do I need a computer science degree?

No. Many successful developers are self-taught or came from bootcamps. A strong portfolio, problem-solving skills, and the ability to learn continuously matter more than a degree.

## Final Recommendation

Start today. Not tomorrow, not next Monday. Pick Python or JavaScript, open a free tutorial, and write your first line of code. The roadmap above will guide you, but the most important step is the first one.

Programming is a skill that compounds over time. Every day you practice, you get measurably better. Six months from now, you will be amazed at what you can build.`,
  },
];

function readingTime(content) {
  return `${Math.max(1, Math.ceil(content.split(/\s+/).length / 200))} min read`;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");

  const categories = await sql`select id, slug from categories`;
  const categoryIds = new Map(categories.map((c) => [c.slug, c.id]));
  const inserted = [];

  for (const post of newPosts) {
    const categoryId = categoryIds.get(post.category);
    if (!categoryId) throw new Error(`Missing category: ${post.category}`);

    const content = post.content;
    const rt = readingTime(content);

    const [saved] = await sql`
      insert into posts (
        title, slug, excerpt, content, cover_image, category_id, author, published, featured,
        meta_title, meta_description, keywords, reading_time, updated_at
      ) values (
        ${post.title}, ${post.slug}, ${post.excerpt}, ${content},
        ${imageUrl(post.cover, 1600)}, ${categoryId}, ${author}, true, false,
        ${post.metaTitle}, ${post.metaDescription}, ${post.keywords}, ${rt}, now()
      )
      on conflict (slug) do update set
        title = excluded.title,
        excerpt = excluded.excerpt,
        content = excluded.content,
        cover_image = excluded.cover_image,
        category_id = excluded.category_id,
        meta_title = excluded.meta_title,
        meta_description = excluded.meta_description,
        keywords = excluded.keywords,
        reading_time = excluded.reading_time,
        updated_at = now()
      returning id, slug
    `;

    inserted.push(saved);
    console.log(`Published: ${post.title} (${rt})`);
  }

  console.log(`\nDone! Published ${inserted.length} posts.`);
  console.log(JSON.stringify(inserted, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
