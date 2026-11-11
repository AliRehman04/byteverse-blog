**The n8n Wait node pauses an execution and brings it back later: after a time interval, at a set date, when a webhook is called, or when a form is submitted.** It looks like the simplest node in the editor, yet it is behind some of the most confusing symptoms in n8n: executions that sit in **Waiting** for days, a resume link that answers 401, 404 or 409, a callback that arrives "too early", a delay that only applies once for fifty items, or a run that is cancelled the moment it wakes up.

This guide explains how the Wait node behaves in n8n 2.47.4, the current release on 11 November 2026, using the node's own source code and the waiting services in the n8n server rather than guesswork: what "waiting" means inside n8n, the 65 second rule, how `$execution.resumeUrl` is built and validated, what the node outputs after each kind of resume, every answer the resume endpoint can give, and a cause by cause list for stuck executions. If you are new to n8n, start with the [beginner guide to n8n](/blog/how-to-use-n8n-2026-complete-guide) first.

## The four ways a Wait node resumes

The **Resume** parameter decides what ends the pause. Everything else in the node depends on it.

| Resume option | What ends the wait | Accepts a request on the resume URL | What the node outputs afterwards |
|---|---|---|---|
| After Time Interval | The amount of seconds, minutes, hours or days has passed | No | The same items it received |
| At Specified Time | The date and time is reached | No | The same items it received |
| On Webhook Call | An HTTP request to `$execution.resumeUrl`, or the optional time limit | Yes | The request (headers, params, query, body), or the original items if the limit ended the wait |
| On Form Submitted | A form submission on `$execution.resumeFormUrl`, or the optional time limit | Yes | The submitted form fields, or the original items if the limit ended the wait |

Two details in that table cause most surprises. First, the two time based options never listen for a request: the source passes an explicit "does not accept a resume request" flag for them, so calling the resume URL of an execution that is sleeping on a timer does not wake it. Second, a webhook resume **replaces** the items. The node stops being a pass through and behaves like a Webhook node, so the data you had before the wait is no longer in `$json`.

The node has two versions. Version 1 defaulted to 1 hour; version 1.1, which is what you get when you add the node today, defaults to 5 seconds. Imported templates may still carry the older default.

## What waiting means inside n8n

n8n has two completely different ways to wait, and the status you see in the executions list tells you which one is in use.

**Suspended waits.** For long timers and for every webhook or form wait, the node sets a wake up time on the execution and marks its status as waiting. The engine stops after the Wait node, writes the execution with all of its data to the database and releases the process. The documentation describes it the same way: the workflow offloads the execution data to the database, and when the resume condition is met it reloads the data and continues. While suspended, the execution uses no memory and no CPU; it is a row in a table.

**In process waits.** A timed wait shorter than 65 seconds is not suspended at all. The execution simply sleeps inside the running process, keeps the status Running, and continues when the sleep ends. The reason is written in the source next to the constant: suspending costs a database write and a reload, and the service that resumes executions polls too slowly to promise an on time resume for such short waits.

| Wait | What n8n does | Status while waiting | Survives a restart |
|---|---|---|---|
| Timer shorter than 65 seconds | Sleeps in the process | Running | No, the pause exists only in memory |
| Timer of 65 seconds or longer | Suspends, stores the wake up time | Waiting | Yes |
| Webhook or form, no limit | Suspends, stores the year 3000 as wake up time | Waiting | Yes |
| Webhook or form with Limit Wait Time | Suspends, stores the limit as wake up time | Waiting | Yes |

The 65 second boundary only applies to the timer modes. A webhook wait with a 10 second limit is still suspended, because a request must be able to find it.

### How suspended executions come back

A service in the main n8n process, the wait tracker, is responsible for timers. Reading its source:

- It queries the database **every 60 seconds** for executions whose status is waiting and whose wake up time falls within the **next 70 seconds**.
- For each one it sets an in memory timer for the exact moment and resumes the execution when the timer fires.
- It runs the first query immediately at startup, so waits that became due while n8n was down are picked up as soon as the main process is back. They resume late, not never.
- It only tracks on the **leader** main process. In queue mode, workers execute the resumed run, but they do not wake anything up; in a multi main setup a follower takes over tracking when it becomes leader.

If you run n8n with debug logging, the line "Querying database for waiting executions" once a minute is this poll. It is normal and not a sign that something is stuck.

A wait with no limit stores 1 January 3000 as its wake up time. The poll never selects it, which is exactly the point: only a request ends it.

Three more facts from the same code are worth knowing before you rely on long waits:

- **The workflow must be saved.** An execution of an unsaved workflow cannot be resumed; the tracker refuses with "Only saved workflows can be resumed."
- **A resumed run uses the workflow as it was.** The workflow definition is stored with the execution and the resume loads that copy, so editing nodes after an execution went to sleep does not change what that execution does when it wakes.
- **Resume attempts are limited.** Each attempt to load a waiting execution is counted before it starts, and once the count reaches the limit (2 by default, `N8N_EXECUTIONS_MAX_RESUME_ATTEMPTS`) the execution is marked as crashed instead of being tried again. The count resets once the execution actually runs. The setting exists so that an execution whose stored data does not fit in memory cannot restart n8n in a loop.

![A developer working at a laptop with a cup of coffee](https://www.byteverse.fyi/blog/claude-code-windows/photo-cover.jpg "Illustrative photograph of a developer at a laptop, not a screenshot of n8n. Photo: Daniil Komov / Pexels.")

## Timed waits: After Time Interval and At Specified Time

**After Time Interval** takes a Wait Amount and a Wait Unit. The amount may be a decimal, so 0.5 minutes is valid, and 0 is allowed. The node converts the value to milliseconds and adds it to the current time. Two messages come straight from its validation:

- "Invalid wait amount. Please enter a number that is 0 or greater." appears when the amount is negative or is not a number, which usually means an expression returned text such as "5" or an empty value. Wrap the expression in `Number()` or fix the field it reads.
- "Invalid wait unit. Valid units are 'seconds', 'minutes', 'hours', or 'days'." appears when the unit comes from an expression that produced anything else, for example "Minutes" with a capital letter or "ms".

**At Specified Time** takes a date and time. A date in the past is not an error: the remaining time is clamped to zero and the execution continues at once. An empty or unreadable value fails with "Cannot put execution to wait because `dateTime` parameter is not a valid date. Please pick a specific date and time to wait until."

### Time zones

For intervals the time zone is irrelevant; the source notes that a relative wait is just a number of seconds added to the current timestamp. For a specific time it matters, and here the documentation and the code do not say quite the same thing. The documentation states that the n8n server time is always used regardless of the workflow's timezone setting. The 2.47.4 source parses the value together with the workflow's timezone. The way to stay out of that question is to give the node a value that carries its own offset. An expression built on `$now` does:

```txt
{{ $now.plus({ days: 3 }).set({ hour: 9, minute: 0, second: 0 }).toISO() }}
```

The result looks like `2026-11-14T09:00:00.000+05:00`, which means the same instant everywhere.

### One wait for all items

A timed Wait node does not delay each item. It reads its parameters once, for the first item, waits once, and then passes **all** input items through together and unchanged. Fifty items entering a Wait node set to 5 seconds leave it together after 5 seconds, not after 250. An expression in Wait Amount that refers to `$json` is evaluated against the first item only.

To space out work per item, the wait has to sit inside a loop:

1. Add a **Loop Over Items** node with Batch Size 1 (or the number of requests you may send at once).
2. On the loop branch, do the work, then add the Wait node, then connect it back to the loop.
3. Continue the workflow from the done branch.

The [Loop Over Items guide](/blog/n8n-loop-over-items-guide) covers the done branch and the batch arithmetic. Keep each wait inside the loop short when you can: under 65 seconds the pause stays in the process, while a longer one writes and reloads the whole execution on every round.

For a random pause, which some APIs and scraping targets tolerate better than a fixed rhythm, switch Wait Amount to an expression:

```txt
{{ Math.floor(Math.random() * 20) + 5 }}
```

That waits between 5 and 24 seconds. Before reaching for a Wait node at all, check whether the node that makes the calls can throttle itself. The HTTP Request node has a Batching option with Items per Batch and Batch Interval, and every node has Retry On Fail with a wait between tries in its settings. Those cover the common "delay between requests" case without a loop.

## On Webhook Call and $execution.resumeUrl

With **On Webhook Call**, the execution sleeps until someone sends an HTTP request to a URL that exists only for this execution. The URL is available in every node of the workflow as `$execution.resumeUrl`, and in 2.47.4 it has this shape:

```txt
https://n8n.example.com/webhook-waiting/48213?signature=5f1c0b7e9a2d4c6e8f0a1b3c5d7e9f10
```

The parts, as the source builds them:

- **The base** is the same public address your other webhooks use. If links come out as `http://localhost:5678/...` behind a reverse proxy, the instance's webhook URL is not configured; the [webhook troubleshooting guide](/blog/n8n-webhook-not-working-2026) explains `WEBHOOK_URL`.
- **`webhook-waiting`** is the endpoint for waiting webhooks. It can be renamed with `N8N_ENDPOINT_WEBHOOK_WAIT`, and a reverse proxy has to route it to n8n just like `/webhook/`.
- **The number** is the execution ID.
- **`signature`** is a random token stored with the execution. The endpoint compares it with a timing safe check and answers 401 when it is missing or wrong. The token is removed from the request before your workflow sees it, so it never shows up in the node's output.

`$execution.resumeFormUrl` is built the same way under `form-waiting` (configurable with `N8N_ENDPOINT_FORM_WAIT`). The older variable `$resumeWebhookUrl` still exists as a deprecated alias of the webhook URL.

### Send the URL before the Wait node

The resume URL has to leave n8n before the execution reaches the Wait node, because nothing after the Wait node runs until the wait is over. The typical shape is: a node that tells an external system "call this address when you are done", followed by the Wait node. For an HTTP Request node that starts a long job, the JSON body can carry the address:

```json
{
  "videoId": "{{ $json.videoId }}",
  "callbackUrl": "{{ $execution.resumeUrl }}"
}
```

When the job is finished, the external system calls the address. From a terminal the same call looks like this:

```txt
curl -X POST "https://n8n.example.com/webhook-waiting/48213?signature=5f1c0b7e9a2d4c6e8f0a1b3c5d7e9f10" -H "Content-Type: application/json" -d "{\"status\":\"done\",\"fileUrl\":\"https://files.example.com/out.mp4\"}"
```

That command only works if the Wait node's **HTTP Method** is POST. The parameter is inherited from the Webhook node and its default is **GET**. A callback that uses another method than the one selected is answered with 404, and the execution keeps waiting.

### The parameters that matter

- **Authentication**: None, Basic Auth, Header Auth or JWT Auth, on top of the signature token. Use it when the URL travels through systems you do not control.
- **Respond**: Immediately (the default, answers as soon as the request arrives), When Last Node Finishes, or Using Respond to Webhook Node. With Immediately the caller gets the Response Code, 200 unless you change it.
- **Options, Ignore Bots**: turn this on whenever the link is sent in a chat message or an email and the method is GET. Link previewers and security scanners open links on their own, and to n8n such a visit is a valid resume request.
- **Options, IP(s) Allowlist**: restricts who may call the URL at all.
- **Options, Webhook Suffix**: covered below.

### The output is the request, not your items

After a webhook resume the Wait node outputs one item that describes the request:

```json
{
  "headers": { "content-type": "application/json", "user-agent": "curl/8.9.1" },
  "params": {},
  "query": {},
  "body": { "status": "done", "fileUrl": "https://files.example.com/out.mp4" }
}
```

The items that entered the Wait node are gone from `$json`. They are still in the execution, so you reach them by node name, for example `{{ $('Create order').item.json.orderId }}` in an expression, or `$('Create order').first().json` in a Code node. If item pairing gets in the way after the wait, `.first()` and `.all()` are the dependable forms; the [Code node guide](/blog/n8n-code-node-guide) lists them.

### Test runs

The Wait node also works in manual executions from the editor: the execution goes to Waiting, the node's tooltip shows the full resume URL including the signature, and calling it continues the run. Two things differ from production. The URL changes with every execution, so a URL copied from yesterday's test is useless today. And the documentation warns that a partial execution changes the URL as well, so the node that sends the URL and the Wait node must run in the same execution; running only the Wait node with pinned data upstream will not produce a link the earlier node already sent.

## Webhook Suffix and workflows with several Wait nodes

All Wait nodes in an execution share the same resume URL. The documentation describes the consequence: as the URL is called, it resumes each Wait node in turn. That is convenient, and it is also a trap. If the external system retries its callback, or two different systems hold the same link, the second call can end the **next** Wait node, the one that was meant for something else.

The **Webhook Suffix** option gives each Wait node its own address. With the suffix `approve`, only a request to the URL with `/approve` after the execution ID resumes that node. The suffix is not added to `$execution.resumeUrl` for you; you append it. Because the URL now ends in a query string, the suffix belongs before the question mark:

```txt
{{ $execution.resumeUrl.replace('?', '/approve?') }}
```

That produces `.../webhook-waiting/48213/approve?signature=...`. The endpoint in 2.47.4 also still understands the older habit of appending the suffix at the very end, after the signature value, for backward compatibility, but the form above is the one the node's own tooltip generates. A request whose suffix does not match the waiting node gets 404 and the execution keeps waiting, which is what you want from a stray retry.

## Limit Wait Time: never wait forever

By default a webhook or form wait has no end. Turn on **Limit Wait Time** and choose either an interval or a maximum date, and the tracker will resume the execution at that moment if no request arrived first.

The important part is what the node outputs in each case. When the request arrives, the output is the request item shown above. When the limit ends the wait, the node behaves like a timer: it passes its **original input items** through. The next node therefore has to tell the two apart. The request item always has the four keys headers, params, query and body, so a small Code node can normalise both cases:

```mjs
const item = $input.first().json;
const resumedByWebhook = ["headers", "params", "query", "body"].every((key) => key in item);
const answer = resumedByWebhook ? (item.query.approved ?? item.body.approved) : undefined;

return [{
  json: {
    resumedBy: resumedByWebhook ? "webhook" : "timeout",
    approved: String(answer) === "true",
    order: $("Create order").first().json,
  },
}];
```

Follow it with an If node on `resumedBy`. On the timeout branch, send a reminder, escalate, or cancel the order; on the webhook branch, continue. Without a limit, an approval nobody answers stays in the executions list as Waiting until someone deletes it.

## On Form Submitted and send and wait

**On Form Submitted** pauses until someone fills in a form that n8n renders itself. The link is `$execution.resumeFormUrl`, not `$execution.resumeUrl`. People mix the two up so often that the endpoint handles it: a request for a form wait that lands on the webhook endpoint is redirected with a 307 to the form endpoint. Authentication for a form wait is Basic Auth or None, the form fields are defined in the node, and Limit Wait Time and Webhook Suffix work as they do for webhooks. After the submission the node outputs the submitted fields.

For approvals inside a chat or mail tool, a Wait node is often not the best choice. The hint n8n ships with the Wait node itself says that for user approval workflows you should consider nodes with a send and wait operation, such as the email and Slack nodes. Those nodes send the message, generate the approve and decline links, sign them so the answer cannot be altered, and pause the execution in one step. Reach for the Wait node when the thing you are waiting for is a system, or when you need full control over the request.

## What the resume endpoint answers

Every response the waiting webhook endpoint can give in 2.47.4, with the reason behind it:

| Response | Message | What it means |
|---|---|---|
| The code you set, 200 by default | Your response | The wait ended and the workflow continued |
| 401 | Invalid token | The `signature` value is missing or does not match the one stored with the execution |
| 404 | The execution does not exist | Wrong ID, a different n8n instance or database, or the execution was deleted |
| 404 | The workflow for the execution does not contain a waiting webhook with a matching path/method | The HTTP method or the Webhook Suffix does not match the Wait node that is waiting |
| 409 | The execution is running already | The request arrived before the execution reached the Wait node, or while the resumed part is running |
| 409 | The execution has finished already | The workflow completed; the link is used up |
| 409 | The execution has finished with error | The execution failed before or after the wait |
| 307 | Redirect to the form endpoint | A form wait was called through the webhook URL |

Executions that were created before n8n introduced the signature token have no stored token and are not checked, so old links keep working. For everything created on a current version, a URL without the query string is rejected. That matters when a tool in the middle "cleans" URLs: some chat platforms, link shorteners and no code tools drop or re encode query parameters. If the callback URL is rebuilt from the execution ID alone, it will get 401.

## Why executions stay stuck in Waiting

"Stuck" has a small number of real causes. Work through them in this order; the executions list, the Wait node's tooltip and the HTTP status the caller received are enough to identify each one.

| Symptom | Cause | Fix |
|---|---|---|
| Waiting for days, no limit set | The resume request never arrived and the wake up time is the year 3000 | Turn on Limit Wait Time and handle the timeout branch |
| Caller got 409 "is running already", execution still Waiting | The callback came before the execution reached the Wait node and the caller did not retry | Make the caller retry on 409, or do less between sending the URL and the Wait node |
| Caller got 404 with "matching path/method" | Wait node listens for GET, callback is POST (or the reverse), or the suffix is wrong | Set HTTP Method to what the caller sends; build the suffix URL as shown above |
| Caller got 401 "Invalid token" | The signature was stripped, re encoded or never included | Send the complete `$execution.resumeUrl`; do not rebuild it from the execution ID |
| Caller cannot connect, or the link points to localhost | The instance's public webhook URL is wrong, or the proxy does not route `/webhook-waiting/` and `/form-waiting/` | Set `WEBHOOK_URL`; add the two paths to the proxy rules |
| Timed wait is overdue | The main n8n process, or the leader in a multi main setup, was down or busy | Check the main process; overdue waits resume on the first poll after it starts |
| Resumes and is cancelled at once | The workflow has a timeout and the time spent waiting used it up | Remove or raise the workflow timeout for workflows with long waits |
| Status changed to Crashed after waiting | Resume attempts were exhausted while loading the execution data | Reduce the data the execution carries into the wait; see the note below |
| Parent workflow Waiting although the Wait node is in a sub-workflow | The parent is parked until the child finishes | Fix the child's wait; the parent follows |
| Short wait "lost" after a restart or update | Timers under 65 seconds live in the process only | Use 65 seconds or more when the pause must survive a restart |

A few of those deserve a longer explanation.

### The callback that arrives too early

The execution ID exists from the first node, so the resume URL is valid text long before the Wait node is reached. If the external system is fast, for example a job that fails validation and reports back within milliseconds, its request can arrive while your workflow is still running the nodes between "send URL" and "Wait". The endpoint finds an execution with status running and answers 409 with "is running already". Nothing is queued; if the caller gives up, the execution reaches the Wait node a moment later and waits for a call that already happened.

There is no setting in the Wait node for this. The fixes are on the outside and in the layout: make the caller retry a 409 a few times with a short pause, keep the path between the sending node and the Wait node as short as possible (ideally nothing in between), and always set Limit Wait Time so that a missed callback ends in a controlled timeout branch instead of a permanent wait.

### Workflow timeouts and long waits

A workflow can have an execution timeout, set under the workflow's settings or for the whole instance with `EXECUTIONS_TIMEOUT` (off by default) and capped by `EXECUTIONS_TIMEOUT_MAX`, which defaults to one hour. When the tracker resumes a waiting execution, the runner calculates the remaining time **from the moment the execution originally started**, not from the resume. An execution with a 10 minute timeout that waited for an hour has no time left: it is stopped with a timeout as soon as it wakes. If a workflow contains waits longer than its timeout, the timeout has to go, or the long wait has to move into its own workflow.

### Large executions and the crash limit

A suspended execution is stored with everything the nodes before the Wait node produced, and all of it is loaded back into memory on resume. If that data is very large, for example thousands of items with binary content, loading it can exhaust the process. Because n8n counts resume attempts and gives up after the configured number, such an execution ends as Crashed rather than taking the instance down repeatedly. The practical rule: before a long wait, keep only what the rest of the workflow needs. Store files somewhere else and carry the reference, trim fields with an Edit Fields node, and avoid entering a Wait node inside a loop with a huge accumulated result.

### Waits inside sub-workflows

When a sub-workflow reaches a Wait node that suspends, the parent execution is put to sleep as well, with its own marker date so the timer poll does not wake it by accident. When the child finishes, the parent is patched with the child's result and resumed; a sweep on the leader's 60 second tick catches parents whose child finished before they were fully parked. So a parent shown as Waiting is expected while a child waits. If you do not want the parent to block, turn off the Execute Sub-workflow node's option to wait for completion; the [sub-workflow guide](/blog/n8n-sub-workflow-guide) explains what the parent receives in that case.

## The Wait node does not wait for other branches

Many searches for "wait" in n8n are about something else: making the workflow hold until two branches, or several nodes, have finished. The Wait node cannot do that. It pauses the branch it sits on and knows nothing about the others.

- To continue only when **two or more branches** have delivered their data, connect them to a **Merge** node. A Merge node runs when its inputs are available, which is what "wait for all inputs" means in practice.
- To continue only when **another workflow** has finished, call it with the Execute Sub-workflow node and leave its wait for completion option on.
- To continue only when **an external system** is done, that is the Wait node's job, with On Webhook Call.

## Patterns that work

**Callback from a long running job.** HTTP Request (start job, pass `$execution.resumeUrl`) directly followed by Wait (On Webhook Call, method matching the caller, Limit Wait Time on), then a node that separates webhook from timeout. This replaces polling loops and costs nothing while it waits.

**Polling when no callback exists.** Loop: HTTP Request (check status), If (done), on the false branch a Wait of 30 to 60 seconds and back to the request. Keeping the pause under 65 seconds avoids a database write per round; add a counter so the loop ends after a sensible number of tries.

**Follow up days later.** After the first email, a Wait of 3 days, then a check whether the customer has replied, then the second email. The execution is a row in the database for those three days. Make sure the workflow has no timeout and that the data carried into the wait is small.

**Rate limited batch work.** Loop Over Items with a small batch size, the API call, a Wait of a second or two, back to the loop. Or skip the Wait node and use the HTTP Request node's batching option.

**Human approval with a deadline.** Prefer a send and wait operation in the messaging node you already use. With a plain Wait node: send the link with a suffix per decision or a query parameter, turn on Ignore Bots if the link is a GET, set Limit Wait Time, and branch on the result.

## A checklist before publishing a workflow with a Wait node

- The workflow is saved, and for production it is active or published, before any execution goes to sleep.
- Every webhook or form wait has Limit Wait Time on, and the node after it handles both the request and the timeout.
- The HTTP Method of the Wait node matches what the caller sends; the default is GET.
- The complete `$execution.resumeUrl`, including the signature, is what leaves n8n, and it leaves from a node placed directly before the Wait node.
- The caller retries on 409, or the workflow tolerates a missed callback through the time limit.
- Each Wait node in a workflow with several of them has its own Webhook Suffix.
- Ignore Bots is on when a GET link is sent to a person.
- The public webhook URL is correct and the proxy routes the waiting endpoints.
- The workflow has no execution timeout shorter than its longest wait.
- Data is trimmed before a long wait, and data needed afterwards is read by node name.
- Delays per item sit inside a Loop Over Items, and pauses that must survive a restart are 65 seconds or longer.

## Frequently Asked Questions

### How does the Wait node work in n8n?

It pauses the execution until a resume condition is met: a time interval, a specific date and time, a webhook call or a form submission. For timers of 65 seconds or more and for all webhook and form waits, n8n saves the execution to the database with the status Waiting and frees the process; a service in the main process checks every 60 seconds for waits that are about to end and resumes them. Timers shorter than 65 seconds simply sleep inside the running process. After a timer the node passes its input items through unchanged.

### What is $execution.resumeUrl in n8n?

It is the address that ends an On Webhook Call wait for the current execution. It contains the execution ID and a signature token, it is different for every execution, and it is available in every node, so you send it to the external system before the workflow reaches the Wait node. When that system calls the address with the HTTP method selected in the Wait node, the execution continues and the Wait node outputs the request with its headers, query and body. For form waits the matching variable is $execution.resumeFormUrl.

### Why is my n8n execution stuck in Waiting?

Most often the resume request never ended the wait. The callback may have arrived before the execution reached the Wait node and received a 409, it may have used POST while the node listens for GET and received a 404, the signature may have been stripped and it received a 401, or the link may point to an address the caller cannot reach. A wait without Limit Wait Time then lasts indefinitely. For timers, check that the main n8n process is running, because it is the one that wakes executions.

### How do I add a delay between items or requests in n8n?

A Wait node placed after a node delays all items once and then releases them together. For a pause per item, put the Wait node inside a Loop Over Items node with a batch size of 1 and connect it back to the loop. For HTTP calls you can often avoid the loop: the HTTP Request node has a batching option with items per batch and a batch interval, and every node can retry on failure with a pause between tries.

### Does a long wait use resources or count toward the workflow timeout?

A suspended wait uses no memory or CPU, because the execution is stored in the database until it resumes; its data is loaded again at that moment, so keep it small. The time does count toward an execution timeout: when a waiting execution resumes, the remaining time is calculated from its original start, so a workflow with a 10 minute timeout that waited an hour is stopped as soon as it wakes. Workflows with long waits should not have a timeout shorter than the wait.

## Verification Notes

The behaviour described here was read on 11 November 2026 from the n8n 2.47.4 sources: the Wait node (`Wait.node.ts`, versions 1 and 1.1, and its validation), the execution context that decides between sleeping and suspending (`putExecutionToWait`, with the 65 second constant and the two sentinel dates in the workflow package), the wait tracker (60 second poll, leader only, resume attempts, parent and child handling), the waiting executions query in the execution repository (70 second window), the waiting webhooks service (token validation, status checks and messages, method and suffix matching, form redirect), the helper that builds `$execution.resumeUrl`, the webhook helper that places the request on the resuming node, the workflow runner's timeout calculation, and the endpoint and execution settings. It was checked against the official Wait node documentation. The decision between sleeping and suspending, the tracker's selection window, the endpoint's responses, the suffix handling and the timeout arithmetic were reproduced in Node.js 24 with JavaScript ports of that logic, and the Code node example was executed with emulated n8n globals. These checks confirm the logic; they are not a substitute for running the workflows in your own instance, and they do not exercise a live n8n server, a reverse proxy or a real callback.

## Sources and Further Reading

- n8n Docs: [Wait node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait)
- n8n source: [Wait.node.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/nodes-base/nodes/Wait/Wait.node.ts)
- n8n source: [wait-tracker.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/cli/src/wait-tracker.ts) (poll, timers, resume attempts, parent and child executions)
- n8n source: [waiting-webhooks.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/cli/src/webhooks/waiting-webhooks.ts) (token validation and endpoint responses)
- n8n source: [base-execute-context.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/core/src/execution-engine/node-execution-context/base-execute-context.ts) (`putExecutionToWait`) and [workflow constants](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/workflow/src/constants.ts) (65 second limit, sentinel dates)
- n8n source: [get-additional-keys.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/core/src/execution-engine/node-execution-context/utils/get-additional-keys.ts) (`$execution.resumeUrl`) and [webhook-helpers.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/cli/src/webhooks/webhook-helpers.ts)
- n8n source: [execution.repository.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/%40n8n/db/src/repositories/execution.repository.ts) (waiting executions query) and [workflow-runner.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/cli/src/workflow-runner.ts) (timeout on resume)
- n8n source: [executions.config.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/%40n8n/config/src/configs/executions.config.ts) and [endpoints.config.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/%40n8n/config/src/configs/endpoints.config.ts)
- npm registry: [n8n latest release metadata](https://registry.npmjs.org/n8n/latest) (version 2.47.4 at the time of writing)
- Cover photo: [olia danilevich on Pexels](https://www.pexels.com/photo/person-coding-on-a-macbook-pro-4974912/); inline photo: [Daniil Komov on Pexels](https://www.pexels.com/photo/focused-coding-session-with-laptop-and-coffee-34803969/). Both are illustrative photographs under the Pexels licence, not n8n screenshots.
