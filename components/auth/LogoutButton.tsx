"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error("Unable to sign out right now.");
      }
      window.dispatchEvent(new Event("omtreasure:auth-changed"));
      router.replace("/");
      router.refresh();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Unable to sign out right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--page)] px-4 text-xs font-semibold tracking-[0.08em] text-[var(--ink)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "SIGNING OUT…" : "SIGN OUT"}
      </button>
      {error && (
        <p className="text-xs text-[#9b5545]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
