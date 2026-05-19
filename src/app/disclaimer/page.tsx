import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Disclaimer — Affiliate Disclosure & Content Notice | ByteVerse",
  description: `Read the ByteVerse disclaimer covering affiliate disclosures, advertising policies, content accuracy, and professional advice limitations.`,
  alternates: {
    canonical: `${siteConfig.url}/disclaimer`,
  },
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8">
        Disclaimer
      </h1>
      <div className="prose max-w-none">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

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
  );
}
