import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { Children, isValidElement } from "react";
import { ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { CodePlayground } from "@/components/code-playground";
import { getImageAcquireLicensePage, getImageCopyrightNotice, getImageCreator, getImageCreditText, getImageLicenseUrl } from "@/lib/image-seo";
import { siteConfig } from "@/lib/config";

// Allow safe HTML tags but block scripts, event handlers, etc.
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "figure", "figcaption", "summary", "details",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": ["className", "id", "style"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
  },
};

/* ── FAQ Accordion Converter ── */
function convertFaqsToAccordion(md: string): string {
  // Match "## Frequently Asked Questions" or "## FAQ" section
  const faqHeadingPattern = /^## (?:Frequently Asked Questions|FAQ)\s*$/im;
  const faqMatch = faqHeadingPattern.exec(md);
  if (!faqMatch) return md;

  const faqStart = faqMatch.index;
  const beforeFaq = md.slice(0, faqStart);
  const faqContent = md.slice(faqStart + faqMatch[0].length);

  // Find where FAQ section ends (next ## heading or end of content)
  const nextH2 = faqContent.search(/^## /m);
  const faqBody = nextH2 !== -1 ? faqContent.slice(0, nextH2) : faqContent;
  const afterFaq = nextH2 !== -1 ? faqContent.slice(nextH2) : "";

  // Try ### heading format first
  const h3Pairs = faqBody.split(/^### /m).filter((s) => s.trim());
  // Try **bold question** format: **Question?**\nAnswer
  const boldPattern = /\*\*(.+?\?)\*\*\s*\n+([\s\S]*?)(?=\n\*\*[^*]+\?\*\*|\s*$)/g;
  const boldPairs: { question: string; answer: string }[] = [];
  let bm;
  while ((bm = boldPattern.exec(faqBody)) !== null) {
    const q = bm[1].trim();
    const a = bm[2].trim();
    if (q && a) boldPairs.push({ question: q, answer: a });
  }

  const pairs = h3Pairs.length > 1 ? "h3" : boldPairs.length > 0 ? "bold" : null;
  if (!pairs) return md;

  let accordion = `<div class="faq-accordion">\n\n## Frequently Asked Questions\n\n`;

  if (pairs === "h3") {
    for (const pair of h3Pairs) {
      const newlineIdx = pair.indexOf("\n");
      if (newlineIdx === -1) continue;
      const question = pair.slice(0, newlineIdx).trim();
      const answer = pair.slice(newlineIdx + 1).trim();
      if (!question || !answer) continue;
      accordion += `<details class="faq-item">\n<summary>${question}</summary>\n\n${answer}\n\n</details>\n\n`;
    }
  } else {
    for (const { question, answer } of boldPairs) {
      accordion += `<details class="faq-item">\n<summary>${question}</summary>\n\n${answer}\n\n</details>\n\n`;
    }
  }

  accordion += `</div>\n\n`;

  return beforeFaq + accordion + afterFaq;
}

/* ── Auto Internal Linking ── */
const TOOL_LINKS: [RegExp, string][] = [
  [/\b(JSON formatter)\b/gi, "/tools/json-formatter"],
  [/\b(password generator)\b/gi, "/tools/password-generator"],
  [/\b(meta tag generator)\b/gi, "/tools/meta-tag-generator"],
  [/\b(Base64 encoder|Base64 decoder)\b/gi, "/tools/base64-encoder-decoder"],
  [/\b(word counter)\b/gi, "/tools/word-counter"],
  [/\b(regex tester)\b/gi, "/tools/regex-tester"],
  [/\b(JWT decoder)\b/gi, "/tools/jwt-decoder"],
  [/\b(hash generator)\b/gi, "/tools/hash-generator"],
  [/\b(UUID generator)\b/gi, "/tools/uuid-generator"],
  [/\b(diff checker)\b/gi, "/tools/diff-checker"],
  [/\b(OG preview)\b/gi, "/tools/og-preview"],
  [/\b(slug generator)\b/gi, "/tools/slug-generator"],
  [/\b(color converter)\b/gi, "/tools/color-converter"],
  [/\b(AI content detector)\b/gi, "/tools/ai-content-detector"],
  [/\b(AI prompt generator|prompt generator)\b/gi, "/tools/ai-prompt-generator"],
  [/\b(AI CV builder|AI resume builder|CV builder|resume builder)\b/gi, "/tools/ai-cv-builder"],
  [/\b(plagiarism checker)\b/gi, "/tools/plagiarism-checker"],
  [/\b(plagiarism remover)\b/gi, "/tools/plagiarism-remover"],
  [/\b(code formatter)\b/gi, "/tools/code-formatter"],
  [/\b(HTML editor)\b/gi, "/tools/html-editor"],
  [/\b(QR code generator)\b/gi, "/tools/qr-code-generator"],
  [/\b(text to speech)\b/gi, "/tools/text-to-speech"],
  [/\b(YouTube tag generator)\b/gi, "/tools/youtube-tag-generator"],
  [/\b(box shadow generator)\b/gi, "/tools/box-shadow-generator"],
  [/\b(CSS gradient generator)\b/gi, "/tools/css-gradient-generator"],
  [/\b(schema markup generator)\b/gi, "/tools/schema-markup-generator"],
  [/\b(JSON to CSV|JSON-to-CSV)\b/gi, "/tools/json-to-csv"],
  [/\b(lorem ipsum generator|lorem ipsum)\b/gi, "/tools/lorem-ipsum-generator"],
  [/\b(Markdown to HTML|markdown converter)\b/gi, "/tools/markdown-to-html"],
  [/\b(privacy policy generator)\b/gi, "/tools/privacy-policy-generator"],
];

export interface PostLink {
  title: string;
  slug: string;
}

/** Build regex links from DB post titles — matches 3+ word titles in content */
function buildPostLinks(postLinks: PostLink[], currentSlug?: string): [RegExp, string][] {
  return postLinks
    .filter((p) => p.slug !== currentSlug && p.title.split(/\s+/).length >= 3)
    .map((p) => {
      const escaped = p.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return [new RegExp(`\\b(${escaped})\\b`, "gi"), `/blog/${p.slug}`] as [RegExp, string];
    });
}

function injectInternalLinks(md: string, postLinks: PostLink[] = [], currentSlug?: string): string {
  const dynamicPostLinks = buildPostLinks(postLinks, currentSlug);
  // Tool links first (higher priority), then blog post links
  const allLinks: [RegExp, string][] = [...TOOL_LINKS, ...dynamicPostLinks];
  const linked = new Set<string>();
  // Don't link inside headings, existing links, code blocks, or image alts
  const protectedRanges: [number, number][] = [];
  const protectPatterns = [
    /^#{1,6}\s.+$/gm,             // headings
    /\[([^\]]+)\]\([^)]+\)/g,     // existing markdown links
    /`[^`]+`/g,                   // inline code
    /```[\s\S]*?```/g,            // code blocks
    /!\[([^\]]*)\]\([^)]+\)/g,    // images
  ];
  for (const pat of protectPatterns) {
    let m;
    while ((m = pat.exec(md)) !== null) {
      protectedRanges.push([m.index, m.index + m[0].length]);
    }
  }

  for (const [regex, url] of allLinks) {
    if (linked.has(url)) continue;
    const cloned = new RegExp(regex.source, regex.flags);
    md = md.replace(cloned, (match, _g1, offset) => {
      // Only link first occurrence
      if (linked.has(url)) return match;
      // Skip if inside protected range
      for (const [start, end] of protectedRanges) {
        if (offset >= start && offset < end) return match;
      }
      linked.add(url);
      return `[${match}](${url})`;
    });
  }
  return md;
}

function isExternalHref(href?: string): boolean {
  if (!href || href.startsWith("/") || href.startsWith("#")) return false;

  try {
    const linkUrl = new URL(href);
    if (linkUrl.protocol !== "http:" && linkUrl.protocol !== "https:") return false;

    const siteUrl = new URL(siteConfig.url);
    const normalizeHost = (host: string) => host.replace(/^www\./, "");

    return normalizeHost(linkUrl.hostname) !== normalizeHost(siteUrl.hostname);
  } catch {
    return false;
  }
}

interface MarkdownRendererProps {
  content: string;
  postLinks?: PostLink[];
  currentSlug?: string;
}

export function MarkdownRenderer({ content, postLinks = [], currentSlug }: MarkdownRendererProps) {
  const enrichedContent = injectInternalLinks(convertFaqsToAccordion(content), postLinks, currentSlug);
  let imageIndex = 0;
  return (
    <div className="blog-content prose prose-lg max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeSlug]}
        components={{
          h1: ({ children, id, ...props }) => (
            <h2 id={id} {...props}>{children}</h2>
          ),
          p: ({ children, ...props }) => {
            const childArray = Children.toArray(children);
            const hasOnlyImage = childArray.length === 1 && isValidElement(childArray[0]) && childArray[0].type === "figure";
            if (hasOnlyImage) return <>{children}</>;
            return <p {...props}>{children}</p>;
          },
          img: ({ src, alt, title }) => {
            if (!src || typeof src !== "string") return null;
            const imageAlt = alt || title || "ByteVerse article illustration";
            const imageCaption = title || alt;
            const imageCreator = getImageCreator(src);
            const isFirst = imageIndex === 0;
            imageIndex++;
            return (
              <figure className="my-10" itemScope itemType="https://schema.org/ImageObject">
                <div className="relative rounded-xl overflow-hidden ring-1 ring-border shadow-md">
                  <img
                    src={src}
                    alt={imageAlt}
                    title={imageCaption || imageAlt}
                    width={1200}
                    height={675}
                    loading={isFirst ? "eager" : "lazy"}
                    decoding={isFirst ? "sync" : "async"}
                    className="block w-full h-auto m-0! object-cover"
                    itemProp="contentUrl"
                  />
                </div>
                <meta itemProp="width" content="1200" />
                <meta itemProp="height" content="675" />
                <meta itemProp="description" content={imageAlt} />
                <span itemProp="creator" itemScope itemType="https://schema.org/Organization">
                  <meta itemProp="name" content={imageCreator.name} />
                  <link itemProp="url" href={imageCreator.url} />
                </span>
                <meta itemProp="creditText" content={getImageCreditText(src)} />
                <meta itemProp="copyrightNotice" content={getImageCopyrightNotice(src)} />
                <link itemProp="license" href={getImageLicenseUrl(src)} />
                <link itemProp="acquireLicensePage" href={getImageAcquireLicensePage(src)} />
                {imageCaption && imageCaption !== "" && (
                  <figcaption className="text-center text-sm text-muted-foreground mt-3 italic" itemProp="caption">
                    {imageCaption}
                  </figcaption>
                )}
              </figure>
            );
          },
          a: ({ href, children, ...props }) => {
            const isExternal = isExternalHref(href);
            if (!isExternal) return <a href={href} {...props}>{children}</a>;
            return (
              <a href={href} target="_blank" rel="noopener" className="ext-link" {...props}>
                {children}
                <ExternalLink size={12} className="shrink-0 ml-0.5 inline-block" />
              </a>
            );
          },
          pre: ({ children, ...props }) => {
            let code = "";
            let lang = "";
            try {
              const codeEl = children as React.ReactElement<{ children?: string; className?: string }>;
              if (typeof codeEl?.props?.children === "string") {
                code = codeEl.props.children;
              }
              if (codeEl?.props?.className) {
                const m = codeEl.props.className.match(/language-(\w+)/);
                if (m) lang = m[1];
              }
            } catch { /* ignore */ }

            const codeBlock = (
              <div className="group relative my-8 rounded-xl overflow-hidden ring-1 ring-border bg-[#0d1117]">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-white/5">
                  <span className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </span>
                  <span className="text-xs text-slate-500 ml-2">{lang || "Code"}</span>
                </div>
                <CopyButton code={code} />
                <pre className="bg-transparent! border-0! ring-0! rounded-none! m-0! p-4 overflow-x-auto text-sm leading-relaxed text-slate-300" {...props}>
                  {children}
                </pre>
              </div>
            );

            if (/^(javascript|js|typescript|ts|html)$/.test(lang) && code.length > 0) {
              return <CodePlayground code={code} language={lang}>{codeBlock}</CodePlayground>;
            }

            return codeBlock;
          },
          code: ({ children, className, ...props }) => {
            if (!className) {
              return <code className="px-1.5 py-0.5 rounded-md bg-muted text-primary font-mono text-[0.85em] font-medium" {...props}>{children}</code>;
            }
            return <code className={className} {...props}>{children}</code>;
          },
          table: ({ children, ...props }) => (
            <div className="table-wrap comparison-table"><table {...props}>{children}</table></div>
          ),
          td: ({ children, ...props }) => {
            const text = typeof children === "string" ? children.trim() : String(children ?? "").replace(/,/g, "").trim();
            const isCheck = /^(✓|✔|yes|included|unlimited)$/i.test(text);
            const isCross = /^(✗|✘|✕|no|none|limited|—|-)$/i.test(text);
            if (isCheck) return <td {...props} className="comparison-yes">✔ {text}</td>;
            if (isCross) return <td {...props} className="comparison-no">✗ {text}</td>;
            return <td {...props}>{children}</td>;
          },
        }}
      >
        {enrichedContent}
      </ReactMarkdown>
    </div>
  );
}

