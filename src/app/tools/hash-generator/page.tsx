import type { Metadata } from "next";
import { HashGeneratorTool } from "./hash-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Hash Generator",
  title: "Hash Generator Online - SHA-256, SHA-512, SHA-1 Hash Calculator",
  description: "Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes instantly. Free online hash calculator using Web Crypto API. Secure, private, runs in your browser.",
  slug: "hash-generator",
  keywords: ["hash generator", "sha256 hash", "sha512 hash", "sha1 hash", "hash calculator", "online hash generator", "sha256 online", "text to hash", "hash tool"],
  faqs: [
    { question: "Is my data safe?", answer: "Yes. All hashing is done using your browser's built-in Web Crypto API. No data is sent to any server." },
    { question: "Which algorithm should I use?", answer: "SHA-256 is the most widely used and recommended for most purposes. SHA-1 is considered weak and should only be used for non-security checksums." },
    { question: "Why is MD5 not included?", answer: "MD5 is considered cryptographically broken and is not supported by the Web Crypto API. Use SHA-256 or higher for any security-related hashing." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function HashGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Hash Generator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes from any text.
          Uses the Web Crypto API for fast, secure hashing.
        </p>
      </div>

      <HashGeneratorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This Hash Generator</h2>
        <ol>
          <li>Type or paste text in the input area</li>
          <li>All hash values are computed instantly as you type</li>
          <li>Click Copy on any individual hash, or Copy All for all results</li>
          <li>Toggle Uppercase for uppercase hex output</li>
        </ol>

        <h2>What is Hashing?</h2>
        <p>
          A hash function takes input data of any size and produces a fixed-size
          output (the hash or digest). The same input always produces the same
          output, but even a tiny change in input produces a completely different hash.
          Hashing is one-way — you cannot reverse a hash to get the original data.
        </p>

        <h2>Frequently Asked Questions</h2>
        <h3>Is my data safe?</h3>
        <p>Yes. All hashing is done using your browser&apos;s built-in Web Crypto API. No data is sent to any server.</p>
        <h3>Which algorithm should I use?</h3>
        <p>SHA-256 is the most widely used and recommended for most purposes. SHA-1 is considered weak and should only be used for non-security checksums.</p>
        <h3>Why is MD5 not included?</h3>
        <p>MD5 is considered cryptographically broken and is not supported by the Web Crypto API. Use SHA-256 or higher for any security-related hashing.</p>
      </section>
    </main>
  );
}
