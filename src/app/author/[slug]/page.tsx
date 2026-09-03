import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { authors, posts } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { siteConfig } from "@/lib/config";
import { formatDate } from "@/lib/utils";

export const revalidate = 86400;

type Props = {
  params: Promise<{ slug: string }>;
};

async function getAuthor(slug: string) {
  if (!db) return null;
  const [author] = await db
    .select()
    .from(authors)
    .where(eq(authors.slug, slug))
    .limit(1);
  return author || null;
}

function getAuthorSeoTitle(author: { name: string; role: string }) {
  const role = author.role.trim();
  const titleRole = role.toLowerCase() === "author" ? "Tech Articles & Developer Guides" : `${role} Articles & Guides`;
  return `${author.name} | ${titleRole}`;
}

function getAuthorSeoDescription(author: { name: string; role: string }) {
  return `Read ${author.name}'s ByteVerse articles on React, Next.js, JavaScript, backend APIs, AI tools, and practical web development guides.`;
}

export async function generateStaticParams() {
  if (!db) return [];

  const allAuthors = await db
    .select({ slug: authors.slug })
    .from(authors);

  return allAuthors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);

  if (!author) {
    return { title: "Author Not Found" };
  }

  const title = getAuthorSeoTitle(author);
  const description = getAuthorSeoDescription(author);

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ByteVerse`,
      description,
      type: "profile",
      ...(author.avatar && { images: [{ url: author.avatar }] }),
    },
    alternates: {
      canonical: `${siteConfig.url}/author/${slug}`,
    },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = await getAuthor(slug);

  if (!author) notFound();

  let authorPosts: {
    title: string;
    slug: string;
    excerpt: string | null;
    createdAt: Date;
  }[] = [];

  if (db) {
    authorPosts = await db
      .select({
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        createdAt: posts.createdAt,
      })
      .from(posts)
        .where(and(eq(posts.published, true), eq(posts.author, author.name)))
      .orderBy(desc(posts.createdAt))
      .limit(20);
  }

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url: `${siteConfig.url}/author/${slug}`,
    jobTitle: author.role,
    ...(author.bio && { description: author.bio }),
    ...(author.avatar && { image: author.avatar }),
    worksFor: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    ...(author.email && { email: author.email }),
    sameAs: [
      author.twitter,
      author.linkedin,
      author.github,
      author.youtube,
    ].filter(Boolean),
  };

  const socialLinks = [
    { url: author.twitter, icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, label: "Twitter" },
    { url: author.github, icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>, label: "GitHub" },
    { url: author.linkedin, icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>, label: "LinkedIn" },
    { url: author.youtube, icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, label: "YouTube" },
  ].filter((s) => s.url);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />

      {/* Header */}
      <section className="hero-bg relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up flex flex-col md:flex-row items-start gap-6">
            {author.avatar ? (
              <Image
                src={author.avatar}
                alt={`${author.name} - ${author.role} at ByteVerse`}
                title={`${author.name} - ${author.role}`}
                width={96}
                height={96}
                className="w-24 h-24 rounded-2xl object-cover border border-white/15 shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <span className="text-4xl font-bold text-white">
                  {author.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-blue-300 text-xs font-semibold mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Author
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                {author.name}
              </h1>
              {author.bio && (
                <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed mb-4">
                  {author.role} at ByteVerse. {author.bio}
                </p>
              )}
              <div className="flex items-center gap-4">
                {author.email && (
                  <a
                    href={`mailto:${author.email}`}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <Mail size={14} />
                    {author.email}
                  </a>
                )}
              </div>
              {socialLinks.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                      title={social.label}
                    >
                      <social.icon />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg
            className="relative block w-full h-10 md:h-16"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z"
              className="fill-[#f1f5f9] dark:fill-[#141416]"
            />
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
                    <ArrowRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                Articles coming soon. Stay tuned!
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
