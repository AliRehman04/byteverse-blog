import type { Metadata } from "next";
import { Target, Users, Heart, Mail, Shield, Search } from "lucide-react";
import { LazyNewsletter } from "@/components/lazy-newsletter";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "About | Your Trusted Tech Knowledge Hub",
  description:
    "ByteVerse is a tech blog run by Ali Rehman. We test AI tools, write coding guides, and share what actually works.",
  openGraph: {
    title: "About ByteVerse | Your Trusted Tech Knowledge Hub",
    description:
      "ByteVerse is a tech blog run by Ali Rehman. We test AI tools, write coding guides, and share what actually works.",
    url: `${siteConfig.url}/about`,
    type: "website",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "About ByteVerse" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About | Your Trusted Tech Knowledge Hub",
    description:
      "ByteVerse is a tech blog run by Ali Rehman. We test AI tools, write coding guides, and share what actually works.",
    images: [siteConfig.ogImage],
  },
  alternates: {
    canonical: `${siteConfig.url}/about`,
  },
};

const values = [
  { title: "AI Tools & Reviews", description: "We install, test, and compare AI tools like ChatGPT, Claude, Midjourney, then tell you what's actually good.", color: "from-violet-500/10 to-purple-500/10" },
  { title: "Tech Guides", description: "From spinning up a VPS to deploying a Next.js app. Follow-along guides that work.", color: "from-blue-500/10 to-cyan-500/10" },
  { title: "Productivity", description: "Notion setups, Obsidian workflows, and tools that save you real hours.", color: "from-emerald-500/10 to-teal-500/10" },
  { title: "Coding Tutorials", description: "JavaScript, Python, React tutorials. Real projects you can build and learn from.", color: "from-amber-500/10 to-orange-500/10" },
  { title: "Software Reviews", description: "Honest side-by-side comparisons so you pick the right tool, not the hyped one.", color: "from-pink-500/10 to-rose-500/10" },
];

export default function AboutPage() {
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About ByteVerse",
    description: "ByteVerse is a tech blog run by Ali Rehman covering AI tools, coding tutorials, and productivity guides.",
    url: `${siteConfig.url}/about`,
    mainEntity: {
      "@type": "Person",
      name: "Ali Rehman",
      jobTitle: "Founder & Editor",
      url: `${siteConfig.url}/about`,
      worksFor: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }}
      />
      {/* Page Header */}
      <section className="hero-bg relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-blue-300 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              About Us
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              About ByteVerse
            </h1>
            <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed">
              A tech blog that skips the filler. We test tools, write code, and
              share what we learn — straight up. ByteVerse publishes expert-tested reviews of AI tools, hands-on coding tutorials, productivity workflows, and free browser-based developer utilities for students, developers, and tech professionals.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-[#f1f5f9] dark:fill-[#141416]" />
          </svg>
        </div>
      </section>

      {/* Mission Cards */}
      <section className="section-alt border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="sr-only">What ByteVerse Stands For</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Target, title: "Our Mission", desc: "Break down complex tech into clear, usable guides. If you can't follow along, we rewrote it." },
              { icon: Users, title: "Our Audience", desc: "Students learning to code, developers exploring new tools, and anyone trying to get more done with tech." },
              { icon: Heart, title: "Our Promise", desc: "No sponsored rankings. No recycled press releases. If we recommend something, we've used it ourselves." },
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

      {/* Author & E-E-A-T Section */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Meet the Founder</p>
          <h2 className="text-2xl font-bold tracking-tight">
            Who&apos;s Behind <span className="gradient-text">ByteVerse</span>
          </h2>
        </div>

        <div className="p-6 md:p-8 rounded-2xl border border-border bg-card">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-primary">AR</span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Ali Rehman</h3>
              <p className="text-sm text-primary font-medium mb-3">Founder & Editor</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                I’m a self-taught developer who got tired of reading AI tool “lists” that were clearly written by someone who never opened the tool. So I started ByteVerse, a place where I test things myself, write about what I find, and share the code that actually works. Every guide on this site comes from my own experience building projects, trying apps, and figuring things out the hard way.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail size={14} />
                <a href={`mailto:${siteConfig.email}`} className="hover:text-primary transition-colors">
                  {siteConfig.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Process */}
      <section className="section-alt border-y border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Our Standards</p>
            <h2 className="text-2xl font-bold tracking-tight">
              How We <span className="gradient-text">Work</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Search, title: "Research First", desc: "Every tool gets installed and used before we write about it. Screenshots are real. Opinions are honest." },
              { icon: Shield, title: "No Paid Reviews", desc: "Nobody pays us to say nice things. If a tool is bad, we say so. If it's great, we explain exactly why." },
              { icon: Heart, title: "Written for Humans", desc: "We write like we're explaining to a friend. No buzzword walls, no filler paragraphs, just the stuff you need." },
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
          <LazyNewsletter />
        </div>
      </section>
    </>
  );
}
