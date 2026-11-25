import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";

import { createSessionToken, sanitizeUser, setSessionCookie } from "@/lib/auth";
import { clearRateLimit, consumeRateLimit, isSameOriginRequest, rateLimitResponse, requestClientAddress } from "@/lib/auth-security";
import pool from "@/lib/db";
import { loginSchema, validationErrors } from "@/lib/validation";

type LoginUserRow = RowDataPacket & {
  id: number;
  full_name: string;
  email: string;
  mobile: string | null;
  profile_image: string | null;
  role: "customer" | "admin";
  password_hash: string;
  email_verified: number;
  account_status: "active" | "suspended";
  session_version: number;
  created_at: Date | string;
  updated_at: Date | string;
};

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-account-password", 12);

function rateLimited(retryAfterSeconds: number) {
  return rateLimitResponse(
    NextResponse.json({ success: false, message: "Too many sign-in attempts. Try again later." }, { status: 429 }),
    retryAfterSeconds,
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Request origin is not allowed." }, { status: 403 });
  }

  try {
    const ipLimit = await consumeRateLimit("login-ip", requestClientAddress(request), 30, 900);
    if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.issues[0]?.message ?? "Check your sign-in details.", errors: validationErrors(result.error) },
        { status: 400 },
      );
    }

    const { email, password } = result.data;
    const emailLimit = await consumeRateLimit("login-email", email, 10, 900);
    if (!emailLimit.allowed) return rateLimited(emailLimit.retryAfterSeconds);

    const [rows] = await pool.execute<LoginUserRow[]>(
      `SELECT id, full_name, email, mobile, profile_image, role, password_hash,
              email_verified, account_status, session_version, created_at, updated_at
       FROM users WHERE email = ? LIMIT 1`,
      [email],
    );
    const row = rows[0];
    const passwordMatches = await bcrypt.compare(password, row?.password_hash ?? DUMMY_PASSWORD_HASH);

    if (!row || !passwordMatches || row.account_status !== "active") {
      return NextResponse.json({ success: false, message: "Invalid email or password." }, { status: 401 });
    }

    if (Number(row.email_verified) !== 1) {
      return NextResponse.json(
        { success: false, code: "EMAIL_NOT_VERIFIED", message: "Verify your email address before signing in." },
        { status: 403 },
      );
    }

    const user = sanitizeUser(row);
    const token = await createSessionToken(user, Number(row.session_version));
    const response = NextResponse.json({ success: true, message: "Login successful.", user });
    setSessionCookie(response, token);
    try {
      await clearRateLimit("login-email", email);
    } catch {
      console.error("Login attempt counter could not be cleared.");
    }
    return response;
  } catch (error) {
    console.error("Login failed:", (error as { code?: string })?.code ?? "unexpected error");
    return NextResponse.json({ success: false, message: "Unable to sign in right now." }, { status: 500 });
  }
}
