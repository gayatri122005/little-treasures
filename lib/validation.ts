import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
  email: z.email("Please enter a valid email address."),
  mobile: z.string().trim().max(20, "Mobile number is too long.").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(8, "Please confirm your password."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
  email: z.email("Please enter a valid email address."),
  mobile: z.string().trim().max(20, "Mobile number is too long.").optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Your new password must be at least 8 characters."),
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
