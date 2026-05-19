import type { Metadata } from "next";
import { Zap, Target, Users, Heart } from "lucide-react";
import { Newsletter } from "@/components/newsletter";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "About ByteVerse — Your Trusted Tech Knowledge Hub",
  description:
    "Learn about ByteVerse, your go-to source for AI tool reviews, step-by-step tech guides, productivity hacks, coding tutorials, and honest software reviews.",
  alternates: {
    canonical: `${siteConfig.url}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Header */}
      <div className="text-center mb-16 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Zap size={32} className="text-primary" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          About <span className="gradient-text">ByteVerse</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          We believe technology should be accessible to everyone. ByteVerse is
          your trusted guide to navigating the ever-evolving tech landscape.
        </p>
      </div>

      {/* Mission */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="p-6 rounded-2xl border border-border bg-card">
          <Target size={28} className="text-primary mb-4" />
          <h3 className="font-bold mb-2">Our Mission</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To make complex tech topics simple and actionable for everyone —
            from beginners to experienced professionals.
          </p>
        </div>
        <div className="p-6 rounded-2xl border border-border bg-card">
          <Users size={28} className="text-primary mb-4" />
          <h3 className="font-bold mb-2">Our Audience</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Students, developers, freelancers, and tech enthusiasts who want to
            stay ahead with the latest tools and trends.
          </p>
        </div>
        <div className="p-6 rounded-2xl border border-border bg-card">
          <Heart size={28} className="text-primary mb-4" />
          <h3 className="font-bold mb-2">Our Promise</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Honest reviews, clear tutorials, and no fluff. Every article is
            researched, tested, and written to genuinely help you.
          </p>
        </div>
      </div>

      {/* What We Cover */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6">What We Cover</h2>
        <div className="prose max-w-none">
          <ul className="space-y-3 text-muted-foreground">
            <li>
              <strong className="text-foreground">AI Tools & Reviews</strong> —
              Honest, hands-on reviews of the latest AI tools like ChatGPT,
              Midjourney, Claude, and more.
            </li>
            <li>
              <strong className="text-foreground">Tech Guides</strong> —
              Step-by-step tutorials on everything from cloud hosting to web
              development frameworks.
            </li>
            <li>
              <strong className="text-foreground">Productivity</strong> — Tools,
              apps, and strategies to work smarter, not harder.
            </li>
            <li>
              <strong className="text-foreground">Coding Tutorials</strong> —
              Practical programming guides with real-world projects and examples.
            </li>
            <li>
              <strong className="text-foreground">Software Reviews</strong> —
              Unbiased comparisons to help you choose the right tools for your
              needs.
            </li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      <Newsletter />
    </div>
  );
}
