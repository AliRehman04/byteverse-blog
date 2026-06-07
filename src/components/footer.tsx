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
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {siteConfig.description}
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/AliRehman04"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="GitHub"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a
                  href="/feed.xml"
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="RSS Feed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                </a>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Email"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h2 className="font-semibold text-sm mb-4">Quick Links</h2>
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
                <li>
                  <Link
                    href="/site-map"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    HTML Sitemap
                  </Link>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h2 className="font-semibold text-sm mb-4">Categories</h2>
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
              <h2 className="font-semibold text-sm mb-4">Free Tools</h2>
              <ul className="space-y-2.5">
                <li><Link href="/tools/json-formatter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">JSON Formatter</Link></li>
                <li><Link href="/tools/code-formatter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Code Formatter</Link></li>
                <li><Link href="/tools/plagiarism-checker" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Plagiarism Checker</Link></li>
                <li><Link href="/tools/plagiarism-remover" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Plagiarism Remover</Link></li>
                <li><Link href="/tools/regex-tester" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Regex Tester</Link></li>
                <li><Link href="/tools/password-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Password Generator</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h2 className="font-semibold text-sm mb-4">Legal</h2>
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
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                All tools run 100% client-side
              </span>
              <a
                href={`mailto:${siteConfig.email}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {siteConfig.email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
