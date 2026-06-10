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
                {siteConfig.description} Explore tested AI tool reviews, step-by-step coding tutorials, productivity workflows, and 38+ free browser-based developer utilities. All content is hands-on, verified, and written to help you build faster.
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
                <a
                  href="/feed.xml"
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="RSS Feed"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                </a>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Email"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
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
