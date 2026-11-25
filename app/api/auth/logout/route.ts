import { NextResponse } from "next/server";

import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/auth-security";
import pool from "@/lib/db";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Request origin is not allowed." }, { status: 403 });
  }

  const response = NextResponse.json({
    success: true,
    message: "Logout successful.",
  });

  clearSessionCookie(response);

  try {
    const user = await getCurrentUser();
    if (user) {
      await pool.execute(
        "UPDATE users SET session_version = session_version + 1, updated_at = NOW() WHERE id = ?",
        [user.id],
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to invalidate the session right now." },
      { status: 503, headers: response.headers },
    );
  }

  return response;
}
