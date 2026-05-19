import type { Metadata } from "next";
import Image from "next/image";
import { Target, Users, Heart } from "lucide-react";
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-0 -left-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl animate-float-reverse" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center max-w-3xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 mb-5 overflow-hidden">
              <Image src="/logo.jpeg" alt="ByteVerse Logo" width={56} height={56} className="rounded-2xl" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              About ByteVerse
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              We believe technology should be accessible to everyone. ByteVerse is
              your trusted guide to navigating the ever-evolving tech landscape.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
          </svg>
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
