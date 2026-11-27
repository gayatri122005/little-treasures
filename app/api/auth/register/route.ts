import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { escapeEmailHtml, sendAuthEmail, authEmailConfiguration } from "@/lib/auth-email";
import { isSameOriginRequest, issueEmailToken, consumeRateLimit, rateLimitResponse, requestClientAddress } from "@/lib/auth-security";
import pool from "@/lib/db";
import { registerSchema, validationErrors } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Request origin is not allowed." }, { status: 403 });
  }

  try {
    const ipLimit = await consumeRateLimit("register-ip", requestClientAddress(request), 10, 3600);
    if (!ipLimit.allowed) {
      return rateLimitResponse(
        NextResponse.json({ success: false, message: "Too many registration attempts. Try again later." }, { status: 429 }),
        ipLimit.retryAfterSeconds,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.issues[0]?.message ?? "Check the registration details.", errors: validationErrors(result.error) },
        { status: 400 },
      );
    }

    const { fullName, email, mobile, password } = result.data;
    const emailLimit = await consumeRateLimit("register-email", email, 3, 3600);
    if (!emailLimit.allowed) {
      return rateLimitResponse(
        NextResponse.json({ success: false, message: "Too many registration attempts. Try again later." }, { status: 429 }),
        emailLimit.retryAfterSeconds,
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const connection = await pool.getConnection();
    let userId = 0;
    let verificationToken = "";

    try {
      await connection.beginTransaction();
      const [existing] = await connection.execute<RowDataPacket[]>(
        "SELECT id, email, mobile FROM users WHERE email = ? OR mobile = ? LIMIT 1",
        [email, mobile],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        await connection.rollback();
        const match = existing[0] as { email?: string; mobile?: string };
        const field = match.email === email ? "email address" : "mobile number";
        return NextResponse.json({ success: false, message: `An account with this ${field} already exists. Sign in instead.` }, { status: 409 });
      }

      const [insertResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO users
          (full_name, email, mobile, email_verified, account_status, session_version,
           password_hash, profile_image, role, created_at, updated_at)
         VALUES (?, ?, ?, 0, 'active', 0, ?, NULL, 'customer', NOW(), NOW())`,
        [fullName, email, mobile, passwordHash],
      );
      userId = Number(insertResult.insertId);
      verificationToken = await issueEmailToken(connection, "auth_email_verification_tokens", userId);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if ((error as { code?: string })?.code === "ER_DUP_ENTRY") {
        return NextResponse.json({ success: false, message: "An account with this email address or mobile number already exists. Sign in instead." }, { status: 409 });
      }
      throw error;
    } finally {
      connection.release();
    }

    const emailConfig = authEmailConfiguration();
    const verificationUrl = emailConfig
      ? `${emailConfig.baseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`
      : "";
    const safeName = escapeEmailHtml(fullName);
    const safeUrl = escapeEmailHtml(verificationUrl);
    const emailResult = verificationUrl
      ? await sendAuthEmail({
          to: email,
          subject: "Verify your OMTreasure account",
          text: `Hello ${fullName}, verify your email address using this link: ${verificationUrl}. This link expires in 30 minutes.`,
          html: `<p>Hello ${safeName},</p><p>Please verify your email address to finish creating your OMTreasure account.</p><p><a href="${safeUrl}">Verify email address</a></p><p>This link expires in 30 minutes. If you did not create this account, you can ignore this email.</p>`,
        })
      : { sent: false as const, reason: "not_configured" as const };

    return NextResponse.json(
      {
        success: true,
        verificationRequired: true,
        emailSent: emailResult.sent,
        message: emailResult.sent
          ? "Your account was created. Check your email for a verification link."
          : "Your account was created, but the verification email could not be sent. Email delivery needs configuration; you can request a new link later.",
        user: { id: userId, full_name: fullName, email, mobile, role: "customer" },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration failed:", (error as { code?: string })?.code ?? "unexpected error");
    return NextResponse.json(
      { success: false, message: "Unable to create the account right now." },
      { status: 500 },
    );
  }
}
