import type { Metadata } from "next";
import { CronExpressionGeneratorTool } from "./cron-expression-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Cron Expression Generator",
  title: "Cron Expression Generator - Free Visual Cron Builder",
  description:
    "Build cron expressions visually for Linux crontab schedules. Generate every-minute, hourly, daily, weekly, monthly, and custom cron syntax with plain-English explanations.",
  slug: "cron-expression-generator",
  keywords: [
    "cron expression generator",
    "cron builder",
    "crontab generator",
    "cron schedule generator",
    "cron expression maker",
    "linux cron expression",
    "visual cron builder",
    "cron syntax helper",
  ],
  faqs: [
    {
      question: "What is a cron expression?",
      answer:
        "A cron expression is a schedule string used by Linux cron jobs and many automation tools. Standard crontab syntax has five fields: minute, hour, day of month, month, and day of week.",
    },
    {
      question: "Does this tool use 5-field or 6-field cron syntax?",
      answer:
        "This generator uses the standard 5-field Linux crontab format: minute hour day-of-month month day-of-week. Some platforms add seconds as a sixth field, but this tool focuses on the most common cron syntax.",
    },
    {
      question: "Can I create schedules like every 15 minutes or every weekday?",
      answer:
        "Yes. You can generate recurring schedules like every N minutes, hourly, daily, weekdays only, weekly on a specific day, monthly on a specific date, or a fully custom expression.",
    },
    {
      question: "Does this cron generator calculate time zones?",
      answer:
        "No. Cron jobs run according to the server or platform time zone. Always confirm the time zone in your hosting panel, server config, or automation platform before using a generated expression.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function CronExpressionGeneratorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Cron Expression Generator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Build cron expressions visually for crontab, servers, and automation
          workflows. Generate valid schedules with a plain-English summary and
          copy the final expression instantly.
        </p>
      </div>

      <CronExpressionGeneratorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How Cron Expressions Work</h2>
        <p>
          A standard cron expression has five fields in this order:
          <strong> minute hour day-of-month month day-of-week</strong>. Each
          field can contain a fixed value, a wildcard, a step interval, or a
          list depending on how often you want the task to run.
        </p>

        <h2>Common Cron Examples</h2>
        <ul>
          <li>
            <strong>Every 15 minutes</strong> — <code>*/15 * * * *</code>
          </li>
          <li>
            <strong>Every day at 9:30 AM</strong> — <code>30 9 * * *</code>
          </li>
          <li>
            <strong>Every Monday at 8:00 AM</strong> — <code>0 8 * * 1</code>
          </li>
          <li>
            <strong>First day of every month at midnight</strong> — <code>0 0 1 * *</code>
          </li>
          <li>
            <strong>Weekdays at 6:00 PM</strong> — <code>0 18 * * 1-5</code>
          </li>
        </ul>

        <h2>Tips Before Using a Cron Schedule</h2>
        <ul>
          <li>
            <strong>Double-check the time zone</strong> — your server or cloud
            platform may not use your local time
          </li>
          <li>
            <strong>Avoid overlapping jobs</strong> — frequent schedules can
            trigger a new run before the previous one finishes
          </li>
          <li>
            <strong>Test in staging first</strong> — especially for backups,
            cleanup scripts, and billing workflows
          </li>
          <li>
            <strong>Document the purpose</strong> — keep notes about what the
            job does and who owns it
          </li>
        </ul>
      </section>
    </main>
  );
}