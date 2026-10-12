import { siteConfig } from "@/lib/config";

/** Presentation identity only. Keep the established tool URL and engine independent. */
export const imageStudioBrand = {
  name: "ImageFixer",
  publisher: siteConfig.name,
  description: "A private image studio, right in your browser.",
  siteUrl: siteConfig.url.replace(/\/+$/, ""),
  slug: "image-compressor",
  path: "/tools/image-compressor",
  links: {
    home: "/",
    tools: "/tools",
    blog: "/blog",
    about: "/about",
    contact: "/contact",
    privacy: "/privacy",
    terms: "/terms",
  },
} as const;