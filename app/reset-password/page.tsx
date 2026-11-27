import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password | OMTreasure",
  description: "Choose a new password for your OMTreasure account.",
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="A fresh start."
      description="Choose a new, secure password for your account."
      alternatePrompt="Remembered your password?"
      alternateLink="Sign in"
      alternateHref="/signin"
    >
      <Suspense fallback={<div className="min-h-48 animate-pulse rounded bg-[#F1EBE1]" aria-label="Loading password reset form" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
