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
    title: `${cat.name} Articles — Guides, Tips & Tutorials | ByteVerse`,
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Header */}
      <div className="mb-12 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: catDisplay.color }}
          />
          <span
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: catDisplay.color }}
          >
            Category
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          {catDisplay.name}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          {catDisplay.description}
        </p>
      </div>

      {/* Posts */}
      {categoryPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryPosts.map((post) => (
            <PostCard key={post.id} post={post} category={category} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">📂</p>
          <h2 className="text-2xl font-bold mb-2">No articles yet</h2>
          <p className="text-muted-foreground">
            We&apos;re preparing great content for this category. Stay tuned!
          </p>
        </div>
      )}
    </div>
  );
}
