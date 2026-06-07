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
const SITE_LOGO_WIDTH = 500;
const SITE_LOGO_HEIGHT = 500;

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

function getComparableImageUrl(src: string | null | undefined) {
  const absoluteUrl = getAbsoluteImageUrl(src);
  if (!absoluteUrl) return null;

  try {
    const url = new URL(absoluteUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return absoluteUrl.split("?")[0];
  }
}

export function isSameImageUrl(a: string | null | undefined, b: string | null | undefined) {
  const first = getComparableImageUrl(a);
  const second = getComparableImageUrl(b);
  return Boolean(first && second && first === second);
}

export function getPostDisplayImage(post: { coverImage: string | null; content?: string | null; title?: string }) {
  if (post.coverImage) return post.coverImage;
  const [firstMarkdownImage] = extractMarkdownImages(post.content || "", post.title || "ByteVerse article image");
  return firstMarkdownImage?.url || null;
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
    if (!images.some((item) => isSameImageUrl(item.url, image.url))) {
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

export function getImageCopyrightNotice(imageUrl: string) {
  if (imageUrl.startsWith(siteConfig.url)) {
    return `Copyright ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.`;
  }
  return "Royalty-free stock photo used under the source platform license.";
}

export function getImageCreator(imageUrl: string) {
  if (imageUrl.startsWith(siteConfig.url)) {
    return {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    };
  }
  if (imageUrl.includes("images.unsplash.com")) {
    return {
      "@type": "Organization",
      name: "Unsplash contributors",
      url: "https://unsplash.com/",
    };
  }
  if (imageUrl.includes("images.pexels.com")) {
    return {
      "@type": "Organization",
      name: "Pexels creators",
      url: "https://www.pexels.com/",
    };
  }
  if (imageUrl.includes("pixabay.com")) {
    return {
      "@type": "Organization",
      name: "Pixabay contributors",
      url: "https://pixabay.com/",
    };
  }
  return {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export function toImageObjectSchema(image: SeoImage, representativeOfPage = false) {
  const isByteVerseAsset = image.url.startsWith(siteConfig.url);
  const creator = getImageCreator(image.url);

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
    creator,
    copyrightHolder: isByteVerseAsset ? {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    } : undefined,
    copyrightNotice: getImageCopyrightNotice(image.url),
    creditText: getImageCreditText(image.url),
    license: getImageLicenseUrl(image.url),
    acquireLicensePage: getImageAcquireLicensePage(image.url),
  };
}

export function getSiteLogoImageSchema() {
  return toImageObjectSchema({
    url: `${siteConfig.url}/logo.png`,
    alt: `${siteConfig.name} logo`,
    caption: `${siteConfig.name} logo`,
    width: SITE_LOGO_WIDTH,
    height: SITE_LOGO_HEIGHT,
  });
}