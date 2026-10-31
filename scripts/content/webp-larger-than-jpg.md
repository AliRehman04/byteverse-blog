If your **WebP is larger than the original JPG**, first check the output dimensions, whether you selected lossy or lossless encoding, and the encoder's quality setting. A smaller source JPEG can become a larger WebP when you preserve its decoded pixels losslessly or re-encode it at settings that spend more bytes on them. The extension alone does not guarantee a reduction.

Keep the original. Compare a few independent exports from that same source, and inspect both their actual bytes and visible detail. If the JPEG already meets your requirements and the WebP offers no useful advantage, keeping JPEG is a valid result—not a failed optimization.

Google's own [WebP FAQ](https://developers.google.com/speed/webp/faq#can_a_webp_image_grow_larger_than_its_source_image) explicitly confirms that converted images can grow. Below is a practical way to identify why, plus a small measured example showing both larger and smaller outputs.

## Check that you are comparing equivalent files

Before adjusting compression, compare the actual files rather than two previews or rounded labels.

- **Pixel dimensions:** a 2400 × 1600 WebP and a 1200 × 800 JPEG are not a controlled format comparison. The larger image contains four times as many pixels, although its encoded size need not be four times larger.
- **Actual bytes:** compare file length, not a file manager's “size on disk.” Allocation overhead is not the image's encoded size. Keep KB and KiB conventions consistent.
- **Same content:** confirm the crop, orientation and number of frames match. A still JPEG is not equivalent to an animated WebP.
- **Same delivery variant:** a website's small thumbnail or CDN-generated image may differ from the original file you downloaded. Compare the same requested dimensions and the actual response, not just the filename.

Do this first because no encoder setting can make an unfair comparison meaningful.

| What changed | Why it matters | Useful next step |
| --- | --- | --- |
| Output width or height increased | More pixels must be encoded | Disable unintended upscaling and compare at matching dimensions |
| Lossless WebP was selected for a JPEG source | Every decoded pixel must be preserved | Try lossy WebP only if further pixel changes are acceptable |
| A high WebP quality setting was selected | The new encode can use more bytes without restoring the source's lost detail | Compare several lower settings from the same untouched source |
| Output retained extra metadata or frames | There is more content than the visible still image | Check what must be preserved before stripping anything |
| Matching exports still favor JPEG | Compression efficiency varies with the image and implementation | Keep the suitable smaller file instead of forcing a format change |

## Lossless WebP and lossy WebP solve different problems

JPEG photographs have already undergone lossy compression. When decoded, they become a grid of pixels that can include compression artifacts as well as genuine image detail.

Lossless WebP preserves those decoded pixels. It does not know which edges were in the camera scene and which were introduced by the previous JPEG export. Preserving that grid exactly can require more bytes than the JPEG needed to describe an approximation of it.

That is not the same as recovering the original photograph. A lossless conversion cannot bring back detail discarded by an earlier lossy export. “Lossless” describes the relationship to the pixels being encoded, not the entire history of the image or preservation of every metadata field.

Lossy WebP allows another change to the pixels in exchange for a different size/quality tradeoff. For photographs, it is often worth trying. For text, fine lines or assets that must remain pixel-exact, a lossless format may be more appropriate even when the file is larger. The [MDN image-format guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types) discusses those content-dependent choices.

Avoid turning “lossless may be larger” into “lossless is always larger.” The measured flat-graphic example later in this article includes a lossless WebP smaller than its JPEG input.

## A quality setting is not a percentage of retained detail

JPEG quality 80 and WebP quality 80 are not a promise of equal visual quality. Encoders map their controls differently, and tools can use different defaults or preprocessing. A higher number cannot reverse damage already present in the source.

Likewise, **lossy WebP at quality 100 is not the same mode as lossless WebP**. The [official cwebp reference](https://developers.google.com/speed/webp/docs/cwebp) lists a separate lossless option. It also explains that its quality parameter has different behavior in lossless mode, where it affects compression effort rather than allowing ordinary lossy degradation.

The practical consequence: do not move every slider to 100 because you want a smaller file “without losing quality.” Identify the mode, then compare the output against the detail you actually need.

For your own source, try a small selection of lossy settings—for example 80, 70 and 60—without changing dimensions between those tests. These are starting points, not recommended final values for every image. Check fine text, texture, edges and gradients before accepting a result.

## A controlled example: six JPEG inputs, eighteen WebP outputs

To demonstrate the size behavior, ByteVerse ran a small local experiment on October 18, 2026. Three image bases were used:

1. A landscape derivative from an already compressed, licensed WebP photo asset.
2. A synthetic flat graphic with blocks of color and sharp edges.
3. A synthetic noisy gradient with a fixed random seed.

Each base was normalized to **600 × 400 opaque RGB pixels**, then encoded into separate JPEG inputs at quality settings **45 and 85** using Sharp's MozJPEG option and 4:2:0 chroma subsampling. Each JPEG was independently converted into WebP at lossy quality 80, lossy quality 95 and lossless mode. No resize, crop, alpha channel or retained metadata was added during that conversion.

**All sizes below are actual bytes.** The quality labels describe encoder settings, not percentages or matched perceptual quality.

| Controlled JPEG input | JPEG bytes | WebP lossy 80 | WebP lossy 95 | WebP lossless |
| --- | --- | --- | --- | --- |
| Landscape, JPEG 45 | 18,012 | 25,196 | 49,440 | 205,412 |
| Landscape, JPEG 85 | 44,870 | 31,548 | 66,436 | 248,716 |
| Flat graphic, JPEG 45 | 3,965 | 1,668 | 2,522 | 4,600 |
| Flat graphic, JPEG 85 | 5,617 | 1,394 | 2,240 | 4,042 |
| Noisy gradient, JPEG 45 | 18,410 | 38,640 | 73,376 | 268,750 |
| Noisy gradient, JPEG 85 | 77,373 | 76,738 | 141,350 | 405,522 |

Three observations matter:

- The same lossy WebP 80 setting made the lower-quality landscape JPEG **larger** but the higher-quality landscape JPEG **smaller** relative to each one's input size.
- Lossless output grew substantially for the landscape and noisy examples, but the flat graphic at JPEG 85 produced a **smaller lossless WebP**. The rule is not universal.
- Every WebP decoded successfully. All six lossless results reproduced the corresponding decoded JPEG RGB pixels exactly. The lossy results did not. That verifies the tested pixel relationship, not a subjective quality ranking.

This is an illustrative experiment, **not a representative image benchmark or an equal-quality comparison**. The photo base was already a WebP derivative, not a camera original. There was no SSIM matching, blinded visual assessment or test of ImageFixer's browser encoders. The table shows why results can differ; it cannot predict your image's best format.

## Why Google's average savings do not contradict your result

The frequently cited “25–34% smaller” figure comes from a specific [Google WebP compression study](https://developers.google.com/speed/webp/docs/webp_study). Its method compared JPEG and WebP generated from PNG sources at similar SSIM values, using specified datasets and encoder versions.

That is different from taking an already compressed JPEG, converting it with an arbitrary WebP setting, and expecting the same percentage reduction. It is also different from choosing identical quality-slider numbers across formats.

The study is useful evidence about its tested conditions. It is not a warranty for every image, every encoder version or every later conversion. Our small table is not a rerun of that study and should not be interpreted as disproving it.

## A repeatable way to choose the output

Use the same source for each candidate and change one decision at a time:

1. **Define the destination.** Check accepted file formats, required dimensions and whether transparency or animation matters.
2. **Keep an untouched source.** Do not repeatedly convert yesterday's compressed output into tomorrow's input if a better source is available.
3. **Fix dimensions before comparing codecs.** Resize deliberately for the intended use, then compare candidates at those same dimensions.
4. **Select the right encoding mode.** Use lossless when preserving the working pixels is a requirement, not because its name sounds like a free quality upgrade.
5. **Compare a few lossy settings when permitted.** Inspect the actual result, not just the slider position or a “compression complete” badge.
6. **Keep the best acceptable candidate.** If two files meet the same visual and functional requirements, fewer bytes are useful. If one loses required detail or compatibility, it is not an equivalent replacement.

Generating JPEG and WebP independently from a good working source is preferable to unnecessary chains of lossy exports. Saving an already compressed JPEG at a higher setting merely to make its next conversion show a bigger percentage saving does not improve the starting information.

For the broader workflow—display dimensions, responsive variants and delivery—see the [web image optimization guide](/blog/how-to-optimize-images-for-web-2026). Treat broad format recommendations as starting points and use actual file results for the final decision.

## Try a controlled comparison in ImageFixer

The [ByteVerse image compressor and converter](/tools/image-compressor) exposes the controls needed for a small practical comparison:

- Add a non-sensitive image, select **Quality** mode and choose **WebP** under **Convert to**.
- Choose **No resize** and avoid adding a crop when you want to isolate encoding. If an existing crop is present, clear it or start with a fresh item.
- Open **Quality & advanced options**, choose a quality setting and select **Compress images**.
- Review the actual original/output bytes and dimensions. If it grew, change one setting and compress again from the same original item.
- Inspect the comparison at the intended display size and zoom in where small details matter.

**The current tool uses lossy WebP; it does not expose a lossless WebP switch.** The lossless column in our experiment was produced with Sharp, not by inventing a setting in the live tool. The tool's working image is 8-bit sRGB and its exports discard source metadata, so it is not an archival workflow for retaining HDR, wide-gamut profiles or original camera information.

If you need a maximum number of bytes, use **Target** mode, set the ceiling and inspect the measured outcome. Choose whether dimensions must be preserved. A successful target result means the encoded file fits that ceiling; it does not establish that every detail is acceptable or that another application will accept the file. A missed target is not proof that no other encoder or settings could succeed.

These controls were checked against the current public page and implementation. The table above remains a separate local experiment, not a live-tool performance test.

## Keep required features, not just fewer bytes

An image's visible pixels are only part of the comparison. The [WebP container specification](https://developers.google.com/speed/webp/docs/riff_container) allows transparency, animation, ICC color profiles and EXIF/XMP metadata. Different exporters preserve or discard different parts.

Do not remove a needed color profile or animation merely to win a byte comparison. Conversely, do not keep an original file containing unwanted location metadata solely because it is smaller. Decide which information is allowed and required, then compare candidates that meet that requirement.

For a reusable transparent logo, a smaller opaque JPEG is not an equivalent result. If your problem is a black rectangle caused by PNG-to-JPG flattening, use the separate [PNG background troubleshooting guide](/blog/png-to-jpg-black-background); compression settings alone do not repair transparency that is already gone.

Small flat-color PNGs can also behave unexpectedly when converted to lossy WebP. Google's FAQ explains that color conversion can create more distinct colors than the original simple graphic had. That is another reason to test lossless choices for graphics rather than applying a photo preset to everything.

## When keeping JPEG is the right answer

Keep the original or an appropriate JPEG derivative when it meets the destination's requirements, has acceptable detail and is smaller than the acceptable alternatives you tested. You do not need to convert every image merely to standardize the extension.

A WebP may still be useful for other requirements, but “newer format” by itself is not a benefit you have measured. Likewise, a smaller local file does not prove faster page loading: verify what the page actually serves before claiming a performance improvement.

For a batch, review results per image rather than assuming one setting wins everywhere. Retain the source, record the chosen dimensions and settings, and avoid replacing a suitable file with a larger one unless the replacement provides a deliberate benefit.

## Frequently Asked Questions

### Why is my WebP larger than my JPG?

Common causes include lossless output, a high lossy quality setting, larger dimensions or a source JPEG that was already compressed heavily. Compare matching files and inspect the actual encoding mode before deciding the format is the problem.

### Does WebP quality 100 mean lossless?

No. Lossy quality 100 and lossless WebP are separate encoding choices. A high setting cannot recover detail already discarded from the source. Check how your particular encoder defines its controls.

### Will lossless WebP always be bigger than JPEG?

No. It can grow when preserving the decoded pixels of a compressed JPEG, but the result depends on the image. Our small test included both larger lossless outputs and one smaller flat graphic. Measure the actual output.

### Does a smaller WebP prove the image has the same quality?

No. Fewer bytes alone do not demonstrate equal quality. Compare at the same dimensions, inspect important details and preserve required features. Encoder quality numbers are not percentages of retained visual quality.

### Should I convert every website image to WebP?

Not automatically. Choose a format that meets the delivery, quality and feature requirements of each image. Keep a suitable JPEG when the tested alternatives offer no useful improvement, and verify what the website serves rather than relying on extensions.

## Verification Notes

The controlled experiment used **Node.js 24.12.0, Sharp 0.34.5, libvips 8.17.3 and libwebp 1.6.0** on October 18, 2026. WebP effort was 6 for all outputs; lossless mode used quality 100. All eighteen outputs were decoded and checked for format, 600 × 400 dimensions and absent alpha/retained metadata. Six lossless RGB comparisons matched their decoded JPEG inputs exactly. Existing image files were unchanged, and experimental outputs were held in memory rather than saved as publishable images.

The landscape base derives from an existing licensed **James Wheeler / Pexels** asset: [Moraine Lake photograph](https://www.pexels.com/photo/lake-and-mountain-417074/), used under the [Pexels license](https://www.pexels.com/license/). It is not a photograph taken by ByteVerse or an uncompressed master. The other two bases are synthetic.

The [Sharp output documentation](https://sharp.pixelplumbing.com/api-output/#webp) describes the encoding options used. Exact sizes are tied to these inputs, settings and installed versions. No general perceptual-quality, codec-speed, physical-device, live ImageFixer, CDN or SEO-impact benchmark was performed.

## Sources and Further Reading

- [Google WebP FAQ: output larger than source](https://developers.google.com/speed/webp/faq#can_a_webp_image_grow_larger_than_its_source_image).
- [Google: cwebp encoding options](https://developers.google.com/speed/webp/docs/cwebp).
- [Google: WebP compression study and methodology](https://developers.google.com/speed/webp/docs/webp_study).
- [Google: WebP container features](https://developers.google.com/speed/webp/docs/riff_container).
- [MDN: image formats and content-dependent choices](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types).
- [Sharp: JPEG and WebP output settings](https://sharp.pixelplumbing.com/api-output/#webp).