import type { Metadata } from "next";
import { AIPromptGeneratorTool } from "./ai-prompt-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "AI Prompt Generator",
  title: "AI Prompt Generator - Free Prompt Builder",
  description:
    "Create stronger prompts for ChatGPT, Claude, Gemini, image models, coding assistants, marketing copy, blog writing, and more. Build prompts with goals, tone, context, and constraints.",
  slug: "ai-prompt-generator",
  keywords: [
    "ai prompt generator",
    "prompt builder",
    "chatgpt prompt generator",
    "claude prompt builder",
    "ai prompt tool",
    "prompt engineering tool",
    "image prompt generator",
    "prompt template generator",
  ],
  faqs: [
    {
      question: "What does an AI prompt generator help with?",
      answer:
        "An AI prompt generator helps you build clearer prompts by organizing the task, audience, context, tone, constraints, and desired output format. Better structure usually leads to more accurate and useful AI responses.",
    },
    {
      question: "Can I use this prompt generator for ChatGPT, Claude, and Gemini?",
      answer:
        "Yes. The generated prompts are plain text, so you can use them with ChatGPT, Claude, Gemini, coding assistants, and many image-generation tools. You can also edit the output before pasting it into your preferred model.",
    },
    {
      question: "Does this tool generate prompts for images and code too?",
      answer:
        "Yes. You can create prompts for blog writing, marketing copy, code tasks, image generation, email writing, and social content. The presets are designed to give you a strong first draft that you can customize further.",
    },
    {
      question: "Is my prompt data sent to a server?",
      answer:
        "No. This tool runs entirely in your browser. Your prompt inputs stay on your device unless you choose to copy and paste them elsewhere.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function AIPromptGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">AI Prompt Generator</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate stronger prompts for writing, coding, marketing, images, and email.
          Add clear goals, audience, context, tone, and constraints so AI tools return
          more useful answers with less editing.
        </p>
      </div>

      <AIPromptGeneratorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How to Write Better AI Prompts</h2>
        <p>
          Most weak prompts fail for the same reason: they only describe the topic,
          not the job. A stronger prompt tells the model what role to take, what the
          outcome should be, who the answer is for, what constraints matter, and how the
          final result should be formatted.
        </p>

        <h2>What to Include in a Strong Prompt</h2>
        <ul>
          <li><strong>Clear objective</strong> — define the exact result you want</li>
          <li><strong>Audience</strong> — tell the model who the answer is for</li>
          <li><strong>Context</strong> — add background the model should consider</li>
          <li><strong>Constraints</strong> — specify what to avoid or prioritize</li>
          <li><strong>Output format</strong> — choose bullets, markdown, JSON, or paragraphs</li>
        </ul>

        <h2>When to Use a Prompt Generator</h2>
        <p>
          This tool is useful when you need a fast first draft for ChatGPT, Claude, Gemini,
          coding assistants, or image-generation models. It works especially well for content
          briefs, code debugging prompts, landing-page copy, email drafting, and image prompt
          engineering.
        </p>

        <h2>Tips for Better Results</h2>
        <ul>
          <li><strong>Start specific</strong> — broad prompts usually produce broad answers</li>
          <li><strong>Use constraints</strong> — tell the model what to avoid</li>
          <li><strong>Ask for a format</strong> — structure improves usability</li>
          <li><strong>Iterate once or twice</strong> — first output is often a draft, not the finish line</li>
        </ul>
      </section>
    </main>
  );
}