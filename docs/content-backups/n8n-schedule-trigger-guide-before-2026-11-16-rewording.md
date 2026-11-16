**An n8n Schedule Trigger only runs by itself after you publish the workflow, and it reads every time you set in the workflow's timezone. If the workflow has no timezone of its own, n8n uses the instance timezone, which is America/New_York on a self-hosted install until you set `GENERIC_TIMEZONE`.**

Those two facts explain most reports of a schedule that is "not working". The rest usually come from a rule that means something different from what it looks like, or from an instance that was offline when the run was due.

This guide goes through all four causes. It also covers a change that older tutorials miss: from n8n 2.45.0, schedules run on a database-backed scheduler by default, and that changed how "every N minutes" is timed.

I checked each claim on 16 November 2026 against n8n 2.47.7, the newest version on npm that day, and against the official [Schedule Trigger documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger). The timing examples come from running n8n's own scheduling code with its date libraries. If triggers and the canvas are new to you, the [n8n beginner guide](/blog/how-to-use-n8n-2026-complete-guide) covers them first.

## Five checks before you change anything

1. **Is the workflow published?** A schedule never fires from a draft. If the Publish button at the top of the canvas is clickable, some changes are not live yet.
2. **Does the Executions tab show runs?** If runs exist but at the wrong hour, the trigger works and the timezone is the problem.
3. **Which timezone did n8n use?** Run the trigger once and read the `Timezone` field in its output.
4. **Did you edit the rule after publishing?** Edits stay in draft until you publish again.
5. **Was the instance running at that time?** A stopped container or a sleeping laptop cannot start a run.

The rest of this guide explains each one.

## Publish the workflow: a test run proves nothing about the schedule

Clicking **Execute workflow** on the canvas starts a manual run straight away. It does not wait for the time in your rule. The notice at the top of the node says the same thing: the workflow runs on the schedule "once you publish it".

According to the [node source](https://github.com/n8n-io/n8n/blob/n8n%402.47.7/packages/nodes-base/nodes/Schedule/ScheduleTrigger.node.ts), a manual run also uses only the first Trigger Rule and stamps the item with the current time. A green test run shows that the nodes after the trigger work. It says nothing about when the schedule will fire.

Publishing is what registers the schedule. The [save and publish documentation](https://docs.n8n.io/build/understand-workflows/save-and-publish-workflows) explains the model: changes save automatically as a draft, and production runs always use the published version. If you change the interval and close the tab, the old schedule keeps running until you publish the new version.

Keep an eye on the Publish button afterwards. It reads Publishing while n8n registers the triggers in the background. If it ends in a partial or failed state, at least one trigger was not activated. The tooltip on the button names it, and publishing again retries it.

Variables are a related trap. You can use them in the trigger, but the documentation states that their values are read only when the workflow is published. Changing a variable later does not move the schedule. Unpublish the workflow and publish it again to pick up the new value.

Scheduled runs do not light up the canvas. Look for them in the workflow's **Executions** tab. If saving successful production executions is turned off in the workflow settings, successful runs will not be listed there, so check that setting before you decide nothing ran.

## Timezone: which clock the trigger reads

n8n picks the timezone in this order:

1. The workflow's own Timezone setting, if one is chosen.
2. The instance timezone.

For a self-hosted instance the [timezone documentation](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/timezone-and-localization) gives the default as `America/New_York`. n8n Cloud tries to detect the owner's timezone at sign-up and falls back to GMT.

So a self-hosted workflow set to 9am by someone in Karachi runs at 9am New York time. In winter that is 7pm in Karachi.

The table shows the same cron rule, `0 9 * * *`, on 16 November 2026 under five timezone settings. Each row was computed with the library n8n uses.

| Timezone setting | Run time in UTC | Local time of the run |
|---|---|---|
| America/New_York | 14:00 | 09:00 |
| UTC | 09:00 | 09:00 |
| Europe/Berlin | 08:00 | 09:00 |
| Asia/Karachi | 04:00 | 09:00 |
| Asia/Kolkata | 03:30 | 09:00 |

### Change the timezone for one workflow

1. With the workflow open, click the three-dot menu at the top right of the canvas.
2. Choose **Settings**.
3. Pick a zone under **Timezone**. The first entry in the list is Default followed by the instance timezone.
4. Click **Save**.

The [workflow settings documentation](https://docs.n8n.io/build/manage-workflows/configure-workflow-settings) describes this screen. If you only change workflow settings, n8n republishes the current version for you.

### Change the timezone for the whole instance

On n8n Cloud, open the Cloud console and select Instance settings. In the Runtime section pick a value in the Time zone list, then select Save and restart. The [Cloud timezone page](https://docs.n8n.io/deploy/use-n8n-cloud/configure-cloud/set-your-timezone) warns that the instance is offline until the restart completes.

On a self-hosted instance, set `GENERIC_TIMEZONE` and restart n8n. The Docker commands in the [n8n install guide](https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker) set two timezone variables. Here they are with Karachi filled in:

```bash
docker volume create n8n_data

docker run -it --rm \
 --name n8n \
 -p 5678:5678 \
 -e GENERIC_TIMEZONE="Asia/Karachi" \
 -e TZ="Asia/Karachi" \
 -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
 -v n8n_data:/home/node/.n8n \
 n8nio/n8n
```

`GENERIC_TIMEZONE` is the one schedule nodes read. `TZ` sets the system clock of the container, which controls what commands such as `date` return. In a Compose file the same two lines go under the service:

```yaml
services:
  n8n:
    environment:
      - GENERIC_TIMEZONE=Asia/Karachi
      - TZ=Asia/Karachi
```

### Use a real IANA timezone name

The value must be an IANA name such as `Asia/Karachi` or `Europe/Berlin`. In my checks, the abbreviation `PKT` and an invented name like `Pakistan/Lahore` were both rejected as unknown timezones.

`EST` is a special case. It was accepted, but it is a fixed zone at UTC-5 all year. It never moves to daylight time, so in July it is an hour behind New York. Use `America/New_York` if you want New York time.

One detail in the node source explains a confusing error. For a Custom (Cron) rule, the node reports any failure to register the schedule as "Invalid cron expression". A bad timezone value can therefore produce that message even when the expression itself is fine.

### Confirm the timezone n8n actually used

Every run of the trigger outputs one item. This is the item for a 9:00 run in New York, produced by n8n's own [item builder](https://github.com/n8n-io/n8n/blob/n8n%402.47.7/packages/cli/src/scheduling/schedule-trigger-node/schedule-trigger-task.ts):

```json
{
  "timestamp": "2026-11-16T09:00:00.000-05:00",
  "Readable date": "November 16th 2026, 9:00:00 am",
  "Readable time": "9:00:00 am",
  "Day of week": "Monday",
  "Year": "2026",
  "Month": "November",
  "Day of month": "16",
  "Hour": "09",
  "Minute": "00",
  "Second": "00",
  "Timezone": "America/New_York (UTC-05:00)"
}
```

If the `Timezone` line does not show the zone you expect, fix the setting, not the rule. To reformat these values for a message or a file name, see the [n8n date format guide](/blog/n8n-date-format-guide).

![Hands typing on a laptop in a dark room](https://www.byteverse.fyi/blog/claude-code-windows/photo-inline.jpg "Illustrative photograph of a person typing on a laptop, not a screenshot of n8n. Photo: cottonbro studio / Pexels.")

## What each Trigger Interval really does

The node offers seven choices under Trigger Interval. They do not all keep time the same way.

| Trigger Interval | Allowed value | Timed from | First run after publishing |
|---|---|---|---|
| Seconds | 1 to 59 | The moment you publish | One interval later |
| Minutes | 1 to 59 | The moment you publish | One interval later |
| Hours | 1 to 23 | The clock, at Trigger at Minute | Next matching time |
| Days | 1 to 31 | The clock, at the hour and minute you set | Next matching time |
| Weeks | 1 or more | The clock, on the weekdays you tick | Next ticked weekday |
| Months | 1 or more | The clock, on the day of month you set | Next time that day occurs |
| Custom (Cron) | 5 or 6 fields | The clock | Next match of the expression |

On current versions of the node, a value outside the allowed range is rejected with "Invalid interval" and a description such as "Minutes must be in range 1-59". For a gap like 90 minutes, see the recipes further down.

### Seconds and minutes now count from publication

The [durable scheduler documentation](https://docs.n8n.io/deploy/host-n8n/configure-n8n/durable-scheduler) describes the change. Since n8n 2.45.0, a seconds or minutes rule keeps a fixed gap that starts when the workflow is published. It is no longer tied to round clock times.

I ran the scheduler's own code to see it. "Every 30 seconds", published at 09:00:07, fires at 09:00:37, 09:01:07 and 09:01:37. "Every 15 minutes", published at 09:07:42, fires at 09:22:42, 09:37:42 and 09:52:42. Neither lands on :00 or :15.

The benefit is an exact gap. "Every 7 minutes" really is seven minutes every time, which cron cannot do.

If you need runs on the quarter hour, use Custom (Cron) with `*/15 * * * *` instead. Self-hosted instances can also set `N8N_SCHEDULER_TRIGGER_NODE_MODE=legacy` to get clock-aligned timing back, but the documentation marks that mode as deprecated.

Republishing for an unrelated edit does not disturb this. Publishing applies only the triggers that changed, and the documentation says the others keep running without interruption.

### Hours, days, weeks and months follow the clock

These four are read in the timezone from the previous section. The first run is the next time the rule matches, and "every N" is counted from that first run.

Two examples from the scheduler code, both in New York time:

- "Every 2 hours" at minute 0, published at 11:30, runs at 12:00, 14:00 and 16:00.
- "Every 2 days" at 9:15, published early on Monday 16 November, runs on Monday 16, Wednesday 18 and Friday 20.

Weeks need a little care. The default weekday is Sunday, so tick the days you want. "Every 2 weeks" on Monday and Wednesday keeps both days of each chosen week, and the [recurrence code](https://github.com/n8n-io/n8n/blob/n8n%402.47.7/packages/%40n8n/scheduler/src/core/recurrence/kinds/recurring-cron.ts) counts weeks from Sunday.

Months have one rule to remember. If you pick a day that a month does not have, the node skips that month. Day 31 ran on 31 December, 31 January, 31 March and 31 May in my test. February and April were skipped.

### Why runs start at an odd second

A daily 9:00 rule often starts at something like 09:00:15. That is not lateness.

The node turns each rule into a cron expression, and the [code that builds it](https://github.com/n8n-io/n8n/blob/n8n%402.47.7/packages/nodes-base/nodes/Schedule/GenericFunctions.ts) fills in the seconds with a number derived from the workflow ID and the node ID. My sample node got 15, so "every day at 9:00" became `15 0 9 * * *`. Across 200 made-up node IDs I counted 54 different seconds.

The same node always gets the same second. The point is to stop every workflow on an instance from starting in the same instant.

The same code also fills in Trigger at Minute and Trigger at Hour when those values are missing from the node's saved parameters. Set both explicitly so the time is the one you chose.

A Custom (Cron) expression is used exactly as written. With five fields, the run starts at second 0.

## Custom (Cron): the syntax n8n accepts

The hint under the Expression field gives the format: `([Second]) [Minute] [Hour] [Day of Month] [Month] [Day of Week]`. An expression has five fields, or six when it starts with seconds.

| Field | Values |
|---|---|
| Second (optional) | 0 to 59 |
| Minute | 0 to 59 |
| Hour | 0 to 23 |
| Day of month | 1 to 31 |
| Month | 1 to 12, or JAN to DEC |
| Day of week | 0 to 7, or SUN to SAT. Both 0 and 7 mean Sunday |

These expressions were all executed in the America/New_York timezone, starting from Monday 16 November 2026 at 12:00.

| Expression | Meaning | Next runs |
|---|---|---|
| `*/5 * * * *` | Every 5 minutes on the clock | 12:05, 12:10, 12:15 |
| `0 * * * *` | Top of every hour | 13:00, 14:00, 15:00 |
| `0 6 * * *` | 6:00 every day | Tuesday 06:00, Wednesday 06:00 |
| `0 9 * * 1-5` | 9:00, Monday to Friday | Tuesday, Wednesday, Thursday at 09:00 |
| `0 9,13,17 * * 1-5` | Three times each weekday | Monday 13:00, Monday 17:00, Tuesday 09:00 |
| `0 12 * * 1` | Noon every Monday | 23 November, 30 November |
| `0 0 1 * *` | Midnight on the 1st | 1 December, 1 January |
| `0 0 1 1,4,7,10 *` | Start of each quarter | 1 January, 1 April |
| `*/10 * * * * *` | Every 10 seconds, six fields | 12:00:10, 12:00:20, 12:00:30 |

To build other expressions, the documentation points to [crontab guru](https://crontab.guru). Remove the seconds field before you paste a six-field expression there.

### Four cron rules that surprise people

**Steps restart instead of counting on.** `*/7 * * * *` ran at :42, :49 and :56, then at :00, a gap of four minutes. `0 */5 * * *` ran at 15:00 and 20:00, then at midnight. `0 0 */3 * *` ran on 25, 28 and 31 December, then on 1 January.

The Minutes and Hours intervals do not have this problem. "Every 7 minutes" kept a seven-minute gap across the hour, and "every 5 hours" ran at 10:00, 15:00, 20:00, 01:00 and 06:00.

**Day of month and day of week combine as OR.** `0 9 13 * 5` does not mean Friday the 13th. It ran every Friday, and also on Sunday 13 December. When both fields are set, a match on either one starts a run.

**Six fields means seconds.** `* * * * * *` is every second, which gave 60 runs in one minute. Count the fields before you publish.

**Daylight saving shifts some runs.** In New York, `30 2 * * *` ran at 03:30 on 8 March 2026, because 02:30 did not exist that night. `30 1 * * *` ran once on 1 November 2026, although 01:30 happened twice. A daily 9:00 rule stayed at 9:00 local time while its UTC time moved from 14:00 to 13:00.

### Syntax that passes one check and fails the other

The source uses two different libraries to check a cron expression. A manual test run on the canvas validates it with the `cron` package. Publishing on the durable scheduler validates it with `cron-parser`. I ran both, at the versions n8n 2.47.7 pins.

| Expression | Manual test check | Publish check |
|---|---|---|
| `0 9 * * 1-5` | Accepted | Accepted |
| `0 9 * * MON-FRI` | Accepted | Accepted |
| `0 0 L * *` (last day of month) | Rejected | Accepted |
| `0 9 ? * 1` | Rejected | Accepted |
| `0 9 * * 1#2` (second Monday) | Rejected | Accepted |
| `@daily` | Accepted | Rejected, needs 5 or 6 fields |
| `0 9 31 2 *` (31 February) | Rejected | Rejected |
| `0 24 * * *` | Rejected | Rejected |

The safe choice is plain syntax: numbers, ranges, lists, steps and the month or weekday names. Those pass both checks. Instances that still use the in-memory scheduler rely on the `cron` package throughout, so `L`, `?` and `#` fail there.

When the node says "Invalid cron expression", count the fields first. Four or seven fields is the most common mistake. Then look for a value out of range, a date that cannot exist, a shortcut such as `@daily`, or a bad timezone.

## Missed runs, restarts and duplicates

Before n8n 2.45.0, timers lived in the memory of the running process. A restart dropped them, and a run that was due during the downtime was skipped.

The durable scheduler records upcoming runs in the database first. A run whose time passed while the instance was down still fires late, as long as it is inside the grace period. That is 60 seconds by default. After the grace period, the node's setting decides.

You find that setting on the node's **Settings** tab, under **If Execution Is Missed**:

- **Don't Run Missed Executions** is the default. The missed runs are dropped and the schedule resumes.
- **Run the Most Recent Missed Execution** starts one catch-up run for the node.
- **Run the Most Recent Missed Execution Per Rule** starts one catch-up run for each Trigger Rule.

**Missed Execution Grace Period (Seconds)** sits next to it. A value of 0 uses the instance setting.

No option replays a backlog run by run. If an hourly workflow was down for six hours, you get one catch-up run at most, not six.

Two conditions apply. The documentation says these options exist from n8n 2.36, on Schedule Trigger nodes added from that version on. They only take effect on the durable scheduler. With `N8N_SCHEDULER_ENABLED=false` the instance uses the in-memory scheduler, which never runs a missed execution.

A catch-up run carries the time it was scheduled for. On the durable scheduler, the item's `timestamp` is built from the scheduled time, not from the moment the run finally started. Use `{{ $json.timestamp }}` to know which slot a run belongs to, and `$now` for the actual time.

### When a schedule runs twice

Each Trigger Rule becomes its own schedule, so two rules that match the same minute can start two executions. A daily 9:00 rule plus a cron rule of `0 9 * * 1` runs twice every Monday.

The other common cause is a duplicated workflow. If you copied a workflow to experiment and published the copy, both now run on the same schedule.

A scheduled run also has nobody watching it. If it fails at 3am, you will not see a red node on the canvas. Give the workflow an error workflow so a failure reaches you; the [sub-workflow guide](/blog/n8n-sub-workflow-guide) covers how that is set up.

The Schedule Trigger starts workflows. It does not pause one that is already running. For a delay in the middle of a workflow, use the [Wait node](/blog/n8n-wait-node-guide). If your workflow is started by an outside service instead of the clock, the [webhook troubleshooting guide](/blog/n8n-webhook-not-working-2026) is the one you need.

## Recipes for common schedules

| Goal | Setting |
|---|---|
| Weekdays at 9:00 | Weeks interval with Monday to Friday ticked and 9am, or cron `0 9 * * 1-5` |
| Several times a day | One cron rule such as `0 9,13,17 * * *`, or one Trigger Rule per time |
| Every 15 minutes on the clock | Cron `*/15 * * * *` |
| Every 15 minutes, exact gap | Minutes interval set to 15 |
| Every 90 minutes | Two cron rules, shown below |
| First day of the month | Months interval with day 1, or cron `0 9 1 * *` |
| Last day of the month | A daily rule followed by an If node, shown below |
| A random start time | A Wait node after the trigger with a random amount |

**Every 90 minutes.** The Minutes field stops at 59 and a single cron expression cannot space runs 90 minutes apart. Two Trigger Rules can:

```txt
0 0,3,6,9,12,15,18,21 * * *
30 1,4,7,10,13,16,19,22 * * *
```

Together they ran at 00:00, 01:30, 03:00, 04:30 and so on through the day.

**Last day of the month.** `L` is not safe in both checks, so run the workflow every day and let an If node pass only the last day:

```txt
{{ $now.plus({ days: 1 }).day === 1 }}
```

The condition is true when tomorrow is the 1st. I checked it for 30 November, 28 February 2026 and 29 February 2028, and it was false on 28 February 2028.

**A random start time.** The trigger itself has no random option. Add a Wait node as the first step and give its Wait Amount an expression. The Wait node guide linked above has the expression and the limits.

## Fix common Schedule Trigger problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Test run works, schedule never fires | Workflow is not published | Select Publish and confirm the button leaves the Publishing state |
| Runs happen at the wrong hour | Timezone is the instance default, often America/New_York | Set the workflow Timezone, or `GENERIC_TIMEZONE` for the instance |
| Runs are one hour off in summer only | A fixed zone such as `EST` is set | Use a regional name such as `America/New_York` |
| New interval has no effect | The edit is still a draft | Publish the new version |
| A changed variable did not move the schedule | Variables are read when the workflow is published | Unpublish, then publish again |
| "Every 15 minutes" does not run at :00 and :15 | Minutes intervals count from publication since n8n 2.45.0 | Use cron `*/15 * * * *` |
| Run starts at an odd second | The node adds a stable seconds offset per node | Nothing to fix; use a six-field cron if the exact second matters |
| "Invalid cron expression" | Wrong field count, bad value, shortcut syntax or bad timezone | Count the fields, then use plain five-field syntax |
| "Invalid interval" | Value outside the allowed range | Stay inside the range, or switch to Custom (Cron) |
| Monthly run skips some months | The chosen day does not exist in those months | Use day 28 or lower, or the last-day recipe |
| Friday the 13th rule runs every Friday | Day of month and day of week combine as OR | Keep one of the two fields as `*` and filter with an If node |
| Runs were lost during a restart | Missed runs are dropped by default | Choose a catch-up option under If Execution Is Missed |
| Two executions at the same time | Two Trigger Rules overlap, or a copied workflow is published | Remove the overlap or unpublish the copy |

Trigger nodes that poll, such as Google Sheets Trigger, are scheduled differently. The durable scheduler documentation says they stay on the in-memory scheduler by default and always skip missed runs.

## Frequently Asked Questions

### Why is my n8n Schedule Trigger not running?

The most common reason is that the workflow is not published. A test run from the canvas starts at once and ignores the schedule, so it can pass while nothing is scheduled. Publish the workflow, then check the Executions tab. If runs appear at the wrong hour, the trigger is working and the timezone setting is what needs fixing.

### How do I change the timezone of an n8n Schedule Trigger?

Open the workflow menu, select Settings, pick a value under Timezone and save. That setting wins over the instance timezone. To change the default for every workflow, n8n Cloud has a Time zone list under Instance settings in the Cloud console. On a self hosted instance, set the GENERIC TIMEZONE environment variable, written with an underscore between the two words, and restart n8n.

### How do I write a cron expression in n8n?

Choose Custom (Cron) as the Trigger Interval and enter five fields separated by spaces: minute, hour, day of month, month and day of week. A sixth field at the start is optional and sets seconds. Keep to numbers, ranges, lists and steps, because shortcuts and special characters are not accepted everywhere. The cron table in this guide lists tested examples.

### How do I run an n8n workflow only on weekdays?

Set the Trigger Interval to Weeks, tick Monday to Friday under Trigger on Weekdays, and choose the hour and minute. The default weekday is Sunday, so untick it if you do not want weekend runs. A Custom (Cron) rule does the same job when its last field covers days one to five. Both versions follow the workflow timezone.

### Why does my n8n schedule start a few seconds late?

It is by design. For rules built from the dropdowns, n8n fills in the seconds with a number derived from the workflow and node IDs, so a 9:00 rule may start at 9:00 and 15 seconds. The offset is the same for that node every time and spreads the load across workflows. A Custom (Cron) expression with five fields starts at second zero.

### Does n8n run missed schedules after a restart?

By default it does not. On the durable scheduler, which is the default from n8n 2.45.0, a run that is less than 60 seconds late still fires. Older missed runs are dropped unless you change If Execution Is Missed on the Settings tab of the node. The catch up options start one run for the most recent missed time, not one run for every slot that was missed.

### Can I use variables in the n8n Schedule Trigger?

Yes, but their values are read only when the workflow is published. If you change a variable afterwards, the schedule keeps its old timing. Unpublish the workflow and publish it again so n8n reads the new value. The same applies to any edit of the trigger: it stays a draft until you publish the new version.

## Verification Notes

This guide was researched on 16 November 2026 using the n8n 2.47.7 release tag, which matched the version on npm that day. I read the Schedule Trigger node, the code that turns its rules into cron expressions, the durable scheduler's registration and recurrence code, and the configuration defaults.

The timing examples are not estimates. They come from running n8n's own TypeScript functions for building cron expressions, counting "every N" periods and building the trigger item, loaded unchanged from that tag. Cron results were computed with cron-parser 5.6.1 and cron 4.4.0, the versions n8n 2.47.7 pins, together with Luxon 3.7.2 and moment-timezone 0.5.48.

Settings names, menu paths and version thresholds were taken from the official documentation and the interface text in the same release.

I did not start an n8n server for this guide. That means no screenshots, and nothing was published or scheduled on a live system. The difference between the manual check and the publish check for cron syntax is based on the two libraries the source calls, not on error messages seen in the editor.

These checks are not a substitute for running the workflow in your own instance, particularly on versions older than 2.45.0 or when the in-memory scheduler is switched on.

## Sources and Further Reading

- n8n Docs: [Schedule Trigger node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger).
- n8n Docs: [Schedule Trigger common issues](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/common-issues).
- n8n Docs: [Durable scheduler, timing modes and misfire policy](https://docs.n8n.io/deploy/host-n8n/configure-n8n/durable-scheduler).
- n8n Docs: [Timezone and localization environment variables](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/timezone-and-localization).
- n8n Docs: [Set your timezone on n8n Cloud](https://docs.n8n.io/deploy/use-n8n-cloud/configure-cloud/set-your-timezone).
- n8n Docs: [Configure workflow settings](https://docs.n8n.io/build/manage-workflows/configure-workflow-settings).
- n8n Docs: [Save and publish workflows](https://docs.n8n.io/build/understand-workflows/save-and-publish-workflows).
- n8n Docs: [Install with Docker](https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker).
- n8n 2.47.7 source: [Schedule Trigger node](https://github.com/n8n-io/n8n/blob/n8n%402.47.7/packages/nodes-base/nodes/Schedule/ScheduleTrigger.node.ts).
- n8n 2.47.7 source: [Rule to cron conversion and the seconds offset](https://github.com/n8n-io/n8n/blob/n8n%402.47.7/packages/nodes-base/nodes/Schedule/GenericFunctions.ts).
- n8n 2.47.7 source: [Durable registration of Schedule Trigger rules](https://github.com/n8n-io/n8n/blob/n8n%402.47.7/packages/cli/src/scheduling/schedule-trigger-node/schedule-trigger-job-registrar.ts).
- n8n 2.47.7 source: [Every N periods recurrence](https://github.com/n8n-io/n8n/blob/n8n%402.47.7/packages/%40n8n/scheduler/src/core/recurrence/kinds/recurring-cron.ts).
- n8n 2.47.7 source: [Schedule Trigger output item](https://github.com/n8n-io/n8n/blob/n8n%402.47.7/packages/cli/src/scheduling/schedule-trigger-node/schedule-trigger-task.ts).
- Tool: [crontab guru](https://crontab.guru), for checking five-field expressions.
- Cover photograph: [cottonbro studio on Pexels](https://www.pexels.com/photo/person-using-a-laptop-on-a-table-7439136/). Inline photograph: [cottonbro studio on Pexels](https://www.pexels.com/photo/person-typing-on-laptop-5473892/). Both are illustrative photographs under the Pexels licence, not n8n screenshots.