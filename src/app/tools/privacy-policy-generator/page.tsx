import type { Metadata } from "next";
import { PrivacyPolicyTool } from "./privacy-policy-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Privacy Policy Generator",
  title: "Privacy Policy Generator - Free Online Tool",
  description: "Generate a customized privacy policy for your website or app in seconds. Covers cookies, analytics, newsletter signups, user accounts, and GDPR basics. Download as Markdown.",
  slug: "privacy-policy-generator",
  keywords: ["privacy policy generator", "free privacy policy", "privacy policy template", "website privacy policy", "gdpr privacy policy", "privacy policy maker"],
  faqs: [
    { question: "Is this privacy policy legally binding?", answer: "This tool generates a template for informational purposes. While it covers common requirements, you should have a qualified attorney review your privacy policy to ensure it complies with all applicable laws (GDPR, CCPA, etc.)." },
    { question: "Does this generator cover GDPR requirements?", answer: "The generated policy includes key GDPR elements such as data collection transparency, user rights (access, correction, deletion, portability), data retention, and contact information. However, full GDPR compliance may require additional provisions specific to your business." },
    { question: "Can I customize the generated policy?", answer: "Yes. The tool generates Markdown text that you can copy and edit freely. Use the checkboxes to include or exclude sections based on what applies to your website." },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Privacy Policy Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Generate a professional privacy policy for your website in seconds. Fill in your details, select what applies, and download.</p>
      </div>
      <PrivacyPolicyTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Why You Need a Privacy Policy</h2>
        <p>A privacy policy is required by law in most jurisdictions if your website collects any personal data. It builds trust with your users and helps you comply with regulations like GDPR, CCPA, and PIPEDA.</p>
        <h2>What Should a Privacy Policy Include?</h2>
        <ul>
          <li>What personal data you collect</li>
          <li>How you use the data</li>
          <li>Who you share data with</li>
          <li>How you protect user data</li>
          <li>User rights regarding their data</li>
          <li>Cookie and tracking disclosures</li>
          <li>Contact information for privacy inquiries</li>
        </ul>
      </section>
      <section className="mt-12 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Frequently Asked Questions</h2>
        {toolConfig.faqs.map((faq, i) => (
          <div key={i}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
