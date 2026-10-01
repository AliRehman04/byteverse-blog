// Known renamed blog slugs. Story migrations reuse these targets so an old
// indexed story can reach the final article without an unnecessary extra hop.
export const blogSlugRedirects: ReadonlyArray<readonly [string, string]> = [
  ["how-to-learn-programming-2026-complete-guide", "how-to-learn-programming-2026-beginner-roadmap"],
  ["10-best-ai-marketing-tools-in-2026-tested-for-real-campaigns", "best-ai-marketing-tools-2026"],
  ["90-day-blog-content-plan-new-websites-2026", "90-day-blog-content-plan-for-new-websites-in-2026"],
  ["best-ai-photo-editors-2026", "9-best-ai-photo-editors-in-2026-free-and-paid"],
  ["best-ai-social-media-tools-2026", "9-best-ai-social-media-tools-in-2026-tested"],
  ["blog-post-ideas-new-bloggers-2026", "50-blog-post-ideas-for-new-bloggers-in-2026"],
  ["blog-seo-checklist-before-publishing-2026", "blog-seo-checklist-before-publishing-in-2026"],
  ["build-topical-authority-new-blog-2026", "how-to-build-topical-authority-for-a-new-blog-in-2026"],
  ["google-search-console-new-blogs-2026", "google-search-console-for-new-blogs-2026-beginner-guide"],
];

const targets = new Map(blogSlugRedirects);

export function resolveBlogSlug(slug: string): string {
  return targets.get(slug) ?? slug;
}