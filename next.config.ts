import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
    minimumCacheTTL: 2678400, // 31 days — cache optimized images longer
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Robots-Tag",
          value: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://giscus.app https://pagead2.googlesyndication.com https://adservice.google.com https://translate.google.com https://*.googleapis.com https://*.gstatic.com",
            "style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com",
            "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://res.cloudinary.com https://www.google-analytics.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://www.google.com",
            "font-src 'self' https://*.gstatic.com https://*.googleapis.com",
            "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://*.googleapis.com https://translate.google.com https://*.gstatic.com",
            "frame-src 'self' https://giscus.app https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com https://translate.google.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
            "upgrade-insecure-requests",
          ].join("; "),
        },
      ],
    },
    {
      source: "/fonts/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/:path*.{ico,png,jpg,jpeg,svg,webp}",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=604800",
        },
      ],
    },
  ],
  redirects: async () => [
    {
      source: "/index.html",
      destination: "/",
      permanent: true,
    },
    {
      source: "/index.php",
      destination: "/",
      permanent: true,
    },
    {
      source: "/author/byteverse",
      destination: "/about",
      permanent: true,
    },
    {
      source: "/blog/how-to-learn-programming-2026-complete-guide",
      destination: "/blog/how-to-learn-programming-2026-beginner-roadmap",
      permanent: true,
    },
    {
      source: "/blog/10-best-ai-marketing-tools-in-2026-tested-for-real-campaigns",
      destination: "/blog/best-ai-marketing-tools-2026",
      permanent: true,
    },
    {
      source: "/blog/90-day-blog-content-plan-new-websites-2026",
      destination: "/blog/90-day-blog-content-plan-for-new-websites-in-2026",
      permanent: true,
    },
    {
      source: "/blog/best-ai-photo-editors-2026",
      destination: "/blog/9-best-ai-photo-editors-in-2026-free-and-paid",
      permanent: true,
    },
    {
      source: "/blog/best-ai-social-media-tools-2026",
      destination: "/blog/9-best-ai-social-media-tools-in-2026-tested",
      permanent: true,
    },
    {
      source: "/blog/blog-post-ideas-new-bloggers-2026",
      destination: "/blog/50-blog-post-ideas-for-new-bloggers-in-2026",
      permanent: true,
    },
    {
      source: "/blog/blog-seo-checklist-before-publishing-2026",
      destination: "/blog/blog-seo-checklist-before-publishing-in-2026",
      permanent: true,
    },
    {
      source: "/blog/build-topical-authority-new-blog-2026",
      destination: "/blog/how-to-build-topical-authority-for-a-new-blog-in-2026",
      permanent: true,
    },
    {
      source: "/blog/google-search-console-new-blogs-2026",
      destination: "/blog/google-search-console-for-new-blogs-2026-beginner-guide",
      permanent: true,
    },
  ],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "react-markdown",
      "remark-gfm",
      "rehype-raw",
      "rehype-slug",
    ],
  },
};

export default nextConfig;
