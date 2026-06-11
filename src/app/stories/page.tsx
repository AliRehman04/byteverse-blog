import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { siteConfig } from "@/lib/config";
import { getPostDisplayImage } from "@/lib/image-seo";
import { BookOpen, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: `Web Stories | ${siteConfig.name}`,
  description: "Visual stories covering AI tools, coding tutorials, and tech guides. Swipe through quick insights from ByteVerse.",
  alternates: { canonical: `${siteConfig.url}/stories` },
};

export const revalidate = 3600;

export default async function StoriesPage() {
  if (!db) return <p>No stories available.</p>;

  const allPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      content: posts.content,
      categoryId: posts.categoryId,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt))
    .limit(50);

  const allCats = await db.select().from(categories);
  const catMap = new Map(allCats.map((c) => [c.id, c]));

  // Filter posts that have enough content for stories (at least 2 H2 sections)
  const storyPosts = allPosts.filter((p) => {
    const h2Count = (p.content.match(/^## /gm) || []).length;
    return h2Count >= 2;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/50 text-primary text-xs font-semibold mb-4">
          <BookOpen size={14} />
          Web Stories
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Visual <span className="gradient-text">Stories</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Quick, visual summaries of our best articles. Tap through key insights in seconds.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {storyPosts.map((post) => {
          const image = getPostDisplayImage(post);
          const cat = catMap.get(post.categoryId ?? 0);
          return (
            <Link
              key={post.id}
              href={`/stories/${post.slug}`}
              className="group relative aspect-[9/16] rounded-2xl overflow-hidden ring-1 ring-border hover:ring-primary/50 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              {image ? (
                <img
                  src={image}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {cat && (
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
                    style={{ backgroundColor: cat.color + "30", color: cat.color }}
                  >
                    {cat.name}
                  </span>
                )}
                <h2 className="text-sm font-bold text-white leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
              </div>
              {/* Story ring indicator */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center bg-black/30 group-hover:border-primary transition-colors">
                <ArrowRight size={12} className="text-white" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
