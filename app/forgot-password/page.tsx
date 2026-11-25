import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password | Little Treasures",
  description: "Request a secure password reset link for your Little Treasures account.",
  referrer: "no-referrer",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Let’s get you back in."
      description="Enter your account email. Reset instructions are sent when the address matches an active account and email delivery is configured."
      alternatePrompt="Need an account?"
      alternateLink="Create an account"
      alternateHref="/signup"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
