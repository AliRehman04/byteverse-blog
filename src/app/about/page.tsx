import type { Metadata } from "next";
import { Zap, Target, Users, Heart, Sparkles, BookOpen, Cpu, TrendingUp, Shield } from "lucide-react";
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
  { icon: Sparkles, title: "AI Tools & Reviews", description: "Honest, hands-on reviews of the latest AI tools like ChatGPT, Midjourney, Claude, and more.", gradient: "from-violet-500 to-purple-600" },
  { icon: BookOpen, title: "Tech Guides", description: "Step-by-step tutorials on everything from cloud hosting to web development frameworks.", gradient: "from-blue-500 to-cyan-500" },
  { icon: TrendingUp, title: "Productivity", description: "Tools, apps, and strategies to work smarter, not harder.", gradient: "from-emerald-500 to-teal-500" },
  { icon: Cpu, title: "Coding Tutorials", description: "Practical programming guides with real-world projects and examples.", gradient: "from-amber-500 to-orange-500" },
  { icon: Shield, title: "Software Reviews", description: "Unbiased comparisons to help you choose the right tools for your needs.", gradient: "from-pink-500 to-rose-500" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      {/* Header */}
      <div className="text-center mb-20 animate-fade-in relative">
        <div className="orb w-96 h-96 bg-violet-500/10 -top-48 left-1/4" />
        <div className="orb w-72 h-72 bg-pink-500/8 -top-36 right-1/4" style={{ animationDelay: "-8s" }} />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass text-primary text-sm font-semibold mb-8">
            <Zap size={14} className="animate-pulse" />
            About Us
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6">
            About <span className="gradient-text">ByteVerse</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We believe technology should be accessible to everyone. ByteVerse is
            your trusted guide to navigating the ever-evolving tech landscape.
          </p>
        </div>
      </div>

      {/* Mission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        {[
          { icon: Target, title: "Our Mission", description: "To make complex tech topics simple and actionable for everyone — from beginners to experienced professionals.", gradient: "from-violet-500 to-purple-600" },
          { icon: Users, title: "Our Audience", description: "Students, developers, freelancers, and tech enthusiasts who want to stay ahead with the latest tools and trends.", gradient: "from-blue-500 to-cyan-500" },
          { icon: Heart, title: "Our Promise", description: "Honest reviews, clear tutorials, and no fluff. Every article is researched, tested, and written to genuinely help you.", gradient: "from-pink-500 to-rose-500" },
        ].map((item, i) => (
          <div key={item.title} className={`p-8 rounded-3xl glass hover-lift animate-fade-in-up stagger-${i + 1}`}>
            <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${item.gradient} flex items-center justify-center mb-6`}>
              <item.icon size={26} className="text-white" />
            </div>
            <h3 className="font-extrabold text-xl mb-3">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* What We Cover */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <div className="tag glass text-primary mx-auto mb-4 w-fit">
            <BookOpen size={12} />
            Our Content
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            What We <span className="gradient-text">Cover</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {values.map((item, i) => (
            <div key={item.title} className={`group p-6 rounded-3xl glass hover-lift animate-fade-in-up stagger-${(i % 5) + 1}`}>
              <div className={`w-11 h-11 rounded-xl bg-linear-to-br ${item.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <Newsletter />
    </div>
  );
}
