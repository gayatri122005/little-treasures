import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import { razorpayConfig, razorpayRequest, toPaise } from "@/lib/razorpay";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().regex(/^\d+$/), quantity: z.number().int().min(1).max(99) })).min(1).max(30),
  paymentMethod: z.enum(["razorpay", "cod"]),
  address: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.email().max(255),
    phone: z.string().trim().min(8).max(32),
    addressLine1: z.string().trim().min(5).max(255),
    addressLine2: z.string().trim().max(255).optional().or(z.literal("")),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().min(4).max(25),
    country: z.string().trim().min(2).max(100).default("India"),
  }),
});

type ProductRow = RowDataPacket & { id: number; product_name: string; price: string; stock_quantity: number; stock_reserved: number; status: string; image_path: string | null };
type UserRow = RowDataPacket & { full_name: string; email: string; mobile: string | null };

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (!origin || origin === new URL(request.url).origin) && request.headers.get("sec-fetch-site") !== "cross-site";
}

function moneySetting(name: string, fallback: number, max: number) {
  const amount = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(amount) || amount < 0 || amount > max) throw new Error(`Invalid ${name} configuration.`);
  return Math.round(amount * 100);
}

async function releaseReservation(connection: PoolConnection, orderId: number) {
  const [items] = await connection.execute<(RowDataPacket & { product_id: number; quantity: number })[]>(
    "SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId],
  );
  for (const item of items) {
    await connection.execute("UPDATE products SET stock_reserved = GREATEST(0, stock_reserved - ?) WHERE id = ?", [item.quantity, item.product_id]);
  }
  await connection.execute("UPDATE orders SET reservation_expires_at = NULL WHERE id = ?", [orderId]);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "customer") return NextResponse.json({ success: false, message: "Sign in to place an order." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ success: false, message: "Cross-origin checkout is not allowed." }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: "Checkout details are invalid." }, { status: 400 }); }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Checkout details are invalid." }, { status: 400 });
  if (parsed.data.paymentMethod === "cod" && process.env.ENABLE_COD === "false") return NextResponse.json({ success: false, message: "Cash on delivery is not enabled." }, { status: 403 });

  const merged = new Map<string, number>();
  for (const item of parsed.data.items) merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  const productIds = [...merged.keys()].sort((a, b) => Number(a) - Number(b));
  const address = { ...parsed.data.address, email: parsed.data.address.email.trim().toLowerCase(), country: parsed.data.address.country.trim() || "India" };
  let connection: PoolConnection | undefined;
  let internalId = 0;
  let orderNumber = "";
  let amountPaise = 0;
  let keyId = "";

  try {
    if (parsed.data.paymentMethod === "razorpay") keyId = razorpayConfig().keyId;
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Release expired reservations while holding product rows in a single transaction.
    const [expiredOrders] = await connection.execute<(RowDataPacket & { id: number })[]>(
      "SELECT id FROM orders WHERE payment_status IN ('pending','authorized','failed') AND reservation_expires_at < NOW() ORDER BY id LIMIT 100 FOR UPDATE",
    );
    for (const expired of expiredOrders) {
      await releaseReservation(connection, Number(expired.id));
      await connection.execute("UPDATE orders SET payment_status = 'failed' WHERE id = ?", [expired.id]);
      await connection.execute("UPDATE payments SET payment_status = 'failed', failure_description = 'Checkout reservation expired' WHERE order_id = ? AND payment_status = 'pending'", [expired.id]);
    }

    const [users] = await connection.execute<UserRow[]>("SELECT full_name, email, mobile FROM users WHERE id = ? AND role = 'customer' LIMIT 1", [user.id]);
    if (!users[0]) { await connection.rollback(); return NextResponse.json({ success: false, message: "Customer account not found." }, { status: 401 }); }

    const [products] = await connection.execute<ProductRow[]>(
      `SELECT p.id, p.product_name, p.price, p.stock_quantity, p.stock_reserved, p.status,
              (SELECT image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.id LIMIT 1) AS image_path
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id IN (${productIds.map(() => "?").join(",")})
         AND c.status = 'active'
       ORDER BY p.id FOR UPDATE`, productIds,
    );
    if (products.length !== productIds.length) { await connection.rollback(); return NextResponse.json({ success: false, message: "One or more products are no longer available." }, { status: 409 }); }
    let subtotalPaise = 0;
    for (const product of products) {
      const quantity = merged.get(String(product.id)) ?? 0;
      if (product.status !== "active" || Number(product.stock_quantity) - Number(product.stock_reserved) < quantity) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: `${product.product_name} has insufficient available stock.` }, { status: 409 });
      }
      subtotalPaise += toPaise(product.price) * quantity;
    }
    const shippingPaise = moneySetting("STORE_SHIPPING_AMOUNT", 0, 100000);
    const taxRate = Number(process.env.STORE_TAX_RATE_PERCENT ?? 0);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 30) throw new Error("Invalid STORE_TAX_RATE_PERCENT configuration.");
    const discountPaise = 0;
    const taxPaise = Math.round((subtotalPaise + shippingPaise - discountPaise) * taxRate / 100);
    amountPaise = subtotalPaise + shippingPaise - discountPaise + taxPaise;
    if (amountPaise < 100 && parsed.data.paymentMethod === "razorpay") { await connection.rollback(); return NextResponse.json({ success: false, message: "The online payment amount must be at least ₹1." }, { status: 400 }); }

    const [addressResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO user_addresses (user_id, label, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country, is_default)
       VALUES (?, 'Checkout', ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [user.id, address.fullName, address.phone, address.addressLine1, address.addressLine2 || null, address.city, address.state, address.postalCode, address.country],
    );
    orderNumber = `LT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const reservationExpiresAt = parsed.data.paymentMethod === "razorpay" ? new Date(Date.now() + 30 * 60 * 1000) : null;
    const [orderResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO orders (user_id, order_number, status, order_type, payment_status, total_amount, subtotal_amount,
       shipping_amount, discount_amount, tax_amount, currency, shipping_address_id, shipping_address_json, reservation_expires_at, stock_committed)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?)` ,
      [user.id, orderNumber, parsed.data.paymentMethod === "cod" ? "cod" : "online", parsed.data.paymentMethod === "cod" ? "cod_pending" : "pending",
       (amountPaise / 100).toFixed(2), (subtotalPaise / 100).toFixed(2), (shippingPaise / 100).toFixed(2), (discountPaise / 100).toFixed(2), (taxPaise / 100).toFixed(2),
       addressResult.insertId, JSON.stringify(address), reservationExpiresAt, parsed.data.paymentMethod === "cod" ? 1 : 0],
    );
    internalId = Number(orderResult.insertId);
    for (const product of products) {
      const quantity = merged.get(String(product.id)) ?? 0;
      await connection.execute(
        "INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price) VALUES (?, ?, ?, ?, ?, ?)",
        [internalId, product.id, product.product_name, product.image_path, quantity, product.price],
      );
      if (parsed.data.paymentMethod === "cod") {
        await connection.execute("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?", [quantity, product.id, quantity]);
      } else {
        await connection.execute("UPDATE products SET stock_reserved = stock_reserved + ? WHERE id = ?", [quantity, product.id]);
      }
    }
    const [attemptRows] = await connection.execute<(RowDataPacket & { next_attempt: number })[]>("SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt FROM payments WHERE order_id = ?", [internalId]);
    const attempt = Number(attemptRows[0]?.next_attempt ?? 1);
    await connection.execute(
      `INSERT INTO payments (order_id, user_id, amount, currency, payment_method, gateway, attempt_number, payment_status)
       VALUES (?, ?, ?, 'INR', ?, ?, ?, ?)`,
      [internalId, user.id, (amountPaise / 100).toFixed(2), parsed.data.paymentMethod === "cod" ? "cash_on_delivery" : "razorpay_checkout", parsed.data.paymentMethod === "cod" ? "cod" : "razorpay", attempt, parsed.data.paymentMethod === "cod" ? "pending" : "pending"],
    );
    await connection.commit();

    if (parsed.data.paymentMethod === "cod") {
      void sendCodConfirmation(address.email, orderNumber, amountPaise / 100);
      return NextResponse.json({ success: true, orderId: internalId, orderNumber, orderType: "cod", amount: amountPaise / 100 });
    }

    try {
      const gatewayOrder = await razorpayRequest<{ id: string }>("/orders", {
        method: "POST",
        body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: orderNumber, notes: { internal_order_id: String(internalId), order_number: orderNumber } }),
      });
      await pool.execute("UPDATE payments SET gateway_order_id = ? WHERE order_id = ? AND attempt_number = ?", [gatewayOrder.id, internalId, attempt]);
      return NextResponse.json({ success: true, orderId: internalId, orderNumber, gatewayOrderId: gatewayOrder.id, keyId, amount: amountPaise / 100, currency: "INR", customer: { name: address.fullName, email: address.email, contact: address.phone } });
    } catch (error) {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      await releaseReservation(connection, internalId);
      await connection.execute("UPDATE orders SET payment_status = 'failed' WHERE id = ?", [internalId]);
      await connection.execute("UPDATE payments SET payment_status = 'failed', failure_description = ? WHERE order_id = ? AND payment_status = 'pending'", [error instanceof Error ? error.message.slice(0, 500) : "Gateway order could not be created.", internalId]);
      await connection.commit();
      return NextResponse.json({ success: false, message: "The payment service is unavailable. Please try checkout again." }, { status: 502 });
    }
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch { /* transaction already ended */ }
    }
    console.error("Checkout order creation failed:", error);
    return NextResponse.json({ success: false, message: "Unable to place this order right now." }, { status: 500 });
  } finally {
    connection?.release();
  }
}

async function sendCodConfirmation(email: string, orderNumber: string, amount: number) {
  const { orderEmailText, sendOrderEmail } = await import("@/lib/order-notifications");
  const formatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
  await sendOrderEmail({ to: email, ...orderEmailText(orderNumber, "placed with cash on delivery", formatted) });
}
