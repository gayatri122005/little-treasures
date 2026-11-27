"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";

export default function VerifyEmailAction() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "This verification link is invalid or expired.");
      setVerified(true);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Unable to verify your email.");
    } finally {
      setBusy(false);
    }
  }

  if (verified) {
    return (
      <div className="space-y-4 text-center">
        <p role="status" className="rounded border border-[#d5e0d4] bg-[#f1f6ef] px-4 py-3 text-sm text-[#38513a]">Your email is verified. Your account is ready.</p>
        <button type="button" onClick={() => { router.replace("/customer-dashboard"); router.refresh(); }} className="min-h-12 w-full rounded-full bg-[#1E1B18] px-6 text-xs font-semibold tracking-[0.12em] text-white hover:bg-[#9A3F33]">CONTINUE TO YOUR ACCOUNT</button>
      </div>
    );
  }

  return (
    <div>
      {token ? (
        <>
          <p className="mb-4 text-sm leading-6 text-[#6E655F]">Confirm your email address to activate your OMTreasure account.</p>
          {error && <p role="alert" className="mb-4 rounded border border-[#f0d2d0] bg-[#fff2f1] px-3 py-2.5 text-sm text-[#81362e]">{error}</p>}
          <button type="button" onClick={verify} disabled={busy} className="min-h-12 w-full rounded-full bg-[#1E1B18] px-6 text-xs font-semibold tracking-[0.12em] text-white hover:bg-[#9A3F33] disabled:opacity-70">
            {busy ? "VERIFYING…" : "VERIFY EMAIL"}
          </button>
          {error && <ResendVerificationForm />}
        </>
      ) : (
        <div>
          <p role="alert" className="rounded border border-[#f0d2d0] bg-[#fff2f1] p-4 text-sm text-[#81362e]">The verification link is missing or invalid.</p>
          <ResendVerificationForm />
        </div>
      )}
      <p className="mt-5 text-center text-xs text-[#6E655F]">Need to sign in? <Link href="/signin" className="font-semibold text-[#1E1B18] underline underline-offset-4">Go to sign in</Link></p>
    </div>
  );
}
