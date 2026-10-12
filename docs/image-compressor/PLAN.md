# ImageFixer / ByteVerse image studio — October 9, 2026

Source brief: the user-provided ImageFixer Master Prompt v2 and screenshot. Upgrade the existing `/tools/image-compressor` URL, not a new site. Existing hidden blog draft238 and all database records are out of scope.

## Architecture and decisions

- Retain Next App Router, the existing canonical/site configuration and blue/violet ByteVerse brand. Static explanatory HTML surrounds a focused client workspace.
- Real browser-local processing: signature validation → EXIF/privacy check → oriented decode → crop/Lanczos resize → lazily loaded WASM encoder → measured result.
- Pure target search with injected encoders; best observed passing candidate, bounded quality/resize attempts, explicit unreachable result. Different codecs' quality numbers are **not** equivalent perceptual scores.
- Bounded worker pool, cancellation, input/output/memory limits and stale-job protection. Safety limits are resource limits, not subscription quotas.
- Route-specific clean shell with no ads, analytics, translation or chat scripts. Full-document navigation at this boundary and restrictive response CSP; do not claim that simply unmounting a third-party script undoes its execution.
- First-party codec assets with lazy loading, single-thread WASM and no COOP/COEP dependency. Offline app/codec caching never stores user images; optional complete offline pack has an explicit download action.
- Existing build/test conventions, production validation in a credential-free sibling copy. No live DB, providers, deployment or push.

## Phases

- [x] Inspect master prompt, current page, site scripts and dependency registry.
- [ ] 1. Foundation: isolated route shell, static content, theme, metadata and premium responsive layout; build.
- [ ] 2. Engine: sniff/limits/EXIF/decode/orientation/resize, worker codecs, target-size and format comparison; unit tests.
- [ ] 3. Workspace: additive drop/browse/paste/folder input, queue, four modes, presets, settings, cancellation/retry; real-file checks.
- [ ] 4. Results: measured stats, compare/zoom, individual and ZIP downloads, optional folder/share; inspect downloaded bytes.
- [ ] 5. Hardening: metadata scan, crop, settings-only persistence/links, offline pack, resource and security controls.
- [ ] 6. Quality: typecheck/lint, production build, actual codec/fixture tests, desktop/mobile/light/dark, axe, Lighthouse and available browsers.
- [ ] 7. Documentation: requirement coverage, measured results, browser limits, licenses and rollout instructions.

## Risks and acceptance boundaries

- Exact target means **at or below a measured byte ceiling**, never artificial padding or guaranteed equality.
- PNG optimization is lossless unless resize/crop or explicitly labeled palette reduction is selected. No fake PNG quality slider.
- Orientation/profile handling depends on decoders; reject unsupported/corrupt cases, and never silently label an output with a different MIME.
- HEIC/AVIF and high-resolution inputs can require substantial CPU/memory. Show truthful limits, first-frame notices and errors; do not advertise a guaranteed 20-second task.
- Metadata is stripped on re-encode; retaining source metadata/color profiles is not offered unless it can be implemented safely and verified. Convert working pixels to sRGB; disclose browser color limitations.
- Safari/iOS/Android physical-device tests and field INP are not inferred from desktop viewports or lab scores.
- No copied fake social proof, paid locks, AI claims, external image APIs, or automatic image persistence.
- Per-phase commits in the generic prompt are deferred in this existing workspace until review; **no push/live publication** is authorized by this task.