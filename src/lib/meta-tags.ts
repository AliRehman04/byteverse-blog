import type { Metadata } from "next";
import { escapeTitleHtml, graphemes, normalizeTitle } from "./seo-title";

export const META_IMPORT_LIMIT = 100_000;
export const META_IMAGE_LIMIT = 8 * 1024 * 1024;
export const ROBOTS_MODES = ["default", "index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"] as const;
export type RobotsMode = typeof ROBOTS_MODES[number];

export interface MetaDraft {
  title: string;
  description: string;
  canonical: string;
  siteName: string;
  author: string;
  keywords: string;
  includeDefaults: boolean;
  includeOpenGraph: boolean;
  includeTwitter: boolean;
  ogType: "website" | "article";
  ogTitle: string;
  ogDescription: string;
  image: string;
  imageAlt: string;
  imageWidth: string;
  imageHeight: string;
  locale: string;
  publishedTime: string;
  modifiedTime: string;
  twitterCard: "summary_large_image" | "summary";
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterImageAlt: string;
  twitterSite: string;
  twitterCreator: string;
  robots: RobotsMode;
  noSnippet: boolean;
  maxSnippet: string;
  maxImagePreview: "" | "none" | "standard" | "large";
}

export type MetaTextField = { [K in keyof MetaDraft]: MetaDraft[K] extends string ? K : never }[keyof MetaDraft];
export interface MetaIssue { field: keyof MetaDraft; message: string }

export const EMPTY_META_DRAFT: MetaDraft = {
  title: "", description: "", canonical: "", siteName: "", author: "", keywords: "",
  includeDefaults: false, includeOpenGraph: true, includeTwitter: true,
  ogType: "website", ogTitle: "", ogDescription: "", image: "", imageAlt: "",
  imageWidth: "", imageHeight: "", locale: "", publishedTime: "", modifiedTime: "",
  twitterCard: "summary_large_image", twitterTitle: "", twitterDescription: "",
  twitterImage: "", twitterImageAlt: "", twitterSite: "", twitterCreator: "",
  robots: "default", noSnippet: false, maxSnippet: "", maxImagePreview: "",
};

export function metaFieldLimit(field: MetaTextField): number {
  if (["canonical", "image", "twitterImage"].includes(field)) return 2048;
  if (["description", "ogDescription", "twitterDescription", "imageAlt", "twitterImageAlt", "keywords"].includes(field)) return 1000;
  return 300;
}

export function parseMetaUrl(value: string, canonical = false): { url: string; error?: string } {
  const text = value.trim();
  if (!text) return { url: "" };
  if (text.length > 2048) return { url: "", error: "Keep the URL under 2,049 characters." };
  if (!/^https?:\/\//i.test(text) || /[\s<>"\\]/u.test(text) || /%[\da-f]{0,1}(?![\da-f])/i.test(text)) {
    return { url: "", error: "Use a full http(s) URL, without spaces or malformed percent escapes." };
  }
  try {
    const parsed = new URL(text);
    if (!parsed.hostname || parsed.username || parsed.password) return { url: "", error: "Do not include a username or password in a public URL." };
    if (canonical && parsed.hash) return { url: "", error: "Remove the #fragment from the canonical URL." };
    return { url: parsed.href };
  } catch {
    return { url: "", error: "Enter a valid absolute http(s) URL." };
  }
}

export function isMetaDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  return date.getUTCFullYear() === +match[1] && date.getUTCMonth() + 1 === +match[2] && date.getUTCDate() === +match[3];
}

export function buildMetaOutput(draft: MetaDraft) {
  const clean = { ...draft };
  const errors: MetaIssue[] = [];
  const warnings: MetaIssue[] = [];
  const addError = (field: keyof MetaDraft, message: string) => errors.push({ field, message });
  const warn = (field: keyof MetaDraft, message: string) => warnings.push({ field, message });
  for (const field of Object.keys(EMPTY_META_DRAFT) as (keyof MetaDraft)[]) {
    if (typeof clean[field] === "string") {
      const key = field as MetaTextField;
      clean[key] = normalizeTitle(draft[key]) as never;
      if (clean[key].length > metaFieldLimit(key)) addError(key, `This field exceeds the ${metaFieldLimit(key)}-character input limit.`);
    }
  }
  function readUrl(field: "canonical" | "image" | "twitterImage", active: boolean) {
    if (!active) return "";
    const result = parseMetaUrl(draft[field], field === "canonical");
    if (result.error) addError(field, result.error);
    if (result.url.startsWith("http:")) warn(field, "This uses HTTP. Prefer HTTPS when the public resource supports it.");
    return result.url;
  }
  const canonical = readUrl("canonical", true);
  const usesSharedImage = clean.includeOpenGraph || (clean.includeTwitter && !clean.twitterImage);
  const image = readUrl("image", usesSharedImage);
  const twitterImage = clean.twitterImage ? readUrl("twitterImage", clean.includeTwitter) : image;
  if (!ROBOTS_MODES.includes(clean.robots)) { addError("robots", "Choose a supported robots setting."); clean.robots = "default"; }
  if (!["website", "article"].includes(clean.ogType)) { addError("ogType", "Choose website or article."); clean.ogType = "website"; }
  if (!["summary", "summary_large_image"].includes(clean.twitterCard)) { addError("twitterCard", "Choose a supported X card type."); clean.twitterCard = "summary_large_image"; }
  if (!["", "none", "standard", "large"].includes(clean.maxImagePreview)) { addError("maxImagePreview", "Choose a supported image preview directive."); clean.maxImagePreview = ""; }

  const og = { title: clean.ogTitle || clean.title, description: clean.ogDescription || clean.description, image, alt: clean.imageAlt };
  const twitter = {
    title: clean.twitterTitle || og.title, description: clean.twitterDescription || og.description,
    image: twitterImage, alt: clean.twitterImageAlt || (!clean.twitterImage || twitterImage === image ? clean.imageAlt : ""),
  };
  const widths: Record<"imageWidth" | "imageHeight", number | undefined> = { imageWidth: undefined, imageHeight: undefined };
  if (clean.includeOpenGraph && image) {
    for (const field of ["imageWidth", "imageHeight"] as const) {
      if (!clean[field]) continue;
      if (!/^\d+$/.test(clean[field]) || +clean[field] < 1 || +clean[field] > 100_000) addError(field, "Use a whole-number image dimension between 1 and 100,000 pixels.");
      else widths[field] = +clean[field];
    }
  }
  let locale = clean.locale;
  if (clean.includeOpenGraph && locale && !/^[a-z]{2,3}_[A-Z]{2}$/.test(locale)) { addError("locale", "Use language_TERRITORY, for example en_US or ur_PK."); locale = ""; }
  const dates: { publishedTime?: string; modifiedTime?: string } = {};
  if (clean.includeOpenGraph && clean.ogType === "article") {
    for (const field of ["publishedTime", "modifiedTime"] as const) {
      if (!clean[field]) continue;
      if (!isMetaDate(clean[field])) addError(field, "Use a real ISO date (2026-09-28) or a time with its timezone (2026-09-28T09:00:00Z).");
      else dates[field] = clean[field];
    }
    if (dates.publishedTime && dates.modifiedTime && Date.parse(dates.modifiedTime) < Date.parse(dates.publishedTime)) warn("modifiedTime", "The modified date is earlier than the published date. Check these dates.");
  }
  const handles: { twitterSite?: string; twitterCreator?: string } = {};
  if (clean.includeTwitter) {
    for (const field of ["twitterSite", "twitterCreator"] as const) {
      if (!clean[field]) continue;
      if (!/^@?[a-z0-9_]{1,15}$/i.test(clean[field])) addError(field, "Use an X username (up to 15 letters, digits or underscores), not a profile URL.");
      else handles[field] = `@${clean[field].replace(/^@/, "")}`;
    }
  }
  const directives: string[] = clean.robots === "default" ? [] : clean.robots.split(", ");
  if (clean.noSnippet) directives.push("nosnippet");
  if (clean.maxSnippet && !clean.noSnippet) {
    if (!/^(?:-1|\d+)$/.test(clean.maxSnippet) || +clean.maxSnippet > 100_000) addError("maxSnippet", "Use -1 (no limit) or a whole number from 0 to 100,000.");
    else directives.push(`max-snippet:${+clean.maxSnippet}`);
  }
  if (clean.maxImagePreview) directives.push(`max-image-preview:${clean.maxImagePreview}`);
  const robots = directives.join(", ");
  if (!clean.title) warn("title", "Add a page title to begin. A blank title is not exported.");
  if (!clean.description) warn("description", "Add a specific description. Blank descriptions are omitted, not auto-written.");
  if (!canonical) warn("canonical", "Add the preferred public page URL for the canonical and og:url tags.");
  if (canonical && new URL(canonical).search) warn("canonical", "The canonical contains a query string. Keep it only if it identifies the preferred page; tracking parameters are usually not needed.");
  if (clean.includeOpenGraph && !image) warn("image", "Open Graph's core properties include og:image. Add an absolute image URL for a complete share object.");
  if (usesSharedImage && image && !clean.imageAlt) warn("imageAlt", "Describe the social image with alt text; avoid repeating the headline unless it is part of the image.");
  if (clean.includeTwitter && !twitter.image) warn("twitterImage", "Add a social image URL for the X card. No image file is uploaded by this generator.");
  if (clean.includeTwitter && twitter.image && !twitter.alt) warn("twitterImageAlt", "Add alt text for the X image.");
  if (clean.robots.includes("noindex")) warn("robots", "NOINDEX selected: crawlers that can read this directive should omit the page from search. This is not access protection.");
  if (clean.noSnippet || clean.maxSnippet === "0") warn("noSnippet", "Text snippets are disabled. The search mockup below is not an indexing or snippet-permission test.");
  if (clean.maxImagePreview === "none") warn("maxImagePreview", "Search image previews are disabled. Social-card image tags do not override this search directive.");
  if (clean.keywords) warn("keywords", "Google ignores meta keywords for web ranking. Include this legacy field only for a specific other consumer.");

  const groups: { label: string; lines: string[] }[] = [];
  const primary: string[] = [];
  const esc = escapeTitleHtml;
  const tag = (attribute: "name" | "property", name: string, value?: string | number) => value !== undefined && value !== ""
    ? `<meta ${attribute}="${name}" content="${esc(String(value))}">` : "";
  if (clean.includeDefaults) primary.push('<meta charset="UTF-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">');
  if (clean.title) primary.push(`<title>${esc(clean.title)}</title>`);
  primary.push(tag("name", "description", clean.description), tag("name", "author", clean.author), tag("name", "keywords", clean.keywords), tag("name", "robots", robots));
  if (canonical) primary.push(`<link rel="canonical" href="${esc(canonical)}">`);
  groups.push({ label: "Page metadata", lines: primary.filter(Boolean) });
  if (clean.includeOpenGraph) groups.push({ label: "Open Graph", lines: [
    tag("property", "og:type", clean.ogType), tag("property", "og:title", og.title), tag("property", "og:description", og.description),
    tag("property", "og:url", canonical), tag("property", "og:site_name", clean.siteName), tag("property", "og:locale", locale),
    tag("property", "og:image", image), ...(image ? [tag("property", "og:image:alt", og.alt), tag("property", "og:image:width", widths.imageWidth), tag("property", "og:image:height", widths.imageHeight)] : []),
    tag("property", "article:published_time", dates.publishedTime), tag("property", "article:modified_time", dates.modifiedTime),
  ].filter(Boolean) });
  if (clean.includeTwitter) groups.push({ label: "X / Twitter Card", lines: [
    tag("name", "twitter:card", clean.twitterCard), tag("name", "twitter:title", twitter.title), tag("name", "twitter:description", twitter.description),
    tag("name", "twitter:image", twitter.image), ...(twitter.image ? [tag("name", "twitter:image:alt", twitter.alt)] : []),
    tag("name", "twitter:site", handles.twitterSite), tag("name", "twitter:creator", handles.twitterCreator),
  ].filter(Boolean) });

  const sharedOg = {
    ...(og.title ? { title: { absolute: og.title } } : {}), ...(og.description ? { description: og.description } : {}),
    ...(canonical ? { url: canonical } : {}), ...(clean.siteName ? { siteName: clean.siteName } : {}), ...(locale ? { locale } : {}),
    ...(image ? { images: [{ url: image, ...(og.alt ? { alt: og.alt } : {}), ...(widths.imageWidth ? { width: widths.imageWidth } : {}), ...(widths.imageHeight ? { height: widths.imageHeight } : {}) }] } : {}),
  };
  const metadata: Metadata = {
    ...(clean.title ? { title: { absolute: clean.title } } : {}), description: clean.description || null,
    alternates: { canonical: canonical || null }, robots: robots || null,
    authors: clean.author ? [{ name: clean.author }] : null,
    keywords: clean.keywords || null,
    openGraph: clean.includeOpenGraph ? (clean.ogType === "article" ? { ...sharedOg, type: "article", ...dates } : { ...sharedOg, type: "website" }) : null,
    twitter: clean.includeTwitter ? {
      card: clean.twitterCard, ...(twitter.title ? { title: { absolute: twitter.title } } : {}),
      ...(twitter.description ? { description: twitter.description } : {}),
      ...(twitter.image ? { images: [{ url: twitter.image, ...(twitter.alt ? { alt: twitter.alt } : {}) }] } : {}),
      ...(handles.twitterSite ? { site: handles.twitterSite } : {}), ...(handles.twitterCreator ? { creator: handles.twitterCreator } : {}),
    } : null,
  };
  const json = JSON.stringify(metadata, null, 2).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return {
    clean, canonical, og, twitter, robots, errors, warnings,
    characters: { title: graphemes(clean.title).length, description: graphemes(clean.description).length },
    html: groups.filter(group => group.lines.length).map(group => `<!-- ${group.label} -->\n${group.lines.join("\n")}`).join("\n\n"),
    next: `import type { Metadata } from "next";\n\nexport const metadata: Metadata = ${json};\n`,
    metadata, tagCount: groups.reduce((total, group) => total + group.lines.length, 0),
    canExport: Boolean(clean.title) && errors.length === 0,
  };
}

export const META_EXAMPLES: { label: string; draft: MetaDraft }[] = [
  { label: "Website", draft: { ...EMPTY_META_DRAFT, title: "North Studio — Thoughtful Web Design", description: "Explore accessible websites, recent projects and the design process at North Studio. Find the right approach for your next website.", canonical: "https://example.com/", siteName: "North Studio", image: "https://example.com/social/studio.jpg", imageAlt: "North Studio's website projects on a desktop and phone", imageWidth: "1200", imageHeight: "630" } },
  { label: "Article", draft: { ...EMPTY_META_DRAFT, title: "How to Plan an Accessible Website", description: "A practical guide to navigation, readable content, keyboard access and testing. Build accessibility into your next website from the start.", canonical: "https://example.com/guides/accessible-websites", siteName: "North Studio", author: "Alex Morgan", ogType: "article", image: "https://example.com/social/accessibility.jpg", imageAlt: "A keyboard beside a website accessibility checklist", imageWidth: "1200", imageHeight: "630", locale: "en_US" } },
  { label: "Product", draft: { ...EMPTY_META_DRAFT, title: "Canvas Tote with Zip & Inside Pocket", description: "Explore the canvas tote's dimensions, materials and available colors. A zip closure and inside pocket keep everyday items organized.", canonical: "https://example.com/shop/canvas-tote", siteName: "North Studio", image: "https://example.com/social/tote.jpg", imageAlt: "A natural canvas tote with zip closure and inside pocket", imageWidth: "1200", imageHeight: "630" } },
];