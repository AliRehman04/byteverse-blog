export const siteConfig = {
  name: "ByteVerse",
  description:
    "Discover the latest in AI tools, tech guides, productivity hacks, and coding tutorials. Your one-stop destination for everything tech.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.byteverse.fyi",
  ogImage: "/opengraph-image",
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
      description: "Discover the best AI tools, ChatGPT alternatives, AI image generators, and smart automation tools to supercharge your workflow",
      color: "#8b5cf6",
    },
    {
      name: "Tech Guides",
      slug: "tech-guides",
      description: "Step-by-step technology tutorials covering cloud hosting, web development frameworks, and essential developer tools",
      color: "#3b82f6",
    },
    {
      name: "Productivity",
      slug: "productivity",
      description: "Boost your efficiency with the best productivity apps, time management tips, workflow hacks, and Notion templates",
      color: "#10b981",
    },
    {
      name: "Coding",
      slug: "coding",
      description: "Programming tutorials, web development guides, JavaScript tips, Python projects, and developer tools for beginners and pros",
      color: "#f59e0b",
    },
    {
      name: "Software Reviews",
      slug: "software-reviews",
      description: "Honest, hands-on software comparisons and reviews to help you pick the right tools for development, design, and productivity",
      color: "#ef4444",
    },
  ],
};
