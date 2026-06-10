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
      <section className="hero-bg relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
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
        <p>Last updated: May 23, 2026</p>

        <h2>General Disclaimer</h2>
        <p>
          The information on {siteConfig.name} is for general informational
          purposes only. While we strive to keep information current and
          accurate, we make no representations or warranties about
          completeness, accuracy, or reliability.
        </p>

        <h2>Developer Tools Disclaimer</h2>
        <p>
          {siteConfig.name} provides a suite of free developer and SEO tools
          including JSON Formatter, Password Generator, Regex Tester, Code
          Formatter, AI Content Detector, Plagiarism Checker, and others. These
          tools are offered &quot;as is&quot; without any guarantees:
        </p>
        <ul>
          <li>
            <strong>No guarantee of accuracy</strong> &mdash; Tool outputs
            (e.g., AI detection scores, plagiarism results, generated tags) are
            estimates and should not be relied upon as definitive or certified
            results.
          </li>
          <li>
            <strong>No data storage</strong> &mdash; Most tools process data
            client-side in your browser. We do not store, log, or retain data
            you enter into our tools.
          </li>
          <li>
            <strong>Third-party processing</strong> &mdash; Some tools may
            send input to third-party APIs (e.g., AI detection, plagiarism
            checking). We are not responsible for how third-party services
            handle your data.
          </li>
          <li>
            <strong>No liability</strong> &mdash; We are not responsible for
            any consequences resulting from tool outputs, including but not
            limited to incorrect formatting, inaccurate detection results, or
            generated content.
          </li>
        </ul>

        <h2>AI-Generated &amp; AI-Assisted Content</h2>
        <p>
          Some blog posts and tool descriptions on {siteConfig.name} may be
          created or enhanced with the assistance of AI tools. All content is
          reviewed for accuracy before publication. However, AI-generated
          content may contain errors or become outdated. Always verify critical
          information independently.
        </p>

        <h2>Affiliate Disclosure</h2>
        <p>
          {siteConfig.name} participates in affiliate programs including but
          not limited to Amazon Associates, software referral programs, and
          other partnerships. Links to products and services may be affiliate
          links. If you purchase through these links, we may earn a commission
          at no additional cost to you. Our recommendations are based on
          genuine experience and research, and affiliate relationships do not
          influence our editorial opinions.
        </p>

        <h2>Advertising</h2>
        <p>
          We display advertisements through Google AdSense and other ad
          networks. These ads are clearly distinguished from editorial content.
          Ad content is controlled by the respective ad networks and does not
          represent our endorsement.
        </p>

        <h2>External Links</h2>
        <p>
          Our site contains links to external websites and resources. We are
          not responsible for the content, privacy practices, or availability
          of third-party sites. Following external links is at your own risk.
        </p>

        <h2>Professional Advice</h2>
        <p>
          Our content&mdash;including blog posts, reviews, and tool
          outputs&mdash;does not constitute professional, legal, financial, or
          technical advice. Always consult qualified professionals for specific
          needs. Do not make important decisions based solely on information
          from this website.
        </p>

        <h2>Earnings &amp; Results Disclaimer</h2>
        <p>
          Any references to earnings, results, or performance metrics in our
          content are for illustrative purposes only. Individual results vary
          and we make no guarantees about outcomes.
        </p>

        <h2>Changes to This Disclaimer</h2>
        <p>
          We may update this disclaimer at any time. Changes will be reflected
          on this page with an updated date.
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
