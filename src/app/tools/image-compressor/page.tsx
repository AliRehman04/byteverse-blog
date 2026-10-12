import type { Metadata } from "next";
import { ArrowRight, Check, CheckCheck, ChevronRight, Crop, Download, Eye, FileImage, FolderDown, Globe, HardDrive, Image as ImageIcon, Info, Layers, Link2, LockKeyhole, Mail, Monitor, Plus, ScanLine, ShieldCheck, SlidersHorizontal, Smartphone, Target, Upload, WifiOff } from "lucide-react";
import { imageStudioBrand } from "@/lib/image-studio/brand";
import { ImageCompressorTool } from "./image-compressor-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import { ImageStudioHeader, ImageStudioStartLink } from "./image-studio-header";
import { ImageOfflineControls } from "./image-offline-controls";
import "./image-studio-page.css";

// One source for the rendered answers and the complete FAQ schema. The shared
// helper intentionally caps FAQ output at five, so this page emits its own FAQ.
const faqs = [
  {
    question: "How do I compress an image to 50 KB?",
    answer: "Add an image, choose Target mode, set the maximum file size to 50 KB, and choose a format your destination accepts. Compress, then check the measured output bytes and the target status before downloading. Allowing smaller dimensions can help reach the ceiling, but always check the portal’s dimension rules too.",
  },
  {
    question: "Can I compress an image to exactly 100 KB?",
    answer: "100 KB is a maximum of 100,000 bytes here, not a request to pad the file to exactly that length. A result is marked Target met only when its actual encoded byte count is at or below the ceiling. Some images cannot reach the limit with your chosen format, quality floor and dimensions.",
  },
  {
    question: "Why is my image slightly under the target instead of exactly at it?",
    answer: "Image encoders do not produce every possible file size, so the search keeps a measured candidate that fits. Adding padding would make the file larger without improving its image detail. Use the exact byte count in the result rather than a rounded KB label when checking an upload limit.",
  },
  {
    question: "Will compression reduce image quality?",
    answer: "JPG, WebP and AVIF use lossy encoding here, so compression can change visible detail. The quality value is a codec setting, not a percentage of retained visual quality, and equal settings across formats are not equivalent. PNG optimization preserves the working pixels unless you enable lossy palette reduction; cropping, resizing and conversion to 8-bit sRGB can still change the source.",
  },
  {
    question: "Which input and output formats are supported?",
    answer: "Inputs include JPEG/JPG, PNG, WebP, AVIF and HEIC/HEIF, plus GIF and BMP when the browser can decode them. Animated files use only the first/default still frame, and HEIF collections use the primary image. Outputs are JPEG via MozJPEG, PNG via OxiPNG, WebP and AVIF via local WebAssembly codecs; a verified browser encoder may be used if a codec fails, with a notice.",
  },
  {
    question: "What is the difference between JPG, PNG, WebP and AVIF?",
    answer: "JPG is widely accepted for photos but cannot keep transparency. PNG preserves working pixels without lossy encoding when palette reduction is off, though it can be larger for photos. WebP and AVIF support transparency and can make efficient web images, but AVIF takes more processing and some upload portals reject newer formats. Choose the format your destination accepts and compare the actual output.",
  },
  {
    question: "Can I compress multiple images at once?",
    answer: "Yes: browse, drop or paste multiple images, and add more without replacing the queue. The current safety limits are 50 files and 200 MB of source files per batch, with a separate 200 MB budget for retained previews and outputs. Shared settings apply to the batch, while crops are set per image; completed outputs can be downloaded individually or together as a ZIP.",
  },
  {
    question: "How do I resize an image without stretching it?",
    answer: "Keep Lock aspect ratio enabled when using width and height: they become a bounding box rather than a forced shape. Percentage and longest-side resizing also preserve the image’s proportions. Use the crop control if you need a different aspect ratio, and leave upscaling off unless you deliberately want larger dimensions.",
  },
  {
    question: "Are my images uploaded to a server?",
    answer: "No image processing upload is made: file bytes are decoded, resized and encoded in local browser workers. This tool route does not load ads, analytics, chat or translation scripts; it requests the page and its static application, worker and codec assets. If you explicitly use Share, the selected result is handed to your device’s share service and the app you choose.",
  },
  {
    question: "Does it work on mobile and offline?",
    answer: "The workspace adapts to phones and tablets in current browsers with Web Workers, WebAssembly and the required image APIs. Before going offline, use the offline controls near the tool to download the required assets and check their reported status; a first visit alone is not a guarantee. Browser storage can be cleared or evicted, and private browsing or unsupported service workers can prevent offline use. Large images and AVIF encoding can still be demanding on a phone.",
  },
  {
    question: "Can I compress a transparent PNG?",
    answer: "Yes: PNG, WebP and AVIF outputs can preserve transparency. PNG has optimization effort controls, not a quality slider; optional palette reduction is explicitly lossy. JPG needs you to approve flattening transparency onto a chosen background color, and Auto excludes JPG for transparent images unless you allow that conversion.",
  },
  {
    question: "Can I convert iPhone HEIC photos to JPG?",
    answer: "Yes: HEIC/HEIF inspection and a local decoder are loaded on demand, with native decoding used where available. Add the photo, choose JPG and inspect the output before downloading. Unsupported HEIF variants, corrupt files or resource limits can still cause a clear failure; the tool does not preserve extra collection images, HDR or the original wide-gamut profile.",
  },
  {
    question: "Is 1 KB equal to 1,000 or 1,024 bytes here?",
    answer: "KB uses 1,000 bytes and MB uses 1,000,000 bytes. You can select binary KiB, which uses 1,024 bytes, or MiB, which uses 1,048,576 bytes. Target success is checked against the measured output bytes, so use the convention specified by your destination.",
  },
  {
    question: "Why did my image not reach the target size?",
    answer: "A small ceiling, preserved dimensions, detailed content, a high minimum quality or lossless PNG can prevent a passing result. The tool shows the closest observed attempt as a target miss, not as proof that no smaller result is possible. Allow more resizing, reduce the minimum quality for a lossy format, or try WebP if your destination accepts it, then explicitly compress again.",
  },
  {
    question: "What should I do if an image fails to process?",
    answer: "Read the per-image error, then retry with a smaller source, fewer queued images or another output format. Corrupt files, unsupported image variants, codec-loading failures and memory or time limits can stop a job without producing a download. If a codec could not load, reconnect before retrying; use a trusted editor to resize an input that exceeds the decode limit. Your original file is not modified.",
  },
  {
    question: `Is ${imageStudioBrand.name} really free?`,
    answer: `${imageStudioBrand.name} by ${imageStudioBrand.publisher} is free to use, with no signup, watermark or paid feature locks. File, pixel and queue limits protect browser resources rather than enforce a paid quota. There is no guaranteed completion time or promised percentage reduction: results depend on the image, settings and device.`,
  },
  {
    question: "Are GPS, EXIF and color profiles kept in the result?",
    answer: "Source metadata is always discarded during re-encoding, including EXIF, GPS and camera metadata; there is no keep-metadata switch. A local scan can flag location or camera-serial markers, but an incomplete scan or no warning does not prove the source had none. Working pixels are 8-bit sRGB, and original ICC, wide-gamut and HDR information is not retained. Metadata removal does not hide personal information visibly present in the image.",
  },
  {
    question: "How does Auto choose an output format?",
    answer: "Auto measures eligible JPG, WebP and AVIF candidates. Balanced prioritizes passing candidates with larger pixel area, then lower sampled decoded pixel error, then fewer bytes; Smallest tests the selected minimum-quality setting and prefers fewer measured bytes. The sampled error is not a perceptual quality score, and the search is not an exhaustive guarantee of the best possible image. Compare the result yourself before downloading.",
  },
  {
    question: "What are the per-image limits?",
    answer: "Each input must be non-empty and no larger than 50 MB, with a normal ceiling of 50 megapixels and 16,384 pixels on either side. Devices reporting very low memory use a lower 12-megapixel ceiling; worker concurrency also scales down with available cores, memory and aggregate pixels. A job has a two-minute safety timeout, and the active limits appear in the workspace. These checks can reject a file before a resize is possible, so reduce oversized sources in a trusted editor first.",
  },
  {
    question: "Can I save to a folder or share from my phone?",
    answer: "Individual downloads and ZIP export are available for completed results. Save to folder appears only where the File System Access API is supported, commonly in desktop Chromium browsers, and asks you to choose a destination. Share appears only when the device can share that output file; handing it to another app does not confirm delivery. Normal downloads remain the alternative when these browser features are unavailable.",
  },
  {
    question: "Are my images or last-used settings saved in the browser?",
    answer: "Images and results are held in memory for the current queue, not saved to localStorage or IndexedDB by the tool. Custom presets you explicitly save, the theme preference and cached offline application assets can persist; the workspace does not automatically restore a previous image session. Settings links contain validated settings, not image data, source filenames or per-image crops. Downloads and files you explicitly save are separate and remain wherever your browser or chosen folder stores them.",
  },
];

const toolConfig = {
  name: `${imageStudioBrand.name} Image Compressor`,
  title: `Free Image Compressor – Target KB Size | ${imageStudioBrand.name}`,
  description:
    "Compress images to a measured KB ceiling, resize and convert JPG, PNG, WebP and AVIF in your browser. Free, private, no signup or watermark.",
  slug: imageStudioBrand.slug,
  keywords: [
    "image compressor",
    "compress image to 50 KB",
    "compress image to 100 KB",
    "compress image to 20 KB",
    "reduce image file size",
    "resize image online",
    "JPG compressor",
    "PNG to WebP",
    "HEIC to JPG",
    "image to AVIF",
    "batch image compressor",
  ],
  applicationCategory: "MultimediaApplication",
  featureList: [
    "Target-size search verified against measured output bytes, with honest target-miss reporting",
    "Local JPEG, PNG, WebP and AVIF output using lazy-loaded WebAssembly codecs",
    "HEIC/HEIF input with a local decoder; GIF/BMP and animated inputs limited to supported still-frame decoding",
    "Resource-bounded batch queue with progress, cancellation, retries and ZIP export",
    "Per-image crop, aspect-ratio resizing and actual output comparison with zoom",
    "Source metadata removal on every re-encode, with no image storage or processing uploads",
    "Editable use-case presets, explicitly saved custom presets and settings-only links",
    "Optional folder export and file sharing when supported by the browser",
  ],
  audience: "Students, job applicants, bloggers, designers, developers and anyone preparing images for upload limits",
  faqs,
};

const generatedMetadata = generateToolMetadata(toolConfig);
const socialImage = {
  url: `${imageStudioBrand.siteUrl}${imageStudioBrand.path}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: `${imageStudioBrand.name} by ${imageStudioBrand.publisher} — private image compression with measured byte ceilings`,
};

export const metadata: Metadata = {
  ...generatedMetadata,
  title: { absolute: toolConfig.title },
  manifest: "/image-studio.webmanifest",
  openGraph: { ...generatedMetadata.openGraph, title: toolConfig.title, images: [socialImage] },
  twitter: { ...generatedMetadata.twitter, title: toolConfig.title, images: [socialImage] },
};

const features = [
  { icon: Target, title: "A target you can check", text: "Choose a KB or KiB ceiling. Only measured outputs at or below it earn Target met; misses stay clearly labeled." },
  { icon: FileImage, title: "Four output formats", text: "JPG, PNG, WebP and AVIF, with on-demand local WASM codecs. HEIC input has its own lazy-loaded decoder." },
  { icon: Layers, title: "A queue, not a quota", text: "Add up to 50 images within resource budgets. Track progress, cancel work or retry failures without a paid tier." },
  { icon: Crop, title: "Resize. Crop. Keep control.", text: "Set a longest side, percentage or dimension box. Crop each image separately and keep aspect ratio locked to avoid stretching." },
  { icon: Eye, title: "Inspect the actual output", text: "Compare the encoded result with its matching pre-encode reference. Use the slider, side-by-side view and zoom to judge detail." },
  { icon: ShieldCheck, title: "Source metadata removed", text: "EXIF, GPS and camera metadata are always discarded on export. A local scan flags markers it can detect before processing." },
  { icon: FolderDown, title: "Download your way", text: "Save one image or a ZIP. Folder export and mobile file sharing appear only when the browser supports them." },
  { icon: Link2, title: "Reuse settings, not files", text: "Start with seven editable presets, save your own locally or copy a settings-only link. Images and crops are not saved in presets." },
];

const steps = [
  { icon: Upload, title: "Add your images", text: "Browse, drag and drop, or paste. The workspace checks actual file signatures, dimensions and available resources before processing." },
  { icon: SlidersHorizontal, title: "Set a ceiling or a preset", text: "Choose Target, Quality, Resize or Auto. For an upload portal, use its accepted format, exact dimension rules and KB convention." },
  { icon: Download, title: "Compare, then download", text: "Check the measured bytes, dimensions and target status. Inspect the actual image, then download the outputs you want to keep." },
];

const useCases = [
  { icon: ScanLine, title: "Application photos", text: "Start with the 50 KB JPG preset; a 3:4 crop is optional and applies only to the selected image." },
  { icon: FileImage, title: "Signature scans", text: "Try the 20 KB PNG preset with a 600 px longest side. Lossless PNG may still miss a small ceiling." },
  { icon: Mail, title: "Email attachments", text: "The 1 MB JPG preset caps the longest side at 2,560 px. Check the combined attachment limit too." },
  { icon: Monitor, title: "Website heroes", text: "Start with WebP, encoder quality 80 and a 1,920 px longest side. Preview detail at its display size." },
  { icon: Globe, title: "Blog images", text: "Try a 150 KB WebP ceiling and 1,200 px longest side for article images; inspect text and fine detail." },
  { icon: Smartphone, title: "Social images", text: "Start with JPG at quality 85 and a 2,048 px longest side, then adjust for the platform’s current requirements." },
];

export default function ImageCompressorPage() {
  return (
    <div className="image-studio-page">
      {/* SiteShell already provides this route's main landmark. */}
      <ToolJsonLd config={{ ...toolConfig, faqs: undefined }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${imageStudioBrand.siteUrl}${imageStudioBrand.path}#faq`,
        mainEntity: faqs.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
      }).replace(/</g, "\\u003c") }} />

      <ImageStudioHeader />

      <section id="image-studio-top" tabIndex={-1} className="isp-hero isp-anchor-target" aria-labelledby="image-studio-title">
        <div className="isp-container isp-hero-grid">
          <div className="isp-hero-copy">
            <p className="isp-hero-kicker"><ImageIcon size={15} aria-hidden="true" /> FREE IMAGE COMPRESSOR · BUILT FOR YOUR BROWSER</p>
            <h1 id="image-studio-title">Compress images to <span>your target file size.</span></h1>
            <p className="isp-hero-description">A 50 KB photo. A lighter website. A smaller attachment. <strong>Resize, compress and convert</strong> to JPG, PNG, WebP or AVIF—without uploading your images.</p>
            <ul className="isp-benefits" aria-label="Studio benefits">
              {["Measured byte ceilings", "Batch processing", "No signup or watermark"].map(benefit => <li key={benefit}><Check size={14} aria-hidden="true" />{benefit}</li>)}
            </ul>
            <div className="isp-hero-actions">
              <ImageStudioStartLink className="isp-button isp-button-primary">Compress images free <ArrowRight size={17} aria-hidden="true" /></ImageStudioStartLink>
              <a href="#features" className="isp-button isp-button-quiet">Explore features <ChevronRight size={16} aria-hidden="true" /></a>
            </div>
            <p className="isp-hero-trust"><LockKeyhole size={14} aria-hidden="true" /> Local processing. Original files stay untouched. No promised savings.</p>
          </div>

          <figure className="isp-hero-figure">
            <div className="isp-example-frame">
              <div className="isp-example-topline"><span><FileImage size={14} aria-hidden="true" /> A little more room for your images</span><span className="isp-example-label">Illustrated example</span></div>
              <svg className="isp-landscape" width="520" height="240" viewBox="0 0 520 240" fill="none" role="img" aria-labelledby="isp-landscape-title isp-landscape-description">
                <title id="isp-landscape-title">An original illustration of a mountain lake</title>
                <desc id="isp-landscape-description">A static vector scene for the image workflow. It is not a processed photo or a before-and-after quality comparison.</desc>
                <defs>
                  <linearGradient id="isp-lake-sky" x1="260" y1="0" x2="260" y2="185" gradientUnits="userSpaceOnUse"><stop stopColor="#285889" /><stop offset="1" stopColor="#91bddb" /></linearGradient>
                  <linearGradient id="isp-lake-water" x1="260" y1="163" x2="260" y2="240" gradientUnits="userSpaceOnUse"><stop stopColor="#68bfd0" /><stop offset="1" stopColor="#1d657f" /></linearGradient>
                </defs>
                <path fill="url(#isp-lake-sky)" d="M0 0h520v240H0z" />
                <circle cx="401" cy="48" r="24" fill="#e0effb" />
                <path d="m0 153 86-79 67 69 93-118 129 128 51-69 94 67v89H0Z" fill="#6c8fab" />
                <path d="m181 107 65-82 83 82-49-19-24 14-18-39-20 31-15-2Z" fill="#edf5fa" />
                <path d="m246 25 129 128-76-27-39-58Z" fill="#91b1c8" />
                <path d="m0 177 96-77 45 67 97-36 63 41 99-78 120 89v57H0Z" fill="#284f6b" />
                <path d="M0 193c67-17 118-21 189-11 84 12 119-22 188-14 60 7 101 22 143 24v48H0Z" fill="url(#isp-lake-water)" />
                <path d="m150 190 84 39 68-38-58-9Z" fill="#afd9e3" opacity=".3" />
                <path d="M0 162 59 175l37 39-96 26Zm520 6-71 22-28 29 99 13Z" fill="#173c53" />
                <path d="M94 201h63m190-17h50m-201 32h78m54 15h76" stroke="#b3e1eb" strokeWidth="2" strokeLinecap="round" opacity=".75" />
                <path d="m29 142 13-24 13 24h-8v35H36v-35Zm438 26 12-25 12 25h-7v26h-10v-26Z" fill="#133b50" />
              </svg>
              <div className="isp-example-flow" aria-label="Add an image, choose a limit, inspect the output"><span><Upload size={15} aria-hidden="true" />Your image</span><ArrowRight size={15} aria-hidden="true" /><span><SlidersHorizontal size={15} aria-hidden="true" />Your limit</span><ArrowRight size={15} aria-hidden="true" /><span><Eye size={15} aria-hidden="true" />Your review</span></div>
            </div>
            <figcaption>Illustration only, not a compression result. Actual sizes are measured in the tool.</figcaption>
          </figure>
        </div>
      </section>

      <div className="isp-tool-surface">
        <div className="isp-container">
          <div className="isp-tool-intro"><div><h2>Your image workspace</h2><p>A target is a byte ceiling—not a promise of exact equality.</p></div><div className="isp-format-chips" aria-label="Output formats">{["JPG", "PNG", "WebP", "AVIF"].map(format => <span key={format}>{format}</span>)}</div></div>
          <noscript><p className="isp-noscript">Enable JavaScript to process images locally. The browser needs Web Workers, WebAssembly and image-decoding APIs; the guide and FAQs below are available without JavaScript.</p></noscript>
          <ImageCompressorTool />
          <section id="offline" className="isp-offline-card isp-anchor-target" tabIndex={-1} aria-labelledby="image-offline-title">
            <div className="isp-offline-copy"><WifiOff size={23} aria-hidden="true" /><div><h2 id="image-offline-title">Prepare now. Work offline later.</h2><p>Download the app’s offline assets while connected, then check the status before disconnecting. The cache stores application files and codecs, not your images. Availability depends on your browser and retained storage.</p></div></div>
            <div className="isp-offline-controls"><ImageOfflineControls /></div>
          </section>
        </div>
      </div>

      <section id="features" className="isp-section isp-anchor-target" tabIndex={-1} aria-labelledby="image-features-title">
        <div className="isp-container">
          <div className="isp-section-heading"><p className="isp-eyebrow">Made for the whole workflow</p><h2 id="image-features-title" className="isp-heading">Less file size. More say in the result.</h2><p className="isp-section-lead">Practical controls from import to export, with clear limits and real byte counts. No simulated quality scores or premium locks.</p></div>
          <div className="isp-feature-grid">{features.map(({ icon: Icon, title, text }) => <article className="isp-feature" key={title}><div className="isp-feature-icon"><Icon size={21} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
          <div className="isp-engine-note"><CheckCheck size={23} aria-hidden="true" /><div><h3>Measured outputs, not marketing numbers.</h3><p>Target mode searches actual encodes within a bounded attempt budget. Auto compares eligible formats using dimensions, a sampled pixel-error metric and bytes—not an objective perceptual score. PNG has no quality slider, and even a successful encode can be larger than its source.</p></div></div>
        </div>
      </section>

      <section id="how-it-works" className="isp-section isp-steps-section isp-anchor-target" tabIndex={-1} aria-labelledby="image-steps-title">
        <div className="isp-container">
          <p className="isp-eyebrow">Three steps. All local.</p><h2 id="image-steps-title" className="isp-heading">From “too large” to ready to review.</h2>
          <ol className="isp-steps">{steps.map(({ icon: Icon, title, text }, index) => <li className="isp-step" key={title}><div className="isp-step-topline"><span className="isp-step-number">0{index + 1}</span><Icon size={24} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></li>)}</ol>
          <div className="isp-steps-return"><ImageStudioStartLink className="isp-text-link">Try it with your own image <ArrowRight size={16} aria-hidden="true" /></ImageStudioStartLink></div>
        </div>
      </section>

      <section id="use-cases" className="isp-section isp-anchor-target" tabIndex={-1} aria-labelledby="image-usecases-title">
        <div className="isp-container">
          <div className="isp-usecase-heading"><div><p className="isp-eyebrow">A starting point for everyday images</p><h2 id="image-usecases-title" className="isp-heading">A form, a website, or your next post.</h2><p className="isp-section-lead">These are the editable presets in the workspace—not official specifications or promised output sizes.</p></div></div>
          <div className="isp-usecase-grid">{useCases.map(({ icon: Icon, title, text }) => <article className="isp-usecase" key={title}><Icon size={21} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
          <p className="isp-preset-note"><Info size={16} aria-hidden="true" />Always check your destination’s file-size, format, dimension and photo-content rules. A preset cannot certify acceptance.</p>
        </div>
      </section>

      <section id="privacy" className="isp-section isp-privacy-section isp-anchor-target" tabIndex={-1} aria-labelledby="image-privacy-title">
        <div className="isp-container">
          <div className="isp-privacy-grid">
            <div><div className="isp-privacy-emblem"><ShieldCheck size={28} aria-hidden="true" /></div><p className="isp-eyebrow">Private by how it works</p><h2 id="image-privacy-title" className="isp-heading">Your images aren’t an upload.</h2><p className="isp-section-lead">The selected files stay in this browser tab for processing. No remote image API, account or background image storage.</p></div>
            <ul className="isp-privacy-list">
              <li><Monitor size={19} aria-hidden="true" /><div><h3>Processing happens on your device</h3><p>Local workers decode, crop, resize and encode the image. Generated previews use local object URLs; removing files, clearing the queue or leaving the tool releases its in-memory references. Original files are unchanged.</p></div></li>
              <li><Globe size={19} aria-hidden="true" /><div><h3>Asset requests, not image uploads</h3><p>This route loads the page, static app assets, workers and codec files. Ads, analytics, chat and translation are not loaded here. Normal hosting access logs may record those page or asset requests, not image processing uploads.</p></div></li>
              <li><HardDrive size={19} aria-hidden="true" /><div><h3>Application storage, not image storage</h3><p>Saved presets, theme preferences and cached offline assets can persist in browser storage—not image bytes, source filenames or crops. Downloads and folder saves write the files you choose; using Share hands an output to your device’s share service.</p></div></li>
              <li><ScanLine size={19} aria-hidden="true" /><div><h3>Metadata removed, not a promise of anonymity</h3><p>Source EXIF, GPS and camera metadata are always stripped on re-encode. Original color profiles and HDR are not retained; working pixels are 8-bit sRGB. Check the picture itself for visible private information, especially on a shared or untrusted device.</p></div></li>
            </ul>
          </div>
          <p className="isp-privacy-check"><strong>Check it yourself:</strong> open your browser’s Network panel before adding and compressing an image. You should see application or codec assets being loaded, not file-upload requests. Download what you need, clear the queue and remove saved downloads from shared devices.</p>
        </div>
      </section>

      <section id="faq" className="isp-section isp-anchor-target" tabIndex={-1} aria-labelledby="image-faq-title">
        <div className="isp-container isp-faq-layout">
          <div className="isp-faq-heading"><p className="isp-eyebrow">A few useful answers</p><h2 id="image-faq-title" className="isp-heading">Image compression, without the guesswork.</h2><p className="isp-section-lead">Formats, file-size limits and privacy—explained before you commit to an output.</p><a className="isp-text-link" href={imageStudioBrand.links.contact}>Send feedback to {imageStudioBrand.publisher} <ArrowRight size={16} aria-hidden="true" /></a></div>
          <div className="isp-faq-list">{faqs.map((faq, index) => <details className="isp-faq-item" key={faq.question} open={index === 0}><summary>{faq.question}<Plus size={17} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
        </div>
      </section>

      <footer className="isp-footer">
        <div className="isp-container">
          <div className="isp-footer-main"><div><p className="isp-footer-brand">{imageStudioBrand.name} <span>by {imageStudioBrand.publisher}</span></p><p className="isp-footer-description">{imageStudioBrand.description}</p></div><nav className="isp-footer-nav" aria-label="Image studio footer sections"><ImageStudioStartLink>Image tool</ImageStudioStartLink><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#privacy">Image privacy</a><a href="#faq">FAQ</a></nav></div>
          <div className="isp-footer-bottom"><p>© {new Date().getFullYear()} {imageStudioBrand.publisher}. Free to use. No watermark.</p><nav className="isp-footer-nav" aria-label={`${imageStudioBrand.publisher} links`}><a href={imageStudioBrand.links.home}>{imageStudioBrand.publisher}</a><a href={imageStudioBrand.links.tools}>All tools</a><a href={imageStudioBrand.links.about}>About</a><a href={imageStudioBrand.links.contact}>Contact</a><a href={imageStudioBrand.links.privacy}>Privacy policy</a><a href={imageStudioBrand.links.terms}>Terms</a></nav></div>
        </div>
      </footer>
    </div>
  );
}