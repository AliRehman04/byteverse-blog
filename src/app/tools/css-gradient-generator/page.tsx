import type { Metadata } from "next";
import { CssGradientGeneratorTool } from "./css-gradient-generator-tool";

export const metadata: Metadata = {
  title: "CSS Gradient Generator - Free Linear & Radial Gradient Builder",
  description: "Create beautiful CSS gradients visually. Build linear and radial gradients with multiple color stops, angle controls, and presets. Copy the CSS code instantly.",
  keywords: ["css gradient generator", "gradient builder", "linear gradient", "radial gradient", "css background gradient", "color gradient maker"],
  alternates: { canonical: "https://www.byteverse.fyi/tools/css-gradient-generator" },
};

export default function CssGradientGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">CSS Gradient Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Build beautiful linear and radial CSS gradients with a visual editor. Add color stops, adjust angles, and copy the generated CSS code.</p>
      </div>
      <CssGradientGeneratorTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>CSS Gradients</h2>
        <p>CSS gradients let you display smooth transitions between two or more colors. You can use them for backgrounds, borders, and even text effects.</p>
        <h2>Types of Gradients</h2>
        <ul>
          <li><strong>Linear Gradient</strong> &mdash; Colors transition along a straight line at a specified angle</li>
          <li><strong>Radial Gradient</strong> &mdash; Colors radiate outward from a center point</li>
        </ul>
      </section>
    </main>
  );
}
