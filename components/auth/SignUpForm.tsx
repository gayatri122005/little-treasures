"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthInput from "@/components/auth/AuthInput";
import PasswordToggle from "@/components/auth/PasswordToggle";

export default function SignUpForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match. Please check and try again.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to complete registration.");
      }

      router.push("/customer-dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to complete registration.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        label="Full name"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Your full name"
        value={form.fullName}
        onChange={(event) =>
          setForm((current) => ({ ...current, fullName: event.target.value }))
        }
        minLength={2}
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
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          required
        />
        <AuthInput
          label="Mobile number"
          name="mobile"
          type="tel"
          autoComplete="tel"
          placeholder="Optional"
          value={form.mobile}
          onChange={(event) =>
            setForm((current) => ({ ...current, mobile: event.target.value }))
          }
          maxLength={20}
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
          onChange={(event) =>
            setForm((current) => ({ ...current, password: event.target.value }))
          }
          suffix={
            <PasswordToggle
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
            />
          }
          minLength={8}
          required
        />
        <AuthInput
          label="Confirm password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Enter it again"
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }))
          }
          suffix={
            <PasswordToggle
              visible={showConfirmPassword}
              onToggle={() =>
                setShowConfirmPassword((visible) => !visible)
              }
            />
          }
          minLength={8}
          required
        />
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
        className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#1E1B18] px-6 text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#9A3F33] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "CREATING YOUR ACCOUNT..." : "CREATE ACCOUNT"}
      </button>
      <p className="text-center text-[10px] leading-5 text-[#6E655F]">
        Your password is securely hashed before it is stored.
      </p>
    </form>
  );
}
