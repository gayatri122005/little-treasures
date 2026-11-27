import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import VerifyEmailAction from "@/components/auth/VerifyEmailAction";

export const metadata: Metadata = {
  title: "Verify email | OMTreasure",
  description: "Verify your OMTreasure account email address.",
  referrer: "no-referrer",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="One quick step"
      title="Confirm it’s you."
      description="Verify your email address to finish creating your OMTreasure account."
      alternatePrompt="Already verified?"
      alternateLink="Sign in"
      alternateHref="/signin"
    >
      <Suspense fallback={<div className="min-h-36 animate-pulse rounded bg-[#F1EBE1]" aria-label="Loading verification" />}>
        <VerifyEmailAction />
      </Suspense>
    </AuthShell>
  );
}
