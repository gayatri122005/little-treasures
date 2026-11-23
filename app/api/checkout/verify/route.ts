import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import { confirmCapturedPayment } from "@/lib/order-fulfillment";
import { createCheckoutSignature, razorpayRequest, type RazorpayEntity, toPaise } from "@/lib/razorpay";

const schema = z.object({ orderId: z.number().int().positive(), razorpay_order_id: z.string().min(8).max(80), razorpay_payment_id: z.string().min(8).max(80), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "customer") return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Payment response is invalid." }, { status: 400 });
  const data = parsed.data;
  if (!createCheckoutSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature)) {
    return NextResponse.json({ success: false, message: "Payment signature could not be verified." }, { status: 400 });
  }
  try {
    const [rows] = await pool.execute<(RowDataPacket & { id: number; user_id: number; gateway_order_id: string; amount: string; currency: string })[]>(
      `SELECT p.id, p.user_id, p.gateway_order_id, p.amount, p.currency FROM payments p
       JOIN orders o ON o.id = p.order_id WHERE o.id = ? AND o.user_id = ? AND p.gateway_order_id = ? LIMIT 1`,
      [data.orderId, user.id, data.razorpay_order_id],
    );
    const payment = rows[0];
    if (!payment) return NextResponse.json({ success: false, message: "Payment attempt was not found." }, { status: 404 });
    const gatewayPayment = await razorpayRequest<RazorpayEntity>(`/payments/${encodeURIComponent(data.razorpay_payment_id)}`);
    if (gatewayPayment.order_id !== payment.gateway_order_id || gatewayPayment.amount !== toPaise(payment.amount) || gatewayPayment.currency !== payment.currency) {
      return NextResponse.json({ success: false, message: "Payment details did not match this order." }, { status: 409 });
    }
    if (gatewayPayment.status === "captured") {
      const result = await confirmCapturedPayment(payment.gateway_order_id, gatewayPayment.id, gatewayPayment.method);
      if (!result.confirmed) return NextResponse.json({ success: false, message: "Payment was received but needs support review. Please contact us with your order number.", orderNumber: result.orderNumber ?? null }, { status: 409 });
      return NextResponse.json({ success: true, status: "paid", orderNumber: result.orderNumber });
    }
    if (gatewayPayment.status === "failed") return NextResponse.json({ success: false, status: "failed", message: "Razorpay did not capture this payment. You can retry from checkout." }, { status: 402 });
    return NextResponse.json({ success: true, status: "pending", message: "Payment is still being confirmed." }, { status: 202 });
  } catch (error) {
    console.error("Razorpay payment verification failed:", error);
    return NextResponse.json({ success: false, status: "pending", message: "Payment status could not be confirmed yet." }, { status: 503 });
  }
}
