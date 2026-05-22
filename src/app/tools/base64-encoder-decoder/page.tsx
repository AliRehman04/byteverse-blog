import type { Metadata } from "next";
import { Base64Tool } from "./base64-tool";

export const metadata: Metadata = {
  title: "Base64 Encoder & Decoder - Free Online Tool",
  description:
    "Encode or decode Base64 strings instantly. Supports text and UTF-8. Free, fast, and runs entirely in your browser.",
  keywords: [
    "base64 encoder",
    "base64 decoder",
    "base64 online",
    "encode base64",
    "decode base64",
    "base64 tool",
  ],
  alternates: { canonical: "https://www.byteverse.fyi/tools/base64-encoder-decoder" },
};

export default function Base64Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Base64 Encoder & Decoder
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Encode text to Base64 or decode Base64 back to text. Supports UTF-8
          characters. Runs locally in your browser.
        </p>
      </div>

      <Base64Tool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>What is Base64?</h2>
        <p>
          Base64 is a binary-to-text encoding scheme that represents binary data
          using 64 ASCII characters. It is commonly used to embed images in CSS,
          send binary data in JSON, include attachments in emails, and encode
          authentication tokens.
        </p>

        <h2>Common Uses</h2>
        <ul>
          <li>Embedding images in HTML/CSS as data URIs</li>
          <li>Encoding API keys and tokens</li>
          <li>Sending binary data through text-based protocols</li>
          <li>Email attachments (MIME encoding)</li>
          <li>Storing binary data in JSON or XML</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is Base64 encryption?</h3>
        <p>No. Base64 is encoding, not encryption. It does not protect data. Anyone can decode Base64 strings. For security, use proper encryption.</p>
        <h3>Why does Base64 make data larger?</h3>
        <p>Base64 encoding increases data size by about 33% because it represents 3 bytes of binary data as 4 ASCII characters.</p>
        <h3>Is my data safe here?</h3>
        <p>Yes. All encoding and decoding happens in your browser. No data is sent to any server.</p>
      </section>
    </main>
  );
}
