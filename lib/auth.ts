import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { createOpaqueToken, hashOpaqueToken } from "@/lib/auth-security";
import pool from "@/lib/db";

export const SESSION_COOKIE_NAME = "little_treasures_session";

export type AppUser = {
  id: number;
  full_name: string;
  email: string;
  mobile?: string | null;
  profile_image?: string | null;
  role: "customer" | "admin";
  created_at?: string | null;
  updated_at?: string | null;
};

export type CurrentUser = AppUser & { sessionVersion: number };

type AuthUserRow = RowDataPacket & {
  id: number;
  full_name: string;
  email: string;
  mobile: string | null;
  profile_image: string | null;
  role: "customer" | "admin";
  email_verified: number;
  account_status: "active" | "suspended";
  session_version: number;
};

export function sanitizeUser(user: Record<string, unknown>): AppUser {
  return {
    id: Number(user.id ?? 0),
    full_name: String(user.full_name ?? ""),
    email: String(user.email ?? ""),
    mobile: typeof user.mobile === "string" ? user.mobile : null,
    profile_image:
      typeof user.profile_image === "string" ? user.profile_image : null,
    role: user.role === "admin" ? "admin" : "customer",
    created_at: typeof user.created_at === "string" ? user.created_at : null,
    updated_at: typeof user.updated_at === "string" ? user.updated_at : null,
  };
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    ...getCookieOptions(),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    ...getCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}

export async function createSessionToken(user: AppUser, sessionVersion = 0) {
  const token = createOpaqueToken();
  await pool.execute(
    `INSERT INTO auth_sessions (user_id, token_hash, session_version, expires_at)
     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY))`,
    [user.id, hashOpaqueToken(token), sessionVersion],
  );
  return token;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const [rows] = await pool.execute<AuthUserRow[]>(
    `SELECT u.id, u.full_name, u.email, u.mobile, u.profile_image, u.role,
            u.email_verified, u.account_status, u.session_version
     FROM users u
     INNER JOIN auth_sessions s ON s.user_id = u.id
     WHERE s.token_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > UTC_TIMESTAMP(3)
       AND s.session_version = u.session_version
     LIMIT 1`,
    [hashOpaqueToken(token)],
  );
  const row = rows[0];

  if (
    !row ||
    row.account_status !== "active" ||
    Number(row.email_verified) !== 1
  ) {
    return null;
  }

  return {
    ...sanitizeUser(row),
    sessionVersion: Number(row.session_version),
  } satisfies CurrentUser;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return null;
  }

  return user;
}
