import type { Metadata } from "next";
import { Base64Tool } from "./base64-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Base64 Encoder & Decoder",
  title: "Base64 Encoder & Decoder - Free Online Tool",
  description: "Encode or decode Base64 strings instantly. Supports text and UTF-8. Free, fast, and runs entirely in your browser.",
  slug: "base64-encoder-decoder",
  keywords: ["base64 encoder", "base64 decoder", "base64 online", "encode base64", "decode base64", "base64 tool"],
  faqs: [
    { question: "Is Base64 encryption?", answer: "No. Base64 is encoding, not encryption. It does not protect data. Anyone can decode Base64 strings. For security, use proper encryption." },
    { question: "Why does Base64 make data larger?", answer: "Base64 encoding increases data size by about 33% because it represents 3 bytes of binary data as 4 ASCII characters." },
    { question: "Is my data safe here?", answer: "Yes. All encoding and decoding happens in your browser. No data is sent to any server." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function Base64Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
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
          authentication tokens. The name comes from the 64-character alphabet it uses: A-Z, a-z, 0-9, plus (+), and slash (/).
        </p>

        <h2>How Base64 Encoding Works</h2>
        <p>Base64 takes every three bytes of input data and splits them into four 6-bit groups. Each group maps to one of the 64 characters in the Base64 alphabet. If the input length is not a multiple of three, padding characters (=) are added to the output. This process is deterministic and fully reversible, making it ideal for data transport but unsuitable for encryption.</p>

        <h2>Common Uses</h2>
        <ul>
          <li>Embedding images in HTML/CSS as data URIs</li>
          <li>Encoding API keys and tokens for HTTP headers</li>
          <li>Sending binary data through text-based protocols like JSON or XML</li>
          <li>Email attachments via MIME encoding</li>
          <li>Storing binary blobs in databases that only support text fields</li>
          <li>Encoding credentials in HTTP Basic Authentication</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is Base64 encryption?</h3>
        <p>No. Base64 is encoding, not encryption. It does not protect data. Anyone can decode Base64 strings. For security, use proper encryption like AES or RSA.</p>
        <h3>Why does Base64 make data larger?</h3>
        <p>Base64 encoding increases data size by about 33% because it represents 3 bytes of binary data as 4 ASCII characters. This trade-off is acceptable when you need to transmit binary data through text-only channels.</p>
        <h3>Is my data safe here?</h3>
        <p>Yes. All encoding and decoding happens in your browser using JavaScript. No data is sent to any server, and nothing is stored or logged.</p>
      </section>
    </main>
  );
}
