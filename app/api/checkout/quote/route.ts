import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import { toPaise } from "@/lib/razorpay";

const schema = z.object({ items: z.array(z.object({ productId: z.string().regex(/^\d+$/), quantity: z.number().int().min(1).max(99) })).min(1).max(30) });
export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Cart details are invalid." }, { status: 400 });
  const merged = new Map<string, number>();
  for (const item of parsed.data.items) merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  try {
    const ids = [...merged.keys()];
    const [rows] = await pool.execute<(RowDataPacket & { id: number; price: string; stock_quantity: number; product_name: string; status: string })[]>(
      `SELECT p.id, p.price, p.stock_quantity, p.product_name, p.status
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.id IN (${ids.map(() => "?").join(",")}) AND c.category_name IN ('Home & Decor','Kids Wear','Fashion & Hair Accessories')`, ids,
    );
    if (rows.length !== ids.length) return NextResponse.json({ success: false, message: "One or more products are no longer available." }, { status: 409 });
    let subtotal = 0;
    for (const row of rows) {
      const quantity = merged.get(String(row.id)) ?? 0;
      if (row.status !== "active" || Number(row.stock_quantity) < quantity) return NextResponse.json({ success: false, message: `${row.product_name} is currently unavailable in that quantity.` }, { status: 409 });
      subtotal += toPaise(row.price) * quantity;
    }
    const shipping = Math.round(Number(process.env.STORE_SHIPPING_AMOUNT ?? 0) * 100);
    const rate = Number(process.env.STORE_TAX_RATE_PERCENT ?? 0);
    if (!Number.isFinite(shipping) || shipping < 0 || shipping > 10000000 || !Number.isFinite(rate) || rate < 0 || rate > 30) throw new Error("Invalid store tax/shipping configuration.");
    const tax = Math.round((subtotal + shipping) * rate / 100);
    return NextResponse.json({ success: true, codEnabled: process.env.ENABLE_COD !== "false", paymentEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET), quote: { subtotal: subtotal / 100, shipping: shipping / 100, discount: 0, tax: tax / 100, total: (subtotal + shipping + tax) / 100, taxRate: rate, currency: "INR" } });
  } catch (error) {
    console.error("Checkout quote failed:", error);
    return NextResponse.json({ success: false, message: "Unable to calculate your order total." }, { status: 500 });
  }
}
