**Most n8n workflows that use the Loop Over Items node don't need it, and most that do need it are wired wrong in one of three ways: the loop output never connects back to the node, the done output is expected to carry the original items, or a nested loop is never reset.** n8n nodes already run once per input item, so the Loop Over Items node (still called Split in Batches in older workflows and in its internal name) exists for a narrower job: feeding items through a section of your workflow in controlled batches, usually to respect an API rate limit, to drive a node that only processes its first item, or to run a sub-workflow per batch.

This guide explains exactly how the node behaves in n8n 2.46, the current release at the time of writing, using the node's own source code rather than guesswork: what the **loop** and **done** outputs emit on each run, what the done output really contains, how **Batch Size** changes execution, how to read the current index and detect the last batch, when the **Reset** option is required, and how the node compares with the HTTP Request node's built-in batching and pagination for rate limits. A fixes table at the end covers the failures people search for: the loop that processes only the first batch, the done branch that never runs, the loop that never ends, and the inner loop that misbehaves.

If you are new to n8n, start with the [beginner guide to n8n](/blog/how-to-use-n8n-2026-complete-guide). If your loop body contains a Code node, the [Code node guide](/blog/n8n-code-node-guide) covers the return format and item linking rules that loops depend on.

## When you actually need Loop Over Items

n8n's execution model is the reason the node is optional. A node receives an array of items and runs its operation once per item, so connecting a Customer Datastore node to a Slack node sends one message per customer with no loop at all. The documentation's own words: n8n handles repetitive processing automatically, and you don't need to build loops into your workflows, except for a few nodes.

Those exceptions are the first legitimate reason for the node. The looping documentation lists them: the Code node in Run Once for All Items mode, the Execute Workflow node in Run Once for All Items mode, the HTTP Request node when you handle pagination yourself, the RSS Read node, which executes once for the requested URL, and several database nodes whose insert and update operations execute once (CrateDB, Microsoft SQL, MongoDB, QuestDB, TimescaleDB) plus the Redis Info operation. If one of those nodes sits in your flow and you need it to run per item, Loop Over Items with a batch size of 1 is the documented fix.

The second reason is pacing. When an API allows ten requests per second and your workflow has 500 items, a loop with a Wait node between batches keeps you under the limit. The third reason is grouping: processing items in chunks of 50 so that an Aggregate node, a Code node in all items mode, or an Execute Sub-workflow node receives 50 at a time instead of all 500.

If none of those apply, remove the node. A loop over 500 items with batch size 1 runs the body 500 times and stores 500 run entries in the execution, which is slower and harder to debug than letting n8n iterate for you.

![A developer reviewing an automation workflow on a laptop](https://www.byteverse.fyi/blog/claude-code-windows/photo-cover.jpg "Illustrative photograph of a developer at a laptop, not a screenshot of n8n. Photo: Daniil Komov / Pexels.")

## How the node works, run by run

The node has one input and two outputs, named **done** and **loop** in that order. Its only parameter is **Batch Size**, default 1, minimum 1. Its only option is **Reset**. Everything else is state that the node keeps for the duration of the execution. Reading the version 3 source code, each run does the following:

1. **First run.** The node saves the incoming items, records how many batches there will be (`ceil(items / batchSize)`), sets the current run index to 0, empties its list of processed items, and sends the first batch out of the **loop** output. The **done** output emits nothing.
2. **Every later run.** The node is executed again only because something connected its loop body back into it. The items arriving through that connection are appended to the processed list, the run index increases by 1, and the next batch leaves through **loop**.
3. **Final run.** When no items remain to send, the node emits the entire processed list through **done** and nothing through **loop**. The workflow continues from the done branch.

With 7 input items and a batch size of 3, the node runs four times:

| Run | Run index | Items sent through loop | Items added to processed | noItemsLeft after the run | Output used |
|---|---|---|---|---|---|
| 1 | 0 | Items 1 to 3 | none | false | loop |
| 2 | 1 | Items 4 to 6 | results of items 1 to 3 | false | loop |
| 3 | 2 | Item 7 | results of items 4 to 6 | true | loop |
| 4 | 3 | none | result of item 7 | true | done (7 processed items) |

Two things in this table surprise people. The run index that the done branch sees is 3, not 2, because the final run is a real run of the node. And `noItemsLeft` becomes true as soon as the last batch has been handed out, during run 3, while item 7 is still being processed. The next section shows how to use that correctly.

### What the done output really contains

The done output does not return your original input items. It returns the items that flowed back into the Loop Over Items node, accumulated across every iteration, in order. That has three practical consequences:

- If the loop body transforms items, for example an HTTP Request node that replaces each input with the API response, the done output holds the responses.
- If the loop body filters items, for example an If node whose false branch is left unconnected, the dropped items never return to the node and are missing from done.
- If the loop body never connects back, nothing is ever processed, the node never runs a second time, and the done branch never executes.

n8n attaches item linking information to the processed items so that `$('Node before the loop').item` still resolves after the done output, as long as the nodes in the body preserved their links. The [item linking guide](/blog/n8n-cant-determine-which-item-to-use) explains the error you see when a node in the body breaks the chain.

## The loop-back connection

The most common report, "Loop Over Items only processes the first batch" or "my loop runs once", is almost always a missing connection. The last node of your loop body must connect to the **input** of the Loop Over Items node. Without it the node is never asked for the next batch, so the first batch is the only one that runs, and the done branch is never reached.

Check three things when you see this:

1. Drag from the output of the last body node to the input of the Loop Over Items node. On the canvas this draws a line that curves back to the left; that curve is the loop.
2. Make sure the connection comes from the node that carries the items you want in the done output. If a Wait node is the last body node, connect the Wait node back, not the node before it.
3. If the body ends in an If or Switch node, decide what happens to the other branches. Any branch that does not connect back is excluded from the done output, which is sometimes what you want and sometimes the bug.

A second cause is the **Execute Once** setting on a node in the body. With Execute Once enabled, the node processes only the first item of each batch, which looks like the loop skipping items. Open the node's Settings tab and check the toggle.

## Batch size: what it changes and what it does not

Batch Size controls how many items leave the loop output per run. It does not change how nodes inside the body iterate: an HTTP Request node in the body still makes one request per item, whether the batch has 1 item or 50. The batch size matters for three kinds of node and one kind of pacing:

| Goal | Batch size | Why |
|---|---|---|
| Drive a node that only processes its first item (RSS Read, Execute Workflow in all items mode, database inserts listed above) | 1 | Each run delivers exactly one item, so the node runs once per item |
| Pace API calls with a Wait node after the request | The number of calls your limit allows per wait interval | A Wait of 1 second after a batch of 10 keeps you at 10 calls per second |
| Aggregate, summarise or run a Code node in all items mode per chunk | The chunk size you want | The body node sees only that many items at a time |
| Send chunks to a sub-workflow | The chunk size the sub-workflow expects | The Execute Sub-workflow node receives one chunk per run |

If your goal is only to slow down requests to an API, read the rate limits section first, because the HTTP Request node can do this without a loop.

## Reading the index and detecting the last batch

n8n exposes the loop's state through the node's context, and the documentation gives two expressions for it:

```txt
{{ $("Loop Over Items").context["currentRunIndex"] }}
{{ $("Loop Over Items").context["noItemsLeft"] }}
```

The first returns the zero based run number: 0 for the first batch, 1 for the second, and so on. The second returns true once no items remain to be sent, which, as the run table showed, happens while the last batch is still inside the body. Use it to run something special for the final batch, for example sending a summary message after the last API call, but do not use it to decide whether to connect back; the node handles termination itself.

Two more variables help inside the body. `$runIndex` is the run number of the node where the expression is written, so in a body node it matches the loop's current run index. `$itemIndex` is the position of the current item within the batch, from 0 to batch size minus 1. To compute an overall position across the whole loop:

```txt
{{ $("Loop Over Items").context["currentRunIndex"] * 10 + $itemIndex + 1 }}
```

Replace 10 with your batch size. If you store the original item count before the loop, for example in an Edit Fields node named Count, you can show progress as `{{ $("Count").first().json.total }}` items total against that position. The number of batches is also in the source as `maxRunIndex`, but it is not documented as a public expression, so prefer computing it yourself from the item count and batch size.

## Reset: when the node must forget its state

The node's state, remaining items and processed items, lives for the whole execution. That is exactly what you want for a normal loop and exactly what breaks two patterns: loops whose input changes each time around, and loops nested inside other loops. The **Reset** option, found under Options, tells the node to treat the incoming items as a new set instead of a continuation.

The documented example is pagination when you do not know the page count in advance. The loop requests one page, processes it, increments the page number, and an If node checks an exit condition; the loop runs again with Reset on so that the new page is treated as fresh input rather than as the tail of the previous batch. The documentation adds the warning that matters most: include a valid termination condition, because a reset loop whose exit condition never matches runs forever.

Reset accepts an expression, so you can reset only when a condition holds. In a nested loop, the inner Loop Over Items node still has leftover state from the previous outer iteration when the next outer item arrives. Without a reset, the inner loop either continues with stale items or reports done immediately. Setting Reset on the inner loop to an expression that is true when items arrive from the outer loop, and false when they arrive from the inner loop body, makes the pattern work, but it is fragile and hard to read later. The sturdier pattern is in the next section.

## Rate limits: Loop and Wait versus HTTP Request batching

When a service rejects requests with HTTP 429, n8n shows the message "The service is receiving too many requests from you". The rate limits documentation describes three remedies, and they are not interchangeable:

| Method | Where | What it does | Choose it when |
|---|---|---|---|
| Retry On Fail | Node Settings | Retries a failed request after Wait Between Tries (ms); set the wait longer than the limit window | Limits are occasional and the service returns 429 cleanly |
| Loop Over Items + Wait | Workflow | Sends a batch, waits, sends the next batch | The call is made by an app node (OpenAI, Gemini, Slack) that has no batching option, or you need per batch logic |
| HTTP Request Batching | HTTP Request node Options | Items per Batch plus Batch Interval (ms) between batches, inside one node | You call the API with the HTTP Request node; this is the documented equivalent of Loop plus Wait without extra nodes |

For the loop method, the wiring is: Loop Over Items, then the node that calls the API, then a Wait node set to **After Time Interval**, and the Wait node connected back to the loop. Size the batch to the limit: for 60 requests per minute, a batch of 10 with a 10 second wait, or a batch of 1 with a 1 second wait, both stay inside the limit, and the larger batch finishes the same work with fewer loop runs. One detail from the Wait node documentation helps here: waits shorter than 65 seconds keep the execution in memory instead of offloading it to the database, so short pauses between batches are cheap.

For OpenAI, Gemini and other model APIs the limits are often expressed in tokens per minute as well as requests per minute. A request-based batch does not protect you from a token limit, so keep Retry On Fail enabled on the model node with a wait of several seconds in addition to the loop, and let the retry absorb the occasional 429 that batching alone cannot predict. If the HTTP body you send is rejected as invalid JSON after a retry, the [guide to the JSON parameter needs to be valid JSON error](/blog/n8n-json-parameter-needs-to-be-valid-json) covers that separate failure.

## Pagination: use the HTTP Request node first

Building a page loop with Loop Over Items, Reset and an If node is the documented way when a node has no pagination support. The HTTP Request node has had built-in pagination for a while, and it is the better first choice. Under Options, **Pagination** offers two modes: **Update a Parameter in Each Request**, where you increment a page or offset parameter, and **Response Contains Next URL**, where you point the node at the next page link in the response. You then set when pagination is complete and can limit the number of pages fetched and set an interval between requests. The expressions `$pageCount`, `$request` and `$response` are available inside those settings, so `{{ $response.body.next }}` or `{{ $pageCount + 1 }}` replaces a whole loop.

Fall back to a Loop Over Items pagination loop only when the API's paging cannot be expressed that way, for example when the next page token must be transformed by a Code node, or when each page needs processing before the next request can be built.

## Nested loops and sub-workflows

n8n can run one Loop Over Items inside another, but the inner node's state persists across outer iterations and needs a conditional Reset, as described above. The pattern that stays readable is to move the inner loop into its own workflow and call it with the **Execute Sub-workflow** node. Set that node's mode to run once for each item when each outer item should trigger a full inner run, or keep the all items mode and pass a batch when the sub-workflow should receive a chunk. The sub-workflow starts with a clean Loop Over Items node every time, so no Reset expression is needed, and each inner run has its own execution record, which is far easier to debug than one execution with hundreds of nested runs.

The same split helps with memory. A single execution that loops over thousands of items holds every run's input and output in the execution data. Moving the body into a sub-workflow keeps each execution small, and the parent only stores what the sub-workflow returns.

## Collecting results after the loop

Because the done output already combines every processed item, you usually do not need a Merge node after a loop. Connect the done output to the next step and it receives all items at once. When you need one summary item instead, add an Aggregate node after done, or a Code node in Run Once for All Items mode:

```mjs
const items = $input.all();
const failed = items.filter((item) => item.json.status >= 400);
return [{
  json: {
    processed: items.length,
    failed: failed.length,
    failedIds: failed.map((item) => item.json.id),
  },
}];
```

If the body produced several items per input, for example one HTTP call that returned twenty records, the done output contains all twenty per input, because it collects whatever came back. Aggregate or filter after the loop, not inside it, unless the per batch result matters.

A common mistake is connecting both the done output and the loop output to the same downstream node. The downstream node then runs on every batch and again on the combined result, so the results appear duplicated. The loop output should connect only to the body; the done output only to what happens after the loop.

## Fixing the common failures

| Symptom | Cause | Fix |
|---|---|---|
| Only the first batch is processed; done never runs | The last body node is not connected back to the Loop Over Items input | Connect the body's final node to the loop node's input |
| Done fires immediately with zero items | The node received no input items; the source confirms the node returns done at once when there is nothing to split | Check the node before the loop; add an If node to skip the loop when the input is empty, if the downstream step cannot handle zero items |
| Done fires with fewer items than expected | An If or Switch branch in the body does not connect back, or a node in the body dropped items | Connect every branch that should count back to the loop, or accept the filter deliberately |
| The loop never ends | Reset is enabled without a working exit condition, or a node in the body re-creates items on every run | Add an If node with a termination condition before the loop-back, and verify it in a manual run with a small input |
| Items inside the body are processed one by one even with a large batch | That is expected: body nodes iterate per item; batch size controls how many items enter the body per run, not how the body iterates | Use batch size for pacing and grouping, not for speed |
| Only the first item of each batch is processed | A body node has Execute Once enabled | Turn off Execute Once in that node's Settings |
| The inner loop of a nested loop reports done immediately or repeats old items | The inner node kept state from the previous outer iteration | Set a conditional Reset on the inner loop, or move it into a sub-workflow |
| Results appear twice | Both outputs connect to the same downstream node | Connect loop to the body only and done to the post-loop step only |
| Can't determine which item to use after the loop | A body node, usually a Code node, returned items without item links | Return pairedItem from the Code node, or use first(), last() or all()[index] instead of item |
| Execution is slow or runs out of memory | Thousands of runs with batch size 1 in one execution | Increase the batch size, remove the loop when n8n's own iteration suffices, or move the body to a sub-workflow |

## A checklist before you run a loop in production

- The node is necessary: a body node needs single items, you are pacing an API, or you are grouping items for a chunk based step.
- The last body node connects back to the Loop Over Items input, and only the done output continues after the loop.
- Batch size matches the goal, and a Wait node or the HTTP Request Batching option enforces the pace.
- Any If or Switch branch inside the body either connects back or is meant to exclude items from done.
- Reset is off unless the loop is a pagination or nested loop, and if it is on there is a tested exit condition.
- Code nodes in the body return pairedItem so later nodes can reference items before the loop.
- A test run with three or four items confirms the run count, the done output and the final summary before the real data is used.

## Frequently Asked Questions

### Why does my n8n Loop Over Items node only run once?

The node runs again only when the last node of the loop body is connected back to its input. Without that connection the node sends the first batch, nothing returns, and it is never asked for the next batch, so the done branch never executes either. Drag a connection from the final body node to the input of the Loop Over Items node and run the workflow again.

### What does the done output of Loop Over Items contain?

It contains every item that flowed back into the node across all iterations, in order, not the original input items. If the body transformed items, done holds the transformed versions; if a branch inside the body never connected back, those items are missing from done. This is why you rarely need a Merge node after a loop: the done output already combines the processed results.

### How do I get the current index inside an n8n loop?

Use the context of the loop node with the expression that reads currentRunIndex to get the zero based batch number, and use the itemIndex variable for the position of the current item inside the batch. Multiply the run index by your batch size and add the item index to get an overall position. The noItemsLeft context value becomes true as soon as the last batch has been handed out, so it is true while the final batch is still processing.

### How do I handle API rate limits in n8n without a loop?

If you call the API with the HTTP Request node, open Options, add Batching, and set Items per Batch together with Batch Interval in milliseconds; the documentation describes this as the equivalent of Loop Over Items plus Wait inside one node. For app nodes such as OpenAI or Slack that have no batching option, use the loop with a Wait node after the call and connect the Wait node back to the loop, and enable Retry On Fail with a wait longer than the limit window to absorb occasional 429 responses.

### Can I nest Loop Over Items nodes in n8n?

You can, but the inner loop keeps its remaining and processed items between outer iterations, so it must be reset with a conditional Reset expression when new items arrive from the outer loop; otherwise it reports done immediately or repeats stale items. The approach that stays readable is to put the inner loop in a separate workflow and run it as a sub workflow from the parent, which starts with a clean inner loop every time and gives each inner run its own execution record.

## Verification Notes

The run by run table, the description of the done output, the behaviour on empty input and the effect of Reset were derived on 7 November 2026 from the version 3 source of the node (`SplitInBatchesV3.node.ts` in the `nodes-base` package) and checked by executing a JavaScript port of that logic against synthetic items in Node.js 24, including a body that filters items, a body that never connects back, and a reset loop. Parameter names, option names, the list of nodes that need loops, the rate limit remedies and the Wait node behaviour are quoted from the official documentation for n8n 2.46. These checks confirm the logic; they are not a substitute for running the workflow in your own instance, and they do not exercise n8n's execution engine, database offloading or the editor.

## Sources and Further Reading

- n8n Docs: [Loop Over Items (Split in Batches)](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches) (parameters, Reset, context expressions)
- n8n Docs: [Looping in n8n](https://docs.n8n.io/build/flow-logic/loop) (automatic iteration and node exceptions)
- n8n Docs: [Handle rate limits](https://docs.n8n.io/integrations/builtin/handle-rate-limits)
- n8n Docs: [HTTP Request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest) (Batching and Pagination options)
- n8n Docs: [Wait node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait)
- n8n Docs: [n8n metadata variables](https://docs.n8n.io/build/code-in-n8n/use-built-in-shortcuts/n8n-metadata) (`$runIndex`, `$itemIndex`)
- n8n Docs: [Break workflows into smaller parts](https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts)
- n8n source: [SplitInBatchesV3.node.ts](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/SplitInBatches/v3/SplitInBatchesV3.node.ts)
- npm registry: [n8n latest release metadata](https://registry.npmjs.org/n8n/latest) (version 2.46.6 at the time of writing)
- Cover photo: [olia danilevich on Pexels](https://www.pexels.com/photo/person-coding-on-a-macbook-pro-4974912/); inline photo: [Daniil Komov on Pexels](https://www.pexels.com/photo/focused-coding-session-with-laptop-and-coffee-34803969/). Both are illustrative photographs under the Pexels licence, not n8n screenshots.
