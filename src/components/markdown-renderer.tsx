"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import Image from "next/image";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-img:rounded-xl prose-img:shadow-lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        children={content}
        components={{
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") return null;
            return (
              <span className="block my-8">
                <Image
                  src={src}
                  alt={alt || ""}
                  width={800}
                  height={450}
                  className="rounded-xl shadow-lg w-full h-auto"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </span>
            );
          },
          a: ({ href, children, ...props }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined} {...props}>
              {children}
            </a>
          ),
        }}
      />
    </div>
  );
}
