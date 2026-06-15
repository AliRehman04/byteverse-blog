import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  publisher: "ByteVerse",
  keywords: ["privacy policy", "data protection", "cookies policy"],
  title: "Privacy Policy | How We Protect Your Data",
  description:
    "Read the ByteVerse privacy policy covering data collection, cookies, analytics, newsletter emails, and how your information is protected.",
  alternates: {
    canonical: `${siteConfig.url}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <>
      <section className="hero-bg relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 md:py-18">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Privacy Policy
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

        <h2>Information We Collect</h2>
        <p>
          We collect information you provide directly, such as your email
          address when subscribing to our newsletter. We also use analytics to
          understand how visitors use our site.
        </p>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To send newsletter updates (with your consent)</li>
          <li>To improve our website and content</li>
          <li>To analyze site traffic and usage patterns</li>
        </ul>

        <h2>Free Developer Tools &mdash; Data Processing</h2>
        <p>
          {siteConfig.name} offers a collection of free browser-based developer
          tools (JSON Formatter, Password Generator, Regex Tester, Code
          Formatter, etc.). The vast majority of these tools process your data
          entirely within your browser (client-side). No data you enter into
          these tools is transmitted to our servers or stored by us unless
          explicitly stated on the tool&apos;s page.
        </p>
        <p>
          Certain tools&mdash;such as the AI Content Detector, Plagiarism
          Checker, and Plagiarism Remover&mdash;may send the text you provide
          to third-party AI or analysis APIs to generate results. This data is
          transmitted securely and is not stored by us after processing. We do
          not use your tool inputs for training, advertising, or any purpose
          other than delivering the requested result.
        </p>

        <h2>Third-Party Services</h2>
        <p>We use the following third-party services that may collect data:</p>
        <ul>
          <li><strong>Google Analytics</strong> &mdash; traffic and usage analysis</li>
          <li><strong>Google AdSense</strong> &mdash; personalized advertising</li>
          <li><strong>Vercel</strong> &mdash; hosting and edge functions</li>
          <li><strong>Neon (PostgreSQL)</strong> &mdash; database for blog content (does not store user data)</li>
        </ul>
        <p>
          These services may use cookies or similar technologies to collect
          data. Please refer to their respective privacy policies for details.
        </p>

        <h2>Cookies</h2>
        <p>
          Our site uses cookies to enhance your experience, including:
        </p>
        <ul>
          <li><strong>Essential cookies</strong> &mdash; theme preference, session management</li>
          <li><strong>Analytics cookies</strong> &mdash; Google Analytics for traffic data</li>
          <li><strong>Advertising cookies</strong> &mdash; Google AdSense for relevant ads</li>
        </ul>
        <p>You can control cookie settings through your browser preferences.</p>

        <h2>Data Retention</h2>
        <p>
          Newsletter subscriber emails are retained until you unsubscribe.
          Analytics data is retained according to Google Analytics&apos; default
          retention policies. We do not store data entered into our developer
          tools.
        </p>

        <h2>Your Rights (GDPR / CCPA)</h2>
        <p>
          Depending on your jurisdiction, you may have the right to:
        </p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction or deletion of your data</li>
          <li>Opt out of data collection or marketing emails</li>
          <li>Request a copy of your data in a portable format</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>. We
          will respond within 30 days.
        </p>

        <h2>Children&apos;s Privacy</h2>
        <p>
          Our site is not directed to children under 13. We do not knowingly
          collect personal information from children. If you believe a child
          has provided us with personal data, please contact us.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. Changes will be posted
          on this page with an updated date. Continued use of the site after
          changes constitutes acceptance.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy-related questions, email us at{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </div>
    </div>
    </>
  );
}
