"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthInput from "@/components/auth/AuthInput";
import PasswordToggle from "@/components/auth/PasswordToggle";
import { resetPasswordSchema, validationErrors } from "@/lib/validation";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setErrors({});
    const parsed = resetPasswordSchema.safeParse({ token, ...form });
    if (!parsed.success) {
      setErrors(validationErrors(parsed.error));
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "This reset link is invalid or expired.");
      setMessage(result.message ?? "Your password has been updated.");
      window.setTimeout(() => router.replace("/signin?passwordChanged=1"), 900);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return <p role="alert" className="rounded border border-[#f0d2d0] bg-[#fff2f1] p-4 text-sm text-[#81362e]">This password reset link is missing or invalid. Request a new one from the sign-in page.</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AuthInput
        label="New password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        suffix={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />}
        error={errors.password}
        minLength={8}
        maxLength={72}
        required
      />
      <AuthInput
        label="Confirm new password"
        name="confirmPassword"
        type={showConfirm ? "text" : "password"}
        autoComplete="new-password"
        placeholder="Enter it again"
        value={form.confirmPassword}
        onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
        suffix={<PasswordToggle visible={showConfirm} onToggle={() => setShowConfirm((visible) => !visible)} />}
        error={errors.confirmPassword}
        minLength={8}
        maxLength={72}
        required
      />
      <p className="text-[11px] leading-5 text-[var(--muted)]">Use at least 8 characters with an uppercase letter, lowercase letter, number, and special character.</p>
      {message && <p role="status" className="rounded border border-[#d5e0d4] bg-[#f1f6ef] px-3 py-2.5 text-sm text-[#38513a]">{message}</p>}
      {error && <p role="alert" className="rounded border border-[#f0d2d0] bg-[#fff2f1] px-3 py-2.5 text-sm text-[#81362e]">{error}</p>}
      <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] px-6 text-xs font-semibold tracking-[0.12em] text-white hover:bg-[var(--purple-dark)] disabled:opacity-70">
        {busy ? "UPDATING PASSWORD…" : "UPDATE PASSWORD"}
      </button>
    </form>
  );
}
