import type { Metadata } from "next";
import { UrlEncoderDecoderTool } from "./url-encoder-decoder-tool";

export const metadata: Metadata = {
  title: "URL Encoder & Decoder Online - Free Percent Encoding Tool",
  description:
    "Encode and decode URLs instantly. Supports encodeURIComponent and encodeURI modes, URL parser, and common encoding reference. Free, private, runs in your browser.",
  keywords: [
    "url encoder",
    "url decoder",
    "url encode online",
    "url decode online",
    "percent encoding",
    "urlencode",
    "urldecode",
    "url parser",
  ],
  alternates: {
    canonical: "https://www.byteverse.fyi/tools/url-encoder-decoder",
  },
};

export default function UrlEncoderDecoderPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          URL Encoder & Decoder
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Encode text for safe use in URLs or decode percent-encoded strings.
          Includes a URL parser to break down any URL into its components.
        </p>
      </div>

      <UrlEncoderDecoderTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This URL Encoder/Decoder</h2>
        <ol>
          <li>Choose Encode or Decode mode</li>
          <li>Select Component (encodes all special characters) or Full URI (preserves URL structure)</li>
          <li>Type or paste your text — the result appears instantly</li>
          <li>Use the swap button to reverse the operation</li>
        </ol>

        <h2>Component vs Full URI</h2>
        <ul>
          <li><strong>Component</strong> (encodeURIComponent) — Encodes everything except <code>A-Z a-z 0-9 - _ . ~ ! * &apos; ( )</code>. Best for encoding query parameter values.</li>
          <li><strong>Full URI</strong> (encodeURI) — Preserves URL structure characters like <code>: / ? # [ ] @ ! $ &amp; + , ; =</code>. Best for encoding complete URLs.</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is my data safe?</h3>
        <p>Yes. All encoding and decoding is done in your browser. No data is sent to any server.</p>
        <h3>When should I URL-encode text?</h3>
        <p>URL-encode any text that contains special characters before using it in a URL, especially in query parameters. For example, spaces become %20 and ampersands become %26.</p>
        <h3>What is percent encoding?</h3>
        <p>Percent encoding (also called URL encoding) replaces unsafe characters with a % followed by two hexadecimal digits representing the character&apos;s byte value in UTF-8.</p>
      </section>
    </main>
  );
}
