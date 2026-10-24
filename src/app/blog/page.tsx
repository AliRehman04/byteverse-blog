import { blogIndexMetadata, BlogIndex } from "./blog-index";

// Static ISR page: no request-time inputs, so bots and crawlers are served from cache.
export const revalidate = 21600;
export const metadata = blogIndexMetadata(1);

export default function BlogPage() {
  return <BlogIndex page={1} />;
}
