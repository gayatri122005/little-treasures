import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import { isSameOriginRequest } from "@/lib/auth-security";
import { changePasswordSchema } from "@/lib/validation";

type PasswordRow = RowDataPacket & { password_hash: string };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Request origin is not allowed." },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Check your password details.",
      },
      { status: 400 },
    );
  }

  try {
    const [rows] = await pool.execute<PasswordRow[]>(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      [user.id],
    );
    const passwordHash = rows[0]?.password_hash;
    if (!passwordHash) {
      return NextResponse.json(
        { success: false, message: "Account not found." },
        { status: 404 },
      );
    }

    const currentPasswordMatches = await bcrypt.compare(
      parsed.data.currentPassword,
      passwordHash,
    );
    if (!currentPasswordMatches) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect." },
        { status: 400 },
      );
    }

    const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = NOW() WHERE id = ? AND password_hash = ?",
      [newPasswordHash, user.id, passwordHash],
    );
    if (result.affectedRows !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Your password changed before this update could finish. Please try again.",
        },
        { status: 409 },
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Password updated. Sign in again with your new password.",
    });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("Password update failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update your password right now." },
      { status: 500 },
    );
  }
}
