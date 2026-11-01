"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveRemoverHandoff } from "@/lib/plagiarism/remover-handoff";
import type { SentenceStatus, WebCheckReport } from "@/lib/plagiarism/web-check";
import "./web-check.css";

const ENDPOINT = "/api/plagiarism-web-check";
const MIN_CHARS = 80;
const MAX_CHARS = 9000;

const STATUS_LABEL: Record<SentenceStatus, string> = {
  matched: "Found online",
  "not-found": "Not found in results",
  unavailable: "Could not check",
};

type Phase = "idle" | "checking" | "done" | "error";

export function WebCheckPanel() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<WebCheckReport | null>(null);
  const [checkedText, setCheckedText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadStatus() {
      try {
        const response = await fetch(ENDPOINT, { cache: "no-store", signal: controller.signal });
        const data = (await response.json()) as { enabled?: unknown };
        setEnabled(response.ok && data.enabled === true);
      } catch {
        if (!controller.signal.aborted) setEnabled(false);
      }
    }
    void loadStatus();
    return () => controller.abort();
  }, []);

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const lengthOk = trimmed.length >= MIN_CHARS && trimmed.length <= MAX_CHARS;
  const canSubmit = enabled === true && lengthOk && phase !== "checking";

  function handleTextChange(value: string) {
    setText(value);
    if (phase === "checking") return;
    setReport(null);
    setMessage("");
    setPhase("idle");
  }

  async function runCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const submitted = trimmed;
    setPhase("checking");
    setReport(null);
    setMessage("");
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: submitted }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<WebCheckReport> & { error?: string };
      if (!response.ok || !Array.isArray(data.sentences)) {
        setMessage(data.error ?? "The check could not run. Try again later.");
        setPhase("error");
        return;
      }
      setCheckedText(submitted);
      setReport(data as WebCheckReport);
      setPhase("done");
    } catch {
      setMessage("Network error. Check your connection and try again.");
      setPhase("error");
    }
  }

  function openRemover() {
    saveRemoverHandoff(checkedText);
    router.push("/tools/plagiarism-remover");
  }

  return (
    <section className="sim-web" aria-labelledby="sim-web-heading">
      <p className="sim-web-kicker">Online check</p>
      <h2 id="sim-web-heading">Find sentences on public web pages</h2>
      <p className="sim-web-intro">
        Paste your article. Up to 12 sentences are searched as exact phrases, and the score shows the share of checked
        words that appear in the search excerpts returned for them.
      </p>

      <form className="sim-web-form" onSubmit={runCheck}>
        <label className="sim-web-label" htmlFor="sim-web-text">Your text</label>
        <textarea
          id="sim-web-text"
          className="sim-web-textarea"
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          placeholder="Paste at least 80 characters with complete sentences."
          aria-describedby="sim-web-disclosure"
          disabled={enabled !== true}
        />
        <div className="sim-web-meta">
          <span>{words} words · {trimmed.length.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")} characters</span>
          <button type="submit" className="sim-web-button" disabled={!canSubmit}>
            {phase === "checking" ? "Checking..." : "Check plagiarism"}
          </button>
        </div>
        <p id="sim-web-disclosure" className="sim-web-disclosure">
          When enabled, your text goes to ByteVerse&apos;s server for this one check. Up to 12 sentences, first 30 words each, are sent
          to Brave Search. ByteVerse does not store the text. Do not submit confidential material.
        </p>
      </form>

      {enabled === false && (
        <p className="sim-web-error" role="status">
          The online check is not set up yet. You can still compare your own sources below.
        </p>
      )}
      {phase === "error" && message && (
        <p className="sim-web-error" role="alert">{message}</p>
      )}

      {report && (
        <div className="sim-web-result" aria-live="polite">
          <div className="sim-web-score">
            <span className="sim-web-score-value">{report.score === null ? "—" : `${report.score}%`}</span>
            <span className="sim-web-score-label">Plagiarism score (estimate)</span>
          </div>
          <p className="sim-web-caveat">
            {report.score === null
              ? "No sentence could be checked, so no score is shown."
              : `${report.matchedWords} of ${report.checkedWords} words in the checked sentences appear verbatim in search excerpts.`}
            {" "}A match is a place to review, not proof of plagiarism. Common phrases and quotations can match, and an
            unmatched sentence is not proof of originality.
          </p>
          <ul className="sim-web-stats">
            <li>Checked {report.checkedSentences} of {report.eligibleSentences} sentences{report.sampled ? ", spread evenly across your text" : ""}</li>
            <li>{report.checkedWords} of {report.totalWords} words searched</li>
            {report.unavailableSentences > 0 && <li>{report.unavailableSentences} could not be checked</li>}
          </ul>

          <ol className="sim-web-sentences">
            {report.sentences.map((sentence, index) => (
              <li key={index} className={`sim-web-sentence sim-web-${sentence.status}`}>
                <span className="sim-web-status">{STATUS_LABEL[sentence.status]}</span>
                <blockquote>{sentence.text}</blockquote>
                {sentence.truncated && <p className="sim-web-note">Only the first 30 words were searched.</p>}
                {sentence.sources.length > 0 && (
                  <ul className="sim-web-sources">
                    {sentence.sources.map((source) => (
                      <li key={source.url}>
                        <a href={source.url} target="_blank" rel="nofollow noopener noreferrer">{source.title}</a>
                        <span>{source.hostname}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
          <p className="sim-web-attribution">Search results from Brave Search.</p>

          <div className="sim-web-next">
            <button type="button" className="sim-web-button" onClick={openRemover}>
              Rewrite and clean this text
            </button>
            <p>
              Opens the rewriter with this text in this browser tab. Rewriting does not remove the need to credit sources.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
