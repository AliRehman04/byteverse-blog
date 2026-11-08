**A sub-workflow in n8n is a separate workflow that starts with the Execute Sub-workflow Trigger node and is called by an Execute Sub-workflow node in another workflow. The parent sends items in, the child runs as its own execution, and whatever the child's last node produces comes back to the parent.** That sounds simple, and the first example usually works. The trouble starts at the edges: the child only returns the last batch, the parent gets its own input back instead of the result, fields disappear on the way in, a manual test passes but production fails with "Workflow is not active", or the child refuses to be called at all.

This guide explains how sub-workflows behave in n8n 2.46, the current release at the time of writing, using the two nodes' own source code and the execution engine rather than guesswork: how to define the inputs a child accepts, how data crosses the boundary in both directions, what **Run once with all items** and **Run once for each item** change, what the parent really receives when the child ends in an If node or a loop, what **Wait for Sub-Workflow Completion** does when you turn it off, how errors, permissions, drafts and publishing interact, and why the memory docs recommend sub-workflows for large jobs. A fixes table at the end maps the exact error messages to their causes.

If you are new to n8n, start with the [beginner guide to n8n](/blog/how-to-use-n8n-2026-complete-guide). If you plan to call a sub-workflow per batch, the [Loop Over Items guide](/blog/n8n-loop-over-items-guide) covers the loop side of that pattern.

## When a sub-workflow is the right tool

n8n's documentation gives two reasons to call one workflow from another: to reuse logic, for example several workflows that collect data from different sources and all hand it to one workflow that builds the report, and to break a large workflow into smaller components. Both are real, but in practice there are five situations where a sub-workflow pays for itself:

1. **The same steps appear in more than one workflow.** Address normalisation, a Slack alert format, a lookup against your CRM: put it in one child, call it from every parent, fix bugs once.
2. **A workflow is running out of memory.** The hosting documentation's advice for memory errors is to split the workflow into sub-workflows and make sure each sub-workflow returns a limited amount of data to its parent, because the child only holds the current batch in memory and frees it when it finishes. The memory section below explains the pattern.
3. **You want a clean execution record per unit of work.** Every sub-workflow call is its own execution with its own entry in the executions list, linked to the parent in both directions. Debugging one failed order out of five hundred is far easier when it has its own execution.
4. **Different teams own different parts.** Sub-workflows live in projects, have their own credentials and their own caller policy, so a shared "send invoice" child can be maintained by one team and called by many.
5. **An AI agent needs a tool.** The Call n8n Workflow Tool node runs a workflow that starts with the same Execute Sub-workflow Trigger, so a child built for a parent workflow can also be exposed to an agent, with the same input schema.

Two facts make the decision easier. Sub-workflow executions do not count towards an n8n Cloud plan's monthly execution or active workflow limits, per the documentation, so splitting a workflow is not penalised. And since n8n 1.97.0 the editor can convert a selection of nodes into a sub-workflow for you, rewriting the expressions that referenced nodes outside the selection into trigger inputs.

When the logic is three nodes used once, keep it inline. The overhead of a child, its inputs, its publishing state and its caller policy is only worth it when at least one of the five reasons applies.

![A person taking notes while reviewing data on a laptop](https://www.byteverse.fyi/blog/csv-excel/photo-cover.jpg "Illustrative photograph of a person taking notes while reviewing data on a laptop, not a screenshot of n8n. Photo: Mikhail Nilov / Pexels.")

## The two nodes and how data crosses the boundary

The child workflow begins with the **Execute Sub-workflow Trigger**. On the canvas its default name is **When Executed by Another Workflow**, and in the node picker it appears under both names. It has no settings about *who* calls it; it only defines what input it expects. It must be the first node, and a workflow can contain only one of them.

The parent uses the **Execute Sub-workflow** node (default name on the canvas: **Execute Workflow**, internal type `executeWorkflow`). Its current version is 1.4, and the parameters you see depend on the version:

- **Source.** Current versions offer **Database**, which loads a workflow saved in your instance, and **Define Below**, which runs workflow JSON pasted into the node. Older node versions also offered **Local File** and **URL**; those are deprecated, only shown on nodes added before version 1.2, and the node asks you to import the workflow into the instance instead.
- **Workflow.** With the Database source you pick the child **From list** or **By ID**. The ID is the alphanumeric string after `/workflow/` in the child's URL. The list also contains a **Create a sub-workflow** entry that creates a new child with the trigger already in place.
- **Workflow Inputs.** The fields the child declared, ready to be mapped from the parent's data. More on this in the next section.
- **Mode.** **Run once with all items** (default) or **Run once for each item**.
- **Options.** A single option, **Wait For Sub-Workflow Completion**, enabled by default.

The data path is the one the documentation describes: the Execute Sub-workflow node passes its items to the trigger of the child, and the last node of the child sends its output back to the Execute Sub-workflow node in the parent, which then continues. Everything else in this guide is detail about those two hops.

One hint from the node's source is worth knowing early. If you set the workflow ID with an expression and the mode is **Run once with all items**, all items go to the same child; the expression is evaluated for the **first input item** only. To route different items to different children you need **Run once for each item**.

## Defining inputs: the three input data modes

The trigger's **Input data mode** decides what the parent sees and what the child receives. There are three choices.

| Mode | What the parent's Execute Sub-workflow node shows | What the child's trigger outputs | Use it when |
|---|---|---|---|
| Define using fields below | One mapping row per declared field, with its type | Only the declared fields, each present on every item; a missing field is filled with null | You want a stable contract and type checks |
| Define using JSON example | Mapping rows generated from an example object | Same as above, types inferred from the example | You already have a sample payload |
| Accept all data | No mapping rows; the node sends its input items as they are | Exactly the items the parent sent, unchanged | The child is generic or you are still exploring |

**Define using fields below** is the default. You add a name and a type per field; the supported types are string, number, boolean, array, object and any. The parent's node reads this schema and renders one input per field, which you fill with values or expressions. You can remove a field from the mapping in the parent, in which case the child receives `null` for it, and you can enable **Attempt to convert types** so that a string `"42"` mapped to a number field becomes `42` instead of failing.

**Define using JSON example** generates the same schema from a sample object. The example must be a JSON object, not an array, and a field whose value is `null` accepts any type:

```json
{
  "orderId": "ord_1042",
  "amount": 249.5,
  "priority": true,
  "tags": [],
  "customer": null
}
```

The source rejects a few shapes explicitly: a top-level array, a property that declares several types, and types outside the supported list, each with its own error message in the trigger.

**Accept all data** switches the contract off. The trigger passes the parent's items through untouched, the parent's node hides the Workflow Inputs section, and the child has to cope with whatever arrives. This is the right mode for a child that logs or forwards arbitrary payloads, and the wrong mode for anything two teams depend on.

The detail that bites people is what the trigger does in the two schema modes. Reading the trigger's `execute` method: it builds each output item from the schema fields first, filling every declared field with the fallback default, then copies in only those incoming fields whose names are in the schema. **A field the parent sends but the child did not declare is dropped.** If your child suddenly "loses" a field, the fix is in the child's trigger, not in the parent's mapping. The parent's node also removes mapping rows you deleted, so the child sees `null` there; the two mechanisms together are what keep the contract honest.

The trigger shows a hint, "This workflow isn't set to accept any input data", when the schema is empty in a schema mode. Add at least one field or switch to Accept all data.

Inside the child, declared inputs are ordinary item fields on the trigger's output, so the two usual references both work:

```txt
{{ $json.orderId }}
```

```txt
{{ $('When Executed by Another Workflow').item.json.customerId }}
```

The second form is useful deeper in the child, after other nodes have replaced `$json`. It relies on item linking being intact; the [item linking guide](/blog/n8n-cant-determine-which-item-to-use) explains what breaks it.

## Run once with all items versus run once for each item

The **Mode** parameter changes how many sub-executions one run of the parent node creates.

| | Run once with all items | Run once for each item |
|---|---|---|
| Sub-executions per run | 1 | One per input item |
| What the child trigger receives | All items in one execution | A single item per execution |
| Item linking back to the parent | By position when the child returns the same number of items, otherwise all outputs link to all inputs | Each returned item links to the input item that produced it |
| Errors | One failure fails the node | Each failing item is reported with its index; with Continue on error, failing items become error items |
| Good for | Batch jobs, aggregation, a report over many items | Per record processing where each record needs its own execution record |

Two consequences follow from the source.

First, item linking. In **Run once for each item** the node sets `pairedItem` on every returned item to the index of the input it came from, so `$('Node before the sub-workflow').item` resolves cleanly afterwards. In **Run once with all items** the node first tries to follow the child's own links back to its trigger; if that fails and the child returned exactly as many items as it received, it links by position; if the counts differ, every returned item is linked to every input, which is why a Code node after the parent node can throw the "Can't determine which item to use" error when the child filtered or expanded items. Return one item per input, use `first()`, `last()` or `all()[index]` instead of `.item`, or switch to the per item mode.

Second, scale. Each sub-execution is a full execution: it is stored according to the child's save settings, it appears in the executions list, and it costs the engine a start and a finish. Five hundred items in **Run once for each item** means five hundred executions. If the goal is simply to keep memory low, the better pattern is usually a Loop Over Items node with a batch size of 50 in front of an Execute Sub-workflow node in **Run once with all items**, so each sub-execution processes a chunk. The [Loop Over Items guide](/blog/n8n-loop-over-items-guide) explains the loop side, including why the loop's done output already combines the results.

## What the parent gets back

With waiting enabled, the parent receives the output of the **last node that executed** in the child. Not a node you nominate, not the trigger's input: the last node that ran. Three cases trip people up, and the engine's behaviour in each has changed in recent releases.

**The child ends in an If or Switch node.** With a trigger node of version 1.3, the current version, the engine collects every main output of the last node and flattens them into the parent's single output, so items that went down the false branch are returned along with the true ones. On older trigger versions the parent effectively saw only the first output, and items on other branches never came back. If you want only one branch returned, do not end the child on the If node; put an Edit Fields node on the branch you care about and let it be the last node.

**The child's last node ran more than once.** This is the classic "my sub-workflow returns only the last batch" complaint. A child that contains a Loop Over Items node, or any node that runs several times, ends with a last node that has several runs. For years the parent received only the final run; GitHub issue 9989 described exactly this, a scraping child that produced four items but returned one. The fix shipped in n8n 2.23.0: with a trigger of version 1.2 or newer, items from every run of the last node are concatenated per output, in the order they were produced. Triggers older than 1.2 keep the old behaviour unless you open the trigger and set **Items to Return** to **All Items From Every Run**; that option only exists on those older versions. If you still see one run's items on a current instance, the child's trigger node is old: delete it and add a fresh Execute Sub-workflow Trigger.

**The last node has pinned data.** In a manual run of the parent, pinned data on the child's last node is returned instead of real output, exactly as pinned data replaces output anywhere else in a manual execution. Unpin before you trust a manual test.

Whatever the case, the cleanest child ends with a deliberate return node. An Edit Fields node named Return, or a Code node in **Run Once for All Items** mode, lets you decide the shape and size of what goes back. This child side Code node returns one compact summary per call, which is what the memory guidance asks for:

```mjs
const trigger = $('When Executed by Another Workflow').first().json;
const results = $input.all();
const failed = results.filter((item) => item.json.status >= 400);
return [{
  json: {
    batchId: trigger.batchId,
    processed: results.length,
    failed: failed.length,
    failedIds: failed.map((item) => item.json.id),
  },
}];
```

The [Code node guide](/blog/n8n-code-node-guide) covers the return format rules this relies on.

Two more return details from the engine. Binary data produced by the child is duplicated into the parent's execution before the child's own data can be pruned, so files survive the hop. And if the child's last node produced zero items, the parent node outputs nothing and the nodes after it do not run; enable **Always Output Data** in the parent node's settings if the rest of the parent must continue regardless.

## Wait for Sub-Workflow Completion: fire and forget

The single option on the Execute Sub-workflow node is on by default. Turning it off changes four things, all visible in the node's source:

| Behaviour | Wait on (default) | Wait off |
|---|---|---|
| What the parent node outputs | The child's result | Its own input items, unchanged, plus metadata linking to the sub-execution |
| When the parent continues | After the child finishes | Immediately after the child has been started |
| Child errors | Fail the parent node | Are recorded on the child's execution only; the parent never sees them |
| Timeout | The child's deadline is the earlier of its own timeout and the parent's remaining time | The child uses only its own timeout setting |

Fire and forget is the right choice for notifications, audit logging and long jobs whose result nobody is waiting for. It is the wrong choice when the parent needs the answer: with waiting off the data that flows on is the parent's input, which is why "my Execute Workflow node returns the input instead of the result" is almost always this toggle. If you need both, start the child without waiting and have the child write its result somewhere the parent, or a later workflow, can read it, such as a database table or a webhook on another workflow.

In **Run once for each item** with waiting off, each item still starts its own detached sub-execution; the parent outputs every input item with the matching execution ID in its metadata, so you can at least record which child run handled which item.

## Errors, retries and the error workflow

A sub-workflow is its own execution, so error handling has two layers.

**In the child.** If any node fails and nothing catches it, the child execution fails. In production (anything but a manual run) a failed child dispatches its own **Error Workflow** if one is set in the child's settings, exactly as a top-level workflow would. The child's save settings decide whether the failed execution is kept.

**In the parent.** With waiting on, the child's error is thrown by the Execute Sub-workflow node. In **Run once for each item** the message is "Error executing workflow with item at index N" with the child's error as the description, and the node stops at that item. If the parent node's **On Error** setting is **Continue (using error output)**, every failing item becomes an item with a `json.error` field on the error output and the rest continue; node versions from 1.3 put all error items on one error output, older versions scattered them across branches. **Retry On Fail** on the parent node re-runs the entire child for the failing input, so the child needs to be safe to run twice.

Opening the parent node after a failure shows a **View sub-execution** link; the child's execution shows a link back to the parent. Follow the link before changing anything in the parent, because the failing node is almost always inside the child.

Two engine details matter for long children. In queue mode a sub-workflow is not enqueued as a separate job; it runs in the same worker process as the parent, so a heavy child consumes the parent's worker. And if the child itself pauses on a Wait node or a form, the engine treats that as a successful hand off: the parent is parked as waiting and resumes with the child's result when the child completes, so a child that waits for human approval does not fail the parent.

## Permissions: This workflow can be called by

Every workflow has a setting called **This workflow can be called by** in its workflow settings. The four values are: any workflow, no workflow, only workflows from a list of IDs, and only workflows from the same project. On self-hosted instances the default is set by `N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION`, whose documented default is `workflowsFromSameOwner`, so a child in a team project cannot be called from a personal project until you change it.

When the policy denies the call, the parent node fails with "The sub-workflow (ID) cannot be called by this workflow" and the description "The sub-workflow you're trying to execute limits which workflows it can be called by." If you have access to the child, the description includes a link to its settings; if the child belongs to someone else's personal project or to a team project you are not in, the message names who has to change it. The fix is always on the child: open its settings and either allow any workflow, allow workflows from the same project, or add the parent's workflow ID to the list.

Credentials follow the child, not the parent. A child saved in the database runs with credentials that its own project can use, so a parent in another project can call a child that uses credentials the parent could never see. A workflow pasted into the Define Below source is different: it belongs to no project of its own, so for a run a person started its credentials are checked against that user instead.

## Drafts, publishing and testing a sub-workflow

n8n saves every edit as a draft and only makes a version live when you publish it. This matters more for sub-workflows than for anything else, because the engine chooses which version of the child to run based on how the **root** execution started:

- A **manual or chat run** of the parent runs the child's **draft**, so you can iterate on both without publishing. Every level below a manual run uses drafts.
- A **production run** of the parent (schedule, webhook, app trigger) runs the child's **published** version. If the child has never been published, or has been unpublished, the parent fails with "Workflow is not active and cannot be executed."

Two symptoms come from this. "It works when I test it, but fails in production" with that exact message means the child is not published. "I fixed the child but production still runs the old logic" means you saved the fix but did not publish it. Publish the child after every change you want live, and remember that an unpublished child blocks every parent that depends on it.

Building the child is easier with real data. The documentation's recipe: set the child's trigger to **Accept all data** or declare the inputs if you know them, set **Save successful production executions** to **Save** in the child's settings, run the parent, then use **load data from previous executions** to copy a real execution into the child's editor and pin it on the trigger. Loading previous executions is available on n8n Cloud and registered Community plans.

A child must be free of errors before a parent can trigger it; the documentation states this plainly, and n8n will not run a child whose nodes have configuration errors. And a child must start with the Execute Sub-workflow Trigger: calling a workflow that lacks one fails with "Missing node to start execution" and the description "Please make sure the workflow you're calling contains an Execute Workflow Trigger node."

If you are splitting an existing workflow, the **Convert to sub-workflow** command (right-click the canvas with nodes selected, available since n8n 1.97.0) does the mechanical work. The selection must not include trigger nodes, must have exactly one node that receives connections from outside and one that sends connections outside, and must include every node between them; a Merge node cannot be the entry and an If node cannot be the exit. The new child uses v1 execution order, its input and output types default to any until you tighten them in the trigger and in the generated Return node, and expressions that used `first()`, `last()` or `all()` are rewritten with suffixes such as `_firstItem` so you can check them.

## Memory and large jobs

The hosting documentation for memory errors lists the usual causes, including the amount of JSON data, binary data size, node count, Code nodes, manual executions and parallel workflows, and gives one structural remedy: split the workflow into sub-workflows and ensure each sub-workflow returns a limited amount of data to its parent. The reasoning is that the child holds only its batch in memory and releases it when it finishes.

The pattern that implements this has three parts:

1. A **Loop Over Items** node in the parent with a batch size that fits the work, for example 100 rows.
2. An **Execute Sub-workflow** node on the loop output, in **Run once with all items**, with waiting on, so each batch becomes one sub-execution.
3. A child that does the heavy work and ends with a small return, such as the summary Code node above, connected back to the loop so the parent accumulates summaries, not rows.

What makes or breaks it is step three. A child that returns all 100 processed rows gives the parent back everything it was trying not to hold. A child that returns one summary item per batch keeps the parent's memory flat no matter how many batches there are. If the parent needs the full result set later, write it to a database, a data table or a file from the child and let the parent read it in a separate step.

Turning waiting off does not reduce memory in the parent, because the parent still holds its own input items; it only changes when the parent continues. And **Run once for each item** multiplies executions, not memory savings, so use it when per item execution records are the goal rather than as a memory tool.

## Calling a workflow from outside: API, webhooks and AI tools

Several searches around sub-workflows are really about starting a workflow from somewhere other than another workflow.

**From an external system.** n8n's public REST API manages workflows (create, update, publish, unpublish, archive, transfer, tags, version history) and executions, but it has no endpoint that starts a workflow run. The documented way to start a workflow from outside is a Webhook trigger in the workflow you want to run; the Execute Sub-workflow Trigger only responds to calls from inside the instance.

**From an AI agent.** The **Call n8n Workflow Tool** node lets an agent call a workflow that starts with the Execute Sub-workflow Trigger. The trigger's declared inputs become the tool's parameters, which is why the input schema matters for agents too: a clear field name and type is what the model fills in. The caller policy applies to agents as well; a denied agent call produces the same style of error with the agent named as the caller.

**From a schedule or a webhook into shared logic.** This is the plain sub-workflow case: the schedule or webhook workflow is the parent, the shared logic is the child, and the child is published once and called from each parent.

## Fixing the common failures

| Symptom or message | Cause | Fix |
|---|---|---|
| Workflow Inputs section is empty in the parent node | The child's trigger is in Accept all data mode, or the child has not been saved with its schema | Declare fields or a JSON example in the trigger and save the child; reopen the parent node |
| A field the parent sends is missing in the child | The field is not declared in the child's schema, so the trigger drops it | Add the field to the trigger's schema, or switch the trigger to Accept all data |
| "Missing node to start execution" | The target workflow has no Execute Sub-workflow Trigger | Add the trigger as the first node of the child |
| "Workflow is not active and cannot be executed." | A production run of the parent called a child that is not published | Publish the child; republish after every change you want live |
| "The sub-workflow (ID) cannot be called by this workflow" | The child's caller policy denies the parent | In the child's settings, allow the parent's project or add the parent's workflow ID to the list |
| "Workflow does not exist." | The workflow ID in the parent is wrong or the child was deleted | Reselect the child from the list |
| The parent receives only the last batch or last item | The child's trigger is older than version 1.2, or the instance predates n8n 2.23.0 | Replace the trigger with a current one, or on an old trigger set Items to Return to All Items From Every Run; update n8n |
| The parent receives its own input instead of the result | Wait For Sub-Workflow Completion is off | Turn the option on, or collect the child's result through a database or webhook |
| Items on the false branch of a final If node never return | The child's last node is the If node and the trigger is older than 1.3 | Upgrade the trigger, or end the child on an Edit Fields node after the branch you want |
| "Can't determine which item to use" after the parent node | Run once with all items with a child that returned a different number of items | Return one item per input, use first(), last() or all()[index], or switch to Run once for each item |
| "Error executing workflow with item at index N" | The child failed for that item in Run once for each item | Open View sub-execution, fix the failing node in the child, consider Continue (using error output) |
| A type error on a mapped input | The parent passes a value whose type does not match the declared field | Fix the expression or enable Attempt to convert types |
| Manual test returns stale or unexpected data | Pinned data on the child's last node is substituted in manual runs | Unpin the child's last node |
| Production still runs old child logic after a fix | The fix is saved as a draft but not published | Publish the child |
| The parent runs out of memory even with sub-workflows | The child returns all processed rows to the parent | End the child with a summary node; store full results outside the parent |

## A checklist before you publish a sub-workflow

- The child starts with the Execute Sub-workflow Trigger, declares its inputs in fields or a JSON example, and every field the parent needs is in that schema.
- The child ends on a deliberate return node that produces a small, predictable output, not on an If node and not on a node that runs many times unless you want every run's items.
- The parent uses Run once with all items for batches and Run once for each item only when each item needs its own execution record.
- Wait For Sub-Workflow Completion is on unless the parent genuinely does not need the result.
- The child's caller policy allows the parent, and the child is published.
- Error handling is decided: an Error Workflow on the child, Continue (using error output) or Retry On Fail on the parent, and the child is safe to run twice if retries are on.
- A manual run of the parent confirmed the child's draft, and a production run confirmed the published version, before real data went through.

## Frequently Asked Questions

### How do I pass data to a sub-workflow in n8n?

Declare the inputs in the child's Execute Sub workflow Trigger node using Define using fields below or Define using JSON example, then open the Execute Sub workflow node in the parent, where each declared field appears as a mapping row you fill with a value or an expression. Inside the child the fields arrive as ordinary item data on the trigger output. Fields the parent sends that are not declared in the schema are dropped by the trigger, so add any missing field to the schema or switch the trigger to Accept all data.

### Why does my n8n sub-workflow return only the last item or batch?

The parent receives the output of the last node that ran in the child, and if that node ran several times, for example after a Loop Over Items node, older versions returned only its final run. Since n8n 2.23.0 a trigger node of version 1.2 or newer returns the items from every run of the last node. If you still see one run, the trigger in your child is an old version: replace it with a new Execute Sub workflow Trigger, or on the old trigger set Items to Return to All Items From Every Run.

### What does Wait for Sub-Workflow Completion do in n8n?

With the option on, which is the default, the parent pauses until the child finishes and then outputs the child's result. With it off, the parent starts the child and continues immediately, outputting its own input items with metadata that points to the sub execution; child errors stay on the child's execution and the child uses only its own timeout. Turn it off for notifications and background jobs, and keep it on whenever the parent needs the result.

### Why does n8n say the workflow is not active and cannot be executed?

A production run of the parent, such as a schedule or webhook execution, always runs the published version of the child, while a manual run uses the child's draft. The message appears when the child has never been published or has been unpublished, which is why a sub workflow can work in a manual test and fail in production. Publish the child, and publish it again after every change you want live.

### Can an AI agent call an n8n sub-workflow?

Yes. The Call n8n Workflow Tool node runs a workflow that starts with the Execute Sub workflow Trigger, and the fields declared in that trigger become the parameters the agent fills in, so a child built for a parent workflow can be reused as an agent tool without changes. The child's caller policy applies to agents too, and a denied call produces an error naming the agent as the caller.

## Verification Notes

The parameter names, modes, option defaults, input data modes, error messages and return behaviour described here were read on 8 November 2026 from the source of the Execute Sub-workflow node (`ExecuteWorkflow.node.ts`, versions 1 to 1.4), the Execute Sub-workflow Trigger (`ExecuteWorkflowTrigger.node.ts`, versions 1 to 1.3), the shared workflow inputs helpers, the sub-workflow output helpers and the execution engine's `executeWorkflow` function at the n8n 2.46.6 tag, and checked against the official documentation for the two nodes, workflow settings, publishing, sub-workflow conversion and memory issues. The behaviour of the trigger's schema trimming, the parent's output merging and the wait option were reproduced in Node.js 24 with JavaScript ports of that logic against synthetic items. These checks confirm the logic; they are not a substitute for running the workflows in your own instance, and they do not exercise n8n's editor, database or queue mode.

## Sources and Further Reading

- n8n Docs: [Execute Sub-workflow node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow) (source, workflow inputs, mode, wait option)
- n8n Docs: [Execute Sub-workflow Trigger node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflowtrigger) (input data modes, loading data while building)
- n8n Docs: [Break workflows into smaller parts](https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts) (execution limits, data flow between workflows)
- n8n Docs: [Convert to sub-workflows](https://docs.n8n.io/build/flow-logic/convert-to-sub-workflows) (selection rules and caveats)
- n8n Docs: [Configure workflow settings](https://docs.n8n.io/build/manage-workflows/configure-workflow-settings) (This workflow can be called by, save settings, timeout)
- n8n Docs: [Save and publish workflows](https://docs.n8n.io/build/understand-workflows/save-and-publish-workflows) (drafts versus published versions)
- n8n Docs: [Fix memory issues](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/fix-memory-issues) (sub-workflows for large jobs)
- n8n Docs: [Workflows environment variables](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/workflows) (caller policy default)
- n8n Docs: [Call n8n Workflow Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow)
- n8n Docs: [Public API: Workflow endpoints](https://docs.n8n.io/connect/n8n-api/workflow)
- n8n source: [ExecuteWorkflow.node.ts](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflow/ExecuteWorkflow.node.ts)
- n8n source: [ExecuteWorkflowTrigger.node.ts](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node.ts)
- n8n source: [sub-workflow-output.ts](https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/sub-workflow-output.ts) (merged runs and flattened outputs)
- GitHub: [Sub-Workflow returns only data from the first run to parent WF, issue 9989](https://github.com/n8n-io/n8n/issues/9989) (fixed in n8n 2.23.0)
- npm registry: [n8n latest release metadata](https://registry.npmjs.org/n8n/latest) (version 2.46.6 at the time of writing)
- Cover photo: [cottonbro studio on Pexels](https://www.pexels.com/photo/woman-in-black-hoodie-using-a-laptop-5473309/); inline photo: [Mikhail Nilov on Pexels](https://www.pexels.com/photo/woman-looking-at-the-screen-of-her-laptop-8297058/). Both are illustrative photographs under the Pexels licence, not n8n screenshots.
