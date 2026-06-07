"use client";

import { useMemo, useState } from "react";
import { Check, Copy, RotateCcw, Wand2 } from "lucide-react";

type PromptType = "blog" | "marketing" | "coding" | "image" | "email" | "social";

const PROMPT_TYPES: { value: PromptType; label: string; description: string }[] = [
  { value: "blog", label: "Blog Writing", description: "SEO posts, guides, outlines, and article rewrites" },
  { value: "marketing", label: "Marketing Copy", description: "Landing pages, ads, hooks, product messaging" },
  { value: "coding", label: "Coding Prompt", description: "Code generation, debugging, refactoring, explanations" },
  { value: "image", label: "Image Prompt", description: "Visual direction for Midjourney, Flux, DALL-E, and similar tools" },
  { value: "email", label: "Email Writing", description: "Cold outreach, follow-ups, sales emails, client replies" },
  { value: "social", label: "Social Content", description: "LinkedIn posts, threads, captions, content repurposing" },
];

const TONES = [
  "Professional",
  "Friendly",
  "Persuasive",
  "Direct",
  "Conversational",
  "Expert",
  "Minimal",
  "Confident",
];

const OUTPUT_FORMATS = [
  "Structured paragraphs",
  "Bullet points",
  "Step-by-step list",
  "Table",
  "JSON",
  "Markdown",
];

const PRESETS = [
  {
    label: "SEO Blog Brief",
    type: "blog" as const,
    objective: "Write an SEO-focused blog post that ranks for a commercial-intent keyword.",
    audience: "Founders, marketers, and tech buyers",
    context: "The article should compare top tools, explain use cases, and include clear buying guidance.",
    constraints: "Add an intro, comparison section, pros and cons, FAQ, and concise conclusion. Avoid fluff.",
    keywords: "best AI tools 2026, AI software comparison, top tools",
    tone: "Expert",
    outputFormat: "Markdown",
  },
  {
    label: "Coding Debug Prompt",
    type: "coding" as const,
    objective: "Debug a failing feature and explain the likely root cause before suggesting a fix.",
    audience: "Senior frontend engineer",
    context: "The issue happens in a production Next.js app with App Router and TypeScript.",
    constraints: "Keep the answer practical, list assumptions, and return the fix in code plus a short explanation.",
    keywords: "Next.js, TypeScript, production bug",
    tone: "Direct",
    outputFormat: "Step-by-step list",
  },
  {
    label: "Image Generation Prompt",
    type: "image" as const,
    objective: "Create a polished product-hero image for a SaaS landing page.",
    audience: "Design team",
    context: "The scene should feel modern, premium, and startup-focused with strong lighting and clean composition.",
    constraints: "Mention camera angle, mood, color palette, composition, and what to avoid.",
    keywords: "SaaS dashboard, premium lighting, modern UI",
    tone: "Professional",
    outputFormat: "Structured paragraphs",
  },
];

function getTypeInstruction(type: PromptType) {
  switch (type) {
    case "blog":
      return "Act like an SEO strategist and editorial writer. Prioritize clarity, search intent alignment, internal linking opportunities, and useful structure.";
    case "marketing":
      return "Act like a conversion-focused copywriter. Prioritize message clarity, buyer pain points, differentiation, and strong calls to action.";
    case "coding":
      return "Act like a senior software engineer. Be explicit, technically rigorous, and practical about constraints, edge cases, and validation.";
    case "image":
      return "Act like a prompt engineer for image generation. Optimize for composition, style consistency, visual clarity, and prompt precision.";
    case "email":
      return "Act like a sharp business communicator. Prioritize brevity, clarity, relevance, and a strong next step.";
    case "social":
      return "Act like a social content strategist. Prioritize hooks, formatting for scanning, retention, and platform-native tone.";
    default:
      return "Act like an expert assistant and produce a high-quality result.";
  }
}

function getDefaultObjective(type: PromptType) {
  switch (type) {
    case "blog":
      return "Create a high-quality article that answers the target query better than competing pages.";
    case "marketing":
      return "Write persuasive copy that improves click-through rate and conversions.";
    case "coding":
      return "Generate a precise technical answer or working code solution.";
    case "image":
      return "Generate a visually strong prompt that produces a polished, usable image.";
    case "email":
      return "Draft a concise email that sounds natural and moves the conversation forward.";
    case "social":
      return "Generate a post with a strong hook, clear value, and platform-ready formatting.";
  }
}

export function AIPromptGeneratorTool() {
  const [promptType, setPromptType] = useState<PromptType>("blog");
  const [objective, setObjective] = useState(getDefaultObjective("blog"));
  const [audience, setAudience] = useState("Busy professionals who want a useful final answer fast");
  const [context, setContext] = useState("Use recent best practices, clear structure, and practical examples where useful.");
  const [tone, setTone] = useState("Expert");
  const [outputFormat, setOutputFormat] = useState("Markdown");
  const [constraints, setConstraints] = useState("Avoid generic filler. Be specific, actionable, and concise. Include examples only where they improve clarity.");
  const [keywords, setKeywords] = useState("");
  const [includeChecklist, setIncludeChecklist] = useState(true);
  const [includeExamples, setIncludeExamples] = useState(true);
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => {
    const sections = [
      getTypeInstruction(promptType),
      `Primary task: ${objective.trim() || getDefaultObjective(promptType)}`,
      `Target audience: ${audience.trim() || "General professional audience"}`,
      `Context: ${context.trim() || "No extra context provided."}`,
      `Tone: ${tone}`,
      `Output format: ${outputFormat}`,
      `Constraints: ${constraints.trim() || "No extra constraints."}`,
    ];

    if (keywords.trim()) {
      sections.push(`Important keywords or concepts to cover: ${keywords.trim()}`);
    }

    if (includeChecklist) {
      sections.push("Before finalizing the answer, verify that the output fully covers the task, stays consistent with the requested format, and avoids weak generic phrasing.");
    }

    if (includeExamples) {
      sections.push("Include examples only when they materially improve clarity or make the output more immediately usable.");
    }

    sections.push("Return only the final answer. Do not include meta commentary about your process unless explicitly requested.");

    return sections.join("\n\n");
  }, [audience, constraints, context, includeChecklist, includeExamples, keywords, objective, outputFormat, promptType, tone]);

  function applyPreset(index: number) {
    const preset = PRESETS[index];
    setPromptType(preset.type);
    setObjective(preset.objective);
    setAudience(preset.audience);
    setContext(preset.context);
    setConstraints(preset.constraints);
    setKeywords(preset.keywords);
    setTone(preset.tone);
    setOutputFormat(preset.outputFormat);
    setCopied(false);
  }

  function handleTypeChange(nextType: PromptType) {
    setPromptType(nextType);
    setObjective(getDefaultObjective(nextType));
    setCopied(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handleReset() {
    setPromptType("blog");
    setObjective(getDefaultObjective("blog"));
    setAudience("Busy professionals who want a useful final answer fast");
    setContext("Use recent best practices, clear structure, and practical examples where useful.");
    setTone("Expert");
    setOutputFormat("Markdown");
    setConstraints("Avoid generic filler. Be specific, actionable, and concise. Include examples only where they improve clarity.");
    setKeywords("");
    setIncludeChecklist(true);
    setIncludeExamples(true);
    setCopied(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary mb-2">Prompt Builder</p>
            <h2 className="text-2xl font-bold">Create a better AI prompt</h2>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {PRESETS.map((preset, index) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(index)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Prompt type</span>
            <select
              value={promptType}
              onChange={(e) => handleTypeChange(e.target.value as PromptType)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
            >
              {PROMPT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-muted-foreground">
              {PROMPT_TYPES.find((type) => type.value === promptType)?.description}
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Objective</span>
            <textarea
              rows={3}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Target audience</span>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Tone</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              >
                {TONES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Context</span>
            <textarea
              rows={4}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Output format</span>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              >
                {OUTPUT_FORMATS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Keywords or concepts</span>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="keyword 1, keyword 2, must-cover topics"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Constraints</span>
            <textarea
              rows={4}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-border p-4 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={includeChecklist}
                onChange={(e) => setIncludeChecklist(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block text-sm font-medium">Add a quality checklist</span>
                <span className="block text-xs text-muted-foreground mt-1">Useful when you want the model to self-check coverage and weak phrasing.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-border p-4 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={includeExamples}
                onChange={(e) => setIncludeExamples(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block text-sm font-medium">Allow examples</span>
                <span className="block text-xs text-muted-foreground mt-1">Keeps examples only when they improve clarity instead of bloating the answer.</span>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wand2 size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Generated Prompt</p>
            <h2 className="text-2xl font-bold">Copy and use anywhere</h2>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-sm font-medium text-muted-foreground">Optimized prompt</p>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-background p-4 text-sm leading-6 text-foreground border border-border">{prompt}</pre>
        </div>

        <div className="mt-5 rounded-2xl border border-border p-4">
          <h3 className="font-semibold mb-3">Why this prompt structure works</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Clear role instruction reduces generic output.</li>
            <li>Objective and audience keep the result aligned with intent.</li>
            <li>Context and constraints reduce hallucinated filler and vague wording.</li>
            <li>Output format makes the answer easier to reuse immediately.</li>
          </ul>
        </div>

        <div className="mt-5 rounded-2xl border border-border p-4">
          <h3 className="font-semibold mb-3">Best use cases</h3>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-3">SEO briefs and content outlines</div>
            <div className="rounded-xl bg-muted/50 p-3">Landing page and ad copy</div>
            <div className="rounded-xl bg-muted/50 p-3">Code generation and debugging</div>
            <div className="rounded-xl bg-muted/50 p-3">Image prompt engineering</div>
            <div className="rounded-xl bg-muted/50 p-3">Cold emails and follow-ups</div>
            <div className="rounded-xl bg-muted/50 p-3">LinkedIn posts and short-form content</div>
          </div>
        </div>
      </section>
    </div>
  );
}