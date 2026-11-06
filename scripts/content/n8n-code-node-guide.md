**The n8n Code node accepts exactly one shape of output: an array of items, where each item is an object whose `json` key points to another object.** Almost every Code node failure, from "Code doesn't return items properly" to a later node complaining that it can't find a matching item, comes from one of four things: returning the wrong shape, using a variable from the wrong execution mode, losing the link between input and output items, or expecting a module, file or HTTP call that the sandbox doesn't provide.

This guide covers all four, as they work in n8n 2.46 (the current release on npm at the time of writing). It explains what the node receives, what it must return, what each error message means in the validation code that produces it, how to keep item links intact, how to handle dates, binary files, Python and external modules, and which task runner settings control timeouts and memory on a self hosted instance. Every JavaScript example returns data in the exact format n8n validates, and the behaviour table in the error section was checked against n8n's published validation source, not guessed from forum threads.

If you are new to n8n, the [beginner guide to n8n](/blog/how-to-use-n8n-2026-complete-guide) explains nodes, items and executions first. If your error mentions "Can't determine which item to use", the fix is item linking, covered below and in more depth in the [item linking troubleshooting guide](/blog/n8n-cant-determine-which-item-to-use).

## What the Code node receives and what it must return

Every node in n8n passes data to the next node as an array of items. Each item wraps its data under `json`, may carry files under `binary`, and may carry a `pairedItem` reference that records which input item produced it:

```json
[
  {
    "json": { "id": "A-1001", "email": "Ava@Example.com", "status": "active" },
    "binary": {
      "data": { "data": "base64...", "mimeType": "text/csv", "fileName": "export.csv" }
    },
    "pairedItem": { "item": 0 }
  }
]
```

The Code node gives you that array and expects the same structure back. Two conveniences hide the rule from beginners and cause confusion later:

1. If you return plain objects without a `json` key, n8n wraps each one as `{ "json": yourObject }` for you.
2. If you return a single object instead of an array in **Run Once for All Items** mode, n8n wraps it in an array and outputs one item.

Both conveniences stop working the moment your output mixes styles, because n8n then has to guess whether `name` is your data or a typo for `json`. The validation rules in the next sections make that precise.

![A developer working through automation code on a laptop](https://www.byteverse.fyi/blog/claude-code-windows/photo-inline.jpg "Illustrative photograph of a developer at a laptop, not a screenshot of n8n. Photo: cottonbro studio / Pexels.")

### Variables available in each mode

The node's **Mode** setting decides which variables exist and what the return value means. The official reference marks which methods work inside the Code node; the table below keeps the ones you use daily.

| Variable or method | Run Once for All Items | Run Once for Each Item | Notes |
|---|---|---|---|
| `$input.all()` | All input items | All input items | The main way to read input in all items mode |
| `$input.first()` / `$input.last()` | First or last input item | Same | Handy after an Aggregate or Summarize node |
| `$input.item` | Not meaningful | The item being processed | The documented way to read the current item |
| `$json` | Not available (documented as each item only) | Shorthand for `$input.item.json` | Using it in all items mode is a common bug |
| `$('Node name').all()` / `.first()` / `.last()` | Yes | Yes | Read any earlier node's output |
| `$('Node name').item` | Not reliable | The linked item for the current input | Needs intact item links |
| `$('Node name').itemMatching(i)` | Yes | Yes | Trace input item `i` back to an earlier node |
| `items` / `item` | Legacy names from the old Function nodes | Legacy | Prefer `$input`; n8n maps the "not defined" error to a hint |
| Return value | Array of items (single object also accepted) | Exactly one object | Arrays are an error in each item mode |

Two details save real debugging time. `$json` in all items mode is not simply "the first item"; the reference lists it as available only when running once for each item, so treat it as unavailable there. And `$('Node name').item` depends on item linking information that your own Code node must preserve when it reshapes data, which is why the `pairedItem` section below matters.

## Run Once for All Items versus Run Once for Each Item

**Run Once for All Items** executes your code one time with the whole input array. It is the right mode for filtering, aggregating, sorting, deduplicating, splitting one item into many, or combining data from two nodes. **Run Once for Each Item** executes your code once per input item and must return exactly one object per run. It is the right mode for simple per item transforms where you never need to see the other items.

The following examples use this input, which you can paste into an Edit Fields node or pin on a Manual Trigger to follow along:

```json
[
  { "json": { "id": "A-1001", "email": "Ava@Example.com", "status": "active", "amount": 120.5 } },
  { "json": { "id": "A-1002", "email": "Liam@Example.com", "status": "inactive", "amount": 80 } },
  { "json": { "id": "A-1003", "email": "Mia@Example.com", "status": "active", "amount": 42.25 } }
]
```

### Filter and reshape in all items mode

```mjs
const out = [];
for (const [index, item] of $input.all().entries()) {
  if (item.json.status !== 'active') continue;
  out.push({
    json: { id: item.json.id, email: String(item.json.email).toLowerCase() },
    pairedItem: index,
  });
}
return out;
```

Two active customers come out, each with a lowercased email, and each output item records which input item it came from. The `pairedItem` index is what lets a later node use `$('Code').item` or `$('Edit Fields').item` without a "Can't determine which item to use" error. Filtering with `Array.prototype.filter()` followed by `map()` works too, but you then have to carry the original index yourself; the loop makes that explicit.

### Transform in each item mode

```mjs
const total = Number($json.amount) * 1.17;
return { json: { ...$json, totalWithTax: Number(total.toFixed(2)) } };
```

Each run returns one object. n8n wraps it, keeps the item link automatically because there is one input and one output, and the node outputs three items. Returning `null` from one run silently drops that item from the output, which is occasionally useful for filtering in each item mode but easy to do by accident when a code path forgets to return.

### Split one item into many

A webhook or HTTP Request node often delivers one item whose `json` holds an array. In all items mode, map that array to items:

```mjs
const rows = $input.first().json.rows ?? [];
return rows.map((row) => ({ json: row, pairedItem: 0 }));
```

Every output item points back to input item 0, which is accurate: they all came from the same request. Trying this in each item mode fails with "Code doesn't return a single object", because one input produced many outputs; the error's description tells you to switch modes, which is the correct fix.

### Aggregate many items into one

```mjs
const items = $input.all();
const totalAmount = items.reduce((sum, item) => sum + Number(item.json.amount || 0), 0);
return [{ json: { count: items.length, totalAmount: Number(totalAmount.toFixed(2)) } }];
```

One output item summarises three inputs. n8n accepts a single returned object here as well, but returning an array keeps the shape consistent with the rest of your code. After an aggregation, `$('Code').item` is ambiguous downstream because one output has several parents; use `$('Code').first()` after this node, exactly as the item linking documentation recommends for Aggregate and Summarize.

## Returning arrays, strings, numbers and lists of values

The most searched Code node question is some form of "how do I return an array". A bare array of strings or numbers is not a valid output, because each element must be an object. You have two correct options and they mean different things:

```mjs
const emails = $input.all().map((item) => item.json.email);

// Option 1: one item per value, for nodes that should process each email separately.
return emails.map((email, index) => ({ json: { email }, pairedItem: index }));

// Option 2: one item that carries the whole list, for a single API call or message.
// return [{ json: { emails } }];
```

Choose option 1 when the next node should run once per value, for example sending one email each. Choose option 2 when the next node needs the whole list at once, for example a request body with `recipients: [...]`. A single string or number can never be returned on its own; wrap it as `{ json: { value } }`.

JSON text is a related trap. If an earlier node gives you a string containing JSON, parse it before returning, because n8n will not parse it for you and the next node sees one long string:

```mjs
const raw = $input.first().json.body;
let parsed;
try {
  parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
} catch (error) {
  throw new Error(`Body is not valid JSON: ${error.message}`);
}
return Array.isArray(parsed) ? parsed.map((entry) => ({ json: entry })) : [{ json: parsed }];
```

Throwing an `Error` with a clear message is better than returning a partial result, because the execution log then shows what was wrong. If the string turns out to be HTML rather than JSON, the usual cause is a login page or error page returned by the API, which the [guide to fetch returning HTML instead of JSON](/blog/unexpected-token-html-not-valid-json) walks through. When you need to inspect a confusing payload by hand, paste it into the [JSON formatter](/tools/json-formatter) to see its real structure before writing code against it.

### What each return value does

This table was produced by running representative return values through a port of n8n's own validation functions for the Code node (`validateRunCodeAllItems` and `validateRunCodeEachItem`, which share the checks the task runner applies). The outcomes are deterministic rules, not observations from one version.

| You return (all items mode) | Result |
|---|---|
| `[{ json: { a: 1 } }]` | One item, as written |
| `[{ a: 1 }, { a: 2 }]` | Two items; each object is wrapped under `json` |
| `{ json: { a: 1 } }` | One item; the single object is wrapped in an array |
| `null` | Zero items and no error; later nodes receive nothing |
| `undefined` (no `return` statement) | Error: Code doesn't return items properly |
| `"done"` or `42` | Error: Code doesn't return items properly |
| `[1, 2, 3]` or `["a", "b"]` | Error: Code doesn't return items properly (elements are not objects) |
| `[{ json: [1, 2] }]` | Error: A 'json' property isn't an object |
| `[{ json: { a: 1 }, name: "x" }]` | Error: Unknown top-level item key: name |
| `[{ json: { a: 1 }, binary: "file" }]` | Error: A 'binary' property isn't an object |
| `[{ json: { when: new Date() } }]` | One item; the `Date` becomes an ISO string during output standardisation |

In each item mode the same values behave as follows: `{ json: { a: 1 } }` and `{ a: 1 }` both produce one item, `null` drops the item, `undefined` raises "Code doesn't return an object", and any array raises "Code doesn't return a single object".

## What each Code node error message means

n8n's error text is short, so the table below pairs each message with the condition that triggers it in the validation source and the fix that actually clears it.

| Message | Trigger | Fix |
|---|---|---|
| Code doesn't return items properly | In all items mode the return value is not an object, or the array contains a non object such as a string or number | Return an array of `{ json: {...} }` objects; wrap scalar values |
| A 'json' property isn't an object | A returned item's `json` is an array, a string, a number, `null` or a `Date` | Make `json` a plain object; put arrays under a named key such as `json: { rows }` |
| Code doesn't return an object | In each item mode the code returned a non object, typically `undefined` because a branch has no `return` | Return `{ json: {...} }` from every code path, or return `null` to drop the item deliberately |
| Code doesn't return a single object | In each item mode the code returned an array | Switch the node to Run Once for All Items, or return one object |
| Unknown top-level item key: name | At least one returned item uses `json`, `binary`, `pairedItem`, `error` or `index`, and another key sits beside them | Move your own fields under `json` |
| A 'binary' property isn't an object | `binary` is a string or other non object | Build binary data with the helper shown below and assign the result under a property name |
| items is not defined / item is not defined | Code written for the old Function nodes | Use `$input.all()` or `$input.item` |
| 'import' and 'export' may only appear at the top level | ES module syntax in the sandbox | Use `require()` and allowlist the module |
| Cannot find module 'x', or a message that the module is disallowed | The module is not installed, or not allowlisted by environment variable | Self hosted only: install it and set the allowlist variables; n8n Cloud cannot import it |
| this.getCredentials is not a function / $getCredentials is not defined | Code nodes never receive credentials by design | Move the authenticated call to an HTTP Request node |
| ERROR: Info for expression missing from previous node | A later node used `.item`, but your Code node returned items without `pairedItem` | Add `pairedItem` to each output item |
| ERROR: Multiple matching items for expression | A later node used `.item` after a node that merged several inputs into one output | Use `.first()`, `.last()` or `.all()[i]` instead of `.item` |

A line in the output pane that reads "To make sure expressions after this node work, return the input items that produced each output item" is not an error. n8n shows that hint whenever the number of output items differs from the number of inputs or any output lacks `pairedItem`. Add the links and the hint disappears.

## Keeping item links intact with pairedItem

n8n tracks a thread for every item back through the workflow. Most nodes maintain it automatically. The Code node cannot, because only your code knows which input produced which output. With a single input item n8n links automatically; with several, the rule is simple: when you create new items or change their count or order, set `pairedItem` to the index of the input item each output came from. You can write the index directly, as the official example does, or the longer `{ item: index }` form; both are accepted.

Reading data from further back uses `itemMatching()`. This example restores an email that an earlier Edit Fields node dropped, matching each current item to the customer record that produced it:

```mjs
const enriched = $input.all();
for (let i = 0; i < enriched.length; i++) {
  enriched[i].json.customerEmail = $('Get customers').itemMatching(i).json.email;
}
return enriched;
```

Because `enriched` is the input array itself, the existing links are kept and the output count matches. In each item mode the equivalent is `$('Get customers').item.json.email`, which n8n resolves through the same thread.

When the thread breaks, you see the item linking errors listed in the table above. The fixes are always the same three: add `pairedItem` in the Code node that broke the chain, replace `.item` with `.first()`, `.last()` or `.all()[index]` where the position is known, or reference a different node that holds the same data and has a clean link. A Merge node in **Append** mode also breaks `.item` for items from the other branch, so after an Append use positional access or switch the Merge node to **Combine**.

## Multiple inputs and multiple outputs

The Code node has one input and one output. "Multiple inputs" in practice means one of two patterns.

**Pattern 1: read the other node directly.** If both nodes already ran in this execution, reference them by name and join inside the code. Here the Code node is connected after `Get orders`, so `pairedItem` refers to order items:

```mjs
const orders = $('Get orders').all();
const customersById = new Map($('Get customers').all().map((item) => [item.json.id, item.json]));
return orders.map((order, index) => ({
  json: { ...order.json, customer: customersById.get(order.json.customerId) ?? null },
  pairedItem: index,
}));
```

This works only when `Get customers` has executed before the Code node in the same run. If it sits on a branch that did not execute, the reference fails, so place the Code node after both branches have run or merge them first.

**Pattern 2: merge first.** Connect both nodes to a Merge node (Append, or Combine by matching fields), then connect the Merge node to the Code node. Append gives you all items in one array, and Combine gives you one item per match with both sides' fields, which is usually what a join needs.

For multiple outputs, add a routing field in the Code node and let a Switch node fan out:

```mjs
return $input.all().map((item, index) => ({
  json: { ...item.json, route: Number(item.json.amount) >= 100 ? 'review' : 'auto' },
  pairedItem: index,
}));
```

Then route on `{{ $json.route }}` in the Switch node. This keeps the code free of branching logic that n8n can display, test and pin on the canvas.

## Dates, Luxon and the modules you can and cannot load

The Code node exposes Luxon's `DateTime` as a global, plus `$now` and `$today`. What it does not include are n8n's expression only extensions. The reference explains that the Code node runs plain JavaScript against native Luxon, so `DateTime.format()` is not a function there and `plus()` takes an object such as `{ days: 7 }` rather than the `(amount, unit)` signature that works in expressions. Using the expression style `plus(7, 'days')` in the Code node does not throw; it quietly returns the wrong result, which is the worst kind of bug.

```mjs
const created = DateTime.fromISO($json.createdAt, { zone: 'utc' });
if (!created.isValid) {
  throw new Error(`createdAt is not an ISO date: ${$json.createdAt}`);
}
return {
  json: {
    ...$json,
    createdLocal: created.setZone('Asia/Karachi').toFormat('yyyy-LL-dd HH:mm'),
    dueDate: created.plus({ days: 7 }).toISODate(),
    ageDays: Math.floor($now.diff(created, 'days').days),
  },
};
```

Return formatted strings or ISO strings rather than `DateTime` objects. The node standardises output by converting non plain objects such as `Date` and `RegExp` to strings, and a `DateTime` object carries far more structure than the next node needs.

Loading `luxon` with `require('luxon')` is unnecessary and, on most instances, blocked. Module access in the Code node is deliberately restricted:

- **n8n Cloud** makes two modules available, the Node.js `crypto` module and `moment`; nothing else can be imported.
- **Self hosted** instances allow modules only through two environment variables: `NODE_FUNCTION_ALLOW_BUILTIN` for Node.js built in modules and `NODE_FUNCTION_ALLOW_EXTERNAL` for packages installed in n8n's `node_modules`. Both accept comma separated names, and `*` allows everything for built ins.
- Because the Code node runs through task runners in n8n 2, these variables belong to the runner, and in external mode they are set in the runners configuration file as environment overrides rather than on the main container.

```bash
export NODE_FUNCTION_ALLOW_BUILTIN=crypto,fs
export NODE_FUNCTION_ALLOW_EXTERNAL=luxon,lodash
```

`import` and `export` statements are not supported in the sandbox at all; after allowlisting a module, load it with `require()`. If a dependency relies on runtime prototype mutation, `N8N_RUNNERS_ALLOW_PROTOTYPE_MUTATION=true` exists, but it relaxes the sandbox and should be a conscious decision.

## HTTP requests, files and credentials

The documentation is direct about this: the Code node is not the place for HTTP requests or file system access. Use the HTTP Request node and the Read/Write Files from Disk node, and keep the Code node for shaping data between them. There are three practical reasons beyond policy. Credentials are never exposed to code, so an authenticated call cannot be made correctly from the sandbox. Retries, pagination and timeouts are configured declaratively on the HTTP Request node and visible to whoever maintains the workflow. And request errors in a dedicated node appear with the response body attached, instead of as an exception inside your script.

The productive pattern is to let the Code node build the request list and the HTTP Request node send it. The Code node returns one item per request with `url`, `method` and `body` fields; the HTTP Request node then uses expressions such as `{{ $json.url }}` and runs once per item with its own credential, retry and batching settings. If a request later fails with a JSON body error, the [guide to the JSON parameter needs to be valid JSON error](/blog/n8n-json-parameter-needs-to-be-valid-json) covers how to pass objects instead of hand written JSON strings. Webhook inputs that arrive empty or malformed are a separate problem, handled in the [webhook troubleshooting guide](/blog/n8n-webhook-not-working-2026).

Binary data is the exception where helpers are the documented path. To read a file that an earlier node produced, use the buffer helper rather than reaching into the base64 string:

```mjs
const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
const text = buffer.toString('utf8');
return [{ json: { lines: text.split(/\r?\n/).filter(Boolean).length, preview: text.slice(0, 200) } }];
```

To create a file, build a Buffer and hand it to `prepareBinaryData`, then attach the result under a property name, conventionally `data`:

```mjs
const items = $input.all();
const csv = ['id,email', ...items.map((item) => `${item.json.id},${item.json.email}`)].join('\n');
const binary = await this.helpers.prepareBinaryData(Buffer.from(csv, 'utf8'), 'contacts.csv', 'text/csv');
return [{ json: { rows: items.length }, binary: { data: binary } }];
```

`getBinaryDataBuffer()` is not available in Python. Large files should flow through nodes designed for them, because binary payloads inside the Code node count against the task runner's payload limit described next.

## Timeouts, memory and large inputs on self hosted n8n

Since n8n 2, JavaScript in the Code node executes in a task runner, a separate process that the main instance supervises. That design is why a slow Code node fails with a timeout rather than freezing the whole instance, and it is where the limits live. These are the variables that matter for Code node behaviour, with their documented defaults:

| Variable | Default | What it controls |
|---|---|---|
| `N8N_RUNNERS_TASK_TIMEOUT` | 300 seconds | Maximum time one Code node task may run before the runner stops it and restarts |
| `N8N_RUNNERS_TASK_REQUEST_TIMEOUT` | 60 seconds | How long a task waits for a free runner before failing |
| `N8N_RUNNERS_MAX_CONCURRENCY` | 5 | Concurrent tasks per runner |
| `N8N_RUNNERS_MAX_OLD_SPACE_SIZE` | Node.js default | Heap size in MB for the runner process |
| `N8N_RUNNERS_MAX_PAYLOAD` | 1 073 741 824 bytes | Largest payload exchanged between n8n and a runner |
| `N8N_RUNNERS_HEARTBEAT_INTERVAL` | 30 seconds | Missed heartbeats stop the task and restart the runner |

Raising the timeout is rarely the right first move. A Code node that needs more than five minutes is usually doing work that belongs elsewhere: thousands of synchronous string concatenations, a nested loop over two large arrays, or a request loop that should be an HTTP Request node with pagination. Three changes fix most cases. Process in batches with the Loop Over Items node so each Code run sees a bounded slice. Build lookups with a `Map` instead of calling `find()` inside a loop, which turns quadratic work into linear work. And return only the fields the next node needs, because every byte of output is serialised, stored with the execution and sent back to the main process.

If you must raise limits, change them together: a longer `N8N_RUNNERS_TASK_TIMEOUT` is pointless when the heap is too small for the data, and a larger heap is wasted when `N8N_RUNNERS_TASK_REQUEST_TIMEOUT` expires because all five concurrent slots are busy. On n8n Cloud none of these values can be changed, so batching is the only lever.

## Python in the Code node after n8n 2.0

Python support changed completely in n8n 2.0. The old Pyodide runtime, which compiled CPython to WebAssembly inside the editor and was noticeably slower than JavaScript, has been removed. Native Python now runs through task runners, available since n8n 1.111.0 and stable in n8n 2. The practical differences matter when you port old snippets:

| Behaviour | Pyodide (removed in 2.0) | Native Python (n8n 2) |
|---|---|---|
| Input variables | `_input.all()`, `_input.item`, `_json` and most built ins | Only `_items` in all items mode and `_item` in each item mode |
| Field access | Dot access such as `item.json.name` worked | Bracket access only: `item["json"]["name"]` |
| Imports on n8n Cloud | Pyodide bundled packages | No imports at all, standard library included |
| Imports on self hosted | Pyodide bundled packages | Modules allowlisted with `N8N_RUNNERS_STDLIB_ALLOW` and `N8N_RUNNERS_EXTERNAL_ALLOW`, and third party packages must exist in the runner image |
| Denied built ins | None | `eval`, `exec`, `open`, `type`, `getattr` and others by default, configurable with `N8N_RUNNERS_BUILTINS_DENY` |
| Binary buffer helper | Not available | Not available |

A per item transform in native Python returns one dictionary:

```python
total = _item["json"]["amount"] * 1.17
return {"json": {**_item["json"], "totalWithTax": round(total, 2)}}
```

And an all items transform returns a list of dictionaries:

```python
return [
    {"json": {"id": item["json"]["id"], "email": item["json"]["email"].lower()}}
    for item in _items
    if item["json"]["status"] == "active"
]
```

Note what is missing compared with JavaScript: there is no `pairedItem` convenience in these examples because native Python exposes only `_items` and `_item`, so a Python node that changes the item count will break `.item` references downstream. Put such reshaping in a JavaScript Code node when later nodes depend on item links, and keep Python for computation. `print()` output goes to the browser console during manual runs, the same place as `console.log`.

## Debugging a Code node without guessing

**Use the input and output panes first.** The Code node's output pane shows exactly what n8n accepted, including the wrapped `json` key, and the item linking hint when links are missing. Most "it returns the wrong thing" reports are solved by comparing the pane with the table of return values above.

**`console.log()` prints to the browser console on manual runs.** Open the browser developer tools, run the node, and the values appear there. They are not stored with the execution, so for production debugging write the value into the output instead, for example `json: { ...result, debug: { inputCount: items.length } }`, and remove it once the workflow is stable.

**Pin realistic input.** Pin the output of the node before the Code node so each test run uses the same items, then add an edge case item: an empty string, a missing field, a `null`, a number stored as a string. Code that survives those four in the editor rarely fails in production.

**Throw early with context.** `throw new Error(...)` with the offending value in the message turns a vague failure into a precise execution log entry, and the workflow's error handling, such as an Error Trigger workflow, receives it.

**Keep the Code node small.** If a node grows past a screen of code, split it: one node to normalise input, one to compute, one to shape output. Each boundary becomes a place where n8n shows you real data.

## A checklist before you leave the Code node

- The mode matches the job: all items for filtering, aggregating, splitting and joining; each item for simple per item transforms.
- Every code path returns the right shape: an array of `{ json }` objects in all items mode, one object in each item mode, `null` only when dropping is intended.
- `json` is always a plain object; arrays and scalars live under a named key.
- Nothing sits beside `json`, `binary` and `pairedItem` at the top level of an item.
- `pairedItem` is set whenever the output count or order differs from the input.
- Dates use Luxon's native methods such as `toFormat()` and `plus({ days: 1 })`, and are returned as strings.
- Modules are allowlisted on self hosted instances and avoided on Cloud beyond `crypto` and `moment`.
- Authenticated HTTP calls live in an HTTP Request node, and files move through binary helpers or file nodes.
- The node finishes well inside the task timeout with realistic data volumes.

## Frequently Asked Questions

### Why does n8n say Code doesn't return items properly?

In Run Once for All Items mode the node must return an array of objects, and each object's json key must point to an object. The message appears when the return value is not an object at all, such as a string, a number or nothing because a code path has no return statement, or when the array contains elements that are not objects, such as a list of plain strings. Wrap each value in an object under json and make sure every branch of the code returns.

### How do I return an array from the n8n Code node?

Return an array of items rather than an array of raw values. If each value should become its own item, map the values to objects such as json with an email field. If the next node needs the whole list at once, return one item whose json contains a named key holding the array. A bare array of strings or numbers is rejected because n8n requires every element to be an item object.

### Can the n8n Code node take multiple inputs?

The node has one input connection, but code can read any earlier node by name with the all, first, last and itemMatching methods, which lets you join two sources inside one node as long as both nodes already ran in the same execution. The alternative is a Merge node before the Code node, using Append to concatenate items or Combine to join them by a matching field.

### Why is my Code node slow or timing out?

In n8n 2 the Code node runs in a task runner with a default task timeout of 300 seconds and a default heap size chosen by Node.js, so very large inputs, nested loops over big arrays and large string building hit those limits first. Process data in batches with the Loop Over Items node, build a Map for lookups instead of searching inside a loop, and return only the fields the next node needs. Self hosted instances can raise the runner timeout and heap variables, while n8n Cloud cannot change them.

### Can I use Python packages in the n8n Code node?

On n8n Cloud the native Python option cannot import any module, including the standard library. On a self hosted instance you can allowlist standard library modules and third party packages with the task runner environment variables, and third party packages must also be installed in the runner image. Native Python only exposes the items and item variables, uses bracket access for fields, and does not provide the binary buffer helper that JavaScript has.

## Verification Notes

The return value and error tables were checked on 6 November 2026 by executing each listed return value through a JavaScript port of the validation functions in n8n's published Code node source (`result-validation.ts` in the `nodes-base` package), which define the messages quoted in this article. The JavaScript examples were executed in Node.js 24 against the three item sample above with an emulation of `$input`, `$()`, `$json`, `$now` and the binary helpers, and the Python examples were executed with CPython against the same sample. These checks confirm the logic and output shapes; they are not a substitute for running the nodes in your own n8n instance, and they do not exercise n8n's task runner process, Cloud limits or the editor. Environment variable names, defaults and mode behaviour come from the official documentation linked below, as published for n8n 2.46.

## Sources and Further Reading

- n8n Docs: [Code node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code) (modes, supported features, external libraries, Python)
- n8n Docs: [Code node common issues](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/common-issues)
- n8n Docs: [Understand n8n's data structure](https://docs.n8n.io/build/work-with-data/understand-n8ns-data-structure)
- n8n Docs: [Reference previous nodes](https://docs.n8n.io/build/work-with-data/reference-data/reference-previous-nodes) (which methods are available in the Code node)
- n8n Docs: [Preserving linking in the Code node](https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/preserving-linking-in-the-code-node)
- n8n Docs: [Item linking errors](https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/item-linking-errors)
- n8n Docs: [Use built-in shortcuts](https://docs.n8n.io/build/code-in-n8n/use-built-in-shortcuts) (Luxon behaviour in the Code node)
- n8n Docs: [Get the binary data buffer](https://docs.n8n.io/build/code-in-n8n/cookbook/code-node/get-the-binary-data-buffer)
- n8n Docs: [Enable modules in Code node](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/configuration-examples/enable-modules-in-code-node)
- n8n Docs: [Task runners environment variables](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/task-runners)
- n8n source: [Code node result validation](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Code/result-validation.ts)
- npm registry: [n8n latest release metadata](https://registry.npmjs.org/n8n/latest) (version 2.46.6 at the time of writing)
- Cover photo: [Daniil Komov on Pexels](https://www.pexels.com/photo/focused-coding-session-with-laptop-and-coffee-34803969/); inline photo: [cottonbro studio on Pexels](https://www.pexels.com/photo/person-typing-on-laptop-5473892/). Both are illustrative photographs under the Pexels licence, not n8n screenshots.
