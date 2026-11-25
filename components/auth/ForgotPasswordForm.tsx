"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthInput from "@/components/auth/AuthInput";
import { emailOnlySchema } from "@/lib/validation";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = emailOnlySchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to request a reset link.");
      setMessage(result.message ?? "If an active account uses that email, reset instructions will be sent when email delivery is configured.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthInput
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {message && <p role="status" className="rounded border border-[#d5e0d4] bg-[#f1f6ef] px-3 py-2.5 text-sm leading-6 text-[#38513a]">{message}</p>}
        {error && <p role="alert" className="rounded border border-[#f0d2d0] bg-[#fff2f1] px-3 py-2.5 text-sm text-[#81362e]">{error}</p>}
        <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#1E1B18] px-6 text-xs font-semibold tracking-[0.12em] text-white hover:bg-[#9A3F33] disabled:opacity-70">
          {busy ? "REQUESTING LINK…" : "SEND RESET LINK"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-[#6E655F]">
        Remembered your password? <Link href="/signin" className="font-semibold text-[#1E1B18] underline underline-offset-4">Sign in</Link>
      </p>
    </div>
  );
}
