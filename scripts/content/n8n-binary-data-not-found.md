If **n8n says binary data was not found**, open the failed node's **Input** and inspect the **specific item named in the error**. Check whether that item contains a binary file, then match the node's file-field setting to the exact binary property name. A file visible in an earlier node—or on a different input item—is not proof that the failing operation can read it.

For example, if the input contains a binary property named `attachment_0`, an **Input Binary Field** set to `data` points at the wrong place. For a parameter that expects a field name, enter `attachment_0`, not the file's display name, the whole binary object, or its encoded contents.

If no binary property reaches the failing item, changing that field name will not create a file. Trace the input backward until you find where the file was never downloaded, was removed, or went down another branch.

## Start with the failing item, not the whole workflow

A common error reads:

> This operation expects the node's input data to contain a binary file 'data', but none was found [item 0]

The useful clues are the **requested property** (`data`) and the **item index** (`0`, the first item). Do not stop at “a binary file appears somewhere in the execution.” Inspect the input of the node that actually failed.

Before changing anything, record the node and operation, item index, requested property and available binary properties. Use a disposable copy of the workflow with harmless test data. Disconnect delivery nodes that could send messages, create records or upload files while debugging.

| What the failed node receives | Likely problem | First useful check |
| --- | --- | --- |
| Binary file exists, but under another key | Name mismatch | Match the file-field setting to that exact key |
| JSON contains a URL, filename or extracted text only | No file in this input item | Download, generate or route the intended file |
| Binary exists upstream but disappears after a transformation | File was omitted from output | Inspect the first node where the binary property disappears |
| One input item has the file, another does not | Item or branch mismatch | Inspect every relevant item and the merge relationship |
| Requested field is shown as `[object Object]` | An object reached a name-only parameter | Supply the property name rather than the object |
| Correct descriptor exists, but reading it fails | Different class of error: unavailable bytes or invalid file | Check a fresh source read and storage or format evidence |

This guide covers the common file-field workflow. Individual integrations and node versions can expose different selectors. Read the selected operation's help instead of assuming every file input accepts the same expression.

## Understand the three names that can look like the same thing

n8n passes arrays of items between nodes. An item can contain ordinary structured fields under `json` and file descriptors under `binary`, as explained in the [official data-structure guide](https://docs.n8n.io/data/data-structure/).

Keep these three concepts separate:

- **Binary property name:** a key such as `attachment_0`, used to locate the file on an item.
- **Filename:** the file's metadata, such as a name ending in TXT or PDF. Changing it does not necessarily change the binary property name.
- **JSON field:** a value such as a download URL, invoice number or extracted text. It is not automatically an n8n binary file.

The descriptor's internal `data` field is another layer, not a requirement that the outer binary property must be named `data`. Avoid manually rebuilding a descriptor from its displayed metadata when the existing file can be passed through intact.

If items, expressions and executions are unfamiliar, the [n8n beginner guide](/blog/how-to-use-n8n-2026-complete-guide) explains those foundations. For this error, the key question is narrower: **what file is attached to this exact input item?**

## Fix 1: match the exact binary property name

In **Extract From File**, the documented parameter is **Input Binary Field**, whose default is `data`. The [node documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.extractfromfile/) defines it as the name of the incoming field containing the binary file.

For an input whose Binary view shows `attachment_0`:

1. Select the failed item in the node's input view.
2. Confirm the binary key is `attachment_0`, including its spelling and case.
3. Enter `attachment_0` as the Input Binary Field.
4. Select the operation that matches the real file format.
5. Retry only the isolated test branch and inspect the result.

For this name-only parameter, `binary.attachment_0` is not the same key, and an expression returning the entire descriptor can become `[object Object]`. Do not repeatedly change expressions before checking what type of value the parameter expects.

If a newer integration offers a dedicated binary-value selector, follow that node's current documentation. That does not change the meaning of the documented name-only parameter above.

## Fix 2: make sure the upstream step actually returns a file

An API response can contain useful information without containing a file. Choose the next operation based on what was returned, not on a field named `file` or `data`.

### Downloading a file with HTTP Request

In the [HTTP Request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/), add the **Response** option and choose **Response Format → File** when the endpoint returns file bytes. Set **Put Output in Field** to a deliberate name, then use that same binary key downstream.

If the endpoint returns JSON containing a download URL, selecting File can save that JSON response as a file—it does not follow the URL inside the JSON and fetch the intended document. Use the provider's documented download operation or make the appropriate second request to the approved file URL.

Inspect the response status and actual content too. A login page saved with a PDF-looking filename is still a login page. Renaming it or changing its MIME type does not convert it into a PDF. Do not disable certificate validation or ignore all HTTP errors just to obtain a green node.

### Turning JSON, text or Base64 into a file

The [Convert to File node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.converttofile/) creates a file from input data. Examples include creating a CSV from structured rows, creating a text file from a string, or using **Move Base64 String to File** for an actual Base64-encoded file.

A URL is not Base64, and arbitrary JSON is not a PDF just because you assign a PDF extension. Choose the operation that matches the source representation, then inspect the generated binary key.

For webhook uploads, inspect the Webhook node's real output and the sender's request format. Raw-body uploads and multipart forms are different request shapes; there is no single Raw Body toggle setting that fixes every sender. If the request never starts an execution, use the separate [n8n webhook troubleshooting guide](/blog/n8n-webhook-not-working-2026) first. A delivery or registration failure happens before this missing-file diagnosis.

## Fix 3: find the transformation that dropped the file

Walk forward from the first node with a valid file and compare each node's input and output. The first boundary where the expected binary property disappears is more useful than the last node's error.

### Check Edit Fields without guessing its defaults

The current [Edit Fields documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/) lists **Include Binary Data** as an option controlling whether incoming binary data is included in the output. It also documents controls for which other input fields are retained.

Inspect the options exposed by the version of the node in your workflow, preserve the required binary data, execute that isolated step and check its output. Do not assume an older tutorial's checkbox label or a setting copied from another node means the same thing in your version.

### Use a temporary item-level diagnostic

If there are many items, the following is **JavaScript for an n8n Code node**, configured as **Run Once for All Items**. Change `expected` to the binary key you intend to consume. It uses the documented current-input method and reports property presence, not file contents.

```n8n
const expected = 'attachment_0';
const items = $input.all();

return items.map((item, index) => ({
  json: {
    itemIndex: index,
    binaryKeys: Object.keys(item.binary ?? {}),
    expectedKeyPresent: Object.hasOwn(item.binary ?? {}, expected),
  },
  pairedItem: { item: index },
}));
```

**Use this as a diagnostic endpoint on a test branch.** It intentionally returns only the audit information and does not forward the files. Putting it directly before an upload node would remove the binary data that upload needs. Binary key names can themselves contain sensitive labels; review the output before sharing it.

`expectedKeyPresent: true` proves only that the property exists. It does not prove that the referenced bytes are still readable, that the file is nonempty, or that its content matches its declared type.

### Preserve the item when adding ordinary fields

A Code node that constructs a fresh output with only `json` omits the sibling `binary` object. For a simple transformation that keeps the same items in the same order, this pattern adds a flag while retaining their existing files. Use **JavaScript → Run Once for All Items** for this snippet too:

```n8n
const items = $input.all();

for (const item of items) {
  item.json = { ...item.json, reviewed: true };
}

return items;
```

The [Code node documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/) explains the all-items mode and item-linking requirements. The example is deliberately limited: it does not filter, reorder, duplicate or combine items. If your transformation does those things, preserve the correct file-to-record relationship and handle item linking explicitly.

Do not attach the first input file to every output item just because that removes the error. A technically successful upload of the wrong person's document is not a successful fix.

## Fix 4: check Merge output one item at a time

The [Merge node's Append mode](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge/) outputs the items from each input one after another. It does not turn two separate items into one combined record.

Consider these fictional inputs:

| Input or output | JSON record | Has `attachment_0`? |
| --- | --- | --- |
| Input 1 | Record BV-101, status ready | No |
| Input 2 | Record BV-101, original file | Yes |
| Append output item 0 | Record BV-101, status ready | No |
| Append output item 1 | Record BV-101, original file | Yes |

The upload may fail on item 0 even though you can see a file on item 1. This example illustrates the documented Append behavior; it is not a claim that every Merge node causes missing binary data.

If two inputs describe the **same entity**, Combine by **Matching Fields** may be appropriate. Use an explicit stable key and verify unmatched items, duplicate matches and field clashes. If both matched records contain `attachment_0`, check which file survives rather than assuming both are retained. Combine by **Position** is appropriate only when the order and one-to-one relationship are actually guaranteed. Sorting or filtering one branch can invalidate that assumption.

If a file is optional, route items without it to an explicit no-file branch. Do not suppress errors and let those items reach a node that requires a file. If an item can have several attachments, define whether to process all of them or a specific one; do not assume every item uses the same suffix.

## Fix 5: separate the upload's form name from its binary key

HTTP multipart uploads have two names with different jobs. In HTTP Request, **Body Content Type → Form-Data**, add a parameter of type **n8n Binary File**:

- **Name** is the field the receiving API expects, such as `document`.
- **Input Data Field Name** is the n8n binary property holding the bytes, such as `attachment_0`.

These values can legitimately differ. Set each from its own source of truth: the receiving API's documentation and the current input item.

Also distinguish Form-Data from **Body Content Type → n8n Binary File**, which sends the file as the request body rather than as a multipart field. Choose the format the receiver requires. A remote 400 or 415 response after sending a request is not automatically the same problem as n8n being unable to find its input file.

## When the binary key exists but the file still cannot be read

Stop changing property names once you have confirmed that the correct key exists on the correct item. Read the new error: unavailable stored bytes, a rejected upload and a malformed file need different investigations.

For code that needs the bytes, n8n documents the [getBinaryDataBuffer helper](https://docs.n8n.io/code/cookbook/code-node/get-binary-data-buffer/). Use that supported helper with the correct item index and binary property. Do not assume an internal descriptor field always contains directly decodable Base64; storage-backed references require the appropriate resolver.

The [binary-data storage guide](https://docs.n8n.io/hosting/scaling/binary-data/) explains that storage configuration and execution-data pruning matter. It also documents constraints for queue deployments. A missing-property error alone is not evidence that you should switch storage mode, restart workers or remove files. Escalate a confirmed storage failure to the deployment owner with the exact error and a fresh, harmless reproduction.

The current [data-pinning documentation](https://docs.n8n.io/data/data-pinning/) says nodes whose output includes binary data cannot be pinned. Do not treat copied JSON, a historical execution view or a visible file descriptor as a permanent backup of the file. For an approved replay, obtain a fresh input or use the workflow's intentionally retained source. Avoid repeatedly replaying production delivery steps while testing.

## A small practice workflow with a clear expected result

In an unpublished, disconnected practice workflow, build:

**Manual Trigger → Edit Fields → Convert to File → Extract From File**

1. In Edit Fields, create a string field named `message` containing `ByteVerse test file.`
2. In Convert to File, choose **Convert to Text File** and set **Text Input Field** to `message`. Inspect its Binary output and record the actual binary property name.
3. In Extract From File, choose **Extract From Text File**. Set **Input Binary Field** to that observed name and **Destination Output Field** to `result`.
4. The expected text result is `ByteVerse test file.`. Verify the file can be read before adding any upload, email or messaging node.
5. In this test copy only, change the input binary field to an absent name such as `missing_file`. Compare the missing-file failure, then restore the actual key.
6. Add your real transformation between conversion and extraction. Check the item-level data at that boundary instead of rebuilding the entire workflow.

This practice procedure is based on the current node documentation; it was **not executed in a real n8n instance for this article**. The two JavaScript snippets were separately tested with synthetic input items. That narrower test verifies their item handling, not the entire workflow or your deployment.

If the end goal is a table rather than an attachment, the [ByteVerse JSON to CSV converter](/tools/json-to-csv) can help inspect a fictional JSON sample. It does not repair n8n's binary references or automatically insert a file into your workflow.

## Verify the repair before reconnecting delivery

Use two harmless records with different files, plus a record with no attachment if that is valid for your process. Confirm:

- The expected binary key reaches every item that requires a file.
- The file can be read, not merely displayed as metadata.
- Each record retains its own file after mapping or merging.
- Records without files take an intentional path.
- The output format, filename and request shape match the destination's requirements.
- Testing has not duplicated real uploads, messages or downstream records.

Then reconnect the approved delivery step and verify its actual receipt. The goal is not merely to remove a red error: it is to deliver **the correct file for the correct item**.

## Frequently Asked Questions

### Why can I see the file upstream but n8n says it was not found?

The failed node may receive another item, another branch or an output that kept only JSON. Inspect that node's current input and the item index in the error. Visibility in an earlier execution panel does not prove that the current operation receives the file.

### What should I enter in Input Binary Field?

For Extract From File, enter the exact incoming binary property name, such as attachment. Do not substitute the display filename or the entire descriptor object. Different integrations can expose different kinds of selectors, so check the selected operation's documentation.

### Why does the error mention [object Object] as the file name?

An expression may have returned an object where the parameter expected a property name. Confirm the parameter type and supply the name of the binary field on the current item. Renaming the file's metadata does not correct an object supplied to a name field.

### Can a URL or Base64 string be used as binary data automatically?

A JSON value is not automatically an n8n binary file. Download the file from an approved URL, or use the appropriate Convert to File operation for actual Base64 or text input. Inspect the resulting binary property before connecting the next file operation.

### Should I restart n8n or change storage mode first?

Not for a missing property alone. Check names, current items and transformations first. If the correct descriptor exists but its bytes cannot be read, investigate the specific storage error with the deployment owner. A restart does not recreate omitted input data.

## Verification Notes

Documentation and public search results were reviewed on **October 18, 2026**. The item-inspection and preservation snippets passed **12 synthetic JavaScript checks in Node.js 24.12.0**, using a test adapter for `$input.all()`. Cases included wrong names and case, JSON-only input, mixed items, separate file references, metadata retention, descriptor-only presence and empty input.

No real n8n instance, node UI, binary store, Merge execution, webhook, upload account or delivery service was tested. The practice workflow is documentation-based, and its stated result is an expectation for the reader to verify. No claim of first-hand n8n deployment testing or a universal fix is made.

## Sources and Further Reading

- [n8n: data structure and item processing](https://docs.n8n.io/data/data-structure/).
- [n8n: Extract From File parameters](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.extractfromfile/).
- [n8n: HTTP Request response and upload options](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/).
- [n8n: Convert to File operations](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.converttofile/).
- [n8n: Edit Fields and Include Binary Data](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/).
- [n8n: Code node modes and item linking](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/).
- [n8n: Merge modes and matching behavior](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge/).
- [n8n: supported binary buffer access](https://docs.n8n.io/code/cookbook/code-node/get-binary-data-buffer/).
- [n8n: binary storage and pruning](https://docs.n8n.io/hosting/scaling/binary-data/).
- [n8n: data pinning and binary-output limitation](https://docs.n8n.io/data/data-pinning/).