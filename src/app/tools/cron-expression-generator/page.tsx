import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, AlertTriangle } from "lucide-react";
import { CronExpressionGeneratorTool } from "./cron-expression-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Cron Expression Generator",
  title: "Cron Expression Generator - Free Crontab Builder",
  description:
    "Build cron expressions visually with plain-English explanations. Every 5 minutes, hourly, daily, weekdays — copy valid crontab syntax instantly, free.",
  slug: "cron-expression-generator",
  keywords: [
    "cron expression generator",
    "cron generator",
    "crontab generator",
    "cron expression builder",
    "cron expression maker",
    "cron expression online",
    "cron expression tester",
    "cron expression validator",
    "cron expression translator",
    "cron job every 5 minutes",
    "crontab builder",
    "cron schedule generator",
    "quartz cron expression generator",
    "visual cron builder",
    "cron syntax generator",
  ],
  featureList: [
    "Visual crontab schedule builder",
    "Plain-English cron translation",
    "Every-N-minutes, hourly, daily, weekly, monthly presets",
    "Copy-ready 5-field crontab syntax",
    "Runs fully in your browser",
  ],
  faqs: [
    {
      question: "What is the cron expression for every 5 minutes?",
      answer:
        "*/5 * * * * — the */5 in the minute field means every fifth minute, and the four wildcards mean every hour, day, month, and weekday. Swap the 5 for any interval: */15 for every 15 minutes, */30 for every half hour.",
    },
    {
      question: "What is a cron expression?",
      answer:
        "A cron expression is a schedule string used by Linux cron jobs and many automation tools. Standard crontab syntax has five fields: minute, hour, day of month, month, and day of week.",
    },
    {
      question: "Does this tool use 5-field or 6-field cron syntax?",
      answer:
        "This generator uses the standard 5-field Linux crontab format: minute hour day-of-month month day-of-week. Quartz and Spring add a seconds field at the front — prepend a 0 to convert a 5-field expression for those platforms.",
    },
    {
      question: "Does this cron generator handle time zones?",
      answer:
        "Cron jobs run in the server or platform time zone, not yours. Always confirm the time zone in your hosting panel, server config, or automation platform (GitHub Actions and Vercel crons use UTC) before trusting a schedule.",
    },
    {
      question: "How do I validate an existing cron expression?",
      answer:
        "Paste it into the custom field — the tool translates any valid 5-field expression into plain English, which is the fastest way to check that a schedule does what you think it does.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const cheatSheet = [
  { schedule: "Every minute", expr: "* * * * *" },
  { schedule: "Every 5 minutes", expr: "*/5 * * * *" },
  { schedule: "Every 10 minutes", expr: "*/10 * * * *" },
  { schedule: "Every 15 minutes", expr: "*/15 * * * *" },
  { schedule: "Every 30 minutes", expr: "*/30 * * * *" },
  { schedule: "Every hour", expr: "0 * * * *" },
  { schedule: "Every 2 hours", expr: "0 */2 * * *" },
  { schedule: "Every day at midnight", expr: "0 0 * * *" },
  { schedule: "Every day at 9:30 AM", expr: "30 9 * * *" },
  { schedule: "Weekdays at 6 PM", expr: "0 18 * * 1-5" },
  { schedule: "Every Monday at 8 AM", expr: "0 8 * * 1" },
  { schedule: "1st of month, midnight", expr: "0 0 1 * *" },
];

const specialChars = [
  { char: "*", meaning: "Every value", example: "* in hour = every hour" },
  { char: ",", meaning: "Value list", example: "1,15 in day = 1st and 15th" },
  { char: "-", meaning: "Range", example: "1-5 in weekday = Mon–Fri" },
  { char: "*/n", meaning: "Step interval", example: "*/10 in minute = every 10 min" },
];

export default function CronExpressionGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free Developer Tool · No Sign-up</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Cron Expression Generator & Crontab Builder
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Build cron expressions visually — every 5 minutes, hourly, weekdays, monthly — with a
          plain-English translation of every schedule. Works for Linux crontab, GitHub Actions,
          Vercel, n8n, and any tool that speaks standard cron syntax.
        </p>
      </div>

      <CronExpressionGeneratorTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Generate a Cron Expression in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Pick a schedule pattern", detail: "Every N minutes, hourly, daily, weekly, monthly — or switch to custom mode for full control of all five fields." },
            { step: "Read the plain-English translation", detail: "The tool explains exactly when the job will run — the built-in validator that catches wrong schedules before they ship." },
            { step: "Copy into your crontab or platform", detail: "Paste into crontab -e, GitHub Actions schedule, Vercel cron config, or any automation tool using 5-field syntax." },
          ].map((item, i) => (
            <li key={item.step} className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card">
              <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary font-extrabold text-sm">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base">{item.step}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Cheat sheet */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Cron Cheat Sheet: The 12 Most-Used Schedules</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
          The expressions everyone searches for, copy-ready — from every 5 minutes to monthly:
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3.5 font-bold">Schedule</th>
                <th className="p-3.5 font-bold">Cron expression</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {cheatSheet.map((row) => (
                <tr key={row.expr} className="border-b border-border last:border-0">
                  <td className="p-3.5 font-semibold text-foreground">{row.schedule}</td>
                  <td className="p-3.5 font-mono text-xs sm:text-sm">{row.expr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Syntax */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">How Cron Syntax Works (5 Fields)</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
          A standard cron expression is five space-separated fields, read left to right:
        </p>
        <div className="p-5 rounded-2xl border border-border bg-card font-mono text-xs sm:text-sm text-center overflow-x-auto mb-6">
          <span className="text-primary font-bold">minute</span>{" "}
          <span className="text-emerald-500 font-bold">hour</span>{" "}
          <span className="text-amber-500 font-bold">day-of-month</span>{" "}
          <span className="text-violet-500 font-bold">month</span>{" "}
          <span className="text-rose-500 font-bold">day-of-week</span>
          <p className="mt-3 text-[11px] sm:text-xs text-muted-foreground font-sans">
            0-59 · 0-23 · 1-31 · 1-12 · 0-6 (Sunday = 0)
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3.5 font-bold">Symbol</th>
                <th className="p-3.5 font-bold">Meaning</th>
                <th className="p-3.5 font-bold">Example</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {specialChars.map((row) => (
                <tr key={row.char} className="border-b border-border last:border-0">
                  <td className="p-3.5 font-mono font-semibold text-foreground">{row.char}</td>
                  <td className="p-3.5">{row.meaning}</td>
                  <td className="p-3.5">{row.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mistakes */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">4 Cron Mistakes That Break Schedules</h2>
        <div className="grid gap-4">
          {[
            { mistake: "Assuming your local time zone", fix: "Servers and CI platforms usually run UTC — a 9 AM job lands at 2 PM for you. Check the platform's zone before scheduling." },
            { mistake: "Overlapping long-running jobs", fix: "A 10-minute task on a 5-minute schedule stacks up. Use lock files or set the interval longer than the worst-case runtime." },
            { mistake: "Confusing day-of-month with day-of-week", fix: "Setting both fields makes the job run when EITHER matches — a classic surprise. Set one and wildcard the other." },
            { mistake: "No logging or alerting", fix: "Silent cron failures go unnoticed for months. Redirect output to a log and alert on non-zero exits." },
          ].map((m) => (
            <div key={m.mistake} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500 shrink-0" /> {m.mistake}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{m.fix}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Frequently Asked Questions</h2>
        <div className="grid gap-4">
          {toolConfig.faqs.map((faq) => (
            <div key={faq.question} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base mb-1.5">{faq.question}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">More Developer Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><Wrench size={16} className="text-primary" /> Related Free Tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/timestamp-converter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Timestamp Converter — Unix time both ways</Link></li>
              <li><Link href="/tools/regex-tester" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Regex Tester — test patterns live</Link></li>
              <li><Link href="/tools/uuid-generator" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> UUID Generator — random v4 IDs</Link></li>
              <li><Link href="/tools/json-formatter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> JSON Formatter — format and validate</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/ai-automation-roadmap-2026-what-to-automate-first" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> AI Automation Roadmap: What to Automate First</Link></li>
              <li><Link href="/blog/linux-wsl-setup-guide-2026-windows-developers" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Linux & WSL Setup Guide for Windows Devs</Link></li>
              <li><Link href="/blog/how-to-build-ai-agent-without-coding-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Build Your First AI Agent Without Coding</Link></li>
              <li><Link href="/blog/best-free-apis-for-developers-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> 30 Best Free APIs for Developers</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}