import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service | Rules & Guidelines",
  description: `Review the ByteVerse terms of service covering content usage, affiliate links, intellectual property, user responsibilities, and site disclaimers.`,
  alternates: {
    canonical: `${siteConfig.url}/terms`,
  },
};

export default function TermsPage() {
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
        <p>Last updated: May 23, 2026</p>

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

        <h2>Free Developer Tools</h2>
        <p>
          {siteConfig.name} provides a collection of free browser-based
          developer and SEO tools. By using these tools, you agree to the
          following:
        </p>
        <ul>
          <li>
            Tools are provided &quot;as is&quot; without warranty of any kind,
            express or implied.
          </li>
          <li>
            You are solely responsible for the data you input and the results
            you use. We are not liable for any loss, damage, or issue arising
            from tool usage.
          </li>
          <li>
            Most tools run entirely in your browser. Certain tools (e.g., AI
            Content Detector, Plagiarism Checker) may transmit your input to
            third-party APIs for processing.
          </li>
          <li>
            Do not input sensitive, confidential, or personally identifiable
            information into any tool unless you understand and accept the
            associated risks.
          </li>
          <li>
            We reserve the right to modify, discontinue, or limit access to
            any tool at any time without prior notice.
          </li>
        </ul>

        <h2>User Content &amp; Input</h2>
        <p>
          Any text, code, or data you enter into our tools is processed to
          deliver the requested output. We do not store, log, or use your tool
          inputs for any other purpose. You retain all rights to your input
          data.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All original content, design, branding, and tool interfaces on{" "}
          {siteConfig.name} are our property. Do not reproduce, redistribute,
          or create derivative works without written permission.
        </p>

        <h2>Affiliate Links &amp; Sponsored Content</h2>
        <p>
          Some links on our site are affiliate links. We may earn a commission
          at no extra cost to you. Sponsored content is clearly labeled. This
          does not affect our editorial integrity or tool recommendations.
        </p>

        <h2>Prohibited Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use automated scripts or bots to access tools or scrape content</li>
          <li>Attempt to reverse-engineer, exploit, or overload our services</li>
          <li>Use our tools for any unlawful or harmful purpose</li>
          <li>Misrepresent tool outputs as guaranteed or certified results</li>
        </ul>

        <h2>Service Availability</h2>
        <p>
          We aim to keep {siteConfig.name} and all tools available 24/7, but
          we do not guarantee uninterrupted access. Downtime may occur due to
          maintenance, updates, or factors beyond our control. We are not
          liable for any losses caused by service interruptions.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, {siteConfig.name}, its
          owner, and contributors shall not be liable for any direct, indirect,
          incidental, consequential, or punitive damages arising from the use
          of our website, content, or tools.
        </p>

        <h2>Changes to Terms</h2>
        <p>
          We may update these terms at any time. Changes take effect
          immediately upon posting. Continued use of the site constitutes
          acceptance of the updated terms.
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
