import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { savedAddressColumns, serializeSavedAddress } from "@/lib/addresses";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import { addressSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

function authError(status: 401 | 403) {
  return NextResponse.json(
    {
      success: false,
      message: status === 401 ? "Authentication required." : "Customer access required.",
    },
    { status },
  );
}

async function getAddressId(context: RouteContext) {
  const { id } = await context.params;
  const addressId = Number(id);
  return Number.isSafeInteger(addressId) && addressId > 0 ? addressId : null;
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return authError(401);
  if (user.role !== "customer") return authError(403);

  const addressId = await getAddressId(context);
  if (addressId === null) {
    return NextResponse.json(
      { success: false, message: "Invalid address ID." },
      { status: 400 },
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

    const [currentRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ? FOR UPDATE",
      [addressId, user.id],
    );
    if (currentRows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return NextResponse.json(
        { success: false, message: "Address not found." },
        { status: 404 },
      );
    }

    const wasDefault = Boolean(currentRows[0].is_default);
    if (parsed.data.isDefault) {
      await connection.execute(
        "UPDATE user_addresses SET is_default = 0 WHERE user_id = ?",
        [user.id],
      );
    }

    await connection.execute(
      "UPDATE user_addresses SET label = ?, full_name = ?, phone = ?, address_line_1 = ?, address_line_2 = ?, city = ?, state = ?, postal_code = ?, country = ?, is_default = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
      [
        parsed.data.label || "Home",
        parsed.data.fullName,
        parsed.data.phone || null,
        parsed.data.addressLine1,
        parsed.data.addressLine2 || null,
        parsed.data.city,
        parsed.data.state || null,
        parsed.data.postalCode || null,
        parsed.data.country,
        parsed.data.isDefault ? 1 : wasDefault ? 1 : 0,
        addressId,
        user.id,
      ],
    );

    let defaultAddressId = parsed.data.isDefault ? addressId : null;
    if (wasDefault && !parsed.data.isDefault) {
      const [otherAddresses] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM user_addresses WHERE user_id = ? AND id <> ? ORDER BY is_default DESC, created_at ASC, id ASC LIMIT 1 FOR UPDATE",
        [user.id, addressId],
      );
      if (otherAddresses.length > 0) {
        defaultAddressId = Number(otherAddresses[0].id);
        await connection.execute(
          "UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
          [defaultAddressId, user.id],
        );
        await connection.execute(
          "UPDATE user_addresses SET is_default = 0 WHERE user_id = ? AND id <> ?",
          [user.id, defaultAddressId],
        );
      } else {
        defaultAddressId = addressId;
        await connection.execute(
          "UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
          [addressId, user.id],
        );
      }
    }

    const [addressRows] = await connection.execute<RowDataPacket[]>(
      `SELECT ${savedAddressColumns} FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1`,
      [addressId, user.id],
    );
    await connection.commit();
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Address updated.",
      address: serializeSavedAddress(addressRows[0]),
      defaultAddressId,
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Address update rollback failed:", rollbackError);
      }
    }
    console.error("Address update failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update the address." },
      { status: 500 },
    );
  } finally {
    connection?.release();
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return authError(401);
  if (user.role !== "customer") return authError(403);

  const addressId = await getAddressId(context);
  if (addressId === null) {
    return NextResponse.json(
      { success: false, message: "Invalid address ID." },
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

    const [addressRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ? FOR UPDATE",
      [addressId, user.id],
    );
    if (addressRows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return NextResponse.json(
        { success: false, message: "Address not found." },
        { status: 404 },
      );
    }

    await connection.execute(
      "DELETE FROM user_addresses WHERE id = ? AND user_id = ?",
      [addressId, user.id],
    );

    let defaultAddressId: number | null = null;
    if (Boolean(addressRows[0].is_default)) {
      const [remainingAddresses] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM user_addresses WHERE user_id = ? ORDER BY created_at ASC, id ASC LIMIT 1 FOR UPDATE",
        [user.id],
      );
      if (remainingAddresses.length > 0) {
        defaultAddressId = Number(remainingAddresses[0].id);
        await connection.execute(
          "UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
          [defaultAddressId, user.id],
        );
      }
    }

    await connection.commit();
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Address removed.",
      addressId,
      defaultAddressId,
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Address removal rollback failed:", rollbackError);
      }
    }
    console.error("Address removal failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to remove the address." },
      { status: 500 },
    );
  } finally {
    connection?.release();
  }
}
