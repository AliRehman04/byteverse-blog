import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogIndexMetadata, BlogIndex } from "../../blog-index";
import { BLOG_PAGE_SIZE, parseArchiveSegment } from "@/lib/blog";
import { getBlogIndex, getPublishedPostCount } from "@/lib/blog-data";

type Params = Promise<{ page: string }>;

// Archive pages are prebuilt from the published count and revalidate like the first page.
export const revalidate = 21600;

export async function generateStaticParams() {
  const total = await getPublishedPostCount();
  const pages = Math.ceil(total / BLOG_PAGE_SIZE);
  return Array.from({ length: Math.max(pages - 1, 0) }, (_, index) => ({ page: String(index + 2) }));
}

// notFound() here runs before the response starts streaming (the blog loading boundary would otherwise
// lock in a 200), so invalid and past-the-end pages return a real 404 status.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = parseArchiveSegment((await params).page);
  if (!page) notFound();
  const index = await getBlogIndex(page);
  if (index.posts.length === 0) notFound();
  return blogIndexMetadata(page);
}

export default async function BlogArchivePage({ params }: { params: Params }) {
  const page = parseArchiveSegment((await params).page);
  if (!page) notFound();
  return <BlogIndex page={page} />;
}
