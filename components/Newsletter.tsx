"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/icons";

export default function Newsletter() {
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    setSubmitting(true);
    setNotice("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload: unknown = await response.json();
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : "We couldn’t save your subscription. Please try again.";
      if (!response.ok) throw new Error(message);
      setNotice(message);
      form.reset();
    } catch (requestError) {
      setNotice(
        requestError instanceof Error
          ? requestError.message
          : "We couldn’t save your subscription. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="newsletter" className="page-shell py-12 sm:py-16">
      <div className="relative overflow-hidden rounded-3xl bg-[var(--ink)] px-5 py-10 text-center text-white sm:px-10 sm:py-14">
        <span className="absolute -right-8 -top-10 text-white/5">
          <Icon name="sparkle" className="size-44" strokeWidth={0.7} />
        </span>
        <span className="absolute -bottom-14 -left-8 text-white/5">
          <Icon name="sparkle" className="size-36" strokeWidth={0.7} />
        </span>
        <div className="relative mx-auto max-w-[590px]">
          <p className="eyebrow eyebrow-on-dark">A little note from us</p>
          <h2 className="serif-display mt-3 text-4xl sm:text-5xl">
            Good things, in your inbox.
          </h2>
          <p className="mx-auto mt-3 max-w-[420px] text-sm leading-6 text-white/70">
            Leave your email for future collection notes. Newsletter emails
            are not being sent yet.
          </p>
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-7 flex max-w-[440px] flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="Your email address"
              className="min-h-12 min-w-0 flex-1 rounded-full border border-[var(--line)] bg-[var(--page)] px-5 text-sm placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="min-h-12 rounded-full bg-[var(--purple)] px-6 text-[10px] font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[var(--purple-dark)] disabled:cursor-wait disabled:opacity-70"
            >
              {submitting ? "SAVING…" : "COUNT ME IN"}
            </button>
          </form>
          <p className="mt-3 min-h-5 text-xs text-white/70" aria-live="polite">
            {notice}
          </p>
        </div>
      </div>
    </section>
  );
}
