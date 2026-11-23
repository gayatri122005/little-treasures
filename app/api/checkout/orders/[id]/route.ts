import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import { confirmCapturedPayment, failPayment } from "@/lib/order-fulfillment";
import { razorpayConfig, razorpayRequest, type RazorpayEntity, toPaise } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  try {
    const [rows] = await pool.execute<(RowDataPacket & { id: number; user_id: number; order_number: string; status: string; order_type: string; payment_status: string; total_amount: string; subtotal_amount: string; shipping_amount: string; discount_amount: string; tax_amount: string; currency: string; created_at: Date; shipping_address_json: string | null; gateway_order_id: string | null; amount: string | null; gateway_payment_id: string | null; payment_method: string | null })[]>(
      `SELECT o.id, o.user_id, o.order_number, o.status, o.order_type, o.payment_status, o.total_amount, o.subtotal_amount, o.shipping_amount, o.discount_amount, o.tax_amount, o.currency, o.created_at, o.shipping_address_json,
              p.gateway_order_id, p.gateway_payment_id, p.payment_method, p.amount FROM orders o LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.id = ? AND o.user_id = ? ORDER BY p.attempt_number DESC LIMIT 1`, [id, user.id],
    );
    const order = rows[0];
    if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    if (order.order_type === "online" && order.gateway_order_id && order.payment_status !== "paid") {
      // Payment lookup is performed through Razorpay's Order Payments API; a pending state stays pending.
      const result = await razorpayRequest<{ items: RazorpayEntity[] }>(`/orders/${encodeURIComponent(order.gateway_order_id)}/payments`);
      const matching = result.items.find((payment) => payment.status === "captured" && payment.order_id === order.gateway_order_id && payment.amount === toPaise(order.amount ?? order.total_amount) && payment.currency === order.currency);
      if (matching) {
        const confirmation = await confirmCapturedPayment(order.gateway_order_id, matching.id, matching.method);
        if (confirmation.confirmed) order.payment_status = "paid";
      } else if (result.items.some((payment) => payment.status === "failed")) {
        const failed = result.items.find((payment) => payment.status === "failed");
        if (failed) await failPayment(order.gateway_order_id, failed.id, failed.error_code, failed.error_description, failed.method);
      }
    }
    const [orderItems] = await pool.execute<(RowDataPacket & { product_id: number; product_name: string | null; product_image: string | null; quantity: number; price: string })[]>(
      "SELECT product_id, product_name, product_image, quantity, price FROM order_items WHERE order_id = ? ORDER BY id", [id],
    );
    let address: unknown = null;
    try { address = order.shipping_address_json ? JSON.parse(order.shipping_address_json) : null; } catch { address = null; }
    const [transactions] = await pool.execute<(RowDataPacket & { gateway_payment_id: string | null; payment_method: string; payment_status: string; amount: string })[]>("SELECT gateway_payment_id, payment_method, payment_status, amount FROM payments WHERE order_id = ? ORDER BY attempt_number DESC", [id]);
    return NextResponse.json({ success: true, order: { id: order.id, orderNumber: order.order_number, status: order.status, orderType: order.order_type, paymentStatus: order.payment_status, totalAmount: Number(order.total_amount), subtotalAmount: Number(order.subtotal_amount), shippingAmount: Number(order.shipping_amount), discountAmount: Number(order.discount_amount), taxAmount: Number(order.tax_amount), currency: order.currency, createdAt: order.created_at, address, items: orderItems.map((item) => ({ productId: String(item.product_id), name: item.product_name, image: item.product_image, quantity: Number(item.quantity), price: Number(item.price) })), transactions: transactions.map((item) => ({ transactionId: item.gateway_payment_id, method: item.payment_method, status: item.payment_status, amount: Number(item.amount) })) } });
  } catch (error) {
    console.error("Checkout order status lookup failed:", error);
    return NextResponse.json({ success: false, message: "Unable to confirm payment status yet." }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "customer") return NextResponse.json({ success: false, message: "Sign in to retry payment." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  try {
    const { keyId } = razorpayConfig();
    const connection = await pool.getConnection();
    let gatewayOrder: { id: string };
    let amount: number;
    let orderNumber: string;
    let attempt: number;
    let localPaymentId: number;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<(RowDataPacket & { id: number; order_number: string; total_amount: string; currency: string; payment_status: string; order_type: string; reservation_expires_at: Date | null })[]>(
        "SELECT id, order_number, total_amount, currency, payment_status, order_type, reservation_expires_at FROM orders WHERE id = ? AND user_id = ? FOR UPDATE", [id, user.id],
      );
      const order = rows[0];
      if (!order || order.order_type !== "online" || order.payment_status === "paid" || !order.reservation_expires_at || new Date(order.reservation_expires_at).getTime() < Date.now()) {
        await connection.rollback(); return NextResponse.json({ success: false, message: "This payment can no longer be retried. Please start checkout again." }, { status: 409 });
      }
      const [latestRows] = await connection.execute<(RowDataPacket & { payment_status: string })[]>("SELECT payment_status FROM payments WHERE order_id = ? ORDER BY attempt_number DESC LIMIT 1", [id]);
      if (latestRows[0] && ["pending", "authorized", "captured", "paid"].includes(latestRows[0].payment_status)) {
        await connection.rollback(); return NextResponse.json({ success: false, message: "A payment attempt is still being confirmed. Check its status before retrying." }, { status: 409 });
      }
      amount = toPaise(order.total_amount);
      orderNumber = order.order_number;
      const [attemptRows] = await connection.execute<(RowDataPacket & { next_attempt: number })[]>("SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt FROM payments WHERE order_id = ?", [id]);
      attempt = Number(attemptRows[0]?.next_attempt ?? 1);
      const [paymentInsert] = await connection.execute<ResultSetHeader>(
        `INSERT INTO payments (order_id, user_id, amount, currency, payment_method, gateway, attempt_number, payment_status)
         VALUES (?, ?, ?, ?, 'razorpay_checkout', 'razorpay', ?, 'pending')`, [id, user.id, order.total_amount, order.currency, attempt],
      );
      localPaymentId = Number(paymentInsert.insertId);
      // Create the gateway order outside the SQL transaction to avoid holding row locks during network I/O.
      await connection.commit();
      try {
        gatewayOrder = await razorpayRequest("/orders", { method: "POST", body: JSON.stringify({ amount, currency: order.currency, receipt: `${order.order_number.slice(0, 24)}-${attempt}`, notes: { internal_order_id: String(id), order_number: order.order_number } }) });
      } catch (error) {
        await connection.execute("UPDATE payments SET payment_status = 'failed', failure_description = 'Razorpay order creation failed' WHERE id = ?", [localPaymentId]);
        throw error;
      }
      await connection.execute("UPDATE payments SET gateway_order_id = ? WHERE id = ?", [gatewayOrder.id, localPaymentId]);
    } catch (error) {
      try { await connection.rollback(); } catch { /* already committed */ }
      throw error;
    } finally { connection.release(); }
    const [customer] = await pool.execute<(RowDataPacket & { full_name: string; email: string; mobile: string | null })[]>("SELECT full_name, email, mobile FROM users WHERE id = ?", [user.id]);
    return NextResponse.json({ success: true, orderId: Number(id), orderNumber, gatewayOrderId: gatewayOrder.id, keyId, amount: amount / 100, currency: "INR", customer: { name: customer[0]?.full_name ?? "", email: customer[0]?.email ?? "", contact: customer[0]?.mobile ?? "" } });
  } catch (error) {
    console.error("Payment retry failed:", error);
    return NextResponse.json({ success: false, message: "Unable to retry payment right now." }, { status: 502 });
  }
}
