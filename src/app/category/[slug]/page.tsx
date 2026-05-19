import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { PostCard } from "@/components/post-card";
import { siteConfig } from "@/lib/config";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  // Try DB first
  let cat: { name: string; description: string | null; slug: string } | null = null;
  if (db) {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    cat = result[0] || null;
  }

  if (!cat) {
    cat = siteConfig.categories.find((c) => c.slug === slug) || null;
  }

  if (!cat) return { title: "Category Not Found" };

  return {
    title: `${cat.name} Articles — Guides, Tips & Tutorials`,
    description: cat.description
      ? `${cat.description}. Browse all ${cat.name.toLowerCase()} articles, tutorials, and in-depth guides on ByteVerse.`
      : `Explore the best ${cat.name.toLowerCase()} articles, tutorials, tips, and in-depth guides on ByteVerse.`,
    alternates: {
      canonical: `${siteConfig.url}/category/${slug}`,
    },
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
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: catDisplay.color + "15" }}
              >
                <div
                  className="w-4 h-4 rounded-md"
                  style={{ backgroundColor: catDisplay.color }}
                />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Category
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              {catDisplay.name}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {catDisplay.description}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {categoryPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryPosts.map((post) => (
              <PostCard key={post.id} post={post} category={category} />
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
