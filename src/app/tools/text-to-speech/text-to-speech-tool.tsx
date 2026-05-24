"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  RotateCcw,
  Gauge,
  Languages,
} from "lucide-react";

type PlayState = "idle" | "playing" | "paused";

export function TextToSpeechTool() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [supported, setSupported] = useState(true);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  /* ── Load available voices ─────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const v = synthRef.current!.getVoices();
      if (v.length > 0) {
        setVoices(v);
        // Default to first English voice or first available
        const english = v.find((voice) => voice.lang.startsWith("en"));
        setSelectedVoice((english || v[0]).name);
      }
    };

    loadVoices();
    synthRef.current.addEventListener("voiceschanged", loadVoices);

    return () => {
      synthRef.current?.removeEventListener("voiceschanged", loadVoices);
      synthRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  /* ── Speak ─────────────────────────────────────────── */
  const speak = useCallback(() => {
    if (!synthRef.current || !text.trim()) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onend = () => setPlayState("idle");
    utterance.onerror = () => setPlayState("idle");

    synthRef.current.speak(utterance);
    setPlayState("playing");
  }, [text, selectedVoice, voices, rate, pitch, volume]);

  const pauseResume = useCallback(() => {
    if (!synthRef.current) return;
    if (playState === "playing") {
      synthRef.current.pause();
      setPlayState("paused");
    } else if (playState === "paused") {
      synthRef.current.resume();
      setPlayState("playing");
    }
  }, [playState]);

  const stop = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setPlayState("idle");
  }, []);

  /* ── Copy text ─────────────────────────────────────── */
  const copyText = useCallback(async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  /* ── Reset ─────────────────────────────────────────── */
  const reset = useCallback(() => {
    stop();
    setText("");
    setRate(1);
    setPitch(1);
    setVolume(1);
  }, [stop]);

  /* ── Estimated duration ────────────────────────────── */
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = wordCount > 0 ? Math.ceil((wordCount / 150) * 60 / rate) : 0;
  const formatDuration = (s: number) => {
    if (s === 0) return "0s";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  /* ── Group voices by language ──────────────────────── */
  const groupedVoices = voices.reduce<Record<string, SpeechSynthesisVoice[]>>((acc, v) => {
    const lang = v.lang.split("-")[0].toUpperCase();
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(v);
    return acc;
  }, {});

  if (!supported) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-card border border-border rounded-xl text-center">
        <VolumeX size={48} className="mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Not Supported</h2>
        <p className="text-muted-foreground">
          Your browser does not support the Web Speech API. Try Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-card border border-border rounded-lg text-center">
          <Languages size={18} className="mx-auto mb-1 text-blue-500" />
          <div className="text-lg font-bold">{voices.length}</div>
          <div className="text-xs text-muted-foreground">Voices</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-lg text-center">
          <Gauge size={18} className="mx-auto mb-1 text-emerald-500" />
          <div className="text-lg font-bold">{rate}x</div>
          <div className="text-xs text-muted-foreground">Speed</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-lg text-center">
          <Volume2 size={18} className="mx-auto mb-1 text-purple-500" />
          <div className="text-lg font-bold">{wordCount}</div>
          <div className="text-xs text-muted-foreground">Words</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-lg text-center">
          <Play size={18} className="mx-auto mb-1 text-orange-500" />
          <div className="text-lg font-bold">{formatDuration(estimatedSeconds)}</div>
          <div className="text-xs text-muted-foreground">Est. Duration</div>
        </div>
      </div>

      {/* Text area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here to convert to speech..."
          rows={10}
          className="w-full p-4 text-sm bg-muted/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed"
          autoFocus
        />
        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
          {charCount.toLocaleString()} chars
        </div>
      </div>

      {/* Controls */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Voice selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Voice</label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            title="Select voice"
            className="w-full p-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {Object.entries(groupedVoices).sort().map(([lang, langVoices]) => (
              <optgroup key={lang} label={lang}>
                {langVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Speed control */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Speed: {rate}x
          </label>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            title="Speech speed"
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.25x</span>
            <span>4x</span>
          </div>
        </div>

        {/* Pitch control */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Pitch: {pitch}
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
            title="Voice pitch"
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Volume slider */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          Volume: {Math.round(volume * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          title="Volume level"
          className="w-full accent-primary"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {playState === "idle" ? (
          <button
            onClick={speak}
            disabled={!text.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={18} />
            Speak
          </button>
        ) : (
          <>
            <button
              onClick={pauseResume}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              {playState === "playing" ? <Pause size={18} /> : <Play size={18} />}
              {playState === "playing" ? "Pause" : "Resume"}
            </button>
            <button
              onClick={stop}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Square size={18} />
              Stop
            </button>
          </>
        )}

        <button
          onClick={copyText}
          disabled={!text}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-40"
        >
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy Text"}
        </button>

        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      {/* Sample texts */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Quick Samples</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "English", text: "The quick brown fox jumps over the lazy dog. This is a sample sentence to test the text to speech engine with natural-sounding voice output." },
            { label: "News Article", text: "Breaking news: Scientists have discovered a new species of deep-sea fish near the Mariana Trench. The creature, which glows in total darkness, has adapted to survive at pressures over 1,000 atmospheres." },
            { label: "Technical", text: "React 19 introduces a new compiler that automatically memoizes components. This eliminates the need for useMemo, useCallback, and React.memo in most cases, reducing boilerplate by up to 40 percent." },
            { label: "Story", text: "Once upon a time, in a small village nestled between two mountains, there lived a young programmer who dreamed of building software that would change the world. Every night, she would code by candlelight until the stars faded." },
          ].map((sample) => (
            <button
              key={sample.label}
              onClick={() => { stop(); setText(sample.text); }}
              className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
