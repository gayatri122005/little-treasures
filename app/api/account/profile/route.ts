import { NextResponse } from "next/server";
import { authEmailConfiguration, escapeEmailHtml, sendAuthEmail } from "@/lib/auth-email";
import { clearSessionCookie } from "@/lib/auth";
import { consumeRateLimit, issueEmailToken, isSameOriginRequest, requestClientAddress } from "@/lib/auth-security";
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
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Request origin is not allowed." }, { status: 403 });
  }

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
    const emailChanged = normalizedEmail !== user.email;

    if (emailChanged) {
      const ipLimit = await consumeRateLimit("email-change-ip", requestClientAddress(request), 5, 3600);
      const userLimit = await consumeRateLimit("email-change-user", String(user.id), 3, 86400);
      if (!ipLimit.allowed || !userLimit.allowed) {
        return NextResponse.json({ success: false, message: "Too many email change attempts. Try again later." }, { status: 429 });
      }
    }

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

    let verificationToken = "";
    if (emailChanged) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          `UPDATE users SET full_name = ?, email = ?, mobile = ?, email_verified = 0,
             session_version = session_version + 1, updated_at = NOW() WHERE id = ?`,
          [fullName.trim(), normalizedEmail, mobile || null, user.id],
        );
        verificationToken = await issueEmailToken(connection, "auth_email_verification_tokens", user.id);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      await pool.execute(
        "UPDATE users SET full_name = ?, email = ?, mobile = ?, updated_at = NOW() WHERE id = ?",
        [fullName.trim(), normalizedEmail, mobile || null, user.id],
      );
    }

    const [updatedRows] = await pool.query(
      "SELECT id, full_name, email, mobile, role, profile_image, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
      [user.id],
    );

    const updatedUser = sanitizeUser(
      (updatedRows as Array<Record<string, unknown>>)[0] ?? {},
    );
    if (emailChanged) {
      const config = authEmailConfiguration();
      const url = config ? `${config.baseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}` : "";
      const safeName = escapeEmailHtml(fullName.trim());
      const safeUrl = escapeEmailHtml(url);
      const emailResult = url
        ? await sendAuthEmail({
            to: normalizedEmail,
            subject: "Verify your updated Little Treasures email",
            text: `Hello ${fullName.trim()}, verify your updated email address using this link: ${url}. This link expires in 30 minutes.`,
            html: `<p>Hello ${safeName},</p><p><a href="${safeUrl}">Verify your updated email address</a></p><p>This link expires in 30 minutes.</p>`,
          })
        : { sent: false };
      const response = NextResponse.json({
        success: true,
        emailVerificationRequired: true,
        emailSent: emailResult.sent,
        message: emailResult.sent
          ? "Profile updated. Verify the new email address before signing in again."
          : "Profile updated, but the verification email could not be sent. You are signed out until this address is verified.",
        user: updatedUser,
      });
      clearSessionCookie(response);
      return response;
    }

    const response = NextResponse.json({ success: true, message: "Profile updated successfully.", user: updatedUser });
    setSessionCookie(response, await createSessionToken(updatedUser, user.sessionVersion));
    return response;
  } catch (error) {
    if ((error as { code?: string })?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ success: false, message: "A different account already uses this email." }, { status: 409 });
    }
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
