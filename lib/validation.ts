import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .max(255, "Email address must be 255 characters or fewer.")
  .toLowerCase()
  .pipe(z.email("Please enter a valid email address."));

const nameSchema = z
  .string()
  .trim()
  .min(2, "Full name must be at least 2 characters.")
  .max(120, "Full name must be 120 characters or fewer.")
  .regex(
    /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u,
    "Use letters, spaces, apostrophes, periods, or hyphens in your name.",
  );

const indianMobileSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^(?:\+91)?[6-9]\d{9}$/,
        "Enter a valid 10-digit Indian mobile number, optionally prefixed with +91.",
      )
      .transform((value) => `+91${value.replace(/^\+91/, "")}`),
  );

const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.")
  .refine((value) => /[a-z]/.test(value), "Add a lowercase letter.")
  .refine((value) => /[A-Z]/.test(value), "Add an uppercase letter.")
  .refine((value) => /\d/.test(value), "Add a number.")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Add a special character.")
  .refine(
    (value) => new TextEncoder().encode(value).byteLength <= 72,
    "Password must be 72 bytes or fewer.",
  );

export const registerSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  mobile: indianMobileSchema,
  password: strongPasswordSchema,
  confirmPassword: z.string().min(8, "Please confirm your password."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email address or mobile number.").max(255, "Email address or mobile number is too long."),
  password: z
    .string()
    .min(1, "Enter your password.")
    .refine(
      (value) => new TextEncoder().encode(value).byteLength <= 72,
      "Invalid email or password.",
    ),
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, "This password reset link is invalid or expired."),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  mobile: z.string().trim().max(20, "Mobile number is too long.").optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your current password.")
      .refine((value) => new TextEncoder().encode(value).byteLength <= 72, "Current password is invalid."),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Choose a new password that differs from your current one.",
    path: ["newPassword"],
  });

export const addressSchema = z.object({
  label: z.string().trim().max(80, "Address label must be 80 characters or fewer.").optional().or(z.literal("")),
  fullName: z.string().trim().min(2, "Recipient name must be at least 2 characters.").max(120),
  phone: z.string().trim().max(32, "Phone number must be 32 characters or fewer.").optional().or(z.literal("")),
  addressLine1: z.string().trim().min(3, "Enter a valid street address.").max(255),
  addressLine2: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required.").max(100),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(25).optional().or(z.literal("")),
  country: z.string().trim().min(2, "Country is required.").max(100),
  isDefault: z.boolean().default(false),
});

export function validationErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}
