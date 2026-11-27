import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { authEmailConfiguration, escapeEmailHtml, sendAuthEmail } from "@/lib/auth-email";
import { consumeRateLimit, issueEmailToken, isSameOriginRequest, rateLimitResponse, requestClientAddress } from "@/lib/auth-security";
import pool from "@/lib/db";
import { emailOnlySchema } from "@/lib/validation";

const genericMessage = "If this account needs verification, a new link will be sent when email delivery is configured.";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Request origin is not allowed." }, { status: 403 });
  }

  try {
    const ipLimit = await consumeRateLimit("resend-ip", requestClientAddress(request), 20, 3600);
    if (!ipLimit.allowed) {
      return rateLimitResponse(NextResponse.json({ success: false, message: "Too many requests. Try again later." }, { status: 429 }), ipLimit.retryAfterSeconds);
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }
    const parsed = emailOnlySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Enter a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email;
    const emailLimit = await consumeRateLimit("resend-email", email, 3, 3600);
    if (!emailLimit.allowed) {
      return rateLimitResponse(NextResponse.json({ success: false, message: "Too many requests. Try again later." }, { status: 429 }), emailLimit.retryAfterSeconds);
    }

    const connection = await pool.getConnection();
    let token = "";
    let userId = 0;
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<RowDataPacket[]>(
        "SELECT id, full_name, email_verified, account_status FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
        [email],
      );
      const user = users[0];
      if (user && Number(user.email_verified) !== 1 && user.account_status === "active") {
        userId = Number(user.id);
        token = await issueEmailToken(connection, "auth_email_verification_tokens", userId);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const config = authEmailConfiguration();
    if (userId && token && config) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT full_name FROM users WHERE id = ? LIMIT 1",
        [userId],
      );
      const name = String(rows[0]?.full_name ?? "there");
      const url = `${config.baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
      await sendAuthEmail({
        to: email,
        subject: "Your OMTreasure verification link",
        text: `Hello ${name}, verify your email using this link: ${url}. This link expires in 30 minutes.`,
        html: `<p>Hello ${escapeEmailHtml(name)},</p><p><a href="${escapeEmailHtml(url)}">Verify your email address</a></p><p>This link expires in 30 minutes.</p>`,
      });
    }

    return NextResponse.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error("Verification email request failed:", (error as { code?: string })?.code ?? "unexpected error");
    return NextResponse.json({ success: false, message: "Unable to process the request right now." }, { status: 500 });
  }
}
