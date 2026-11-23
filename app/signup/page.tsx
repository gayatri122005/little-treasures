import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Create an account | Little Treasures",
  description: "Create your Little Treasures customer account.",
};

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Make yourself at home"
      title="A little more lovely, just for you."
      description="Create an account to manage your profile, saved addresses, and order history."
      alternatePrompt="Already have an account?"
      alternateLink="Sign in"
      alternateHref="/signin"
    >
      <SignUpForm />
    </AuthShell>
  );
}
