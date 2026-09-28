import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { toolCatalog } from "@/lib/tool-catalog";

export const metadata: Metadata = {
  publisher: "ByteVerse",
  title: "Free Developer, Writing & SEO Tools",
  description:
    "Browse free JSON, CSS, writing, image and SEO utilities. No ByteVerse account required. See each tool for processing details and limitations.",
  keywords: [
    "developer tools",
    "free online tools",
    "SEO tools",
    "writing tools",
    "json formatter",
    "image compressor",
  ],
  alternates: { canonical: `${siteConfig.url}/tools` },
};

export default function ToolsPage() {
  const baseUrl = siteConfig.url.replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Developer, Writing & SEO Tools",
    description:
      "Browser utilities for developers, writers and SEO workflows, with processing details and limitations on each tool page.",
    url: `${baseUrl}/tools`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: toolCatalog.length,
      itemListElement: toolCatalog.map((tool, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: tool.name,
        url: `${baseUrl}/tools/${tool.slug}`,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Free Developer, Writing &amp; SEO Tools
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          {toolCatalog.length} utilities for coding, content and everyday web tasks.
          No ByteVerse account required.
        </p>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm mt-3 leading-relaxed">
          Many operations process inputs in your browser. Optional AI features send
          the text you submit to our server and an AI provider;
          website discovery and URL checks also use server requests.
          Speech voices and embedded previews can use external services.
          Review each tool&apos;s limitations and avoid entering confidential data.
          See our <Link href="/privacy" className="text-primary underline">
            privacy policy
          </Link> for site-wide data practices.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {toolCatalog.map((tool) => (
          <Link key={tool.slug} href={`/tools/${tool.slug}`} className="group p-6 bg-card border border-border rounded-xl card-hover">
            <div className={`inline-flex p-3 rounded-lg mb-4 ${tool.bg}`}>
              <tool.icon size={24} className={tool.color} />
            </div>
            <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{tool.name}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
