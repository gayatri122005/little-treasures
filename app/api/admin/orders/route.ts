import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { requireAdmin } from "@/lib/auth";
import pool from "@/lib/db";
import { orderEmailText, sendOrderEmail } from "@/lib/order-notifications";
import { z } from "zod";

export const runtime = "nodejs";
const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
const safeDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ success: false, message: "Administrator access required." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const paymentStatus = params.get("paymentStatus");
  const orderType = params.get("orderType");
  const status = params.get("status");
  const from = safeDate.safeParse(params.get("from") || undefined);
  const to = safeDate.safeParse(params.get("to") || undefined);
  if (!from.success || !to.success || (paymentStatus && !["pending", "authorized", "paid", "failed", "refunded", "cod_pending", "cod_paid"].includes(paymentStatus)) || (orderType && !["online", "cod"].includes(orderType)) || (status && !statuses.includes(status as (typeof statuses)[number]))) {
    return NextResponse.json({ success: false, message: "Invalid order filters." }, { status: 400 });
  }
  const filters: string[] = [];
  const values: Array<string | number> = [];
  if (paymentStatus) { filters.push("o.payment_status = ?"); values.push(paymentStatus); }
  if (orderType) { filters.push("o.order_type = ?"); values.push(orderType); }
  if (status) { filters.push("o.status = ?"); values.push(status); }
  if (from.data) { filters.push("o.created_at >= ?"); values.push(`${from.data} 00:00:00`); }
  if (to.data) { filters.push("o.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); values.push(to.data); }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  try {
    const [orders] = await pool.execute<(RowDataPacket & Record<string, unknown>)[]>(
      `SELECT o.id, o.order_number, o.status, o.order_type, o.payment_status, o.total_amount, o.subtotal_amount,
              o.shipping_amount, o.discount_amount, o.tax_amount, o.currency, o.shipping_address_json, o.created_at,
              u.full_name AS customer_name, COALESCE(JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address_json, '$.email')), u.email) AS customer_email, u.mobile AS customer_mobile,
              (SELECT p.id FROM payments p WHERE p.order_id = o.id ORDER BY p.attempt_number DESC LIMIT 1) AS latest_payment_id,
              (SELECT p.gateway_payment_id FROM payments p WHERE p.order_id = o.id ORDER BY p.attempt_number DESC LIMIT 1) AS transaction_id,
              (SELECT p.payment_method FROM payments p WHERE p.order_id = o.id ORDER BY p.attempt_number DESC LIMIT 1) AS payment_method,
              (SELECT p.payment_status FROM payments p WHERE p.order_id = o.id ORDER BY p.attempt_number DESC LIMIT 1) AS latest_payment_status
       FROM orders o JOIN users u ON u.id = o.user_id ${where} ORDER BY o.created_at DESC LIMIT 500`, values,
    );
    if (params.get("format") === "csv") {
      const header = ["Order number", "Date", "Customer", "Email", "Order type", "Order status", "Payment status", "Transaction ID", "Subtotal", "Shipping", "Discount", "Tax", "Total", "Currency"];
      const lines = [header, ...orders.map((o) => [o.order_number,o.created_at,o.customer_name,o.customer_email,o.order_type,o.status,o.payment_status,o.transaction_id,o.subtotal_amount,o.shipping_amount,o.discount_amount,o.tax_amount,o.total_amount,o.currency])].map((row) => row.map(csvCell).join(","));
      return new Response(`\uFEFF${lines.join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=little-treasures-payment-report.csv", "Cache-Control": "no-store" } });
    }
    const ids = orders.map((order) => Number(order.id));
    let items: RowDataPacket[] = [];
    let refunds: RowDataPacket[] = [];
    let transactions: RowDataPacket[] = [];
    let paymentAttempts: RowDataPacket[] = [];
    if (ids.length) {
      const marks = ids.map(() => "?").join(",");
      [items] = await pool.execute<RowDataPacket[]>(`SELECT order_id, product_id, product_name, product_image, quantity, price FROM order_items WHERE order_id IN (${marks}) ORDER BY id`, ids);
      [transactions] = await pool.execute<RowDataPacket[]>(`SELECT id, order_id, gateway, payment_method, gateway_order_id, gateway_payment_id, attempt_number, amount, currency, payment_status, failure_code, failure_description, created_at, paid_at FROM payments WHERE order_id IN (${marks}) ORDER BY order_id, attempt_number DESC`, ids);
      [paymentAttempts] = await pool.execute<RowDataPacket[]>(`SELECT pa.id, pa.payment_id, p.order_id, pa.gateway_payment_id, pa.payment_status, pa.method, pa.failure_code, pa.failure_description, pa.created_at FROM payment_attempts pa JOIN payments p ON p.id = pa.payment_id WHERE p.order_id IN (${marks}) ORDER BY p.order_id, pa.created_at DESC`, ids);
      [refunds] = await pool.execute<RowDataPacket[]>(`SELECT id, order_id, payment_id, gateway_refund_id, amount, currency, status, reason, created_at FROM refunds WHERE order_id IN (${marks}) ORDER BY created_at DESC`, ids);
    }
    return NextResponse.json({ success: true, orders: orders.map((order) => ({ ...order, items: items.filter((item) => Number(item.order_id) === Number(order.id)), transactions: transactions.filter((payment) => Number(payment.order_id) === Number(order.id)).map((payment) => ({ ...payment, attempts: paymentAttempts.filter((attempt) => Number(attempt.payment_id) === Number(payment.id)) })), refunds: refunds.filter((refund) => Number(refund.order_id) === Number(order.id)) })) });
  } catch (error) { console.error("Admin order lookup failed:", error); return NextResponse.json({ success: false, message: "Unable to load orders and payments." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ success: false, message: "Administrator access required." }, { status: 403 });
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ success: false, message: "Cross-origin changes are not allowed." }, { status: 403 });
  const parsed = z.object({ orderId: z.number().int().positive(), status: z.enum(statuses) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Order update is invalid." }, { status: 400 });
  const connection = await pool.getConnection();
  let email = ""; let number = ""; let amount = 0; let changed = false;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { status: string; payment_status: string; stock_committed: number; order_number: string; total_amount: string; email: string })[]>(
      `SELECT o.status, o.payment_status, o.stock_committed, o.order_number, o.total_amount, COALESCE(JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address_json, '$.email')), u.email) AS email
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ? FOR UPDATE`, [parsed.data.orderId],
    );
    const order = rows[0];
    if (!order) { await connection.rollback(); return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 }); }
    if (parsed.data.status === "cancelled" && ["paid", "cod_paid"].includes(order.payment_status) && order.payment_status !== "refunded") {
      await connection.rollback(); return NextResponse.json({ success: false, message: "Refund paid orders before cancelling them." }, { status: 409 });
    }
    if (parsed.data.status === "cancelled" && order.status !== "cancelled") {
      const [items] = await connection.execute<(RowDataPacket & { product_id: number; quantity: number })[]>("SELECT product_id, quantity FROM order_items WHERE order_id = ? FOR UPDATE", [parsed.data.orderId]);
      for (const item of items) {
        if (order.stock_committed) await connection.execute("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [item.quantity, item.product_id]);
        else await connection.execute("UPDATE products SET stock_reserved = GREATEST(0, stock_reserved - ?) WHERE id = ?", [item.quantity, item.product_id]);
      }
      await connection.execute("UPDATE orders SET stock_committed = 0, reservation_expires_at = NULL WHERE id = ?", [parsed.data.orderId]);
    }
    if (order.status === "cancelled" && parsed.data.status !== "cancelled") { await connection.rollback(); return NextResponse.json({ success: false, message: "Cancelled orders cannot be reopened." }, { status: 409 }); }
    await connection.execute("UPDATE orders SET status = ? WHERE id = ?", [parsed.data.status, parsed.data.orderId]);
    if (parsed.data.status === "delivered") {
      await connection.execute("UPDATE orders SET payment_status = 'cod_paid' WHERE id = ? AND order_type = 'cod' AND payment_status = 'cod_pending'", [parsed.data.orderId]);
      await connection.execute("UPDATE payments SET payment_status = 'paid', paid_at = COALESCE(paid_at, NOW()) WHERE order_id = ? AND gateway = 'cod' AND payment_status = 'pending'", [parsed.data.orderId]);
    }
    await connection.commit();
    email = order.email; number = order.order_number; amount = Number(order.total_amount); changed = order.status !== parsed.data.status;
  } catch (error) { try { await connection.rollback(); } catch { /* already rolled back */ } console.error("Admin order update failed:", error); return NextResponse.json({ success: false, message: "Unable to update this order." }, { status: 500 }); }
  finally { connection.release(); }
  if (changed && ["shipped", "delivered", "cancelled"].includes(parsed.data.status)) {
    const amountText = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
    void sendOrderEmail({ to: email, ...orderEmailText(number, parsed.data.status, amountText) });
  }
  return NextResponse.json({ success: true });
}
