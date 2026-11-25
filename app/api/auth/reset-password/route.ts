import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";

import { clearSessionCookie } from "@/lib/auth";
import { hashOpaqueToken, consumeRateLimit, isSameOriginRequest, rateLimitResponse, requestClientAddress } from "@/lib/auth-security";
import pool from "@/lib/db";
import { resetPasswordSchema, validationErrors } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Request origin is not allowed." }, { status: 403 });
  }

  try {
    const ipLimit = await consumeRateLimit("reset-ip", requestClientAddress(request), 10, 900);
    if (!ipLimit.allowed) {
      return rateLimitResponse(NextResponse.json({ success: false, message: "Too many requests. Try again later." }, { status: 429 }), ipLimit.retryAfterSeconds);
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Check your new password.", errors: validationErrors(parsed.error) },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [tokens] = await connection.execute<(RowDataPacket & { id: number; user_id: number })[]>(
        `SELECT t.id, t.user_id
         FROM auth_password_reset_tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = ? AND t.used_at IS NULL
           AND t.expires_at > UTC_TIMESTAMP(3) AND u.account_status = 'active'
         LIMIT 1 FOR UPDATE`,
        [hashOpaqueToken(parsed.data.token)],
      );
      const token = tokens[0];
      if (!token) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: "This password reset link is invalid, expired, or already used." }, { status: 400 });
      }

      await connection.execute(
        "UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = NOW() WHERE id = ? AND account_status = 'active'",
        [passwordHash, token.user_id],
      );
      await connection.execute(
        "UPDATE auth_password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND used_at IS NULL",
        [token.user_id],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const response = NextResponse.json({ success: true, message: "Password updated. Sign in with your new password." });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("Password reset failed:", (error as { code?: string })?.code ?? "unexpected error");
    return NextResponse.json({ success: false, message: "Unable to reset the password right now." }, { status: 500 });
  }
}
