When Cursor's Agent sits on **"Planning next moves"** (or "Generating…", "Reconnecting", "Warming up") with no error and no progress, the cause is almost never the prompt. In the public bug threads where the hang was actually resolved, it came down to one of a handful of things: a network path that silently drops long-lived streams, codebase indexing that had not finished, a broken MCP server, an extension, a specific Cursor build with a regression, or a provider-side incident.

The checks below are ordered from fastest to slowest. Each one tells you something even when it does not fix the problem, so you can stop guessing and either get unstuck or file a report that Cursor's team can act on.

## What "Planning next moves" actually is

"Planning next moves" is a status label shown while the agent loop is waiting on the model to decide the next step: read a file, run a command, call a tool, or edit something. Unlike a visible "Thinking" block, it cannot be expanded, so you cannot see whether the request is still streaming or the connection has stalled. One long forum thread from January 2026 was essentially a complaint about exactly that lack of visibility ([Constantly stuck in "Planning Next Moves" or "Generating…"](https://forum.cursor.com/t/constantly-stuck-in-planning-next-moves-or-generating/149407)).

That matters for troubleshooting because the label does not distinguish between three very different situations:

| What you see | What is usually happening | Fastest way to tell |
| --- | --- | --- |
| Stuck for 1–3 minutes on a large task, then continues | A long model turn or a big tool result; not a fault | Wait once; check whether tokens/usage advance |
| Stuck indefinitely, short tasks also hang, diagnostics pass | A proxy, VPN or security tool is cutting the long streaming connection | Phone hotspot with VPN fully off, then fully quit and reopen Cursor |
| Stuck right after an update, on every project | A build regression (seen on 2.4.x in January 2026) | Check the forum and release notes for your exact version |
| Stuck only while "Indexing…" is shown | Indexing blocking the agent (confirmed by Cursor staff, Jan 2026) | Let indexing finish, or pause it and retry |
| Stuck after adding an MCP server, server shows an error state | A faulty MCP server blocking the agent loop | Toggle the failing server off and resend |
| Error eventually appears: "Connection stalled" | The stream timed out at the client | Treat as a network check, then report with the Request ID |

## Check 1: Rule out a Cursor or model-provider incident

Before touching settings, open the Cursor status page. On October 13, 2026 the page recorded a widespread incident where "users may see errors or failed requests across the IDE, Cloud Agents, Automations" for about three hours, and on October 19 and 21 it recorded elevated errors for specific Anthropic models. A hang during one of those windows is not something you can fix locally.

Two practical notes:

- If an incident is limited to one provider, switch the model picker to a different family for a while and resend.
- Cursor announced that from October 26, 2026 its status updates move to [status.x.ai](https://status.x.ai/) and the old page stops sending notifications, so bookmark the new one if you rely on alerts.

## Check 2: Stop, then resend in a fresh chat

Click **Stop**, then resend the same message. If that works, you have hit a transient stall rather than a configuration problem. Several people in the January 2026 thread reported exactly this pattern: hours of no progress, then an immediate response after a manual stop and resend.

If the conversation is long, start a **new chat** and attach only the files you need with `@`. One user noted that the hang appeared mainly when "the context or chat gets fairly long" and that a new conversation ran normally again; Cursor's own agent guidance also recommends starting a new chat when you finish a feature or switch tasks. This is not a root-cause fix, but it is the cheapest way to confirm whether context size is a factor for you.

## Check 3: Fully quit Cursor, not just Reload Window

"Reload Window" restarts the editor UI but keeps the main process alive. Cursor's network troubleshooting notes that the app can inherit DNS and environment settings from a VPN that was active when it started, and that only a **full restart** clears them. On Windows and Linux that means exiting from the system tray; on macOS, Cmd+Q.

After the restart, retry a task that previously hung before changing anything else, so you know which step actually helped.

## Check 4: Test the network path, not just the diagnostics

This is the check that resolved the most recent staff-handled thread, and it is the one most people skip because the built-in diagnostics say everything is fine.

### Run Diagnostics, but read the result carefully

Go to **Cursor Settings → Network → Run Diagnostics**. If anything fails, you have your answer. If everything passes, you still have not ruled the network out. In an August 2026 bug thread, a Cursor team member explained why: the built-in checks are "quick one-shot connections, so they pass even when a VPN/proxy is cutting the longer connection the agent streams over" ([Cursor Agent stuck on "Planning next move"](https://forum.cursor.com/t/cursor-agent-stuck-on-planning-next-move/167632)).

### The hotspot test

Disconnect any VPN, switch the machine to a phone hotspot, fully quit and reopen Cursor, and retry a task that hangs. If it now completes, the problem is somewhere between your normal network and Cursor's servers. That same thread ended with the user finding that a VPN they had already uninstalled had left an IKEv2 profile registered in macOS; the system was still applying its network policy and dropping outgoing TCP connections. Removing the stale VPN configuration in System Settings and restarting fixed the hang.

The lesson generalises: check for leftover VPN profiles, per-app firewall rules, and "network filter" entries from security software, even if the app that created them is gone.

### HTTP Compatibility Mode

Cursor streams agent responses over HTTP/2, and some corporate proxies (Zscaler is the example in Cursor's docs) break it. Set **Cursor Settings → Network → HTTP Compatibility Mode** to **HTTP/1.1**, then fully quit and reopen. Staff replies in the forum have also suggested trying HTTP/1.0 when 1.1 does not help. Keep this change only if it makes a difference; it is a workaround for a proxy, not a performance setting.

### What to send to IT on a managed network

If you cannot drop the proxy, ask the network team to exempt Cursor's endpoints from SSL inspection and idle-connection timeouts. Cursor's help page lists the domains to allow: `*.cursor.sh`, `*.cursor-cdn.com`, `*.cursorapi.com`, plus the sign-in hosts; the staff reply above specifically named `api2.cursor.sh` and `api2.cursor.com` for the long agent requests. Point them at [Cursor's network configuration guide](https://cursor.com/docs/enterprise/network-configuration) rather than paraphrasing it.

## Check 5: Let indexing finish (and notice when it restarts)

In January 2026 a user working over SSH reported that the agent stayed on "Planning next moves" until codebase indexing completed, and a Cursor team member confirmed: "It's actually related to indexing, which is blocking the agent. This is a known issue and the team is currently investigating it" ([Agent hanging at Planning next moves due to Indexing](https://forum.cursor.com/t/agent-hanging-at-planning-next-moves-due-to-indexing/148696)). The same user reported things were much better after updating to 2.3.35, but also that rebooting the remote machine required restarting Cursor before indexing worked again.

So: look at the indexing status in Cursor Settings. If it is running, wait for it, or pause it and retry the agent. If indexing restarts every time you open the project, add large generated folders (`node_modules/`, `dist/`, `.next/`, data dumps) to `.cursorignore` so there is less to scan, and restart Cursor after reconnecting any remote session.

## Check 6: Disable MCP servers that are in an error state

A user in the February 2026 continuation of the big thread found that "in the moment I disabled all MCP-Servers with error-state, the Agent chat was working again." That is a single report rather than an official root cause, but it is cheap to test and it matches how a tool list is assembled before the model can plan.

1. Open **Output** (Ctrl/Cmd+Shift+U) and select **MCP Logs** to see which servers are failing to start.
2. Open **Customize → MCPs** and toggle off any server showing an error.
3. Resend the request. If it now works, fix the server (wrong command path, missing environment variable, invalid JSON) and re-enable it.

If you edited `mcp.json` by hand, paste it into a [JSON formatter and validator](/tools/json-formatter) first; a trailing comma or an unquoted key is enough to leave a server permanently "starting". Cursor's MCP help also notes that servers depending on variables from your shell profile need Cursor restarted after the profile changes.

## Check 7: Start Cursor with extensions disabled

Run `cursor --disable-extensions` from a terminal and retry the same task. This was one of the three steps a Cursor team member suggested during the January 2026 2.4.21 reports, and at least one user in that thread confirmed it was the step that worked for them ([Cursor Agent stuck in "Planning Next Moves"](https://forum.cursor.com/t/cursor-agent-stuck-in-planning-next-moves/150064)). If the agent runs normally without extensions, re-enable them in halves until the culprit appears; use **Show Running Extensions** from the command palette to see CPU and memory per extension while you do it.

## Check 8: Compare your version with the forum before rolling back

Some hangs are simply bugs in a specific build. In late January 2026 Cursor staff acknowledged that "a lot of users on version 2.4.x" were stuck in Plan mode and Agent, and that the most reliable short-term option at the time was rolling back to 2.3.41 while a fix shipped. Other users reported the early-access 2.4.22 build already behaved better; some did not. The point is not that you should run an old version today. It is that when a hang begins immediately after an update and affects every project, your first stop should be the release notes and the forum's Bug Reports category for your exact version string (copy it from **Help → About** on Windows/Linux or **Cursor → About Cursor** on macOS).

If you do roll back, download the specific build from [cursor.com/download](https://cursor.com/download), and move forward again as soon as a later version is confirmed fixed. Older builds stop receiving security and model updates.

### A related error: "Agent Execution Timed Out"

If instead of a silent hang you see "Agent Execution Timed Out", Cursor's docs say the extension host did not finish starting within 60 seconds. The documented next step is to run **Developer: Export Logs…** (select Main, Window and Extension Host) and check **Output → Extension Host**; an empty panel is itself a strong signal. On managed machines, endpoint security software is a documented possible cause, and Cursor publishes an endpoint-security page with the exclusions IT can add.

## How to report it so someone can actually look

If none of the checks above changes the behaviour, file a report with the data Cursor's team asks for:

- **Request ID**: hover the stuck response, open the **…** menu and choose **Copy Request ID**. With Privacy Mode on, the team can see the model and whether tool failures occurred, but not what failed; connectivity problems can often still be diagnosed. For agent-behaviour bugs, Cursor's guidance is to temporarily enable Share Data, reproduce, copy the new Request ID, then switch back. Privacy settings are applied per request, so an ID from before you switched will not gain visibility retroactively.
- **Logs**: **Developer: Export Logs…** with Main, Window and Extension Host selected (plus the Remote entries if you use Remote SSH).
- **Diagnostics output**: the full text from Run Diagnostics, even if it passed.
- **Version and OS**: the exact version string from About, and whether the machine is on a VPN, proxy or corporate network.

Post it in the forum's Bug Reports category. Threads with a Request ID and logs are the ones that got staff replies in every example linked above.

## Frequently Asked Questions

### Why does the agent hang when Run Diagnostics says everything passed?

Because the diagnostics open short connections, while the agent streams over one persistent connection that stays open much longer. A proxy, VPN or security tool can let the short checks through and still cut the stream after a timeout. The hotspot test (VPN off, full restart, retry) is the quickest way to prove or rule this out.

### Does Cursor use my credits while it is stuck on "Planning next moves"?

It can. One user reported stalled requests that "used millions of tokens, costing a lot with no actual result" before timing out with "Connection stalled". If a request has been frozen for several minutes, stop it rather than waiting indefinitely, then check your usage page.

### Should I roll back to an older Cursor version?

Only when the hang started with a specific update, affects every project, and the forum shows a confirmed regression for that build, as happened with 2.4.21 in January 2026. Treat it as a temporary measure and update again once a fix is confirmed.

### Is "Planning next moves" slower with some models?

Model choice changes how long a legitimate planning step takes, but a true hang (no progress for ten minutes on a trivial task) is not a model problem. If a specific provider is listed as degraded on the status page, switching models is reasonable; otherwise work through the network, indexing, MCP and extension checks first.

### Why does it only hang when I work over SSH or on a Raspberry Pi?

AI requests go from your local machine to Cursor's servers, but indexing and file access depend on the remote host. Cursor's docs list memory or CPU exhaustion on the remote and dropped SSH sessions as causes, suggest raising `ServerAliveInterval` in your SSH config, and recommend restarting Cursor after any reconnect. The January 2026 indexing thread was from exactly this setup.

## Verification Notes

- The staff statements quoted here come from three public Cursor forum threads dated January 12–28, 2026 and August 6–10, 2026, plus the continuation thread from February 2026. Version numbers (2.3.34, 2.3.35, 2.3.41, 2.4.7, 2.4.21, 2.4.22, 2.4.27, 3.14.27) are as reported by the posters.
- Settings names (**HTTP Compatibility Mode**, **Run Diagnostics**, **Copy Request ID**, **Developer: Export Logs…**, **MCP Logs**) and the allowlisted domains were checked against Cursor's help and docs pages on October 24, 2026. Menu locations change between releases; if a setting has moved, search for it from the command palette.
- Status-page incidents were read from status.cursor.com on October 24, 2026. The individual user reports about MCP servers, token usage and context length are single accounts, not measurements, and are labelled as such above.
- No fix here is guaranteed. The ordering is based on which steps actually resolved the linked threads and how cheap each step is to try.

## Sources and Further Reading

- Cursor forum: [Cursor Agent stuck on "Planning next move"](https://forum.cursor.com/t/cursor-agent-stuck-on-planning-next-move/167632) (August 2026, VPN/proxy diagnosis and resolution)
- Cursor forum: [Cursor Agent stuck in "Planning Next Moves"](https://forum.cursor.com/t/cursor-agent-stuck-in-planning-next-moves/150064) (January 2026, staff workaround list)
- Cursor forum: [Agent hanging at Planning next moves due to Indexing](https://forum.cursor.com/t/agent-hanging-at-planning-next-moves-due-to-indexing/148696) (January 2026, indexing confirmation)
- Cursor forum: [Constantly stuck in "Planning Next Moves" or "Generating…"](https://forum.cursor.com/t/constantly-stuck-in-planning-next-moves-or-generating/149407) (January–February 2026, rollback and MCP reports)
- Cursor help: [Network, proxy, and remote connections](https://cursor.com/help/troubleshooting/network)
- Cursor help: [Agent troubleshooting](https://cursor.com/help/troubleshooting/agent-issues)
- Cursor help: [Reporting a bug](https://cursor.com/help/troubleshooting/reporting-bugs)
- Cursor help: [Performance](https://cursor.com/help/troubleshooting/performance)
- Cursor help: [MCP integrations](https://cursor.com/help/customization/mcp)
- Cursor docs: [Network configuration](https://cursor.com/docs/enterprise/network-configuration)
- [Cursor status page](https://status.cursor.com/)
- Related on ByteVerse: [How to use Cursor AI](/blog/how-to-use-cursor-ai-2026-guide), [GitHub Copilot not working in VS Code](/blog/github-copilot-not-working-vscode-2026), [Claude Code not recognized on Windows](/blog/claude-code-not-recognized-windows-2026)
