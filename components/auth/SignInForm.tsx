"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthInput from "@/components/auth/AuthInput";
import PasswordToggle from "@/components/auth/PasswordToggle";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showResetNotice, setShowResetNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to sign in.");
      }

      const requestedRedirect = searchParams.get("redirect");
      const defaultRedirect =
        result.user?.role === "admin" ? "/admin" : "/customer-dashboard";
      const redirect =
        requestedRedirect?.startsWith("/") &&
        !requestedRedirect.startsWith("//")
          ? requestedRedirect
          : defaultRedirect;

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
        suffix={
          <PasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
        }
        required
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowResetNotice((visible) => !visible)}
          className="text-xs font-medium text-[#1E1B18] underline decoration-[#B85042] underline-offset-4 hover:text-[#9A3F33]"
          aria-expanded={showResetNotice}
        >
          Forgot password?
        </button>
      </div>

      {showResetNotice && (
        <p
          role="status"
          className="rounded-[3px] border border-[#E3D8C9] bg-[#FAF7F2] px-3 py-2.5 text-xs leading-5 text-[#6E655F]"
        >
          Password reset is not available yet. Please check back soon for
          account recovery options.
        </p>
      )}

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
