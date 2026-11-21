import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Create an account | All the Good Things",
  description: "Create your All the Good Things customer account.",
};

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Make yourself at home"
      title="A little more lovely, just for you."
      description="Create an account to keep your favorite finds close and make checkout a little easier."
      alternatePrompt="Already have an account?"
      alternateLink="Sign in"
      alternateHref="/signin"
    >
      <SignUpForm />
    </AuthShell>
  );
}
