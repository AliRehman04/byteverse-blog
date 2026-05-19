import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { siteConfig } from "@/lib/config";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ali Rehman — Founder & Editor",
  description:
    "Ali Rehman is the founder and editor of ByteVerse. Tech enthusiast creating honest AI tool reviews, coding tutorials, and productivity guides.",
  openGraph: {
    title: "Ali Rehman — Founder & Editor | ByteVerse",
    description:
      "Tech enthusiast creating honest AI tool reviews, coding tutorials, and productivity guides at ByteVerse.",
    type: "profile",
  },
  alternates: {
    canonical: `${siteConfig.url}/author/ali-rehman`,
  },
};

export const revalidate = 60;

export default async function AuthorPage() {
  let authorPosts: { title: string; slug: string; excerpt: string | null; createdAt: Date }[] = [];

  if (db) {
    authorPosts = await db
      .select({
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.createdAt))
      .limit(20);
  }

  // Person schema
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Ali Rehman",
    url: `${siteConfig.url}/author/ali-rehman`,
    jobTitle: "Founder & Editor",
    worksFor: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    description:
      "Tech enthusiast and self-taught developer. Founder of ByteVerse — creating honest AI tool reviews, coding tutorials, and productivity guides.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />

      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-0 -left-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl animate-float-reverse" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <span className="text-4xl font-bold text-white">AR</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-blue-300 text-xs font-semibold mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Author
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                Ali Rehman
              </h1>
              <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed mb-4">
                Founder & Editor at ByteVerse. Tech enthusiast and self-taught developer 
                creating honest AI tool reviews, practical coding tutorials, and productivity 
                guides for students, freelancers, and tech enthusiasts.
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Mail size={14} />
                <a href={`mailto:${siteConfig.email}`} className="hover:text-white transition-colors">
                  {siteConfig.email}
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-[#f1f5f9] dark:fill-[#141416]" />
          </svg>
        </div>
      </section>

      {/* Published Articles */}
      <section className="section-alt border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h2 className="text-xl font-bold mb-6">Published Articles</h2>
          {authorPosts.length > 0 ? (
            <div className="space-y-4">
              {authorPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block p-5 rounded-2xl border border-border bg-card card-hover group"
                >
                  <h3 className="font-bold group-hover:text-primary transition-colors mb-1">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(post.createdAt)}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">Articles coming soon. Stay tuned!</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
