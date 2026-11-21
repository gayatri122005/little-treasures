import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import pool from "@/lib/db";
import { createSessionToken, sanitizeUser, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error.issues[0]?.message || "Validation failed.",
        },
        { status: 400 },
      );
    }

    const { fullName, email, mobile, password } = result.data;
    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail],
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [insertResult] = await pool.execute(
      "INSERT INTO users (full_name, email, mobile, password_hash, profile_image, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'customer', NOW(), NOW())",
      [fullName.trim(), normalizedEmail, mobile || null, passwordHash, null],
    );

    const userId = Number((insertResult as { insertId?: number })?.insertId ?? 0);
    const user = sanitizeUser({
      id: userId,
      full_name: fullName.trim(),
      email: normalizedEmail,
      mobile: mobile || null,
      profile_image: null,
      role: "customer",
    });

    const token = await createSessionToken(user);
    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful.",
        user,
      },
      { status: 201 },
    );

    setSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to create the account right now.",
      },
      { status: 500 },
    );
  }
}
