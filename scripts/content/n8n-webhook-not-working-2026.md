If your **n8n webhook is not working**, check three things before rebuilding the workflow: the exact URL your sender calls, its HTTP method, and whether n8n has registered that endpoint. A test URL needs a listening test session. A production URL needs a published workflow. Saving edits or opening the production URL tab is not the same as publishing those edits.

That distinction explains several confusing situations, but not every failure. A reverse proxy can return its own 404, authentication can reject a valid URL, and a workflow can run successfully while returning a response your caller does not expect. The useful question is not just “Did I get an error?” It is “Which part of this request failed?”

This guide focuses on the standard **Webhook** node, not the different registration rules of every app-specific trigger. It is a documentation-based troubleshooting guide, not a hands-on n8n hosting benchmark. Product behavior and version notes were checked against official documentation on **October 1, 2026**. If triggers, nodes and executions are still unfamiliar, start with the [n8n beginner guide](/blog/how-to-use-n8n-2026-complete-guide).

## Start with the response, not another restart

Record the request time, HTTP method, response status and a sanitized excerpt of the response body. Also note whether the URL came from the Test URL or Production URL tab. Look for a matching execution, but remember that execution-saving settings and filters can affect what appears in history. An empty canvas is not proof that production received nothing.

| What you observe | What to investigate | First useful check |
| --- | --- | --- |
| 404 with an n8n “not registered” message | No matching registered endpoint for that request | URL mode, exact path, method and publishing state |
| Test request worked earlier, then stopped | Temporary test registration may have ended | Start a fresh listening session before a new synthetic test |
| Test works but production returns 404 | Different URL or published trigger configuration | Compare the sender with the published version, not just the draft |
| Branded HTML 404 or a login page | A proxy, gateway or another application may have answered | Correlate the request with routing/access logs |
| 401 or 403 | Authentication, allowlist or upstream access rules | Verify the sender's approved credentials and actual source address |
| 200 but no expected output | Response mode, request filtering or an unexpected workflow branch | Inspect the matching execution and response settings |
| Connection error or timeout | DNS, TLS, reachability or response deadlines | Determine whether any HTTP response or execution exists |

Treat these as starting points, not automatic diagnoses. A response body is a clue, not a substitute for logs. Change one relevant thing, send one approved test, and record whether the evidence changed. Repeatedly republishing, restarting and changing paths together destroys the comparison you need.

## 1. Separate the test URL from the production URL

The [official Webhook documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) describes two URLs with different registration behavior. Test URLs are for interactive development. Production URLs are for the published workflow. Selecting a tab only changes the address displayed in the node; it does not move the workflow into production.

With the default endpoint settings, their paths look like this:

```text
Test:        https://n8n.example.invalid/webhook-test/your-path
Production:  https://n8n.example.invalid/webhook/your-path
```

These are deliberately nonworking example addresses. Copy the complete URL from your own instance rather than replacing a fragment by hand: self-hosted endpoint prefixes can be customized. Compare the scheme, host, path and any required route parameters with the destination saved in your sending application.

For a test URL, select **Listen for test event** and then send the request. n8n documents a **120-second listening window**. If listening has ended, start it again before the next test. Do not leave a long-running external integration pointing at a temporary test URL and expect it to keep working unattended.

For production, publish the intended workflow version and configure the sender with its Production URL. Inspect runs through **Executions**; production requests do not populate the open editor in the same way as interactive tests. Closing the editor does not stop a published production workflow, although the n8n service itself must remain running and reachable.

![Two colleagues reviewing code on a laptop at an office desk](https://images.pexels.com/photos/12899191/pexels-photo-12899191.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Compare the sender and workflow configuration side by side. Photo: Mizuno K / Pexels; illustrative, not an n8n screenshot.")

## 2. Check the published version, not only the saved draft

Older tutorials tell you to turn the workflow **Active**. n8n's [version 2 transition documentation](https://docs.n8n.io/changelog/v20-breaking-changes.md) describes the move from Activate/Deactivate to **Publish/Unpublish**. Follow the interface and documentation for your installed release instead of searching indefinitely for a switch shown in an old screenshot.

The important current behavior is that production runs use a particular published version. Later node edits can be saved as a draft without becoming live. That is useful protection against unfinished work, but it can make a corrected path or method appear to be ignored. There is a documented exception: when you change only workflow settings, n8n republishes without a manual publishing action. Identify whether you changed a node or a workflow setting.

Consider this **illustrative example**, not a reported customer incident:

```text
Published version A: POST /lead-intake-v1
Saved draft B:       POST /lead-intake-v2
Sender now calls:    POST /lead-intake-v2
```

The sender has moved to a route that is not necessarily registered by the published version. Compare the versions first. If version B is approved for production, publish it and confirm the trigger is registered. Otherwise, coordinate restoring the sender to version A's actual endpoint. Do not publish unreviewed downstream changes merely to make an error disappear.

Also inspect the publishing result. Current [saving and publishing documentation](https://docs.n8n.io/build/understand-workflows/save-and-publish-workflows.md) distinguishes publishing in progress, partial success and failure. A partial result can mean some triggers are running while another failed to register. Read the trigger-specific error rather than treating the presence of a published version as proof that every trigger is healthy.

## 3. Match the path and HTTP method exactly

Opening a URL in a browser normally sends **GET**. If your Webhook node expects **POST**, that browser visit is not a valid test of the configured request. A method mismatch can look like a registration problem because n8n registers webhooks by **path and method**, not path alone.

Copy the path again after any approved change, check for a missing segment, and supply required route parameters. A route configured with `orders/:orderId` needs a concrete value such as `orders/demo-123`; sending only `orders/` is a different request. Treat casing and trailing slashes consistently rather than assuming every proxy or route accepts variations.

The [common-issues documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/common-issues/) states that only one webhook can register each path-and-method combination. A copied workflow can therefore conflict with its original. Give the experimental copy its own path. Do not unpublish someone else's working integration just to free an address for a test.

If you intentionally need more than one method, current documentation puts **Allow Multiple HTTP Methods** in the node's **Settings**. You then select the required methods in Parameters and handle their separate outputs. Accepting every method is not a substitute for finding out what the sender actually uses.

![Close-up of colorful programming text on a dark computer screen](https://images.pexels.com/photos/7325498/pexels-photo-7325498.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "A small difference in the request can matter. Photo: Al Nahian / Pexels; illustrative code, not a captured webhook error.")

### Send one small, safe diagnostic request

Use a workflow you own with downstream email, payment, CRM and other write actions disconnected or replaced by harmless test steps. An arbitrary `dryRun` field does **not** make an existing workflow safe: it only has meaning if you implement that behavior. Keep authentication enabled and use your approved client's secure credential storage; never paste tokens into a public debugging service or support post.

The following examples send synthetic JSON to a **POST** webhook. Replace the reserved `.invalid` URL with your approved diagnostic endpoint, add its required authentication through your client's safe mechanism, and choose **one** example—not both. They demonstrate request syntax; they are not a claim that a particular n8n deployment was tested. For a Test URL, begin listening immediately before sending.

**macOS or Linux shell with curl:**

```sh
curl --include --max-time 15 --request POST \
  'https://n8n.example.invalid/webhook-test/replace-me' \
  --header 'Content-Type: application/json' \
  --data '{"probeId":"byteverse-webhook-check","message":"synthetic test"}'
```

**Windows PowerShell 5.1:**

```powershell
Add-Type -AssemblyName System.Net.Http
$webhookUrl = 'https://n8n.example.invalid/webhook-test/replace-me'
$json = '{"probeId":"byteverse-webhook-check","message":"synthetic test"}'
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(15)
$payload = [System.Net.Http.StringContent]::new(
  $json, [System.Text.Encoding]::UTF8, 'application/json'
)
$response = $null
try {
  $response = $client.PostAsync($webhookUrl, $payload).GetAwaiter().GetResult()
  [pscustomobject]@{
    Status = [int]$response.StatusCode
    Location = [string]$response.Headers.Location
    Body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  }
} finally {
  if ($null -ne $response) { $response.Dispose() }
  $payload.Dispose()
  $client.Dispose()
}
```

The PowerShell example uses .NET's HTTP client rather than Windows PowerShell's `curl` alias. It does not parse or execute HTML, does not follow redirects, and reads error responses as well as successful ones. DNS, TLS and connection failures can still throw without an HTTP status. Redact returned details before sharing them. The request syntax was checked against a local synthetic responder; that does not verify your n8n instance or its authentication.

The 15-second timeout is a diagnostic client limit, not a claim about n8n's processing limit. Timing out does not guarantee the server stopped working. Neither example automatically retries, because repeating a request can repeat its side effects. Before sharing JSON for help, redact private values; a [JSON formatter](/tools/json-formatter) is useful for reading a sanitized sample, not a reason to expose customer data.

## 4. Distinguish an n8n 404 from a routing or access failure

An n8n response explicitly mentioning an unregistered webhook directs attention toward the URL, method and trigger registration. A hosting-provider error page, unexpected HTML or a login redirect suggests another layer may have answered. Neither clue proves the entire route: an upstream proxy can rewrite a valid request before n8n sees it.

For a self-hosted installation, correlate the request time with the reverse proxy's access log and n8n's logs. Confirm which upstream received the request and which path it received. A client's verbose output shows the request leaving the client; it does **not** by itself reveal the path after an internal proxy rewrite. Keep raw logs private because headers, query strings and payloads may contain credentials or personal information.

For **401 or 403**, first check the configured authentication scheme, whether the sender supplies the right credential, and whether an IP allowlist or gateway rule rejects it. n8n documents a 403 response for callers outside a configured Webhook IP allowlist. Do not disable authentication or remove access controls as a blanket fix for “webhook not working.”

A page loading in your signed-in browser also does not prove a third-party sender can reach the webhook. That sender does not inherit your browser cookies. If a gateway requires interactive login, arrange an explicitly authorized service-to-service route with the administrator rather than making the whole n8n editor public.

If a server-side test succeeds but your own website's JavaScript fails, check the browser's Network and Console panels for a **CORS** or preflight error. [MDN explains](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) that CORS governs browser access to cross-origin responses; it is not a universal explanation for a server-to-server webhook failure. Review allowed origins, methods and headers for that specific frontend instead of disabling browser security or allowing every origin indiscriminately.

## 5. Check execution history and response mode

Once the request reaches a workflow, stop treating every unexpected result as a registration failure. Open the matching execution, inspect the Webhook node's actual output and follow the executed branch. A field nested under `body` is not interchangeable with a top-level field. Filters may take a different path when a real sender supplies a different shape from your example.

Use the response mode to understand what success should look like. **Immediately** acknowledges the start; it does not prove downstream work finished. **When Last Node Finishes** returns data from the last executed node according to the configured response options. **Using 'Respond to Webhook' Node** delegates the reply to that node, which must be part of the intended execution path.

There is an easy-to-miss detail in the [Respond to Webhook documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook.md): if the workflow finishes without executing that response node, n8n returns a standard 200 message. If it errors before the first response node runs, it returns an error with status 500. A second response after the first is ignored. Therefore, “200 but not my JSON” can be a branch/configuration issue—not a missing webhook.

Current Webhook documentation also includes an **Only Run If** option. Where that option is available and configured, a false condition returns 200 without creating an execution. It runs after authentication and IP checks; if its expression fails to evaluate, n8n logs a warning and lets the request through. Inspect it if the caller gets an acknowledgment but the expected run is absent. This failure behavior is another reason it is request filtering, not a replacement for authentication.

Compare sanitized expected and received payloads with a [diff checker](/tools/diff-checker). Focus on field names, nesting and types before adding more nodes. Do not upload the original customer payload just because a comparison tool makes differences easier to see.

## 6. Check self-hosted public URLs and reverse proxies

Skip this section if you use n8n Cloud and do not operate its infrastructure. For self-hosting, separate **the URL n8n advertises** from **the network route that actually delivers a request**. Changing an advertised URL does not create DNS records, open a firewall or make a laptop accessible from the internet.

`localhost` refers to the machine making the request. A third-party service cannot use your laptop's loopback address to reach your local n8n instance. Use an appropriately secured, reachable test deployment or an approved development tunnel. Do not expose the administration interface or bypass TLS verification to make a webhook test pass.

The current [endpoint configuration reference](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/endpoints.md) names **N8N_WEBHOOK_URL** for the public webhook base URL. It also says **WEBHOOK_URL** is a deprecated but still-working alias from **n8n 2.35.0**. On older releases, consult the matching documentation before changing variable names. Seeing the legacy variable is not, on its own, evidence of your 404.

Check that the displayed webhook URL has the intended public HTTPS host and that the proxy forwards the intended endpoint path. The [reverse-proxy guide](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/configuration-examples/configure-webhook-urls-with-reverse-proxy.md) covers forwarded host, protocol and client-address headers. Its one-proxy example uses **N8N_PROXY_HOPS=1**; deployments with a different proxy chain need a matching trusted-hop configuration, not a copied number.

If someone manages the deployment for you, send them the sanitized failing request details and ask for a routing check. Avoid changing several environment values and restarting a shared instance without knowing which other workflows depend on it. Managed and self-hosted options carry different operating responsibilities; the [n8n versus Zapier comparison](/blog/n8n-vs-zapier-2026-comparison) discusses that wider decision without making a single webhook error a reason to migrate.

![Network equipment mounted in a data-center server rack](https://images.pexels.com/photos/37730212/pexels-photo-37730212.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Public URLs and proxy routing are separate checks. Photo: panumas nikhomkhai / Pexels; not a photograph of n8n infrastructure.")

## 7. Handle timeouts without creating duplicate work

A slow response is a different problem from an unregistered route. Check the sender's deadline, the gateway's deadline and the matching execution before retrying. The n8n common-issues page documents a **100-second response limit on n8n Cloud**, after which the incoming request can fail with 524. Your sending service may stop waiting sooner, so that number is not a universal end-to-end allowance.

For work that cannot reliably finish inside the caller's deadline, design an asynchronous flow: validate the request, record accepted work durably, return the agreed acknowledgment, and expose completion through an authorized status check or callback. That is an application design change, not simply a longer timeout setting. Returning 200 immediately does not make a later failure disappear.

Before replaying a provider event, find out whether the first attempt already created the task, sent the message or charged the account. Use the provider's event identifier and a persistent uniqueness check appropriate to your workflow when designing duplicate protection. A timeout or a missing browser response must never be treated as permission to repeat an irreversible action blindly.

If URL, method, publication and routing checks all agree but registration still fails, collect a minimal reproduction with your installed n8n version. Version-specific bugs and service incidents are possible, but a forum report about somebody else's version is not proof of the cause in yours. Check official release information and support guidance before upgrading or downgrading a working installation.

## Keep a short verification record

After each approved change, record one before-and-after request with the same synthetic payload. Check the HTTP status **and** the expected workflow outcome. If you modified the production path, coordinate the sender update as part of the same change; success from your test client does not update the external application's saved URL.

Use this template when asking an administrator or n8n support for help. Include a redacted path shape rather than an active secret-bearing webhook URL, and never attach an unredacted workflow export containing credentials or customer samples.

```text
n8n version and hosting: [version; Cloud or self-hosted]
Webhook mode: [Test or Production]
Request time and timezone: [exact timestamp]
Method and redacted path: [POST /webhook/<redacted>]
Publishing state: [confirmed result; latest draft differs yes/no]
Observed response: [status plus sanitized message]
Matching execution: [found / not found / history not retained]
Last relevant change: [one change, not a list of guesses]
Expected outcome: [safe diagnostic response]
```

The goal is a repeatable explanation: this sender reaches this registered route with this method, and this published workflow produces the agreed result. That is more useful than a green editor screenshot or a temporary fix you cannot reproduce tomorrow.

![Open laptop beside a notebook and pen on a wooden desk](https://images.pexels.com/photos/574073/pexels-photo-574073.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Record the change and the observed result before trying another fix. Photo: Lukas Blazek / Pexels.")

## Frequently Asked Questions

### Why does my n8n webhook work in test but not in production?

Test and production use different registrations. Check that the sender uses the Production URL, the intended version is published, and its trigger registered successfully. Also compare the method and path with the published configuration. A successful interactive test does not prove later draft changes are live.

### What does the requested webhook is not registered mean?

It means the request did not match an available webhook registration at the n8n endpoint that answered it. Check the URL mode, listening or publishing state, exact path and HTTP method. If a proxy rewrites the path, the request reaching n8n may differ from the address your client used.

### Why does a POST webhook fail when I open it in my browser?

An address-bar visit normally sends GET, not POST. Use a client that sends the method configured in the Webhook node, along with any required authentication and payload. Only enable additional HTTP methods when the workflow genuinely needs and handles them.

### Do I need to keep the n8n editor open?

Not for a published production webhook. The n8n service must stay running and reachable, and you inspect production runs in Executions. A test URL is different: it relies on a temporary listening session, documented as 120 seconds, rather than permanent production registration.

### Why did saving my changes not fix the production webhook?

Draft node edits do not automatically replace the published version. Compare versions and publish only the approved update. When only workflow settings change, current documentation says n8n republishes automatically, so first identify which kind of edit you made.

### Can an external service call my n8n localhost URL?

Not to reach your computer: localhost points back to the caller's own machine. An external service needs an appropriately secured, reachable URL. Configuring a public webhook base URL does not by itself create a tunnel, DNS record or firewall rule.

### Does WEBHOOK_URL stop working in n8n 2.35.0?

The current endpoint documentation says it remains a working alias, with deprecation warnings, while N8N_WEBHOOK_URL is the replacement. Use version-matching configuration guidance. The presence of the older variable alone does not explain a failed request.

### Why does n8n return 200 without my expected JSON?

Check the response mode and the executed branch. An immediate response acknowledges the start, and a workflow that finishes without reaching its configured Respond to Webhook node returns a standard 200 message. Where available, a false Only Run If condition can also acknowledge a request without creating an execution.

## Sources and Image Credits

Technical references checked October 1, 2026: [Webhook node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [Webhook common issues](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/common-issues/), [saving and publishing workflows](https://docs.n8n.io/build/understand-workflows/save-and-publish-workflows.md), [n8n 2.0 changes](https://docs.n8n.io/changelog/v20-breaking-changes.md), [endpoint environment variables](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/endpoints.md), [reverse-proxy configuration](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/configuration-examples/configure-webhook-urls-with-reverse-proxy.md), [execution-saving settings](https://docs.n8n.io/build/manage-workflows/configure-workflow-settings.md), [execution history and filters](https://docs.n8n.io/build/understand-workflows/understand-executions/view-executions-for-a-single-workflow.md), and [Respond to Webhook behavior](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook.md). Interface labels and available options can differ by installed version.

The diagnostic record and version-A/version-B example are original illustrations, not measured incident statistics. No client workflow, real webhook payload or production automation was used to claim a test result.

Cover: [cottonbro studio](https://www.pexels.com/photo/hands-typing-on-a-laptop-keyboard-5483077/). Body photos: [Mizuno K](https://www.pexels.com/photo/discussion-about-software-development-in-office-12899191/), [Al Nahian](https://www.pexels.com/photo/computer-program-on-computer-screen-7325498/), [panumas nikhomkhai](https://www.pexels.com/photo/data-center-server-racks-with-active-equipment-37730212/), and [Lukas Blazek](https://www.pexels.com/photo/turned-on-laptop-computer-574073/), used under the [Pexels license](https://www.pexels.com/license/). Images are cropped stock illustrations, not n8n interface screenshots, infrastructure verification or endorsements.