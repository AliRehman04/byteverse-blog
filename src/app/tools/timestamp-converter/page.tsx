import type { Metadata } from "next";
import { TimestampConverterTool } from "./timestamp-converter-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Unix Timestamp Converter",
  title: "Unix Timestamp Converter - Epoch to Date Tool",
  description: "Convert Unix timestamps to human-readable dates and vice versa. Supports seconds and milliseconds, multiple output formats, and relative time. Free and private.",
  slug: "timestamp-converter",
  keywords: ["unix timestamp converter", "epoch converter", "timestamp to date", "date to timestamp", "unix time converter", "epoch time converter", "unix timestamp to date online"],
  faqs: [
    { question: "Is my data safe?", answer: "Yes. All conversions happen in your browser. No data is sent to any server." },
    { question: "How do I know if my timestamp is in seconds or milliseconds?", answer: "Timestamps in seconds are typically 10 digits (e.g., 1700000000). Millisecond timestamps are 13 digits (e.g., 1700000000000). This tool auto-detects the format." },
    { question: "What is the Year 2038 problem?", answer: "32-bit systems store Unix timestamps as a signed 32-bit integer, which overflows on January 19, 2038. Modern 64-bit systems and JavaScript use 64-bit numbers, so this tool works correctly for dates far beyond 2038." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function TimestampConverterPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Unix Timestamp Converter
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Convert Unix timestamps to human-readable dates and back. Supports
          seconds and milliseconds with multiple output formats.
        </p>
      </div>

      <TimestampConverterTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This Timestamp Converter</h2>
        <ol>
          <li>Choose a direction: Unix → Date or Date → Unix</li>
          <li>Enter a Unix timestamp (auto-detects seconds vs milliseconds) or pick a date</li>
          <li>See the result in multiple formats — ISO 8601, UTC, local time, and relative time</li>
          <li>Click Copy on any format to copy it to your clipboard</li>
        </ol>

        <h2>What is a Unix Timestamp?</h2>
        <p>
          A Unix timestamp (or Epoch time) is the number of seconds that have elapsed since
          January 1, 1970 00:00:00 UTC. It is used widely in programming, databases, and
          APIs to represent dates and times in a timezone-independent way.
        </p>

        <h2>Frequently Asked Questions</h2>
        <h3>Is my data safe?</h3>
        <p>Yes. All conversions happen in your browser. No data is sent to any server.</p>
        <h3>How do I know if my timestamp is in seconds or milliseconds?</h3>
        <p>Timestamps in seconds are typically 10 digits (e.g., 1700000000). Millisecond timestamps are 13 digits (e.g., 1700000000000). This tool auto-detects the format.</p>
        <h3>What is the Year 2038 problem?</h3>
        <p>32-bit systems store Unix timestamps as a signed 32-bit integer, which overflows on January 19, 2038. Modern 64-bit systems and JavaScript use 64-bit numbers, so this tool works correctly for dates far beyond 2038.</p>
      </section>
    </main>
  );
}
