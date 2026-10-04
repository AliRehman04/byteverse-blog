If **Copilot in Excel is not showing**, start with the two causes Microsoft now lists first: the button moved, or your account does not actually include Copilot in Excel. Since the April–June 2026 rollout, Copilot opens from a **Dynamic Action Button in the lower-right corner of the workbook**, not from the Home tab. And a Microsoft 365 subscription alone is not enough: a work account labelled **Copilot Chat (Basic)** has no Copilot in Excel at all, and a personal Family plan only gives Copilot to the subscription owner.

**Start here:** look in the lower-right corner of the grid, then press **Alt + C** (Windows) or **Cmd + Control + I** (Mac) to focus the button. If nothing gains focus or opens, check your license label before you reinstall anything. If you are searching because `=COPILOT(...)` returns `#NAME?`, that is not a bug on your machine: Microsoft retired the COPILOT function on **September 14, 2026**.

This is a documentation-based troubleshooting guide, checked on **October 4, 2026**, against Microsoft's current support and admin pages—not a hands-on test of every Excel build or tenant. Where Microsoft's documents leave a question open, the article says so.

## Match your symptom before you change anything

The phrase "Copilot not showing" covers at least six different situations. Pick the row that matches yours first.

| What you see | Most likely explanation | Where to start |
|---|---|---|
| No Copilot anywhere on the ribbon | The button moved to the lower-right corner in 2026 | Section 1 |
| Button missing everywhere, work account | License label, update channel, or admin policy | Sections 2, 3 and 5 |
| Button missing, personal Microsoft account | Not the subscription owner, or "Enable Copilot" is cleared | Sections 2 and 4 |
| Button exists but says "Unsupported file state" | SharePoint check-out or a non-.xlsx format | Section 6 |
| Copilot opens but will not edit the workbook | Calculation Options not set to Automatic | Section 6 |
| `=COPILOT()` shows `#NAME?` | The function was retired on September 14, 2026 | Section 7 |
| Works in Excel for the web, not on desktop | Semi-Annual Enterprise Channel or privacy settings | Sections 3 and 4 |

## 1. Look in the lower-right corner first

Microsoft's own troubleshooting page now opens with this: "The button moved, so it might not be missing." Copilot in Word, Excel and PowerPoint has been consolidated into one entry point, the **Copilot Dynamic Action Button**, anchored in the corner of the document. Microsoft says the worldwide rollout began in **April 2026** and was scheduled to complete by **June 2026** on Windows, Mac and the web. GCC, GCC High and DoD tenants see it from October 2026.

Three things make this button easy to lose:

- **Docking.** Right-click the button and choose **Dock**, or drag it to the side of the sheet, and it shrinks to a small docked icon for the rest of the session. If a colleague docked it, it is still there—just small.
- **Move to ribbon.** Right-click and choose **Move to ribbon** to put it back next to the tabs. On Windows this needs Build 16.0.20129.15140 or later; on macOS, Build 16.109.525.2 or later. Windows and Mac remember the choice per app; the web currently remembers it for the session only.
- **Keyboard.** **Alt + C** on Windows, **Cmd + Control + I** on Mac, and **F6** everywhere moves focus to the button. Microsoft notes the older Alt + H, F, X path is replaced by F6 while the new shortcuts finish rolling out across languages.

If the button appears once you know where to look, you are done. If it is absent on every workbook and every app, continue.

## 2. Check which Copilot license you actually have

This is where most "missing Copilot" reports end. Microsoft's FAQ for Copilot in Excel lists four eligible situations: a **Microsoft 365 Personal or Family subscription with an AI credits plan**, a **Microsoft 365 Premium** subscription, a **commercial Microsoft Copilot subscription** (the add-on formerly called Microsoft 365 Copilot), or a **Copilot Chat-eligible business or enterprise plan**. The experience you get differs between those, and the in-product label tells you which one you have.

### Work or school accounts

Sign in at Microsoft 365 with your work account and scroll to the bottom of the home page. Microsoft documents three labels:

- **Copilot Chat (Basic)** — "You don't have the Microsoft Copilot add-on license and don't have access to Copilot in Word, Excel, PowerPoint and OneNote." If this is your label, the button is not missing; it was never included.
- **M365 Copilot (Basic)** — no add-on license, but **standard access** to Copilot in the apps, including Excel.
- **M365 Copilot (Premium)** — the add-on license with priority access and model choice.

Which eligible plans produce which label depends on tenant configuration, so the label is the ground truth, not the plan name on your invoice. Microsoft's requirements page also states that Microsoft Copilot "isn't available with device-based licensing for Microsoft 365 Apps for enterprise" and requires a **Microsoft Entra ID account**—a non-Entra account will not show it.

### Personal Microsoft accounts

For Microsoft 365 Personal, Family and Premium, Microsoft's license page says only the subscription owner can use Copilot in the desktop apps, and its AI credits page is blunter: **"AI benefits are only available to the subscription owner and cannot be shared with others."** A Family member who was added to someone else's subscription can open Excel normally but will not see Copilot. Check **Services & subscriptions** in your Microsoft account to see what you own and how many AI credits remain; in Windows 11 the Start menu account tile also shows the subscription.

If the account is right and the label says you should have access, move on to the refresh steps.

![Laptop screen showing a dashboard of charts and tables](https://images.pexels.com/photos/7947999/pexels-photo-7947999.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Illustration: RDNE Stock project / Pexels")

## 3. Refresh the license, update the build, check the channel

Microsoft's "How to find and enable missing Copilot button" page gives four steps, in this order:

1. **Install the latest build.** On Windows go to **File > Account > Update Options > Update Now**; on Mac use **Help > Check for Updates**. If Update Options is missing, updates are managed by your organization.
2. **Refresh the license.** In any Microsoft 365 app, choose **File > Account > Update License**, then close and restart every Microsoft 365 app. A license that was assigned today may not reach your desktop until this refresh happens.
3. **Business users: check the update channel.** Open **File > Account** and read the Product Information block. If it mentions **Semi-Annual Enterprise Channel**, Microsoft states that Copilot features "are not available in your apps" on that channel. You need **Current Channel** or **Monthly Enterprise Channel**, and Microsoft points you to your help desk to move the device. Until then, Excel for the web works without a channel change.
4. **Check privacy settings** (next section).

Microsoft's admin requirements add one quieter prerequisite: the **Office Feature Updates** scheduled task must run on schedule and be able to reach its network resources for core Copilot experiences in Word, Excel and PowerPoint. If your organization disables scheduled tasks or blocks their endpoints, that prerequisite is not met—our inference from the requirement, not a documented error message. That is an administrator conversation, not a setting you can flip.

## 4. Privacy settings and the "Enable Copilot" checkbox

Two account privacy settings hide Copilot entirely. On Windows open **File > Account > Account Privacy > Manage Settings** (on Mac, **Excel > Preferences > Personal Settings > Privacy > Manage Connected Experiences**) and confirm that **Experiences that analyze your content** is turned on, then scroll down and confirm **All connected experiences** is also on. Both have to be enabled. If your Microsoft 365 is managed by an organization, Microsoft notes these settings are controlled by your IT admin; you may see them greyed out.

Personal accounts have a second, more specific switch. Since March 13, 2025, Excel has had an **Enable Copilot** checkbox:

- **Windows:** **File > Options > Copilot**, then select **Enable Copilot**, click OK, and restart Excel. Available from Excel Version 2501.
- **Mac:** **Excel > Preferences > Authoring and Proofing Tools > Copilot**, then select **Enable Copilot** and restart. Available from Version 16.93.2.

Microsoft is explicit that this checkbox is **per app and per device**: clearing it in Word does not affect Excel, and turning it off on one PC turns it off for everyone who uses that PC. So if a family member or a previous owner of the laptop cleared it, Excel on that machine shows no Copilot even though your account is fine. The checkbox is not shown when you are signed in with a work or school account; there, the admin controls apply.

## 5. When the admin or the network is the reason

Some causes are invisible from the user's side. Microsoft's management documentation lists several that produce exactly the "no Copilot in Excel" symptom:

- **Copilot in Excel cannot be disabled on its own.** Microsoft's FAQ says "Copilot in Excel is a Microsoft Copilot Chat tool and can't be turned off independently. All admin settings for controlling access to Microsoft Copilot Chat apply." If your tenant limits Copilot Chat to specific groups or blocks it, Excel loses Copilot too; the FAQ does not carve out an exception for add-on license holders.
- **Network allow-lists.** The requirements page asks admins to allow the whole `*.cloud.microsoft` domain, verify that `copilot.cloud.microsoft` is not blocked by URL filters, proxies or Conditional Access, and keep full **WebSocket Secure** connectivity to `*.office.com` and `*.cloud.microsoft`. TLS inspection and aggressive proxy timeouts are named as causes of failed integrations. Microsoft also says it "doesn't support allowing only selected Microsoft 365 application URLs within the `*.cloud.microsoft` domain"; allow the entire domain.
- **Excel for the web** additionally needs **third-party cookies** enabled in the browser.
- **The diagnostic admins should run.** Microsoft publishes a **Copilot License Details** diagnostic (`aka.ms/CopilotLicenseDetails`) that checks whether a specific user account meets the licensing requirements. Asking IT to run it for your account is faster than another reinstall.

One naming note that causes real confusion in support tickets: Microsoft has renamed **Microsoft 365 Copilot** to **Microsoft Copilot**, and the app's primary URL is moving to `copilot.cloud.microsoft`. Older internal guides, policies and firewall rules may still reference the old names and URLs. And none of this has anything to do with GitHub Copilot in your code editor; if that is the tool you lost, our [GitHub Copilot not working in VS Code guide](/blog/github-copilot-not-working-vscode-2026) covers a completely different sign-in and extension stack.

![Professional comparing a chart on a laptop with another on a tablet](https://images.pexels.com/photos/6930431/pexels-photo-6930431.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Illustration: Mikhail Nilov / Pexels")

## 6. The button is there, but Copilot will not work on this workbook

If Copilot appears in some files and not others, the file is the variable, not the license.

**"Unsupported file state."** Microsoft's FAQ gives two causes. The first is a workbook that is **checked out in SharePoint**: check it back in, then close and reopen it; if you cannot check it in, open the file in Excel for the web. If your site *requires* check-out for editing, Copilot in Excel on Windows and Mac will not work for files from that site, but Excel for the web still can. The second is an unsupported format such as **Strict Open XML Spreadsheet**: save a copy as a standard **Excel Workbook (.xlsx)**.

**Copilot opens but refuses to edit.** The FAQ states that "Copilot editing is only supported when Calculation Options are set to Automatic." A model set to Manual calculation, often inherited from a large financial workbook, blocks edit mode; the FAQ does not say whether chat mode is affected. Change it under **Formulas > Calculation Options > Automatic**, or ask Copilot in chat-only mode and see whether it answers.

**Changes appear for everyone.** Because Copilot in Excel edits the workbook directly, anyone in a co-authoring session sees the changes. If it did something unexpected, use Undo immediately or restore a previous version from the file's version history rather than trying to prompt your way back.

## 7. `=COPILOT()` shows `#NAME?`: the function was retired

A large share of "Copilot formula not showing" searches are about the **COPILOT function**, which let you write prompts in a cell. Microsoft's reference page now says: "Starting September 14, 2026, the COPILOT function is no longer available in Microsoft Excel." It was a preview feature, available only through the Frontier program and the Microsoft 365 Insider program, so it was never present in most production installs anyway.

What happens to existing workbooks, according to the same page:

```text
Cell with =COPILOT("Classify sentiment", B2:B100)

Before Sept 14, 2026 : returned an AI result in the cell
After recalculation  : #NAME?  (function no longer recognized)
Cached values        : remain until the cell recalculates
```

There is no setting, build or Insider channel that brings it back. Microsoft's replacement is the Copilot pane: open Copilot in Excel and ask, in plain words, for the same outcome—"Classify each of the sentiment entries in B2:B100 and add the result in a new column." The pane can write the result into the sheet in edit mode, and it can show a plan first if you choose plan mode. If a template or tutorial you follow still uses `=COPILOT(`, treat it as out of date.

![Overhead view of two laptops surrounded by printed charts and a clipboard](https://images.pexels.com/photos/8062289/pexels-photo-8062289.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Illustration: Nataliya Vaitkevich / Pexels")

## 8. Mac-specific checks

Excel for Mac supports edit, chat and plan modes, so a missing Copilot on Mac is a configuration problem, not a platform limit. Work through the same license label check first. Then:

- Use **Cmd + Control + I** or **F6** to reach the Dynamic Action Button (see Section 1 for docking and Move to ribbon).
- For personal accounts, the **Enable Copilot** checkbox lives under **Excel > Preferences > Authoring and Proofing Tools > Copilot**; the privacy switches are described in Section 4.
- Run **Help > Check for Updates** and confirm the version under **Excel > About Excel** before contacting support.

Mobile is different again: Excel on iPad offers chat and plan modes, iPhone and Android offer chat mode, and Microsoft notes edit mode is still rolling out to iPad and iPhone. You cannot turn Copilot off in the iOS, Android or web versions, so a missing Copilot there is almost always a license or tenant question.

## While you wait for a license or an admin

If the label says Copilot Chat (Basic) and your organization is not buying add-on licenses this quarter, you still have options that do not touch your tenant's settings. Pasting a de-identified sample into ChatGPT or Claude for formula generation, and verifying the result in Excel, is the workflow we describe in our [guide to using AI in Excel and Google Sheets](/blog/how-to-use-ai-in-excel-google-sheets-2026); it works with any Excel edition. If your team is evaluating tools beyond Copilot, our [best AI spreadsheet tools roundup](/blog/best-ai-spreadsheet-tools-2026) compares them by task rather than by brand. Keep the privacy rules in mind: a missing Copilot button is not a reason to paste payroll data into a consumer chatbot.

Two unrelated Excel features are often confused with Copilot in support threads. **Formula completion** and **Formula by Example** are separate Copilot formula suggestions with their own checkboxes under **File > Options > Copilot** on Windows (or Copilot Settings in Excel for the web), and Microsoft notes they stay off until you turn them back on the same way; a missing suggestion card does not mean the Copilot pane is gone. And a missing **Data > Get Data > From PDF** entry is a Power Query connector question, not a Copilot one; if that is what you cannot find, our [Excel Get Data From PDF missing guide](/blog/excel-get-data-from-pdf-missing-2026) walks through the platform and edition rules for that connector.

![Person pointing at a laptop screen full of data beside a printed report](https://images.pexels.com/photos/7693224/pexels-photo-7693224.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Illustration: Yan Krukau / Pexels")

## What to send IT or Microsoft support

A ticket that includes the following usually gets a real answer instead of "try reinstalling":

- The **exact label** shown under your name at Microsoft 365 (Copilot Chat (Basic), M365 Copilot (Basic) or M365 Copilot (Premium)), or for personal accounts whether you are the subscription owner.
- **Platform, version and channel** from File > Account (or Excel > About Excel on Mac), including whether it says Semi-Annual Enterprise Channel.
- Whether the button appears in **Excel for the web** with the same account. If yes, the problem is on the device; if no, it is the account or tenant.
- The state of **Experiences that analyze your content** and **All connected experiences**, and whether they are editable or greyed out.
- The exact message, if any: "Unsupported file state", a `#NAME?` in a formula cell, or nothing at all.
- A request to run the **Copilot License Details** diagnostic for your account.

Do not include workbook contents, customer data or screenshots of the sheet itself; the diagnosis never needs them.

## Frequently Asked Questions

### Why is the Copilot button not showing in Excel?

Microsoft lists two main reasons: the button moved to the lower-right corner of the workbook during the 2026 Dynamic Action Button rollout, or your account lacks an eligible license. Work accounts labelled Copilot Chat (Basic) do not include Copilot in Excel, and personal Family subscriptions only give it to the subscription owner. Update channel and privacy settings are the next checks.

### Where is Copilot in Excel now?

Since mid-2026 it opens from the Copilot Dynamic Action Button in the lower-right corner of the grid, on Windows, Mac and the web. Press Alt + C on Windows, Cmd + Control + I on Mac, or F6 anywhere to focus it. Right-click the button and choose Move to ribbon if you prefer the old location.

### Do I need a Microsoft 365 Copilot license to use Copilot in Excel?

Not always. Microsoft's FAQ says Copilot in Excel requires a Personal or Family plan with an AI credits plan, Microsoft 365 Premium, a commercial Microsoft Copilot add-on, or a Copilot Chat-eligible business or enterprise plan. The in-product label (Basic versus Premium) shows which experience you have; some eligible users get standard access without the add-on.

### Why does Copilot show in Excel for the web but not on my desktop?

The most common documented reason is the update channel: on Semi-Annual Enterprise Channel, Copilot features are not available in desktop apps, while the web versions work. Privacy settings that are turned off in your desktop apps, a stale license that needs File > Account > Update License, or a blocked scheduled update task can produce the same split.

### Why does the COPILOT function return #NAME? in Excel?

Microsoft retired the COPILOT function on September 14, 2026. It was a preview available only in the Frontier and Microsoft 365 Insider programs. Previously calculated results stay as cached values, but any recalculation returns #NAME? because Excel no longer recognizes the function. Use the Copilot pane for the same tasks instead.

### How do I turn Copilot back on in Excel with a personal account?

On Windows go to File > Options > Copilot and select Enable Copilot; on Mac go to Excel > Preferences > Authoring and Proofing Tools > Copilot. Restart Excel afterwards. The setting is per app and per device, so repeat it on every machine. Also confirm the connected-experiences privacy settings are on.

### Can my IT admin turn off Copilot only in Excel?

According to Microsoft's FAQ, no: Copilot in Excel is a Microsoft Copilot Chat tool and cannot be turned off independently. Admins control it through the Copilot Chat access settings, which apply across apps. If Copilot Chat is limited to certain groups or blocked, Excel loses Copilot as well.

### What does "Unsupported file state" mean in Copilot for Excel?

Microsoft gives two causes: the workbook is checked out in SharePoint, or it is saved in an unsupported format such as Strict Open XML Spreadsheet. Check the file back in or save it as a standard .xlsx workbook. If your SharePoint site requires check-out, use Excel for the web with those files.

## Sources and Image Credits

Microsoft documentation reviewed on October 4, 2026: [Get started with Copilot in Excel](https://support.microsoft.com/en-us/excel/copilot/get-started-with-copilot-in-excel), [Frequently asked questions about Copilot in Excel](https://support.microsoft.com/en-us/excel/copilot/frequently-asked-questions-about-copilot-in-excel), [How to find and enable missing Copilot button in Microsoft 365 apps](https://support.microsoft.com/en-us/topic/c8482b93-4b96-4bb8-8ec9-5148f4d42441), [The Copilot Dynamic Action Button in Word, Excel and PowerPoint](https://support.microsoft.com/en-us/topic/40db4cef-3d59-474d-9dec-f649b5bfab8e), [What Copilot license do I have](https://support.microsoft.com/en-us/topic/5058f273-5e28-4a9d-9de6-bf07478ae152), [COPILOT function](https://support.microsoft.com/en-us/excel/copilot-function), [Turn off Copilot in Microsoft 365 apps](https://support.microsoft.com/en-us/topic/bc7e530b-152d-4123-8e78-edc06f8b85f1), [AI credits and limits for Microsoft 365 subscriptions](https://support.microsoft.com/en-us/microsoft-365-copilot/ai-credits-and-limits-for-microsoft-365-subscriptions), [Turn Copilot formula suggestions on or off in Excel](https://support.microsoft.com/en-us/excel/copilot/copilot-formula-suggestions-turn-on-off), [Microsoft Copilot requirements](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-requirements) and [Manage Microsoft Copilot Chat](https://learn.microsoft.com/en-us/copilot/manage). No tenant, network or Excel build was tested for this article; Microsoft can change rollout dates, labels and version numbers.

Photos are licensed illustrations from Pexels under the [Pexels license](https://www.pexels.com/license/), not Excel screenshots: cover by [Mikhail Nilov](https://www.pexels.com/photo/woman-looking-at-the-screen-of-her-laptop-8297058/); body images by [RDNE Stock project](https://www.pexels.com/photo/person-using-black-and-gray-laptop-7947999/), [Mikhail Nilov](https://www.pexels.com/photo/a-person-using-a-laptop-6930431/), [Nataliya Vaitkevich](https://www.pexels.com/photo/gray-laptop-beside-white-printer-paper-8062289/) and [Yan Krukau](https://www.pexels.com/photo/gray-laptop-on-the-table-7693224/).
