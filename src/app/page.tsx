import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen, Cpu, TrendingUp, Zap, Star } from "lucide-react";
import { Newsletter } from "@/components/newsletter";
import { siteConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PostCard } from "@/components/post-card";

const features = [
  {
    icon: Sparkles,
    title: "AI Tool Reviews",
    description: "Curated reviews of the latest AI tools that actually matter for your work.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: BookOpen,
    title: "Step-by-Step Guides",
    description: "Crystal-clear tutorials that turn complex topics into simple steps.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Cpu,
    title: "Coding Tutorials",
    description: "Real-world code examples and projects you can build today.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: TrendingUp,
    title: "Productivity Hacks",
    description: "Proven strategies and tools to 10x your daily output.",
    gradient: "from-emerald-500 to-teal-500",
  },
];

export default async function HomePage() {
  const dbCategories = db
    ? await db.select().from(categories).orderBy(categories.name)
    : null;

  const cats = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c) => ({
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        color: c.color,
      }))
    : siteConfig.categories;

  // Get latest posts
  let latestPosts: (typeof posts.$inferSelect)[] = [];
  let allCategories: (typeof categories.$inferSelect)[] = [];
  if (db) {
    latestPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.createdAt))
      .limit(6);
    allCategories = await db.select().from(categories);
  }
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Animated background orbs */}
        <div className="orb w-96 h-96 bg-violet-500/20 top-0 -left-48" />
        <div className="orb w-80 h-80 bg-pink-500/15 bottom-20 -right-40" style={{ animationDelay: "-7s" }} />
        <div className="orb w-64 h-64 bg-blue-500/10 top-1/2 left-1/3" style={{ animationDelay: "-14s" }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="animate-fade-in inline-flex items-center gap-2 px-5 py-2 rounded-full glass border border-primary/20 text-primary text-sm font-semibold mb-8">
              <Zap size={14} className="animate-pulse" />
              Your Daily Dose of Tech
              <ArrowRight size={14} />
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in-up text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[0.9]">
              Explore the
              <br />
              <span className="gradient-text">Future of Tech</span>
            </h1>

            {/* Sub text */}
            <p className="animate-fade-in-up stagger-2 text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover AI tools, master new technologies, and boost your
              productivity with expert guides, tutorials, and honest reviews.
            </p>

            {/* CTA Buttons */}
            <div className="animate-fade-in-up stagger-3 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/blog"
                className="group inline-flex items-center gap-2 px-8 py-4 gradient-bg text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-all duration-300 glow-sm"
              >
                Start Reading
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 px-8 py-4 glass rounded-2xl text-sm font-bold hover:bg-muted/80 transition-all duration-300"
              >
                Browse Categories
              </Link>
            </div>

            {/* Stats */}
            <div className="animate-fade-in-up stagger-4 mt-16 flex flex-wrap justify-center gap-8 md:gap-16">
              {[
                { label: "Articles", value: "50+" },
                { label: "Categories", value: `${cats.length}` },
                { label: "Monthly Readers", value: "10K+" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-black gradient-text-subtle">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center mb-16">
          <div className="tag glass text-primary mx-auto mb-4 w-fit">
            <Star size={12} />
            Why ByteVerse
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Everything You Need, <span className="gradient-text">One Place</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From cutting-edge AI to practical coding — we cover what matters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative p-7 rounded-3xl glass hover-lift animate-fade-in-up stagger-${i + 1}`}
            >
              <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon size={22} className="text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Posts */}
      {latestPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="tag glass text-primary mb-4 w-fit">
                <Sparkles size={12} />
                Fresh Content
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Latest <span className="gradient-text">Articles</span>
              </h2>
            </div>
            <Link
              href="/blog"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestPosts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                category={categoryMap.get(post.categoryId ?? 0)}
                featured={i === 0}
              />
            ))}
          </div>

          <div className="sm:hidden mt-8 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 gradient-bg text-white rounded-xl text-sm font-semibold"
            >
              View All Articles <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="tag glass text-primary mx-auto mb-4 w-fit">
            <BookOpen size={12} />
            Topics
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Explore <span className="gradient-text">Categories</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Dive deep into the topics that interest you most
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cats.map((cat, i) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className={`group relative p-6 rounded-3xl glass hover-lift animate-fade-in-up stagger-${(i % 5) + 1}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: cat.color + "20" }}
                >
                  <div
                    className="w-5 h-5 rounded-lg group-hover:scale-125 transition-transform duration-300"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {cat.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Explore <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <Newsletter />
      </section>
    </>
  );
}
