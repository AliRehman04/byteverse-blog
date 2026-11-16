import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import sharp from "sharp";
import ts from "typescript";

// The real n8n 2.47.7 TypeScript sources are saved outside the repository and executed unmodified.
const sourceDir = new URL("../../.byteverse-schedule-check/src-2.47.7/", import.meta.url);
const fixtureRequire = createRequire(new URL("../../.byteverse-schedule-check/package.json", import.meta.url));
const versions = Object.fromEntries(["cron-parser", "cron", "luxon", "moment-timezone"].map((name) => [name, fixtureRequire(`${name}/package.json`).version]));
assert.deepEqual(versions, { "cron-parser": "5.6.1", cron: "4.4.0", luxon: "3.7.2", "moment-timezone": "0.5.48" }, "Recheck every example before changing a fixture version");
const sourceText = (file) => readFileSync(new URL(file, sourceDir), "utf8");
const relativeFiles = {
  errors: "scheduler-errors.ts", cron: "scheduler-cron.ts", field: "field.ts", periods: "periods.ts", interval: "interval.ts",
  "one-off": "one-off.ts", "recurring-cron": "recurring-cron.ts", validate: "validate.ts", "next-run": "next-run.ts", nodes: "constants-nodes.ts",
};
const moduleCache = new Map();
class NodeOperationError extends Error {
  constructor(node, message, options = {}) { super(message); this.description = options.description; }
}
function loadSource(file) {
  if (moduleCache.has(file)) return moduleCache.get(file).exports;
  const { outputText } = ts.transpileModule(sourceText(file), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const record = { exports: {} };
  moduleCache.set(file, record);
  new Function("require", "module", "exports", outputText)((name) => {
    if (name === "n8n-workflow") return { NodeOperationError };
    if (name === "@n8n/constants") return { ...loadSource("constants-time.ts"), ...loadSource("constants-scheduler.ts") };
    if (name === "crypto" || name === "node:crypto") return fixtureRequire("node:crypto");
    if (name.startsWith(".")) {
      const key = name.split("/").pop();
      if (key === "types" || key === "workflow-node-task-payload") return {};
      assert(relativeFiles[key], `Unmapped n8n source import ${name} in ${file}`);
      return loadSource(relativeFiles[key]);
    }
    return fixtureRequire(name);
  }, record, record.exports);
  return record.exports;
}
const node = loadSource("GenericFunctions.ts");
const scheduler = { ...loadSource("next-run.ts"), ...loadSource("scheduler-cron.ts") };
const { buildScheduleTriggerItem } = loadSource("schedule-trigger-task.ts");
const { CronExpressionParser } = fixtureRequire("cron-parser");
const { sendAt } = fixtureRequire("cron");
const { DateTime } = fixtureRequire("luxon");

const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/n8n-schedule-trigger-guide.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const blocks = [...content.matchAll(/^```([^\n]+)\n([\s\S]*?)\n```/gm)].map((match) => ({ language: match[1], code: match[2] }));
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  proseWords: wordCount,
  contentSha256: createHash("sha256").update(content).digest("hex"),
  readingTime: `${Math.ceil(wordCount / 220)} min read`,
  codeBlocks: blocks.length,
  tables: (content.match(/^\|---/gm) ?? []).length,
};
const ledger = JSON.parse(readFileSync(new URL("../docs/n8n-schedule-trigger-keywords-2026-11-16.json", import.meta.url), "utf8"));
if (process.argv.includes("--metrics")) console.log(JSON.stringify(metrics, null, 2));

const format = (date, zone, pattern) => DateTime.fromJSDate(date, { zone }).toFormat(pattern);
const at = (local, zone) => DateTime.fromISO(local, { zone }).toJSDate();
function cronRuns(expression, zone, start, count, pattern = "ccc dd LLL HH:mm:ss") {
  const cursor = CronExpressionParser.parse(expression, { currentDate: start, tz: zone });
  return Array.from({ length: count }, () => format(cursor.next().toDate(), zone, pattern));
}
function scheduleRuns(schedule, publishedAt, count, zone = "UTC", pattern = "HH:mm:ss") {
  const runs = [];
  for (const date of scheduler.occurrencesFrom(schedule, scheduler.computeFirstRunAt(schedule, publishedAt))) {
    runs.push(format(date, zone, pattern));
    if (runs.length === count) break;
  }
  return runs;
}
const accepted = (check) => { try { check(); return true; } catch { return false; } };
const publishAccepts = (expression, timezone = "America/New_York") => accepted(() => scheduler.validateCron({ kind: "cron", cronExpression: expression, timezone }));
const manualAccepts = (expression) => accepted(() => sendAt(expression));
const tableAfter = (heading) => {
  const section = content.split(`\n${heading}\n`)[1];
  assert(section, `Missing section ${heading}`);
  const rows = section.split("\n|---")[1].split("\n").slice(1);
  const end = rows.findIndex((row) => !row.startsWith("|"));
  return (end === -1 ? rows : rows.slice(0, end)).map((row) => row.slice(1, -1).split(" | ").map((cell) => cell.trim()));
};
const sampleKey = "wf_8Kq2:schedule-node-1";
const noon = at("2026-11-16T12:00:00", "America/New_York");

test("draft blocks parse and FAQ structure matches the blog convention", () => {
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  const faqSection = content.split("\n## Frequently Asked Questions")[1].split("\n## ")[0];
  assert.equal(faqSection.match(/^### /gm)?.length, ledger.faq.length);
  for (const answer of faqSection.split(/^### .+$/m).slice(1)) assert(!/[#*_`>-]/.test(answer), "FAQ answers must survive the schema character filter");
  for (const block of blocks) assert(["txt", "json", "bash", "yaml"].includes(block.language), block.language);
  for (const block of blocks.filter((item) => item.language === "json")) JSON.parse(block.code);
  assert(!/\u2014/.test(content), "No em dashes in published content");
  const body = content.split("\n## Sources and Further Reading")[0];
  for (const paragraph of body.split("\n\n")) {
    if (/^[|`#\-!\d]/.test(paragraph.trim())) continue;
    assert(paragraph.trim().split(/\s+/).length <= 75, `Paragraph too long: ${paragraph.slice(0, 60)}`);
  }
});

test("saved n8n sources are the files recorded for the 2.47.7 tag", () => {
  for (const [file, hash] of Object.entries(ledger.validation.sourceSha256)) {
    assert.equal(createHash("sha256").update(readFileSync(new URL(file, sourceDir))).digest("hex"), hash, file);
  }
  assert.equal(ledger.validation.sourceTag, "n8n@2.47.7");
});

test("node description facts quoted in the article exist in the source", () => {
  const source = sourceText("ScheduleTrigger.node.ts");
  assert(source.includes("version: [1, 1.1, 1.2, 1.3, 1.4]"));
  assert(source.includes("This workflow will run on the schedule you define here once you publish it.") && content.includes('"once you publish it"'));
  assert(source.includes("hint: 'Format: ([Second]) [Minute] [Hour] [Day of Month] [Month] [Day of Week]'"));
  assert(content.includes("`([Second]) [Minute] [Hour] [Day of Month] [Month] [Day of Week]`"));
  const intervalNames = [...source.split("displayName: 'Trigger Interval',\n\t\t\t\t\t\t\t\tname: 'field'")[1].split("displayName: 'Seconds Between Triggers'")[0].matchAll(/name: '([^']+)',\n\t+value:/g)].map((match) => match[1]);
  assert.deepEqual(intervalNames, ["Seconds", "Minutes", "Hours", "Days", "Weeks", "Months", "Custom (Cron)"]);
  assert.deepEqual(tableAfter("## What each Trigger Interval really does").map((row) => row[0]), intervalNames);
  assert(content.includes("The node offers seven choices under Trigger Interval."));
  for (const label of ["If Execution Is Missed", "Don't Run Missed Executions", "Run the Most Recent Missed Execution", "Run the Most Recent Missed Execution Per Rule", "Missed Execution Grace Period (Seconds)"]) {
    assert(source.includes(label) && content.includes(label), label);
  }
  assert(source.includes("default: 'skip'") && source.includes("'@version': [{ _cnd: { gte: 1.4 } }]"));
  assert(source.includes("default: [0],") && source.includes("name: 'Sunday',\n\t\t\t\t\t\t\t\t\t\tvalue: 0,"), "Default weekday is Sunday");
  assert(source.includes("const { interval, cronExpression, recurrence } = rules[0];") && source.includes("sendAt(cronExpression);"), "Manual runs use the first rule and the cron package");
  assert(source.includes("throw new NodeOperationError(this.getNode(), 'Invalid cron expression'"));
  assert(source.includes("hint: 'If a month doesn’t have this day, the node won’t trigger'"));
});

test("interval limits and messages match the validation code", () => {
  const message = (interval) => { try { node.validateInterval({}, 0, interval); return null; } catch (error) { return `${error.message}: ${error.description}`; } };
  assert.equal(message({ field: "seconds", secondsInterval: 60 }), "Invalid interval: Seconds must be in range 1-59");
  assert.equal(message({ field: "minutes", minutesInterval: 90 }), "Invalid interval: Minutes must be in range 1-59");
  assert.equal(message({ field: "hours", hoursInterval: 24 }), "Invalid interval: Hours must be in range 1-23");
  assert.equal(message({ field: "days", daysInterval: 32 }), "Invalid interval: Days must be in range 1-31");
  assert.equal(message({ field: "months", monthsInterval: 0 }), "Invalid interval: Months must be larger than 0");
  for (const interval of [{ field: "seconds", secondsInterval: 59 }, { field: "minutes", minutesInterval: 1 }, { field: "hours", hoursInterval: 23 }, { field: "days", daysInterval: 31 }, { field: "weeks", weeksInterval: 4 }]) assert.equal(message(interval), null);
  assert(content.includes('"Minutes must be in range 1-59"'));
  const rows = Object.fromEntries(tableAfter("## What each Trigger Interval really does").map((row) => [row[0], row[1]]));
  assert.deepEqual([rows.Seconds, rows.Minutes, rows.Hours, rows.Days], ["1 to 59", "1 to 59", "1 to 23", "1 to 31"]);
});

test("the seconds offset is stable per node and absent from seconds and cron rules", () => {
  assert.equal(node.toCronExpression({ field: "days", daysInterval: 1, triggerAtHour: 9, triggerAtMinute: 0 }, sampleKey), "15 0 9 * * *");
  assert(content.includes("`15 0 9 * * *`"));
  assert.equal(node.toCronExpression({ field: "minutes", minutesInterval: 5 }, sampleKey), "15 */5 * * * *");
  assert.equal(node.toCronExpression({ field: "seconds", secondsInterval: 30 }, sampleKey), "*/30 * * * * *");
  assert.equal(node.toCronExpression({ field: "cronExpression", expression: "0 9 * * 1-5" }, sampleKey), "0 9 * * 1-5");
  assert.equal(node.toCronExpression({ field: "days", daysInterval: 1 }, sampleKey), "15 49 9 * * *", "Missing hour and minute are filled from the node key");
  const seconds = new Set();
  for (let index = 0; index < 200; index++) seconds.add(node.toCronExpression({ field: "minutes", minutesInterval: 5 }, `wf${index}:n${index}`).split(" ")[0]);
  assert.equal(seconds.size, 54);
  assert(content.includes("Across 200 made-up node IDs I counted 54 different seconds."));
  assert.equal(node.toCronExpression({ field: "weeks", weeksInterval: 1, triggerAtDay: [1, 2, 3, 4, 5], triggerAtHour: 9, triggerAtMinute: 0 }, sampleKey), "15 0 9 * * 1,2,3,4,5");
  assert.equal(cronRuns("0 9 * * *", "UTC", new Date("2026-11-16T00:00:00Z"), 1, "ss")[0], "00", "Five fields start at second 0");
});

test("the timezone table, name rules and defaults are correct", () => {
  const rows = tableAfter("So a self-hosted workflow set to 9am by someone in Karachi runs at 9am New York time. In winter that is 7pm in Karachi.\n\nThe table shows the same cron rule, `0 9 * * *`, on 16 November 2026 under five timezone settings. Each row was computed with the library n8n uses.\n");
  assert.equal(rows.length, 5);
  for (const [zone, utc, local] of rows) {
    const run = CronExpressionParser.parse("0 9 * * *", { currentDate: new Date("2026-11-16T00:00:00Z"), tz: zone }).next().toDate();
    assert.equal(format(run, "UTC", "HH:mm"), utc, zone);
    assert.equal(format(run, zone, "HH:mm"), local, zone);
    assert.equal(format(run, "UTC", "yyyy-MM-dd"), "2026-11-16");
  }
  assert.equal(format(at("2026-11-16T09:00:00", "America/New_York"), "Asia/Karachi", "HH:mm"), "19:00");
  assert.equal(publishAccepts("0 9 * * *", "PKT"), false);
  assert.equal(publishAccepts("0 9 * * *", "Pakistan/Lahore"), false);
  assert.equal(publishAccepts("0 9 * * *", "Asia/Karachi"), true);
  assert.equal(publishAccepts("0 9 * * *", "EST"), true);
  const july = new Date("2026-07-01T12:00:00Z");
  assert.deepEqual([format(july, "EST", "ZZ"), format(new Date("2026-01-01T12:00:00Z"), "EST", "ZZ"), format(july, "America/New_York", "ZZ")], ["-05:00", "-05:00", "-04:00"]);
  assert(sourceText("generic.config.ts").includes("@Env('GENERIC_TIMEZONE')\n\ttimezone: string = 'America/New_York';"));
  assert(sourceText("workflow.ts").includes("this.timezone = this.settings.timezone ?? getGlobalState().defaultTimezone;"));
  assert(sourceText("schedule-trigger-job-registrar.ts").includes("return typeof timezone === 'string' && timezone !== '' && timezone !== 'DEFAULT'"));
  for (const variable of ["GENERIC_TIMEZONE", "TZ"]) for (const block of blocks.filter((item) => ["bash", "yaml"].includes(item.language))) assert(block.code.includes(`${variable}=`), variable);
});

test("the printed trigger item is what the n8n item builder returns", () => {
  const item = buildScheduleTriggerItem(new Date("2026-11-16T14:00:00Z"), "America/New_York").json;
  assert.deepEqual(JSON.parse(blocks.find((block) => block.language === "json").code), item);
  assert.equal(Object.keys(item).length, 11);
  assert.equal(item.Timezone, "America/New_York (UTC-05:00)");
  assert(sourceText("schedule-trigger-task-handler.ts").includes("buildScheduleTriggerItem(task.scheduledFor, timezone)"), "Durable runs stamp the scheduled time");
});

test("seconds and minutes intervals count from publication in the default mode", () => {
  assert(sourceText("scheduler.config.ts").includes("@Env('N8N_SCHEDULER_ENABLED')\n\tenabled: boolean = true;"));
  assert(sourceText("scheduler.config.ts").includes("triggerNodeMode: 'legacy' | 'new' = 'new';"));
  assert(sourceText("workflows.config.ts").includes("useWorkflowPublicationService: boolean = true;"));
  assert(sourceText("constants-scheduler.ts").includes("export const DEFAULT_MISFIRE_GRACE_SECONDS = 60;"));
  assert(sourceText("schedule-trigger-job-registrar.ts").includes("return { kind: 'interval', intervalSeconds };"));
  assert.deepEqual(scheduleRuns({ kind: "interval", intervalSeconds: 30 }, new Date("2026-11-16T09:00:07Z"), 3), ["09:00:37", "09:01:07", "09:01:37"]);
  assert.deepEqual(scheduleRuns({ kind: "interval", intervalSeconds: 900 }, new Date("2026-11-16T09:07:42Z"), 3), ["09:22:42", "09:37:42", "09:52:42"]);
  const sevenMinutes = scheduleRuns({ kind: "interval", intervalSeconds: 420 }, new Date("2026-11-16T09:00:07Z"), 10);
  assert.deepEqual(sevenMinutes.slice(7), ["09:56:07", "10:03:07", "10:10:07"]);
  assert.deepEqual(cronRuns("*/15 * * * *", "UTC", new Date("2026-11-16T09:07:42Z"), 3, "HH:mm"), ["09:15", "09:30", "09:45"]);
});

test("hours, days, weeks and months rules run as the article describes", () => {
  const zone = "America/New_York";
  const twoHours = { kind: "recurring_cron", cronExpression: node.toCronExpression({ field: "hours", hoursInterval: 2, triggerAtMinute: 0 }, sampleKey), timezone: zone, recurrenceUnit: "hours", recurrenceSize: 2 };
  assert.deepEqual(scheduleRuns(twoHours, at("2026-11-16T11:30:00", zone), 3, zone, "HH:mm"), ["12:00", "14:00", "16:00"]);
  const twoDays = { kind: "recurring_cron", cronExpression: node.toCronExpression({ field: "days", daysInterval: 2, triggerAtHour: 9, triggerAtMinute: 15 }, sampleKey), timezone: zone, recurrenceUnit: "days", recurrenceSize: 2 };
  assert.deepEqual(scheduleRuns(twoDays, at("2026-11-16T04:00:00", zone), 3, zone, "cccc d HH:mm"), ["Monday 16 09:15", "Wednesday 18 09:15", "Friday 20 09:15"]);
  const twoWeeks = { kind: "recurring_cron", cronExpression: "0 0 9 * * 1,3", timezone: "UTC", recurrenceUnit: "weeks", recurrenceSize: 2 };
  assert.deepEqual(scheduleRuns(twoWeeks, new Date("2026-11-15T12:00:00Z"), 6, "UTC", "ccc d LLL"), ["Mon 16 Nov", "Wed 18 Nov", "Mon 30 Nov", "Wed 2 Dec", "Mon 14 Dec", "Wed 16 Dec"]);
  assert(sourceText("periods.ts").includes("Weeks start on Sunday."));
  const day31 = node.toCronExpression({ field: "months", monthsInterval: 1, triggerAtDayOfMonth: 31, triggerAtHour: 9, triggerAtMinute: 0 }, sampleKey);
  assert.deepEqual(cronRuns(day31, "UTC", new Date("2026-11-16T00:00:00Z"), 4, "d LLLL"), ["31 December", "31 January", "31 March", "31 May"]);
  const fiveHours = { kind: "recurring_cron", cronExpression: "0 0 * * * *", timezone: "UTC", recurrenceUnit: "hours", recurrenceSize: 5 };
  assert.deepEqual(scheduleRuns(fiveHours, new Date("2026-11-16T09:00:07Z"), 5, "UTC", "HH:mm"), ["10:00", "15:00", "20:00", "01:00", "06:00"]);
});

test("every row of the cron examples table matches the executed next runs", () => {
  const rows = Object.fromEntries(tableAfter("These expressions were all executed in the America/New_York timezone, starting from Monday 16 November 2026 at 12:00.\n").map((row) => [row[0].replaceAll("`", ""), row[2]]));
  const zone = "America/New_York";
  const expected = {
    "*/5 * * * *": cronRuns("*/5 * * * *", zone, noon, 3, "HH:mm").join(", "),
    "0 * * * *": cronRuns("0 * * * *", zone, noon, 3, "HH:mm").join(", "),
    "0 6 * * *": cronRuns("0 6 * * *", zone, noon, 2, "cccc HH:mm").join(", "),
    "0 9 * * 1-5": `${cronRuns("0 9 * * 1-5", zone, noon, 3, "cccc").join(", ")} at 09:00`,
    "0 9,13,17 * * 1-5": cronRuns("0 9,13,17 * * 1-5", zone, noon, 3, "cccc HH:mm").join(", "),
    "0 12 * * 1": cronRuns("0 12 * * 1", zone, noon, 2, "d LLLL").join(", "),
    "0 0 1 * *": cronRuns("0 0 1 * *", zone, noon, 2, "d LLLL").join(", "),
    "0 0 1 1,4,7,10 *": cronRuns("0 0 1 1,4,7,10 *", zone, noon, 2, "d LLLL").join(", "),
    "*/10 * * * * *": cronRuns("*/10 * * * * *", zone, noon, 3, "HH:mm:ss").join(", "),
  };
  assert.deepEqual(rows, expected);
  assert.equal(cronRuns("0 9 * * 1-5", zone, noon, 3, "HH:mm").every((time) => time === "09:00"), true);
  assert.equal(cronRuns("0 9 * * 7", "UTC", new Date("2026-11-16T00:00:00Z"), 1, "cccc")[0], "Sunday");
  assert.equal(cronRuns("0 9 * * 0", "UTC", new Date("2026-11-16T00:00:00Z"), 1, "cccc")[0], "Sunday");
  for (const expression of ["0 9 * * SUN", "0 9 * JAN *", "0 9 * * MON-FRI"]) assert(publishAccepts(expression) && manualAccepts(expression), expression);
});

test("the four cron surprises were observed", () => {
  assert.deepEqual(cronRuns("*/7 * * * *", "UTC", new Date("2026-11-16T09:40:00Z"), 4, "mm"), ["42", "49", "56", "00"]);
  assert.deepEqual(cronRuns("0 */5 * * *", "UTC", new Date("2026-11-16T10:30:00Z"), 3, "HH:mm"), ["15:00", "20:00", "00:00"]);
  assert.deepEqual(cronRuns("0 0 */3 * *", "UTC", new Date("2026-12-24T12:00:00Z"), 4, "d LLLL"), ["25 December", "28 December", "31 December", "1 January"]);
  const friday13 = cronRuns("0 9 13 * 5", "UTC", new Date("2026-11-16T00:00:00Z"), 6, "cccc d LLLL");
  assert.deepEqual(friday13, ["Friday 20 November", "Friday 27 November", "Friday 4 December", "Friday 11 December", "Sunday 13 December", "Friday 18 December"]);
  const everySecond = CronExpressionParser.parse("* * * * * *", { currentDate: new Date("2026-11-16T09:00:00Z"), tz: "UTC" });
  let runs = 0;
  while (everySecond.next().toDate() <= new Date("2026-11-16T09:01:00Z")) runs++;
  assert.equal(runs, 60);
  const zone = "America/New_York";
  assert.deepEqual(cronRuns("30 2 * * *", zone, at("2026-03-06T12:00:00", zone), 3, "d LLL HH:mm"), ["7 Mar 02:30", "8 Mar 03:30", "9 Mar 02:30"]);
  const fallBack = cronRuns("30 1 * * *", zone, at("2026-10-30T12:00:00", zone), 3, "d LLL HH:mm ZZ");
  assert.deepEqual(fallBack, ["31 Oct 01:30 -04:00", "1 Nov 01:30 -04:00", "2 Nov 01:30 -05:00"]);
  assert.deepEqual(cronRuns("0 9 * * *", zone, at("2026-03-06T12:00:00", zone), 2, "HH:mm"), ["09:00", "09:00"]);
  const utcTimes = (() => { const cursor = CronExpressionParser.parse("0 9 * * *", { currentDate: at("2026-03-06T12:00:00", zone), tz: zone }); return [cursor.next().toDate(), cursor.next().toDate()].map((date) => format(date, "UTC", "HH:mm")); })();
  assert.deepEqual(utcTimes, ["14:00", "13:00"]);
});

test("the syntax table matches both validators n8n calls", () => {
  const rows = tableAfter("The source uses two different libraries to check a cron expression. A manual test run on the canvas validates it with the `cron` package. Publishing on the durable scheduler validates it with `cron-parser`. I ran both, at the versions n8n 2.47.7 pins.\n");
  assert.equal(rows.length, 8);
  for (const [cell, manual, publish] of rows) {
    const expression = cell.match(/`([^`]+)`/)[1];
    assert.equal(manualAccepts(expression) ? "Accepted" : "Rejected", manual, `manual ${expression}`);
    assert.equal(publishAccepts(expression) ? "Accepted" : "Rejected", publish.split(",")[0], `publish ${expression}`);
  }
  assert.equal(accepted(() => scheduler.validateCron({ kind: "cron", cronExpression: "@daily", timezone: "UTC" })), false);
  assert.throws(() => scheduler.validateCron({ kind: "cron", cronExpression: "@daily", timezone: "UTC" }), /must have 5 or 6 fields/);
  for (const expression of ["* * * *", "0 0 9 * * 1-5 2026"]) assert(!publishAccepts(expression) && !manualAccepts(expression), expression);
  assert(sourceText("scheduler-cron.ts").includes("import { CronExpressionParser } from 'cron-parser';"));
  assert(sourceText("ScheduleTrigger.node.ts").includes("import { sendAt } from 'cron';"));
  assert(sourceText("scheduled-task-manager.ts").includes("import { CronJob, CronTime } from 'cron';"), "The in-memory scheduler uses the cron package");
  assert(sourceText("schedule-trigger-job-registrar.ts").includes("const computed = computeFirstRunAt("));
});

test("the recipes produce the stated schedules", () => {
  const ninety = blocks.filter((block) => block.language === "txt")[0].code.split("\n");
  assert.equal(ninety.length, 2);
  const times = ninety.flatMap((expression) => cronRuns(expression, "UTC", new Date("2026-11-15T23:59:00Z"), 8, "HH:mm")).sort();
  assert.deepEqual(times.slice(0, 5), ["00:00", "01:30", "03:00", "04:30", "06:00"]);
  assert.equal(times.length, 16);
  for (let index = 1; index < times.length; index++) {
    const [hour, minute] = times[index].split(":").map(Number);
    const [previousHour, previousMinute] = times[index - 1].split(":").map(Number);
    assert.equal(hour * 60 + minute - (previousHour * 60 + previousMinute), 90);
  }
  const lastDay = blocks.filter((block) => block.language === "txt")[1].code;
  assert.equal(lastDay, "{{ $now.plus({ days: 1 }).day === 1 }}");
  const check = (date) => new Function("$now", `return ${lastDay.slice(2, -2)};`)(DateTime.fromISO(date, { zone: "UTC" }));
  assert.deepEqual(["2026-11-30", "2026-02-28", "2028-02-29", "2028-02-28", "2026-11-29"].map(check), [true, true, true, false, false]);
  assert.deepEqual(cronRuns("0 9,13,17 * * *", "UTC", new Date("2026-11-16T00:00:00Z"), 3, "HH:mm"), ["09:00", "13:00", "17:00"]);
  assert.deepEqual(cronRuns("0 9 1 * *", "UTC", new Date("2026-11-16T00:00:00Z"), 2, "d LLLL"), ["1 December", "1 January"]);
  assert.deepEqual(cronRuns("0 9 * * 1", "UTC", new Date("2026-11-16T00:00:00Z"), 1, "cccc HH:mm"), ["Monday 09:00"]);
});

const require = createRequire(import.meta.url);
function loadLocal(path, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", compiled.outputText)((name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer dependency ${name}`);
    return require(name);
  }, record, record.exports);
  return record.exports;
}
const siteConfig = { url: ledger.website, name: "ByteVerse" };
const imageSeo = loadLocal("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const { MarkdownRenderer } = loadLocal("src/components/markdown-renderer.tsx", {
  "@/lib/image-seo": imageSeo,
  "@/lib/config": { siteConfig },
  "@/components/copy-button": loadLocal("src/components/copy-button.tsx"),
  "@/components/code-playground": { CodePlayground() { throw new Error("n8n examples must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata, slug and measured article figures are consistent without invented SEO metrics", () => {
  assert.equal(ledger.slug, "n8n-schedule-trigger-guide");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 70);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  for (const [key, value] of Object.entries(metrics)) assert.equal(ledger.validation[key], value, key);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  assert.deepEqual(ledger.validation.libraryVersions, versions);
  for (const value of Object.values(ledger.metrics)) assert.equal(value, null);
  assert(!/\ufffd|\0|\bTODO\b|\bTBD\b/.test(content));
});

test("the real renderer preserves code blocks, tables and the intended links", () => {
  const actual = all(document, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
  assert.deepEqual(actual, blocks.map((block) => block.code.trim()));
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const links = all(document, (node) => node.name === "a");
  const internal = [...new Set(links.filter((node) => node.attribs.href?.startsWith("/")).map((node) => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  const external = links.filter((node) => node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), [...ledger.sources.map((source) => source.url), ledger.images.coverCredit, ledger.images.inlineCredit].sort());
  assert(external.every((node) => node.attribs.rel.includes("noopener")));
});

const pageSource = readFileSync(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8");
// The site-wide FAQPage schema only carries the first few visible questions.
const faqSchemaLimit = Number(pageSource.match(/mainEntity: faqs\.slice\(0, (\d+)\)/)?.[1]);

test("every visible FAQ matches the existing schema extractor exactly", () => {
  const start = pageSource.indexOf("  const faqRegex =");
  const end = pageSource.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  assert.equal(faqSchemaLimit, ledger.validation.faqSchemaLimit, "FAQPage schema cap changed in page.tsx");
  const compiled = ts.transpileModule(pageSource.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqs = new Function("post", `${compiled}; return faqs;`)({ content });
  const details = all(document, (node) => node.name === "details");
  const collapse = (text) => text.replace(/\s+/g, " ").trim();
  assert.equal(details.length, ledger.faq.length);
  assert.deepEqual(faqs.map((faq) => faq.question), ledger.faq);
  assert.deepEqual(details.map((node) => DomUtils.textContent(one(node, (child) => child.name === "summary"))), ledger.faq);
  assert.deepEqual(faqs.map((faq) => collapse(faq.answer)), details.map((node) => collapse(DomUtils.textContent(one(node, (child) => child.name === "p")))));
});

test("photographs have valid files, credits and an honest scope disclosure", async () => {
  const image = one(document, (node) => node.name === "img");
  assert.equal(image.attribs.src, ledger.images.inline);
  assert.equal(image.attribs.width, "1200");
  assert.equal(image.attribs.height, "675");
  assert.equal(image.attribs.loading, "eager");
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /not a screenshot of n8n.*cottonbro studio \/ Pexels/);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const info = await sharp(readFileSync(new URL(`../${path}`, import.meta.url))).metadata();
    assert.equal(info.width, 1200);
    assert.equal(info.height, 675);
    assert.equal(info.format, "jpeg");
  }
  assert(content.includes("not a substitute for running the workflow in your own instance"));
  assert(content.includes("I did not start an n8n server for this guide."));
});

if (mode === "--preview") {
  const response = await fetch(`${ledger.website}/blog/n8n-merge-node-guide`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const liveDocument = parseDocument(await response.text());
  const styles = all(liveDocument, (node) => node.name === "link" && node.attribs.rel === "stylesheet")
    .map((node) => new URL(node.attribs.href, ledger.website).href);
  assert(styles.length > 0);
  const bodyClass = one(liveDocument, (node) => node.name === "body").attribs.class ?? "";
  const element = createElement;
  const page = element("html", { lang: "en" },
    element("head", null,
      element("meta", { charSet: "utf-8" }),
      element("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      element("meta", { name: "robots", content: "noindex,nofollow" }),
      element("meta", { name: "description", content: ledger.targeting.metaDescription }),
      element("base", { href: `${ledger.website}/` }),
      element("title", null, `${ledger.targeting.metaTitle} | ByteVerse Draft`),
      ...styles.map((href) => element("link", { key: href, rel: "stylesheet", href })),
      element("style", null, "html{scroll-behavior:auto}main{width:100%;min-width:0}h1{overflow-wrap:anywhere;letter-spacing:0}.preview-cover{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain}"),
    ),
    element("body", { className: bodyClass },
      element("header", { className: "border-b border-border" },
        element("nav", { className: "mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4", "aria-label": "Preview navigation" },
          element("a", { href: ledger.website, className: "font-bold text-xl" }, "ByteVerse"),
          element("span", { className: "text-sm text-muted-foreground" }, "Local draft"),
        ),
      ),
      element("main", { className: "mx-auto max-w-3xl px-4 sm:px-6 py-8" },
        element("article", null,
          element("p", { className: "text-sm text-primary mb-4" }, "Tech Guides"),
          element("h1", { className: "text-3xl sm:text-4xl font-extrabold leading-tight mb-6" }, ledger.targeting.title),
          element("p", { className: "text-lg text-muted-foreground leading-relaxed mb-6" }, ledger.targeting.excerpt),
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 16, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "A person using a task board on a laptop, with a sticky note showing a time on the screen", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, `Photo: ${ledger.images.coverPhotographer} / Pexels`),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-schedule-preview/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const output = new URL("index.html", directory);
  writeFileSync(output, `<!DOCTYPE html>${renderToStaticMarkup(page)}`, "utf8");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel: "msedge", headless: true, ignoreDefaultArgs: ["--hide-scrollbars"] });
  const results = [];
  try {
    for (const [width, theme] of [[320, "light"], [375, "light"], [375, "dark"], [768, "light"], [1440, "light"]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce", serviceWorkers: "block" });
      try {
        await context.route("**/*", (route) => {
          const requestUrl = new URL(route.request().url());
          const local = requestUrl.protocol === "file:";
          const asset = requestUrl.origin === ledger.website && /\.(css|woff2?|jpg|png|webp)$/.test(requestUrl.pathname);
          return local || asset ? route.continue() : route.abort("blockedbyclient");
        });
        const preview = await context.newPage();
        const pageErrors = [];
        preview.on("pageerror", (error) => pageErrors.push(error.message));
        await preview.goto(output.href, { waitUntil: "load" });
        await preview.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
        const geometry = await preview.evaluate(async () => {
          await document.fonts.ready;
          const images = [...document.querySelectorAll("img")];
          await Promise.all(images.map((image) => image.decode()));
          const bounds = ["main", "article", "h1", ".blog-content"].map((selector) => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return { selector, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          });
          const scrollers = [...document.querySelectorAll("table")].map((table) => {
            const parent = table.parentElement;
            parent.scrollLeft = parent.scrollWidth;
            const result = { width: parent.clientWidth, content: parent.scrollWidth, scroll: parent.scrollLeft };
            parent.scrollLeft = 0;
            return result;
          });
          return { overflow: document.documentElement.scrollWidth - innerWidth, bounds, images: images.length, scrollers };
        });
        assert(geometry.overflow <= 1, `${width}: horizontal page overflow`);
        assert.equal(geometry.images, 2);
        for (const bound of geometry.bounds) assert(bound.width > 0 && bound.height > 0 && bound.left >= -1 && bound.right <= width + 1, `${width}: ${bound.selector} is hidden or overflows`);
        assert.equal(geometry.scrollers.length, metrics.tables);
        for (const scroll of geometry.scrollers) if (scroll.content > scroll.width + 1) assert(scroll.scroll > 0, "An overflowing table must scroll");
        assert.equal(await preview.locator("pre").count(), metrics.codeBlocks);
        const question = preview.locator("details").first().locator("summary");
        await question.focus();
        await preview.keyboard.press("Enter");
        assert.equal(await preview.locator("details").first().evaluate((node) => node.open), true);
        await preview.evaluate(() => window.scrollTo(0, 0));
        await preview.screenshot({ path: fileURLToPath(new URL(`preview-${width}-${theme}.png`, directory)) });
        assert.deepEqual(pageErrors, []);
        results.push({ width, theme, overflow: geometry.overflow, images: geometry.images, tables: geometry.scrollers.length, faqKeyboard: "pass" });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ preview: output.href, results, scope: "Static noindex article preview using existing renderer and public CSS. No production scripts or database writes; copy buttons are inert here." }));
}

if (mode === "--live") {
  assert(ledger.publication.publishedAt, "Record an approved publication before live verification");
  const articleUrl = `${ledger.website}/blog/${ledger.slug}`;
  test("live article metadata, schema and body match the approved draft", async () => {
    const response = await fetch(articleUrl, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    const live = parseDocument(await response.text());
    const meta = (attribute, value) => all(live, (node) => node.name === "meta" && node.attribs[attribute] === value)[0]?.attribs.content;
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "h1")), ledger.targeting.title);
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "title")), `${ledger.targeting.metaTitle} | ByteVerse`);
    assert.equal(meta("name", "description"), ledger.targeting.metaDescription);
    assert.equal(all(live, (node) => node.name === "link" && node.attribs.rel === "canonical")[0]?.attribs.href, articleUrl);
    assert.equal(meta("property", "article:published_time"), ledger.publication.publishedAt);
    assert.equal(meta("name", "robots")?.includes("noindex") ?? false, false);
    const schemas = all(live, (node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => {
      const schema = JSON.parse(DomUtils.textContent(node));
      return schema["@graph"] ?? [schema];
    });
    assert.deepEqual(schemas.find((schema) => schema["@type"] === "FAQPage")?.mainEntity.map((entity) => entity.name), ledger.faq.slice(0, faqSchemaLimit));
    const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
    assert.equal(article?.author?.name, ledger.targeting.author);
    assert.equal(article?.datePublished, ledger.publication.publishedAt);
    const actualCode = all(live, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
    assert.deepEqual(actualCode, blocks.map((block) => block.code.trim()));
    assert.equal(all(live, (node) => node.name === "table").length, metrics.tables);
    assert.equal(all(live, (node) => node.name === "details").length, ledger.faq.length);
    for (const href of ledger.internalLinks) assert(all(live, (node) => node.name === "a" && node.attribs.href === href).length > 0);
  });
}
