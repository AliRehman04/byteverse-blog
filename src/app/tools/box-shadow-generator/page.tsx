import type { Metadata } from "next";
import { BoxShadowGeneratorTool } from "./box-shadow-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Box Shadow Generator",
  title: "Box Shadow Generator - Free CSS Box-Shadow Builder",
  description: "Create CSS box-shadow effects visually. Adjust offset, blur, spread, color, opacity, and multiple layers. Copy the generated CSS code instantly.",
  slug: "box-shadow-generator",
  keywords: ["box shadow generator", "css box shadow", "shadow generator", "css shadow builder", "box shadow css", "drop shadow generator"],
  faqs: [
    { question: "What is box-shadow in CSS?", answer: "box-shadow is a CSS property that adds shadow effects around an element's frame. You can control horizontal/vertical offset, blur radius, spread, and color." },
    { question: "Can I stack multiple shadows?", answer: "Yes. CSS supports multiple box-shadow values separated by commas. This tool lets you add and manage multiple shadow layers visually." },
    { question: "What is an inset shadow?", answer: "An inset shadow appears inside the element instead of outside it. It creates a pressed or recessed effect. Add the 'inset' keyword before the shadow values." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function BoxShadowGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Box Shadow Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Build CSS box-shadow effects with a visual editor. Stack multiple shadow layers, adjust colors and opacity, and copy the CSS code.</p>
      </div>
      <BoxShadowGeneratorTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>CSS Box Shadow</h2>
        <p>The <code>box-shadow</code> CSS property adds shadow effects around an element. You can stack multiple shadows, use inset for inner shadows, and control blur, spread, and color.</p>
        <h2>Syntax</h2>
        <p><code>box-shadow: [inset] x-offset y-offset blur spread color;</code></p>
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
