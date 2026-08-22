import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, AlertTriangle } from "lucide-react";
import { HashGeneratorTool } from "./hash-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Hash Generator",
  title: "Hash Generator Online - SHA-256, SHA-512 & SHA-1",
  description: "Free online hash generator: SHA-256, SHA-512, SHA-384, and SHA-1 from any text, instantly. Web Crypto API — private, in-browser, no upload.",
  slug: "hash-generator",
  keywords: [
    "hash generator",
    "hash generator online",
    "sha256 generator",
    "sha256 generator online",
    "sha256 generator from text",
    "hash generator sha256",
    "sha512 generator",
    "sha256 hash",
    "sha512 hash",
    "sha1 hash",
    "hash calculator",
    "online hash generator",
    "text to hash",
    "checksum generator",
  ],
  featureList: [
    "SHA-256, SHA-512, SHA-384, SHA-1 in parallel",
    "Instant hashing as you type",
    "Copy single or all hashes",
    "Uppercase hex toggle",
    "Runs fully in your browser",
  ],
  faqs: [
    {
      question: "How do I generate a SHA-256 hash online?",
      answer: "Type or paste your text above — the SHA-256 hash (plus SHA-1, SHA-384, and SHA-512) computes instantly as you type, using your browser's Web Crypto API. Copy any result with one click.",
    },
    {
      question: "Is my data safe?",
      answer: "Yes. All hashing runs in your browser via the Web Crypto API — no text is sent to any server, which makes it safe for sensitive strings.",
    },
    {
      question: "Which hash algorithm should I use?",
      answer: "SHA-256 is the modern default — strong, fast, and universally supported. SHA-512 for extra margin or 64-bit performance. SHA-1 only for legacy compatibility and non-security checksums — it is cryptographically broken for signatures.",
    },
    {
      question: "Why is MD5 not included?",
      answer: "MD5 is cryptographically broken and deliberately excluded from the Web Crypto API. If something asks for MD5 today, it is legacy — use SHA-256 anywhere you have the choice.",
    },
    {
      question: "Can I hash a file with this tool?",
      answer: "This tool hashes text. For files, your OS has it built in: PowerShell's Get-FileHash on Windows, shasum -a 256 on macOS/Linux — both produce the same SHA-256 you can verify against a download page.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const algorithms = [
  { algo: "SHA-256", bits: "256-bit / 64 hex chars", status: "Recommended default", use: "Checksums, integrity, signatures, blockchain" },
  { algo: "SHA-512", bits: "512-bit / 128 hex chars", status: "Strong", use: "Extra security margin, fast on 64-bit CPUs" },
  { algo: "SHA-384", bits: "384-bit / 96 hex chars", status: "Strong", use: "TLS certificates, truncated SHA-512 variant" },
  { algo: "SHA-1", bits: "160-bit / 40 hex chars", status: "Broken for security", use: "Legacy compatibility, git object IDs, non-security checksums" },
];

export default function HashGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free Developer Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Hash Generator Online — SHA-256, SHA-512 & More
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Generate SHA-256, SHA-512, SHA-384, and SHA-1 hashes from any text — instantly, as you
          type, all four in parallel. Runs on your browser's Web Crypto API: private, fast, and free.
        </p>
      </div>

      <HashGeneratorTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Generate a Hash in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Type or paste your text", detail: "Any string — a password to fingerprint, an API payload, a sentence to compare. Hashing starts instantly." },
            { step: "Read all four hashes at once", detail: "SHA-1, SHA-256, SHA-384, and SHA-512 compute in parallel — no algorithm dropdown needed." },
            { step: "Copy what you need", detail: "One hash or all of them, uppercase or lowercase hex — ready for configs, docs, or verification." },
          ].map((item, i) => (
            <li key={item.step} className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card">
              <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary font-extrabold text-sm">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base">{item.step}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Algorithm table */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">SHA-256 vs SHA-512 vs SHA-1: Which to Use</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3.5 font-bold">Algorithm</th>
                <th className="p-3.5 font-bold">Output</th>
                <th className="p-3.5 font-bold">Status</th>
                <th className="p-3.5 font-bold">Typical use</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {algorithms.map((a) => (
                <tr key={a.algo} className="border-b border-border last:border-0">
                  <td className="p-3.5 font-mono font-semibold text-foreground">{a.algo}</td>
                  <td className="p-3.5">{a.bits}</td>
                  <td className="p-3.5">{a.status}</td>
                  <td className="p-3.5">{a.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What is hashing + file hashing */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">What Is Hashing (in 60 Seconds)?</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
          A hash function turns input of any size into a fixed-size fingerprint. The same input
          always produces the same hash; change one character and the entire hash changes; and it is
          one-way — you cannot recover the input from the hash. That combination powers download
          verification, data integrity checks, digital signatures, and git commits.
        </p>
        <h3 className="text-lg sm:text-xl font-bold tracking-tight mb-3">Need to hash a file instead of text?</h3>
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border bg-muted/50"><h4 className="font-bold text-sm">Built into your OS — no tool needed</h4></div>
          <pre className="p-5 text-xs sm:text-sm font-mono text-muted-foreground overflow-x-auto">{`# Windows (PowerShell)
Get-FileHash .\\file.zip -Algorithm SHA256

# macOS / Linux
shasum -a 256 file.zip`}</pre>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500 shrink-0" /> Never store passwords as plain SHA hashes
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
            Fast hashes like SHA-256 are exactly what attackers want for brute-forcing leaked password
            databases. Real systems use slow, salted algorithms — bcrypt, scrypt, or Argon2 — designed
            to make guessing expensive. Use this generator for checksums and fingerprints; use a proper
            password hasher (and a <Link href="/tools/password-generator" className="text-primary hover:underline">strong generated password</Link>) for credentials — the full logic is in our{" "}
            <Link href="/blog/how-to-create-strong-passwords-2026" className="text-primary hover:underline">password security guide</Link>.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Frequently Asked Questions</h2>
        <div className="grid gap-4">
          {toolConfig.faqs.map((faq) => (
            <div key={faq.question} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base mb-1.5">{faq.question}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">More Developer Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><Wrench size={16} className="text-primary" /> Related Free Tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/uuid-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> UUID Generator — unique IDs, not fingerprints</Link></li>
              <li><Link href="/tools/password-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Password Generator — strong random credentials</Link></li>
              <li><Link href="/tools/base64-encoder-decoder" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Base64 Encoder/Decoder — encoding ≠ hashing</Link></li>
              <li><Link href="/tools/jwt-decoder" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JWT Decoder — inspect signed tokens</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/how-to-create-strong-passwords-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> How to Create Strong Passwords</Link></li>
              <li><Link href="/blog/two-factor-authentication-guide-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> 2FA Guide: Set Up Two-Factor Everywhere</Link></li>
              <li><Link href="/blog/online-security-checklist-2026-passkeys-2fa" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Online Security Checklist: Passkeys & 2FA</Link></li>
              <li><Link href="/blog/git-github-beginners-guide-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Git & GitHub for Beginners (SHA-1 in action)</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
