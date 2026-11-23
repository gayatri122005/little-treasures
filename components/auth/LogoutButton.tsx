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
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#E3D8C9] bg-[#FAF7F2] px-4 text-xs font-semibold tracking-[0.08em] text-[#1E1B18] transition-colors hover:border-[#1E1B18] hover:text-[#1E1B18] disabled:cursor-wait disabled:opacity-60"
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
