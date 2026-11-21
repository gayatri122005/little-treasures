import { NextResponse } from "next/server";

import pool from "@/lib/db";
import {
  createSessionToken,
  getCurrentUser,
  sanitizeUser,
  setSessionCookie,
} from "@/lib/auth";
import { profileSchema } from "@/lib/validation";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication required.",
      },
      { status: 401 },
    );
  }

  const [rows] = await pool.query(
    "SELECT id, full_name, email, mobile, role, profile_image, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [user.id],
  );

  const userRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

  if (!userRow) {
    return NextResponse.json(
      {
        success: false,
        message: "User not found.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    user: sanitizeUser(userRow as Record<string, unknown>),
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication required.",
      },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || "Validation failed.",
        },
        { status: 400 },
      );
    }

    const { fullName, email, mobile } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1",
      [normalizedEmail, user.id],
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "A different account already uses this email.",
        },
        { status: 409 },
      );
    }

    await pool.execute(
      "UPDATE users SET full_name = ?, email = ?, mobile = ?, updated_at = NOW() WHERE id = ?",
      [fullName.trim(), normalizedEmail, mobile || null, user.id],
    );

    const [updatedRows] = await pool.query(
      "SELECT id, full_name, email, mobile, role, profile_image, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
      [user.id],
    );

    const updatedUser = sanitizeUser(
      (updatedRows as Array<Record<string, unknown>>)[0] ?? {},
    );
    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
    });
    setSessionCookie(response, await createSessionToken(updatedUser));
    return response;
  } catch (error) {
    console.error("Profile update failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to update the profile right now.",
      },
      { status: 500 },
    );
  }
}
