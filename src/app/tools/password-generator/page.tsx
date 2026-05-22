import type { Metadata } from "next";
import { PasswordGeneratorTool } from "./password-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Password Generator",
  title: "Password Generator - Free Secure Password Tool",
  description: "Generate strong, random passwords instantly. Customize length, symbols, numbers, and more. 100% client-side, nothing stored.",
  slug: "password-generator",
  keywords: ["password generator", "random password", "secure password", "strong password generator", "password tool"],
  faqs: [
    { question: "Is this password generator safe?", answer: "Yes. Passwords are generated entirely in your browser using the Web Crypto API. Nothing is sent to any server or stored anywhere." },
    { question: "How long should my password be?", answer: "At least 16 characters for important accounts. For maximum security, use 20+ characters with all character types enabled." },
    { question: "Should I use a password manager?", answer: "Absolutely. Generate unique passwords here and store them in a password manager like Bitwarden, 1Password, or KeePass." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function PasswordGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Password Generator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate strong, random passwords with custom length and character
          options. Everything runs in your browser.
        </p>
      </div>

      <PasswordGeneratorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Why Use a Password Generator?</h2>
        <p>
          Humans are terrible at creating random passwords. We reuse them, make
          them too short, or base them on personal info that is easy to guess. A
          random generator creates passwords that are virtually impossible to
          crack through brute force.
        </p>

        <h2>What Makes a Strong Password?</h2>
        <ul>
          <li><strong>At least 16 characters</strong> - Longer is always better</li>
          <li><strong>Mix of character types</strong> - Uppercase, lowercase, numbers, symbols</li>
          <li><strong>No dictionary words</strong> - Random characters only</li>
          <li><strong>Unique per account</strong> - Never reuse passwords</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is this password generator safe?</h3>
        <p>
          Yes. Passwords are generated entirely in your browser using the Web
          Crypto API. Nothing is sent to any server or stored anywhere.
        </p>
        <h3>How long should my password be?</h3>
        <p>
          At least 16 characters for important accounts. For maximum security,
          use 20+ characters with all character types enabled.
        </p>
        <h3>Should I use a password manager?</h3>
        <p>
          Absolutely. Generate unique passwords here and store them in a
          password manager like Bitwarden, 1Password, or KeePass.
        </p>
      </section>
    </main>
  );
}
