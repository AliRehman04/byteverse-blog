On Windows, Ollama keeps every model you pull in **`C:\Users\<you>\.ollama\models`**. One 70B-class download can be 40 GB, so a C: drive that was fine last month can fill up quietly. Moving the folder is supported, but the move fails in a predictable set of ways: pointing at the wrong level of the folder tree, forgetting that the tray app must be fully quit, and, since mid-2025, a **Model location** setting inside the Ollama desktop app that silently overrides the `OLLAMA_MODELS` environment variable.

This guide covers the exact default paths, the two ways to change them (environment variable and the app's Settings page), how to move existing models without downloading them again, and the checks that confirm which folder Ollama is actually using. Every step was verified against Ollama's current Windows documentation and the GitHub issues linked at the end.

## Where Ollama stores models on Windows

| What | Default location | Notes |
| --- | --- | --- |
| Downloaded models | `C:\Users\<you>\.ollama\models` | Contains `blobs\` (the large layer files) and `manifests\` (small JSON files that tie a model name to its blobs) |
| Keys, history and config | `C:\Users\<you>\.ollama` | `id_ed25519`, `id_ed25519.pub`, `history`. These are **not** the models folder |
| Program files | `%LOCALAPPDATA%\Programs\Ollama` | Added to your user `PATH` by the installer |
| Logs and app settings | `%LOCALAPPDATA%\Ollama` | `server.log`, `app.log`, `upgrade.log`, and the desktop app's `db.sqlite` settings database |

Open any of these quickly with Win+R, then `explorer %HOMEPATH%\.ollama\models` or `explorer %LOCALAPPDATA%\Ollama`.

The distinction between `.ollama` and `.ollama\models` matters more than it looks. The models directory is the one that contains `blobs` and `manifests`. If you later point Ollama at the parent `.ollama` folder instead, it will create an empty `blobs` and `manifests` pair there and `ollama list` will come back empty, even though your models are a level below. That exact mistake is behind several "OLLAMA_MODELS not respected" reports on GitHub, including one from March 2025 that the reporter closed themselves after noticing their variable ended in `\OllamaModels` instead of `\OllamaModels\models`.

## Step 1: Check how much space the models use

Before moving anything, see what you have:

```powershell
ollama list
Get-ChildItem "$env:USERPROFILE\.ollama\models" -Recurse | Measure-Object -Property Length -Sum | ForEach-Object { "{0:N1} GB" -f ($_.Sum / 1GB) }
```

The first command lists models with their sizes as Ollama sees them. The second sums the actual bytes on disk, which is what you need free on the destination drive. Delete anything you no longer use with `ollama rm <name>` first; it is faster than copying it.

## Step 2: Decide on the destination folder

Create the folder yourself, and make it the **models** folder, not a parent:

```powershell
New-Item -ItemType Directory -Force "D:\ollama\models" | Out-Null
```

Three rules save the most time:

- **Use a plain drive-letter path** such as `D:\ollama\models`. Since Ollama 0.40.0, a models path that passes through an NTFS mount point or directory junction (for example `C:\mnt\hdd0\models`) makes `ollama list` return nothing, because the manifest reader fails to resolve the path. The bug report from October 2026 confirms the same folder works when addressed by its drive letter; a fix is in review but, as of this writing, has not shipped in a release.
- **Prefer an internal drive or a drive that is always connected.** An August 2025 report describes the desktop app failing to start with a blank window when its model location pointed at a disconnected external drive.
- **Avoid paths that need special permissions.** The Windows installer runs without administrator rights and Ollama runs as your user, so a folder under your own profile or a drive you own is simplest. Permissions problems are mostly a Linux concern (the `ollama` service user there must own the directory), but a folder created by another Windows account can still bite.

## Step 3: Move the existing models (no re-download)

Quit Ollama completely first: click the Ollama icon in the system tray and choose **Quit Ollama**. Closing the chat window is not enough; the server keeps running in the tray.

![Portable external drive connected by cable to a laptop, next to a notebook and pen](https://www.byteverse.fyi/blog/ollama-models-folder/photo-inline.jpg "A portable drive plugged into a laptop. Ollama can serve models from a drive like this, as long as it stays connected. Photo: Arina Krasnikova / Pexels.")

Then move the contents of the old models folder into the new one, preserving the `blobs` and `manifests` structure:

```powershell
robocopy "$env:USERPROFILE\.ollama\models" "D:\ollama\models" /E /MOVE /R:1 /W:1
```

`robocopy /E /MOVE` copies every subfolder and deletes each source file only after it has been copied, so an interrupted run leaves you with two partial folders rather than lost files; run the same command again to finish. Expect the time to be dominated by the blob sizes; a 20 GB move between two SSDs is a couple of minutes, to a hard drive considerably longer. When it finishes, `D:\ollama\models\blobs` should contain the `sha256-…` files and `D:\ollama\models\manifests\registry.ollama.ai\library\<model>\<tag>` should hold the manifest files.

Leaving the old folder empty (or removing it) is deliberate. A March 2026 comment on the Windows issue notes that with the old `models` directory still populated, the new location appeared to be ignored; whether that was the app setting described below or a stale cache, an empty old folder removes the ambiguity.

Do not copy `id_ed25519`, `id_ed25519.pub` or `history` into the models folder. They belong in `.ollama` and Ollama will keep reading them from there.

## Step 4: Tell Ollama where the models now live

There are two places Ollama on Windows can read the models path from, and they do not agree with each other automatically.

### Option A: the OLLAMA_MODELS environment variable (documented method)

Ollama's Windows documentation describes this method:

1. With Ollama quit, open **Settings** (Windows 11) or **Control Panel** (Windows 10) and search for *environment variables*.
2. Choose **Edit environment variables for your account**.
3. Under *User variables*, create `OLLAMA_MODELS` with the value `D:\ollama\models` (no quotes, no trailing backslash needed).
4. Click **OK** to close every dialog.
5. Start Ollama from the Start menu. Any terminal you use for `ollama` commands must also be opened **after** saving the variable, because an existing PowerShell window still has the old environment.

A user variable is the right scope for the tray app, which runs as you. A system (machine) variable also works but is only required when a separate service account runs `ollama serve`.

### Option B: Settings → Model location in the desktop app

The redesigned Ollama app that shipped with version 0.10 in July 2025 has a Settings page with a **Model location** field. Changing it there and saving is the quickest route for people who never touch environment variables.

The catch is precedence. A detailed root-cause trace posted on GitHub in July 2026 found that when the desktop app launches the server, it copies the stored Model location over `OLLAMA_MODELS`, and that the stored value is filled in with the default `C:\Users\<you>\.ollama\models` the first time any setting is saved. From then on, the environment variable is ignored by the app even though `ollama serve` started by hand in a terminal still honours it. An August 2026 report (Ollama 0.31.1) confirmed the practical fix: set **Settings → Model location** to the same path as `OLLAMA_MODELS`, and the app immediately found the existing models, including after a restart. A pull request to make the environment variable win when it is set was open at the time of writing.

**Recommendation:** set both to the identical path. The environment variable covers the CLI, scripts and anything that starts `ollama serve` itself; the app setting covers the server the tray app launches. If they differ, the symptom is an app that shows no models while the terminal does, or the reverse.

## Step 5: Verify which folder is actually in use

Start Ollama, open a **new** terminal, and run:

```powershell
ollama list
```

If your models appear, the move worked. If the list is empty, do not pull anything yet; a pull would download into whichever folder is active and hide the problem. Check the server log instead:

```powershell
Select-String -Path "$env:LOCALAPPDATA\Ollama\server.log" -Pattern "OLLAMA_MODELS" | Select-Object -Last 1
```

The first `server config` line in each log session prints every setting the server started with, including `OLLAMA_MODELS:D:\ollama\models`. That line is the ground truth: it tells you what the running server believes, regardless of what PowerShell's `$env:OLLAMA_MODELS` shows. A mismatch between the two is almost always the app setting from Option B.

| Symptom after moving | Most likely cause | Fix |
| --- | --- | --- |
| `ollama list` empty, log shows the **old** path | Tray app still had the old environment, or Settings → Model location still points at `C:` | Quit from the tray, confirm the variable, set the app's Model location to the new path, relaunch |
| `ollama list` empty, log shows the **new** path | Path points at the parent folder, or the `blobs`/`manifests` structure was not preserved | Point at the folder that directly contains `blobs` and `manifests` |
| `ollama list` empty, path contains a mount point or junction | Manifest resolver bug since 0.40.0 | Use the drive-letter path to the same folder |
| Models visible in the terminal but not in the app | Environment variable and app setting disagree | Make both identical |
| App opens to a blank window | Model location on a drive that is not connected | Reconnect the drive or change the setting |
| `ollama pull` works but old models are missing | Pull went to the active folder; the old ones are elsewhere | Find the old folder with the log line and move them into the active one |

## Moving models to another PC, or sharing one folder

Because the models folder is self-contained (blobs plus manifests), you can copy it to another Windows machine and point that installation at it with the same two settings. Keep the folder structure intact and copy the whole `manifests` tree, not only `blobs`; a blob without its manifest is invisible to `ollama list`.

Sharing one folder between Windows and WSL or Docker is a different situation. Each of those runs its own Ollama server with its own `OLLAMA_MODELS`, and a Linux server expects Linux paths and permissions. It works, but treat it as three separate configurations rather than one move. If GPU use is the reason you are juggling environments, our guide to [Ollama not using the GPU on Windows](/blog/ollama-not-using-gpu-windows-2026) covers how to tell which server you are actually talking to.

## Uninstalling or reinstalling after a move

Ollama's documentation notes that if you have changed `OLLAMA_MODELS`, the uninstaller does **not** remove your downloaded models. That is convenient for a reinstall, but it also means a moved folder keeps its tens of gigabytes until you delete it yourself. After a reinstall, repeat Step 4; a fresh install does not recreate the app's Model location setting from your environment variable on every start.

## Frequently Asked Questions

### Can I just move the whole .ollama folder to another drive?

Moving the whole folder is not the documented path and leaves the keys and history where Ollama does not look for them. Move only the `models` subfolder and point the environment variable from Step 4 (and the app's Model location) at the new `models` folder, the one that directly contains `blobs` and `manifests`.

### Why does ollama list show nothing after I set OLLAMA_MODELS?

The three common causes are a path that points one level too high (at `.ollama` instead of `.ollama\models`), a tray app or terminal that was not restarted after the change, and the desktop app's Model location still pointing at the default. The `server config` line in `%LOCALAPPDATA%\Ollama\server.log` shows which path the running server is using.

### Does the app's Model location setting replace the environment variable?

In current Windows releases the app's stored setting is what the server started by the tray app uses, so it can override the environment variable. A terminal that runs `ollama serve` directly uses the environment variable. Setting both to the same folder avoids the conflict; a change to prefer the environment variable has been proposed but was not in a shipped release when this was written.

### Will moving models to a hard drive make Ollama slower?

Loading a model reads its blobs from disk once, so the first load of each session is slower from a hard drive than from an SSD; after that the model sits in RAM or VRAM and generation speed is unaffected. If you switch between large models often, keep them on an SSD.

### Can I use a symbolic link or junction instead of changing the setting?

You can, but on Windows it is currently risky: Ollama 0.40.x fails to list models when the models path crosses a junction or NTFS mount point, and a reporter confirmed the identical folder works through its drive letter. Until the fix ships, change the setting to the real path instead of linking.

## Verification Notes

- Default paths, the environment-variable procedure, the "quit the tray application and relaunch" requirement and the uninstaller behaviour come from Ollama's Windows and FAQ documentation, read on October 25, 2026.
- The parent-folder mistake, the app Model location precedence (root-cause trace July 2026, confirmed workaround August 2026 on 0.31.1), the blank-window report for disconnected drives, and the NTFS mount point regression (0.40.0 onward, reported October 2026 with a fix in review) are all public GitHub issues linked below. Version numbers are as reported by the posters.
- The `robocopy` and `Select-String` commands are standard Windows tooling; adjust the destination path to your own drive. Timings for the move depend on your drives and were not benchmarked.
- Ollama ships frequently. If a release changes the precedence between the app setting and the environment variable, the log-line check in Step 5 remains the reliable way to see what is active.

## Sources and Further Reading

- Ollama docs: [Windows](https://docs.ollama.com/windows) (Changing Model Location, Troubleshooting file locations, Uninstall note)
- Ollama docs: [FAQ](https://docs.ollama.com/faq) (Where are models stored, setting environment variables on Windows)
- Ollama docs: [Troubleshooting](https://docs.ollama.com/troubleshooting) (log locations on Windows)
- GitHub: [OLLAMA_MODELS directive not respected (Windows) #9889](https://github.com/ollama/ollama/issues/9889) (parent-folder mistake; later comments)
- GitHub: [Change models folder via ollama gui does not change the models folder for the command line #12154](https://github.com/ollama/ollama/issues/12154)
- GitHub: [Ollama on Windows not respecting OLLAMA_MODELS environmental variable #17374](https://github.com/ollama/ollama/issues/17374) (root-cause trace and proposed fix)
- GitHub: [Windows desktop app Model location overrides OLLAMA_MODELS #17867](https://github.com/ollama/ollama/issues/17867) (confirmed workaround)
- GitHub: [App fails to start if model location is set to a disconnected external drive #11836](https://github.com/ollama/ollama/issues/11836)
- GitHub: [ollama list returns empty when Model location is an NTFS mount point path #18921](https://github.com/ollama/ollama/issues/18921)
- Ollama blog: [Ollama's new app](https://ollama.com/blog/new-app) (July 2025)
- Microsoft Learn: [robocopy](https://learn.microsoft.com/windows-server/administration/windows-commands/robocopy)
- Related on ByteVerse: [Ollama not using GPU on Windows](/blog/ollama-not-using-gpu-windows-2026), [How to run AI locally](/blog/how-to-run-ai-locally-2026)
- Photos: cover by [Przemek Leśniewski](https://www.pexels.com/@lesior/) via Pexels; inline by [Arina Krasnikova](https://www.pexels.com/@arina-krasnikova/) via Pexels. Illustrative photographs, not Ollama screenshots.
