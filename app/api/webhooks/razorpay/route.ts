import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { confirmCapturedPayment, failPayment } from "@/lib/order-fulfillment";
import { razorpayRequest, verifyWebhookSignature, type RazorpayEntity, toPaise } from "@/lib/razorpay";
import { orderEmailText, sendOrderEmail } from "@/lib/order-notifications";

export const runtime = "nodejs";

type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayEntity & { error_code?: string | null; error_description?: string | null } };
    order?: { entity?: RazorpayEntity };
    refund?: { entity?: RazorpayEntity & { payment_id?: string; status: string } };
  };
};

async function confirmGatewayPayment(payment: RazorpayEntity) {
  if (!payment.order_id || !payment.id || payment.status !== "captured") return;
  const [rows] = await pool.execute<(RowDataPacket & { amount: string; currency: string })[]>(
    "SELECT amount, currency FROM payments WHERE gateway_order_id = ? AND gateway = 'razorpay' LIMIT 1", [payment.order_id],
  );
  const local = rows[0];
  if (!local || payment.amount !== toPaise(local.amount) || payment.currency !== local.currency) {
    throw new Error("Captured payment did not match the stored order amount and currency.");
  }
  const verified = await razorpayRequest<RazorpayEntity>(`/payments/${encodeURIComponent(payment.id)}`);
  if (verified.status !== "captured" || verified.order_id !== payment.order_id || verified.amount !== payment.amount || verified.currency !== payment.currency) {
    throw new Error("Razorpay payment status could not be verified.");
  }
  const result = await confirmCapturedPayment(payment.order_id, payment.id, payment.method);
  if (!result.confirmed) throw new Error(`Captured payment could not be fulfilled (${result.reason ?? "unknown"}).`);
}

async function applyEvent(event: WebhookPayload) {
  const type = event.event ?? "";
  const payment = event.payload?.payment?.entity;
  if (type === "payment.captured" && payment) return confirmGatewayPayment(payment);
  if (type === "payment.failed" && payment?.order_id) {
    await failPayment(payment.order_id, payment.id, payment.error_code, payment.error_description, payment.method);
    return;
  }
  if (type === "payment.authorized" && payment?.order_id) {
    await pool.execute("UPDATE payments SET payment_status = 'authorized' WHERE gateway_order_id = ? AND payment_status = 'pending'", [payment.order_id]);
    await pool.execute("UPDATE orders SET payment_status = 'authorized' WHERE id = (SELECT order_id FROM payments WHERE gateway_order_id = ? LIMIT 1) AND payment_status = 'pending'", [payment.order_id]);
    if (payment.id) await pool.execute(
      `INSERT INTO payment_attempts (payment_id, gateway_payment_id, payment_status, method)
       SELECT id, ?, 'authorized', ? FROM payments WHERE gateway_order_id = ?
       ON DUPLICATE KEY UPDATE payment_status = 'authorized', method = VALUES(method), updated_at = NOW()`,
      [payment.id, payment.method ?? null, payment.order_id],
    );
    return;
  }
  if (type === "order.paid") {
    const gatewayOrderId = event.payload?.order?.entity?.id;
    if (!gatewayOrderId) throw new Error("order.paid event did not include an order ID.");
    const payments = await razorpayRequest<{ items: RazorpayEntity[] }>(`/orders/${encodeURIComponent(gatewayOrderId)}/payments`);
    const captured = payments.items.find((item) => item.status === "captured" && item.order_id === gatewayOrderId);
    if (captured) await confirmGatewayPayment(captured);
    return;
  }
  if (type === "refund.processed" || type === "refund.failed" || type === "refund.created") {
    const refund = event.payload?.refund?.entity;
    if (!refund?.id || !refund.payment_id) throw new Error(`${type} event did not include refund details.`);
    const connection = await pool.getConnection();
    let refundEmail = "";
    let refundOrderNumber = "";
    let refundTotal = 0;
    let sendRefundEmail = false;
    let previousRefundStatus: string | null = null;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<(RowDataPacket & { id: number; order_id: number; email: string; order_number: string; total_amount: string })[]>(
        `SELECT p.id, p.order_id, u.email, o.order_number, o.total_amount FROM payments p
         JOIN orders o ON o.id = p.order_id JOIN users u ON u.id = o.user_id
         WHERE p.gateway_payment_id = ? LIMIT 1 FOR UPDATE`, [refund.payment_id],
      );
      const paymentRow = rows[0];
      if (!paymentRow) throw new Error("Refund event payment was not found locally.");
      const refundStatus = type === "refund.processed" ? "processed" : type === "refund.failed" ? "failed" : "pending";
      const [existing] = await connection.execute<(RowDataPacket & { id: number; status: string })[]>("SELECT id, status FROM refunds WHERE gateway_refund_id = ? LIMIT 1 FOR UPDATE", [refund.id]);
      if (existing[0]) {
        previousRefundStatus = existing[0].status;
        await connection.execute("UPDATE refunds SET status = ?, updated_at = NOW() WHERE id = ?", [refundStatus, existing[0].id]);
      } else {
        const [pending] = await connection.execute<(RowDataPacket & { id: number; status: string })[]>("SELECT id, status FROM refunds WHERE payment_id = ? AND amount = ? AND status = 'pending' AND gateway_refund_id IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE", [paymentRow.id, (refund.amount / 100).toFixed(2)]);
        if (pending[0]) { previousRefundStatus = pending[0].status; await connection.execute("UPDATE refunds SET gateway_refund_id = ?, status = ?, updated_at = NOW() WHERE id = ?", [refund.id, refundStatus, pending[0].id]); }
        else await connection.execute(
          `INSERT INTO refunds (payment_id, order_id, gateway_refund_id, amount, currency, status, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [paymentRow.id, paymentRow.order_id, refund.id, (refund.amount / 100).toFixed(2), refund.currency, refundStatus, `gateway-${refund.id}`],
        );
      }
      const [totals] = await connection.execute<(RowDataPacket & { refunded_total: string })[]>("SELECT COALESCE(SUM(amount), 0) AS refunded_total FROM refunds WHERE payment_id = ? AND status = 'processed'", [paymentRow.id]);
      const [paymentRows] = await connection.execute<(RowDataPacket & { amount: string })[]>("SELECT amount FROM payments WHERE id = ?", [paymentRow.id]);
      if (Number(totals[0]?.refunded_total ?? 0) >= Number(paymentRows[0]?.amount ?? 0)) {
        await connection.execute("UPDATE payments SET payment_status = 'refunded' WHERE id = ?", [paymentRow.id]);
        await connection.execute("UPDATE orders SET payment_status = 'refunded' WHERE id = ?", [paymentRow.order_id]);
      }
      await connection.commit();
      if (type === "refund.processed" && previousRefundStatus !== "processed") {
        sendRefundEmail = true;
        refundEmail = paymentRow.email;
        refundOrderNumber = paymentRow.order_number;
        refundTotal = Number(refund.amount) / 100;
      }
    } catch (error) { try { await connection.rollback(); } catch { /* rolled back */ } throw error; }
    finally { connection.release(); }
    if (sendRefundEmail && refundEmail) {
      const formatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(refundTotal);
      void sendOrderEmail({ to: refundEmail, ...orderEmailText(refundOrderNumber, "refund processed", formatted) });
    }
    return;
  }
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ success: false, message: "Webhook is not configured." }, { status: 503 });
  const rawBody = await request.text();
  if (rawBody.length > 1024 * 1024) return NextResponse.json({ success: false }, { status: 413 });
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature, secret)) return NextResponse.json({ success: false }, { status: 400 });
  let payload: WebhookPayload;
  try { payload = JSON.parse(rawBody) as WebhookPayload; } catch { return NextResponse.json({ success: false }, { status: 400 }); }
  if (typeof payload.event !== "string" || !payload.event) return NextResponse.json({ success: false }, { status: 400 });
  const eventId = request.headers.get("x-razorpay-event-id")?.trim() || createHash("sha256").update(rawBody).digest("hex");
  const rawHash = createHash("sha256").update(rawBody).digest("hex");
  const connection = await pool.getConnection();
  let eventRowId = 0;
  try {
    const [insert] = await connection.execute<ResultSetHeader>(
      `INSERT INTO payment_webhook_events (event_id, event_type, payload_sha256, payload_json)
       VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [eventId, payload.event, rawHash, rawBody],
    );
    eventRowId = Number(insert.insertId);
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { processing_status: string; processing_started_at: Date | null })[]>(
      "SELECT processing_status, processing_started_at FROM payment_webhook_events WHERE id = ? FOR UPDATE", [eventRowId],
    );
    if (rows[0]?.processing_status === "processed" || rows[0]?.processing_status === "ignored") {
      await connection.commit(); return NextResponse.json({ success: true, duplicate: true });
    }
    if (rows[0]?.processing_status === "processing" && rows[0].processing_started_at && Date.now() - new Date(rows[0].processing_started_at).getTime() < 5 * 60 * 1000) {
      await connection.commit(); return NextResponse.json({ success: false, message: "Event processing is already underway." }, { status: 503 });
    }
    await connection.execute("UPDATE payment_webhook_events SET processing_status = 'processing', processing_started_at = NOW(), processing_error = NULL WHERE id = ?", [eventRowId]);
    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch { /* rolled back */ }
    console.error("Razorpay webhook intake failed:", error);
    return NextResponse.json({ success: false }, { status: 503 });
  } finally { connection.release(); }

  try {
    await applyEvent(payload);
    await pool.execute("UPDATE payment_webhook_events SET processing_status = ?, processed_at = NOW(), processing_error = NULL WHERE id = ?", [new Set(["payment.captured", "payment.failed", "payment.authorized", "order.paid", "refund.processed", "refund.failed", "refund.created"]).has(payload.event) ? "processed" : "ignored", eventRowId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    await pool.execute("UPDATE payment_webhook_events SET processing_status = 'failed', processing_error = ? WHERE id = ?", [error instanceof Error ? error.message.slice(0, 500) : "Webhook processing failed.", eventRowId]).catch(() => undefined);
    console.error("Razorpay webhook processing failed:", error);
    return NextResponse.json({ success: false }, { status: 503 });
  }
}
