import { NextResponse } from "next/server";

import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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

  try {
    const [rows] = await pool.query(
      "SELECT id, order_number, status, total_amount, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [user.id],
    );

    return NextResponse.json({
      success: true,
      orders: Array.isArray(rows) ? rows : [],
    });
  } catch (error) {
    console.error("User orders lookup failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load order history.",
      },
      { status: 500 },
    );
  }
}
