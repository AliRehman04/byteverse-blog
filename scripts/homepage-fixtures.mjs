export const previewCategories = [
  { id: 1, name: 'AI Tools', slug: 'ai-tools', color: '#8b5cf6', description: 'AI tools and practical workflows.' },
  { id: 2, name: 'Tech Guides', slug: 'tech-guides', color: '#3b82f6', description: 'Clear steps for everyday technology.' },
  { id: 3, name: 'Productivity', slug: 'productivity', color: '#10b981', description: 'Build a more useful workflow.' },
  { id: 4, name: 'Coding', slug: 'coding', color: '#f59e0b', description: 'Learn code through practical examples.' },
  { id: 5, name: 'Software Reviews', slug: 'software-reviews', color: '#ef4444', description: 'Compare features and limitations.' },
  { id: 6, name: 'Cybersecurity', slug: 'cybersecurity', color: '#06b6d4', description: 'Understand privacy and online safety.' },
];

export const previewPosts = [
  ['A clearer starting point for your next technology project', 'A fictional preview article with practical steps, careful examples and a useful next action. No live article is created.', 2],
  ['Working with JSON without losing the important details', 'A fictional developer guide used only to review the homepage layout and article ordering.', 4],
  ['Compare AI tools by the work you actually need to do', 'A synthetic comparison preview. Features, limits and use cases—not invented product rankings.', 1],
  ['Make everyday work a little less repetitive', 'A synthetic productivity preview for local responsive testing.', 3],
  ['Choose software with its limitations in view', 'A synthetic software preview for local testing, not a published review.', 5],
  ['Keep privacy decisions part of your workflow', 'A synthetic security preview that does not represent a published recommendation.', 6],
].map(([title, excerpt, categoryId], index) => ({
  id: 990000 + index, title, excerpt, categoryId, slug: `homepage-preview-${index + 1}`,
  content: 'Local preview fixture only.', coverImage: '/blog/png-jpg-background/cover.png',
  author: 'Preview fixture', published: true, featured: index === 0, scheduledAt: null,
  metaTitle: null, metaDescription: null, keywords: null, summary: null,
  readingTime: `${6 + index} min read`, views: 100 - index,
  createdAt: `2026-10-${String(17 - index).padStart(2, '0')}T09:00:00.000Z`,
  updatedAt: `2026-10-${String(17 - index).padStart(2, '0')}T09:00:00.000Z`,
}));

export const previewHomePosts = previewPosts.map(post => ({
  id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt,
  coverImage: post.coverImage, readingTime: post.readingTime, createdAt: post.createdAt,
  categoryName: previewCategories.find(category => category.id === post.categoryId).name,
  categorySlug: previewCategories.find(category => category.id === post.categoryId).slug,
}));