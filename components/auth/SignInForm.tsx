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
  const [form, setForm] = useState({ email: "", password: "" });

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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsedInput.data),
      });
      const result = await response.json();

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

      router.push(redirect);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {searchParams.get("passwordChanged") === "1" && (
        <p
          role="status"
          className="rounded-[3px] border border-[#B85042] bg-[#B85042] px-3 py-2.5 text-sm text-white"
        >
          Your password has been updated. Sign in with your new password.
        </p>
      )}

      <AuthInput
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={(event) =>
          setForm((current) => ({ ...current, email: event.target.value }))
        }
        error={fieldErrors.email}
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
        <Link href="/forgot-password" className="text-xs font-medium text-[#1E1B18] underline decoration-[#B85042] underline-offset-4 hover:text-[#9A3F33]">
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
      {needsVerification && <ResendVerificationForm initialEmail={form.email} />}

      <button
        type="submit"
        disabled={loading}
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#1E1B18] px-6 text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#9A3F33] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "SIGNING YOU IN..." : "SIGN IN"}
      </button>

      <p className="text-center text-[10px] leading-5 text-[#6E655F]">
        Your account details are protected by a secure, HTTP-only session.
      </p>
    </form>
  );
}
