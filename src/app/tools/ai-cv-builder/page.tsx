import type { Metadata } from "next";
import Link from "next/link";
import { AICVBuilderTool } from "./ai-cv-builder-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "AI CV Builder",
  title: "AI CV Builder - Free Resume Maker with PDF Download",
  description:
    "Create a modern ATS-friendly CV online with visual editing, JSON code mode, templates, AI writing help, profile photo support, section reordering, and PDF download.",
  slug: "ai-cv-builder",
  applicationCategory: "BusinessApplication",
  audience: "Job seekers, students, freelancers, developers, and professionals creating resumes or CVs",
  featureList: [
    "Visual CV editor",
    "ATS-friendly resume template",
    "Modern CV templates",
    "JSON code mode",
    "AI summary and bullet rewriting",
    "Profile image upload",
    "Section reordering",
    "Browser PDF export",
  ],
  keywords: [
    "ai cv builder",
    "ai resume builder",
    "free cv maker",
    "resume builder pdf",
    "online cv editor",
    "modern resume template",
    "ats resume builder",
    "cv pdf download",
    "ats friendly cv builder",
    "ai resume pdf maker",
    "free online cv builder",
  ],
  faqs: [
    {
      question: "Can I download the CV as a PDF?",
      answer:
        "Yes. The tool can export your CV preview as a PDF directly in the browser. You can also use your browser print dialog if you want manual control over page settings.",
    },
    {
      question: "Is the AI CV Builder free to use?",
      answer:
        "Yes. The editor, templates, visual customization, code mode, and browser PDF export are free to use. AI writing actions depend on the server-side AI provider configuration.",
    },
    {
      question: "Is this CV builder ATS friendly?",
      answer:
        "The builder includes ATS-focused layouts with clean headings, readable sections, and straightforward structure. For strict applicant tracking systems, use the ATS template and avoid overly decorative layouts.",
    },
    {
      question: "Does the AI CV Builder have visual and code modes?",
      answer:
        "Yes. Visual mode lets you edit fields, sections, templates, colors, spacing, and layout. Code mode exposes the resume JSON so advanced users can edit the structure directly.",
    },
    {
      question: "Can AI improve my summary and bullet points?",
      answer:
        "Yes. If XAI_API_KEY or GROQ_API_KEY is configured on the server, AI actions can rewrite summaries, improve bullets, and tailor content to a job description. Without an API key, the editor still works normally.",
    },
    {
      question: "Can I recreate a CV from a reference image?",
      answer:
        "The tool supports reference image upload for visual matching guidance. For legal and quality reasons, use only resumes or designs you own or have permission to use, and treat AI layout matching as a starting point for customization.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function AICVBuilderPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Hero Header */}
      <div className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-6 py-12 text-center text-white shadow-2xl shadow-indigo-500/20 sm:px-10 sm:py-16" style={{
        background: "linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed), radial-gradient(ellipse 300px 300px at 0% 0%, rgba(255,255,255,0.1), transparent 70%), radial-gradient(ellipse 200px 200px at 100% 100%, rgba(255,255,255,0.05), transparent 70%)",
      }}>
        <div className="relative">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
            Free &middot; No Sign-up Required
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">AI CV Builder</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100 sm:text-xl">
            Create a stunning, ATS-friendly resume in minutes. Visual editor, 6 premium templates, AI writing, and instant PDF download.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">✓ Visual &amp; Code Mode</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">✓ AI-Powered Writing</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">✓ PDF Export</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">✓ ATS-Friendly</span>
          </div>
        </div>
      </div>

      <AICVBuilderTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Build a Modern CV Online</h2>
        <p>
          A strong CV should be clear, readable, and easy to tailor for each role. This builder stores your resume as structured JSON, renders it into editable templates, and lets you switch between visual controls and code mode whenever you need deeper control.
        </p>
        <p>
          The goal is simple: create a polished CV without fighting a word processor. You can start from a complete sample profile, rewrite the content for your own experience, adjust the visual style, and export a PDF when the resume is ready to send.
        </p>
        <h2>What You Can Customize</h2>
        <ul>
          <li><strong>Templates</strong> - modern, sidebar, and ATS-friendly layouts</li>
          <li><strong>Sections</strong> - add, edit, remove, and reorder resume content</li>
          <li><strong>Design</strong> - accent color, fonts, spacing, scale, photo, and page size</li>
          <li><strong>AI writing</strong> - improve summaries, bullets, and job-specific wording</li>
          <li><strong>PDF export</strong> - download the final preview as a PDF from your browser</li>
        </ul>
        <h2>Who This CV Builder Is For</h2>
        <p>
          This tool is built for job seekers who want a practical resume workflow: students applying for internships, developers updating a portfolio CV, freelancers preparing client proposals, and professionals who need a clean PDF quickly. If you want a deeper comparison of resume software, read our guide to the <Link href="/blog/best-ai-resume-builders-2026">best AI resume builders in 2026</Link>.
        </p>
        <h2>ATS-Friendly Resume Tips</h2>
        <ul>
          <li><strong>Use clear section names</strong> - experience, education, skills, projects, and certifications are easy for recruiters and ATS tools to parse.</li>
          <li><strong>Keep bullet points specific</strong> - include tools, outcomes, numbers, and business impact instead of generic responsibility lists.</li>
          <li><strong>Match the role carefully</strong> - tailor your summary, skills, and strongest achievements to the job description before exporting.</li>
          <li><strong>Prefer readable layouts</strong> - visual templates are useful, but the ATS template is the safest pick for online applications.</li>
        </ul>
        <h2>AI and Reference CV Matching</h2>
        <p>
          You can upload a profile photo and keep a reference CV image beside the editor while you rebuild a similar layout. Use only designs you own or have permission to use. Exact copying of someone else&apos;s CV design or personal data can create privacy and copyright issues, so the tool is designed for editable inspiration and customization.
        </p>
        <h2>Privacy and Editing Notes</h2>
        <p>
          Resume data is edited in the browser as structured form fields and JSON. Avoid pasting private data into AI prompts unless you are comfortable with the configured AI provider handling that text. For sensitive roles, remove addresses, phone numbers, references, and private employer details before using AI rewrite actions.
        </p>
        <h2>Frequently Asked Questions</h2>
        <h3>Can I use this as a resume builder instead of a CV builder?</h3>
        <p>
          Yes. The same editor works for resumes and CVs. Use shorter sections, stronger bullet points, and the ATS template if you are applying through online job portals.
        </p>
        <h3>Does the PDF export work without an account?</h3>
        <p>
          Yes. The PDF export runs in the browser, so you can create and download a resume without creating an account.
        </p>
        <h3>What should I do before sending the final CV?</h3>
        <p>
          Proofread every AI-assisted sentence, check dates and job titles, confirm the PDF layout, and tailor the summary and skills to the specific role.
        </p>
      </section>
    </main>
  );
}