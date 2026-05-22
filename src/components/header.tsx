"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Menu, X, ArrowRight, ChevronDown, ChevronRight,
  Braces, KeyRound, Tags, Binary, Type, FileText,
  Regex, ShieldCheck, Hash, Fingerprint, Clock, Link2, GitCompareArrows,
  Eye, Bot, Code, TextCursorInput, Paintbrush, Pipette, Square,
  Brain, FileSearch, CodeXml,
} from "lucide-react";
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

const toolCategories = [
  {
    title: "Formatters & Dev",
    icon: Braces,
    color: "text-blue-500",
    tools: [
      { name: "JSON Formatter", href: "/tools/json-formatter", icon: Braces, desc: "Format, validate & minify" },
      { name: "Regex Tester", href: "/tools/regex-tester", icon: Regex, desc: "Test patterns live" },
      { name: "Diff Checker", href: "/tools/diff-checker", icon: GitCompareArrows, desc: "Compare texts side by side" },
      { name: "Word Counter", href: "/tools/word-counter", icon: Type, desc: "Words, chars & reading time" },
      { name: "HTML Editor", href: "/tools/html-editor", icon: CodeXml, desc: "Live HTML/CSS playground" },
    ],
  },
  {
    title: "Encoders & Converters",
    icon: Binary,
    color: "text-orange-500",
    tools: [
      { name: "Base64 Encoder", href: "/tools/base64-encoder-decoder", icon: Binary, desc: "Encode & decode Base64" },
      { name: "URL Encoder", href: "/tools/url-encoder-decoder", icon: Link2, desc: "Encode & decode URLs" },
      { name: "Timestamp Converter", href: "/tools/timestamp-converter", icon: Clock, desc: "Unix epoch ↔ date" },
      { name: "Slug Generator", href: "/tools/slug-generator", icon: TextCursorInput, desc: "URL-friendly text" },
    ],
  },
  {
    title: "Security & Crypto",
    icon: ShieldCheck,
    color: "text-green-500",
    tools: [
      { name: "Password Generator", href: "/tools/password-generator", icon: KeyRound, desc: "Strong random passwords" },
      { name: "Hash Generator", href: "/tools/hash-generator", icon: Hash, desc: "SHA-256, SHA-512 hashes" },
      { name: "JWT Decoder", href: "/tools/jwt-decoder", icon: ShieldCheck, desc: "Decode & inspect JWTs" },
      { name: "UUID Generator", href: "/tools/uuid-generator", icon: Fingerprint, desc: "Generate & validate UUIDs" },
    ],
  },
  {
    title: "SEO & Web",
    icon: Tags,
    color: "text-purple-500",
    tools: [
      { name: "Meta Tag Generator", href: "/tools/meta-tag-generator", icon: Tags, desc: "SEO meta tags + preview" },
      { name: "OG Preview", href: "/tools/og-preview", icon: Eye, desc: "Social media link cards" },
      { name: "robots.txt Generator", href: "/tools/robots-txt-generator", icon: Bot, desc: "Build robots.txt visually" },
      { name: "Schema Markup", href: "/tools/schema-markup-generator", icon: Code, desc: "JSON-LD structured data" },
    ],
  },
  {
    title: "Content Analysis",
    icon: Brain,
    color: "text-pink-500",
    tools: [
      { name: "AI Content Detector", href: "/tools/ai-content-detector", icon: Brain, desc: "Detect AI-generated text" },
      { name: "Plagiarism Checker", href: "/tools/plagiarism-checker", icon: FileSearch, desc: "Check text uniqueness" },
      { name: "llms.txt Validator", href: "/tools/llms-txt-generator-validator", icon: FileText, desc: "Generate & validate" },
    ],
  },
  {
    title: "CSS & Design",
    icon: Paintbrush,
    color: "text-red-500",
    tools: [
      { name: "Gradient Generator", href: "/tools/css-gradient-generator", icon: Paintbrush, desc: "Linear & radial CSS" },
      { name: "Color Converter", href: "/tools/color-converter", icon: Pipette, desc: "HEX, RGB & HSL" },
      { name: "Box Shadow", href: "/tools/box-shadow-generator", icon: Square, desc: "Visual shadow builder" },
    ],
  },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mega menu on route change
  useEffect(() => {
    setToolsOpen(false);
    setMobileOpen(false);
    setMobileToolsOpen(false);
  }, [pathname]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    if (toolsOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [toolsOpen]);

  const openTools = () => {
    if (toolsTimeout.current) clearTimeout(toolsTimeout.current);
    setToolsOpen(true);
  };
  const closeTools = () => {
    toolsTimeout.current = setTimeout(() => setToolsOpen(false), 200);
  };

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

                // Tools gets a mega menu
                if (item.href === "/tools") {
                  return (
                    <div
                      key={item.href}
                      ref={toolsRef}
                      className="relative"
                      onMouseEnter={openTools}
                      onMouseLeave={closeTools}
                    >
                      <button
                        onClick={() => setToolsOpen((v) => !v)}
                        className={`flex items-center gap-1 px-3.5 py-2 text-sm rounded-lg transition-all duration-200 ${
                          isActive || toolsOpen
                            ? "text-primary font-semibold bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {item.title}
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${toolsOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Mega Menu Dropdown */}
                      <div
                        className={`fixed md:absolute top-[4.25rem] md:top-full left-1/2 -translate-x-1/2 pt-0 md:pt-2 transition-all duration-200 ${
                          toolsOpen
                            ? "opacity-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 -translate-y-2 pointer-events-none"
                        }`}
                        style={{ zIndex: 60 }}
                      >
                        <div className="w-[calc(100vw-2rem)] max-w-[820px] bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden">
                          {/* Header */}
                          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border/60 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold">Developer Tools</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Free, private, runs in your browser</p>
                            </div>
                            <Link
                              href="/tools"
                              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                            >
                              View all <ArrowRight size={12} />
                            </Link>
                          </div>

                          {/* Categories grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 p-1.5 sm:p-2 max-h-[60vh] overflow-y-auto">
                            {toolCategories.map((cat) => (
                              <div key={cat.title} className="p-2 sm:p-3">
                                <div className="flex items-center gap-2 mb-2 px-1">
                                  <cat.icon size={14} className={cat.color} />
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {cat.title}
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  {cat.tools.map((tool) => (
                                    <Link
                                      key={tool.href}
                                      href={tool.href}
                                      className="flex items-center gap-2.5 px-2 py-1.5 sm:py-2 rounded-lg hover:bg-muted/70 transition-colors group"
                                    >
                                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-muted/80 group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
                                        <tool.icon size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[13px] font-medium group-hover:text-primary transition-colors leading-tight">
                                          {tool.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate hidden sm:block">
                                          {tool.desc}
                                        </p>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Footer */}
                          <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-border/60 bg-muted/30 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {toolCategories.reduce((sum, c) => sum + c.tools.length, 0)} tools available
                            </p>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              100% client-side
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

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

                if (item.href === "/tools") {
                  return (
                    <div key={item.href}>
                      <button
                        onClick={() => setMobileToolsOpen((v) => !v)}
                        className={`flex items-center justify-between w-full px-4 py-3 text-sm rounded-lg transition-colors ${
                          isActive
                            ? "text-primary font-semibold bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {item.title}
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${mobileToolsOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {mobileToolsOpen && (
                        <div className="pl-4 pr-2 py-2 space-y-3 animate-fade-in">
                          {toolCategories.map((cat) => (
                            <div key={cat.title}>
                              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1">
                                <cat.icon size={12} className={cat.color} />
                                {cat.title}
                              </p>
                              {cat.tools.map((tool) => (
                                <Link
                                  key={tool.href}
                                  href={tool.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                  <tool.icon size={14} />
                                  {tool.name}
                                </Link>
                              ))}
                            </div>
                          ))}
                          <Link
                            href="/tools"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary"
                          >
                            View all tools <ChevronRight size={14} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                }

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
