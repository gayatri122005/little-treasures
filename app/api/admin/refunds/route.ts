import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import pool from "@/lib/db";
import { razorpayRequest, toPaise } from "@/lib/razorpay";
import { orderEmailText, sendOrderEmail } from "@/lib/order-notifications";

export const runtime = "nodejs";
const schema = z.object({ paymentId: z.number().int().positive(), amount: z.number().positive().max(99999999.99).optional(), reason: z.string().trim().max(255).optional() });

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ success: false, message: "Administrator access required." }, { status: 403 });
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ success: false, message: "Cross-origin changes are not allowed." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Refund details are invalid." }, { status: 400 });

  let connection: PoolConnection | undefined;
  let refundDbId = 0;
  let paymentId = "";
  let amountPaise = 0;
  let orderId = 0;
  let currency = "INR";
  const idempotencyKey = randomUUID();
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [payments] = await connection.execute<(RowDataPacket & { id: number; order_id: number; gateway_payment_id: string | null; gateway: string; amount: string; currency: string; payment_status: string })[]>(
      "SELECT id, order_id, gateway_payment_id, gateway, amount, currency, payment_status FROM payments WHERE id = ? FOR UPDATE", [parsed.data.paymentId],
    );
    const payment = payments[0];
    if (!payment || payment.gateway !== "razorpay" || !payment.gateway_payment_id || !["captured", "paid"].includes(payment.payment_status)) {
      await connection.rollback(); return NextResponse.json({ success: false, message: "Only captured Razorpay payments can be refunded." }, { status: 409 });
    }
    const [refundRows] = await connection.execute<(RowDataPacket & { reserved_amount: string })[]>(
      "SELECT COALESCE(SUM(amount), 0) AS reserved_amount FROM refunds WHERE payment_id = ? AND status IN ('pending','processed')", [payment.id],
    );
    const remainingPaise = toPaise(payment.amount) - toPaise(refundRows[0]?.reserved_amount ?? 0);
    amountPaise = parsed.data.amount === undefined ? remainingPaise : Math.round(parsed.data.amount * 100);
    if (amountPaise < 100 || amountPaise > remainingPaise) {
      await connection.rollback(); return NextResponse.json({ success: false, message: `Refund must be at least ₹1 and no more than ${new Intl.NumberFormat("en-IN", { style: "currency", currency: payment.currency }).format(Math.max(0, remainingPaise / 100))}.` }, { status: 400 });
    }
    orderId = Number(payment.order_id);
    paymentId = payment.gateway_payment_id;
    currency = payment.currency;
    const [insert] = await connection.execute<ResultSetHeader>(
      `INSERT INTO refunds (payment_id, order_id, amount, currency, status, reason, idempotency_key, created_by)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [payment.id, payment.order_id, (amountPaise / 100).toFixed(2), currency, parsed.data.reason || null, idempotencyKey, admin.id],
    );
    refundDbId = Number(insert.insertId);
    await connection.commit();
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch { /* rolled back */ } }
    console.error("Refund request could not be prepared:", error);
    return NextResponse.json({ success: false, message: "Unable to prepare this refund." }, { status: 500 });
  } finally { connection?.release(); }

  try {
    const refund = await razorpayRequest<{ id: string; status: "pending" | "processed" | "failed"; amount: number; currency: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      headers: { "X-Refund-Idempotency": idempotencyKey },
      body: JSON.stringify({ amount: amountPaise, notes: { internal_order_id: String(orderId), reason: parsed.data.reason || "Admin refund" } }),
    });
    const status = refund.status === "processed" ? "processed" : refund.status === "failed" ? "failed" : "pending";
    await pool.execute("UPDATE refunds SET gateway_refund_id = ?, status = CASE WHEN status = 'processed' THEN status ELSE ? END, updated_at = NOW() WHERE id = ?", [refund.id, status, refundDbId]);
    const [statusRows] = await pool.execute<(RowDataPacket & { status: "pending" | "processed" | "failed" })[]>("SELECT status FROM refunds WHERE id = ?", [refundDbId]);
    const storedStatus = statusRows[0]?.status ?? status;
    if (storedStatus === "processed") {
      const [sumRows] = await pool.execute<(RowDataPacket & { total: string; payment_amount: string })[]>(
        "SELECT (SELECT COALESCE(SUM(amount),0) FROM refunds WHERE payment_id = ? AND status = 'processed') AS total, amount AS payment_amount FROM payments WHERE id = ?", [parsed.data.paymentId, parsed.data.paymentId],
      );
      if (toPaise(sumRows[0]?.total ?? 0) >= toPaise(sumRows[0]?.payment_amount ?? 0)) {
        await pool.execute("UPDATE payments SET payment_status = 'refunded' WHERE id = ?", [parsed.data.paymentId]);
        await pool.execute("UPDATE orders SET payment_status = 'refunded' WHERE id = ?", [orderId]);
      }
      const [recipients] = await pool.execute<(RowDataPacket & { email: string; order_number: string })[]>("SELECT COALESCE(JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address_json, '$.email')), u.email) AS email, o.order_number FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?", [orderId]);
      if (recipients[0]) {
        const formatted = new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amountPaise / 100);
        void sendOrderEmail({ to: recipients[0].email, ...orderEmailText(recipients[0].order_number, "refund processed", formatted) });
      }
    }
    return NextResponse.json({ success: true, refund: { id: refundDbId, gatewayRefundId: refund.id, amount: refund.amount / 100, currency: refund.currency, status: storedStatus } });
  } catch (error) {
    // Keep the record pending because a network failure can happen after Razorpay accepts the refund.
    console.error("Refund gateway response could not be confirmed:", error);
    return NextResponse.json({ success: false, pendingReview: true, message: "Razorpay’s response could not be confirmed. Check the Razorpay dashboard before starting another refund." }, { status: 503 });
  }
}
