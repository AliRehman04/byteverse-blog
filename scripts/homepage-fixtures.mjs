export const previewCategories = [
  { id: 1, name: 'AI Tools', slug: 'ai-tools', color: '#8b5cf6', description: 'AI tools and practical workflows.' },
  { id: 2, name: 'Tech Guides', slug: 'tech-guides', color: '#3b82f6', description: 'Clear steps for everyday technology.' },
  { id: 3, name: 'Productivity', slug: 'productivity', color: '#10b981', description: 'Build a more useful workflow.' },
  { id: 4, name: 'Coding', slug: 'coding', color: '#f59e0b', description: 'Learn code through practical examples.' },
  { id: 5, name: 'Software Reviews', slug: 'software-reviews', color: '#ef4444', description: 'Compare features and limitations.' },
  { id: 6, name: 'Cybersecurity', slug: 'cybersecurity', color: '#06b6d4', description: 'Understand privacy and online safety.' },
];

export const previewPosts = [
  // Lead fixture uses the longest title/excerpt the editorial checks allow (70 / 300 chars) so the lead card is stress-tested.
  ['Why a Transparent PNG Turns Black When Saved as JPG: Causes and Fixes', 'JPEG has no alpha channel, so every transparent pixel has to become some colour and many tools pick black. Here is why that happens, how to choose a background before exporting, which settings keep edges clean, and when a different format is the better answer. Fictional preview text.', 2],
  ['Keep your spreadsheet’s special characters intact', 'A fictional guide to readable CSV exports and the details that matter.', 4],
  ['Get your coding assistant ready on Windows', 'A fictional setup guide used only to preview the homepage layout.', 1],
  ['Make everyday work a little less repetitive', 'A synthetic productivity preview for local responsive testing.', 3],
  ['Choose software with its limitations in view', 'A synthetic software preview for local testing, not a published review.', 5],
  ['Keep privacy decisions part of your workflow', 'A synthetic security preview that does not represent a published recommendation.', 6],
  ['Give your next website a better starting point', 'A fictional preview about turning an idea into a useful website.', 4],
  ['A practical way to compare AI assistants', 'Synthetic preview copy about capabilities, limitations and everyday uses.', 1],
  ['Make sense of the tools in your development workflow', 'A fictional guide for local homepage layout checks.', 2],
].map(([title, excerpt, categoryId], index) => ({
  id: 990000 + index, title, excerpt, categoryId, slug: `homepage-preview-${index + 1}`,
  content: 'Local preview fixture only.', coverImage: [
    '/blog/png-jpg-background/photo-cover.jpg', '/blog/csv-utf8/cover.png', '/blog/claude-code-windows/cover.png',
    '/blog/csv-excel/cover.png', '/blog/gemini-workspace/cover.png', '/blog/ollama-gpu/cover-v2.png',
    '/blog/how-to-build-website-with-ai-2026.webp', '/blog/gemini-workspace/cover.png', '/blog/claude-code-windows/cover.png',
  ][index],
  author: 'Preview fixture', published: true, featured: index === 0, scheduledAt: null,
  metaTitle: null, metaDescription: null, keywords: null, summary: null,
  readingTime: `${6 + index} min read`, views: 100 - index,
  createdAt: `2026-10-${String(17 - index).padStart(2, '0')}T09:00:00.000Z`,
  updatedAt: `2026-10-${String(17 - index).padStart(2, '0')}T09:00:00.000Z`,
}));

export const previewHomePosts = previewPosts.map(post => ({
  id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt,
  coverImage: post.coverImage, readingTime: post.readingTime, author: post.author, createdAt: post.createdAt,
  categoryName: previewCategories.find(category => category.id === post.categoryId).name,
  categorySlug: previewCategories.find(category => category.id === post.categoryId).slug,
}));