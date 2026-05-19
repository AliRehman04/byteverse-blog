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
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8">
        Terms of Service
      </h1>
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
  );
}
