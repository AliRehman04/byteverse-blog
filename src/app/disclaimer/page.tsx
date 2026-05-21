import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Disclaimer | Affiliate Disclosure & Content Notice",
  description: `Read the ByteVerse disclaimer covering affiliate disclosures, advertising policies, content accuracy, and professional advice limitations.`,
  alternates: {
    canonical: `${siteConfig.url}/disclaimer`,
  },
};

export default function DisclaimerPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
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
            Disclaimer
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
        <p>Last updated: July 11, 2025</p>

        <h2>General Disclaimer</h2>
        <p>
          The information on {siteConfig.name} is for general informational
          purposes only. While we strive to keep information current and
          accurate, we make no representations or warranties about
          completeness, accuracy, or reliability.
        </p>

        <h2>Affiliate Disclosure</h2>
        <p>
          {siteConfig.name} participates in affiliate programs. Links to
          products and services may be affiliate links. If you purchase through
          these links, we may earn a commission at no additional cost to you.
          Our recommendations are based on genuine experience and research.
        </p>

        <h2>Advertising</h2>
        <p>
          We display advertisements through Google AdSense and other networks.
          These ads are clearly distinguished from editorial content.
        </p>

        <h2>Professional Advice</h2>
        <p>
          Our content does not constitute professional advice. Always consult
          qualified professionals for specific needs.
        </p>

        <h2>Contact</h2>
        <p>
          For questions about this disclaimer, contact{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </div>
    </div>
    </>
  );
}
