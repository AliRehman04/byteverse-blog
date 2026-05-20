import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy — How We Protect Your Data",
  description:
    "Read the ByteVerse privacy policy covering data collection, cookies, analytics, newsletter emails, and how your information is protected.",
  alternates: {
    canonical: `${siteConfig.url}/privacy`,
  },
};

export default function PrivacyPage() {
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
    </>
  );
}
