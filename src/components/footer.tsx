import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-auto">
      <div className="gradient-line" aria-hidden="true" />
      <div className="bg-muted/50 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1 flex flex-col">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Image
                  src="/logo.png"
                  alt="ByteVerse"
                  title="ByteVerse - AI Tools, Tech Guides & Productivity"
                  width={140}
                  height={36}
                  className="h-9 w-auto"
                />
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {siteConfig.description}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-sm mb-4">Quick Links</h3>
              <ul className="space-y-2.5">
                {siteConfig.nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-semibold text-sm mb-4">Categories</h3>
              <ul className="space-y-2.5">
                {siteConfig.categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/category/${cat.slug}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tools */}
            <div className="sm:col-span-2">
              <h3 className="font-semibold text-sm mb-4">Free Tools</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <Link href="/tools/json-formatter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">JSON Formatter</Link>
                <Link href="/tools/password-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Password Generator</Link>
                <Link href="/tools/meta-tag-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Meta Tag Generator</Link>
                <Link href="/tools/base64-encoder-decoder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Base64 Encoder</Link>
                <Link href="/tools/word-counter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Word Counter</Link>
                <Link href="/tools/llms-txt-generator-validator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">llms.txt Validator</Link>
                <Link href="/tools/regex-tester" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Regex Tester</Link>
                <Link href="/tools/jwt-decoder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">JWT Decoder</Link>
                <Link href="/tools/hash-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Hash Generator</Link>
                <Link href="/tools/uuid-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">UUID Generator</Link>
                <Link href="/tools/timestamp-converter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Timestamp Converter</Link>
                <Link href="/tools/url-encoder-decoder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">URL Encoder</Link>
                <Link href="/tools/diff-checker" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Diff Checker</Link>
                <Link href="/tools/og-preview" className="text-sm text-muted-foreground hover:text-foreground transition-colors">OG Preview</Link>
                <Link href="/tools/robots-txt-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">robots.txt Generator</Link>
                <Link href="/tools/schema-markup-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Schema Generator</Link>
                <Link href="/tools/slug-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Slug Generator</Link>
                <Link href="/tools/css-gradient-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Gradient Generator</Link>
                <Link href="/tools/color-converter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Color Converter</Link>
                <Link href="/tools/box-shadow-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Box Shadow</Link>
                <Link href="/tools/ai-content-detector" className="text-sm text-muted-foreground hover:text-foreground transition-colors">AI Content Detector</Link>
                <Link href="/tools/plagiarism-checker" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Plagiarism Checker</Link>
                <Link href="/tools/plagiarism-remover" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Plagiarism Remover</Link>
                <Link href="/tools/html-editor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">HTML Editor</Link>
                <Link href="/tools/html-tag-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tag Generator</Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-sm mb-4">Legal</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Disclaimer
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
            </p>
            <a
              href={`mailto:${siteConfig.email}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {siteConfig.email}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
