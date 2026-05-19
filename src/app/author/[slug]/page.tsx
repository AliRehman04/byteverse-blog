import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Mail, Github, Linkedin, Youtube } from "lucide-react";
import { db } from "@/lib/db";
import { authors, posts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { siteConfig } from "@/lib/config";
import { formatDate } from "@/lib/utils";

export const revalidate = 60;

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);

  if (!author) {
    return { title: "Author Not Found" };
  }

  return {
    title: `${author.name} — ${author.role}`,
    description:
      author.bio ||
      `${author.name} is a ${author.role} at ByteVerse. Read their articles on AI, coding, and technology.`,
    openGraph: {
      title: `${author.name} — ${author.role} | ByteVerse`,
      description:
        author.bio ||
        `${author.name} is a ${author.role} at ByteVerse.`,
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
      .where(eq(posts.published, true))
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
    { url: author.github, icon: Github, label: "GitHub" },
    { url: author.linkedin, icon: Linkedin, label: "LinkedIn" },
    { url: author.youtube, icon: Youtube, label: "YouTube" },
  ].filter((s) => s.url);

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
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up flex flex-col md:flex-row items-start gap-6">
            {author.avatar ? (
              <Image
                src={author.avatar}
                alt={author.name}
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
