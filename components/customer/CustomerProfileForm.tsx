"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { profileSchema } from "@/lib/validation";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";

const profileResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  emailVerificationRequired: z.boolean().optional(),
  user: z
    .object({
      full_name: z.string(),
      email: z.string(),
      mobile: z.string().nullable(),
      profile_image: z.string().nullable(),
    })
    .optional(),
});

const profileImageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  profileImage: z.string().optional(),
  cleanupWarning: z.boolean().optional(),
});

const maxProfileImageBytes = 5 * 1024 * 1024;
const allowedProfileImageTypes = ["image/jpeg", "image/png", "image/webp"];

export default function CustomerProfileForm({
  initialProfile,
}: {
  initialProfile: {
    full_name: string;
    email: string;
    mobile: string | null;
    profile_image: string | null;
  };
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialProfile.full_name);
  const [email, setEmail] = useState(initialProfile.email);
  const [mobile, setMobile] = useState(initialProfile.mobile ?? "");
  const [profileImage, setProfileImage] = useState(
    initialProfile.profile_image,
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const currentImage =
    previewUrl ??
    (profileImage?.startsWith("/api/upload/profile/") ? profileImage : null);

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setImageMessage("");
    setImageError("");
    setSelectedImage(null);
    setPreviewUrl(null);

    if (!file) return;
    if (!allowedProfileImageTypes.includes(file.type)) {
      setImageError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size === 0 || file.size > maxProfileImageBytes) {
      setImageError("Choose a non-empty image no larger than 5 MB.");
      return;
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleImageUpload() {
    if (!selectedImage) {
      setImageError("Choose an image before uploading.");
      return;
    }

    setUploadingImage(true);
    setImageError("");
    setImageMessage("");
    try {
      const body = new FormData();
      body.append("image", selectedImage);
      const response = await fetch("/api/upload/profile", {
        method: "POST",
        credentials: "same-origin",
        body,
      });
      const payload: unknown = await response.json();
      const result = profileImageResponseSchema.safeParse(payload);
      if (!response.ok || !result.success || !result.data.success) {
        setImageError(
          result.success
            ? result.data.message
            : "The server returned an unexpected response.",
        );
        return;
      }

      setProfileImage(result.data.profileImage ?? null);
      setSelectedImage(null);
      setPreviewUrl(null);
      setImageMessage(result.data.message);
      router.refresh();
    } catch {
      setImageError("Unable to reach the server. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const parsedInput = profileSchema.safeParse({ fullName, email, mobile });
    if (!parsedInput.success) {
      setError(parsedInput.error.issues[0]?.message ?? "Check your profile details.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsedInput.data),
      });
      const payload: unknown = await response.json();
      const result = profileResponseSchema.safeParse(payload);

      if (!response.ok || !result.success || !result.data.success) {
        setError(
          result.success
            ? result.data.message ?? "Unable to update your profile."
            : "The server returned an unexpected response.",
        );
        return;
      }

      if (result.data.user) {
        setFullName(result.data.user.full_name);
        setEmail(result.data.user.email);
        setMobile(result.data.user.mobile ?? "");
        setProfileImage(result.data.user.profile_image);
      }
      setMessage(result.data.message ?? "Your profile has been updated.");
      if (result.data.emailVerificationRequired) {
        setVerificationPending(true);
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="profile-edit-heading"
      className="rounded-3xl border border-[var(--line)] bg-[var(--page)] p-6 shadow-sm"
    >
      <p className="eyebrow">Your details</p>
      <h2
        id="profile-edit-heading"
        className="serif-display mt-2 text-3xl text-[var(--ink)]"
      >
        Edit profile
      </h2>
      {verificationPending && (
        <div className="mt-4 rounded border border-[var(--line)] bg-white p-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--ink)]">Verify your updated email to sign in again.</p>
          <p className="mt-1">Your current session has been signed out for security.</p>
          <ResendVerificationForm initialEmail={email} />
        </div>
      )}
      <div className="mt-5 flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-center">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-soft)] text-lg font-medium text-[var(--ink)]">
          {currentImage ? (
            <Image
              src={currentImage}
              alt={`${fullName || "Your"} profile`}
              width={80}
              height={80}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            fullName
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0] ?? "")
              .join("")
              .toUpperCase() || "LT"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="profile-image"
            className="mb-1.5 block text-xs font-medium text-[var(--muted)]"
          >
            Profile picture
          </label>
          <input
            id="profile-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelection}
            disabled={verificationPending}
            className="block min-h-11 w-full text-sm file:mr-3 file:min-h-10 file:border-0 file:bg-[var(--surface-soft)] file:px-3 file:text-xs file:font-medium file:text-[var(--ink)]"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            JPG, PNG, or WebP; up to 5 MB.
          </p>
        </div>
        <button
          type="button"
          onClick={handleImageUpload}
          disabled={!selectedImage || uploadingImage || verificationPending}
          className="min-h-11 shrink-0 bg-[var(--ink)] px-5 text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[var(--purple-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploadingImage ? "UPLOADING…" : "UPLOAD PHOTO"}
        </button>
      </div>
      {imageMessage && (
        <p className="mt-3 text-xs text-[var(--ink)]" aria-live="polite">
          {imageMessage}
        </p>
      )}
      {imageError && (
        <p className="mt-3 text-xs text-[#9b5545]" role="alert">
          {imageError}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="profile-full-name"
            className="mb-1.5 block text-xs font-medium text-[var(--muted)]"
          >
            Full name
          </label>
          <input
            id="profile-full-name"
            name="fullName"
            autoComplete="name"
            required
            maxLength={120}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={verificationPending}
            className="min-h-11 w-full border border-[var(--line)] bg-white px-3 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="profile-email"
            className="mb-1.5 block text-xs font-medium text-[var(--muted)]"
          >
            Email address
          </label>
          <input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={verificationPending}
            className="min-h-11 w-full border border-[var(--line)] bg-white px-3 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="profile-mobile"
            className="mb-1.5 block text-xs font-medium text-[var(--muted)]"
          >
            Mobile number <span className="font-normal text-[var(--muted)]">(optional)</span>
          </label>
          <input
            id="profile-mobile"
            name="mobile"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            disabled={verificationPending}
            className="min-h-11 w-full border border-[var(--line)] bg-white px-3 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving || verificationPending}
            className="min-h-11 w-full bg-[var(--ink)] px-5 text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[var(--purple-dark)] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {saving ? "SAVING…" : "SAVE CHANGES"}
          </button>
        </div>
        <p
          className="min-h-5 text-xs text-[var(--ink)] sm:col-span-2"
          aria-live="polite"
        >
          {message}
        </p>
        {error && (
          <p
            className="text-xs text-[#9b5545] sm:col-span-2"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
