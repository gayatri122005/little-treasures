"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { changePasswordSchema } from "@/lib/validation";

const responseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export default function CustomerPasswordForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedInput = changePasswordSchema.safeParse(form);
    if (!parsedInput.success) {
      setError(parsedInput.error.issues[0]?.message ?? "Check your password details.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsedInput.data),
      });
      const payload: unknown = await response.json();
      const result = responseSchema.safeParse(payload);

      if (!response.ok || !result.success || !result.data.success) {
        setError(
          result.success
            ? result.data.message ?? "Unable to update your password."
            : "The server returned an unexpected response.",
        );
        return;
      }

      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      router.replace("/signin?passwordChanged=1");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="change-password-heading"
      className="rounded-3xl border border-[#E3D8C9] bg-[#FAF7F2] p-6 shadow-sm"
    >
      <p className="eyebrow">Account security</p>
      <h2
        id="change-password-heading"
        className="serif-display mt-2 text-3xl text-[#1E1B18]"
      >
        Change password
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#6E655F]">
        Confirm your current password and choose a new one. You will need to
        sign in again after it is updated.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="current-password" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
            Current password
          </label>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={form.currentPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, currentPassword: event.target.value }))
            }
            className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
            New password
          </label>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            value={form.newPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, newPassword: event.target.value }))
            }
            className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="confirm-new-password" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
            Confirm new password
          </label>
          <input
            id="confirm-new-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, confirmPassword: event.target.value }))
            }
            className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
          />
        </div>
        <p className="text-[11px] leading-5 text-[#6E655F] sm:col-span-2">
          Use at least 8 characters with an uppercase letter, lowercase letter, number, and special character.
        </p>
        {error && (
          <p className="text-sm text-[#9b5545] sm:col-span-2" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 bg-[#1E1B18] px-5 text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#9A3F33] disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "UPDATING…" : "UPDATE PASSWORD"}
          </button>
          <Link
            href="/signin"
            className="min-h-11 self-start py-3 text-xs font-semibold tracking-[0.08em] text-[#1E1B18] underline-offset-4 hover:underline sm:self-auto"
          >
            SIGN IN PAGE
          </Link>
        </div>
      </form>
    </section>
  );
}
