import type { Metadata } from "next";
import { FlexboxGeneratorTool } from "./flexbox-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "CSS Flexbox Generator",
  title: "CSS Flexbox Generator - Visual Layout Builder",
  description: "Build CSS Flexbox layouts visually. Set flex-direction, justify-content, align-items, gap, and wrap with live preview. Copy production-ready CSS instantly.",
  slug: "flexbox-generator",
  keywords: ["css flexbox generator", "flexbox playground", "flex layout builder", "css flex tool", "flexbox visual editor", "flexbox css generator online"],
  faqs: [
    { question: "What is CSS Flexbox?", answer: "CSS Flexbox (Flexible Box Layout) is a one-dimensional layout method for arranging items in rows or columns. It handles alignment, spacing, and distribution of items inside a container." },
    { question: "When should I use Flexbox vs CSS Grid?", answer: "Use Flexbox for one-dimensional layouts (a single row or column of items). Use CSS Grid for two-dimensional layouts (rows and columns together). Many layouts combine both." },
    { question: "What does justify-content do?", answer: "justify-content controls how items are distributed along the main axis (horizontal for row, vertical for column). Options include flex-start, center, space-between, and space-evenly." },
    { question: "What is the gap property?", answer: "The gap property sets spacing between flex items without adding margins. It works like column-gap and row-gap combined. Supported in all modern browsers since 2021." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function FlexboxGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">CSS Flexbox Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Build Flexbox layouts visually. Adjust direction, alignment, wrapping, and gap with a live preview, then copy the CSS.</p>
      </div>
      <FlexboxGeneratorTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This Tool</h2>
        <p>Click any property button to change the flex container behavior. The live preview updates instantly so you can see exactly how items arrange. Adjust the item count and gap to match your layout needs, then copy the generated CSS into your project.</p>
        <h2>Flexbox Cheat Sheet</h2>
        <ul>
          <li><strong>flex-direction</strong> — sets the main axis (row = horizontal, column = vertical)</li>
          <li><strong>justify-content</strong> — distributes items along the main axis</li>
          <li><strong>align-items</strong> — aligns items along the cross axis</li>
          <li><strong>flex-wrap</strong> — controls whether items wrap to new lines</li>
          <li><strong>gap</strong> — adds consistent spacing between items</li>
        </ul>
        <h2>Common Flexbox Patterns</h2>
        <p><strong>Center everything:</strong> Set justify-content and align-items both to center. This is the simplest way to center any element both horizontally and vertically.</p>
        <p><strong>Navigation bar:</strong> Use row direction with space-between to push logo left and links right.</p>
        <p><strong>Card grid:</strong> Use wrap with gap for responsive card layouts that flow naturally.</p>
        <p><strong>Sidebar layout:</strong> Use row direction where the sidebar has a fixed width and main content uses flex-grow.</p>
      </section>
      <section className="mt-12 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Frequently Asked Questions</h2>
        {toolConfig.faqs.map((faq, i) => (
          <div key={i}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
