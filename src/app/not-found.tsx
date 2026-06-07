import type { Metadata } from "next";
import Link from "next/link";
import { Home, BookOpen, Wrench, FolderOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist. Browse our latest AI tools, tech guides, and coding tutorials at ByteVerse.",
  robots: { index: false, follow: true },
};

const suggestions = [
  { label: "Home", href: "/", icon: Home, desc: "Back to the homepage" },
  { label: "Blog", href: "/blog", icon: BookOpen, desc: "Read our latest articles" },
  { label: "Free Tools", href: "/tools", icon: Wrench, desc: "32+ developer tools" },
  { label: "Categories", href: "/categories", icon: FolderOpen, desc: "Browse by topic" },
];

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 text-center py-16">
      <p className="text-9xl font-black gradient-text mb-2 animate-fade-in-up">404</p>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3 animate-fade-in-up stagger-1">
        Page Not Found
      </h1>
      <p className="text-muted-foreground mb-10 max-w-md animate-fade-in-up stagger-2">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Try one of these instead:
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full animate-fade-in-up stagger-3">
        {suggestions.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col items-center gap-2 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <s.icon size={18} className="text-primary" />
            </div>
            <span className="font-semibold text-sm">{s.label}</span>
            <span className="text-xs text-muted-foreground">{s.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
