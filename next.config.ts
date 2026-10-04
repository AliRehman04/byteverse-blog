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
