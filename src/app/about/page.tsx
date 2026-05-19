import type { Metadata } from "next";
import { Zap, Target, Users, Heart } from "lucide-react";
import { Newsletter } from "@/components/newsletter";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "About — Your Trusted Tech Knowledge Hub",
  description:
    "Learn about ByteVerse, your go-to source for AI tool reviews, step-by-step tech guides, productivity hacks, coding tutorials, and honest software reviews.",
  alternates: {
    canonical: `${siteConfig.url}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
          <Zap size={24} className="text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          About ByteVerse
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We believe technology should be accessible to everyone. ByteVerse is
          your trusted guide to navigating the ever-evolving tech landscape.
        </p>
      </div>

      {/* Mission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {[
          { icon: Target, title: "Our Mission", desc: "To make complex tech topics simple and actionable for everyone — from beginners to experienced professionals." },
          { icon: Users, title: "Our Audience", desc: "Students, developers, freelancers, and tech enthusiasts who want to stay ahead with the latest tools and trends." },
          { icon: Heart, title: "Our Promise", desc: "Honest reviews, clear tutorials, and no fluff. Every article is researched, tested, and written to genuinely help you." },
        ].map((item) => (
          <div key={item.title} className="p-5 rounded-xl border border-border bg-card">
            <item.icon size={22} className="text-primary mb-3" />
            <h3 className="font-semibold text-sm mb-1.5">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* What We Cover */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">What We Cover</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li><strong className="text-foreground">AI Tools & Reviews</strong> — Honest, hands-on reviews of the latest AI tools like ChatGPT, Midjourney, Claude, and more.</li>
          <li><strong className="text-foreground">Tech Guides</strong> — Step-by-step tutorials on everything from cloud hosting to web development frameworks.</li>
          <li><strong className="text-foreground">Productivity</strong> — Tools, apps, and strategies to work smarter, not harder.</li>
          <li><strong className="text-foreground">Coding Tutorials</strong> — Practical programming guides with real-world projects and examples.</li>
          <li><strong className="text-foreground">Software Reviews</strong> — Unbiased comparisons to help you choose the right tools for your needs.</li>
        </ul>
      </div>

      <Newsletter />
    </div>
  );
}
