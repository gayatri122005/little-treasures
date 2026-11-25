"use client";

import { useState, type FormEvent } from "react";
import { emailOnlySchema } from "@/lib/validation";

export default function ResendVerificationForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const parsed = emailOnlySchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to request a new link.");
      setMessage(result.message ?? "If verification is needed, a new link will be sent when email delivery is configured.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-[#E3D8C9] pt-4">
      <label htmlFor="resend-verification-email" className="block text-xs font-semibold text-[#1E1B18]">
        Resend verification link
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="resend-verification-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-h-11 min-w-0 flex-1 rounded border border-[#E3D8C9] bg-white px-3 text-sm outline-none focus:border-[#B85042]"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-full bg-[#1E1B18] px-4 text-[10px] font-semibold tracking-[0.08em] text-white disabled:opacity-60"
        >
          {busy ? "SENDING…" : "RESEND LINK"}
        </button>
      </div>
      {message && <p role="status" className="text-xs leading-5 text-[#48644a]">{message}</p>}
      {error && <p role="alert" className="text-xs leading-5 text-[#9a4338]">{error}</p>}
    </form>
  );
}
