"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Menu, X, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteConfig } from "@/lib/config";

const SearchDialog = dynamic(
  () => import("@/components/search-dialog").then((m) => m.SearchDialog),
  { ssr: false, loading: () => (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-lg border border-border">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <span className="hidden lg:inline">Search...</span>
    </div>
  )}
);

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Gradient accent line */}
      <div className="gradient-line" aria-hidden="true" />

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-background border-b border-transparent"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/logo.png"
                alt="ByteVerse"
                title="ByteVerse - AI Tools, Tech Guides & Productivity"
                width={160}
                height={40}
                className="w-auto group-hover:scale-[1.02] transition-transform"
                priority
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {siteConfig.nav.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3.5 py-2 text-sm rounded-lg transition-all duration-200 ${
                      isActive
                        ? "text-primary font-semibold bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <SearchDialog />
              <ThemeToggle />
              <Link
                href="/blog"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all duration-200 btn-shimmer"
              >
                Read Blog <ArrowRight size={14} />
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileOpen && (
            <nav className="md:hidden py-4 border-t border-border space-y-1 animate-fade-in">
              {siteConfig.nav.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-3 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "text-primary font-semibold bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
              <Link
                href="/blog"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 mx-3 mt-3 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg"
              >
                Read Blog <ArrowRight size={14} />
              </Link>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
