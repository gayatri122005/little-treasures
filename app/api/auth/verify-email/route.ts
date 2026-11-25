import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { createSessionToken, sanitizeUser, setSessionCookie } from "@/lib/auth";
import { consumeRateLimit, hashOpaqueToken, isSameOriginRequest, rateLimitResponse, requestClientAddress } from "@/lib/auth-security";
import pool from "@/lib/db";
import { z } from "zod";

const verifySchema = z.object({ token: z.string().min(32).max(128) });

type VerifiedUserRow = RowDataPacket & {
  id: number;
  full_name: string;
  email: string;
  mobile: string | null;
  profile_image: string | null;
  role: "customer" | "admin";
  email_verified: number;
  account_status: "active" | "suspended";
  session_version: number;
  created_at: Date | string;
  updated_at: Date | string;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Request origin is not allowed." }, { status: 403 });
  }

  try {
    const ipLimit = await consumeRateLimit("verify-ip", requestClientAddress(request), 20, 900);
    if (!ipLimit.allowed) {
      return rateLimitResponse(NextResponse.json({ success: false, message: "Too many requests. Try again later." }, { status: 429 }), ipLimit.retryAfterSeconds);
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "This verification link is invalid or expired." }, { status: 400 });
    }

    const connection = await pool.getConnection();
    let user: VerifiedUserRow | null = null;
    try {
      await connection.beginTransaction();
      const [tokens] = await connection.execute<(RowDataPacket & { id: number; user_id: number })[]>(
        `SELECT id, user_id FROM auth_email_verification_tokens
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3)
         LIMIT 1 FOR UPDATE`,
        [hashOpaqueToken(parsed.data.token)],
      );
      const token = tokens[0];
      if (!token) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: "This verification link is invalid, expired, or already used." }, { status: 400 });
      }

      await connection.execute(
        "UPDATE auth_email_verification_tokens SET used_at = UTC_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL",
        [token.id],
      );
      await connection.execute(
        "UPDATE auth_email_verification_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND used_at IS NULL",
        [token.user_id],
      );
      await connection.execute(
        "UPDATE users SET email_verified = 1, updated_at = NOW() WHERE id = ? AND account_status = 'active'",
        [token.user_id],
      );
      const [users] = await connection.execute<VerifiedUserRow[]>(
        `SELECT id, full_name, email, mobile, profile_image, role, email_verified,
                account_status, session_version, created_at, updated_at
         FROM users WHERE id = ? AND account_status = 'active' LIMIT 1`,
        [token.user_id],
      );
      user = users[0] ?? null;
      if (!user || Number(user.email_verified) !== 1) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: "This account cannot be verified." }, { status: 400 });
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const safeUser = sanitizeUser(user as unknown as Record<string, unknown>);
    const response = NextResponse.json({ success: true, message: "Your email has been verified.", user: safeUser });
    setSessionCookie(response, await createSessionToken(safeUser, Number(user?.session_version ?? 0)));
    return response;
  } catch (error) {
    console.error("Email verification failed:", (error as { code?: string })?.code ?? "unexpected error");
    return NextResponse.json({ success: false, message: "Unable to verify this email right now." }, { status: 500 });
  }
}
