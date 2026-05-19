import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Robots-Tag",
          value: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
      ],
    },
  ],
};

export default nextConfig;
