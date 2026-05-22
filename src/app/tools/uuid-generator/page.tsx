import type { Metadata } from "next";
import { UuidGeneratorTool } from "./uuid-generator-tool";

export const metadata: Metadata = {
  title: "UUID Generator Online - Free UUID v4 Generator & Validator",
  description:
    "Generate random UUIDs (v4) instantly. Bulk generation up to 100, copy with one click, validate existing UUIDs. Free, secure, runs in your browser.",
  keywords: [
    "uuid generator",
    "uuid generator online",
    "generate uuid",
    "uuid v4",
    "random uuid",
    "guid generator",
    "uuid validator",
    "bulk uuid generator",
  ],
  alternates: { canonical: "https://www.byteverse.fyi/tools/uuid-generator" },
};

export default function UuidGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          UUID Generator & Validator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate random UUIDs (v4) or time-based UUIDs. Bulk generation,
          one-click copy, and UUID validation built in.
        </p>
      </div>

      <UuidGeneratorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This UUID Generator</h2>
        <ol>
          <li>Select the UUID version (v4 random is most common)</li>
          <li>Set the count (1-100) for bulk generation</li>
          <li>Click Generate to create UUIDs</li>
          <li>Click Copy on any UUID or Copy All to grab them all</li>
        </ol>

        <h2>What is a UUID?</h2>
        <p>
          A UUID (Universally Unique Identifier) is a 128-bit identifier that is unique
          across space and time. The most common format is v4, which uses random numbers
          to generate a UUID that is practically guaranteed to be unique.
        </p>

        <h2>UUID Versions</h2>
        <ul>
          <li><strong>v1</strong> — Time-based: uses current timestamp and machine identifier</li>
          <li><strong>v4</strong> — Random: uses cryptographically secure random numbers (most popular)</li>
          <li><strong>v5</strong> — Name-based: SHA-1 hash of a namespace and name</li>
          <li><strong>v7</strong> — Unix Epoch time-ordered: newer standard for sortable UUIDs</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is my data safe?</h3>
        <p>Yes. UUIDs are generated using your browser&apos;s Web Crypto API. Nothing is sent to any server.</p>
        <h3>Can two UUIDs be the same?</h3>
        <p>Theoretically possible but practically impossible. With 122 random bits in a v4 UUID, you would need to generate 2.71 quintillion UUIDs to have a 50% chance of a collision.</p>
        <h3>UUID vs GUID — what&apos;s the difference?</h3>
        <p>They are the same thing. GUID (Globally Unique Identifier) is Microsoft&apos;s term for UUID.</p>
      </section>
    </main>
  );
}
