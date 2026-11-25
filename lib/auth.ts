import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import pool from "@/lib/db";

export const SESSION_COOKIE_NAME = "little_treasures_session";

function getSessionSecret() {
  const value = process.env.JWT_SECRET;
  if (!value || new TextEncoder().encode(value).byteLength < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 bytes.");
  }

  return new TextEncoder().encode(value);
}

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
  return new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string) {
  const secret = getSessionSecret();
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (!Number.isSafeInteger(payload.userId) || Number(payload.userId) < 1) {
      return null;
    }
    if (
      payload.sessionVersion !== undefined &&
      (!Number.isSafeInteger(payload.sessionVersion) || Number(payload.sessionVersion) < 0)
    ) {
      return null;
    }

    return payload as {
      userId: number;
      email: string;
      role: "customer" | "admin";
      fullName?: string;
      sessionVersion?: number;
    } | null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const [rows] = await pool.execute<AuthUserRow[]>(
    `SELECT id, full_name, email, mobile, profile_image, role,
            email_verified, account_status, session_version
     FROM users WHERE id = ? LIMIT 1`,
    [payload.userId],
  );
  const row = rows[0];

  if (
    !row ||
    row.account_status !== "active" ||
    Number(row.email_verified) !== 1 ||
    Number(row.session_version) !== Number(payload.sessionVersion ?? 0)
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
