import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import { z } from "zod";
import pool from "@/lib/db";

const subscriptionSchema = z.object({
  email: z.string().trim().email().max(255),
});

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Cross-origin subscriptions are not allowed." },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 2048) {
    return NextResponse.json(
      { success: false, message: "The subscription request is too large." },
      { status: 413 },
    );
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { success: false, message: "Submit a valid email address." },
      { status: 415 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "The subscription request is invalid." },
      { status: 400 },
    );
  }

  const parsed = subscriptionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Enter a valid email address." },
      { status: 400 },
    );
  }

  try {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO newsletter_subscribers (email)
       VALUES (?)
       ON DUPLICATE KEY UPDATE email = VALUES(email)`,
      [parsed.data.email.toLowerCase()],
    );

    return NextResponse.json({
      success: true,
      message: "Your address is saved for future updates. Newsletter emails are not active yet.",
    });
  } catch (error) {
    console.error("Newsletter subscription failed:", error);
    return NextResponse.json(
      { success: false, message: "We couldn’t save your subscription. Please try again." },
      { status: 500 },
    );
  }
}
