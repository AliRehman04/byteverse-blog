import type { Metadata } from "next";
import { JwtDecoderTool } from "./jwt-decoder-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "JWT Decoder",
  title: "JWT Decoder - Decode & Inspect JSON Web Tokens",
  description: "Decode and inspect JWT tokens instantly. View header, payload, claims, expiration status, and signature. Free, secure, runs entirely in your browser.",
  slug: "jwt-decoder",
  keywords: ["jwt decoder", "jwt decoder online", "decode jwt", "json web token decoder", "jwt token decoder", "jwt inspector", "jwt debugger", "jwt parser"],
  faqs: [
    { question: "Is my JWT safe here?", answer: "Yes. Decoding happens entirely in your browser. No token data is sent to any server." },
    { question: "Can this tool verify JWT signatures?", answer: "No. Signature verification requires the secret key or public key, which should never be shared in a browser tool. This tool only decodes and inspects the token contents." },
    { question: "What algorithms are supported?", answer: "This decoder works with any JWT regardless of algorithm (HS256, RS256, ES256, etc.) since it only decodes the Base64Url-encoded parts." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function JwtDecoderPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          JWT Decoder & Inspector
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Paste a JSON Web Token to decode its header, payload, and check
          expiration status. Nothing leaves your browser.
        </p>
      </div>

      <JwtDecoderTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Use This JWT Decoder</h2>
        <ol>
          <li>Paste your JWT token in the input area</li>
          <li>The header, payload, and signature are decoded instantly</li>
          <li>Check expiration status and registered claims at a glance</li>
          <li>Click Copy to grab any decoded section</li>
        </ol>

        <h2>What is a JWT?</h2>
        <p>
          A JSON Web Token (JWT) is a compact, URL-safe way to represent claims between
          two parties. It consists of three Base64Url-encoded parts separated by dots:
          Header, Payload, and Signature.
        </p>

        <h2>Features</h2>
        <ul>
          <li><strong>Color-Coded View</strong> — Header (red), Payload (purple), Signature (cyan)</li>
          <li><strong>Expiration Check</strong> — Instantly see if a token is expired</li>
          <li><strong>Timestamp Decoding</strong> — iat, exp, and nbf converted to human-readable dates</li>
          <li><strong>Registered Claims</strong> — Quick view of iss, sub, aud, jti</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is my JWT safe here?</h3>
        <p>Yes. Decoding happens entirely in your browser. No token data is sent to any server.</p>
        <h3>Can this tool verify JWT signatures?</h3>
        <p>No. Signature verification requires the secret key or public key, which should never be shared in a browser tool. This tool only decodes and inspects the token contents.</p>
        <h3>What algorithms are supported?</h3>
        <p>This decoder works with any JWT regardless of algorithm (HS256, RS256, ES256, etc.) since it only decodes the Base64Url-encoded parts.</p>
      </section>
    </main>
  );
}
