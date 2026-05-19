import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Browse All Categories — AI Tools, Tech Guides & More",
  description:
    "Explore all ByteVerse content categories including AI tools, step-by-step tech guides, productivity tips, coding tutorials, and honest software reviews.",
  alternates: {
    canonical: `${siteConfig.url}/categories`,
  },
};

export default async function CategoriesPage() {
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

  return (
    <>
      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Topics</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Browse <span className="gradient-text">Categories</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Find articles organized by topic. Click any category to explore.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
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
                <h2 className="font-bold group-hover:text-primary transition-colors duration-200">
                  {cat.name}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
