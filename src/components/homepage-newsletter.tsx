"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import styles from "./homepage-newsletter.module.css";

const subscribeToHydration = () => () => {};

export function HomepageNewsletter() {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const pending = useRef(false);

  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || status === "success") return;
    const form = new FormData(event.currentTarget);
    if (form.get("website")) return;
    pending.current = true;
    setStatus("loading");
    setMessage("Subscribing…");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        setStatus("error");
        setMessage(response.status === 429 ? "Too many attempts. Please try again in a few minutes." : "Subscriptions are unavailable right now. Please try again later.");
        return;
      }
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("message" in data) || typeof data.message !== "string" || !data.message) throw new Error("Invalid response");
      setStatus("success");
      setMessage("Subscription request received. Thank you.");
    } catch {
      setStatus("error");
      setMessage("Could not subscribe. Check your connection and try again.");
    } finally {
      pending.current = false;
    }
  }

  return (
    <form method="post" action="/api/newsletter" onSubmit={subscribe} className={styles.form} aria-label="ByteVerse newsletter" aria-busy={status === "loading"}>
      {/* Without the JSON submit handler, do not leak an email into a GET URL. */}
      <fieldset disabled={!hydrated}>
        <label className={styles.label} htmlFor="home-newsletter-email">Your email address</label>
        <div className={styles.inputRow}>
          <input
            id="home-newsletter-email" name="email" type="email" autoComplete="email"
            inputMode="email" maxLength={254} required value={email}
            onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"
            disabled={status === "loading" || status === "success"}
            aria-describedby="home-newsletter-note home-newsletter-status" className={styles.input}
          />
          <button type="submit" disabled={status === "loading" || status === "success"} className={styles.button}>
            {status === "loading" ? <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            {status === "success" ? "Request sent" : "Subscribe"}
          </button>
        </div>
        <div hidden aria-hidden="true"><label htmlFor="home-newsletter-website">Leave this empty</label><input id="home-newsletter-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
      </fieldset>
      <noscript><p className={styles.note}>Enable JavaScript to subscribe to email updates.</p></noscript>
      <p id="home-newsletter-status" role="status" aria-atomic="true" className={`${styles.status} ${status === "error" ? styles.error : ""}`}>{message}</p>
      <p id="home-newsletter-note" className={styles.note}>By subscribing, you agree to receive ByteVerse updates. <Link href="/privacy" prefetch={false}>Privacy policy</Link>.</p>
    </form>
  );
}