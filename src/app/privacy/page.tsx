import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy — How ByteVerse Protects Your Data",
  description: `Read the ByteVerse privacy policy to understand how we collect, use, and protect your personal data, including cookie usage, analytics, and newsletter subscriptions.`,
  alternates: {
    canonical: `${siteConfig.url}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8">
        Privacy Policy
      </h1>
      <div className="prose max-w-none">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

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

        <h2>Third-Party Services</h2>
        <p>
          We use Google Analytics for traffic analysis and Google AdSense for
          advertising. These services may use cookies to collect data. Please
          refer to their respective privacy policies.
        </p>

        <h2>Cookies</h2>
        <p>
          Our site uses cookies to enhance your experience. You can control
          cookie settings through your browser.
        </p>

        <h2>Your Rights</h2>
        <p>
          You can unsubscribe from our newsletter at any time. Contact us to
          request data deletion.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy-related questions, email us at{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </div>
    </div>
  );
}
