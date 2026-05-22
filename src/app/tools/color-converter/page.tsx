import type { Metadata } from "next";
import { ColorConverterTool } from "./color-converter-tool";

export const metadata: Metadata = {
  title: "Color Converter - Free HEX, RGB & HSL Color Tool",
  description: "Convert colors between HEX, RGB, and HSL formats instantly. Visual color picker with sliders, live preview, and one-click copy for all formats.",
  keywords: ["color converter", "hex to rgb", "rgb to hsl", "color picker", "hex to hsl", "css color converter"],
  alternates: { canonical: "https://www.byteverse.fyi/tools/color-converter" },
};

export default function ColorConverterPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
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
    </main>
  );
}
