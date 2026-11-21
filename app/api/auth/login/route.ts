import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import pool from "@/lib/db";
import { createSessionToken, sanitizeUser, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error.issues[0]?.message || "Validation failed.",
        },
        { status: 400 },
      );
    }

    const { email, password } = result.data;
    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail],
    );

    const userRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!userRow) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    const isValidPassword = await bcrypt.compare(
      password,
      String((userRow as Record<string, unknown>).password_hash ?? ""),
    );

    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    const user = sanitizeUser(userRow as Record<string, unknown>);
    const token = await createSessionToken(user);
    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user,
    });

    setSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to sign in right now.",
      },
      { status: 500 },
    );
  }
}
