import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen, Cpu, TrendingUp, Zap } from "lucide-react";
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
    description: "In-depth reviews of the latest AI tools to supercharge your workflow.",
    color: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: BookOpen,
    title: "Step-by-Step Guides",
    description: "Easy-to-follow tutorials on trending tech topics and frameworks.",
    color: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Cpu,
    title: "Coding Tutorials",
    description: "Learn modern programming with practical, real-world examples.",
    color: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: TrendingUp,
    title: "Productivity Hacks",
    description: "Tips and strategies to 10x your productivity with the right tools.",
    color: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
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
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute inset-0 dot-grid opacity-40" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6">
              <Zap size={12} />
              Your Tech Knowledge Hub
            </div>

            <h1 className="animate-fade-in-up stagger-1 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Explore the Future
              <br />
              <span className="gradient-text">of Technology</span>
            </h1>

            <p className="animate-fade-in-up stagger-2 text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover AI tools, master new technologies, and boost your
              productivity with expert guides, tutorials, and honest reviews.
            </p>

            <div className="animate-fade-in-up stagger-3 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/blog"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all duration-200 btn-shimmer"
              >
                Start Reading <ArrowRight size={16} />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 border border-border rounded-xl text-sm font-semibold hover:bg-muted hover:border-muted-foreground/20 transition-all duration-200"
              >
                Browse Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-alt border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Everything You Need, <span className="gradient-text">One Place</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From cutting-edge AI tools to practical coding tutorials.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`animate-fade-in-up stagger-${i + 1} group p-6 rounded-2xl border border-border bg-card card-hover`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon size={20} className={feature.iconColor} />
                </div>
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Posts */}
      {latestPosts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Fresh Content</p>
              <h2 className="text-3xl font-bold tracking-tight">
                Latest <span className="gradient-text">Articles</span>
              </h2>
            </div>
            <Link
              href="/blog"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-300"
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
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              View All Articles <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="section-alt border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Topics</p>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Explore <span className="gradient-text">Categories</span>
            </h2>
            <p className="text-muted-foreground">Find exactly what you&apos;re looking for</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cats.map((cat, i) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className={`animate-fade-in-up stagger-${(i % 6) + 1} group p-6 rounded-2xl border border-border bg-card card-hover`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: cat.color + "15" }}
                  >
                    <div
                      className="w-4 h-4 rounded-md group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                  <h3 className="font-bold group-hover:text-primary transition-colors duration-200">
                    {cat.name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {cat.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Explore <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
        <Newsletter />
      </section>
    </>
  );
}
