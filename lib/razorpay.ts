import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials are not configured.");
  return { keyId, keySecret };
}

export type RazorpayEntity = {
  id: string;
  entity?: string;
  order_id?: string;
  payment_id?: string;
  amount: number;
  amount_paid?: number;
  currency: string;
  status: string;
  method?: string;
  error_code?: string | null;
  error_description?: string | null;
  created_at?: number;
};

export async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { keyId, keySecret } = razorpayConfig();
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => null) as (T & { error?: { description?: string } }) | null;
  if (!response.ok || !data) {
    throw new Error(data?.error?.description || `Razorpay request failed (${response.status}).`);
  }
  return data;
}

export function createCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const { keySecret } = razorpayConfig();
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "hex"); } catch { return false; }
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function toPaise(amount: number | string) {
  return Math.round(Number(amount) * 100);
}
