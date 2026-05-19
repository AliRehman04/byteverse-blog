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

const values = [
  { title: "AI Tools & Reviews", description: "Honest, hands-on reviews of the latest AI tools like ChatGPT, Midjourney, Claude, and more.", color: "from-violet-500/10 to-purple-500/10" },
  { title: "Tech Guides", description: "Step-by-step tutorials on everything from cloud hosting to web development frameworks.", color: "from-blue-500/10 to-cyan-500/10" },
  { title: "Productivity", description: "Tools, apps, and strategies to work smarter, not harder.", color: "from-emerald-500/10 to-teal-500/10" },
  { title: "Coding Tutorials", description: "Practical programming guides with real-world projects and examples.", color: "from-amber-500/10 to-orange-500/10" },
  { title: "Software Reviews", description: "Unbiased comparisons to help you choose the right tools for your needs.", color: "from-pink-500/10 to-rose-500/10" },
];

export default function AboutPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center max-w-3xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mb-5">
              <Zap size={26} className="text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              About <span className="gradient-text">ByteVerse</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We believe technology should be accessible to everyone. ByteVerse is
              your trusted guide to navigating the ever-evolving tech landscape.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Cards */}
      <section className="section-alt border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Target, title: "Our Mission", desc: "To make complex tech topics simple and actionable for everyone — from beginners to experienced professionals." },
              { icon: Users, title: "Our Audience", desc: "Students, developers, freelancers, and tech enthusiasts who want to stay ahead with the latest tools and trends." },
              { icon: Heart, title: "Our Promise", desc: "Honest reviews, clear tutorials, and no fluff. Every article is researched, tested, and written to genuinely help you." },
            ].map((item, i) => (
              <div key={item.title} className={`animate-fade-in-up stagger-${i + 1} p-6 rounded-2xl border border-border bg-card card-hover`}>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                  <item.icon size={22} className="text-primary" />
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Cover */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Our Content</p>
          <h2 className="text-2xl font-bold tracking-tight">
            What We <span className="gradient-text">Cover</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {values.map((item, i) => (
            <div key={item.title} className={`animate-fade-in-up stagger-${(i % 6) + 1} p-5 rounded-2xl border border-border bg-card card-hover`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                <span className="text-lg">✦</span>
              </div>
              <h3 className="font-bold text-sm mb-1.5">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="section-alt border-t border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
          <Newsletter />
        </div>
      </section>
    </>
  );
}
