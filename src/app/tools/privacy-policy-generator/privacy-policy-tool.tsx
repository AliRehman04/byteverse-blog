"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface FormData {
  companyName: string;
  websiteUrl: string;
  contactEmail: string;
  effectiveDate: string;
  collectsPersonalInfo: boolean;
  usesCookies: boolean;
  usesAnalytics: boolean;
  hasNewsletterSignup: boolean;
  allowsUserAccounts: boolean;
  sellsProducts: boolean;
  targetsChildren: boolean;
  usesThirdPartyAds: boolean;
}

function generatePolicy(data: FormData): string {
  const date = data.effectiveDate || new Date().toISOString().split("T")[0];
  const name = data.companyName || "[Company Name]";
  const url = data.websiteUrl || "[Website URL]";
  const email = data.contactEmail || "[email@example.com]";

  let policy = `# Privacy Policy

**Effective Date:** ${date}

## Introduction

Welcome to ${name}. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our website at ${url}.

## Information We Collect

`;

  if (data.collectsPersonalInfo) {
    policy += `### Personal Information

We may collect the following personal information:

- **Contact Information:** Name, email address, and other contact details you provide voluntarily.
`;
    if (data.allowsUserAccounts) {
      policy += `- **Account Information:** Username, password (stored in hashed form), and profile details when you create an account.
`;
    }
    if (data.sellsProducts) {
      policy += `- **Payment Information:** Billing address and payment details processed securely through third-party payment processors. We do not store credit card numbers on our servers.
`;
    }
    if (data.hasNewsletterSignup) {
      policy += `- **Newsletter Data:** Email address provided when subscribing to our newsletter.
`;
    }
    policy += "\n";
  }

  policy += `### Automatically Collected Information

When you visit our website, we may automatically collect:

- **Log Data:** IP address, browser type, operating system, referring URLs, pages visited, and timestamps.
`;

  if (data.usesCookies) {
    policy += `- **Cookies:** Small data files stored on your device to improve your browsing experience.
`;
  }
  if (data.usesAnalytics) {
    policy += `- **Analytics Data:** Usage patterns and interaction data collected through analytics services to help us improve our website.
`;
  }

  policy += `
## How We Use Your Information

We use the information we collect for the following purposes:

- To provide, maintain, and improve our website and services.
- To respond to your inquiries, comments, or feedback.
`;

  if (data.hasNewsletterSignup) {
    policy += `- To send newsletters and updates you have subscribed to. You can unsubscribe at any time.
`;
  }
  if (data.usesAnalytics) {
    policy += `- To analyze website usage and trends to improve user experience.
`;
  }
  if (data.sellsProducts) {
    policy += `- To process transactions and send related information, including purchase confirmations and invoices.
`;
  }
  policy += `- To detect, prevent, and address technical issues or security threats.
- To comply with legal obligations.

## Data Sharing and Disclosure

We do not sell your personal information. We may share your data with:

- **Service Providers:** Trusted third-party companies that assist us in operating our website, conducting our business, or servicing you, as long as they agree to keep your information confidential.
`;

  if (data.usesThirdPartyAds) {
    policy += `- **Advertising Partners:** We may share anonymized data with advertising networks to display relevant ads. These partners may use cookies and similar technologies.
`;
  }

  policy += `- **Legal Requirements:** We may disclose your information when required by law, regulation, or legal process.
- **Business Transfers:** In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction.

`;

  if (data.usesCookies) {
    policy += `## Cookies

We use cookies and similar tracking technologies to enhance your experience on our website.

### Types of Cookies We Use

- **Essential Cookies:** Required for the website to function properly.
- **Preference Cookies:** Remember your settings and preferences.
`;
    if (data.usesAnalytics) {
      policy += `- **Analytics Cookies:** Help us understand how visitors interact with our website.
`;
    }
    if (data.usesThirdPartyAds) {
      policy += `- **Advertising Cookies:** Used to deliver relevant advertisements and track ad campaign performance.
`;
    }
    policy += `
You can control cookies through your browser settings. Disabling cookies may affect some website functionality.

`;
  }

  policy += `## Data Security

We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.

## Data Retention

We retain your personal data only for as long as necessary to fulfill the purposes described in this policy, unless a longer retention period is required or permitted by law.

## Your Rights

Depending on your location, you may have the following rights regarding your personal data:

- **Access:** Request a copy of the personal data we hold about you.
- **Correction:** Request correction of inaccurate or incomplete data.
- **Deletion:** Request deletion of your personal data, subject to legal obligations.
- **Opt-Out:** Unsubscribe from marketing communications at any time.
- **Data Portability:** Request your data in a structured, machine-readable format.

To exercise any of these rights, please contact us at ${email}.

`;

  if (data.targetsChildren) {
    policy += `## Children's Privacy

Our website is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13, we will take steps to delete it promptly.

`;
  }

  policy += `## Third-Party Links

Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party websites you visit.

## Changes to This Privacy Policy

We may update this privacy policy from time to time. Any changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically.

## Contact Us

If you have any questions about this privacy policy or our data practices, please contact us at:

- **Email:** ${email}
- **Website:** ${url}
`;

  return policy;
}

export function PrivacyPolicyTool() {
  const [form, setForm] = useState<FormData>({
    companyName: "",
    websiteUrl: "",
    contactEmail: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    collectsPersonalInfo: true,
    usesCookies: true,
    usesAnalytics: true,
    hasNewsletterSignup: false,
    allowsUserAccounts: false,
    sellsProducts: false,
    targetsChildren: false,
    usesThirdPartyAds: false,
  });
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"markdown" | "preview">("preview");

  const policy = generatePolicy(form);

  const update = (key: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const copy = useCallback(async () => {
    if (!policy) return;
    await navigator.clipboard.writeText(policy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [policy]);

  const downloadPolicy = useCallback(() => {
    if (!policy) return;
    const blob = new Blob([policy], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privacy-policy.md";
    a.click();
    URL.revokeObjectURL(url);
  }, [policy]);

  // Simple markdown to HTML for preview
  const policyHtml = policy
    .replace(/^### (.+)$/gm, "<h3 class='text-lg font-semibold mt-6 mb-2'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-xl font-bold mt-8 mb-3'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-2xl font-bold mb-4'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "\n");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Form */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Details</p>

          <div>
            <label className="text-xs font-medium mb-1 block">Company / Website Name</label>
            <input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="ByteVerse" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Website URL</label>
            <input value={form.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} placeholder="https://example.com" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Contact Email</label>
            <input value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} placeholder="privacy@example.com" type="email" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Effective Date</label>
            <input value={form.effectiveDate} onChange={(e) => update("effectiveDate", e.target.value)} type="date" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">What applies to your site?</p>

          {([
            { key: "collectsPersonalInfo" as const, label: "Collects personal information" },
            { key: "usesCookies" as const, label: "Uses cookies" },
            { key: "usesAnalytics" as const, label: "Uses analytics (e.g. Google Analytics)" },
            { key: "hasNewsletterSignup" as const, label: "Has newsletter / email signup" },
            { key: "allowsUserAccounts" as const, label: "Allows user accounts / login" },
            { key: "sellsProducts" as const, label: "Sells products or services" },
            { key: "usesThirdPartyAds" as const, label: "Uses third-party ads" },
            { key: "targetsChildren" as const, label: "May be used by children under 13" },
          ]).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form[key] as boolean}
                onChange={(e) => update(key, e.target.checked)}
                className="rounded border-border"
              />
              {label}
            </label>
          ))}
        </div>

        {/* Output */}
        <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <button onClick={() => setView("preview")} className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${view === "preview" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>Preview</button>
              <button onClick={() => setView("markdown")} className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${view === "markdown" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>Markdown</button>
            </div>
            <div className="flex gap-2">
              <button onClick={copy} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={downloadPolicy} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Download .md
              </button>
            </div>
          </div>

          {view === "markdown" ? (
            <pre className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm font-mono min-h-[32rem] max-h-[32rem] overflow-auto whitespace-pre-wrap leading-relaxed">
              {policy}
            </pre>
          ) : (
            <div
              className="bg-muted/50 border border-border rounded-lg px-6 py-4 text-sm min-h-[32rem] max-h-[32rem] overflow-auto leading-relaxed"
              dangerouslySetInnerHTML={{ __html: policyHtml }}
            />
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
        <strong>Disclaimer:</strong> This tool generates a template privacy policy for informational purposes only. It is not legal advice. You should consult a qualified attorney to ensure your privacy policy complies with applicable laws and regulations.
      </div>
    </div>
  );
}
