import type { Metadata } from "next";
import { ImageCompressorTool } from "./image-compressor-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Image Compressor",
  title: "Image Compressor - Free Online Image Optimizer",
  description:
    "Compress JPG, PNG, and WebP images online. Resize photos, adjust quality, convert formats, preview results, and download optimized images. Free and private.",
  slug: "image-compressor",
  keywords: [
    "image compressor",
    "compress image online",
    "photo compressor",
    "image optimizer",
    "reduce image size",
    "jpg compressor",
    "png compressor",
    "webp converter",
    "resize image online",
  ],
  applicationCategory: "MultimediaApplication",
  featureList: [
    "Compress JPG, PNG, and WebP images",
    "Resize images by maximum width and height",
    "Convert images to JPG, PNG, or WebP",
    "Preview original and compressed images",
    "Download optimized files from the browser",
  ],
  audience: "Bloggers, developers, marketers, designers, and website owners optimizing images for faster pages",
  faqs: [
    {
      question: "Is this image compressor private?",
      answer:
        "Yes. Compression runs in your browser with the Canvas API. Your image is not uploaded to ByteVerse or any external server.",
    },
    {
      question: "Which image formats are supported?",
      answer:
        "You can upload JPG, PNG, and WebP images. The optimized output can be downloaded as JPG, PNG, or WebP depending on browser support.",
    },
    {
      question: "Does compressing images reduce quality?",
      answer:
        "Lossy formats like JPG and WebP reduce file size by lowering visual quality. Use the quality slider to balance smaller files with acceptable image clarity.",
    },
    {
      question: "Should I use JPG, PNG, or WebP?",
      answer:
        "Use WebP for the best web compression, JPG for photos and broad compatibility, and PNG when you need transparency or sharp UI graphics.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function ImageCompressorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Image Compressor</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Compress, resize, and convert images directly in your browser. Upload a JPG, PNG, or WebP file, tune the quality and dimensions, then download the optimized result.
        </p>
      </div>

      <ImageCompressorTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>Why Use an Image Compressor?</h2>
        <p>
          Large images slow down websites, increase bandwidth usage, and hurt Core Web Vitals. A good image compressor reduces file size while keeping enough visual quality for blogs, landing pages, portfolios, ecommerce pages, and social posts.
        </p>

        <h2>How to Get Smaller Images</h2>
        <ul>
          <li><strong>Use WebP</strong> for most website images because it usually creates smaller files than JPG or PNG.</li>
          <li><strong>Resize large photos</strong> before uploading them to a blog or CMS. Most article images do not need to be wider than 1600 pixels.</li>
          <li><strong>Lower quality gradually</strong> until the file is small but still looks clean on your target screen size.</li>
          <li><strong>Keep PNG only when needed</strong> for transparency, icons, screenshots, or sharp interface graphics.</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        <h3>Is this image compressor free?</h3>
        <p>Yes. It is free, runs in your browser, and does not require an account.</p>
        <h3>Are my images uploaded?</h3>
        <p>No. The file is processed locally with browser APIs, so the image stays on your device.</p>
        <h3>Can I resize and compress at the same time?</h3>
        <p>Yes. Set maximum width and height, choose an output format, adjust quality, and the tool will resize and compress in one step.</p>
        <h3>What quality setting should I use?</h3>
        <p>For web images, 70 to 82 percent is a good starting range. Use a higher setting for detailed product photos and a lower setting for large background images.</p>
      </section>
    </main>
  );
}