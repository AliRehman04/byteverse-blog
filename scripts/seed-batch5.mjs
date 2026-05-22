import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const CB = "`";
const TBT = "```";

const posts = [
  {
    title: "Tailwind CSS 4 Guide 2026: What's New and How to Migrate",
    slug: "tailwind-css-4-guide-2026",
    excerpt: "Tailwind CSS 4 brings a new engine, CSS-first config, and massive performance gains. Here is everything that changed and how to migrate your project.",
    content: `Tailwind CSS 4 dropped earlier this year and it is easily the biggest update the framework has ever seen. The team rebuilt the engine from scratch, replaced the JavaScript config file with pure CSS configuration, and made the whole thing significantly faster.

If you have been using Tailwind 3.x, you will notice differences right away. Some things are simpler now. A few things work differently. This guide covers what actually changed, what you need to update, and how to migrate without breaking your project.

## What Changed in Tailwind CSS 4

The short version: almost everything under the hood is new, but your day-to-day utility classes mostly stay the same.

### New CSS-First Configuration

The biggest change is that ${CB}tailwind.config.js${CB} is no longer the default way to configure Tailwind. Instead, you write your configuration directly in CSS using ${CB}@theme${CB} directives.

Here is what the old config looked like:

${TBT}javascript
// tailwind.config.js (Tailwind 3)
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#6366f1',
      },
    },
  },
  plugins: [],
}
${TBT}

And here is the Tailwind 4 equivalent:

${TBT}css
/* globals.css (Tailwind 4) */
@import "tailwindcss";

@theme {
  --color-brand: #6366f1;
  --font-heading: "Inter", sans-serif;
  --breakpoint-3xl: 1920px;
}
${TBT}

Everything lives in your CSS file now. Colors, fonts, spacing, breakpoints - all defined as CSS custom properties inside ${CB}@theme${CB}. This means your config is closer to the actual output and easier to debug in browser dev tools.

### Oxide Engine - Much Faster Builds

Tailwind 4 uses a completely new engine (codenamed Oxide) that is written in Rust. The result is dramatic:

- Full builds are up to 10x faster
- Incremental builds (when you save a file) are up to 100x faster
- Hot module replacement feels instant even on large projects

If you have ever waited 2-3 seconds for Tailwind to rebuild on save, those days are over.

### Automatic Content Detection

You no longer need a ${CB}content${CB} array in your config. Tailwind 4 automatically detects your template files by scanning your project. It knows where to look for class names without you telling it.

${TBT}javascript
// Tailwind 3 - you needed this
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
}
${TBT}

${TBT}css
/* Tailwind 4 - automatic, no content config needed */
@import "tailwindcss";
${TBT}

### Built-in Container Queries

Container queries are now built into Tailwind 4 without needing a plugin:

${TBT}html
<div class="@container">
  <div class="@sm:flex @lg:grid @lg:grid-cols-3">
    <!-- Responds to container size, not viewport -->
  </div>
</div>
${TBT}

### New Default Color Palette

The color palette got an update. Shades are more consistent, and there is better contrast across light and dark themes. If you relied on specific hex values from Tailwind 3, double-check your designs after upgrading.

## How to Migrate from Tailwind 3 to 4

Here is the step-by-step process.

### Step 1: Update Dependencies

${TBT}bash
npm install tailwindcss@latest @tailwindcss/postcss@latest
${TBT}

If you use the typography or forms plugin, update those too:

${TBT}bash
npm install @tailwindcss/typography@latest
${TBT}

### Step 2: Update Your PostCSS Config

${TBT}javascript
// postcss.config.mjs (Tailwind 4)
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
${TBT}

You are replacing ${CB}tailwindcss${CB} and ${CB}autoprefixer${CB} with a single ${CB}@tailwindcss/postcss${CB} plugin.

### Step 3: Replace the Config File with CSS

Move your ${CB}tailwind.config.js${CB} customizations into your CSS file. Here is a common migration:

${TBT}css
@import "tailwindcss";

@theme {
  --color-primary: #6366f1;
  --color-primary-foreground: #ffffff;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
${TBT}

### Step 4: Remove Deprecated Directives

The old ${CB}@tailwind base${CB}, ${CB}@tailwind components${CB}, and ${CB}@tailwind utilities${CB} directives are replaced by a single import:

${TBT}css
/* Old (Tailwind 3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* New (Tailwind 4) */
@import "tailwindcss";
${TBT}

### Step 5: Fix Breaking Class Name Changes

A few utility classes changed:

| Tailwind 3 | Tailwind 4 | Notes |
|---|---|---|
| ${CB}bg-opacity-50${CB} | ${CB}bg-black/50${CB} | Opacity modifier syntax |
| ${CB}ring-offset-2${CB} | ${CB}ring-offset-2${CB} | Same but uses CSS variables |
| ${CB}decoration-clone${CB} | ${CB}box-decoration-clone${CB} | Renamed |

### Step 6: Test Everything

Run your dev server, check every page, and look for visual differences. Most projects migrate cleanly, but custom plugins or unusual configurations might need adjustments.

## New Features Worth Using

### Variant Groups

Group multiple variants to reduce repetition:

${TBT}html
<button class="hover:(bg-blue-500 text-white scale-105)">
  Click me
</button>
${TBT}

### 3D Transforms

${TBT}html
<div class="rotate-x-12 rotate-y-6 perspective-800">
  3D transformed element
</div>
${TBT}

### Field Sizing

Auto-resize textareas based on content:

${TBT}html
<textarea class="field-sizing-content"></textarea>
${TBT}

## Should You Upgrade Right Now?

If you are starting a new project, use Tailwind 4 without question. The CSS-first config, faster builds, and automatic content detection make it the clear choice.

For existing projects, the migration is straightforward for most apps. The official upgrade tool handles a lot of the work:

${TBT}bash
npx @tailwindcss/upgrade
${TBT}

Run it, review the changes, fix anything it missed, and you should be good.

## Frequently Asked Questions

**Does Tailwind 4 work with Next.js?**
Yes. Next.js 14+ and 15+ both support Tailwind 4 out of the box. Just update your dependencies and PostCSS config.

**Can I keep using tailwind.config.js?**
There is a compatibility layer that lets you keep the JS config, but the recommended approach is CSS-first with ${CB}@theme${CB}.

**Do all plugins work with Tailwind 4?**
Official plugins like typography and forms have been updated. Third-party plugins may need updates from their maintainers. Check each plugin's changelog before upgrading.

**Is Tailwind 4 production-ready?**
Absolutely. It has been stable since its release and is used in production by thousands of projects. The new engine was tested extensively before launch.`,
    coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85f7f7?w=1200&h=630&fit=crop",
    categoryId: 4,
    metaTitle: "Tailwind CSS 4 Guide 2026: What's New and How to Migrate",
    metaDescription: "Complete guide to Tailwind CSS 4. Learn what changed, how to migrate from v3, and start using the new CSS-first config and Oxide engine.",
    keywords: "tailwind css 4, tailwind 4 migration, tailwind css 2026, tailwind css guide, tailwind css new features, css framework 2026",
  },
  {
    title: "Best Free APIs for Developers 2026: 25+ APIs You Should Know",
    slug: "best-free-apis-for-developers-2026",
    excerpt: "A curated list of 25+ free APIs every developer should bookmark. From AI and weather to finance and entertainment, these APIs power real projects.",
    content: `Finding a good free API can save you days of work. Whether you are building a side project, learning to code, or prototyping an app, these APIs give you real data and real functionality without spending a dime.

I have tested each of these APIs personally. Every one on this list has a free tier that is generous enough for personal projects and prototyping. Here are the best free APIs for developers in 2026, organized by category.

## AI and Machine Learning APIs

### 1. OpenAI API (Free Tier)

The most popular AI API. You get free credits when you sign up, enough to build and test chatbot integrations, text generation, and image analysis.

- **Free tier**: $5 in credits for new accounts
- **Best for**: Chatbots, text generation, code completion
- **Docs**: [platform.openai.com](https://platform.openai.com)

### 2. Hugging Face Inference API

Run thousands of open-source ML models for free. Text classification, image recognition, translation, and more.

- **Free tier**: Rate-limited but unlimited requests
- **Best for**: NLP, computer vision, model experimentation
- **Docs**: [huggingface.co/docs](https://huggingface.co/docs)

### 3. Groq API

Blazing fast inference for open-source LLMs like Llama and Mixtral. Free tier is surprisingly generous.

- **Free tier**: 30 requests/minute, multiple models
- **Best for**: Fast AI responses, open-source model testing
- **Docs**: [console.groq.com](https://console.groq.com)

## Weather and Location APIs

### 4. OpenWeatherMap

The go-to weather API for developers. Current weather, forecasts, and historical data.

- **Free tier**: 1,000 calls/day
- **Best for**: Weather apps, dashboards, location-based features
- **Docs**: [openweathermap.org/api](https://openweathermap.org/api)

### 5. Open-Meteo

Completely free weather API with no API key required. Supports hourly and daily forecasts worldwide.

- **Free tier**: Unlimited for non-commercial use
- **Best for**: Quick prototypes, weather widgets
- **Docs**: [open-meteo.com](https://open-meteo.com)

### 6. IP Geolocation (ipapi)

Get location data from any IP address. Country, city, timezone, currency, and more.

- **Free tier**: 1,000 requests/day
- **Best for**: Visitor analytics, localization
- **Docs**: [ipapi.co](https://ipapi.co)

## Finance and Crypto APIs

### 7. CoinGecko API

Comprehensive crypto data. Prices, market cap, volume, historical charts for 10,000+ coins.

- **Free tier**: 30 calls/minute
- **Best for**: Crypto dashboards, price trackers
- **Docs**: [coingecko.com/api](https://www.coingecko.com/api)

### 8. Alpha Vantage

Stock market data, forex, and crypto. Intraday, daily, and weekly time series.

- **Free tier**: 25 requests/day
- **Best for**: Stock trackers, financial dashboards
- **Docs**: [alphavantage.co](https://www.alphavantage.co)

### 9. ExchangeRate API

Simple currency conversion API. Supports 160+ currencies with daily updates.

- **Free tier**: 1,500 requests/month
- **Best for**: E-commerce, currency converters
- **Docs**: [exchangerate-api.com](https://www.exchangerate-api.com)

## Entertainment and Media APIs

### 10. TMDB (The Movie Database)

Movie and TV show data. Posters, ratings, cast, trailers, and recommendations.

- **Free tier**: Unlimited requests (with attribution)
- **Best for**: Movie apps, recommendation engines
- **Docs**: [developers.themoviedb.org](https://developers.themoviedb.org)

### 11. Spotify Web API

Access Spotify's music catalog. Search tracks, get audio features, manage playlists.

- **Free tier**: Requires Spotify account, generous limits
- **Best for**: Music apps, playlist tools, audio analysis
- **Docs**: [developer.spotify.com](https://developer.spotify.com)

### 12. News API

Headlines and articles from 80,000+ sources worldwide. Search by keyword, category, or source.

- **Free tier**: 100 requests/day (dev only)
- **Best for**: News aggregators, media dashboards
- **Docs**: [newsapi.org](https://newsapi.org)

### 13. Pokemon API (PokeAPI)

Every Pokemon, move, ability, and type. Perfect for learning API integration.

- **Free tier**: Unlimited, no key needed
- **Best for**: Learning projects, fun apps
- **Docs**: [pokeapi.co](https://pokeapi.co)

## Data and Utility APIs

### 14. REST Countries

Detailed information about every country. Population, languages, currencies, flags, timezones.

- **Free tier**: Unlimited, no key needed
- **Best for**: Country selectors, educational apps
- **Docs**: [restcountries.com](https://restcountries.com)

### 15. GitHub API

Access repositories, issues, pull requests, user profiles, and organization data.

- **Free tier**: 5,000 requests/hour (authenticated)
- **Best for**: Developer tools, portfolio pages, automation
- **Docs**: [docs.github.com/rest](https://docs.github.com/rest)

### 16. Unsplash API

High-quality stock photos. Search, random images, and collections.

- **Free tier**: 50 requests/hour
- **Best for**: Image placeholders, design tools, blogs
- **Docs**: [unsplash.com/developers](https://unsplash.com/developers)

### 17. JSONPlaceholder

Fake REST API for testing and prototyping. Users, posts, comments, todos, and photos.

- **Free tier**: Unlimited, no key needed
- **Best for**: Frontend testing, learning REST APIs
- **Docs**: [jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com)

## Communication APIs

### 18. Resend

Modern email API built for developers. Clean SDK, good deliverability.

- **Free tier**: 3,000 emails/month
- **Best for**: Transactional emails, contact forms
- **Docs**: [resend.com/docs](https://resend.com/docs)

### 19. Twilio (Free Trial)

SMS, voice calls, and WhatsApp messaging. The free trial gives you enough to build and test.

- **Free tier**: $15 trial credit
- **Best for**: OTP, notifications, voice features
- **Docs**: [twilio.com/docs](https://www.twilio.com/docs)

### 20. Discord API

Build bots, manage servers, send messages programmatically.

- **Free tier**: Generous rate limits
- **Best for**: Discord bots, community tools
- **Docs**: [discord.com/developers](https://discord.com/developers)

## Maps and Geolocation APIs

### 21. Mapbox

Interactive maps, geocoding, and directions. Beautiful map styles.

- **Free tier**: 50,000 map loads/month
- **Best for**: Map-based apps, delivery tracking
- **Docs**: [docs.mapbox.com](https://docs.mapbox.com)

### 22. OpenCage Geocoding

Convert addresses to coordinates and back. Supports worldwide data.

- **Free tier**: 2,500 requests/day
- **Best for**: Address lookup, location search
- **Docs**: [opencagedata.com](https://opencagedata.com)

## Authentication APIs

### 23. Auth0

Complete authentication and authorization platform. Social login, MFA, user management.

- **Free tier**: 7,500 active users
- **Best for**: User auth in any app
- **Docs**: [auth0.com/docs](https://auth0.com/docs)

### 24. Clerk

Developer-friendly auth with prebuilt UI components. Works great with Next.js.

- **Free tier**: 10,000 monthly active users
- **Best for**: Next.js apps, fast auth setup
- **Docs**: [clerk.com/docs](https://clerk.com/docs)

## Miscellaneous APIs

### 25. QR Code Generator API

Generate QR codes on the fly. Customize size, color, and format.

- **Free tier**: Unlimited
- **Best for**: E-commerce, event tickets, link sharing
- **URL**: ${CB}https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=YOUR_URL${CB}

### 26. Random User Generator

Generate random user profiles with photos, addresses, and contact info.

- **Free tier**: Unlimited, no key needed
- **Best for**: UI mockups, testing, demo data
- **Docs**: [randomuser.me](https://randomuser.me)

## How to Choose the Right API

When picking an API for your project, check these things:

1. **Rate limits** - Will the free tier handle your expected traffic?
2. **Documentation quality** - Good docs save hours of debugging
3. **Response format** - JSON is standard, avoid APIs that only return XML
4. **Authentication** - API key is simplest; OAuth adds complexity
5. **Reliability** - Check the API's status page and uptime history

## Frequently Asked Questions

**Do free APIs stay free forever?**
Most maintain their free tiers, but limits can change. Always check the pricing page before building a production app around a free API.

**Can I use free APIs in commercial projects?**
It depends on each API's terms of service. Many allow commercial use on free tiers, but some restrict it to non-commercial or development use only.

**What happens when I hit the rate limit?**
Most APIs return a 429 (Too Many Requests) error. Implement retry logic with exponential backoff in your code to handle this gracefully.

**Should I use an API wrapper or call APIs directly?**
For popular APIs like OpenAI, Spotify, and GitHub, official SDKs and community wrappers save time. For simpler APIs, a direct fetch call is usually enough.`,
    coverImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop",
    categoryId: 4,
    metaTitle: "Best Free APIs for Developers 2026: 25+ APIs You Should Know",
    metaDescription: "Curated list of 25+ free APIs for developers in 2026. AI, weather, finance, entertainment, and more. Tested and ready for your next project.",
    keywords: "free apis, best free apis 2026, apis for developers, free api list, rest api, public apis, developer apis",
  },
  {
    title: "How to Build a Portfolio Website 2026: Complete Developer Guide",
    slug: "build-portfolio-website-2026",
    excerpt: "Learn how to build a developer portfolio website that actually gets you hired. Covers tech stack, design, content, SEO, and deployment.",
    content: `Your portfolio website is the one thing that sets you apart from every other developer applying for the same job. A GitHub profile is nice, but a well-built portfolio shows you can actually ship something real.

I have reviewed hundreds of developer portfolios over the years. The ones that lead to interviews all share the same qualities: they are fast, clean, and focused on showing what the developer can actually do. Here is how to build one that works.

## Choose Your Tech Stack

You do not need a complicated setup. Pick tools you already know, or use this as a chance to learn something new.

### Recommended Stacks

**For beginners:**
- HTML, CSS, JavaScript (no framework)
- Host on GitHub Pages or Netlify
- Zero cost, simple deployment

**For React/Next.js developers:**
- Next.js with App Router
- Tailwind CSS for styling
- Deploy on Vercel
- Best for SSR, SEO, and performance

**For minimalists:**
- Astro or Hugo (static site generators)
- Markdown-based content
- Extremely fast loading times

My recommendation: If you know React, go with **Next.js + Tailwind CSS + Vercel**. You get great SEO, fast page loads, and free hosting.

## Plan Your Sections

Every strong portfolio has these sections:

### 1. Hero Section

Your name, title, and a one-line description of what you do. Keep it simple:

${TBT}
Ali Rehman
Full-Stack Developer
I build fast web apps with React and Next.js.
${TBT}

Add a professional photo if you have one. Skip it if you do not - a clean design without a photo works fine too.

### 2. About Section

Two to three paragraphs about your background. What technologies you work with. What kind of problems you enjoy solving. Keep it conversational, not like a resume bullet point list.

### 3. Projects Section (Most Important)

This is where hiring managers spend the most time. For each project, include:

- **Project name and screenshot** - First impressions matter
- **Short description** - What does it do? (2-3 sentences)
- **Tech stack used** - List the main technologies
- **Live demo link** - Recruiters want to click and see it working
- **GitHub link** - Show the code if it is open source
- **Your role** - What did you specifically build?

**How many projects?** Three to five strong projects are better than ten weak ones. Quality over quantity always.

### 4. Skills Section

List your technologies, but do it thoughtfully. Group them by category:

${TBT}
Frontend: React, Next.js, TypeScript, Tailwind CSS
Backend: Node.js, Express, PostgreSQL, Prisma
Tools: Git, Docker, VS Code, Figma
Cloud: Vercel, AWS, Cloudflare
${TBT}

Skip the progress bars. Nobody believes a self-assessed "90% JavaScript" rating.

### 5. Contact Section

A simple contact form or just your email and social links. LinkedIn, GitHub, and Twitter/X are the important ones for developers.

## Design Tips That Actually Matter

### Keep It Minimal

White space is your friend. Cluttered portfolios look unprofessional. Use a maximum of two fonts, two to three colors, and generous spacing.

### Dark Mode Support

Most developers browse in dark mode. Add a theme toggle - it shows attention to detail.

### Mobile-First

Recruiters often check portfolios on their phone. Test your site on mobile before deploying.

### Fast Load Times

Your portfolio is a reflection of your skills. If it takes 5 seconds to load, that says something about you as a developer. Aim for under 2 seconds.

Here is a basic performance checklist:

- Optimize and compress all images (use WebP format)
- Lazy load images below the fold
- Minimize JavaScript bundle size
- Use a CDN for static assets

## Build the Portfolio Step by Step

### Step 1: Initialize the Project

${TBT}bash
npx create-next-app@latest my-portfolio --typescript --tailwind --app
cd my-portfolio
${TBT}

### Step 2: Create the Layout

Set up your main layout with a header, content area, and footer:

${TBT}typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
${TBT}

### Step 3: Build the Hero

${TBT}typescript
export function Hero() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center text-center px-4">
      <div>
        <h1 className="text-5xl font-bold mb-4">Your Name</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Full-Stack Developer specializing in React and Node.js
        </p>
        <div className="flex gap-4 justify-center">
          <a href="#projects" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
            View Projects
          </a>
          <a href="#contact" className="px-6 py-3 border rounded-lg">
            Contact Me
          </a>
        </div>
      </div>
    </section>
  );
}
${TBT}

### Step 4: Create the Projects Grid

${TBT}typescript
const projects = [
  {
    title: "Project Name",
    description: "A brief description of what this project does.",
    stack: ["Next.js", "TypeScript", "PostgreSQL"],
    demo: "https://project-demo.com",
    github: "https://github.com/you/project",
    image: "/projects/project-screenshot.webp",
  },
  // Add more projects
];

export function Projects() {
  return (
    <section id="projects" className="py-20 px-4">
      <h2 className="text-3xl font-bold text-center mb-12">Projects</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}
${TBT}

### Step 5: Add SEO

${TBT}typescript
// app/layout.tsx
export const metadata = {
  title: "Your Name - Full-Stack Developer",
  description: "Portfolio of Your Name. Full-Stack Developer building web apps with React, Next.js, and Node.js.",
  openGraph: {
    title: "Your Name - Developer Portfolio",
    description: "Check out my projects and get in touch.",
    url: "https://yoursite.com",
    type: "website",
  },
};
${TBT}

### Step 6: Deploy

${TBT}bash
# Push to GitHub first
git init
git add -A
git commit -m "initial portfolio"
git remote add origin https://github.com/you/portfolio.git
git push -u origin main

# Deploy to Vercel
npx vercel --prod
${TBT}

Vercel automatically gives you a free subdomain and HTTPS. Connect your custom domain for a professional look.

## Common Mistakes to Avoid

1. **Too many projects** - Five great ones beat twenty mediocre ones
2. **No live demos** - Recruiters will not clone and run your code
3. **Template portfolios** - Customize it. Hiring managers recognize common templates
4. **Broken links** - Test every link before sharing your portfolio
5. **No mobile support** - Your portfolio needs to work on every screen size
6. **Walls of text** - Use visuals, screenshots, and short descriptions
7. **Outdated content** - Remove old projects that no longer represent your skill level

## SEO for Your Portfolio

You want your portfolio to show up when someone searches your name. Here is how:

- Add a descriptive title tag with your name and role
- Write a clear meta description
- Add an Open Graph image for social sharing
- Submit your sitemap to Google Search Console
- Use semantic HTML (proper heading hierarchy, alt text on images)
- Make sure your site loads fast (check with Google PageSpeed Insights)

## Frequently Asked Questions

**Do I need a custom domain?**
It helps, but it is not required. A Vercel or Netlify subdomain works fine when starting out. When you are ready, a ${CB}.dev${CB} or ${CB}.com${CB} domain costs about $10-15 per year.

**How often should I update my portfolio?**
Update it whenever you finish a significant project or learn a new skill. At minimum, review it every 3-6 months and remove outdated content.

**Should I include freelance or personal projects?**
Absolutely. Personal projects show initiative and passion. Some of the most impressive portfolios feature side projects rather than work projects (which often cannot be shown publicly).

**What if I do not have many projects?**
Build two to three projects specifically for your portfolio. Clone a popular app (like a Trello board or a weather app), but add your own twist to it. Hiring managers appreciate seeing how you approach a known problem.`,
    coverImage: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&h=630&fit=crop",
    categoryId: 2,
    metaTitle: "How to Build a Portfolio Website 2026: Complete Developer Guide",
    metaDescription: "Step-by-step guide to building a developer portfolio website. Covers Next.js setup, design, projects, SEO, and deployment on Vercel.",
    keywords: "portfolio website, developer portfolio, how to build portfolio, web developer portfolio 2026, portfolio guide, next.js portfolio",
  },
];

async function main() {
  console.log("Seeding Batch 5 posts...\n");

  for (const post of posts) {
    const words = post.content.split(/\s+/).length;
    const readingTime = `${Math.max(1, Math.ceil(words / 200))} min read`;

    const result = await sql`
      INSERT INTO posts (title, slug, excerpt, content, cover_image, category_id, published, meta_title, meta_description, keywords, reading_time)
      VALUES (${post.title}, ${post.slug}, ${post.excerpt}, ${post.content}, ${post.coverImage}, ${post.categoryId}, true, ${post.metaTitle}, ${post.metaDescription}, ${post.keywords}, ${readingTime})
      RETURNING id, title
    `;
    console.log(`  ✅ ID ${result[0].id}: "${result[0].title}" (${words} words, ${readingTime})`);
  }

  console.log("\nBatch 5 complete!");
}

main().catch(console.error);
