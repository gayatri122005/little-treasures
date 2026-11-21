import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { savedAddressColumns, serializeSavedAddress } from "@/lib/addresses";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import { addressSchema } from "@/lib/validation";

function authError(status: 401 | 403) {
  return NextResponse.json(
    {
      success: false,
      message: status === 401 ? "Authentication required." : "Customer access required.",
    },
    { status },
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return authError(401);
  if (user.role !== "customer") return authError(403);

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ${savedAddressColumns} FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC, id DESC`,
      [user.id],
    );

    return NextResponse.json({
      success: true,
      addresses: rows.map((row) => serializeSavedAddress(row)),
    });
  } catch (error) {
    console.error("Address fetch failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load saved addresses." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return authError(401);
  if (user.role !== "customer") return authError(403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Check the address details.",
      },
      { status: 400 },
    );
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [users] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE id = ? FOR UPDATE",
      [user.id],
    );
    if (users.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return NextResponse.json(
        { success: false, message: "Customer account not found." },
        { status: 404 },
      );
    }

    const [existingAddresses] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM user_addresses WHERE user_id = ? ORDER BY id ASC FOR UPDATE",
      [user.id],
    );
    const isDefault = parsed.data.isDefault || existingAddresses.length === 0;
    if (isDefault) {
      await connection.execute(
        "UPDATE user_addresses SET is_default = 0 WHERE user_id = ?",
        [user.id],
      );
    }

    const [result] = await connection.execute(
      "INSERT INTO user_addresses (user_id, label, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        user.id,
        parsed.data.label || "Home",
        parsed.data.fullName,
        parsed.data.phone || null,
        parsed.data.addressLine1,
        parsed.data.addressLine2 || null,
        parsed.data.city,
        parsed.data.state || null,
        parsed.data.postalCode || null,
        parsed.data.country,
        isDefault ? 1 : 0,
      ],
    );
    const addressId = Number((result as { insertId: number }).insertId);
    const [addressRows] = await connection.execute<RowDataPacket[]>(
      `SELECT ${savedAddressColumns} FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1`,
      [addressId, user.id],
    );

    await connection.commit();
    transactionStarted = false;

    return NextResponse.json(
      {
        success: true,
        message: "Address saved.",
        address: serializeSavedAddress(addressRows[0]),
      },
      { status: 201 },
    );
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Address creation rollback failed:", rollbackError);
      }
    }
    console.error("Address creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to save the address." },
      { status: 500 },
    );
  } finally {
    connection?.release();
  }
}
