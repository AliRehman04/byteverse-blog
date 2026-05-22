import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-auto">
      <div className="gradient-line" aria-hidden="true" />
      <div className="bg-muted/50 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
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
            <div>
              <h3 className="font-semibold text-sm mb-4">Free Tools</h3>
              <ul className="space-y-2.5">
                <li><Link href="/tools/json-formatter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">JSON Formatter</Link></li>
                <li><Link href="/tools/password-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Password Generator</Link></li>
                <li><Link href="/tools/meta-tag-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Meta Tag Generator</Link></li>
                <li><Link href="/tools/base64-encoder-decoder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Base64 Encoder</Link></li>
                <li><Link href="/tools/word-counter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Word Counter</Link></li>
                <li><Link href="/tools/llms-txt-generator-validator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">llms.txt Validator</Link></li>
                <li><Link href="/tools/regex-tester" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Regex Tester</Link></li>
                <li><Link href="/tools/jwt-decoder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">JWT Decoder</Link></li>
                <li><Link href="/tools/hash-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Hash Generator</Link></li>
                <li><Link href="/tools/uuid-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">UUID Generator</Link></li>
                <li><Link href="/tools/timestamp-converter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Timestamp Converter</Link></li>
                <li><Link href="/tools/url-encoder-decoder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">URL Encoder</Link></li>
                <li><Link href="/tools/diff-checker" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Diff Checker</Link></li>
              </ul>
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
