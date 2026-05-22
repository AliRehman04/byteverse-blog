import type { Metadata } from "next";

interface ToolSeoConfig {
  name: string;
  title: string;
  description: string;
  slug: string;
  keywords: string[];
  faqs?: { question: string; answer: string }[];
}

const BASE_URL = "https://www.byteverse.fyi";

export function generateToolMetadata(config: ToolSeoConfig): Metadata {
  const url = `${BASE_URL}/tools/${config.slug}`;
  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${config.title} | ByteVerse`,
      description: config.description,
      url,
      siteName: "ByteVerse",
      type: "website",
      images: [{ url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${config.title} | ByteVerse`,
      description: config.description,
      images: [`${BASE_URL}/opengraph-image`],
    },
  };
}

export function generateToolJsonLd(config: ToolSeoConfig): object[] {
  const url = `${BASE_URL}/tools/${config.slug}`;
  const schemas: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: config.name,
      url,
      description: config.description,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      browserRequirements: "Requires a modern web browser",
      provider: {
        "@type": "Organization",
        name: "ByteVerse",
        url: BASE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Tools", item: `${BASE_URL}/tools` },
        { "@type": "ListItem", position: 3, name: config.name, item: url },
      ],
    },
  ];

  if (config.faqs && config.faqs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return schemas;
}

export function ToolJsonLd({ config }: { config: ToolSeoConfig }) {
  const schemas = generateToolJsonLd(config);
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
