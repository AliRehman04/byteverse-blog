import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { ContactForm } from "./contact-form";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact | ByteVerse",
  description:
    "Contact ByteVerse for questions, feedback, corrections, partnerships, and technology blog inquiries.",
  alternates: {
    canonical: `${siteConfig.url}/contact`,
  },
  openGraph: {
    title: "Contact ByteVerse | Tech Blog Support",
    description:
      "Reach ByteVerse for questions, corrections, feedback, partnerships, and technology blog inquiries.",
    url: `${siteConfig.url}/contact`,
    type: "website",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: "Contact ByteVerse" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact ByteVerse | Tech Blog Support",
    description:
      "Reach ByteVerse for questions, corrections, feedback, partnerships, and technology blog inquiries.",
    images: [siteConfig.ogImage],
  },
};

export default function ContactPage() {
  const contactLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact ByteVerse",
    description: "Contact ByteVerse for questions, feedback, corrections, partnerships, and technology blog inquiries.",
    url: `${siteConfig.url}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      contactPoint: {
        "@type": "ContactPoint",
        email: siteConfig.email,
        contactType: "customer support",
        areaServed: "Worldwide",
        availableLanguage: "English",
      },
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactLd) }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-start">
        <section>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Contact</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
            Get in touch with ByteVerse
          </h1>
          <p className="text-muted-foreground leading-relaxed text-base md:text-lg mb-8">
            Got a question, spotted an error, or want to suggest a topic? Drop us a message. We read every one and typically reply within 24 hours. ByteVerse welcomes feedback on our AI tool reviews, coding tutorials, developer tools, and productivity guides from readers, creators, and tech professionals worldwide.
          </p>

          <div className="space-y-4">
            <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <h2 className="font-bold mb-1">Email</h2>
                <Link href={`mailto:${siteConfig.email}`} className="text-sm text-primary font-semibold break-all">
                  {siteConfig.email}
                </Link>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="font-bold mb-1">Editorial Requests</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Share corrections, source updates, review requests, or ideas for new tutorials.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="font-bold mb-1">Privacy</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Contact details are used only to reply to your message.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Contact form">
          <ContactForm />
        </section>
      </div>

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Why Contact ByteVerse?</h2>
        <p>ByteVerse is a community-driven tech blog that covers AI tools, coding tutorials, productivity tips, software reviews, and cybersecurity guides. We value reader feedback and use it to improve our content, fix inaccuracies, and prioritize new topics.</p>
        <h2>What We Can Help With</h2>
        <ul>
          <li><strong>Content corrections</strong> — Spotted an error in one of our articles? Let us know and we will fix it promptly.</li>
          <li><strong>Topic suggestions</strong> — Have a tool or technology you want us to review? We prioritize reader requests when planning new content.</li>
          <li><strong>Partnership inquiries</strong> — Interested in guest posting, sponsored content, or cross-promotion? Reach out with your proposal.</li>
          <li><strong>Technical questions</strong> — While we cannot provide personal tech support, we may turn common questions into full blog posts or tutorials.</li>
          <li><strong>Bug reports</strong> — Found a broken link, layout issue, or tool bug? We appreciate reports that help us improve the site experience.</li>
        </ul>
        <p>We typically respond within 24 hours on business days. For urgent matters, email us directly at <a href="mailto:contact@byteverse.fyi">contact@byteverse.fyi</a>.</p>
      </section>
    </main>
  );
}