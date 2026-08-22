import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench, BookOpen, Volume2, Gauge, Languages, Play, Shield, ListChecks, AlertTriangle } from "lucide-react";
import { TextToSpeechTool } from "./text-to-speech-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";

const toolConfig = {
  name: "Text to Speech Converter",
  title: "Text to Speech Online - Free, Unlimited, No Login",
  description:
    "Free text to speech online — unlimited, no login, no word limits. Paste text, pick from 30+ language voices, adjust speed and pitch, listen instantly.",
  slug: "text-to-speech",
  keywords: [
    "text to speech online",
    "text to speech online free",
    "text to speech online free unlimited",
    "text to speech free without login",
    "text to speech free",
    "text to speech",
    "tts online free",
    "read text aloud online",
    "text to voice",
    "online tts",
    "speech synthesis",
    "text reader",
    "listen to text online",
  ],
  featureList: [
    "Unlimited free text to speech",
    "30+ language voices",
    "Speed, pitch, and volume control",
    "Play, pause, resume controls",
    "No login, no word limits, fully private",
  ],
  faqs: [
    {
      question: "Is this text to speech tool free and unlimited?",
      answer:
        "Yes — completely free with no word limits, no daily caps, and no login. It uses the Web Speech API built into your browser, so there is nothing to meter and no text ever leaves your device.",
    },
    {
      question: "Can I download the audio as MP3?",
      answer:
        "Browser speech synthesis plays audio but cannot export files — that is a Web Speech API limit, not a paywall. For downloadable MP3 voiceovers, use a dedicated generator; our free TTS tools roundup compares the best export-capable options.",
    },
    {
      question: "What voices and languages are available?",
      answer:
        "Voices come from your browser and operating system — Chrome and Edge typically offer 20–30+ across English, Spanish, French, German, Chinese, Japanese, Hindi, Urdu, Arabic, and more. Safari on macOS has some of the most natural free voices anywhere.",
    },
    {
      question: "Is my text private?",
      answer:
        "Completely. Speech is synthesized on your device — no text is uploaded, stored, or sent to any server, which makes it safe for private notes, drafts, and documents.",
    },
    {
      question: "Why does the voice sound different on my phone?",
      answer:
        "Because voices belong to the device: iOS, Android, Windows, and macOS each ship different voice packs. For consistent narration across devices, use a cloud AI voice generator instead of browser TTS.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const features = [
  { icon: Volume2, title: "Every System Voice", desc: "Uses all voices installed on your device — typically 20–30+ in Chrome and Edge across dozens of languages." },
  { icon: Gauge, title: "Speed & Pitch Control", desc: "0.25x for language learning, up to 4x for power-listening notes. Pitch and volume tune the voice to taste." },
  { icon: Play, title: "Full Playback Controls", desc: "Play, pause, resume, and restart — listen to long documents in comfortable sessions." },
  { icon: Languages, title: "30+ Languages", desc: "English, Spanish, Hindi, Urdu, Arabic, Chinese, Japanese, and more — whatever voices your device includes." },
  { icon: Shield, title: "Fully Private", desc: "Synthesis happens on your device — no uploads, no accounts, no logs. Safe for private text." },
  { icon: ListChecks, title: "Truly Unlimited", desc: "No word counts, no daily quotas, no premium tier — browser TTS has nothing to meter." },
];

export default function TextToSpeechPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <ToolJsonLd config={toolConfig} />

      {/* Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Free Tool · Unlimited · No Login</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Text to Speech Online — Free & Unlimited
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Paste any text and hear it spoken aloud instantly — no login, no word limits, no cost.
          Choose from 30+ language voices on your device, control speed and pitch, and listen
          privately: nothing you type ever leaves your browser.
        </p>
      </div>

      <TextToSpeechTool />

      {/* How to use */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">How to Convert Text to Speech in 3 Steps</h2>
        <ol className="grid gap-4">
          {[
            { step: "Paste or type your text", detail: "Notes, articles, emails, scripts — any length. There is no word limit because synthesis runs on your device." },
            { step: "Pick a voice and tune it", detail: "Choose from your system's voices (filter by language), then set speed, pitch, and volume to taste." },
            { step: "Press play and listen", detail: "Pause, resume, or restart anytime — proofread by ear, study hands-free, or rest your eyes." },
          ].map((item, i) => (
            <li key={item.step} className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card">
              <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary font-extrabold text-sm">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base">{item.step}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Why This TTS Reader Stays Free
</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            It runs on your browser's built-in speech engine — no server costs means no paywalls, genuinely.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon size={18} className="text-primary" />
                </span>
                <h3 className="font-bold text-sm sm:text-base">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Download honesty */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Need to Download the Audio? Read This First</h2>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            <AlertTriangle size={15} className="text-amber-500 inline mr-1.5 -mt-0.5" />
            Browser speech synthesis plays audio but cannot save it as a file — an API limitation, not a
            trick to upsell you. If you need MP3 voiceovers for videos, podcasts, or narration, the right
            lane is a dedicated generator: the export-capable free options are compared in our{" "}
            <Link href="/blog/best-free-text-to-speech-tools-2026" className="text-primary hover:underline">free TTS tools roundup</Link>, and
            studio-grade voices (ElevenLabs class) in the{" "}
            <Link href="/blog/best-ai-voice-generators-2026" className="text-primary hover:underline">AI voice generator rankings</Link>.
            For listening — proofreading, studying, accessibility — this free tool is all you need.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">What People Use It For</h2>
        <ul className="grid gap-3">
          {[
            "Proofreading by ear — your ears catch the clunky sentences your eyes skip; the single best free editing trick for writers",
            "Studying — turn notes into audio and review while commuting or exercising",
            "Language practice — hear native-accent pronunciation at 0.5x speed in 30+ languages",
            "Accessibility — listen instead of reading during eye strain, dyslexia, or screen fatigue",
            "Script previews — creators hear pacing and tone before recording the real voiceover",
          ].map((useCase) => (
            <li key={useCase} className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground leading-relaxed">
              <ArrowRight size={15} className="text-primary shrink-0 mt-0.5" /> {useCase}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-16 md:mt-20 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">Frequently Asked Questions</h2>
        <div className="grid gap-4">
          {toolConfig.faqs.map((faq) => (
            <div key={faq.question} className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-bold text-sm sm:text-base mb-1.5">{faq.question}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="mx-auto mt-16 md:mt-20 max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 text-center">More Voice & Text Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><Wrench size={16} className="text-primary" /> Related Free Tools</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/tools/word-counter" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Word Counter — reading time before listening time</Link></li>
              <li><Link href="/tools/plagiarism-checker" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Similarity Checker — verify text originality</Link></li>
              <li><Link href="/tools/ai-content-detector" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> AI Content Detector — human or AI text?</Link></li>
              <li><Link href="/tools/markdown-to-html" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Markdown to HTML — publish-ready conversion</Link></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 mb-3"><BookOpen size={16} className="text-primary" /> Related Guides</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link href="/blog/best-free-text-to-speech-tools-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> 10 Best Free Text to Speech Tools (with MP3 export)</Link></li>
              <li><Link href="/blog/best-ai-voice-generators-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> 7 Best AI Voice Generators (Ranked)</Link></li>
              <li><Link href="/blog/faceless-youtube-channel-with-ai-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Faceless YouTube Channel with AI Voices</Link></li>
              <li><Link href="/blog/best-ai-tools-for-podcasters-2026" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"><ArrowRight size={13} /> Best AI Tools for Podcasters</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
