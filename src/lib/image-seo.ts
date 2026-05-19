import { siteConfig } from "@/lib/config";

export type SeoImage = {
  url: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 675;

export function getAbsoluteImageUrl(src: string | null | undefined) {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${siteConfig.url}${src.startsWith("/") ? src : `/${src}`}`;
}

function cleanImageText(value: string | null | undefined, fallback: string) {
  const clean = value?.replace(/\s+/g, " ").trim();
  return clean || fallback;
}

export function extractMarkdownImages(content: string, fallbackAlt: string): SeoImage[] {
  const images: SeoImage[] = [];
  const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    const url = getAbsoluteImageUrl(match[2]);
    if (!url) continue;

    const alt = cleanImageText(match[1], fallbackAlt);
    const caption = cleanImageText(match[3], alt);

    images.push({
      url,
      alt,
      caption,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    });
  }

  return images;
}

export function getPostSeoImages({
  title,
  coverImage,
  content,
}: {
  title: string;
  coverImage: string | null;
  content: string;
}) {
  const images: SeoImage[] = [];
  const coverUrl = getAbsoluteImageUrl(coverImage);

  if (coverUrl) {
    images.push({
      url: coverUrl,
      alt: `${title} cover image`,
      caption: `${title} visual summary`,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    });
  }

  for (const image of extractMarkdownImages(content, title)) {
    if (!images.some((item) => item.url === image.url)) {
      images.push(image);
    }
  }

  return images;
}

export function toImageObjectSchema(image: SeoImage, representativeOfPage = false) {
  return {
    "@type": "ImageObject",
    url: image.url,
    contentUrl: image.url,
    caption: image.caption,
    description: image.alt,
    width: image.width,
    height: image.height,
    inLanguage: "en-US",
    representativeOfPage,
    creator: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    copyrightHolder: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    copyrightNotice: `Copyright ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.`,
    creditText: `${siteConfig.name} original illustration`,
  };
}