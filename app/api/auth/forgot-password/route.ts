import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { authEmailConfiguration, escapeEmailHtml, sendAuthEmail } from "@/lib/auth-email";
import { consumeRateLimit, issueEmailToken, isSameOriginRequest, rateLimitResponse, requestClientAddress } from "@/lib/auth-security";
import pool from "@/lib/db";
import { emailOnlySchema } from "@/lib/validation";

const genericMessage = "If an active account uses that email, reset instructions will be sent when email delivery is configured.";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Request origin is not allowed." }, { status: 403 });
  }

  try {
    const ipLimit = await consumeRateLimit("forgot-ip", requestClientAddress(request), 20, 3600);
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
    const emailLimit = await consumeRateLimit("forgot-email", email, 3, 3600);
    if (!emailLimit.allowed) {
      return rateLimitResponse(NextResponse.json({ success: false, message: genericMessage }, { status: 200 }), emailLimit.retryAfterSeconds);
    }

    const connection = await pool.getConnection();
    let token = "";
    let userId = 0;
    let fullName = "";
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<RowDataPacket[]>(
        "SELECT id, full_name, account_status FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
        [email],
      );
      const user = users[0];
      if (user && user.account_status === "active") {
        userId = Number(user.id);
        fullName = String(user.full_name ?? "there");
        token = await issueEmailToken(connection, "auth_password_reset_tokens", userId);
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
      const url = `${config.baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      await sendAuthEmail({
        to: email,
        subject: "Reset your OMTreasure password",
        text: `Hello ${fullName}, reset your password using this link: ${url}. This link expires in 30 minutes. If you did not request this, you can ignore this email.`,
        html: `<p>Hello ${escapeEmailHtml(fullName)},</p><p><a href="${escapeEmailHtml(url)}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
      });
    }

    return NextResponse.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error("Password reset request failed:", (error as { code?: string })?.code ?? "unexpected error");
    return NextResponse.json({ success: false, message: "Unable to process the request right now." }, { status: 500 });
  }
}
