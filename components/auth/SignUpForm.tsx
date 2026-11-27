"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthInput from "@/components/auth/AuthInput";
import PasswordToggle from "@/components/auth/PasswordToggle";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";
import { registerSchema, validationErrors } from "@/lib/validation";

type RegistrationForm = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
};

export default function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [complete, setComplete] = useState<{ email: string; emailSent: boolean } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState<RegistrationForm>({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  function updateField(name: keyof RegistrationForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const parsedInput = registerSchema.safeParse(form);
    if (!parsedInput.success) {
      setFieldErrors(validationErrors(parsedInput.error));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsedInput.data),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result.errors && typeof result.errors === "object") setFieldErrors(result.errors);
        throw new Error(result.message || "Unable to complete registration.");
      }

      setComplete({ email: parsedInput.data.email, emailSent: result.emailSent === true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete registration.");
    } finally {
      setLoading(false);
    }
  }

  if (complete) {
    return (
      <section aria-live="polite" className="space-y-3">
        <div className="rounded border border-[#d5e0d4] bg-[#f1f6ef] p-4 text-sm leading-6 text-[#38513a]">
          <p className="font-semibold">Your account was created.</p>
          {complete.emailSent ? (
            <p>We sent a verification link to <strong>{complete.email}</strong>. Verify your email before signing in.</p>
          ) : (
            <p>The verification email was not sent because email delivery is not configured or could not be reached. The account remains unverified; configure email delivery, then request a new link below.</p>
          )}
        </div>
        <ResendVerificationForm initialEmail={complete.email} />
        <p className="pt-1 text-center text-xs text-[var(--muted)]">
          Already verified? <Link href="/signin" className="font-semibold text-[var(--ink)] underline underline-offset-4">Sign in</Link>
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AuthInput
        label="Full name"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Your full name"
        value={form.fullName}
        onChange={(event) => updateField("fullName", event.target.value)}
        minLength={2}
        maxLength={120}
        error={fieldErrors.fullName}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthInput
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          error={fieldErrors.email}
          required
        />
        <AuthInput
          label="Mobile number"
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={form.mobile}
          onChange={(event) => updateField("mobile", event.target.value)}
          maxLength={20}
          error={fieldErrors.mobile}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthInput
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
          suffix={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />}
          minLength={8}
          maxLength={72}
          error={fieldErrors.password}
          required
        />
        <AuthInput
          label="Confirm password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Enter it again"
          value={form.confirmPassword}
          onChange={(event) => updateField("confirmPassword", event.target.value)}
          suffix={<PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((visible) => !visible)} />}
          minLength={8}
          maxLength={72}
          error={fieldErrors.confirmPassword}
          required
        />
      </div>
      <p className="-mt-1 text-[11px] leading-5 text-[var(--muted)]">
        Use at least 8 characters with an uppercase letter, lowercase letter, number, and special character.
      </p>

      {error && (
        <p role="alert" className="rounded-[3px] border border-[#f0d2d0] bg-[#fff2f1] px-3 py-2.5 text-sm text-[#81362e]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] px-6 text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[var(--purple-dark)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "CREATING YOUR ACCOUNT..." : "CREATE ACCOUNT"}
      </button>
      <p className="text-center text-[10px] leading-5 text-[var(--muted)]">
        Your password is securely hashed before it is stored. Verify your email before signing in.
      </p>
    </form>
  );
}
