"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Check, Code2, Copy, Download, FileImage, FileText, GripVertical, Image, LayoutTemplate, Lightbulb, Loader2, Plus, RotateCcw, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, Wand2, Eye, Palette, Zap } from "lucide-react";

type Template = "modern" | "sidebar" | "ats" | "studio" | "compact" | "executive";
type EditorMode = "visual" | "code";
type ContactKey = "email" | "phone" | "location" | "website";
type SectionKey = "profile" | "skills" | "experience" | "projects" | "education" | "certifications" | "languages" | "custom";
type SkillGroup = { title: string; items: string[] };

type Experience = {
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
};

type Education = {
  school: string;
  degree: string;
  start: string;
  end: string;
};

type Project = {
  name: string;
  description: string;
  link: string;
};

type CustomSection = {
  title: string;
  items: string[];
};

type ResumeData = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  skills: string[];
  skillGroups: SkillGroup[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: string[];
  languages: string[];
  customSections: CustomSection[];
  profileImage: string;
};

type DesignState = {
  template: Template;
  accent: string;
  font: string;
  spacing: "compact" | "normal" | "roomy";
  showPhoto: boolean;
  photoSize: "sm" | "md" | "lg";
  photoShape: "rounded" | "circle" | "square";
  fontSize: "sm" | "md" | "lg";
  lineHeight: "tight" | "normal" | "relaxed";
  margin: "compact" | "normal" | "wide";
  columnWidth: "balanced" | "content" | "sidebar";
  sectionOrder: SectionKey[];
  contactOrder: ContactKey[];
};

type TemplatePreset = {
  value: Template;
  label: string;
  category: string;
  description: string;
  accent: string;
  font: string;
  spacing: DesignState["spacing"];
  fontSize: DesignState["fontSize"];
  lineHeight: DesignState["lineHeight"];
  margin: DesignState["margin"];
  columnWidth: DesignState["columnWidth"];
  sectionOrder: SectionKey[];
};

const defaultSectionOrder: SectionKey[] = ["profile", "skills", "experience", "projects", "education", "certifications", "languages", "custom"];
const defaultContactOrder: ContactKey[] = ["email", "phone", "location", "website"];
const twoColumnOrder: SectionKey[] = ["profile", "experience", "projects", "skills", "education", "certifications", "languages", "custom"];
const compactOrder: SectionKey[] = ["profile", "experience", "skills", "projects", "education", "certifications", "languages", "custom"];

const sectionLabels: Record<SectionKey, string> = {
  profile: "Profile",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  languages: "Languages",
  custom: "Custom sections",
};

const contactLabels: Record<ContactKey, string> = {
  email: "Email",
  phone: "Phone",
  location: "Location",
  website: "Website",
};

const templatePresets: TemplatePreset[] = [
  {
    value: "studio",
    label: "Studio Split",
    category: "Modern two-column",
    description: "Compact left story, right skill groups, strong section rules like a premium developer CV.",
    accent: "#1d9bf0",
    font: "Inter",
    spacing: "compact",
    fontSize: "sm",
    lineHeight: "tight",
    margin: "normal",
    columnWidth: "content",
    sectionOrder: twoColumnOrder,
  },
  {
    value: "executive",
    label: "Executive Bar",
    category: "Senior professional",
    description: "Polished header band, confident spacing, and recruiter-friendly achievement sections.",
    accent: "#0f172a",
    font: "Serif",
    spacing: "normal",
    fontSize: "md",
    lineHeight: "normal",
    margin: "wide",
    columnWidth: "balanced",
    sectionOrder: defaultSectionOrder,
  },
  {
    value: "compact",
    label: "Compact ATS+",
    category: "One page",
    description: "Dense, clean, ATS-friendly layout for candidates with lots of detail.",
    accent: "#2563eb",
    font: "Inter",
    spacing: "compact",
    fontSize: "sm",
    lineHeight: "tight",
    margin: "compact",
    columnWidth: "balanced",
    sectionOrder: compactOrder,
  },
  {
    value: "sidebar",
    label: "Color Rail",
    category: "Photo layout",
    description: "Bold side rail with photo, contact details, and flexible content flow.",
    accent: "#059669",
    font: "Inter",
    spacing: "normal",
    fontSize: "md",
    lineHeight: "normal",
    margin: "normal",
    columnWidth: "sidebar",
    sectionOrder: twoColumnOrder,
  },
  {
    value: "modern",
    label: "Modern Card",
    category: "Creative clean",
    description: "Soft header card with modern color, strong hierarchy, and flexible sections.",
    accent: "#7c3aed",
    font: "Inter",
    spacing: "normal",
    fontSize: "md",
    lineHeight: "normal",
    margin: "normal",
    columnWidth: "balanced",
    sectionOrder: defaultSectionOrder,
  },
  {
    value: "ats",
    label: "Pure ATS",
    category: "Classic",
    description: "Simple one-column structure for conservative roles and parsing systems.",
    accent: "#334155",
    font: "Inter",
    spacing: "normal",
    fontSize: "md",
    lineHeight: "normal",
    margin: "normal",
    columnWidth: "balanced",
    sectionOrder: defaultSectionOrder,
  },
];

const sampleResume: ResumeData = {
  name: "Ali Rehman",
  title: "Frontend Developer",
  email: "ali@example.com",
  phone: "+1 555 123 4567",
  location: "Remote",
  website: "byteverse.fyi",
  summary:
    "Web developer with hands-on experience building responsive, fast, and SEO-friendly websites. Strong focus on clean UI, maintainable code, and practical business results.",
  skills: ["HTML5", "CSS3", "JavaScript", "React", "Next.js", "WordPress", "SEO", "Git"],
  skillGroups: [
    { title: "Web Development", items: ["HTML5", "CSS3", "JavaScript", "React", "Next.js", "Responsive Design"] },
    { title: "WordPress", items: ["Custom Themes", "Elementor", "WooCommerce", "ACF", "Plugin Setup"] },
    { title: "Performance & SEO", items: ["Core Web Vitals", "On-page SEO", "Image Optimization", "Technical Audits"] },
    { title: "Tools", items: ["Git", "Debugging", "Vercel", "cPanel", "Browser DevTools"] },
  ],
  experience: [
    {
      company: "ByteVerse Studio",
      role: "Frontend Developer",
      location: "Remote",
      start: "2024",
      end: "Present",
      bullets: [
        "Built production-ready Next.js pages and tools with reusable components and clean responsive layouts.",
        "Improved SEO metadata, internal linking, and structured data for content and tool pages.",
        "Integrated client-side utilities that run privately in the browser without account setup.",
      ],
    },
  ],
  education: [{ school: "Virtual University", degree: "BS Computer Science", start: "2020", end: "2024" }],
  projects: [
    { name: "AI Prompt Generator", description: "Built a prompt builder with presets, tone controls, and copy-ready output.", link: "byteverse.fyi/tools/ai-prompt-generator" },
  ],
  certifications: ["Responsive Web Design", "JavaScript Algorithms"],
  languages: ["English", "Urdu"],
  customSections: [{ title: "Highlights", items: ["Comfortable with visual design, code quality, and SEO-focused product work."] }],
  profileImage: "",
};

const accents = ["#1d9bf0", "#2563eb", "#7c3aed", "#059669", "#dc2626", "#0f172a", "#ea580c", "#be123c"];

function cloneResume() {
  return JSON.parse(JSON.stringify(sampleResume)) as ResumeData;
}

function toLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function fromLines(values: string[]) {
  return values.join("\n");
}

function contactLine(resume: ResumeData, order: ContactKey[] = defaultContactOrder) {
  return order.map((key) => resume[key]).filter(Boolean).join(" | ");
}

function moveValue<T>(items: T[], from: T, to: T) {
  const fromIndex = items.indexOf(from);
  const toIndex = items.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function photoSizeClass(size: DesignState["photoSize"]) {
  if (size === "sm") return "h-20 w-20";
  if (size === "lg") return "h-32 w-32";
  return "h-24 w-24";
}

function photoShapeClass(shape: DesignState["photoShape"]) {
  if (shape === "circle") return "rounded-full";
  if (shape === "square") return "rounded-none";
  return "rounded-2xl";
}

function createDefaultDesign(): DesignState {
  const preset = templatePresets[0];
  return {
    template: preset.value,
    accent: preset.accent,
    font: preset.font,
    spacing: preset.spacing,
    showPhoto: true,
    photoSize: "md",
    photoShape: "rounded",
    fontSize: preset.fontSize,
    lineHeight: preset.lineHeight,
    margin: preset.margin,
    columnWidth: preset.columnWidth,
    sectionOrder: preset.sectionOrder,
    contactOrder: defaultContactOrder,
  };
}

function fontSizeClass(size: DesignState["fontSize"]) {
  if (size === "sm") return "text-[13px]";
  if (size === "lg") return "text-[15px]";
  return "text-sm";
}

function lineHeightClass(lineHeight: DesignState["lineHeight"]) {
  if (lineHeight === "tight") return "leading-5";
  if (lineHeight === "relaxed") return "leading-7";
  return "leading-6";
}

function pagePaddingClass(margin: DesignState["margin"]) {
  if (margin === "compact") return "p-7";
  if (margin === "wide") return "p-12";
  return "p-10";
}

function studioGridClass(width: DesignState["columnWidth"]) {
  if (width === "content") return "grid-cols-[1.08fr,0.92fr]";
  if (width === "sidebar") return "grid-cols-[0.86fr,1.14fr]";
  return "grid-cols-2";
}

function ensureResumeShape(parsed: ResumeData) {
  return {
    ...cloneResume(),
    ...parsed,
    skills: Array.isArray(parsed.skills) ? parsed.skills : cloneResume().skills,
    skillGroups: Array.isArray(parsed.skillGroups) ? parsed.skillGroups : cloneResume().skillGroups,
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    languages: Array.isArray(parsed.languages) ? parsed.languages : [],
    customSections: Array.isArray(parsed.customSections) ? parsed.customSections : [],
  };
}

/* ---- Sub-components for CV preview ---- */

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="mb-2 border-b pb-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent, borderColor: `${accent}55` }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

/* ---- Mini template card for the picker ---- */

function MiniTemplate({ preset, active }: { preset: TemplatePreset; active: boolean }) {
  return (
    <div className={`relative h-28 overflow-hidden rounded-xl border-2 bg-white p-2 transition-all duration-200 ${active ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]" : "border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>
      {active && <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm"><Check size={10} strokeWidth={3} /></div>}
      <div className="mb-2 h-4 rounded-sm" style={{ background: `linear-gradient(135deg, ${preset.accent}, ${preset.accent}cc)` }} />
      <div className={preset.value === "studio" || preset.value === "sidebar" ? "grid h-20 grid-cols-[1.1fr,0.9fr] gap-2" : "space-y-1"}>
        <div className="space-y-1">
          <div className="h-2 w-16 rounded-sm bg-slate-800" />
          <div className="h-1.5 w-24 rounded-sm bg-slate-200" />
          <div className="mt-2 h-1.5 w-full rounded-sm bg-slate-200" />
          <div className="h-1.5 w-10/12 rounded-sm bg-slate-100" />
          <div className="h-1.5 w-9/12 rounded-sm bg-slate-100" />
        </div>
        {(preset.value === "studio" || preset.value === "sidebar") && (
          <div className="space-y-1 border-l border-slate-100 pl-2">
            <div className="h-1.5 w-12 rounded-sm" style={{ backgroundColor: preset.accent }} />
            <div className="h-4 w-full rounded-sm bg-slate-50" />
            <div className="h-4 w-10/12 rounded-sm bg-slate-50" />
            <div className="h-1.5 w-16 rounded-sm bg-slate-200" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Reusable styled input ---- */

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-900/30";
const selectClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-900/30";

/* ---- Main tool component ---- */

export function AICVBuilderTool() {
  const [resume, setResume] = useState<ResumeData>(() => cloneResume());
  const [design, setDesign] = useState<DesignState>(() => createDefaultDesign());
  const [mode, setMode] = useState<EditorMode>("visual");
  const [codeValue, setCodeValue] = useState(() => JSON.stringify(cloneResume(), null, 2));
  const [codeError, setCodeError] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [referenceImage, setReferenceImage] = useState("");
  const [draggedSection, setDraggedSection] = useState<SectionKey | null>(null);
  const [draggedContact, setDraggedContact] = useState<ContactKey | null>(null);
  const [aiStatus, setAiStatus] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const spacingClass = design.spacing === "compact" ? "space-y-3" : design.spacing === "roomy" ? "space-y-6" : "space-y-4";
  const previewFont = design.font === "Serif" ? "Georgia, serif" : design.font === "Mono" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "Inter, Arial, sans-serif";

  const stats = useMemo(() => {
    const words = JSON.stringify(resume).split(/\s+/).filter(Boolean).length;
    const bullets = resume.experience.reduce((sum, item) => sum + item.bullets.length, 0);
    return { words, bullets, sections: 7 + resume.customSections.length };
  }, [resume]);

  /* ---- CV Strength Meter ---- */
  const strength = useMemo(() => {
    const checks: { label: string; passed: boolean; tip: string }[] = [
      { label: "Full name", passed: resume.name.trim().length >= 3, tip: "Add your full name (at least 3 characters)" },
      { label: "Job title", passed: resume.title.trim().length >= 3, tip: "Add a clear job title recruiters search for" },
      { label: "Contact info", passed: Boolean(resume.email && resume.phone), tip: "Add both email and phone number" },
      { label: "Summary", passed: resume.summary.trim().split(/\s+/).length >= 15, tip: "Write a summary with at least 15 words" },
      { label: "Skills (5+)", passed: resume.skills.length >= 5 || resume.skillGroups.reduce((s, g) => s + g.items.length, 0) >= 5, tip: "Add at least 5 relevant skills" },
      { label: "Experience", passed: resume.experience.length >= 1 && resume.experience[0].bullets.length >= 2, tip: "Add experience with at least 2 bullet points" },
      { label: "Bullet quality", passed: resume.experience.some((exp) => exp.bullets.some((b) => b.length >= 40)), tip: "Write detailed bullets (40+ chars) with metrics" },
      { label: "Education", passed: resume.education.length >= 1, tip: "Add at least one education entry" },
      { label: "Projects/certs", passed: resume.projects.length >= 1 || resume.certifications.length >= 1, tip: "Add projects or certifications to stand out" },
      { label: "Location set", passed: resume.location.trim().length >= 2, tip: "Add your location or \"Remote\"" },
    ];
    const passed = checks.filter((c) => c.passed).length;
    const score = Math.round((passed / checks.length) * 100);
    const level = score >= 90 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs work";
    const color = score >= 90 ? "emerald" : score >= 70 ? "blue" : score >= 50 ? "amber" : "red";
    return { checks, passed, total: checks.length, score, level, color };
  }, [resume]);

  /* ---- Smart Tips ---- */
  const tips = useMemo(() => {
    const items: string[] = [];
    if (resume.summary.trim().split(/\s+/).length < 20) items.push("Expand your summary to 2-3 sentences for better recruiter engagement.");
    if (resume.experience.length > 0 && resume.experience[0].bullets.length < 3) items.push("Add at least 3 bullet points per role to showcase achievements.");
    if (!resume.experience.some((exp) => exp.bullets.some((b) => /\d/.test(b)))) items.push("Include numbers and metrics in your bullets (e.g. \"Increased sales by 30%\").");
    if (resume.skills.length < 6 && resume.skillGroups.reduce((s, g) => s + g.items.length, 0) < 6) items.push("Add more skills — aim for 6-12 relevant technologies or competencies.");
    if (!resume.website) items.push("Add a portfolio website or LinkedIn URL to strengthen your profile.");
    if (resume.projects.length === 0) items.push("Add side projects to demonstrate initiative and practical skills.");
    if (resume.certifications.length === 0) items.push("Certifications add credibility — include relevant ones if you have them.");
    return items;
  }, [resume]);

  function update<K extends keyof ResumeData>(key: K, value: ResumeData[K]) {
    setResume((current) => ({ ...current, [key]: value }));
  }

  function updateExperience(index: number, patch: Partial<Experience>) {
    setResume((current) => ({
      ...current,
      experience: current.experience.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function updateEducation(index: number, patch: Partial<Education>) {
    setResume((current) => ({
      ...current,
      education: current.education.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function updateProject(index: number, patch: Partial<Project>) {
    setResume((current) => ({
      ...current,
      projects: current.projects.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function updateCustomSection(index: number, patch: Partial<CustomSection>) {
    setResume((current) => ({
      ...current,
      customSections: current.customSections.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function updateSkillGroup(index: number, patch: Partial<SkillGroup>) {
    setResume((current) => ({
      ...current,
      skillGroups: current.skillGroups.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeItem<K extends "experience" | "education" | "projects" | "customSections" | "skillGroups">(key: K, index: number) {
    setResume((current) => ({ ...current, [key]: current[key].filter((_, i) => i !== index) }));
  }

  function handleProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("profileImage", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function handleReferenceImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function applyCode() {
    try {
      const parsed = ensureResumeShape(JSON.parse(codeValue) as ResumeData);
      if (!parsed.name || !Array.isArray(parsed.experience)) {
        setCodeError("JSON must include at least name and experience array.");
        return;
      }
      setResume(parsed);
      setCodeError("");
      setMode("visual");
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "Invalid JSON.");
    }
  }

  function switchMode(nextMode: EditorMode) {
    if (nextMode === "code") {
      setCodeValue(JSON.stringify(resume, null, 2));
      setCodeError("");
    }
    setMode(nextMode);
  }

  async function copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(resume, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const [pngLoading, setPngLoading] = useState(false);

  async function downloadPdf() {
    if (!previewRef.current) return;
    setPdfLoading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let remainingHeight = imgHeight;
      let position = 0;
      const image = canvas.toDataURL("image/png", 1.0);

      pdf.addImage(image, "PNG", 0, position, imgWidth, imgHeight);
      remainingHeight -= pageHeight;
      while (remainingHeight > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(image, "PNG", 0, position, imgWidth, imgHeight);
        remainingHeight -= pageHeight;
      }
      pdf.save(`${resume.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "cv"}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  }

  async function downloadPng() {
    if (!previewRef.current) return;
    setPngLoading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${resume.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "cv"}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } finally {
      setPngLoading(false);
    }
  }

  async function runAi(action: "summary" | "tailor" | "bullet" | "design", text = "") {
    setAiStatus("Thinking...");
    try {
      const response = await fetch("/api/ai-cv-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, resume, text, jobDescription, targetRole: resume.title }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI request failed.");

      if (action === "summary") {
        update("summary", data.text);
      } else if (action === "bullet") {
        const first = resume.experience[0];
        if (first) updateExperience(0, { bullets: [data.text.replace(/^[-*]\s*/, ""), ...first.bullets.slice(1)] });
      } else if (action === "tailor") {
        try {
          const parsed = JSON.parse(data.text.replace(/^```json\s*/i, "").replace(/```$/i, ""));
          if (typeof parsed.summary === "string") update("summary", parsed.summary);
          if (Array.isArray(parsed.skills)) update("skills", parsed.skills.slice(0, 14).map(String));
          if (Array.isArray(parsed.skillGroups)) update("skillGroups", parsed.skillGroups.slice(0, 5).map((group: SkillGroup) => ({ title: String(group.title || "Skills"), items: Array.isArray(group.items) ? group.items.slice(0, 8).map(String) : [] })));
          if (Array.isArray(parsed.bulletSuggestions) && resume.experience[0]) {
            updateExperience(0, { bullets: parsed.bulletSuggestions.slice(0, 5).map(String) });
          }
        } catch {
          setAiStatus(data.text);
          return;
        }
      } else {
        try {
          const parsed = JSON.parse(data.text.replace(/^```json\s*/i, "").replace(/```$/i, ""));
          const preset = templatePresets.find((item) => item.value === parsed.template) || templatePresets[0];
          setDesign((current) => ({
            ...current,
            template: preset.value,
            accent: typeof parsed.accent === "string" ? parsed.accent : preset.accent,
            font: typeof parsed.font === "string" ? parsed.font : preset.font,
            spacing: ["compact", "normal", "roomy"].includes(parsed.spacing) ? parsed.spacing : preset.spacing,
            fontSize: ["sm", "md", "lg"].includes(parsed.fontSize) ? parsed.fontSize : preset.fontSize,
            lineHeight: ["tight", "normal", "relaxed"].includes(parsed.lineHeight) ? parsed.lineHeight : preset.lineHeight,
            margin: ["compact", "normal", "wide"].includes(parsed.margin) ? parsed.margin : preset.margin,
            columnWidth: ["balanced", "content", "sidebar"].includes(parsed.columnWidth) ? parsed.columnWidth : preset.columnWidth,
            sectionOrder: Array.isArray(parsed.sectionOrder) ? parsed.sectionOrder.filter((section: SectionKey) => defaultSectionOrder.includes(section)).concat(defaultSectionOrder.filter((section) => !parsed.sectionOrder.includes(section))) : preset.sectionOrder,
          }));
        } catch {
          setAiStatus(data.text);
          return;
        }
      }
      setAiStatus(`AI updated using ${data.provider === "xai" ? "Grok/xAI" : "Groq"}.`);
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : "AI failed. Check API key configuration.");
    }
  }

  function resetAll() {
    setResume(cloneResume());
    setDesign(createDefaultDesign());
    setReferenceImage("");
    setAiStatus("");
  }

  function applyTemplatePreset(preset: TemplatePreset) {
    setDesign((current) => ({
      ...current,
      template: preset.value,
      accent: preset.accent,
      font: preset.font,
      spacing: preset.spacing,
      fontSize: preset.fontSize,
      lineHeight: preset.lineHeight,
      margin: preset.margin,
      columnWidth: preset.columnWidth,
      sectionOrder: preset.sectionOrder,
    }));
  }

  function reorderSection(target: SectionKey) {
    if (!draggedSection) return;
    setDesign((current) => ({ ...current, sectionOrder: moveValue(current.sectionOrder, draggedSection, target) }));
    setDraggedSection(null);
  }

  function reorderContact(target: ContactKey) {
    if (!draggedContact) return;
    setDesign((current) => ({ ...current, contactOrder: moveValue(current.contactOrder, draggedContact, target) }));
    setDraggedContact(null);
  }

  /* ===================== REDESIGNED UI ===================== */

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      {/* ===== EDITOR PANEL ===== */}
      <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-5 sm:px-6">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-4 bottom-0 h-16 w-16 rounded-full bg-white/5 blur-xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                <Sparkles size={11} /> CV Editor
              </div>
              <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">Build Your Perfect CV</h2>
              <p className="mt-0.5 text-sm text-blue-100">Edit, customize, and download — all in one place</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full bg-white/15 p-1 backdrop-blur-sm">
                <button type="button" onClick={() => switchMode("visual")} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${mode === "visual" ? "bg-white text-indigo-700 shadow-sm" : "text-white/90 hover:text-white"}`}>
                  <span className="flex items-center gap-1.5"><Eye size={14} /> Visual</span>
                </button>
                <button type="button" onClick={() => switchMode("code")} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${mode === "code" ? "bg-white text-indigo-700 shadow-sm" : "text-white/90 hover:text-white"}`}>
                  <span className="flex items-center gap-1.5"><Code2 size={14} /> Code</span>
                </button>
              </div>
              <button type="button" onClick={resetAll} className="rounded-full bg-white/15 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-white/25" title="Reset all">
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Editor Body */}
        <div className="p-5 sm:p-6">
          {mode === "code" ? (
            <div className="space-y-4">
              <textarea value={codeValue} onChange={(event) => setCodeValue(event.target.value)} spellCheck={false} className="min-h-[560px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900" />
              {codeError && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{codeError}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={applyCode} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg hover:shadow-blue-500/30">Apply JSON</button>
                <button type="button" onClick={copyJson} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />} {copied ? "Copied!" : "Copy JSON"}</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ---- Personal Information ---- */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 p-5 ring-1 ring-blue-100/80 dark:from-blue-950/20 dark:via-slate-900 dark:to-indigo-950/10 dark:ring-blue-900/30">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] text-white shadow-sm">
                    <FileText size={12} />
                  </span>
                  Personal Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Full Name</span><input value={resume.name} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="John Doe" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Job Title</span><input value={resume.title} onChange={(e) => update("title", e.target.value)} className={inputClass} placeholder="Frontend Developer" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</span><input value={resume.email} onChange={(e) => update("email", e.target.value)} className={inputClass} placeholder="you@email.com" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Phone</span><input value={resume.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} placeholder="+1 555 123 4567" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Location</span><input value={resume.location} onChange={(e) => update("location", e.target.value)} className={inputClass} placeholder="City, Country" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Website</span><input value={resume.website} onChange={(e) => update("website", e.target.value)} className={inputClass} placeholder="yoursite.com" /></label>
                </div>
              </div>

              {/* ---- AI Writing Studio ---- */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 via-purple-50/80 to-fuchsia-50/60 p-5 ring-1 ring-purple-200/60 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-fuchsia-950/10 dark:ring-purple-800/30">
                <div className="absolute right-3 top-3 h-20 w-20 rounded-full bg-purple-200/30 blur-2xl dark:bg-purple-700/10" />
                <div className="relative">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-purple-700 dark:text-purple-400">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-sm">
                        <Zap size={12} />
                      </span>
                      AI Writing Studio
                    </h3>
                    <button type="button" onClick={() => runAi("summary")} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/25 transition-all hover:shadow-lg hover:shadow-purple-500/30">
                      <Sparkles size={14} /> Improve Summary
                    </button>
                  </div>
                  <textarea rows={4} value={resume.summary} onChange={(e) => update("summary", e.target.value)} className={`${inputClass} !bg-white/80 dark:!bg-slate-900/80`} placeholder="Write your professional summary..." />
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr,auto]">
                    <textarea rows={3} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste a job description to tailor your CV with AI..." className={`${inputClass} !bg-white/80 dark:!bg-slate-900/80`} />
                    <button type="button" onClick={() => runAi("tailor")} className="self-end rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition-colors hover:bg-purple-50 dark:border-purple-800 dark:bg-slate-800 dark:text-purple-400 dark:hover:bg-purple-950/30">
                      Tailor CV
                    </button>
                  </div>
                  {aiStatus && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-purple-700 dark:bg-slate-900/60 dark:text-purple-300">
                      <Sparkles size={13} className="shrink-0 text-purple-500" /> {aiStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* ---- Template Studio ---- */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-5 ring-1 ring-slate-200/80 dark:from-slate-900 dark:to-slate-950 dark:ring-slate-800">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
                        <LayoutTemplate size={12} />
                      </span>
                      Template Studio
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">Pick a layout, then fine-tune every detail below</p>
                  </div>
                  <button type="button" onClick={() => runAi("design")} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-400">
                    <Wand2 size={14} /> AI Pick Design
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {templatePresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => applyTemplatePreset(preset)}
                      className={`group rounded-2xl border-2 p-3 text-left transition-all duration-200 ${design.template === preset.value
                        ? "border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/10 dark:border-blue-400 dark:bg-blue-950/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                      }`}
                    >
                      <MiniTemplate preset={preset} active={design.template === preset.value} />
                      <span className="mt-3 block text-sm font-bold text-slate-900 dark:text-slate-100">{preset.label}</span>
                      <span className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: preset.accent }}>{preset.category}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ---- Fine Controls ---- */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 p-5 ring-1 ring-emerald-100/80 dark:from-emerald-950/15 dark:via-slate-900 dark:to-teal-950/10 dark:ring-emerald-900/30">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                    <Palette size={12} />
                  </span>
                  Design Controls
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Font Family</span><select value={design.font} onChange={(e) => setDesign({ ...design, font: e.target.value })} className={selectClass}><option>Inter</option><option>Serif</option><option>Mono</option></select></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Spacing</span><select value={design.spacing} onChange={(e) => setDesign({ ...design, spacing: e.target.value as DesignState["spacing"] })} className={selectClass}><option value="compact">Compact</option><option value="normal">Normal</option><option value="roomy">Roomy</option></select></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Text Size</span><select value={design.fontSize} onChange={(e) => setDesign({ ...design, fontSize: e.target.value as DesignState["fontSize"] })} className={selectClass}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></select></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Line Height</span><select value={design.lineHeight} onChange={(e) => setDesign({ ...design, lineHeight: e.target.value as DesignState["lineHeight"] })} className={selectClass}><option value="tight">Tight</option><option value="normal">Normal</option><option value="relaxed">Relaxed</option></select></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Page Margin</span><select value={design.margin} onChange={(e) => setDesign({ ...design, margin: e.target.value as DesignState["margin"] })} className={selectClass}><option value="compact">Compact</option><option value="normal">Normal</option><option value="wide">Wide</option></select></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Column Balance</span><select value={design.columnWidth} onChange={(e) => setDesign({ ...design, columnWidth: e.target.value as DesignState["columnWidth"] })} className={selectClass}><option value="balanced">Balanced</option><option value="content">Experience Wider</option><option value="sidebar">Side Panel Wider</option></select></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Profile Photo</span><input type="file" accept="image/*" onChange={handleProfileImage} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-700 dark:border-slate-700 dark:bg-slate-900" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Photo Size</span><select value={design.photoSize} onChange={(e) => setDesign({ ...design, photoSize: e.target.value as DesignState["photoSize"] })} className={selectClass}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></select></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Photo Shape</span><select value={design.photoShape} onChange={(e) => setDesign({ ...design, photoShape: e.target.value as DesignState["photoShape"] })} className={selectClass}><option value="rounded">Modern Rounded</option><option value="circle">Circle</option><option value="square">Square</option></select></label>
                </div>

                {/* Accent Color Picker */}
                <div className="mt-5 rounded-xl bg-white/70 p-4 ring-1 ring-slate-200/60 dark:bg-slate-900/50 dark:ring-slate-700/40">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Accent Color</p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {accents.map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={`Use ${color}`}
                        onClick={() => setDesign({ ...design, accent: color })}
                        className={`h-9 w-9 rounded-full shadow-sm transition-all duration-200 ${design.accent === color ? "scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900" : "hover:scale-105"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <label className="mt-3 flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                    <input type="checkbox" checked={design.showPhoto} onChange={(e) => setDesign({ ...design, showPhoto: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Show profile photo on CV
                  </label>
                </div>
              </div>

              {/* ---- Section & Contact Order ---- */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <GripVertical size={14} className="text-blue-500" /> CV Section Order
                    </h3>
                    <button type="button" onClick={() => setDesign({ ...design, sectionOrder: defaultSectionOrder })} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400">Reset</button>
                  </div>
                  <div className="space-y-1.5">
                    {design.sectionOrder.map((section) => (
                      <div key={section} draggable onDragStart={() => setDraggedSection(section)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderSection(section)} onDragEnd={() => setDraggedSection(null)} className="flex cursor-grab items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm transition-colors hover:bg-blue-50/50 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800/50">
                        <GripVertical size={14} className="text-slate-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{sectionLabels[section]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <GripVertical size={14} className="text-emerald-500" /> Contact Field Order
                    </h3>
                    <button type="button" onClick={() => setDesign({ ...design, contactOrder: defaultContactOrder })} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400">Reset</button>
                  </div>
                  <div className="space-y-1.5">
                    {design.contactOrder.map((field) => (
                      <div key={field} draggable onDragStart={() => setDraggedContact(field)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderContact(field)} onDragEnd={() => setDraggedContact(null)} className="flex cursor-grab items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm transition-colors hover:bg-emerald-50/50 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800/50">
                        <GripVertical size={14} className="text-slate-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{contactLabels[field]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ---- Reference Image ---- */}
              <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-blue-800">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400"><FileImage size={16} className="text-blue-500" /> Upload Reference CV Image</span>
                <p className="mb-3 text-xs text-slate-400">Upload an example CV for AI-powered design suggestions</p>
                <input type="file" accept="image/*" onChange={handleReferenceImage} className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700" />
                {referenceImage && <img src={referenceImage} alt="Reference CV" className="mt-3 max-h-48 rounded-xl border border-slate-200 object-contain shadow-sm" />}
              </label>

              {/* ---- Skills ---- */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 p-5 ring-1 ring-amber-100/80 dark:from-amber-950/15 dark:via-slate-900 dark:to-orange-950/10 dark:ring-amber-900/30">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                    <Sparkles size={12} />
                  </span>
                  Skills
                </h3>
                <textarea rows={4} value={fromLines(resume.skills)} onChange={(e) => update("skills", toLines(e.target.value))} placeholder="One skill per line" className={`${inputClass} !bg-white/80 dark:!bg-slate-900/80`} />
              </div>

              {/* ---- Grouped Skills ---- */}
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Grouped Skills</h3>
                  <button type="button" onClick={() => update("skillGroups", [...resume.skillGroups, { title: "New Skill Group", items: [""] }])} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400">
                    <Plus size={14} /> Add Group
                  </button>
                </div>
                <div className="space-y-3">
                  {resume.skillGroups.map((group, index) => (
                    <div key={`${group.title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <input placeholder="Group title" value={group.title} onChange={(e) => updateSkillGroup(index, { title: e.target.value })} className={`${inputClass} mb-2 !text-sm !font-semibold`} />
                      <textarea rows={2} placeholder="One skill per line" value={fromLines(group.items)} onChange={(e) => updateSkillGroup(index, { items: toLines(e.target.value) })} className={inputClass} />
                      <button type="button" onClick={() => removeItem("skillGroups", index)} className="mt-2 text-xs font-medium text-red-500 transition-colors hover:text-red-700">Remove group</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- Experience ---- */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm text-[10px]">
                      <FileText size={12} />
                    </span>
                    Experience
                  </h3>
                  <button type="button" onClick={() => update("experience", [...resume.experience, { company: "", role: "", location: "", start: "", end: "", bullets: [""] }])} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400">
                    <Plus size={14} /> Add
                  </button>
                </div>
                {resume.experience.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input placeholder="Role / Position" value={item.role} onChange={(e) => updateExperience(index, { role: e.target.value })} className={inputClass} />
                      <input placeholder="Company" value={item.company} onChange={(e) => updateExperience(index, { company: e.target.value })} className={inputClass} />
                      <input placeholder="Start date" value={item.start} onChange={(e) => updateExperience(index, { start: e.target.value })} className={inputClass} />
                      <input placeholder="End date" value={item.end} onChange={(e) => updateExperience(index, { end: e.target.value })} className={inputClass} />
                    </div>
                    <textarea rows={4} value={fromLines(item.bullets)} onChange={(e) => updateExperience(index, { bullets: toLines(e.target.value) })} placeholder="One achievement per line" className={`${inputClass} mt-3`} />
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => runAi("bullet", item.bullets[0] || "")} className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400">
                        <Sparkles size={12} /> Improve Bullet
                      </button>
                      <button type="button" onClick={() => removeItem("experience", index)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ---- Education & Projects ---- */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Education</h3>
                    <button type="button" onClick={() => update("education", [...resume.education, { school: "", degree: "", start: "", end: "" }])} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400">+ Add</button>
                  </div>
                  {resume.education.map((item, index) => (
                    <div key={index} className="mb-3 grid gap-2">
                      <input value={item.degree} onChange={(e) => updateEducation(index, { degree: e.target.value })} placeholder="Degree" className={inputClass} />
                      <input value={item.school} onChange={(e) => updateEducation(index, { school: e.target.value })} placeholder="School" className={inputClass} />
                      <button type="button" onClick={() => removeItem("education", index)} className="text-left text-xs font-medium text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Projects</h3>
                    <button type="button" onClick={() => update("projects", [...resume.projects, { name: "", description: "", link: "" }])} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400">+ Add</button>
                  </div>
                  {resume.projects.map((item, index) => (
                    <div key={index} className="mb-3 grid gap-2">
                      <input value={item.name} onChange={(e) => updateProject(index, { name: e.target.value })} placeholder="Project name" className={inputClass} />
                      <textarea rows={2} value={item.description} onChange={(e) => updateProject(index, { description: e.target.value })} placeholder="Description" className={inputClass} />
                      <button type="button" onClick={() => removeItem("projects", index)} className="text-left text-xs font-medium text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- Certifications & Languages ---- */}
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">Certifications</span>
                  <textarea rows={4} value={fromLines(resume.certifications)} onChange={(e) => update("certifications", toLines(e.target.value))} placeholder="One per line" className={inputClass} />
                </label>
                <label className="block rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">Languages</span>
                  <textarea rows={4} value={fromLines(resume.languages)} onChange={(e) => update("languages", toLines(e.target.value))} placeholder="One per line" className={inputClass} />
                </label>
              </div>

              {/* ---- Custom Sections ---- */}
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Custom Sections</h3>
                  <button type="button" onClick={() => update("customSections", [...resume.customSections, { title: "New Section", items: [""] }])} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400">+ Add</button>
                </div>
                {resume.customSections.map((item, index) => (
                  <div key={index} className="mb-3 grid gap-2">
                    <input value={item.title} onChange={(e) => updateCustomSection(index, { title: e.target.value })} placeholder="Section title" className={inputClass} />
                    <textarea rows={3} value={fromLines(item.items)} onChange={(e) => updateCustomSection(index, { items: toLines(e.target.value) })} placeholder="One item per line" className={inputClass} />
                    <button type="button" onClick={() => removeItem("customSections", index)} className="text-left text-xs font-medium text-red-500 hover:text-red-700">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== PREVIEW PANEL ===== */}
      <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-5 sm:px-6">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                <Eye size={11} /> Live Preview
              </div>
              <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">PDF-Ready CV</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={downloadPdf} disabled={pdfLoading} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-900/20 transition-all hover:shadow-xl disabled:opacity-60">
                {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF
              </button>
              <button type="button" onClick={downloadPng} disabled={pngLoading} className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2.5 text-sm font-bold text-teal-700 shadow-lg shadow-emerald-900/15 transition-all hover:shadow-xl disabled:opacity-60">
                {pngLoading ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />} PNG
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25">
                <FileText size={16} /> Print
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <FileText size={13} />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">{stats.words}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Words</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <Check size={13} />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">{stats.bullets}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bullets</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-sm">
                <LayoutTemplate size={13} />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">{stats.sections}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sections</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="p-5 sm:p-6 space-y-5">

          {/* CV Strength Meter */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-5 ring-1 ring-slate-200/80 dark:from-slate-900 dark:to-slate-950 dark:ring-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ${strength.color === "emerald" ? "from-emerald-500 to-green-600" : strength.color === "blue" ? "from-blue-500 to-indigo-600" : strength.color === "amber" ? "from-amber-500 to-orange-600" : "from-red-500 to-rose-600"}`}>
                  <Target size={14} />
                </span>
                CV Strength
              </h3>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${strength.color === "emerald" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : strength.color === "blue" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" : strength.color === "amber" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                  {strength.level}
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{strength.score}%</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className={`h-full rounded-full transition-all duration-500 ease-out ${strength.color === "emerald" ? "bg-gradient-to-r from-emerald-500 to-green-400" : strength.color === "blue" ? "bg-gradient-to-r from-blue-500 to-indigo-400" : strength.color === "amber" ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-gradient-to-r from-red-500 to-rose-400"}`} style={{ width: `${strength.score}%` }} />
            </div>
            {/* Checklist grid */}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {strength.checks.map((check) => (
                <div key={check.label} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${check.passed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`} title={check.tip}>
                  {check.passed ? <ShieldCheck size={12} className="shrink-0 text-emerald-500" /> : <div className="h-3 w-3 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                  {check.label}
                </div>
              ))}
            </div>
          </div>

          {/* Smart Tips */}
          {tips.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 p-4 ring-1 ring-amber-200/60 dark:from-amber-950/20 dark:via-slate-900 dark:to-orange-950/10 dark:ring-amber-800/30">
              <h3 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <Lightbulb size={13} className="text-amber-500" /> Smart Tips to Improve Your CV
              </h3>
              <ul className="space-y-1.5">
                {tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    <TrendingUp size={11} className="mt-1 shrink-0 text-amber-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="overflow-auto rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-6 shadow-inner dark:from-slate-800/50 dark:to-slate-900/50">
            <div ref={previewRef} className={`mx-auto min-h-[1123px] w-[794px] max-w-none bg-white text-slate-900 shadow-2xl ring-1 ring-slate-200/50 ${design.template === "sidebar" ? "grid grid-cols-[250px,1fr]" : ""}`} style={{ fontFamily: previewFont }}>
              {design.template === "studio" ? (
                <StudioResume resume={resume} design={design} accent={design.accent} />
              ) : design.template === "sidebar" ? (
                <>
                  <aside className="p-8 text-white" style={{ backgroundColor: design.accent }}>
                    {design.showPhoto && resume.profileImage && <img src={resume.profileImage} alt={resume.name} className={`mb-6 border-4 border-white/40 object-cover ${photoSizeClass(design.photoSize)} ${photoShapeClass(design.photoShape)}`} />}
                    <div className="text-3xl font-black leading-tight">{resume.name}</div><p className="mt-2 text-sm font-semibold opacity-90">{resume.title}</p><p className="mt-5 whitespace-pre-line text-xs leading-5 opacity-90">{contactLine(resume, design.contactOrder).replace(/ \| /g, "\n")}</p>
                  </aside>
                  <div className={`p-8 ${spacingClass}`}><ResumeMain resume={resume} design={design} accent={design.accent} /></div>
                </>
              ) : (
                <div className={`${pagePaddingClass(design.margin)} ${spacingClass}`}>
                  <header className={design.template === "ats" || design.template === "compact" ? "border-b pb-4" : design.template === "executive" ? "border-y-4 py-5" : "rounded-2xl p-6 text-white"} style={design.template === "ats" || design.template === "compact" || design.template === "executive" ? { borderColor: `${design.accent}55` } : { backgroundColor: design.accent }}>
                    <div className="flex items-start justify-between gap-5">
                      <div><div className={design.template === "compact" ? "text-3xl font-black leading-tight" : "text-4xl font-black leading-tight"}>{resume.name}</div><p className="mt-1 text-lg font-semibold opacity-90" style={design.template === "executive" ? { color: design.accent } : undefined}>{resume.title}</p><p className="mt-3 text-xs opacity-90">{contactLine(resume, design.contactOrder)}</p></div>
                      {design.showPhoto && resume.profileImage && <img src={resume.profileImage} alt={resume.name} className={`object-cover ${photoSizeClass(design.photoSize)} ${photoShapeClass(design.photoShape)}`} />}
                    </div>
                  </header>
                  <ResumeMain resume={resume} design={design} accent={design.accent} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---- CV preview layout components (unchanged) ---- */

function StudioResume({ resume, design, accent }: { resume: ResumeData; design: DesignState; accent: string }) {
  const sideSections: SectionKey[] = ["skills", "education", "certifications", "languages"];
  const mainOrder = design.sectionOrder.filter((section) => !sideSections.includes(section));
  const sideOrder = design.sectionOrder.filter((section) => sideSections.includes(section));

  return (
    <div className={`${pagePaddingClass(design.margin)} ${fontSizeClass(design.fontSize)} ${lineHeightClass(design.lineHeight)}`}>
      <header className="mb-5 border-b-4 pb-4" style={{ borderColor: accent }}>
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="text-4xl font-black uppercase leading-none tracking-normal text-slate-950">{resume.name}</div>
            <p className="mt-2 text-lg font-extrabold" style={{ color: accent }}>{resume.title}</p>
            <p className="mt-3 text-[11px] font-semibold text-slate-600">{contactLine(resume, design.contactOrder)}</p>
          </div>
          {design.showPhoto && resume.profileImage && <img src={resume.profileImage} alt={resume.name} className={`object-cover ${photoSizeClass(design.photoSize)} ${photoShapeClass(design.photoShape)}`} />}
        </div>
      </header>
      <div className={`grid gap-7 ${studioGridClass(design.columnWidth)}`}>
        <ResumeMain resume={resume} design={{ ...design, sectionOrder: mainOrder }} accent={accent} />
        <ResumeMain resume={resume} design={{ ...design, sectionOrder: sideOrder }} accent={accent} />
      </div>
    </div>
  );
}

function ResumeMain({ resume, design, accent }: { resume: ResumeData; design: DesignState; accent: string }) {
  const bodyText = `${fontSizeClass(design.fontSize)} ${lineHeightClass(design.lineHeight)} text-slate-700`;

  function renderSection(section: SectionKey) {
    if (section === "profile") {
      return <Section title="Profile" accent={accent}><p className={bodyText}>{resume.summary}</p></Section>;
    }

    if (section === "skills") {
      return <Section title="Skills" accent={accent}>{resume.skillGroups.length > 0 ? <div className="space-y-3">{resume.skillGroups.map((group) => <div key={group.title} className="border-b border-dotted border-slate-200 pb-3 last:border-0 last:pb-0"><h4 className="mb-2 text-xs font-extrabold" style={{ color: accent }}>{group.title}</h4><div className="flex flex-wrap gap-1.5">{group.items.map((skill) => <span key={skill} className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{skill}</span>)}</div></div>)}</div> : <div className="flex flex-wrap gap-2">{resume.skills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{skill}</span>)}</div>}</Section>;
    }

    if (section === "experience") {
      return <Section title="Experience" accent={accent}>{resume.experience.map((item, index) => <div key={`${item.company}-${index}`} className="mb-4 border-b border-dotted border-slate-200 pb-3 last:border-0"><div className="flex items-start justify-between gap-4"><div><h4 className="font-bold">{item.role}</h4><p className="text-sm font-bold" style={{ color: accent }}>{item.company}{item.location ? ` | ${item.location}` : ""}</p></div><p className="text-xs font-medium text-slate-500">{item.start} - {item.end}</p></div><ul className={`mt-2 list-disc space-y-1 pl-5 ${bodyText}`}>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div>)}</Section>;
    }

    if (section === "projects") {
      return <Section title="Projects" accent={accent}>{resume.projects.map((item) => <div key={item.name} className="mb-3"><h4 className="font-bold">{item.name}</h4><p className={bodyText}>{item.description}</p>{item.link && <p className="text-xs font-medium" style={{ color: accent }}>{item.link}</p>}</div>)}</Section>;
    }

    if (section === "education") {
      return <Section title="Education" accent={accent}>{resume.education.map((item) => <div key={`${item.school}-${item.degree}`} className="mb-2 flex items-start justify-between gap-4"><div><h4 className="font-bold">{item.degree}</h4><p className="text-sm text-slate-600">{item.school}</p></div><p className="text-xs text-slate-500">{item.start} - {item.end}</p></div>)}</Section>;
    }

    if (section === "certifications") {
      return resume.certifications.length > 0 ? <Section title="Certifications" accent={accent}><ul className={`list-disc pl-5 ${bodyText}`}>{resume.certifications.map((item) => <li key={item}>{item}</li>)}</ul></Section> : null;
    }

    if (section === "languages") {
      return resume.languages.length > 0 ? <Section title="Languages" accent={accent}><div className="flex flex-wrap gap-2">{resume.languages.map((item) => <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item}</span>)}</div></Section> : null;
    }

    return resume.customSections.length > 0 ? <>{resume.customSections.map((customSection) => <Section key={customSection.title} title={customSection.title} accent={accent}><ul className={`list-disc pl-5 ${bodyText}`}>{customSection.items.map((item) => <li key={item}>{item}</li>)}</ul></Section>)}</> : null;
  }

  return (
    <div className={design.spacing === "compact" ? "space-y-3" : design.spacing === "roomy" ? "space-y-6" : "space-y-4"}>
      {design.sectionOrder.map((section) => <div key={section}>{renderSection(section)}</div>)}
    </div>
  );
}
