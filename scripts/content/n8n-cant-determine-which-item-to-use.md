**If n8n says "Can't determine which item to use," check the relationship between your current item and the earlier node you are referencing.** Use `$json` when the field is already on the current input. When you create new items in a Code node, preserve their input positions with `pairedItem`. When a result genuinely combines several records, choose an explicit collection or matching rule instead of asking `.item` for one unspecified record.

Do not replace every `.item` with `.first()`. That can remove the error while selecting the wrong customer, email address or order. A green execution is not evidence that the records match.

This guide works through that distinction with three fictional customers. You can copy the examples into an isolated workflow without credentials, API calls or an email node.

**Verification note:** We checked the JavaScript transformations and linked-item lookups against the real `n8n-workflow` 2.16.0 library on Node.js 24.12.0, using synthetic execution data. That is the library version, not an n8n application version. This was not a live n8n Cloud, task-runner or connector test. Interface wording and error messages can vary between releases; the official documentation was checked on October 30, 2026.

## Start with the exact error, not a universal workaround

Open the failing field, identify the referenced node, and inspect the relevant execution. The editor's "execute node for more info" preview can be less specific than the execution details.

Before experimenting, duplicate the workflow and disconnect email, CRM writes, payments and other external actions. End the diagnostic path with Edit Fields or a Code node that returns data. Do not rerun a production workflow just to make its preview turn green.

| What you see | What to investigate | Appropriate next move |
| --- | --- | --- |
| "Can't determine which item to use" or "execute node for more info" | The preview cannot establish a single linked record in its current context | Inspect the execution and use the more specific rows below |
| "Info for expression missing from previous node" or unavailable paired-item data | An intermediate output lacks usable ancestry information | Find the first transformation that creates or replaces items; correct its `pairedItem` metadata |
| "Multiple matching items for expression" | One current item traces to several distinct records in the referenced node | Use the combined data, an explicit list, or a unique business-key match |
| "Node is on another branch" | The referenced node is upstream, but this particular item did not come from it | Review the branch relationship and Merge mode; do not invent a link |
| "Referenced node is unexecuted" or "hasn't been executed" | That node has no execution data on this path | Correct the execution path or handle the optional branch explicitly |

The last case is not fixed by pairing metadata. `.first()` cannot create execution data for a node that did not run. Likewise, a missing `email` field on an otherwise valid item is a field-selection problem, not automatically an item-linking problem.

n8n's [item-linking error reference](https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/item-linking-errors) separates missing information, multiple matches and branch mismatches. Diagnose those conditions separately.

## Understand the difference between .item, .first() and $json

There are three different questions you can ask about a record:

- **Current input:** What data reached this node on this item?
- **Ancestry:** Which earlier record produced this item?
- **Position:** What occupies slot zero, one or two in another node's output?

They sometimes return the same value in a tiny test. They are not the same operation.

| Reference | What it selects | Use it when |
| --- | --- | --- |
| `$json.email` | The current input item's email in a node expression | The required field already travels with this item |
| `$('Customers').item.json.email` | The linked customer that produced this item | There is one unambiguous ancestry path to that customer |
| `$('Settings').first().json.region` | The first record in the selected Settings output | One shared configuration record is intentionally used for every item |
| `$('Customers').all()[0].json.email` | Position zero in that output | Position zero is deliberately the record you want |
| `$('Customers').itemMatching(inputIndex)` | The ancestor of a specified input position in the current Code node | Code processes several incoming items and must trace each separately |

`.all()` means the items in the selected node output and run. It is not a database search and does not automatically join records by customer ID. Its array index is zero based.

The official [previous-node reference](https://docs.n8n.io/build/work-with-data/reference-data/reference-previous-nodes) documents these selectors, including optional output and run indexes. If node names differ in your workflow, change the quoted names in the examples to match them exactly.

## Reproduce the wrong-customer problem with three records

Use a new manual workflow with three Code nodes in sequence:

```text
Manual Trigger -> Customers -> Active Customers -> Inspect
```

Set each Code node below to **JavaScript** and **Run Once for All Items**. Copy each block into the named node's code editor, without wrapping the block in expression braces. These snippets use n8n helpers; they are not standalone browser-console scripts.

### Create three fictional customers

Name the first Code node **Customers**:

```n8n
return [
  { json: { customerId: "C001", email: "ada@example.com", active: false, tickets: ["T10"] } },
  { json: { customerId: "C002", email: "bina@example.com", active: true, tickets: ["T20", "T21"] } },
  { json: { customerId: "C003", email: "cora@example.com", active: true, tickets: ["T30"] } }
];
```

These are three n8n items, not one item containing a `customers` array. That difference matters: item indexes refer to n8n items, not positions inside a nested JSON array.

### Filter without losing the input positions

Name the second node **Active Customers**:

```n8n
const inputs = $input.all();

return inputs
  .map((input, inputIndex) => ({ input, inputIndex }))
  .filter(({ input }) => input.json.active === true)
  .map(({ input, inputIndex }) => ({
    json: { customerId: input.json.customerId },
    pairedItem: { item: inputIndex }
  }));
```

This deliberately returns a smaller JSON object so the next node has to retrieve the email from Customers. It also records the input index **before** filtering.

The result contains C002 and C003. Their output positions are now 0 and 1, but their original input positions were 1 and 2. The metadata preserves that distinction.

| Active Customers output position | Customer ID | `pairedItem.item` | Customers input record |
| --- | --- | --- | --- |
| 0 | C002 | 1 | Bina |
| 1 | C003 | 2 | Cora |

### Compare linked and positional results

Name the third node **Inspect**:

```n8n
return $input.all().map((input, inputIndex) => ({
  json: {
    currentCustomer: input.json.customerId,
    linkedCustomer: $("Customers").itemMatching(inputIndex).json.customerId,
    firstCustomer: $("Customers").first().json.customerId,
    positionalCustomer: $("Customers").all()[inputIndex].json.customerId
  },
  pairedItem: { item: inputIndex }
}));
```

Expected results:

| Current customer | Linked customer | `.first()` customer | Same-position customer |
| --- | --- | --- | --- |
| C002 | C002 | C001 | C001 |
| C003 | C003 | C001 | C002 |

All three lookups can produce valid-looking data. Only the linked lookup gives the matching customer in both rows.

**This is why testing with one item is insufficient.** With only one customer, the first item and the matching item are often indistinguishable. Filtering out the first customer exposes the mistake immediately.

## Fix 1: carry the required fields forward and use $json

If the current input already contains `customerId` and `email`, reference them directly in a node field:

```text
{{ $json.email }}
```

In the example, Active Customers intentionally dropped `email`. If your real workflow does not need to remove it, include that field in its output. You then avoid reaching back across the intervening nodes at all.

In Edit Fields, review **Include Other Input Fields**. Keeping the fields you need is useful; carrying an entire customer record into every downstream service is not. Preserve the identity and fields required for the next action, and leave unrelated personal data behind.

`$json` is not a repair for a field that is already missing. Inspect the input JSON first. If you need to reconstruct the field from an earlier node, use a valid link or an explicit unique-key join.

## Fix 2: preserve pairedItem when your Code node creates new items

`pairedItem` belongs beside `json` on the returned n8n item. Putting it inside `json` creates an ordinary data field; it does not establish ancestry.

For a standard single-input Code node, `{ item: inputIndex }` points to the input item at that position **in that Code node**. It is not a customer ID, an earlier node's arbitrary row number, or a global counter across a loop.

### Preserve pairing in a one-to-one transformation

For a Code node in Run Once for All Items mode:

```n8n
return $input.all().map((input, inputIndex) => ({
  ...input,
  json: {
    ...input.json,
    customerId: String(input.json.customerId).trim()
  },
  pairedItem: { item: inputIndex }
}));
```

The outer spread keeps other item properties, including binary metadata if present. The explicit final `pairedItem` records this node's immediate input relationship. If you construct a smaller output object instead, preserve any binary data your next node actually needs.

Not every Code node requires manual pairing. n8n can infer links in several cases, including a single input, and it can preserve relationships when original items are retained. Its [automatic linking rules](https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/how-items-link-through-workflows) also describe positional inference when counts match.

The risky case is rebuilding or reordering objects while assuming n8n will infer the relationship you intended. Equal item counts do not prove equal identities. Our reordered three-record test still produced the wrong customer when selection used position instead of explicit ancestry.

### The indexing mistake to avoid

This version is intentionally incorrect for the fixture:

```n8n
return $input.all()
  .filter(input => input.json.active === true)
  .map((input, outputIndex) => ({
    json: { customerId: input.json.customerId },
    pairedItem: { item: outputIndex }
  }));
```

The callback's index now describes the **filtered** array. C002 gets linked to input 0, which is C001. The metadata exists, so the resulting lookup may succeed while returning the wrong person.

Use the earlier Active Customers version: preserve the input index first, then filter or sort. That is different from adding a fresh sequence number after the transformation.

## Fix 3: use itemMatching correctly inside an all-items Code node

In a regular expression evaluated for an individual input item, `.item` asks for that item's linked ancestor. In an all-items Code node, your JavaScript loop needs to specify which current input item it is processing.

`itemMatching(inputIndex)` is designed for that job. Its argument is the position in **the current Code node's input**, not the position you hope to retrieve in Customers.

### Retrieve upstream fields inside a Code node

Connect this node after Active Customers, or use it instead of Inspect:

```n8n
return $input.all().map((input, inputIndex) => {
  const customer = $("Customers").itemMatching(inputIndex).json;

  if (customer.customerId !== input.json.customerId) {
    throw new Error("Customer identity mismatch; stop before any external action.");
  }

  return {
    json: {
      customerId: input.json.customerId,
      email: customer.email
    },
    pairedItem: { item: inputIndex }
  };
});
```

Expected output: C002 with `bina@example.com`, then C003 with `cora@example.com`. The identity check makes the relationship visible and stops this example if pairing resolves to the wrong customer. It assumes a unique, stable customer ID; adapt the invariant to your own data model.

With the filtered fixture, `itemMatching(0)` finds C002 and `itemMatching(1)` finds C003. Passing 2 because C003 used to be source index 2 is wrong: the current node has only two input positions, 0 and 1.

Also, `itemMatching()` follows existing links. It cannot reconstruct a link that a previous node discarded, and it cannot choose between several valid ancestors. Our engine checks confirmed both limitations.

For genuinely independent per-record logic, **Run Once for Each Item** can be simpler. In that mode, use the current item helpers and return one item object rather than the all-items array shown above. Changing the mode changes the code contract; do not paste an all-items loop unchanged into the per-item mode. See n8n's [Code node mode documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code).

## Fix 4: distinguish splitting from aggregation

Increasing or decreasing the number of items is not automatically an error. The important question is how many source records legitimately produced each output.

### Split a customer's tickets into separate items

Connect this Code node directly after Customers, in Run Once for All Items mode:

```n8n
return $input.all().flatMap((input, inputIndex) =>
  input.json.tickets.map(ticketId => ({
    json: {
      customerId: input.json.customerId,
      ticketId
    },
    pairedItem: { item: inputIndex }
  }))
);
```

The fixture yields T10, T20, T21 and T30. T20 and T21 both belong to C002, so both correctly point to input index 1. Repeating a source index is appropriate here: each ticket still has one customer.

The example assumes `tickets` is an array. If your source sometimes omits it, validate the field before splitting. Silently treating a malformed field as an empty array could drop work without reporting a problem.

### Represent a genuinely combined result

Now consider a summary of all three customers. This Code node also connects directly after Customers:

```n8n
const inputs = $input.all();

return [{
  json: {
    customerIds: inputs.map(input => input.json.customerId),
    customerCount: inputs.length
  },
  pairedItem: inputs.map((input, inputIndex) => ({ item: inputIndex }))
}];
```

The summary correctly has multiple ancestors. A downstream `$('Customers').item` cannot honestly answer "which customer" because three customers contributed. `itemMatching(0)` still starts from a summary with multiple ancestors; it is not a way around the ambiguity.

Use `$json.customerIds` for the collection. If the next action needs one customer, retain separate items or apply a documented selection rule. Assigning only `{ item: 0 }` to a combined result is not a semantic repair; it labels the result as if only the first customer contributed.

When an upstream node intentionally returns one shared configuration record, `.first()` is reasonable. Verify that invariant, and handle zero or unexpectedly multiple records before using it. A customer list is not a shared configuration record merely because the current test contains one customer.

## Fix 5: configure Merge around identity, not coincidental order

Merge is not inherently incompatible with item linking. Its mode changes what the output represents.

**Append** stacks the items from its inputs. It does not join a customer row and an order row into one object. An item originating from the first branch does not automatically acquire ancestry in the second branch.

**Combine by Position** combines matching positions. That can be valid for deliberately aligned streams, but a filter, sort, missing result or extra record can invalidate the alignment.

For a customer/order relationship, prefer an explicit key when that is the relationship you mean:

1. Make `customerId` available in both streams, with consistent values and types.
2. Choose **Mode: Combine**, then **Combine By: Matching Fields**.
3. Match `customerId` from Input 1 against `customerId` from Input 2.
4. Choose an output policy. **Keep Matches** drops unmatched rows; **Enrich Input 1** preserves Input 1 and adds matching Input 2 data.
5. Inspect duplicate keys, missing matches and same-named fields before using the output.

n8n's [Merge documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge) describes **Include All Matches** and **Include First Match Only**. These are business decisions, not harmless performance settings. Multiple matching orders may correctly create multiple output items. Keeping only the first match may silently discard orders you needed.

Clash handling matters too: a field such as `status` might describe the customer in one branch and the order in the other. Rename ambiguous fields or choose explicit clash handling so one meaning does not overwrite the other.

Check IDs as well as counts. Three rows matched to three rows can still be three wrong matches. Do not convert padded identifiers such as `00042` into numbers solely to make a join succeed.

## Check branches, loops and pinned data before blaming the code

If a reference works in one execution and fails in another, compare the path and run context as well as the JSON.

- **Skipped branch:** inspect whether the referenced node actually ran in this execution. Handle the optional branch deliberately, rather than assuming a fallback selector can run it.
- **Looped node:** one node can execute more than once. An explicit `.all(0, 0)` chooses a particular output and run; it does not mean "all iterations." A current array index is not a universal index across loop iterations.
- **Sub-workflow:** pass the fields and stable IDs the child needs as explicit input. A node name in the parent is not a substitute for a child-workflow input contract.
- **Pinned data:** compare a complete synthetic execution with the pin-based editor preview. Stale samples can hide missing fields or change item counts. n8n documents that [production executions ignore pinned data](https://docs.n8n.io/data/data-pinning/).

In current documentation, a cross-branch expression can resolve to `null` while the node succeeds and the editor displays the problem. Check the output values, not only red or green node status. Exact behavior depends on the expression context and release.

If the workflow never receives a request, that is earlier than item linking. Use the separate [n8n webhook troubleshooting guide](/blog/n8n-webhook-not-working-2026) for test URLs, published versions and routing. For the basics of items, nodes and expressions, start with the [n8n beginner guide](/blog/how-to-use-n8n-2026-complete-guide).

## Verify the repair before reconnecting external actions

Use distinctive synthetic records and write down the expected relationship before running the workflow.

1. Test at least three different IDs, not three copies of the same sample.
2. Remove the first input record and confirm the remaining records retain their identities.
3. Reverse the order and check IDs and emails again.
4. Test zero results and one result; decide whether the downstream action should run.
5. For splits, check that every child retains the correct parent ID.
6. For aggregation, confirm that the next node expects a collection rather than one arbitrary source record.
7. For joins, test unmatched and duplicate keys and review the resulting item count.
8. Compare the final destination fields with the intended source before reconnecting writes or messages.

The worked example's eight local engine checks covered correct filtering, wrong positional selection, missing pairing, incorrect post-filter indexes, reordering, `itemMatching` indexes, ambiguous ancestry and splitting. The Merge configuration guidance comes from the official documentation, not from an executed Merge-node benchmark.

For a saved execution sample, the [JSON formatter](/tools/json-formatter) can help inspect field names and nested arrays. Redact credentials and personal data first. Formatting JSON makes it easier to inspect; it does not recreate n8n's ancestry metadata.

**The acceptance test is "the intended record reaches the intended action," not "the expression stopped showing an error."**

## Frequently Asked Questions

### Why does first() fix the error but repeat the same customer?

It selects the first item from the chosen node output each time. It does not select the customer related to the current record. Use it only when that first record is intentionally shared. For individual customers, preserve the relationship or join using a unique customer ID.

### Where should pairedItem go in an n8n Code node?

Put pairedItem beside json on each returned item, not inside json. Its item value is the zero based position of the immediate input that produced that output. Preserve that position before filtering, sorting or building new objects.

### What is the difference between item and itemMatching?

The item property follows the relationship for the current input. The itemMatching method lets Code specify which current input position to start from. Both require a valid relationship and cannot choose between multiple different ancestors.

### Should I use first() after a Merge or Aggregate node?

Only if the first upstream record is genuinely the one you want. A combined result can have several valid ancestors. Use fields on the combined output, an explicit collection, or a unique key match instead of arbitrarily choosing one source record.

### Why does the workflow work with one item but fail with several?

One item hides the difference between the first record and the matching record. Several items reveal lost relationships, filtering, changed order and multiple possible ancestors. Test with distinct IDs and remove or reorder a record before trusting the repair.

## Sources and Further Reading

- [n8n: Item linking errors](https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/item-linking-errors).
- [n8n: Preserving linking in the Code node](https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/preserving-linking-in-the-code-node).
- [n8n: Accessing linked items in the Code node](https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/accessing-linked-items-in-the-code-node).
- [n8n: How items link through workflows](https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/how-items-link-through-workflows).
- [n8n: Reference previous nodes](https://docs.n8n.io/build/work-with-data/reference-data/reference-previous-nodes).
- [n8n: Code node modes](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code).
- [n8n: Merge modes, matching fields and clash handling](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge).
- [n8n: Data pinning](https://docs.n8n.io/data/data-pinning/).
- [n8n community: Why first and last are not always the right solution](https://community.n8n.io/t/how-to-solve-cant-determine-what-item-to-use/65663). Community discussion supplies problem context, not a guarantee for every version.
- [n8n-workflow 2.16.0](https://www.npmjs.com/package/n8n-workflow/v/2.16.0), the library used for the local expression checks.

Cover photograph: [Christina Morillo / Pexels](https://www.pexels.com/photo/woman-sitting-in-front-of-computer-1181676/), used under the [Pexels license](https://www.pexels.com/license/). It is an illustrative photograph, not an n8n interface screenshot. All customer records and example results above are fictional.