"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStorefront } from "@/components/StorefrontContext";

type CheckoutOrder = { id: number; orderNumber: string; status: string; orderType: string; paymentStatus: string; totalAmount: number; subtotalAmount: number; shippingAmount: number; discountAmount: number; taxAmount: number; currency: string; address: { fullName?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string; country?: string } | null; items: Array<{ productId: string; name: string; image: string | null; quantity: number; price: number }>; transactions: Array<{ transactionId: string | null; method: string; status: string; amount: number }> };
type ResultMode = "success" | "failed" | "pending";

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } } }
function price(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value); }

export default function PaymentResult({ mode }: { mode: ResultMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const { removeFromCart } = useStorefront();
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!orderId) { setMessage("We could not find this order. Check your account order history."); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/checkout/orders/${encodeURIComponent(orderId)}`, { credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Order status is unavailable.");
      setOrder(result.order);
      setMessage("");
      if (result.order.paymentStatus === "paid" || result.order.orderType === "cod") {
        for (const item of result.order.items) removeFromCart(item.productId);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Order status is unavailable."); }
    finally { setLoading(false); }
  }, [orderId, removeFromCart]);

  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  const latestPayment = order?.transactions[0];
  const actualMode = order?.orderType === "cod" || order?.paymentStatus === "paid" ? "success" : latestPayment?.status === "failed" ? "failed" : mode;

  async function retry() {
    if (!orderId) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/checkout/orders/${encodeURIComponent(orderId)}`, { method: "POST", credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to retry payment.");
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Secure checkout could not be loaded.")); document.body.appendChild(script);
        });
      }
      const Checkout = window.Razorpay;
      if (!Checkout) throw new Error("Secure checkout could not be loaded.");
      const checkout = new Checkout({ key: result.keyId, amount: Math.round(result.amount * 100), currency: result.currency, name: "Little Treasures", description: `Order ${result.orderNumber}`, order_id: result.gatewayOrderId, prefill: result.customer, theme: { color: "#B85042" }, handler: async (payment: Record<string, string>) => { await fetch("/api/checkout/verify", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ orderId: result.orderId, ...payment }) }); router.push(`/checkout/pending?order=${result.orderId}`); }, modal: { ondismiss: () => router.push(`/checkout/pending?order=${result.orderId}`) } });
      checkout.open();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to retry payment."); }
    finally { setBusy(false); }
  }

  const title = actualMode === "success" ? order?.orderType === "cod" ? "Your order is on its way" : "Payment complete" : actualMode === "failed" ? "Payment wasn’t completed" : "Payment is being confirmed";
  const description = actualMode === "success" ? order?.orderType === "cod" ? "Your cash on delivery order has been placed." : "Your payment was verified and your order is confirmed." : actualMode === "failed" ? "Your order has not been confirmed yet. You can safely retry payment." : "We’re checking with Razorpay. This page will never mark an unverified payment as successful.";

  return (
    <main className="min-h-[70vh] bg-[#FAF7F2] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#E3D8C9] bg-white p-6 shadow-sm sm:p-10">
        <div className={`flex size-14 items-center justify-center rounded-full text-2xl ${actualMode === "success" ? "bg-[#e9f5ea] text-[#28613b]" : actualMode === "failed" ? "bg-[#fff0ee] text-[#9d3c33]" : "bg-[#fff7e7] text-[#8a6518]"}`}>{actualMode === "success" ? "✓" : actualMode === "failed" ? "!" : "…"}</div>
        <p className="eyebrow mt-5">Little Treasures · Order update</p>
        <h1 className="serif-display mt-2 text-4xl sm:text-5xl">{loading ? "Checking your order…" : title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6E655F]">{message || description}</p>
        {order && <>
          <div className="mt-7 grid gap-3 rounded-2xl bg-[#FAF7F2] p-4 sm:grid-cols-3 sm:p-5">
            <div><p className="text-[10px] uppercase tracking-wider text-[#6E655F]">Order number</p><p className="mt-1 text-sm font-semibold">{order.orderNumber}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-[#6E655F]">Amount</p><p className="mt-1 text-sm font-semibold">{price(order.totalAmount)}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-[#6E655F]">Payment status</p><p className="mt-1 text-sm font-semibold capitalize">{order.orderType === "cod" ? "Cash on delivery" : order.paymentStatus}</p></div>
          </div>
          {latestPayment?.transactionId && <p className="mt-4 text-xs text-[#6E655F]">Transaction ID: <span className="font-medium text-[#1E1B18]">{latestPayment.transactionId}</span> · {latestPayment.method}</p>}
          <section className="mt-7"><h2 className="serif-display text-2xl">Order summary</h2><div className="mt-3 divide-y divide-[#F1EBE1]">{order.items.map((item) => <div key={item.productId} className="flex items-center gap-3 py-3"><div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-[#F1EBE1]">{item.image ? <Image src={item.image} alt="" fill sizes="48px" className="object-cover" /> : null}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-1 text-xs text-[#6E655F]">Qty {item.quantity}</p></div><span className="text-sm">{price(item.price * item.quantity)}</span></div>)}</div><div className="mt-3 space-y-1 border-t border-[#E3D8C9] pt-3 text-xs text-[#6E655F]"><p className="flex justify-between"><span>Subtotal</span><span>{price(order.subtotalAmount)}</span></p><p className="flex justify-between"><span>Shipping</span><span>{price(order.shippingAmount)}</span></p><p className="flex justify-between"><span>Discount</span><span>−{price(order.discountAmount)}</span></p><p className="flex justify-between"><span>Tax</span><span>{price(order.taxAmount)}</span></p><p className="flex justify-between pt-1 text-sm font-semibold text-[#1E1B18]"><span>Total</span><span>{price(order.totalAmount)}</span></p></div></section>
          {order.address && <p className="mt-5 text-xs leading-5 text-[#6E655F]">Delivering to {order.address.fullName}: {order.address.addressLine1} {order.address.addressLine2}, {order.address.city}, {order.address.state} {order.address.postalCode}, {order.address.country}</p>}
        </>}
        <div className="mt-8 flex flex-wrap gap-3">
          {actualMode === "failed" && <button type="button" disabled={busy || loading} onClick={retry} className="rounded-full bg-[#B85042] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Preparing…" : "Retry payment"}</button>}
          {actualMode === "pending" && <button type="button" disabled={loading} onClick={() => void refresh()} className="rounded-full bg-[#1E1B18] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">Check payment status</button>}
          <Link href="/products" className="rounded-full border border-[#E3D8C9] px-6 py-3 text-sm font-semibold text-[#1E1B18]">Continue shopping</Link>
          <Link href="/customer-dashboard" className="rounded-full border border-[#E3D8C9] px-6 py-3 text-sm font-semibold text-[#1E1B18]">View my orders</Link>
        </div>
        {actualMode === "failed" && <p className="mt-5 text-xs text-[#6E655F]">Questions? Visit our <Link href="/contact" className="underline underline-offset-2">support page</Link>.</p>}
      </div>
    </main>
  );
}
