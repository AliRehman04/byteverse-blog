import type { Metadata } from "next";
import { TextToSpeechTool } from "./text-to-speech-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Text to Speech Converter",
  title: "Free Text to Speech Online - TTS Tool",
  description:
    "Convert text to speech online for free. Choose from 100+ voices, adjust speed, pitch, and volume. Works in your browser — no sign-up required.",
  slug: "text-to-speech",
  keywords: [
    "text to speech",
    "text to speech online",
    "tts",
    "free text to speech",
    "text to voice",
    "online tts",
    "speech synthesis",
    "read text aloud",
    "text reader",
    "voice generator",
  ],
  faqs: [
    {
      question: "Is this text to speech tool free?",
      answer:
        "Yes, completely free. It uses the Web Speech API built into your browser so there are no limits, no accounts, and no data sent to any server.",
    },
    {
      question: "What voices are available?",
      answer:
        "Available voices depend on your browser and operating system. Chrome and Edge typically offer 20-30+ voices across many languages. Safari provides premium quality voices on macOS.",
    },
    {
      question: "Can I download the audio?",
      answer:
        "The Web Speech API does not support direct audio file export. For downloadable audio, consider using dedicated TTS services like Google Cloud TTS or Amazon Polly.",
    },
    {
      question: "Does it work with other languages?",
      answer:
        "Yes. Most modern browsers include voices for 30+ languages including Spanish, French, German, Chinese, Japanese, Hindi, Arabic, and many more.",
    },
    {
      question: "Is my text private?",
      answer:
        "Absolutely. All processing happens locally in your browser. No text is sent to any server or stored anywhere.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

export default function TextToSpeechPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Text to Speech Converter
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Type or paste any text and hear it spoken aloud. Choose from dozens
          of voices, adjust speed, pitch, and volume — all in your browser.
        </p>
      </div>

      <TextToSpeechTool />

      <section className="mt-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h2>How It Works</h2>
        <p>
          This tool uses the Web Speech API (SpeechSynthesis) built into
          modern browsers. Your text is processed entirely on your device —
          nothing is uploaded to a server.
        </p>

        <h2>Features</h2>
        <ul>
          <li><strong>Multiple voices</strong> — Choose from all voices installed on your system</li>
          <li><strong>Speed control</strong> — Slow down to 0.25x or speed up to 4x</li>
          <li><strong>Pitch adjustment</strong> — Make the voice higher or lower</li>
          <li><strong>Volume control</strong> — Fine-tune listening volume</li>
          <li><strong>Play, pause, resume</strong> — Full playback controls</li>
          <li><strong>Quick samples</strong> — Try sample texts instantly</li>
          <li><strong>Multi-language</strong> — Works with 30+ languages</li>
        </ul>

        <h2>Use Cases</h2>
        <ul>
          <li>Proofread articles and blog posts by listening</li>
          <li>Practice pronunciation in different languages</li>
          <li>Accessibility — listen to text instead of reading</li>
          <li>Content creators previewing scripts and voiceovers</li>
          <li>Students studying and reviewing notes</li>
        </ul>

        <h2>Frequently Asked Questions</h2>
        {toolConfig.faqs.map((faq) => (
          <div key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
