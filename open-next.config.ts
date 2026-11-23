import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// ISR pages (revalidate = 6h/24h) are cached in R2 and refreshed in the background through a Durable Object queue.
// The site has no revalidateTag/revalidatePath calls, so no tag cache is needed.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
  // Serve cached ISR/SSG pages without loading the Next.js server (faster cold starts; the site does not use PPR).
  enableCacheInterception: true,
});
