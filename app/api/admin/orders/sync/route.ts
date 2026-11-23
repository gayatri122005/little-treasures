import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { requireAdmin } from "@/lib/auth";
import pool from "@/lib/db";
import { confirmCapturedPayment, failPayment } from "@/lib/order-fulfillment";
import { razorpayRequest, type RazorpayEntity, toPaise } from "@/lib/razorpay";
import { z } from "zod";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ success: false, message: "Administrator access required." }, { status: 403 });
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ success: false, message: "Cross-origin changes are not allowed." }, { status: 403 });
  const parsed = z.object({ orderId: z.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Order identifier is invalid." }, { status: 400 });
  try {
    const [rows] = await pool.execute<(RowDataPacket & { order_id: number; gateway_order_id: string | null; amount: string; currency: string; payment_status: string })[]>(
      "SELECT order_id, gateway_order_id, amount, currency, payment_status FROM payments WHERE order_id = ? AND gateway = 'razorpay' ORDER BY attempt_number DESC LIMIT 1", [parsed.data.orderId],
    );
    const row = rows[0];
    if (!row?.gateway_order_id) return NextResponse.json({ success: false, message: "No Razorpay payment attempt is attached to this order." }, { status: 404 });
    const { items } = await razorpayRequest<{ items: RazorpayEntity[] }>(`/orders/${encodeURIComponent(row.gateway_order_id)}/payments`);
    const captured = items.find((payment) => payment.status === "captured");
    if (captured && captured.amount === toPaise(row.amount) && captured.currency === row.currency && captured.order_id === row.gateway_order_id) {
      const result = await confirmCapturedPayment(row.gateway_order_id, captured.id, captured.method);
      if (!result.confirmed) return NextResponse.json({ success: false, message: "The captured payment could not be fulfilled; investigate before retrying." }, { status: 409 });
      return NextResponse.json({ success: true, status: "paid" });
    }
    const failed = items.find((payment) => payment.status === "failed");
    if (failed) await failPayment(row.gateway_order_id, failed.id, failed.error_code, failed.error_description, failed.method);
    return NextResponse.json({ success: true, status: items.some((payment) => payment.status === "authorized") ? "authorized" : failed ? "failed" : "pending" });
  } catch (error) { console.error("Admin payment status sync failed:", error); return NextResponse.json({ success: false, message: "Unable to refresh payment status from Razorpay." }, { status: 502 }); }
}
