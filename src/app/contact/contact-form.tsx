"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

type Status = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setNotice("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    // Honeypot check - if this field is filled, it's a bot
    const hp = String(formData.get("website") || "").trim();
    if (hp) {
      setStatus("success");
      setNotice("Message sent successfully! We'll get back to you soon.");
      return;
    }

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || message.length < 20) {
      setStatus("error");
      setNotice("Please fill all fields with a message of at least 20 characters.");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setNotice(data.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setNotice("Message sent successfully! We'll get back to you soon.");
      setTimeout(() => form.reset(), 500);
    } catch {
      setStatus("error");
      setNotice("Network error. Please check your connection and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
      {/* Honeypot field - hidden from real users, bots will fill it */}
      <div className="absolute opacity-0 -z-10" aria-hidden="true" tabIndex={-1}>
        <input type="text" name="website" autoComplete="off" tabIndex={-1} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Name</span>
          <input
            name="name"
            type="text"
            required
            maxLength={80}
            autoComplete="name"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">Email</span>
          <input
            name="email"
            type="email"
            required
            maxLength={120}
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <label className="mt-4 block space-y-2">
        <span className="text-sm font-semibold">Subject</span>
        <input
          name="subject"
          type="text"
          maxLength={140}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <label className="mt-4 block space-y-2">
        <span className="text-sm font-semibold">Message</span>
        <textarea
          name="message"
          required
          minLength={20}
          maxLength={4000}
          rows={7}
          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {status === "sending" ? "Sending..." : "Send Message"}
        </button>

        {notice && (
          <p
            className={`inline-flex items-center gap-2 text-sm ${
              status === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            }`}
          >
            {status === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {notice}
          </p>
        )}
      </div>
    </form>
  );
}