import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Monitor, Lightbulb, Code2, Star, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { eq, count, sql as sqlFn } from "drizzle-orm";
import { siteConfig } from "@/lib/config";

const categoryIcons: Record<string, React.ElementType> = {
  "ai-tools": Bot,
  "tech-guides": Monitor,
  "productivity": Lightbulb,
  "coding": Code2,
  "software-reviews": Star,
  "cybersecurity": ShieldCheck,
};

export const metadata: Metadata = {
  title: "Browse All Categories | AI Tools, Tech Guides & More",
  description:
    "Explore all ByteVerse content categories including AI tools, step-by-step tech guides, productivity tips, coding tutorials, and honest software reviews.",
  openGraph: {
    title: "Browse All Categories | AI Tools, Tech Guides & More | ByteVerse",
    description:
      "Explore all ByteVerse content categories including AI tools, tech guides, productivity tips, coding tutorials, and software reviews.",
    url: `${siteConfig.url}/categories`,
    type: "website",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "ByteVerse Categories" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse All Categories | AI Tools, Tech Guides & More",
    description:
      "Explore all ByteVerse content categories including AI tools, step-by-step tech guides, productivity tips, coding tutorials, and honest software reviews.",
    images: [siteConfig.ogImage],
  },
  alternates: {
    canonical: `${siteConfig.url}/categories`,
  },
};

export default async function CategoriesPage() {
  const dbCategories = db
    ? await db.select().from(categories).orderBy(categories.name)
    : null;

  // Get post count per category
  const postCounts: Record<number, number> = {};
  if (db) {
    const counts = await db
      .select({ categoryId: posts.categoryId, total: count() })
      .from(posts)
      .where(eq(posts.published, true))
      .groupBy(posts.categoryId);
    for (const c of counts) {
      if (c.categoryId) postCounts[c.categoryId] = c.total;
    }
  }

  const cats = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        color: c.color,
        postCount: postCounts[c.id] || 0,
      }))
    : siteConfig.categories.map((c) => ({ ...c, id: 0, postCount: 0 }));

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Browse All Categories",
    description: "Explore all ByteVerse content categories including AI tools, tech guides, productivity tips, coding tutorials, and software reviews.",
    url: `${siteConfig.url}/categories`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cats.length,
      itemListElement: cats.map((cat, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: cat.name,
        url: `${siteConfig.url}/category/${cat.slug}`,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      {/* Page Header */}
      <section className="hero-bg relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-blue-300 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Topics
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              Browse Categories
            </h1>
            <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed">
              Find articles organized by topic. Click any category to explore in-depth guides, tutorials, and reviews.
              We cover AI tools, coding languages, cybersecurity best practices, productivity workflows, software comparisons, and tech setup guides — all written by experienced developers and tech enthusiasts.
            </p>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
          </svg>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cats.map((cat, i) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className={`animate-fade-in-up stagger-${(i % 6) + 1} group relative p-6 rounded-2xl border border-border bg-card card-hover overflow-hidden`}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 w-full h-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, ${cat.color}, ${cat.color}80)` }}
              />

              <div className="flex items-start justify-between gap-3 mb-3 mt-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300"
                    style={{ backgroundColor: cat.color + "15" }}
                  >
                    {(() => {
                      const Icon = categoryIcons[cat.slug];
                      return Icon ? (
                        <Icon className="w-5 h-5" style={{ color: cat.color }} />
                      ) : (
                        <div
                          className="w-4.5 h-4.5 rounded-md"
                          style={{ backgroundColor: cat.color }}
                        />
                      );
                    })()}
                  </div>
                  <h2 className="font-bold text-lg group-hover:text-primary transition-colors duration-200">
                    {cat.name}
                  </h2>
                </div>
                <ArrowRight
                  size={16}
                  className="text-muted-foreground -translate-x-2 group-hover:text-primary group-hover:translate-x-0 transition-all duration-300 mt-1 shrink-0"
                />
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {cat.description}
              </p>
              {cat.postCount > 0 && (
                <p className="text-xs font-medium text-primary mt-3">
                  {cat.postCount} {cat.postCount === 1 ? "article" : "articles"}
                </p>
              )}

              {/* Hover glow */}
              <div
                className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-500"
                style={{ backgroundColor: cat.color }}
              />
            </Link>
          ))}
        </div>

        {/* SEO content */}
        <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
          <h2>Explore ByteVerse Topics</h2>
          <p>ByteVerse organizes its content into focused categories so you can find exactly what you need. Whether you are looking for in-depth AI tool comparisons, step-by-step coding tutorials, productivity workflows, cybersecurity best practices, or honest software reviews, each category offers curated articles written by experienced developers and tech enthusiasts.</p>
          <h2>What You Will Find in Each Category</h2>
          <ul>
            <li><strong>AI Tools</strong> — Reviews and comparisons of the latest artificial intelligence platforms, from AI code editors and writing assistants to image generators and chatbots.</li>
            <li><strong>Tech Guides</strong> — Practical how-to guides covering everything from setting up development environments to troubleshooting common tech problems.</li>
            <li><strong>Productivity</strong> — Tips, tools, and strategies to work smarter, automate repetitive tasks, and manage your time more effectively.</li>
            <li><strong>Coding</strong> — Tutorials, best practices, and project walkthroughs for web development, Python, JavaScript, and more.</li>
            <li><strong>Software Reviews</strong> — Honest, tested reviews of developer tools, SaaS platforms, browser extensions, and desktop applications.</li>
            <li><strong>Cybersecurity</strong> — Guides on staying safe online, protecting your data, understanding threats, and using security tools effectively.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
