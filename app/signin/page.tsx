import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in | All the Good Things",
  description: "Sign in to your All the Good Things account.",
};

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="A little lovely to see you."
      description="Sign in to pick up right where you left off and find something lovely."
      alternatePrompt="New around here?"
      alternateLink="Create an account"
      alternateHref="/signup"
    >
      <Suspense
        fallback={
          <div
            className="min-h-12 animate-pulse rounded-full bg-[#F1EBE1]"
            aria-label="Loading sign-in form"
          />
        }
      >
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
