import type { Metadata } from "next";
import { BoxShadowGeneratorTool } from "./box-shadow-generator-tool";

export const metadata: Metadata = {
  title: "Box Shadow Generator - Free CSS Box-Shadow Builder",
  description: "Create CSS box-shadow effects visually. Adjust offset, blur, spread, color, opacity, and multiple layers. Copy the generated CSS code instantly.",
  keywords: ["box shadow generator", "css box shadow", "shadow generator", "css shadow builder", "box shadow css", "drop shadow generator"],
  alternates: { canonical: "https://www.byteverse.fyi/tools/box-shadow-generator" },
};

export default function BoxShadowGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
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
    </main>
  );
}
