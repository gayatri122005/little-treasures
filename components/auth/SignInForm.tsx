"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthInput from "@/components/auth/AuthInput";
import PasswordToggle from "@/components/auth/PasswordToggle";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";
import { loginSchema, validationErrors } from "@/lib/validation";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [needsVerification, setNeedsVerification] = useState(false);
  const [form, setForm] = useState({ identifier: "", password: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setNeedsVerification(false);
    const parsedInput = loginSchema.safeParse(form);
    if (!parsedInput.success) {
      setFieldErrors(validationErrors(parsedInput.error));
      return;
    }
    setLoading(true);
    setError("");

    try {
      let response: Response;
      try {
        response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsedInput.data),
        });
      } catch {
        throw new Error("Unable to connect. Please try again.");
      }
      let result: { code?: string; message?: string; user?: { role?: string } };
      try {
        result = await response.json();
      } catch {
        throw new Error("Something went wrong. Please try again later.");
      }

      if (!response.ok) {
        if (result.code === "EMAIL_NOT_VERIFIED") setNeedsVerification(true);
        throw new Error(result.message || "Unable to sign in.");
      }

      const requestedRedirect = searchParams.get("redirect");
      const defaultRedirect =
        result.user?.role === "admin" ? "/admin" : "/customer-dashboard";
      let redirect = defaultRedirect;
      if (requestedRedirect && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//") && !requestedRedirect.includes("\\")) {
        try {
          const target = new URL(requestedRedirect, window.location.origin);
          if (target.origin === window.location.origin) redirect = `${target.pathname}${target.search}${target.hash}`;
        } catch {
          redirect = defaultRedirect;
        }
      }

      window.dispatchEvent(new Event("omtreasure:auth-changed"));
      router.push(redirect);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
      {searchParams.get("passwordChanged") === "1" && (
        <p
          role="status"
          className="rounded-[3px] border border-[var(--purple)] bg-[var(--purple)] px-3 py-2.5 text-sm text-white"
        >
          Your password has been updated. Sign in with your new password.
        </p>
      )}

      <AuthInput
        label="Email address or mobile number"
        name="identifier"
        type="text"
        inputMode="email"
        autoComplete="username"
        placeholder="you@example.com or +91 98765 43210"
        value={form.identifier}
        onChange={(event) =>
          setForm((current) => ({ ...current, identifier: event.target.value }))
        }
        error={fieldErrors.identifier}
        required
      />

      <AuthInput
        label="Password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="Enter your password"
        value={form.password}
        onChange={(event) =>
          setForm((current) => ({ ...current, password: event.target.value }))
        }
        error={fieldErrors.password}
        suffix={
          <PasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
        }
        required
      />

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs font-medium text-[var(--ink)] underline decoration-[var(--purple)] underline-offset-4 hover:text-[var(--purple-dark)]">
          Forgot password?
        </Link>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[3px] border border-[#f0d2d0] bg-[#fff2f1] px-3 py-2.5 text-sm text-[#81362e]"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] px-6 text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[var(--purple-dark)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "SIGNING YOU IN..." : "SIGN IN"}
      </button>

      <p className="text-center text-[10px] leading-5 text-[var(--muted)]">
        Your account details are protected by a secure, HTTP-only session.
      </p>
      </form>
      {needsVerification && (
        <ResendVerificationForm initialEmail={form.identifier.includes("@") ? form.identifier : ""} />
      )}
    </>
  );
}
