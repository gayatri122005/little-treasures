import "server-only";

import { createHmac, createHash, randomBytes } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import type { NextResponse } from "next/server";
import type { PoolConnection } from "mysql2/promise";

import pool from "@/lib/db";

function rateLimitSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET must be configured before using authentication.");
  }
  return secret;
}

function hashSubject(action: string, subject: string) {
  return createHmac("sha256", rateLimitSecret())
    .update(`${action}:${subject.trim().toLowerCase()}`)
    .digest("hex");
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isSameOriginRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function requestClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return (forwardedFor?.split(",")[0] || realIp || "unknown").trim().slice(0, 64);
}

type RateLimitRow = RowDataPacket & {
  window_started: number;
  attempt_count: number;
  blocked_until: number | null;
};

export async function consumeRateLimit(
  action: string,
  subject: string,
  limit: number,
  windowSeconds: number,
) {
  const subjectHash = hashSubject(action, subject);
  const maxAttempts = Math.max(1, Math.floor(limit));
  const windowMs = Math.max(1, Math.floor(windowSeconds)) * 1000;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT IGNORE INTO auth_rate_limits
        (action, subject_hash, window_started_at, attempt_count, blocked_until)
       VALUES (?, ?, UTC_TIMESTAMP(3), 0, NULL)`,
      [action, subjectHash],
    );
    const [rows] = await connection.execute<RateLimitRow[]>(
      `SELECT UNIX_TIMESTAMP(window_started_at) AS window_started,
              attempt_count,
              UNIX_TIMESTAMP(blocked_until) AS blocked_until
       FROM auth_rate_limits
       WHERE action = ? AND subject_hash = ?
       FOR UPDATE`,
      [action, subjectHash],
    );

    const row = rows[0];
    if (!row) throw new Error("Unable to read the authentication rate limit.");

    const now = Date.now();
    const blockedUntilMs = row.blocked_until ? Number(row.blocked_until) * 1000 : 0;
    if (blockedUntilMs > now) {
      await connection.commit();
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((blockedUntilMs - now) / 1000)),
      };
    }

    const windowStartedMs = Number(row.window_started) * 1000;
    const newWindow = now - windowStartedMs >= windowMs;
    const attempts = newWindow ? 1 : Number(row.attempt_count) + 1;
    const blocked = attempts > maxAttempts;
    const nextWindowSql = newWindow ? "UTC_TIMESTAMP(3)" : "window_started_at";
    const blockedUntilSql = blocked
      ? `DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ${Math.ceil(windowMs / 1000)} SECOND)`
      : "NULL";

    await connection.execute(
      `UPDATE auth_rate_limits
       SET window_started_at = ${nextWindowSql}, attempt_count = ?, blocked_until = ${blockedUntilSql}
       WHERE action = ? AND subject_hash = ?`,
      [attempts, action, subjectHash],
    );
    await connection.commit();

    return {
      allowed: !blocked,
      retryAfterSeconds: blocked ? Math.ceil(windowMs / 1000) : 0,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function clearRateLimit(action: string, subject: string) {
  const subjectHash = hashSubject(action, subject);
  await pool.execute(
    "DELETE FROM auth_rate_limits WHERE action = ? AND subject_hash = ?",
    [action, subjectHash],
  );
}

export function rateLimitResponse(response: NextResponse, retryAfterSeconds: number) {
  response.headers.set("Retry-After", String(Math.max(1, retryAfterSeconds)));
  return response;
}

export async function issueEmailToken(
  connection: PoolConnection,
  table: "auth_email_verification_tokens" | "auth_password_reset_tokens",
  userId: number,
) {
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  await connection.execute(
    `UPDATE ${table} SET used_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND used_at IS NULL`,
    [userId],
  );
  await connection.execute(
    `INSERT INTO ${table} (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 MINUTE))`,
    [userId, tokenHash],
  );
  return token;
}
