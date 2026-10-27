import type { NextConfig } from "next";
import { blogSlugRedirects } from "./src/lib/blog-redirects";

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
      {
        protocol: "https",
        hostname: "www.byteverse.fyi",
      },
      {
        protocol: "https",
        hostname: "byteverse.fyi",
      },
    ],
    minimumCacheTTL: 2678400, // 31 days — cache optimized images longer
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
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
      // Story handlers decide robots by status: do not overwrite their 404
      // noindex response or attach an index directive to a temporary outage.
      source: "/:path((?!stories(?:/|$)).*)",
      headers: [
        {
          key: "X-Robots-Tag",
          value: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
      ],
    },
    {
      source: "/api/ai-plagiarism-check",
      headers: [
        { key: "X-Robots-Tag", value: "noindex" },
        { key: "Cache-Control", value: "no-store" },
      ],
    },
    {
      source: "/api/(admin|auth)/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        { key: "Pragma", value: "no-cache" },
      ],
    },
    {
      source: "/blog",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=21600, stale-while-revalidate=86400",
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
    {
      source: "/tools/image-compressor",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'; upgrade-insecure-requests" },
      ],
    },
    {
      source: "/tools/csv-diff",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'; upgrade-insecure-requests" },
      ],
    },
    {
      source: "/image-studio/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; img-src blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'" },
      ],
    },
    {
      source: "/image-studio-sw.js",
      headers: [
        // Permit the two explicit registrations: the page and its codec worker
        // directory. The studio never registers a root-scoped worker.
        { key: "Service-Worker-Allowed", value: "/" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "X-Robots-Tag", value: "noindex" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'" },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "X-Robots-Tag", value: "noindex" },
      ],
    },
    {
      source: "/invoice-workspace/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        { key: "Cache-Control", value: "no-store" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Content-Security-Policy", value: "sandbox allow-scripts allow-downloads; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; worker-src blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'" },
      ],
    },
  ],
  redirects: async () => [
    // Keep indexed story URLs reachable while consolidating on the full articles.
    // Individual stories use a published-post check in their route handler.
    {
      source: "/stories",
      destination: "/blog",
      permanent: true,
    },
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
    // Some AI crawlers probe the alternate llms.txt location.
    {
      source: "/.well-known/llms.txt",
      destination: "/llms.txt",
      permanent: true,
    },
    // Archive pagination moved from a dynamic query string to static ISR paths.
    {
      source: "/blog",
      has: [{ type: "query", key: "page", value: "(?<page>[2-9]|[1-9]\\d{1,3})" }],
      destination: "/blog/page/:page",
      permanent: true,
    },
    {
      source: "/blog/page/1",
      destination: "/blog",
      permanent: true,
    },
    ...blogSlugRedirects.map(([source, destination]) => ({
      source: `/blog/${source}`,
      destination: `/blog/${destination}`,
      permanent: true,
    })),
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
