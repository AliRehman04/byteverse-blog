import type { HomepagePost } from "./homepage";

export const BLOG_PAGE_SIZE = 30;
const MAX_PAGE = 5000;

export interface BlogPopularPost {
  id: number;
  title: string;
  slug: string;
  readingTime: string | null;
  createdAt: Date;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  color: string;
  count: number;
}

export interface BlogIndex {
  posts: HomepagePost[];
  popular: BlogPopularPost[];
  categories: BlogCategory[];
  total: number;
  page: number;
  totalPages: number;
}

export const emptyBlogIndex = (page: number): BlogIndex => ({ posts: [], popular: [], categories: [], total: 0, page, totalPages: 0 });

export function parseBlogPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{1,5}$/.test(raw)) return 1;
  return Math.min(Math.max(Number.parseInt(raw, 10), 1), MAX_PAGE);
}

export function blogPath(page: number) {
  return page <= 1 ? "/blog" : `/blog?page=${page}`;
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function blogPageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = [...new Set([1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total))].sort((a, b) => a - b);
  return pages.flatMap((page, index) => (index > 0 && page - pages[index - 1] > 1 ? ["gap" as const, page] : [page]));
}

// Category colours come from the database; only a plain hex value may reach a style attribute.
export function safeCategoryColor(color: string | null | undefined, fallback: string) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function getBlogMeta(page: number) {
  const first = page <= 1;
  return {
    title: first ? "Blog: AI, Coding & Tech Guides | ByteVerse" : `Blog articles, page ${page} | ByteVerse`,
    description: first
      ? "Browse ByteVerse guides on AI tools, coding, software troubleshooting, productivity and online security. New practical articles added regularly."
      : `Page ${page} of the ByteVerse blog archive: AI tool guides, coding tutorials, software troubleshooting and productivity articles.`,
  };
}

export function getBlogStructuredData(siteUrl: string, index: BlogIndex) {
  const base = siteUrl.replace(/\/+$/, "");
  const url = `${base}${blogPath(index.page)}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: getBlogMeta(index.page).title,
    description: getBlogMeta(index.page).description,
    url,
    inLanguage: "en",
    isPartOf: { "@id": `${base}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: index.total,
      itemListElement: index.posts.slice(0, 10).map((post, position) => ({
        "@type": "ListItem",
        position: position + 1 + (index.page - 1) * BLOG_PAGE_SIZE,
        url: `${base}/blog/${encodeURIComponent(post.slug)}`,
        name: post.title,
      })),
    },
  };
}
