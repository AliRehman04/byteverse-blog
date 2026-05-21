export const siteConfig = {
  name: "ByteVerse",
  description:
    "No-fluff guides on AI tools, coding, and productivity. We test everything before we write about it.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.byteverse.fyi",
  ogImage: "/opengraph-image",
  author: "ByteVerse Team",
  email: "contact@byteverse.fyi",
  nav: [
    { title: "Home", href: "/" },
    { title: "Blog", href: "/blog" },
    { title: "Categories", href: "/categories" },
    { title: "About", href: "/about" },
    { title: "Contact", href: "/contact" },
  ],
  categories: [
    {
      name: "AI Tools",
      slug: "ai-tools",
      description: "Hands-on reviews of ChatGPT alternatives, image generators, writing assistants, and automation tools we actually use",
      color: "#8b5cf6",
    },
    {
      name: "Tech Guides",
      slug: "tech-guides",
      description: "Practical walkthroughs for cloud hosting, dev tools, APIs, and frameworks. Written so you can follow along",
      color: "#3b82f6",
    },
    {
      name: "Productivity",
      slug: "productivity",
      description: "Apps, setups, and workflows that save real time. Notion, Obsidian, Todoist, and more",
      color: "#10b981",
    },
    {
      name: "Coding",
      slug: "coding",
      description: "JavaScript, Python, React, Next.js tutorials. Real projects and code you can copy, run, and learn from",
      color: "#f59e0b",
    },
    {
      name: "Software Reviews",
      slug: "software-reviews",
      description: "Side-by-side comparisons of popular tools so you can pick what actually fits your workflow",
      color: "#ef4444",
    },
  ],
};
