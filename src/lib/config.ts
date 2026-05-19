export const siteConfig = {
  name: "ByteVerse",
  description:
    "Discover the latest in AI tools, tech guides, productivity hacks, and coding tutorials. Your one-stop destination for everything tech.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.byteverse.fyi",
  ogImage: "/og-image.png",
  author: "ByteVerse Team",
  email: "alirehmanytlearning@gmail.com",
  nav: [
    { title: "Home", href: "/" },
    { title: "Blog", href: "/blog" },
    { title: "Categories", href: "/categories" },
    { title: "About", href: "/about" },
  ],
  categories: [
    {
      name: "AI Tools",
      slug: "ai-tools",
      description: "Reviews and guides for the latest AI tools",
      color: "#8b5cf6",
    },
    {
      name: "Tech Guides",
      slug: "tech-guides",
      description: "Step-by-step technology tutorials",
      color: "#3b82f6",
    },
    {
      name: "Productivity",
      slug: "productivity",
      description: "Tips and tools to boost your workflow",
      color: "#10b981",
    },
    {
      name: "Coding",
      slug: "coding",
      description: "Programming tutorials and best practices",
      color: "#f59e0b",
    },
    {
      name: "Software Reviews",
      slug: "software-reviews",
      description: "Honest reviews of popular software",
      color: "#ef4444",
    },
  ],
};
