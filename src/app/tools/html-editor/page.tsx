import type { Metadata } from "next";
import { HtmlEditorTool } from "./html-editor-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Live HTML Editor",
  title: "Live HTML Editor - Free Online HTML/CSS/JS Playground",
  description:
    "Write HTML, CSS, and JavaScript with instant live preview. 7 ready-made templates, split-pane editor, mobile preview, fullscreen mode. 100% free, private, runs in your browser.",
  slug: "html-editor",
  keywords: [
    "html editor",
    "live html editor",
    "html playground",
    "online html editor",
    "html css editor",
    "html preview",
    "code editor online",
    "html css javascript editor",
  ],
  faqs: [
    {
      question: "How does the live preview work?",
      answer:
        "As you type HTML, CSS, or JavaScript in the editor, the preview panel updates instantly using a sandboxed iframe. Your code runs entirely in your browser with no server involved.",
    },
    {
      question: "Can I use JavaScript in the editor?",
      answer:
        "Yes. You can include inline scripts or script tags in your HTML. JavaScript runs inside a sandboxed iframe for security, so it cannot access your browser data or navigate away from the page.",
    },
    {
      question: "Is my code saved or sent anywhere?",
      answer:
        "No. All code stays in your browser. Nothing is uploaded, stored, or shared with any server. You can download your work as an HTML file at any time.",
    },
    {
      question: "What templates are available?",
      answer:
        "The editor includes 7 templates: Starter Page, Profile Card, Contact Form, CSS Grid Gallery, Responsive Navbar, CSS Animation, and Mini Landing Page. Each template is fully editable.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function HtmlEditorPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Live HTML Editor
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Write HTML, CSS, and JavaScript with instant live preview. Choose from
          7 templates or start from scratch. Fullscreen mode, mobile preview, and
          one-click download.
        </p>
      </div>
      <HtmlEditorTool />
      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Features</h2>
        <ul>
          <li>
            <strong>Instant Preview</strong> — See your HTML rendered in
            real-time as you type
          </li>
          <li>
            <strong>7 Templates</strong> — Profile card, contact form, CSS grid
            gallery, animations, landing page, and more
          </li>
          <li>
            <strong>Split Layouts</strong> — Switch between side-by-side and
            stacked views
          </li>
          <li>
            <strong>Mobile Preview</strong> — Test responsiveness at 375px width
          </li>
          <li>
            <strong>Fullscreen Mode</strong> — Maximize your workspace for
            distraction-free coding
          </li>
          <li>
            <strong>Download HTML</strong> — Export your creation as a standalone
            HTML file
          </li>
          <li>
            <strong>Tab Support</strong> — Press Tab to indent code with 2
            spaces
          </li>
          <li>
            <strong>Line Numbers</strong> — Navigate code easily with visible
            line numbers
          </li>
        </ul>
        <h2>Use Cases</h2>
        <p>
          This editor is perfect for quickly prototyping HTML/CSS layouts,
          testing CSS animations, learning web development, preparing code
          snippets for presentations, or building small standalone web pages
          without setting up a development environment.
        </p>
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
