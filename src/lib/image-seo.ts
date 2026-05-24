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

export function getImageLicenseUrl(imageUrl: string) {
  if (imageUrl.startsWith(siteConfig.url)) return `${siteConfig.url}/terms`;
  if (imageUrl.includes("images.unsplash.com")) return "https://unsplash.com/license";
  if (imageUrl.includes("images.pexels.com")) return "https://www.pexels.com/license/";
  if (imageUrl.includes("pixabay.com")) return "https://pixabay.com/service/license-summary/";
  return `${siteConfig.url}/terms`;
}

export function getImageAcquireLicensePage(imageUrl: string) {
  if (imageUrl.includes("images.unsplash.com")) return "https://unsplash.com/license";
  if (imageUrl.includes("images.pexels.com")) return "https://www.pexels.com/license/";
  if (imageUrl.includes("pixabay.com")) return "https://pixabay.com/service/license-summary/";
  return `${siteConfig.url}/terms`;
}

export function getImageCreditText(imageUrl: string) {
  if (imageUrl.startsWith(siteConfig.url)) return `${siteConfig.name} original illustration`;
  if (imageUrl.includes("images.unsplash.com")) return "Royalty-free stock photo from Unsplash";
  if (imageUrl.includes("images.pexels.com")) return "Royalty-free stock photo from Pexels";
  if (imageUrl.includes("pixabay.com")) return "Royalty-free stock photo from Pixabay";
  return "Royalty-free stock photo";
}

export function toImageObjectSchema(image: SeoImage, representativeOfPage = false) {
  const isByteVerseAsset = image.url.startsWith(siteConfig.url);

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
    creator: isByteVerseAsset ? {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    } : undefined,
    copyrightHolder: isByteVerseAsset ? {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    } : undefined,
    copyrightNotice: isByteVerseAsset
      ? `Copyright ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.`
      : "Royalty-free stock photo used under the source platform license.",
    creditText: getImageCreditText(image.url),
    license: getImageLicenseUrl(image.url),
    acquireLicensePage: getImageAcquireLicensePage(image.url),
  };
}