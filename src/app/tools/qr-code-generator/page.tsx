import type { Metadata } from "next";
import { QrCodeGeneratorTool } from "./qr-code-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "QR Code Generator",
  title: "QR Code Generator - Free Online QR Maker",
  description:
    "Generate custom QR codes for URLs, text, WiFi, email, and phone numbers. Choose colors, size, and error correction. Download as PNG or SVG. 100% free, no sign-up.",
  slug: "qr-code-generator",
  keywords: [
    "qr code generator",
    "free qr code maker",
    "qr code creator",
    "custom qr code",
    "qr code online",
    "generate qr code",
    "wifi qr code",
    "qr code download",
  ],
  faqs: [
    {
      question: "How does this QR code generator work?",
      answer:
        "It encodes your text using the QR code algorithm entirely in your browser. No data is sent to any server. The QR is rendered on an HTML canvas for instant preview and download.",
    },
    {
      question: "What content types can I encode?",
      answer:
        "You can encode URLs, plain text, email addresses (mailto:), phone numbers (tel:), WiFi credentials (WIFI:T:WPA;S:Name;P:pass;;), and any other text up to 2,953 characters.",
    },
    {
      question: "What is error correction level?",
      answer:
        "Error correction lets a QR code remain scannable even if part of it is damaged. Level L recovers 7%, M recovers 15%, Q recovers 25%, and H recovers 30% of data. Higher levels make the QR denser.",
    },
    {
      question: "Can I customize the colors?",
      answer:
        "Yes. Pick from 8 color presets or use custom foreground and background colors. For best scanning results, keep a high contrast between foreground and background.",
    },
    {
      question: "What formats can I download?",
      answer:
        "You can download as PNG (raster) or SVG (vector). SVG is ideal for print because it scales to any size without losing quality.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function QrCodeGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          QR Code Generator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Create custom QR codes for URLs, text, WiFi, email, and more.
          Download as PNG or SVG. Everything runs in your browser — no data
          leaves your device.
        </p>
      </div>

      <QrCodeGeneratorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>What Is a QR Code?</h2>
        <p>
          A QR (Quick Response) code is a two-dimensional barcode that stores
          data in a grid of black and white squares. Smartphones can scan QR
          codes with their camera to instantly open URLs, connect to WiFi, save
          contacts, or read text.
        </p>

        <h2>Common Use Cases</h2>
        <ul>
          <li>
            <strong>Website links</strong> — Share URLs on printed materials,
            business cards, or posters
          </li>
          <li>
            <strong>WiFi sharing</strong> — Let guests connect without typing
            the password
          </li>
          <li>
            <strong>Contact info</strong> — Encode vCard data for easy contact
            saving
          </li>
          <li>
            <strong>Payments</strong> — Link to payment pages or crypto
            addresses
          </li>
          <li>
            <strong>Event tickets</strong> — Unique codes for check-in and
            verification
          </li>
        </ul>

        <h2>Tips for Better QR Codes</h2>
        <ul>
          <li>
            <strong>Keep URLs short</strong> — Shorter data produces simpler,
            easier-to-scan QR codes
          </li>
          <li>
            <strong>High contrast</strong> — Dark modules on a light background
            scan best. Avoid low-contrast color combos
          </li>
          <li>
            <strong>Use error correction</strong> — Level M (15%) is a good
            default. Use H (30%) if the code might be partially covered
          </li>
          <li>
            <strong>Test before printing</strong> — Always scan your QR code
            with a phone before mass printing
          </li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is this QR code generator free?</h3>
        <p>
          Yes, completely free with no limits, no watermarks, and no sign-up
          required. Your data never leaves your browser.
        </p>
        <h3>Do the QR codes expire?</h3>
        <p>
          No. QR codes generated here are static — they encode data directly and
          work forever. There is no tracking URL or expiration.
        </p>
        <h3>What is the maximum data a QR code can hold?</h3>
        <p>
          A QR code can hold up to 2,953 bytes of data (alphanumeric mode allows
          more characters). For most use cases like URLs and short text, this is
          more than enough.
        </p>
        <h3>Should I use PNG or SVG?</h3>
        <p>
          Use PNG for digital sharing (social media, messaging). Use SVG for
          print materials — it scales to any size without pixelation.
        </p>
      </section>
    </main>
  );
}
