import type { Metadata } from "next";
import { ColorConverterTool } from "./color-converter-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Color Converter",
  title: "Color Converter - Free HEX, RGB & HSL Color Tool",
  description: "Convert colors between HEX, RGB, and HSL formats instantly. Visual color picker with sliders, live preview, and one-click copy for all formats.",
  slug: "color-converter",
  keywords: ["color converter", "hex to rgb", "rgb to hsl", "color picker", "hex to hsl", "css color converter"],
  faqs: [
    { question: "What is the difference between HEX, RGB, and HSL?", answer: "HEX uses hexadecimal notation (#RRGGBB), RGB uses Red/Green/Blue values (0-255), and HSL uses Hue/Saturation/Lightness. They all represent the same colors, just in different formats." },
    { question: "Which color format should I use in CSS?", answer: "Use HEX for simple colors, HSL when you need to adjust lightness or saturation (e.g., hover effects), and RGB/RGBA when you need transparency." },
    { question: "Does this tool support transparency?", answer: "The converter handles solid colors in HEX, RGB, and HSL. For transparency, add an alpha channel manually (e.g., rgba or hsla)." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function ColorConverterPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Color Converter</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Convert colors between HEX, RGB, and HSL formats. Pick a color visually or enter values directly — all formats update in real time.</p>
      </div>
      <ColorConverterTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Color Formats Explained</h2>
        <ul>
          <li><strong>HEX</strong> &mdash; Hexadecimal notation (#RRGGBB) commonly used in CSS and design tools</li>
          <li><strong>RGB</strong> &mdash; Red, Green, Blue values from 0-255, used in CSS and programming</li>
          <li><strong>HSL</strong> &mdash; Hue (0-360°), Saturation (0-100%), Lightness (0-100%), ideal for color adjustments</li>
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
