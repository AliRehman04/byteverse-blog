import type { Metadata } from "next";
import { LoremIpsumTool } from "./lorem-ipsum-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Lorem Ipsum Generator",
  title: "Lorem Ipsum Generator - Free Placeholder Text",
  description: "Generate lorem ipsum placeholder text for your designs and layouts. Choose paragraphs, sentences, or words with customizable count and HTML wrapping.",
  slug: "lorem-ipsum-generator",
  keywords: ["lorem ipsum generator", "placeholder text", "dummy text generator", "lorem ipsum", "filler text", "lipsum generator"],
  faqs: [
    { question: "What is Lorem Ipsum?", answer: "Lorem Ipsum is dummy placeholder text used in the printing and typesetting industry since the 1500s. It helps designers focus on layout without being distracted by readable content." },
    { question: "Is Lorem Ipsum random text?", answer: "No. Lorem Ipsum originates from sections 1.10.32 and 1.10.33 of 'de Finibus Bonorum et Malorum' by Cicero, written in 45 BC. The standard passage has been used since the 1500s." },
    { question: "Why not just use real text?", answer: "Placeholder text prevents reviewers from focusing on content instead of design. It provides a natural-looking text distribution that helps evaluate typography and layout." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function LoremIpsumPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Lorem Ipsum Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Generate placeholder text for your designs, mockups, and layouts. Choose paragraphs, sentences, or words.</p>
      </div>
      <LoremIpsumTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>What is Lorem Ipsum?</h2>
        <p>Lorem Ipsum is the standard dummy text used by designers and developers since the 1500s. It provides a natural distribution of letters and words, making it ideal for previewing fonts, layouts, and typography.</p>
        <h2>When to Use Placeholder Text</h2>
        <ul>
          <li>Designing website mockups and wireframes</li>
          <li>Testing font rendering and typography</li>
          <li>Filling content areas during development</li>
          <li>Creating presentation templates</li>
          <li>Prototyping email and newsletter layouts</li>
        </ul>
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
