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
  const cat = siteConfig.categories.find((c) => c.slug === slug);

  if (!cat) return { title: "Category Not Found" };

  return {
    title: `${cat.name} Articles`,
    description: cat.description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const catConfig = siteConfig.categories.find((c) => c.slug === slug);
  if (!catConfig) notFound();

  const catResult = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  const category = catResult[0];

  let categoryPosts: (typeof posts.$inferSelect)[] = [];
  if (category) {
    categoryPosts = await db
      .select()
      .from(posts)
      .where(and(eq(posts.categoryId, category.id), eq(posts.published, true)))
      .orderBy(desc(posts.createdAt));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Header */}
      <div className="mb-12 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: catConfig.color }}
          />
          <span
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: catConfig.color }}
          >
            Category
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          {catConfig.name}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          {catConfig.description}
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
