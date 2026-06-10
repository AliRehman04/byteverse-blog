import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { GridPostCard } from "@/components/post-card";
import { siteConfig } from "@/lib/config";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

function getCategorySeoDescription(categoryName: string) {
  return `Explore ${categoryName.toLowerCase()} articles on ByteVerse, including practical tutorials, tools, tips, reviews, and step-by-step guides for tech readers.`;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  let cat: { name: string; description: string | null; slug: string; id?: number } | null = null;
  let hasContent = false;

  if (db) {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    cat = result[0] || null;

    if (cat && cat.id) {
      const postCount = await db.select({ count: count() }).from(posts).where(and(eq(posts.categoryId, cat.id), eq(posts.published, true)));
      hasContent = (postCount[0]?.count ?? 0) > 0;
    }
  }

  if (!cat) {
    cat = siteConfig.categories.find((c) => c.slug === slug) || null;
  }

  if (!cat) return { title: "Category Not Found" };

  return {
    title: `${cat.name} Articles | Guides, Tips & Tutorials`,
    description: getCategorySeoDescription(cat.name),
    openGraph: {
      title: `${cat.name} Articles | Guides, Tips & Tutorials | ByteVerse`,
      description: getCategorySeoDescription(cat.name),
      type: "website",
    },
    alternates: {
      canonical: `${siteConfig.url}/category/${slug}`,
    },
    ...(hasContent ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  let category = null;
  let catDisplay: { name: string; description: string; color: string } | null = null;
  let categoryPosts: (typeof posts.$inferSelect)[] = [];

  if (db) {
    const catResult = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    category = catResult[0] || null;

    if (category) {
      catDisplay = {
        name: category.name,
        description: category.description || "",
        color: category.color,
      };

      categoryPosts = await db
        .select()
        .from(posts)
        .where(and(eq(posts.categoryId, category.id), eq(posts.published, true)))
        .orderBy(desc(posts.createdAt));
    }
  }

  if (!catDisplay) {
    const configCat = siteConfig.categories.find((c) => c.slug === slug);
    if (!configCat) notFound();
    catDisplay = configCat;
  }

  return (
    <>
      {/* Page Header */}
      <section className="hero-bg relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10"
                style={{ backgroundColor: catDisplay.color + "25" }}
              >
                <div
                  className="w-4 h-4 rounded-md"
                  style={{ backgroundColor: catDisplay.color }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Category
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              {catDisplay.name}
            </h1>
            <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed">
              {catDisplay.description}. Browse {categoryPosts.length} expert-written articles with hands-on reviews, step-by-step tutorials, and practical tips you can use right away.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
          </svg>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {categoryPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryPosts.map((post, i) => (
              <GridPostCard key={post.id} post={post} category={category} priority={i < 3} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">📂</span>
            </div>
            <h2 className="text-xl font-bold mb-2">No articles yet</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;re preparing great content for this category. Stay tuned!
            </p>
          </div>
        )}
      </div>
    </>
  );
}
