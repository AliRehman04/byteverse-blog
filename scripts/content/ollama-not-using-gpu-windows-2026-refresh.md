**If Ollama is not using your GPU on Windows, load a model and run `ollama ps`. `100% CPU` in the PROCESSOR column means Ollama found no GPU it is allowed to use, and `server.log` says why on the lines around "inference compute". A split such as `35%/65% CPU/GPU` means the GPU works but the model does not fit in its memory. `100% GPU` is the result you want: the whole model sits in video memory.**

Reinstalling the driver is the usual advice, but it fixes only one of the causes below. The log tells you which cause you have, so this guide starts with the log and then goes through the fixes in the order the log points to them.

I checked everything here on 23 November 2026 against the source code of Ollama 0.40.17, the newest release that day, and against Ollama's own documentation. Ollama was not installed for this article, which is why it has no screenshots. The log messages are quoted from the source code, so your log will show the same words with your own times, names and numbers.

## Check if Ollama is using your GPU

Open PowerShell, list the models you already have, run one of them and look at what is loaded:

```powershell
ollama list
ollama run llama3.2 "Say hi in five words."
ollama ps
```

Replace `llama3.2` with a model from your own list. If you type a name you do not have, Ollama starts downloading it. A loaded model stays in memory for five minutes after the last answer by default, so run `ollama ps` within that time and read the PROCESSOR column:

| PROCESSOR shows | What it means | Where to go next |
|---|---|---|
| `100% GPU` | The whole model is in GPU memory | Nothing to fix. If answers still feel slow, check its size in Fix 4 |
| `100% CPU` | Ollama is not using any GPU | Read server.log, next section |
| A split like `35%/65% CPU/GPU` | The GPU works, but part of the model did not fit | Fix 4 |
| Only the header line | No model is loaded right now | Run a model first, then check again |
| An error that it could not connect | The Ollama server is not running | See [could not connect to Ollama](/blog/could-not-connect-to-ollama-app-is-it-running) |

PROCESSOR records where the model's memory went when it loaded. It is not a live usage meter. To see the card at work, open Task Manager, go to Performance and select your GPU while Ollama is answering. Dedicated GPU memory should rise by roughly the SIZE that `ollama ps` shows. The 3D graph can stay flat during AI work, so watch the memory first.

On an NVIDIA card, `nvidia-smi` shows the same thing in MiB. A model with a SIZE of 4.9 GB takes about 4,700 MiB there. The [guide to ollama ps](/blog/ollama-ps-explained) explains SIZE, CONTEXT and the other columns in detail.

## Read the inference compute line in server.log

When the Ollama server starts, it looks for GPUs and writes one "inference compute" line for every device it will use. If no GPU passes the checks, it writes a single line for the CPU instead. Quit Ollama from the tray icon, start it again from the Start menu, and then search the new log:

```powershell
Select-String -Path "$env:LOCALAPPDATA\Ollama\server.log" -Pattern 'inference compute', 'too old', 'dropping', 'skipping CUDA', 'overrode', 'incompatible library', 'GPU discovery'
```

Here are two shortened lines with example values. The first is an NVIDIA card that Ollama will use. The second is what you get when no GPU made it through:

```txt
msg="inference compute" id=... library=CUDA compute=8.9 name=CUDA0 description="NVIDIA GeForce RTX 4070" ... type=discrete total="12.0 GiB" available="10.9 GiB"
msg="inference compute" id=cpu library=cpu compute="" name=cpu description=cpu libdirs=ollama driver="" pci_id="" type="" total="31.7 GiB" available="20.4 GiB"
```

`library` tells you the route: CUDA for NVIDIA, ROCm or Vulkan for AMD, Vulkan for Intel. `available` is the free video memory, which matters in Fix 4. If you only see `id=cpu`, the reason is in the lines before it. These are the messages the 0.40.17 source code writes, and what to do about each:

| Message in server.log | What it means | Fix |
|---|---|---|
| `NVIDIA driver too old` with `required_driver="550 or newer"` or `"570 or newer"` | Your NVIDIA driver is older than this Ollama build accepts | Fix 1 |
| `compute capability not in compiled architectures` | One of Ollama's CUDA builds does not cover your card | Harmless if another line lists the card. If none does, see Fix 2 |
| `dropping integrated GPU; to enable, set OLLAMA_IGPU_ENABLE=1` | Ollama skipped your laptop's built-in graphics on purpose | Fix 5 |
| `AMD driver is too old. Update your AMD driver to enable GPU inference.` | Your Radeon driver has the HIP 6 runtime but not HIP 7 | Fix 1 |
| `no rocblas support for gfx target` | Ollama's ROCm build does not cover your Radeon card | Fix 6 |
| `user overrode visible devices` | A variable such as `CUDA_VISIBLE_DEVICES` limits which GPUs Ollama may see | Fix 3 |
| `potentially incompatible library detected in PATH` | Another program put its own `ggml-base.dll` on your PATH | Fix 7 |
| `failure during llama-server GPU discovery` or `GPU discovery watchdog timed out` | The GPU check crashed or ran out of time | Fix 7 |

## Fix 1: Update the graphics driver

For NVIDIA, Ollama's [Windows page](https://docs.ollama.com/windows) asks for driver 551.61 or newer. The [hardware page](https://docs.ollama.com/gpu) adds a stricter rule for older cards: compute capability 5.0 to 6.2, which covers the GTX 750, 900 and 10 series, needs driver 570 or newer. The [driver check](https://github.com/ollama/ollama/blob/v0.40.17/discover/cuda_compat.go) in the source drops a CUDA card with an older driver and logs the version it wants.

Get the driver from NVIDIA or from your laptop maker, install it and restart Windows. You do not need the CUDA Toolkit. The Ollama installer brings its own CUDA libraries in folders such as `lib\ollama\cuda_v12` inside its program folder.

For AMD, ROCm acceleration on Windows needs a driver with the HIP 7 runtime. The [AMD check](https://github.com/ollama/ollama/blob/v0.40.17/discover/amd.go) is simple: if Windows can find `amdhip64_6.dll` but not `amdhip64_7.dll`, Ollama logs that the AMD driver is too old. Install the newest Radeon driver from AMD and restart. If the warning stays, your card can still run through Vulkan, as Fix 6 explains.

## Fix 2: Check that your GPU is supported

This is what the current hardware page lists for Windows:

| GPU | How Ollama can use it on Windows |
|---|---|
| NVIDIA GeForce, RTX and Quadro | CUDA, for compute capability 5.0 or newer. That starts at the GTX 750. Check your card on [NVIDIA's list](https://developer.nvidia.com/cuda-gpus) |
| AMD Radeon RX 7600, 7600 XT, 7700 XT, 7800 XT, 7900 GRE, 7900 XT and 7900 XTX | ROCm |
| AMD Radeon PRO W7500, W7600, W7700, W7800 and W7900 | ROCm |
| Other Radeon cards, including the RX 6000 and RX 9000 series | Vulkan |
| Intel Arc and other cards with a Vulkan driver | Vulkan |
| Graphics built into the processor | Skipped by default since Ollama 0.30, see Fix 5 |

Vulkan is switched on by default, and on Windows the normal graphics driver already includes it, so there is nothing extra to install. A card with no CUDA, ROCm or Vulkan support will run Ollama on the CPU, and no setting changes that.

If the log shows `compute capability not in compiled architectures` and no inference compute line names your NVIDIA card, compare its compute capability with the list above. Cards below 5.0 are too old for the CUDA builds that Ollama ships.

![GeForce RTX graphics card installed inside a desktop PC with liquid cooling](https://www.byteverse.fyi/blog/ollama-gpu/photo-inline.jpg "A discrete GPU inside a desktop PC. Ollama only uses it when the driver, runtime and model placement all line up. Photo: Andrey Matveev / Pexels.")

## Fix 3: Remove variables that hide the GPU

Old tutorials often tell people to set variables that pick or hide GPUs, and those settings keep working long after everyone forgot them. This command lists the ones Ollama reads, both for your account and for the whole PC:

```powershell
foreach ($scope in 'User', 'Machine') {
  [Environment]::GetEnvironmentVariables($scope).GetEnumerator() |
    Where-Object { $_.Name -match '^(CUDA_VISIBLE_DEVICES|HIP_VISIBLE_DEVICES|ROCR_VISIBLE_DEVICES|GGML_VK_VISIBLE_DEVICES|GPU_DEVICE_ORDINAL|HSA_OVERRIDE_GFX_VERSION|OLLAMA_VULKAN|OLLAMA_LLM_LIBRARY|OLLAMA_IGPU_ENABLE)$' } |
    ForEach-Object { "$scope  $($_.Name) = $($_.Value)" }
}
```

No output means none of them is set. If something shows up, these are the values that cause trouble:

- `-1` in `CUDA_VISIBLE_DEVICES`, `HIP_VISIBLE_DEVICES`, `ROCR_VISIBLE_DEVICES` or `GGML_VK_VISIBLE_DEVICES` hides every GPU of that kind. The hardware page gives `-1` as the way to force the CPU.
- A device number that no longer exists, for example after you swapped cards, hides the GPU as well.
- `OLLAMA_VULKAN=0` turns Vulkan off, which leaves most Radeon and Intel cards on the CPU.
- `OLLAMA_LLM_LIBRARY` makes Ollama skip every GPU library except the one it names. Older guides, including an example on Ollama's own troubleshooting page, set it to `cpu_avx2`, which leaves no GPU library at all.

To remove one, open Settings, search for "environment variables" and choose "Edit environment variables for your account". Select the variable and click Delete. Entries under "System variables" need administrator rights. Then quit Ollama from the tray and start it again, because the running server keeps the old values. It is the same window you would use to [move the Ollama models folder](/blog/ollama-models-folder-windows-move-2026).

When the log shows `user overrode visible devices`, Ollama found one of these variables. The warning after it says the same thing as this section: `if GPUs are not correctly discovered, unset and try again`.

## Fix 4: Make the model fit in video memory

A split like `35%/65% CPU/GPU` is not a detection problem. Ollama found the GPU and filled it, and the rest of the model went to system memory. That part runs on the CPU and slows every answer down.

The number to watch is SIZE in `ollama ps`, not the download size in `ollama list`. A longer context makes SIZE bigger. According to the [context length page](https://docs.ollama.com/context-length), Ollama picks the default from your video memory: 4k tokens below 24 GiB, 32k from 24 to 48 GiB and 256k at 48 GiB or more. A coding tool or app that asks for a longer context can push part of the model off the GPU.

Try these one at a time and check `ollama ps` after each:

1. Close games, video editors and other programs that hold video memory.
2. Unload models you are not using with `ollama stop` and the model name. A second loaded model takes its own share.
3. Lower the context with the slider in the Ollama app settings, or with the `OLLAMA_CONTEXT_LENGTH` user variable followed by a restart.
4. Use a smaller model, or a smaller quantization of the same model, such as a q4 tag instead of a q8 tag.

So how much VRAM does Ollama need? It depends on the model and the context, which is why no single number exists. A quick test is to compare SIZE from `ollama ps` with the `available` value on your GPU's inference compute line. If SIZE is bigger, the model will not fit in full.

## Fix 5: Allow the built-in GPU on a laptop

Older guides do not cover this one. Since version 0.30, Ollama leaves out graphics that are built into the processor unless you allow them. On a typical Windows laptop that means Intel UHD, Iris Xe and the Arc graphics inside Core Ultra chips, and most Radeon graphics inside Ryzen chips. The [source code](https://github.com/ollama/ollama/blob/v0.40.17/discover/runner.go) logs it like this:

```txt
dropping integrated GPU; to enable, set OLLAMA_IGPU_ENABLE=1
```

Add a user variable named `OLLAMA_IGPU_ENABLE` with the value `1`, then quit and restart Ollama. The variable appears in `ollama serve --help`, but not yet on the documentation pages. Test the result before you keep it. A built-in GPU shares system memory, so it is not always faster than the CPU. If answers get slower or the app crashes, delete the variable again.

If the laptop also has a separate NVIDIA or AMD card, you do not need this setting. Ollama uses the separate card.

## Fix 6: Use Vulkan for most AMD Radeon cards

ROCm on Windows covers only the RX 7000 and PRO W7000 cards from Fix 2, with a HIP 7 driver. Every other Radeon card goes through Vulkan, which is on by default. The Windows page says some RX 6000 systems, including RX 6800 class cards, do not get ROCm 7 from current AMD drivers, and it recommends Vulkan for them.

When Ollama drops a Radeon card for missing ROCm support, the same log line suggests `HSA_OVERRIDE_GFX_VERSION`. Ollama documents that override for Linux only. On Windows, leave the card to Vulkan instead, and make sure Fix 3 did not find `OLLAMA_VULKAN=0`.

If you allowed built-in graphics with Fix 5 and Ollama picks the Ryzen GPU over your Radeon card, set `GGML_VK_VISIBLE_DEVICES` to the number of the separate card. The hardware page gives `GGML_VK_VISIBLE_DEVICES=1` as the example for a system where the log calls that card `Vulkan1`. Check the number in your own log before you copy it.

## Fix 7: Restart cleanly and check your PATH

Ollama looks for GPUs when its server starts. After a driver update or a changed variable, quit Ollama from the tray icon and start it from the Start menu. Do not also run `ollama serve` in a terminal while the tray app is running. Two servers cannot share the same port, and the second one only adds confusion.

If the log shows `potentially incompatible library detected in PATH`, another program, for example a llama.cpp build or an app that bundles it, has put a `ggml-base.dll` on your PATH. Ollama looks for exactly that file and warns when it sits outside its own folder. The log line includes the location. Remove that folder from your PATH, or uninstall the program, and restart Ollama.

If the log shows `GPU discovery watchdog timed out` or `failure during llama-server GPU discovery`, the GPU check failed. A comment in the source explains that Windows Defender scans the GPU libraries during the first check, so Ollama waits up to 90 seconds on Windows. If this happened right after an update, restart Ollama once more, then update the driver and restart Windows if it repeats.

Still stuck? The [troubleshooting page](https://docs.ollama.com/troubleshooting) describes debug logging. Quit the tray app first, then start it from PowerShell like this:

```powershell
$env:OLLAMA_DEBUG = "1"
& "$env:LOCALAPPDATA\Programs\Ollama\ollama app.exe"
```

The extra detail goes into the same `server.log`. When you are done, quit the app and start it normally from the Start menu.

## Fix 8: The MLX runtime is not available

Some newer models on ollama.com are published only for MLX, a second engine that Ollama runs next to llama.cpp. Pulling one of them on a normal Windows install stops right away with this message:

```txt
Error: this model requires MLX support, but the MLX runtime is not available
```

Nothing is wrong with your GPU here. The runtime is simply missing: the [Windows installer script](https://github.com/ollama/ollama/blob/v0.40.17/app/ollama.iss) copies every GPU library except the `mlx_*` folders. On Windows and Linux, MLX also needs an NVIDIA card, because it runs through CUDA there.

You have two ways out:

1. Pick a tag without the MLX badge on the model's page on ollama.com, if the model has one. Those tags run on the usual llama.cpp engine.
2. With an NVIDIA card, add the runtime. In [issue 19343](https://github.com/ollama/ollama/issues/19343) an Ollama maintainer pointed a Windows user to `ollama-windows-amd64-mlx.zip` from the GitHub release, and the user reported that it fixed the error.

The Windows page describes that zip for the standalone version: you extract it into the folder that holds `ollama.exe`, which is `%LOCALAPPDATA%\Programs\Ollama` for a normal install, and restart Ollama. Use the zip from the release that matches `ollama -v`. The same page says to remove old folders before an upgrade, so replace it after every Ollama update. AMD and Intel users have only the first option for now.

For pull errors that end differently, see the guide to [the pull model manifest error](/blog/ollama-pull-model-manifest-error).

## Docker and WSL: test the GPU outside Ollama first

Ollama in a container or inside WSL can only use a GPU that the container or WSL can already see. Check that first, then look at Ollama.

[Docker Desktop on Windows](https://docs.docker.com/desktop/features/gpu/) passes a GPU to Linux containers only with the WSL 2 backend and only for NVIDIA cards. Update the NVIDIA driver, run `wsl --update` and turn on the WSL 2 engine in Docker Desktop. Docker's own test looks like this:

```powershell
docker run --rm -it --gpus=all nvcr.io/nvidia/k8s/cuda-sample:nbody nbody -gpu -benchmark
```

If the output names your card, start Ollama with the GPU flag. Without `--gpus=all` the container gets no GPU at all:

```powershell
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

Run a model with `docker exec -it ollama ollama run llama3.2`, check `docker exec ollama ollama ps`, and read the log with `docker logs ollama`. A Radeon card cannot be passed into a container this way on Windows. The [Docker page](https://docs.ollama.com/docker) runs the AMD image with `/dev/kfd` and `/dev/dri`, which exist only on a Linux host, so use the native app for AMD.

If you installed Ollama inside WSL itself, the GPU comes from the Windows driver. NVIDIA's [CUDA on WSL guide](https://docs.nvidia.com/cuda/wsl-user-guide/index.html) says WSL 1 has no GPU support and warns against installing a Linux display driver inside WSL. Our [WSL setup guide](/blog/linux-wsl-setup-guide-2026-windows-developers) covers WSL itself, and the [Docker guide for beginners](/blog/docker-for-beginners-2026-guide) covers containers.

## If your Ollama runs on Linux

The checks above work on Ubuntu and other Linux systems too, with the log in `journalctl` instead of a file. Linux has three extra causes that Windows does not:

- After suspend and resume, NVIDIA cards can disappear from Ollama. The hardware page gives a workaround that reloads one driver module.
- AMD cards need the ROCm 7 kernel driver. With an older one, the troubleshooting page says GPU discovery hangs and times out, and Ollama falls back to the CPU.
- The account that runs Ollama may need to be in the `render` and `video` groups before it can open an AMD card.

```bash
sudo rmmod nvidia_uvm && sudo modprobe nvidia_uvm
journalctl -u ollama --no-pager | grep "inference compute"
```

## Before you ask for help

If nothing here worked, collect these before you open a GitHub issue or ask on Discord: your Windows version, the GPU model, the driver version, the output of `ollama -v`, the row from `ollama ps`, and the inference compute line with the warnings above it. Remove user names and folder paths you would rather not share. With those details, someone can usually name the cause in one reply.

If Ollama is new to you, the [guide to running AI locally](/blog/how-to-run-ai-locally-2026) covers installing it and choosing a first model.

## Frequently Asked Questions

### How do I check if Ollama is using my GPU?

Run a model, then run ollama ps while it is still loaded. The PROCESSOR column shows 100% GPU when the whole model is in video memory, 100% CPU when no GPU is used, and a split such as 35%/65% CPU/GPU when the model only partly fits. Dedicated GPU memory in Task Manager should also rise while the model is loaded.

### What GPU does Ollama need on Windows?

An NVIDIA card with compute capability 5.0 or newer and driver 551.61 or newer works through CUDA, with driver 570 or newer for GTX 900 and 10 series cards. Radeon RX 7000 and PRO W7000 cards work through ROCm. Most other recent AMD and Intel cards work through Vulkan, which is on by default. You do not need the CUDA Toolkit.

### Why is Ollama not using my AMD GPU on Windows?

Usually the card is not on the short Windows ROCm list, the driver lacks the HIP 7 runtime, or a variable turned Vulkan off. Cards outside the list, such as the RX 6000 series, run through Vulkan. Search server.log for the inference compute line and the warnings before it. If one says the AMD driver is too old, install the newest Radeon driver.

### Why is Ollama in Docker not using my GPU?

The container only gets a GPU when you start it with the gpus flag set to all. On Windows that works only for NVIDIA cards, with Docker Desktop on the WSL 2 backend. Run Docker's GPU sample first. If the sample cannot see the card, Ollama cannot either. AMD cards cannot be passed into containers on Windows, so use the native app.

### How much VRAM does Ollama need?

It depends on the model and the context length. The SIZE column of ollama ps shows the memory a loaded model takes. If that is larger than the free video memory on the inference compute line in server.log, part of the model runs on the CPU. A smaller model, a smaller quantization or a shorter context fixes that.

## Sources and Image Credits

Checked on 23 November 2026 against Ollama 0.40.17:

- [Ollama hardware support: NVIDIA, AMD ROCm, Vulkan and GPU selection](https://docs.ollama.com/gpu).
- [Ollama on Windows: requirements, log location and standalone packages](https://docs.ollama.com/windows).
- [Ollama context length: defaults by video memory](https://docs.ollama.com/context-length).
- [Ollama troubleshooting: logs, debug logging and GPU discovery](https://docs.ollama.com/troubleshooting).
- [Ollama in Docker: NVIDIA, AMD and Vulkan containers](https://docs.ollama.com/docker).
- [Ollama 0.40.17 source: the inference compute line](https://github.com/ollama/ollama/blob/v0.40.17/discover/types.go).
- [Ollama 0.40.17 source: NVIDIA driver checks](https://github.com/ollama/ollama/blob/v0.40.17/discover/cuda_compat.go).
- [Ollama 0.40.17 source: integrated GPUs, visible devices and the PATH check](https://github.com/ollama/ollama/blob/v0.40.17/discover/runner.go).
- [Ollama 0.40.17 source: AMD driver and ROCm target checks](https://github.com/ollama/ollama/blob/v0.40.17/discover/amd.go).
- [Ollama 0.40.17 source: CUDA architecture check](https://github.com/ollama/ollama/blob/v0.40.17/discover/llama_server.go).
- [Ollama 0.40.17 source: the MLX error message](https://github.com/ollama/ollama/blob/v0.40.17/server/images.go).
- [Ollama 0.40.17 Windows installer script](https://github.com/ollama/ollama/blob/v0.40.17/app/ollama.iss).
- [GitHub issue 19343: MLX runtime on Windows](https://github.com/ollama/ollama/issues/19343).
- [Docker Desktop: GPU support on Windows](https://docs.docker.com/desktop/features/gpu/).
- [NVIDIA: CUDA on WSL user guide](https://docs.nvidia.com/cuda/wsl-user-guide/index.html).
- [NVIDIA: CUDA GPUs and compute capability](https://developer.nvidia.com/cuda-gpus).

Cover photo: [Andrey Matveev](https://www.pexels.com/@zeleboba/) via Pexels. Inline photo: [Andrey Matveev](https://www.pexels.com/@zeleboba/) via Pexels. Both are photographs of consumer PC hardware used for illustration; they are not screenshots, measured hardware results or a claim of endorsement by Ollama, NVIDIA, AMD, Intel or Microsoft.
