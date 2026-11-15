**The n8n Merge node runs as soon as every connected input has delivered data. If one branch produced nothing, the node still runs at the end of the execution with an empty input in every mode except Choose Branch, which waits for all inputs and therefore never fires.** Whether you then get items, fewer items or no items at all depends on the mode you picked.

That one rule explains most of the "Merge node not working" threads I have read. Someone puts a Merge after an If node, one side of the If has no items on a particular run, and the result looks random: sometimes items come through, sometimes the rest of the workflow stays grey. It is not random. It follows the mode and the workflow's execution order setting.

This guide covers the five modes of the current Merge node (version 3.2), what each does when an input is empty, how the execution engine decides to run a waiting node, the differences between the v0 and v1 execution orders, SQL Query mode with joins that were actually executed, and a repair table for the usual errors. The behaviour described here was checked on 15 November 2026 against the n8n source at commit `51f8cf6` on the master branch and the official Merge node documentation. SQL examples ran on AlaSQL 4.4.0, the version n8n's nodes package declares. If you have never built a multi-branch workflow, the [n8n beginner guide](/blog/how-to-use-n8n-2026-complete-guide) covers connections and the canvas first.

## Choose the mode before you connect anything

The mode is the whole decision. Pick the wrong one and the node will not error; it will quietly output a different number of items than you expected.

| You want to | Mode | When one input has zero items |
|---|---|---|
| Put items from several branches into one list | Append | Outputs the items from the branches that had data |
| Pair item 1 with item 1, item 2 with item 2 | Combine by Position | Zero items unless Include Any Unpaired Items is on |
| Join on a key such as `customerId` or `email` | Combine by Matching Fields | Depends on Output Type; Keep Matches outputs nothing |
| Every item of A paired with every item of B | Combine by All Possible Combinations | Zero items |
| Join three or more inputs, group, filter or aggregate | SQL Query | Depends on the query; LEFT JOIN keeps rows, inner JOIN drops them |
| Wait until all branches finished, then continue with one of them | Choose Branch | Node never runs in the v1 execution order |

The first row is where most If-then-rejoin workflows belong. If you split on a condition, do something different on each side and then want to continue with everything, that is Append. The join modes are for two lists that describe the same entities from different sources.

## How n8n decides when a Merge node runs

Nodes with one input run as soon as their parent outputs data. A node with more than one input is handled differently. The engine keeps a waiting list per node. Each time a parent finishes, its output lands in the slot for the input it is connected to. When every slot has something, the node is moved to the execution stack right away.

Two details decide the puzzling cases.

First, in the v1 execution order a branch that outputs zero items does not notify its children. The source has an explicit check: a child is only added if the output array has at least one item. So if the false branch of an If node is empty, the Merge node's second slot stays empty, and the Merge node keeps waiting while the rest of the workflow runs.

Second, when the stack is finally empty and nodes are still waiting, the engine goes through them and asks each node type what it requires. The Merge node declares this in one line of its description:

```txt
requiredInputs: '={{ $parameter["mode"] === "chooseBranch" ? [0, 1] : 1 }}'
```

Choose Branch requires inputs 0 and 1 both. Every other mode requires data on at least one input. If the requirement is met, the engine fills the missing slots with empty arrays and runs the node. If not, the node is skipped, it never runs, and nothing after it executes.

That is the entire mechanism behind "my Merge node never runs". With Choose Branch and an empty branch, the requirement cannot be met. With Append, Combine or SQL, the node runs but receives an empty array for the branch that produced nothing, and the mode decides what comes out.

One more consequence is worth knowing. Because the node waits until nothing else can run, a Merge node fed by one empty branch executes later than you might expect from reading the canvas left to right. Anything that happens in a parallel branch finishes first.

## v0 and v1 execution order change what the Merge node does

Workflows created before n8n 1.0 use the legacy v0 order unless someone changed the setting. New workflows use v1. The Merge node behaves differently under each, and the documentation describes the legacy case under "Branch execution with If and Merge nodes".

Under v0, when a Merge node is waiting for an input, the engine forces the nodes feeding that input to execute. The practical effect is that both outputs of an If node run even though the If node only sent data down one of them. People notice this as "the false branch ran with no data" or as duplicated side effects, such as two emails. Under v1 the engine does not force anything; it uses whichever input has data.

You can check and change the setting under Workflow Settings, Execution Order. Switching an old workflow to v1 fixes the forced-branch behaviour, but test it before saving, because nodes downstream of the Merge may have relied on the old behaviour to receive two inputs every time.

If you only remember one thing from this section: a Merge node that "fires with one input" is correct v1 behaviour, and a Merge node that "runs a branch that should have been skipped" is v0 behaviour.

![A person reviewing a spreadsheet of records on a laptop](https://www.byteverse.fyi/blog/csv-excel/photo-inline.jpg "Illustrative photograph of someone reviewing tabular data on a laptop, not a screenshot of n8n. Photo: Wolf Art / Pexels.")

## Append: the safe choice after an If split

Append concatenates. Items from Input 1 come first, then Input 2, and so on. The code is a loop that pushes each input's items onto one array, nothing more. Fields are not compared or merged.

A typical setup looks like this. Two Edit Fields nodes represent the two sides of an If node; in real life those would be your actual branch logic.

Input 1 after the true branch:

```json
[
  { "ticketId": "T-301", "priority": "high", "route": "phone" },
  { "ticketId": "T-305", "priority": "high", "route": "phone" }
]
```

Input 2 after the false branch:

```json
[
  { "ticketId": "T-302", "priority": "normal", "route": "email" }
]
```

Merge in Append mode outputs three items, in that order. If on a later run no ticket is high priority, Input 1 is empty, the node runs at the end with an empty first slot and outputs the single email ticket. Downstream nodes keep working. This is the behaviour most people want from an If-then-rejoin pattern, and it is why Append should be the default you reach for.

Two things trip people up in Append mode:

- The table view shows blank cells when items from different branches have different fields. That is display, not data loss. Switch to the JSON view to confirm each item still has its own fields.
- Number of Inputs can be set from 2 to 10 since n8n 1.49.0. Output order follows input number, so if a report needs the email tickets first, connect that branch to Input 1 rather than sorting afterwards.

Append passes items through exactly as they arrived, including their item-linking information, so expressions such as `$('Edit Fields').item` still resolve downstream. If you see linking errors after the Merge, the [item linking guide](/blog/n8n-cant-determine-which-item-to-use) explains how to trace them.

## Combine by Position: only when both sides already line up

Combine by Position merges item 0 with item 0, item 1 with item 1, and stops at the shorter input. The code computes the smallest length across all inputs and loops that many times. With five items on one side and ten on the other, you get five. The other five are not processed. If the shorter input has zero items, the node outputs nothing and attaches an execution hint suggesting the Include Any Unpaired Items option.

Turn on Include Any Unpaired Items and the loop runs to the longest length instead. Items without a partner come through with only their own fields.

Field clashes work like this. If you do not add the Clash Handling option at all, the last input wins when two items share a field name. If you add the option, its preset in Position mode is Always Add Input Number to Field Names, so `email` becomes `email1` and `email2` until you change it. That preset differs from the Matching Fields mode, where the added option defaults to preferring Input 2. Check which one you have before assuming.

Use Position only when the two inputs come from the same ordered source, for example a list of items and a second list built from exactly those items in the same order. The moment either side can filter, deduplicate or fail for one item, the positions drift and you silently pair the wrong records. For anything keyed, use Matching Fields instead.

## Combine by Matching Fields: the join most workflows actually need

This mode compares items by field value and is the closest thing to a database join in a no-code node. Enter the field name in Fields to Match. If the field is called something different on each side, turn on Fields To Match Have Different Names and enter both.

Output Type decides which items come out:

| Output Type | Database equivalent | Keeps |
|---|---|---|
| Keep Matches (default) | Inner join | Only items that matched, merged together |
| Keep Non-Matches | Anti join | Only items with no partner on the other side |
| Keep Everything | Full outer join | Matched items merged, plus unmatched items from both inputs |
| Enrich Input 1 | Left join | All of Input 1, with fields from matching Input 2 items added |
| Enrich Input 2 | Right join | All of Input 2, with fields from matching Input 1 items added |

Take a customers list on Input 1 and an orders list on Input 2:

```json
{
  "customers": [
    { "customerId": 101, "name": "Ayesha Khan", "plan": "pro" },
    { "customerId": 102, "name": "Daniel Reyes", "plan": "free" },
    { "customerId": 103, "name": "Mei Lin", "plan": "pro" }
  ],
  "orders": [
    { "orderId": "ORD-5001", "customerId": 101, "total": 120 },
    { "orderId": "ORD-5002", "customerId": 103, "total": 45 },
    { "orderId": "ORD-5003", "customerId": 101, "total": 80 }
  ]
}
```

Match on `customerId`. Keep Matches gives three items: Ayesha twice (one per order) and Mei once. Daniel has no order and is dropped. Enrich Input 1 gives four items: the same three plus Daniel with only his customer fields. Keep Non-Matches gives one item, Daniel.

Ayesha appearing twice is the Multiple Matches option at its default, Include All Matches. Set it to Include First Match Only when you want one output item per Input 1 item, keeping the first order found.

Rules from the source that explain unexpected results:

- An Input 1 item whose match field is missing entirely is put straight into the unmatched pile. Nothing is compared. A `customer_id` typo on one record therefore removes it from Keep Matches without any error.
- Comparison is strict by default. The number `101` and the string `"101"` do not match. If one source returns IDs as text (CSV imports and many webhooks do), enable Fuzzy Compare, which the documentation describes as tolerating type differences so that `3` and `"3"` are treated as equal.
- Dot notation is on by default, so `address.city` reaches a nested field. Disable it if your field names literally contain dots.
- When fields clash on a matched pair, Input 2 wins by default and nested objects are deep merged. Open Clash Handling to prefer Input 1 instead, to add input numbers to field names, or to switch to a shallow merge.

What happens with an empty input depends on the Output Type. Keep Matches with either input empty produces no output at all, and nodes after the Merge do not run. Enrich Input 1 with an empty Input 2 passes Input 1 through unchanged. Enrich Input 1 with an empty Input 1 outputs nothing. Keep Everything with one empty side passes through whatever the other side had. If a downstream node sometimes does not run after a Matching Fields merge, check which side was empty on that execution before changing anything else.

## SQL Query mode: when two inputs or five join types are not enough

From n8n 1.49.0 the Merge node can run a SQL statement over its inputs. Each input becomes a table named `input1`, `input2` and so on, in connection order. The query runs in AlaSQL inside an isolated sandbox with a memory limit and a 30 second timeout, so it is for joining and shaping workflow data, not for scanning hundreds of thousands of rows.

With the customers and orders data above on `input1` and `input2`, this left join keeps every customer and adds order fields where they exist:

```sql
SELECT input1.customerId, input1.name, input2.orderId, input2.[total]
FROM input1
LEFT JOIN input2 ON input1.customerId = input2.customerId
```

It returns four rows: two for Ayesha, one for Daniel with no order fields, one for Mei. Swap `LEFT JOIN` for `JOIN` and Daniel disappears, leaving three rows. Both results were executed, not assumed.

Grouping works as you would expect from SQL, with one habit worth adopting:

```sql
SELECT input1.name,
       COUNT(input2.orderId) AS orderCount,
       COALESCE(SUM(input2.[total]), 0) AS spent
FROM input1
LEFT JOIN input2 ON input1.customerId = input2.customerId
GROUP BY input1.name
```

Result: Ayesha with 2 orders and 200, Daniel with 0 and 0, Mei with 1 and 45. Without `COALESCE`, Daniel's `spent` comes back as `null`, which a later Google Sheets or email node will happily print.

Three inputs is where SQL mode earns its place. Add a refunds list on `input3` and chain a second `LEFT JOIN`. Customers with neither orders nor refunds still appear once. Customers with both get the refund fields on their order rows.

Now the parts that are easy to get wrong, each of which I hit while preparing this guide:

**Reserved words.** Two of the field names in the sample data, `total` and `plan`, are reserved in AlaSQL. The unquoted query failed with a parse error pointing at the column. Wrapping the name in square brackets, `input2.[total]`, or in backticks fixes it. If the Merge node reports "Issue while executing query" and the description mentions expecting a literal near one of your column names, this is almost always the cause.

**`SELECT *` with shared column names.** When both tables have a column called `name` or `status`, `SELECT *` keeps only one value per name. In the test, the Input 2 value replaced the Input 1 value and the customer's name was gone from the output. Alias columns explicitly whenever both inputs share field names:

```sql
SELECT input1.name AS customerName,
       input2.name AS orderName,
       input2.status AS orderStatus
FROM input1
JOIN input2 ON input1.id = input2.id
```

**Loose comparison.** Unlike Matching Fields mode, the SQL `=` in AlaSQL matched the number `101` to the string `"101"` without any option. That is convenient when sources disagree about types. It also means SQL mode will join records that Matching Fields would have kept apart, so do not expect the two modes to produce identical row counts on mixed-type data.

**Query Parameters.** The query text is fixed, and the node evaluates its parameters once per execution, not per item. For dynamic values, use `?` placeholders and provide the values in Options, Query Parameters, either comma separated or as an expression returning an array:

```sql
SELECT * FROM input1 WHERE [plan] = ? AND customerId > ?
```

With `{{ ["pro", 101] }}` as the parameter, that returned exactly one row, Mei Lin. Parameter values must be strings, numbers, booleans or null; an object throws a validation error before the query runs.

**Empty results.** Merge nodes at version 3.1 or older always emit `{ "success": true }` when a query returns no rows. Version 3.2, available from n8n 1.95.0, defaults to emitting nothing and adds the Empty Query Result option so you can choose. Nodes keep the version they were created with, so an old workflow does not pick up the new option until you add a fresh Merge node and move the query over.

**Size and time.** The node has two specific error messages here: "Dataset too large for the SQL sandbox" when the isolate runs out of memory, and "SQL query exceeded the 30 second execution limit" when the query is too slow. Both suggest filtering or aggregating upstream, or batching the input before the Merge. Those messages are in the node source, not guesses.

## Choose Branch is a gate, not a data tool

Choose Branch waits for all inputs and then outputs either the data of one chosen input, untouched, or a single empty item. Nothing is combined. Its job is sequencing: run the next step only after branches A and B have both finished, but continue with A's items.

This is also the only mode that requires every input to have data, which is why it is the mode most often behind "the Merge node never runs". If any branch can legitimately produce zero items, Choose Branch will skip the rest of the workflow on those runs in the v1 execution order.

Two ways out. Either switch to Append and accept that items from both branches come through, or make the empty branch always produce one item by enabling Always Output Data in the settings of that branch's last node. The engine then creates a single empty item so the child still runs. Pair this with a check downstream so the placeholder item does not get written anywhere.

If the goal is simply "wait for a side process to finish", a [sub-workflow](/blog/n8n-sub-workflow-guide) called synchronously is often cleaner than a Choose Branch gate, because the parent naturally continues after the child returns.

## Merge is not how you collect loop iterations

A recurring mistake is placing a Merge node after a Loop Over Items node to gather the results of every iteration. The Merge node combines data streams within one run. Each loop iteration is a separate run of the nodes inside the loop, and the engine keeps a separate waiting entry per run index, so a Merge inside or right after a loop runs once per iteration rather than once at the end.

The done output of Loop Over Items already contains the collected results from all iterations; connect your next step there. The [Loop Over Items guide](/blog/n8n-loop-over-items-guide) walks through that wiring. For situations where the loop output is not enough, the documentation points to the Code node for merging data from multiple node executions.

The Code node is also the fallback for combining data from nodes that are not direct parents, or on n8n versions older than 1.49.0 where the Merge node only takes two inputs. Reading other nodes by name needs no Merge at all:

```mjs
const users = $('Fetch Users').all();
const orders = $('Fetch Orders').all();
return [...users, ...orders];
```

That is the Code node equivalent of Append. Because `$('Node').all()` returns item objects with their `json` wrappers, the result keeps the structure n8n expects. The [Code node guide](/blog/n8n-code-node-guide) covers run modes and what `$input` versus `$('Node')` return.

One more data-shape pitfall. If an API returns a single item containing an array of records, Merge sees one item, not many. Use Split Out first so each record is its own item, then merge. The [Split Out guide](/blog/n8n-split-out-node-guide) covers the difference between one item holding an array and many items.

## Fix common Merge node problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Merge node shows no output and nothing after it runs | Choose Branch mode with one branch that produced zero items (v1 order) | Switch to Append, or enable Always Output Data on the empty branch's last node |
| Both sides of an If node executed although only one had data | Workflow uses the legacy v0 execution order | Change Execution Order to v1 in Workflow Settings and retest the whole workflow |
| Fewer items than expected after a Combine | Combine by Position stops at the shorter input, or Keep Matches dropped unmatched items | Enable Include Any Unpaired Items, or switch to Enrich Input 1 / Keep Everything |
| A field from Input 1 vanished after the merge | Field name clash; Input 2 wins by default | Open Clash Handling and prefer Input 1 or add input numbers to field names |
| Matching Fields finds no matches although the values look identical | Type mismatch such as `101` versus `"101"`, or the field is missing on some items | Enable Fuzzy Compare; check the field name on every item |
| SQL mode reports "Issue while executing query" near a column name | Reserved word used as a column name | Wrap the name in square brackets, for example `[total]` |
| SQL output lost a column that exists on Input 1 | `SELECT *` with the same column name on both inputs | Alias each shared column explicitly |
| SQL returns `{ "success": true }` instead of nothing | Merge node version 3.1 or older | Add a new Merge node (3.2) and set Empty Query Result |
| "Dataset too large for the SQL sandbox" or "exceeded the 30 second execution limit" | Too many rows or an expensive join in the sandbox | Filter or aggregate upstream, batch the input, or simplify the joins |
| Merge runs once per loop iteration instead of once at the end | Merge placed after a Loop Over Items node | Use the loop's done output, or collect in a Code node |

When debugging, pin the output of each branch first so the inputs stop changing, then execute only the Merge node and compare the input and output panels. Most issues are visible from the item counts on each input before you even read the data.

## Frequently Asked Questions

### Why does the n8n Merge node not run when one branch is empty?

In the v1 execution order, a branch with zero items does not pass anything to the Merge node, so the node waits. When nothing else can run, n8n checks the node's requirements. Choose Branch requires data on every input, so it is skipped and nothing after it runs. Append, Combine and SQL modes require only one input and run with an empty array for the missing branch.

### Does the Merge node wait for all inputs?

It waits for every connected input to deliver data, and runs immediately once they all have. If one input never delivers because its branch produced no items, the node runs at the end of the execution with that input empty, except in Choose Branch mode, where it does not run at all. Pin each branch's output while testing so you can see exactly which input was empty.

### How do I merge more than two inputs in n8n?

Set Number of Inputs to anything from 2 to 10, available since n8n 1.49.0, and use Append to list items or SQL Query to join across the inputs as tables named input1, input2 and so on. Combine by Matching Fields and Position work with two inputs. On older versions, read the other nodes by name in a Code node and return the combined array.

### What is the difference between Append and Combine in the Merge node?

Append places all items from every input into one list without touching their fields, so three items plus one item gives four items. Combine pairs items across inputs, either by position or by a matching field, and merges each pair into one item, so the output count depends on how many pairs exist. Use Append after an If split and Combine when both inputs describe the same records.

### Why does the SQL mode of the Merge node fail on a column name?

AlaSQL, the engine behind SQL Query mode, treats words such as total and plan as reserved. A column with that name causes a parse error that points at the column. Wrap the name in square brackets or backticks, for example input2.[total]. Also alias columns that exist on both inputs, because selecting every column with the star shorthand keeps only one value per shared name.

## Verification Notes

The guide was researched on 15 November 2026. Execution behaviour comes from reading the n8n execution engine and Merge node source at commit 51f8cf6 on the master branch, including the requiredInputs declaration, the waiting-node logic that fills missing inputs with empty arrays, the empty-output check that stops child nodes from being scheduled, and the empty-input branches in the Combine by Matching Fields and Position code. Mode descriptions, join semantics and version thresholds were cross-checked with the official Merge node documentation.

All SQL statements shown were executed against AlaSQL 4.4.0, the version declared by the n8n nodes package, using the same table setup the node's sandbox uses: one table per input, filled from the sample data. The reserved-word failure, the SELECT * column loss, the loose number-to-string comparison, the parameterised query and the three-input join were all observed directly. No n8n instance was run for this article, so the no-code configuration steps and the engine description are documented and source-derived guidance. These checks are not a substitute for running the workflow in your own instance, especially on versions other than 2.47.x or on workflows still using the v0 execution order.

## Sources and Further Reading

- n8n Docs: [Merge node modes, options and version notes](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge).
- n8n Docs: [Merge data in flow logic, including the Code node for multiple executions](https://docs.n8n.io/build/flow-logic/merge-data).
- n8n Docs: [Understand execution order, v0 and v1](https://docs.n8n.io/build/flow-logic/understand-execution-order).
- n8n source: [Merge node v3 description with the requiredInputs rule](https://github.com/n8n-io/n8n/blob/51f8cf624992e5813c31684359d95db5bf378092/packages/nodes-base/nodes/Merge/v3/actions/versionDescription.ts).
- n8n source: [Workflow execution engine, waiting-node and empty-output handling](https://github.com/n8n-io/n8n/blob/51f8cf624992e5813c31684359d95db5bf378092/packages/core/src/execution-engine/workflow-execute.ts).
- n8n source: [SQL Query mode implementation, sandbox limits and error messages](https://github.com/n8n-io/n8n/blob/51f8cf624992e5813c31684359d95db5bf378092/packages/nodes-base/nodes/Merge/v3/actions/mode/combineBySql.ts).
- AlaSQL: [Supported SQL statements](https://github.com/alasql/alasql/wiki/Supported-SQL-statements).
- Cover photograph: [Mikhail Nilov on Pexels](https://www.pexels.com/photo/woman-looking-at-the-screen-of-her-laptop-8297058/). Inline photograph: [Wolf Art on Pexels](https://www.pexels.com/photo/person-analyzing-data-on-laptop-screen-34639577/). Both are illustrative photographs under the Pexels licence, not n8n screenshots.