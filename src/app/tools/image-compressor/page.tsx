import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, CheckCheck, ChevronRight, Crop, Download, Eye, FileImage, FolderDown, Globe, HardDrive, Image as ImageIcon, Info, Layers, Link2, LockKeyhole, Mail, Monitor, Plus, ScanLine, ShieldCheck, SlidersHorizontal, Smartphone, Target, Upload, WifiOff } from "lucide-react";
import { imageStudioBrand } from "@/lib/image-studio/brand";
import { ImageCompressorTool } from "./image-compressor-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import { ImageStudioStartLink } from "./image-studio-start-link";
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
  { icon: Target, title: "Set a maximum file size", text: "Need a 50 KB or 100 KB photo? Choose your limit. The result tells you whether the actual file fits, with no padded or invented sizes." },
  { icon: FileImage, title: "Convert image formats", text: "Save as JPG, PNG, WebP or AVIF. You can also add HEIC photos from your phone and convert supported files locally." },
  { icon: Layers, title: "Compress a batch", text: "Add up to 50 images within the displayed file limits. Track each result, cancel processing or retry a failed image." },
  { icon: Crop, title: "Crop and resize", text: "Set a width, height or percentage. Crop individual images and keep their proportions without stretching." },
  { icon: Eye, title: "Inspect the actual output", text: "Compare the encoded result with its matching pre-encode reference. Use the slider, side-by-side view and zoom to judge detail." },
  { icon: ShieldCheck, title: "Source metadata removed", text: "EXIF, GPS and camera metadata are always discarded on export. A local scan flags markers it can detect before processing." },
  { icon: FolderDown, title: "Download your way", text: "Save one image or a ZIP. Folder export and mobile file sharing appear only when the browser supports them." },
  { icon: Link2, title: "Reuse settings, not files", text: "Start with seven editable presets, save your own locally or copy a settings-only link. Images and crops are not saved in presets." },
];

const steps = [
  { icon: Upload, title: "Add your images", text: "Choose files, drag them into the box, or paste from your clipboard. Your original files stay unchanged." },
  { icon: SlidersHorizontal, title: "Choose a size and format", text: "Use Target for a limit such as 50 KB, Quality for a smaller file, or Resize for new dimensions. Then select Compress images." },
  { icon: Download, title: "Review and download", text: "Compare the before-and-after preview and check the final file size. Download one image or save the whole batch as a ZIP." },
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

      <ImageStudioStartLink className="isp-skip-link">Skip to image tool</ImageStudioStartLink>
      <section id="image-studio-top" tabIndex={-1} className="isp-hero isp-anchor-target" aria-labelledby="image-studio-title">
        <nav className="isp-container isp-breadcrumb" aria-label="Breadcrumb">
          <Link href="/" prefetch={false}>ByteVerse</Link><ChevronRight size={14} aria-hidden="true" /><Link href="/tools" prefetch={false}>Free tools</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Image compressor</span>
        </nav>
        <div className="isp-container isp-hero-grid">
          <div className="isp-hero-copy">
            <p className="isp-hero-kicker"><ImageIcon size={16} aria-hidden="true" /> FREE ONLINE IMAGE COMPRESSOR</p>
            <h1 id="image-studio-title">Smaller images.<span>Ready for what’s next.</span></h1>
            <p className="isp-hero-description">Need a <strong>50 KB photo</strong>, a lighter website image or a smaller attachment? Compress, resize and convert your images—right here in your browser.</p>
            <ul className="isp-benefits" aria-label="Studio benefits">
              {["No image uploads", "No signup", "No watermarks"].map(benefit => <li key={benefit}><Check size={15} aria-hidden="true" />{benefit}</li>)}
            </ul>
            <div className="isp-hero-actions">
              <ImageStudioStartLink className="isp-button isp-button-primary"><Upload size={18} aria-hidden="true" /> Start compressing <ArrowRight size={17} aria-hidden="true" /></ImageStudioStartLink>
              <a href="#how-it-works" className="isp-button isp-button-quiet">How to use it <ChevronRight size={16} aria-hidden="true" /></a>
            </div>
            <p className="isp-hero-trust"><LockKeyhole size={15} aria-hidden="true" /> Your photos stay on your device. Your originals stay untouched.</p>
          </div>

          <figure className="isp-hero-figure">
            <div className="isp-photo-card">
              <Image className="isp-hero-photo" src="/images/tools/image-compressor/hero-moraine-lake.webp" alt="Sunlit mountain peaks and evergreen forest reflected in the turquoise water of Moraine Lake" width={1200} height={800} unoptimized loading="eager" fetchPriority="high" />
              <span className="isp-photo-label"><ImageIcon size={14} aria-hidden="true" /> A little room for the big picture</span>
              <div className="isp-photo-bottom"><div><strong>Your photo. Your settings.</strong><span>Preview the result before you download.</span></div><span className="isp-photo-icon"><ScanLine size={22} aria-hidden="true" /></span></div>
            </div>
            <figcaption>Sample photo, not a compression result. <a href="https://www.pexels.com/photo/lake-and-mountain-417074/" target="_blank" rel="noopener noreferrer">James Wheeler / Pexels</a></figcaption>
          </figure>
        </div>
      </section>

      <nav className="isp-section-nav" aria-label="Image compressor sections"><div className="isp-container"><ImageStudioStartLink>Compressor</ImageStudioStartLink><a href="#how-it-works">How to use</a><a href="#features">Features</a><a href="#privacy">Privacy</a><a href="#faq">FAQs</a></div></nav>
      <div className="isp-tool-surface">
        <div className="isp-container">
          <div className="isp-tool-intro"><div><h2>Let’s make it smaller.</h2><p>Add images, choose your settings, then compress and download.</p></div><div className="isp-format-chips" aria-label="Output formats">{["JPG", "PNG", "WebP", "AVIF"].map(format => <span key={format}>{format}</span>)}</div></div>
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
          <div className="isp-section-heading"><p className="isp-eyebrow">More than a smaller file</p><h2 id="image-features-title" className="isp-heading">Everything you need to prepare an image.</h2><p className="isp-section-lead">Set a size limit, change formats, crop and resize, then check the actual result. All in one free ByteVerse tool.</p></div>
          <div className="isp-feature-grid">{features.map(({ icon: Icon, title, text }) => <article className="isp-feature" key={title}><div className="isp-feature-icon"><Icon size={21} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
          <div className="isp-engine-note"><CheckCheck size={23} aria-hidden="true" /><div><h3>Measured outputs, not marketing numbers.</h3><p>Target mode searches actual encodes within a bounded attempt budget. Auto compares eligible formats using dimensions, a sampled pixel-error metric and bytes—not an objective perceptual score. PNG has no quality slider, and even a successful encode can be larger than its source.</p></div></div>
        </div>
      </section>

      <section id="how-it-works" className="isp-section isp-steps-section isp-anchor-target" tabIndex={-1} aria-labelledby="image-steps-title">
        <div className="isp-container">
          <p className="isp-eyebrow">Three simple steps</p><h2 id="image-steps-title" className="isp-heading">How to compress your images.</h2>
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

    </div>
  );
}