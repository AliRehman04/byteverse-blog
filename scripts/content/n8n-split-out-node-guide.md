**The n8n Split Out node turns a list inside one item into separate workflow items.** If an API returns one item containing 50 customers under `customers`, Split Out can produce 50 items, one per customer. It does not schedule those items, slow down API requests, parse a JSON string automatically, or join unrelated lists by ID. Those distinctions explain most cases where the node appears to lose fields, produce the wrong item count, or do nothing.

For a predictable starting configuration, enter the array's field name, choose **Selected Other Fields** for the parent information you need, and set a **Destination Field Name** such as `customer` or `line`. That gives each output item an explicit structure instead of relying on the node's different defaults for objects and primitive values.

This guide covers a complete order example, nested JSON, several arrays at once, empty and missing fields, binary attachments, item linking, and two Code node alternatives. The implementation details were checked against n8n **2.47.4**, including Split Out node versions **1 and 1.1**, on 12 November 2026. Node version and application version are different numbers; older imported workflows can keep an older node version. If you have not built a workflow yet, begin with the [n8n beginner guide](/blog/how-to-use-n8n-2026-complete-guide).

## First distinguish an array from a list of n8n items

There are two levels of lists that can look almost identical in the editor:

- **A list inside an item:** one item contains a property such as `rows: [...]`. Split Out expands this list.
- **The workflow's item list:** there are already several items, each with its own JSON object. Many n8n nodes process those items automatically. They do not need another Split Out just because the JSON view shows square brackets around the complete output.

For example, one item can have this JSON body:

```json
{
  "orderId": "ORD-1042",
  "customerEmail": "buyer@example.com",
  "rows": [
    { "sku": "A", "qty": 2 },
    { "sku": "B", "qty": 1 }
  ]
}
```

The input count is **one**, although `rows` contains two objects. The field to split is `rows`, not the complete JSON object and not the outer workflow item list. By contrast, if your upstream node already reports two items with `sku` and `qty` at the top level, splitting `rows` will not help: that property does not exist on either item.

Check the upstream node's actual **item count** and inspect one item's JSON before choosing a transformation. An HTTP Request configuration can change the response envelope, so do not assume every API result uses `data`, `body`, or `results`. Use the path you can actually see.

## A complete example: one order becomes two order lines

Build this small workflow before connecting it to a real spreadsheet or database:

1. Add a **Manual Trigger**.
2. Add **Edit Fields (Set)** in JSON Output mode and enter the order JSON above. The desired result is one item with `orderId`, `customerEmail`, and an array named `rows`.
3. Add **Split Out** and enter `rows` in **Fields To Split Out**. Some documentation or older interfaces label it **Field to Split Out**.
4. Set **Include** to **Selected Other Fields**.
5. In **Fields To Include**, enter `orderId, customerEmail`.
6. Under **Options**, set **Destination Field Name** to `line`.
7. Execute this test workflow and inspect the two output items before adding any node that writes data.

The following listing shows the JSON bodies of the two expected output items. It does not include n8n's internal `json` wrappers or item-link metadata:

```json
[
  {
    "orderId": "ORD-1042",
    "customerEmail": "buyer@example.com",
    "line": { "sku": "A", "qty": 2 }
  },
  {
    "orderId": "ORD-1042",
    "customerEmail": "buyer@example.com",
    "line": { "sku": "B", "qty": 1 }
  }
]
```

A later spreadsheet node can map the current item's values with `{{ $json.orderId }}`, `{{ $json.line.sku }}`, and `{{ $json.line.qty }}`. The customer and order fields repeat deliberately: each line is now independently identifiable.

**Acceptance check:** one input item, two output items, quantities 2 and 1, and the same order ID on both. If you receive one item, inspect the input type. If the order ID disappears, inspect Include. If the SKU expression becomes undefined, inspect where the destination placed the split value.

When a second input order has three rows, the node processes that order too, producing five output items in total. You do not need a loop merely to tell Split Out to handle the second input item.

## Fields To Split Out expects a name, not the array value

For the example above, the setting is the fixed text `rows`. For a nested response, it might be `body.data.rows`.

Do not normally put `{{ $json.rows }}` into this field: that expression evaluates to the array itself, while the parameter needs the name of the property to read. The current implementation also strips a leading `$json.` from a string path, but the simpler, documented pattern is to provide the path directly. There is no need to depend on that convenience behavior.

An expression can be appropriate when it returns a **field name**, such as `{{ $json.collectionField }}` when that value is the string `rows`. Check the resolved value carefully. A field-name parameter is a different contract from a parameter where an API expects the records themselves.

The input can contain more than one item with different data. Split Out evaluates its configuration for each input item. An array on one item does not prove that the same field exists on every other item.

## Include and Destination Field Name control the output shape

The default Include setting is **No Other Fields**. With one array of objects and no explicit destination, each object's own properties become the output JSON. That is why the simplest demonstrations show `$json.sku` after splitting but no longer show `$json.orderId`.

Using the first row of the order example, these settings produce different shapes:

| Include setting | Destination | First output item's relevant JSON |
|---|---|---|
| No Other Fields | Blank | `{"sku":"A","qty":2}` |
| No Other Fields | `line` | `{"line":{"sku":"A","qty":2}}` |
| All Other Fields | Blank | Parent fields plus `"rows":{"sku":"A","qty":2}` |
| Selected Other Fields: `orderId` | `line` | `{"orderId":"ORD-1042","line":{"sku":"A","qty":2}}` |

**All Other Fields** removes the original split field from the retained parent data and adds the current split result. It does not leave the original `rows` array alongside every child. Other arrays that you did not select for splitting can still be copied into every output item.

**Selected Other Fields** is usually the safer choice for integrations. Carry the order ID and the small set of fields the next node needs. Do not copy an entire customer profile, long API response, or unrelated attachment list merely because copying everything is convenient.

Avoid destination names that collide with important parent fields. A destination named `orderId` can replace the ID you intended to preserve. Also avoid listing the split field itself among selected parent fields: reintroducing the original array under the same name can overwrite the expanded value. A dedicated destination such as `line` avoids this ambiguity.

For arrays of primitive values, there are no child object properties to promote. Splitting `tags: ["red", "blue"]` with the defaults produces items containing `tags: "red"` and `tags: "blue"`. Set the destination to `tag` when you prefer `$json.tag` downstream.

![A woman taking notes beside a laptop displaying spreadsheet data](https://www.byteverse.fyi/blog/csv-excel/photo-cover.jpg "Illustrative photograph of a woman taking notes beside spreadsheet data, not a screenshot of n8n. Photo: Mikhail Nilov / Pexels.")

## Nested arrays need the correct path and sometimes two splits

Dot notation lets Split Out read an array inside ordinary nested objects. For this single input item:

```json
{
  "requestId": "REQ-17",
  "body": {
    "data": {
      "customers": [
        { "id": "C-10", "name": "Amina" },
        { "id": "C-11", "name": "Bilal" }
      ]
    }
  }
}
```

Use **Fields To Split Out** = `body.data.customers`, **Selected Other Fields** = `requestId`, and **Destination Field Name** = `customer`. The two output items then contain `requestId` and one `customer` each.

The path does not include the internal `json` wrapper. It also is not a wildcard traversal through every array in the object. If your shape is `orders: [{ orderId, lines: [...] }, ...]`, typing `orders.lines` does not mean "visit every order and split its lines". The intermediate `orders` value is itself a list.

### Split orders first, then their lines

For orders containing line arrays, use two explicit transformations:

1. Split `orders` into the destination `order`.
2. In Edit Fields, create a top-level `orderId` from `{{ $json.order.orderId }}` while retaining the `order` object for the next step.
3. Split `order.lines` into the destination `line`, keeping `orderId` with **Selected Other Fields**.

Suppose the first order has two lines and the second has three. After the first Split Out you should have two items; after the second, five. Those counts are useful checkpoints. You are expanding the parent-child hierarchy, not making every line belong to every order.

If an order has no lines, decide whether it should appear in an exception branch or a separate order-level output. Do not discover at the final spreadsheet that an empty child collection caused the parent to produce no line items.

### Literal dots in property names

An object can contain a literal key named `customer.tags` rather than a nested `customer` object. Turn on **Disable Dot Notation** to address that key explicitly. Inspect the JSON view: the labels can look similar in a table.

The tagged implementation uses Lodash path lookup. When both a literal dotted key and a corresponding nested path exist, direct-key lookup can take precedence. Avoid that ambiguous input shape or rename the key upstream. Do not use the visual presence of a dot as proof that the data is nested.

### Nested destinations differ between node versions

With Split Out **node version 1.1**, an explicit destination such as `record.customer` creates a nested object when dot notation is enabled. Version 1 treats the same destination as a literal key containing a dot. Turning on Disable Dot Notation also keeps the destination literal.

Source paths and output paths are separate concerns. In particular, selecting a parent field such as `account.id` does not necessarily rebuild an `account` object in the output: the selected-field assignment uses that field name as a key. Creating a top-level `accountId` upstream is often easier to map and audit.

For the most portable configuration, use simple destination names like `customer` or `line`, then shape the final nested request in Edit Fields. The [JSON request-body guide](/blog/n8n-json-parameter-needs-to-be-valid-json) covers the separate problem of sending those objects as valid JSON.

## Splitting several fields pairs values by position

Fields To Split Out accepts a comma-separated list such as `names, scores`. This performs a positional expansion **inside each input item**.

Consider this input:

```json
{
  "names": ["Amina", "Bilal"],
  "scores": [91, 82, 70]
}
```

The output JSON bodies are:

```json
[
  { "names": "Amina", "scores": 91 },
  { "names": "Bilal", "scores": 82 },
  { "scores": 70 }
]
```

The node produces three items, the length of the longest selected list. It does not produce six combinations, and the unmatched last score does not acquire a made-up name. An empty selected array also does not necessarily make the whole item disappear if another selected array has elements.

Only use this mode when index positions are a real relationship. Two API queries can return different record orders, omit different entries, or change their sorting independently. Matching the first name to the first score would then be a data error even if the workflow runs successfully. Join by a stable identifier with an appropriate Merge configuration, or construct the correct records before splitting.

To rename several split fields, provide the same number of comma-separated destination names in the same order. For `names, scores`, use `person, score`, not just `person`. A mismatched number of destinations raises: **"If multiple fields to split out are given, the same number of destination fields must be given"**.

Two successive Split Out nodes are different from one node with two field names. If you split a two-element list, keep an unrelated three-element list on each output, then split that second list, you can get six items. That is a cross product introduced by the workflow structure. It is not the behavior of the single multi-field Split Out above.

## Empty arrays, missing fields, nulls and objects are different inputs

Split Out is a transformation, not a strict array validator. Its permissive behavior is useful, but it can hide an upstream data-type mistake.

This table assumes one selected field called `rows`, No Other Fields, and no destination:

| Value of `rows` | Result | What to check |
|---|---|---|
| `[{"sku":"A"},{"sku":"B"}]` | Two items with `sku` at the top level | Normal object-array expansion |
| `["red","blue"]` | Two items containing a scalar `rows` field | Use a singular destination if preferred |
| `[]` | Zero output items for that parent | Decide how to handle an empty collection |
| Field is absent | Zero output items for that parent | Verify spelling, case, and the actual input path |
| `null` | One item containing `rows: null` | Null is not an empty array |
| `"[1,2]"` | One item containing the original string | Parse and validate the JSON text first |
| `{"a":"red","b":"blue"}` | Two items containing the values, without keys `a` and `b` | Object keys are lost unless you preserve them explicitly |

The source tracks missing fields and can add an execution hint if a selected field was not found on any input item. It does not simply throw a missing-field exception for every affected row. A field found on one input can therefore coexist with missing data on other inputs. Validate important input contracts yourself.

When all outputs are empty, there are normally no items for the following node to process. An order with no line items is not the same as a failed order, and neither is the same as a malformed API response. Put an If or Filter decision before the split when those cases need different outcomes. Keep an order-level audit branch if every parent must remain accounted for.

Do not use the output item count as your only correctness check. Three objects with missing customer IDs can be just as wrong as zero objects. Check required fields, types, and identifiers on representative outputs too.

## Parse a JSON string before splitting it

An API or earlier Code node may produce `rows` as serialized text. Strings that look like JSON are still strings; Split Out does not call `JSON.parse()` on them.

Put this JavaScript in a **Code** node set to **Run Once for All Items** before Split Out. It handles every incoming item, preserves binary data when present, and refuses values that do not become arrays:

```mjs
return $input.all().map((item, inputIndex) => {
  let rows = item.json.rows;

  if (typeof rows === "string") {
    try {
      rows = JSON.parse(rows);
    } catch {
      throw new Error(`Input ${inputIndex}: rows is not valid JSON`);
    }
  }

  if (!Array.isArray(rows)) {
    throw new Error(`Input ${inputIndex}: rows must be an array`);
  }

  return {
    json: { ...item.json, rows },
    ...(item.binary ? { binary: item.binary } : {}),
    pairedItem: { item: inputIndex },
  };
});
```

Then split the field `rows` normally. This is intentionally strict: malformed text, null, and an object produce an explicit error. An empty array remains empty, allowing you to route it separately before expansion. Do not use `raw.split(",")` for JSON arrays; commas inside quoted text and nested structures make that unsafe.

This snippet does not recursively flatten arrays or guarantee that every element is an object. If the next node requires customer objects with an `id`, validate that requirement too. Parsing syntax, checking the outer type, and validating each record are three separate jobs.

## Preserve object keys with a Code node

Sometimes the response is a lookup object rather than an array:

```json
{
  "customers": {
    "C-10": { "name": "Amina" },
    "C-11": { "name": "Bilal" }
  }
}
```

Splitting `customers` directly uses the object's values. You can receive the names but lose `C-10` and `C-11`, because the IDs are keys, not properties of the customer records. If those keys matter, use **Run Once for All Items** with this alternative instead of Split Out:

```mjs
const output = [];

for (const [inputIndex, item] of $input.all().entries()) {
  const customers = item.json.customers;
  if (customers === null || typeof customers !== "object" || Array.isArray(customers)) {
    throw new Error(`Input ${inputIndex}: customers must be an object`);
  }

  for (const [customerId, customer] of Object.entries(customers)) {
    if (customer === null || typeof customer !== "object" || Array.isArray(customer)) {
      throw new Error(`Input ${inputIndex}: customer ${customerId} must be an object`);
    }

    output.push({
      json: { customerId, customer },
      pairedItem: { item: inputIndex },
    });
  }
}

return output;
```

The result has a `customerId` alongside each `customer` object. The identifier cannot be silently replaced by an `id` property inside that object, because it occupies its own field. Add only the parent fields you need to the returned `json` object. For more transformations and the difference between Code node modes, see the [Code node guide](/blog/n8n-code-node-guide).

## Split Out versus Loop Over Items, Aggregate and Code

These nodes solve different problems:

| Need | Appropriate operation | Why |
|---|---|---|
| One item contains an array of 100 records | Split Out | Changes the array into 100 workflow items |
| Already have 100 items and need batches of 10 | Loop Over Items | Controls which existing items enter each loop iteration |
| Need a pause between batches | Loop Over Items with a wait, or supported node batching options | Split Out itself does not control rate or timing |
| Need one list again after processing many items | Aggregate | Collects item data into an aggregate output |
| Need object keys, custom validation, or bespoke relationships | Code | Makes the conversion rule explicit |

There is an important trap: one item with an array of 100 records entering Loop Over Items at Batch Size 1 is still **one item**. The batch-size setting does not look inside `rows`. Split that list first if your downstream nodes need one record per item.

Conversely, do not add a loop automatically after every Split Out. Many n8n nodes already process all input items. A loop is useful when you need explicit batching, a repeated control-flow path, or a node with different item-processing behavior. It is not required merely because more than one item exists. The [Loop Over Items guide](/blog/n8n-loop-over-items-guide) covers its loop and done outputs separately.

Aggregate is not a guaranteed inverse that restores the complete original input. You must retain the parent identifiers, grouping information, and any order information your application needs. Combining all lines into one array after processing orders does not automatically reconstruct an array per original order.

## Binary files: split attachments, not the JSON metadata

n8n stores binary attachments under an item's `binary` property, separate from `json`. An item can therefore contain one JSON object and several binary fields such as `invoice` and `receipt`.

In **Fields To Split Out**, enter the special value **`$binary`**. For the common case of one item with two attachments, Split Out produces two items, each holding one binary field. Choose Selected Other Fields or All Other Fields when each output also needs an order ID or email subject.

The binary property names are retained. The first output might have `$binary.invoice`, while the next has `$binary.receipt`. A downstream upload or extraction node that always expects a field named `data` can therefore fail on both, even though the files are present.

When the next node accepts an expression for its input binary field, and you have verified that each item contains exactly one attachment, this expression obtains its name:

```txt
{{ Object.keys($binary)[0] }}
```

Alternatively, normalize the binary property name explicitly before that node. Do not apply the expression to items with no binary data or assume the first field is the right attachment when several remain.

**Include Binary** is a different option. When you split a JSON array, enabling it can carry the input's binary data onto every resulting item. It does not automatically allocate attachment one to row one and attachment two to row two. If the later node sends an email or uploads a file per item, repeating the full binary collection can repeat external actions unintentionally.

The `$binary` branch separates existing file entries; it does not parse a PDF into pages or a CSV file into rows. Use a file-extraction operation first when the collection you need is inside a file. Then inspect whether that operation already returned separate items before adding another split.

## Keep item linking and parent identifiers intact

In the checked implementation, Split Out assigns each child a `pairedItem` link to the input item it came from. Two lines from the first order point back to input item 0; lines from the next order point to input item 1. This is metadata outside `json`, and it is separate from carrying `orderId` as an ordinary field.

The pairing helps n8n resolve linked references to earlier nodes. It is not a substitute for an order ID in a spreadsheet, database row, exported file, or separate workflow execution. Carry the business identifier explicitly for those destinations.

The reverse direction can be ambiguous: after a later merge, aggregation, or custom Code node, one item may relate to more than one earlier item. Replacing `.item` with `.first()` without understanding that relationship can select the first customer's data for everyone. Use the actual current item, preserve pairing in custom transformations, and choose a deterministic lookup when there are multiple legitimate matches. The [item-linking troubleshooting guide](/blog/n8n-cant-determine-which-item-to-use) explains that distinction.

Both Code examples above set `pairedItem` because they construct new items. In an all-items transformation, mapping only `$input.first()` would ignore other parents. That shortcut is acceptable only when your workflow deliberately guarantees one input item.

## Troubleshoot Split Out without guessing

Start with the exact input item and the actual output, not the field names in an old screenshot.

| Symptom | Likely explanation | Next check |
|---|---|---|
| No output items | Empty array, missing field, or wrong path | Confirm item count, field spelling and JSON nesting |
| One output item still contains bracketed text | The input is a JSON string, not an array | Parse and validate it before splitting |
| Parent IDs or email fields vanished | No Other Fields was selected | Select the parent fields you need |
| `$json.sku` is undefined | The value is now under a destination such as `line` | Inspect output and map `$json.line.sku` |
| Nested list did not expand | An array exists between the object and the target field | Split the outer array before the inner one |
| Different output count than expected | Multiple arrays align by index, or a second split multiplied retained lists | Calculate counts at every expansion |
| Two fields cannot use one destination | Number of destination names does not match split fields | Provide one destination per split field |
| Selected Other Fields reports "No fields specified" | Fields To Include is blank while output items are being constructed | Enter a field or choose another Include mode |
| A literal dotted key behaves unexpectedly | Path lookup and literal names are being mixed | Use Disable Dot Notation or normalize names upstream |
| Downstream upload says the file is missing | It expects `data`, but the actual binary key is different | Inspect each output item's binary tab |

For incorrect pairings, compare a real identifier on two different parent records. Repeated parent data can look plausible in a large table while being attached to the wrong child. Testing only one order will never expose that mistake.

Run the minimum reproduction with synthetic input first. Keep external write nodes disconnected until the item count, IDs, field paths and binary mapping match your expectation. A green execution means the configured operations completed; it does not prove that the records were associated correctly.

## Large arrays and the cost of copying parent data

Split Out expands a collection already present in the input. It does not implement API pagination, fetch additional pages, stream an unlimited response, or reduce the amount of data an earlier node already returned.

For one selected array, the output count is the sum of its lengths across parent items. For several selected lists in one Split Out, each parent contributes up to the longest selected list. These are useful planning rules only after you have validated the input types; a string or plain object follows the different rules shown earlier.

Suppose an API envelope contains a small customer list alongside a large `debugDump`. All Other Fields can repeat that unrelated dump on every expanded item. Use Selected Other Fields or remove unnecessary fields before expansion. Keep binary data out of repeated JSON-row work unless each row genuinely needs it.

Splitting 10,000 rows and then using Loop Over Items does not undo the initial expansion or erase upstream execution data. For large jobs, prefer bounded API pages, small batches, and storage appropriate to the workflow. Measure execution data and memory on your own deployment; the examples here are correctness checks, not throughput benchmarks.

Before enabling production writes, verify these cases: two distinct parent IDs, an empty array, a missing field, malformed serialized JSON, and a response whose envelope changed. Those tests protect the actual workflow far better than assuming every response will resemble the first successful API call.

## Frequently Asked Questions

### What does the Split Out node do in n8n?

It turns a list stored inside an input item into separate output items. One input item containing an array of five records can become five workflow items. It can preserve selected parent fields and place each value under a destination name. It does not schedule requests or automatically parse text that merely looks like a JSON array.

### What is the difference between Split Out and Loop Over Items?

Split Out changes data shape by expanding a list inside an item. Loop Over Items works with the items that already exist and sends a chosen number through each iteration. An item containing 100 records is still one item until you expand its internal list. Many nodes already handle multiple items without an explicit loop.

### How do I split a nested JSON array and keep the parent ID?

Enter the path to the array, select the parent ID in Fields To Include, and give the child a clear destination name. If another array exists in the middle of the path, split that outer array first. Creating a simple parent ID field before the next split makes the output easier to map and check.

### Why does Split Out return no items or just one item?

An empty array or missing field produces no items for that parent when it is the only selected field. A JSON string remains one string instead of being parsed, and null becomes one value rather than an empty array. Inspect the actual field type and path. Parse serialized JSON and validate it as an array before splitting.

### Can Split Out separate binary files in n8n?

Yes. The special field value $binary separates the binary entries on an item into individual items. The attachment names are retained, so the next node must use the correct binary property name. Include Binary is a separate option that can copy the input attachments while splitting a JSON list; it is not the same as separating the files.

## Verification Notes

Behavior was checked on 12 November 2026 against the tagged n8n 2.47.4 Split Out implementation, including node versions 1 and 1.1. The source-backed tests execute its actual TypeScript-transpiled execute method with synthetic node input, a mocked node context, a small field-list parser and a mocked hint tracker, using the real Lodash path helpers. They cover field retention, parent pairing, primitive and object values, empty and missing arrays, positional multi-field splitting, destination paths and binary attachments. The missing-field hint behavior was inspected in the accompanying source.

The article's two Code node snippets are tested separately with emulated n8n inputs, and its displayed JSON and expressions are checked directly. These checks are not a substitute for running the workflows in your own instance. They do not execute a production n8n server, a spreadsheet connector, an upload, or a real API request, and they are not performance benchmarks.

## Sources and Further Reading

- n8n Docs: [Split Out parameters and options](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitout).
- n8n Docs: [Understand n8n's data structure](https://docs.n8n.io/build/work-with-data/understand-n8ns-data-structure).
- n8n Docs: [Loop Over Items and when a loop is necessary](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches).
- n8n source, pinned to 2.47.4: [SplitOut.node.ts](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/nodes-base/nodes/Transform/SplitOut/SplitOut.node.ts).
- n8n source, pinned to 2.47.4: [Split Out field tracking and hints](https://github.com/n8n-io/n8n/blob/n8n%402.47.4/packages/nodes-base/nodes/Transform/SplitOut/utils.ts).
- Cover photograph: [Artem Podrez on Pexels](https://www.pexels.com/photo/a-person-writing-on-a-paper-with-graph-6779570/). Inline photograph: [Mikhail Nilov on Pexels](https://www.pexels.com/photo/woman-looking-at-the-screen-of-her-laptop-8297058/). Both are illustrative photographs under the Pexels licence, not n8n screenshots.