If **GitHub Copilot is not working in VS Code**, the fastest fix depends on which part stopped: inline suggestions, Copilot Chat, sign-in, or the connection itself. A status bar icon with a line through it is one problem. A sign-in prompt that keeps returning is another. An "Extension activation failed" message and a quiet editor with no ghost text are two more. Reinstalling the extension does not address most of them.

This guide walks through nine checks in the order that saves the most time: confirm what is actually broken, check your plan and account, then settings, then network, then logs. Each check names the exact VS Code command or setting involved, so you can verify it yourself rather than trusting a screenshot from an older release.

This is a documentation-based troubleshooting guide, not a hands-on test of every Copilot plan, proxy or operating system; the only live check performed was the connectivity ping described in check 6, from an ordinary unproxied connection. Product behavior, plan limits and command names were checked against the official GitHub and VS Code documentation on **October 2, 2026**; both change often, so confirm anything plan-specific against your own account page. If you are new to the extension itself, the [GitHub Copilot setup and usage guide](/blog/github-copilot-guide-2026) covers installation and everyday workflow before you start debugging.

## First, identify which Copilot feature stopped

Copilot in VS Code is several features sharing one account: inline (ghost text) suggestions, next edit suggestions, Copilot Chat, agent mode and smart actions. They have different requirements. The GitHub documentation notes that every new Copilot Chat release is only compatible with the latest VS Code, while an older Chat version still receives current inline suggestions. So "chat broke after an update, completions still work" is a version-pairing symptom, not an account one.

Write down three facts before changing anything: what you expected (ghost text, a chat answer, an agent run), what you saw instead (nothing, an error dialog, a notification), and the exact message text. Then use the table to pick a starting point.

| What you observe | Most likely area | Start with check |
| --- | --- | --- |
| Status bar Copilot icon has a diagonal line | File or language disabled, snoozed, or content exclusion | 3 and 7 |
| No ghost text, no icon change, no error | Language setting, snooze, metered connection, or exhausted Free completions | 2 and 3 |
| Sign-in prompt keeps returning | Authentication token or wrong GitHub account | 4 |
| "GitHub Copilot could not connect to server. Extension activation failed" | No active plan or a failed token request; if the message ends with "read ETIMEDOUT" or "read ECONNRESET", a proxy or firewall | 4, then 6 for the suffixed variant |
| "You've hit a rate limit" or a wait-and-retry notice | Service rate limit or plan allowance | 2 |
| Chat panel missing or stuck after an update | VS Code and Chat extension version mismatch | 5 |
| Works at home, fails on office network | Proxy, firewall or certificate interception | 6 |
| Everything looks fine but Copilot is still silent | Logs and diagnostics | 8 and 9 |

Treat the table as a starting point, not a diagnosis. Change one thing at a time and confirm whether the symptom changed. If you adjust three settings, reload and reinstall together, you no longer know which action mattered.

## 1. Check the status bar before you touch settings

The Copilot menu in the VS Code Status Bar is the quickest health check. Select the Copilot icon in the bottom bar to open it. VS Code calls this the Copilot status dashboard: it shows whether inline suggestions are enabled for all languages and for the language of the current file, whether suggestions are currently snoozed, and the percentage of your monthly inline suggestion and AI credit allowance you have used.

Snooze is easy to trigger by accident. Selecting **Snooze** pauses inline suggestions in five-minute increments; **Cancel Snooze** resumes them immediately. Both also exist as Command Palette entries named **Snooze Inline Suggestions** and **Cancel Snooze Inline Suggestions**. If you pressed a keyboard shortcut you did not recognize and ghost text vanished, cancel the snooze before investigating further.

On Copilot Business and Enterprise plans, the same icon shows a diagonal line when the open file is covered by a content exclusion rule. Hover over it: the tooltip states which setting applied the restriction. That is not a bug to fix on your machine; it is an administrator decision, covered in check 7.

![Laptop screen showing a code editor with a debugger panel and variables view open](https://images.pexels.com/photos/34803966/pexels-photo-34803966.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Check what the editor is already telling you before changing settings. Photo: Daniil Komov / Pexels; illustrative, not a VS Code screenshot.")

## 2. Rule out plan limits and rate limits

Copilot Free is designed for individual developers who do not already have Copilot through an organization or enterprise. GitHub's plans page lists inline suggestions on Copilot Free as limited to **2000 completions per month**, with an allowance of AI credits for chat and agent features and model access through auto model selection only. On the paid individual, Business and Enterprise plans, code completions and next edit suggestions are not billed in AI credits and remain unlimited; AI credits still bound the premium chat and agent usage.

If you are on Copilot Free and completions stopped partway through the month while chat still answers, an exhausted completion allowance is the first thing to rule out. The VS Code FAQ confirms the two allowances are independent: reaching the inline suggestions limit leaves chat usable, and reaching the AI credits limit leaves inline suggestions usable. The Status Bar dashboard shows the percentage used; your GitHub account's Copilot settings and billing pages hold the detailed usage view. Both allowances reset on a monthly cycle, so the alternatives are to wait for the next cycle or move to a paid plan.

Rate limits are a separate mechanism. The GitHub documentation explains that service-level rate limits exist for capacity, fairness and abuse mitigation, and that most people encounter them on select models with limited capacity. The error may tell you to wait, suggest a retry time, or prompt you to upgrade. The documented response is to wait briefly and retry, review whether you are generating rapid automated requests, or upgrade an individual plan. Repeated rate limiting despite normal usage is a GitHub Support case, not something a setting change will fix.

Before blaming your own machine for a sudden outage, check the GitHub Status page. The official troubleshooting guide specifically recommends it for active incidents affecting Copilot or model availability.

## 3. Confirm inline suggestions are enabled for this language

VS Code lets you disable inline suggestions globally or per language. Besides the Status Bar menu, the controlling setting is `github.copilot.enable`, which takes an object keyed by language identifier. If someone added a workspace setting that disables suggestions for `javascript`, or disabled `*` and never re-enabled it, you get silence with no error.

Open **Preferences: Open User Settings (JSON)** and **Preferences: Open Workspace Settings (JSON)** and look for the key in both. A working configuration that enables Copilot everywhere except plain text and Markdown looks like this:

```json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": false,
    "scminput": false
  }
}
```

Remember that a workspace `.vscode/settings.json` overrides your user settings for that folder, and that a project checked out from a team repository may ship one. The `scminput` entry above is VS Code's default for the source-control commit box rather than something the documentation asks you to add. If you edit settings JSON by hand, a trailing comma or a stray quote can silently break the whole file; paste it into a [JSON formatter and validator](/tools/json-formatter) if VS Code flags a parse problem and you cannot spot it.

Two further editor-level causes are easy to miss. VS Code's documentation states that when it treats your network connection as **metered**, Copilot does not start new automatic ghost text or next edit suggestion requests; in-progress requests continue, and you can still ask for one explicitly with the **Trigger Inline Suggestion** command. Separately, the `chat.disableAIFeatures` setting disables and hides chat, inline suggestions and the Copilot extensions at the user or workspace level, and the VS Code FAQ notes that `chat.agent.enabled` can be managed by an organization policy. If a setting is unavailable or shows as managed in the Settings editor, your administrator owns it.

## 4. Fix sign-in loops and wrong-account problems

If you are signed in to GitHub but Copilot is unavailable, the official guidance for VS Code is a clean re-authentication: select the **Accounts** icon in the bottom-left corner, hover over your GitHub username and choose **Sign out**; press F1 and run **Developer: Reload Window**; then sign back in when prompted. This requests a fresh token from GitHub rather than reusing a stale one.

The error `GitHub Copilot could not connect to server. Extension activation failed` means one of two things according to GitHub: you do not have an active Copilot plan, or the request to the GitHub API for a Copilot token failed. Sign out and in first. If the message persists and the same account works on another network, treat it as a connectivity issue (check 6) rather than an account one.

A quieter variation is a subscription attached to a different GitHub account than the one VS Code is using, which commonly happens when a personal and a work account are both signed in. Sign out through the Accounts menu and sign back in with the right account, either from the Status Bar's **Sign in to use Copilot** entry or the **GitHub Copilot: Sign in** command. To use different accounts in different projects, the VS Code setup guide points to **Manage Extension Account Preferences** in the Accounts menu, where you pick the account GitHub Copilot Chat should use for the current workspace and profile. If your plan comes through a GitHub Enterprise account, the same guide documents a **Continue with GHE.com** sign-in path and a `github.copilot.advanced` authentication-provider setting; follow it rather than guessing.

![Developer at a desk with a laptop showing code and a larger monitor in an office](https://images.pexels.com/photos/2102416/pexels-photo-2102416.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Two signed-in accounts are a common source of a working plan that Copilot cannot see. Photo: Djordje Petrovic / Pexels; illustrative.")

## 5. Update VS Code and both Copilot extensions together

GitHub states that older Copilot clients cannot communicate with the Copilot servers, and that Copilot Chat ships in step with VS Code releases: the latest Chat version only runs on the latest VS Code. In practice that means a Chat extension auto-update on an older VS Code can leave the chat view missing or stuck, while completions keep working.

Update in this order: VS Code itself (Help, Check for Updates on Windows and Linux, or Code, Check for Updates on macOS), then the GitHub Copilot and GitHub Copilot Chat extensions from the Extensions view, then **Developer: Reload Window**. Do the same on every machine you use. If your organization pins VS Code versions, the Chat extension version must match that pinned release; VS Code's Extensions view can install a specific older version of an extension when that is necessary.

Avoid "fixes" that delete VS Code's user data folder or registry entries. They remove your settings, extensions and sign-in state without addressing the version mismatch, and nothing in the current official troubleshooting documentation asks for it.

## 6. Diagnose proxy, firewall and certificate blocks

Office networks are the most common environment-specific cause. GitHub's network troubleshooting page lists the characteristic messages: `Extension activation failed: "read ETIMEDOUT"` or `"read ECONNRESET"` for proxy problems, and `certificate signature failure`, `custom certificate` or `unable to verify the first certificate` when a corporate proxy intercepts TLS with its own certificate.

Start with the documented reachability test. From a macOS or Linux terminal:

```sh
curl --verbose https://copilot-proxy.githubusercontent.com/_ping
```

A healthy connection returns HTTP 200. For Copilot Chat specifically, repeat the request against `https://api.githubcopilot.com/_ping`. If you connect through an HTTP proxy, add `-x` with your proxy address, for example `-x http://proxy.example.invalid:8080` (a reserved placeholder; use your actual proxy host and port). On Windows PowerShell 5.1, typing `curl` runs the `Invoke-WebRequest` alias, which does not accept `--verbose`; either call `curl.exe` explicitly on a Windows 10 or later system that ships it, or use the cmdlet directly:

```powershell
$ping = Invoke-WebRequest -Uri 'https://copilot-proxy.githubusercontent.com/_ping' -UseBasicParsing -TimeoutSec 20
$ping.StatusCode
```

Both endpoints returned 200 from an unproxied connection when this article was prepared, which only proves the endpoints exist, not that your network allows them. If the request fails or hangs, work through the documented proxy rules: Copilot uses its own proxy code rather than VS Code's, a proxy URL that starts with `https://` is not currently supported, and authentication is limited to basic authentication or Kerberos (which requires a valid ticket and the right service principal name, configured through `http.proxyKerberosServicePrincipal`). A typical explicit configuration in user settings looks like this:

```json
{
  "http.proxy": "http://proxy.example.invalid:8080",
  "http.proxyStrictSSL": true
}
```

For certificate errors, GitHub's recommended fixes are to install the corporate certificate in the operating system trust store (Copilot reads it through the win-ca package on Windows, mac-ca on macOS, and the standard OpenSSL bundle files on Linux), or to have IT stop intercepting Copilot's connections. Disabling **Proxy Strict SSL** makes the error disappear, but the documentation carries an explicit warning that ignoring certificate errors can cause security issues and is not recommended; treat it as a short diagnostic step, not a permanent setting. GitHub's narrower curl tip is that if a request fails with a certificate revocation error and only succeeds once `--insecure` is added, Copilot may likewise only connect when certificate errors are ignored, which points you back at the trust-store fix rather than at the flag.

If the firewall is the blocker, your network team needs GitHub's Copilot allowlist reference rather than a single hostname. Copilot talks to several endpoints for authentication, completions, chat, telemetry and experiments. With the GitHub CLI installed and authenticated you can print the current list directly from GitHub's metadata API:

```sh
gh api meta -q '.domains | .website, .copilot'
```

Share that output with whoever manages the proxy; hand-typed hostnames drift out of date.

![Person pointing at colorful code on a laptop screen while typing](https://images.pexels.com/photos/12902862/pexels-photo-12902862.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "On a managed network, the fix often belongs to the proxy, not the editor. Photo: Mizuno K / Pexels; illustrative.")

## 7. Understand content exclusions on Business and Enterprise plans

If Copilot works in some files and not others, and your license comes from an organization, you are probably seeing **content exclusion**. Repository administrators can exclude paths for their repositories and organization owners can exclude content for seats they assign. In an excluded file, Copilot neither suggests inline code nor uses that file's content to inform suggestions in other files.

GitHub documents two useful details. First, exclusion changes can take up to 30 minutes to reach IDEs that already loaded the settings, so a brand-new rule or a just-removed one can appear not to apply; you can force your own IDE to reload the exclusions. Second, Copilot may still receive semantic information from an excluded file indirectly, such as type information that the editor provides for symbols used elsewhere. Exclusion is a policy control, not an airtight data boundary.

This is also the point where "not working" stops being a technical problem. If the diagonal-line icon's tooltip names an organization rule, the correct action is to ask the administrator whether the exclusion is intentional, not to look for a client-side override.

## 8. Read the Output panel and Chat Diagnostics

When the previous checks do not explain the symptom, stop guessing and read the logs. Open **View, Output** and select **GitHub Copilot** from the dropdown on the right (a separate GitHub Copilot Chat channel also appears when the Chat extension is installed). Authentication failures, network timeouts and policy refusals usually appear here in plain language.

For connection problems, run **Developer: Chat Diagnostics** from the Command Palette. It opens a new editor with environment details and a **Reachability** section that shows whether Copilot can actually reach each required service from your machine. This is far more reliable than inferring network state from a missing suggestion.

If the default log level is too sparse, run **Developer: Set Log Level**, choose **GitHub Copilot Chat** (for the Chat extension) or **GitHub** (for the Copilot extension), and select **Trace**. Reproduce the problem, collect what you need, then set the level back to **Info**; trace logs are large and can include prompt and file content. **Developer: Open Extension Logs Folder** opens the on-disk logs if you need to attach them to a support request, and **Developer: Toggle Developer Tools** exposes the Console tab for the rare error that never reaches the extension logs.

Before sharing any log, redact tokens, hostnames, repository names and code excerpts you are not permitted to disclose. Logs are evidence for you first and for GitHub Support or your IT team second.

![Laptop on a desk showing a code editor with a coffee mug beside it](https://images.pexels.com/photos/34803969/pexels-photo-34803969.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Logs and the Reachability report settle most arguments about where a failure actually is. Photo: Daniil Komov / Pexels; illustrative.")

## 9. Separate "Copilot" from "the model I asked for"

Some reports that Copilot is broken are really about one model. Copilot Free uses auto model selection only, so a tutorial that tells you to pick a specific model in the chat picker describes a paid-plan feature. On Business and Enterprise plans, administrators must opt in to editor preview features before some models appear at all. A model that is temporarily unavailable or rate-limited also produces an error while the rest of Copilot keeps working.

If a chat request fails with a model-specific message, retry with the default or automatic selection before concluding the extension is down. Community reports from early 2026 describe transient "language model unavailable" and "chat took too long to get ready" messages that resolved after waiting or reloading; those are useful search terms, not confirmed universal defects, so weigh them against the Status page and your own logs.

Keeping the editor itself healthy helps here too. A sluggish VS Code with dozens of extensions competing for startup time can make Copilot appear slow or unresponsive; the startup and extension-hygiene habits in our [VS Code tips and tricks guide](/blog/vscode-tips-and-tricks-2026) are worth applying before you blame the AI service.

## What to record if you need support

A good support request or team-chat message answers five questions in a few lines: VS Code version (Help, About), GitHub Copilot and GitHub Copilot Chat extension versions, your plan type (Free, Pro, Business, Enterprise), the exact error text, and whether the `_ping` test succeeds from the same network. Add the Reachability section from Chat Diagnostics, with sensitive values removed. Say what you already tried and in what order.

Avoid listing every change you made at once. "Signed out and in, reloaded, same error; ping to the completions endpoint times out behind the office proxy but succeeds on mobile hotspot" is a diagnosis. "Reinstalled everything three times" is not.

## When Copilot is working but the suggestions are not useful

Once the extension runs again, remember that an active connection is not the same as good output. Copilot suggests from the open files and context you give it, so unrelated tabs and vague comments produce vague suggestions. Expectations also depend on which plan and model you use, and on the alternatives you compare against; if you are weighing Copilot against other assistants, our [AI coding assistants comparison](/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf) looks at Copilot, Cursor, Windsurf, Claude Code and Tabnine on equal terms. Fix the connection first, then evaluate quality separately.

## Frequently Asked Questions

### Why is GitHub Copilot not showing suggestions in VS Code even though I am signed in?

Open the Copilot menu in the Status Bar first. Inline suggestions may be snoozed, disabled for the current language through `github.copilot.enable`, paused because VS Code treats your connection as metered, or exhausted if you are on Copilot Free and have used the month's 2000 completions. If none of those apply, check the Output panel for the GitHub Copilot channel.

### How do I fix "GitHub Copilot could not connect to server. Extension activation failed"?

GitHub documents this message as either a missing Copilot plan or a failed token request. Sign out through the Accounts icon, run Developer: Reload Window, and sign back in. If the error continues, test the connection with the documented ping endpoint and review proxy, firewall and certificate settings, especially on a corporate network.

### Does Copilot Free run out, and how do I know?

Yes. Copilot Free includes 2000 inline completions per month plus a monthly allowance of AI credits for chat and agent features, with auto model selection only. The Copilot status dashboard in the VS Code Status Bar shows the percentage of each allowance used, and your GitHub account's Copilot settings and billing pages hold the details. Paid individual, Business and Enterprise plans do not meter completions.

### What does the diagonal line on the Copilot status bar icon mean?

GitHub's documentation ties it to content exclusion on Business and Enterprise plans: the open file is covered by an exclusion rule set by a repository administrator or organization owner, so Copilot will not suggest in it. Hover over the icon to read which setting applied the restriction, and contact the administrator if the exclusion seems unintended.

### Copilot Chat disappeared after an update but completions still work. Why?

Copilot Chat releases are tied to VS Code releases, and the latest Chat extension only runs on the latest VS Code. Update VS Code first, then both Copilot extensions, then reload the window. If your organization pins VS Code to an older version, install a matching Chat extension version from the Extensions view.

### Can I just disable Proxy Strict SSL to fix certificate errors?

You can, and it often makes the error go away, but GitHub's documentation warns that ignoring certificate errors can cause security issues and is not recommended. The supported fixes are installing the corporate certificate in the operating system trust store or asking IT not to intercept Copilot's connections.

### Which hosts does my firewall need to allow for Copilot?

Copilot uses several endpoints for authentication, completions, chat, telemetry and experiments, and the list is maintained in GitHub's Copilot allowlist reference. If you have the GitHub CLI, running the documented meta API query prints the current domains so your network team works from live data rather than a copied list.

### Where are the Copilot logs in VS Code?

Open View, Output and choose the GitHub Copilot or GitHub Copilot Chat channel. Developer: Chat Diagnostics produces a Reachability report for connection problems, Developer: Set Log Level can raise a specific extension to Trace temporarily, and Developer: Open Extension Logs Folder opens the files on disk. Redact sensitive content before sharing any of them.

## Sources and Image Credits

Documentation reviewed on October 2, 2026: GitHub Docs, [Troubleshooting common issues with GitHub Copilot](https://docs.github.com/en/copilot/how-tos/troubleshoot-copilot/troubleshoot-common-issues); [Troubleshooting network errors for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/troubleshoot-copilot/troubleshoot-network-errors); [Troubleshooting firewall settings](https://docs.github.com/en/copilot/how-tos/troubleshoot-copilot/troubleshoot-firewall-settings); [Copilot allowlist reference](https://docs.github.com/en/copilot/reference/copilot-allowlist-reference); [Viewing logs for GitHub Copilot in your environment](https://docs.github.com/en/copilot/how-tos/troubleshoot-copilot/view-logs); [Plans for GitHub Copilot](https://docs.github.com/en/copilot/get-started/plans); [Usage limits for GitHub Copilot](https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits); VS Code Docs, [Inline suggestions from GitHub Copilot in VS Code](https://code.visualstudio.com/docs/copilot/ai-powered-suggestions), [Set up GitHub Copilot in VS Code](https://code.visualstudio.com/docs/copilot/setup), [GitHub Copilot frequently asked questions](https://code.visualstudio.com/docs/copilot/faq) and [Network Connections in Visual Studio Code](https://code.visualstudio.com/docs/setup/network). Plan limits, prices and command names change; verify against your own account before relying on a number quoted here.

Photos are illustrative stock images used under the [Pexels license](https://www.pexels.com/license/) and do not show the author's VS Code setup or any specific error: cover by [olia danilevich](https://www.pexels.com/photo/person-coding-on-a-macbook-pro-4974912/); body images by [Daniil Komov](https://www.pexels.com/photo/close-up-of-computer-screen-with-code-displayed-34803966/), [Djordje Petrovic](https://www.pexels.com/photo/man-in-black-shirt-sits-behind-desk-with-computers-2102416/), [Mizuno K](https://www.pexels.com/photo/office-worker-using-a-computer-in-an-office-12902862/) and [Daniil Komov](https://www.pexels.com/photo/focused-coding-session-with-laptop-and-coffee-34803969/).
