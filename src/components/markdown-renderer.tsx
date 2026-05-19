"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import Image from "next/image";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      aria-label="Copy code"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="blog-content prose prose-lg max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        children={content}
        components={{
          h2: ({ children, id, ...props }) => (
            <h2 id={id} className="group flex items-center gap-2 text-2xl font-extrabold tracking-tight mt-12 mb-4 pt-6 border-t border-border/50 scroll-mt-20" {...props}>
              <span className="w-1 h-7 bg-primary rounded-full shrink-0" />
              {children}
            </h2>
          ),
          h3: ({ children, id, ...props }) => (
            <h3 id={id} className="text-xl font-bold tracking-tight mt-8 mb-3 scroll-mt-20" {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p className="text-base sm:text-[1.0625rem] leading-[1.85] text-foreground/90 mb-6" {...props}>
              {children}
            </p>
          ),
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") return null;
            return (
              <figure className="my-10">
                <div className="relative rounded-xl overflow-hidden ring-1 ring-border shadow-md">
                  <Image
                    src={src}
                    alt={alt || ""}
                    width={800}
                    height={450}
                    className="w-full h-auto object-cover"
                    sizes="(max-width: 768px) 100vw, 800px"
                  />
                </div>
                {alt && alt !== "" && (
                  <figcaption className="text-center text-sm text-muted-foreground mt-3 italic">
                    {alt}
                  </figcaption>
                )}
              </figure>
            );
          },
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="text-primary font-medium underline underline-offset-[3px] decoration-primary/30 hover:decoration-primary transition-all inline-flex items-center gap-0.5"
                {...props}
              >
                {children}
                {isExternal && <ExternalLink size={12} className="shrink-0 ml-0.5" />}
              </a>
            );
          },
          blockquote: ({ children, ...props }) => (
            <blockquote className="relative my-8 pl-6 py-4 pr-4 border-l-4 border-primary bg-primary/5 rounded-r-xl italic text-muted-foreground not-italic" {...props}>
              <span className="absolute top-3 left-3 text-4xl text-primary/20 font-serif leading-none">&ldquo;</span>
              {children}
            </blockquote>
          ),
          pre: ({ children, ...props }) => {
            let code = "";
            try {
              const codeEl = children as React.ReactElement<{ children?: string }>;
              if (typeof codeEl?.props?.children === "string") {
                code = codeEl.props.children;
              }
            } catch { /* ignore */ }
            return (
              <div className="group relative my-8 rounded-xl overflow-hidden ring-1 ring-border bg-[#0d1117] dark:bg-[#0d1117]">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-white/5">
                  <span className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </span>
                  <span className="text-xs text-slate-500 ml-2">Code</span>
                </div>
                <CopyButton code={code} />
                <pre className="!bg-transparent !border-0 !ring-0 !rounded-none !m-0 p-4 overflow-x-auto text-sm leading-relaxed text-slate-300" {...props}>
                  {children}
                </pre>
              </div>
            );
          },
          code: ({ children, className, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded-md bg-muted text-primary font-mono text-[0.85em] font-medium" {...props}>
                  {children}
                </code>
              );
            }
            return <code className={className} {...props}>{children}</code>;
          },
          ul: ({ children, ...props }) => (
            <ul className="my-6 space-y-2.5 list-none pl-0" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-6 space-y-2.5 pl-0 counter-reset-list" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="flex items-start gap-3 text-base sm:text-[1.0625rem] leading-[1.75]" {...props}>
              <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          table: ({ children, ...props }) => (
            <div className="my-8 overflow-x-auto rounded-xl ring-1 ring-border">
              <table className="w-full text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-3 text-left font-bold bg-muted text-foreground text-sm" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-3 border-t border-border text-sm" {...props}>
              {children}
            </td>
          ),
          hr: () => (
            <div className="my-12 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
            </div>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-foreground" {...props}>{children}</strong>
          ),
        }}
      />
    </div>
  );
}

export function TableOfContents({ content }: { content: string }) {
  const headings = content.match(/^#{2,3}\s+.+$/gm) || [];
  if (headings.length < 3) return null;

  const items = headings.map((h) => {
    const level = h.match(/^(#{2,3})/)?.[0].length || 2;
    const text = h.replace(/^#{2,3}\s+/, "").replace(/\*\*/g, "");
    const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    return { level, text, id };
  });

  return (
    <nav className="my-10 p-6 rounded-2xl bg-muted/50 ring-1 ring-border">
      <p className="text-sm font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-primary rounded-full" />
        Table of Contents
      </p>
      <ol className="space-y-1.5 text-sm">
        {items.map((item, i) => (
          <li key={i} className={item.level === 3 ? "pl-5" : ""}>
            <a
              href={`#${item.id}`}
              className="text-muted-foreground hover:text-primary transition-colors leading-relaxed inline-block py-0.5"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
