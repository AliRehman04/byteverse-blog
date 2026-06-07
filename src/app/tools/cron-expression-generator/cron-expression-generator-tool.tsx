"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, Copy, RotateCcw } from "lucide-react";

type ScheduleType =
  | "every-minute"
  | "every-n-minutes"
  | "hourly"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "custom";

const DAYS = [
  { label: "Sunday", value: "0" },
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
];

const PRESETS = [
  "*/5 * * * *",
  "*/15 * * * *",
  "0 * * * *",
  "0 0 * * *",
  "0 9 * * 1-5",
  "0 0 1 * *",
];

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function describeCron(parts: string[]) {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (parts.join(" ") === "* * * * *") return "Runs every minute.";
  if (minute.startsWith("*/") && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Runs every ${minute.slice(2)} minutes.`;
  }
  if (hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*" && /^\d+$/.test(minute)) {
    return `Runs every hour at minute ${minute}.`;
  }
  if (/^\d+$/.test(hour) && /^\d+$/.test(minute) && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Runs every day at ${pad(Number(hour))}:${pad(Number(minute))}.`;
  }
  if (/^\d+$/.test(hour) && /^\d+$/.test(minute) && dayOfWeek === "1-5" && dayOfMonth === "*" && month === "*") {
    return `Runs every weekday at ${pad(Number(hour))}:${pad(Number(minute))}.`;
  }
  if (/^\d+$/.test(hour) && /^\d+$/.test(minute) && /^\d+$/.test(dayOfWeek) && dayOfMonth === "*" && month === "*") {
    const day = DAYS.find((entry) => entry.value === dayOfWeek)?.label ?? `day ${dayOfWeek}`;
    return `Runs every ${day} at ${pad(Number(hour))}:${pad(Number(minute))}.`;
  }
  if (/^\d+$/.test(hour) && /^\d+$/.test(minute) && /^\d+$/.test(dayOfMonth) && month === "*" && dayOfWeek === "*") {
    return `Runs on day ${dayOfMonth} of every month at ${pad(Number(hour))}:${pad(Number(minute))}.`;
  }
  return "Custom cron schedule. Verify the expression on your target platform before using it.";
}

export function CronExpressionGeneratorTool() {
  const [scheduleType, setScheduleType] = useState<ScheduleType>("every-n-minutes");
  const [interval, setInterval] = useState("15");
  const [minute, setMinute] = useState("0");
  const [hour, setHour] = useState("9");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [customExpression, setCustomExpression] = useState("0 9 * * 1-5");
  const [copied, setCopied] = useState(false);

  const expression = useMemo(() => {
    switch (scheduleType) {
      case "every-minute":
        return "* * * * *";
      case "every-n-minutes":
        return `*/${interval} * * * *`;
      case "hourly":
        return `${minute} * * * *`;
      case "daily":
        return `${minute} ${hour} * * *`;
      case "weekdays":
        return `${minute} ${hour} * * 1-5`;
      case "weekly":
        return `${minute} ${hour} * * ${dayOfWeek}`;
      case "monthly":
        return `${minute} ${hour} ${dayOfMonth} * *`;
      case "custom":
        return customExpression.trim();
      default:
        return "* * * * *";
    }
  }, [customExpression, dayOfMonth, dayOfWeek, hour, interval, minute, scheduleType]);

  const parts = expression.split(/\s+/).filter(Boolean);
  const isValid = parts.length === 5;
  const summary = isValid
    ? describeCron(parts)
    : "Cron expressions in this tool must have exactly 5 fields: minute hour day-of-month month day-of-week.";

  async function handleCopy() {
    await navigator.clipboard.writeText(expression);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handleReset() {
    setScheduleType("every-n-minutes");
    setInterval("15");
    setMinute("0");
    setHour("9");
    setDayOfWeek("1");
    setDayOfMonth("1");
    setCustomExpression("0 9 * * 1-5");
    setCopied(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary mb-2">
              Visual Builder
            </p>
            <h2 className="text-2xl font-bold">Create a cron schedule</h2>
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

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Schedule type</span>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-0 transition focus:border-primary"
            >
              <option value="every-minute">Every minute</option>
              <option value="every-n-minutes">Every N minutes</option>
              <option value="hourly">Every hour</option>
              <option value="daily">Every day</option>
              <option value="weekdays">Every weekday</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
              <option value="custom">Custom expression</option>
            </select>
          </label>

          {scheduleType === "every-n-minutes" && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Repeat every</span>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              >
                {[5, 10, 15, 20, 30].map((value) => (
                  <option key={value} value={String(value)}>{value} minutes</option>
                ))}
              </select>
            </label>
          )}

          {scheduleType === "hourly" && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Minute of each hour</span>
              <input
                type="number"
                min="0"
                max="59"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </label>
          )}

          {["daily", "weekdays", "weekly", "monthly"].includes(scheduleType) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Hour</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Minute</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                />
              </label>
            </div>
          )}

          {scheduleType === "weekly" && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Day of week</span>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </label>
          )}

          {scheduleType === "monthly" && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Day of month</span>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </label>
          )}

          {scheduleType === "custom" && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Custom 5-field cron expression</span>
              <input
                type="text"
                value={customExpression}
                onChange={(e) => setCustomExpression(e.target.value)}
                placeholder="0 9 * * 1-5"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono outline-none transition focus:border-primary"
              />
            </label>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock3 size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Output</p>
            <h2 className="text-2xl font-bold">Cron expression</h2>
          </div>
        </div>

        <div className="rounded-2xl bg-muted/50 p-4 border border-border">
          <div className="flex items-start justify-between gap-3">
            <code className="text-lg sm:text-xl font-bold break-all">{expression}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className={`mt-3 text-sm ${isValid ? "text-muted-foreground" : "text-red-500"}`}>
            {summary}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-border p-4">
          <h3 className="font-semibold mb-3">Field order</h3>
          <div className="grid grid-cols-5 gap-2 text-center text-xs sm:text-sm">
            {[
              [parts[0] ?? "-", "Minute"],
              [parts[1] ?? "-", "Hour"],
              [parts[2] ?? "-", "Day"],
              [parts[3] ?? "-", "Month"],
              [parts[4] ?? "-", "Weekday"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-muted/60 p-2.5 border border-border">
                <div className="font-mono font-bold text-foreground">{value}</div>
                <div className="mt-1 text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border p-4">
          <h3 className="font-semibold mb-3">Popular presets</h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setScheduleType("custom");
                  setCustomExpression(preset);
                }}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-mono hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-primary/5 border border-primary/15 p-4 text-sm text-muted-foreground">
          Cron syntax can vary slightly between platforms. Linux crontab uses 5
          fields, while some systems add seconds as a sixth field. Always check
          your target environment before pasting a schedule into production.
        </div>
      </section>
    </div>
  );
}