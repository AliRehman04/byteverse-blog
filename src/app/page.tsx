import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen, Cpu, TrendingUp } from "lucide-react";
import { Newsletter } from "@/components/newsletter";
import { siteConfig } from "@/lib/config";

const features = [
  {
    icon: Sparkles,
    title: "AI Tool Reviews",
    description: "In-depth reviews of the latest AI tools to supercharge your workflow.",
  },
  {
    icon: BookOpen,
    title: "Step-by-Step Guides",
    description: "Easy-to-follow tutorials on trending tech topics and frameworks.",
  },
  {
    icon: Cpu,
    title: "Coding Tutorials",
    description: "Learn modern programming with practical, real-world examples.",
  },
  {
    icon: TrendingUp,
    title: "Productivity Hacks",
    description: "Tips and strategies to 10x your productivity with the right tools.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles size={16} />
              Your Tech Knowledge Hub
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
              Explore the{" "}
              <span className="gradient-text">Future of Tech</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover AI tools, master new technologies, and boost your
              productivity with expert guides, tutorials, and honest reviews.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Start Reading <ArrowRight size={16} />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 px-8 py-3.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
              >
                Browse Categories
              </Link>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-150 bg-linear-to-b from-primary/5 to-transparent rounded-full blur-3xl -z-10" />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            What You&apos;ll Find Here
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We cover everything tech — from cutting-edge AI tools to practical
            coding tutorials.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Explore Categories</h2>
          <p className="text-muted-foreground">
            Find exactly what you&apos;re looking for
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {siteConfig.categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="group p-6 rounded-2xl border border-border hover:border-primary/30 bg-card hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <Newsletter />
      </section>
    </>
  );
}
