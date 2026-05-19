import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service — Rules & Guidelines",
  description: `Review the ByteVerse terms of service covering content usage, affiliate links, intellectual property, user responsibilities, and site disclaimers.`,
  alternates: {
    canonical: `${siteConfig.url}/terms`,
  },
};

export default function TermsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 md:py-18">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Terms of Service
          </h1>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
          </svg>
        </div>
      </section>
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="prose max-w-none">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2>Acceptance of Terms</h2>
        <p>
          By accessing {siteConfig.name}, you agree to these terms. If you
          disagree, please do not use our site.
        </p>

        <h2>Content</h2>
        <p>
          All content is for informational purposes only. We strive for
          accuracy but make no guarantees. Use information at your own risk.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All original content, design, and branding on {siteConfig.name} are
          our property. Do not reproduce without permission.
        </p>

        <h2>Affiliate Links</h2>
        <p>
          Some links on our site are affiliate links. We may earn a commission
          at no extra cost to you. This does not affect our editorial integrity.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          {siteConfig.name} is not liable for any damages arising from the use
          of our website or content.
        </p>

        <h2>Contact</h2>
        <p>
          Questions? Email us at{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </div>
    </div>
    </>
  );
}
