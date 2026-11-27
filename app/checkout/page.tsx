"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useStorefront } from "@/components/StorefrontContext";

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }
}

type AddressForm = { fullName: string; email: string; phone: string; addressLine1: string; addressLine2: string; city: string; state: string; postalCode: string; country: string };
type GatewayOrder = { orderId: number; orderNumber: string; gatewayOrderId: string; keyId: string; amount: number; currency: string; customer: { name: string; email: string; contact: string } };
type Quote = { subtotal: number; shipping: number; discount: number; tax: number; total: number; taxRate: number; currency: string };

function formatPrice(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value); }

async function loadCheckoutScript() {
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { authLoading, authUser, cartItems } = useStorefront();
  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cartItems]);
  const [address, setAddress] = useState<AddressForm>({ fullName: "", email: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "India" });
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [codEnabled, setCodEnabled] = useState(true);
  const [paymentEnabled, setPaymentEnabled] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      router.replace(`/signin?redirect=${encodeURIComponent("/checkout")}`);
      return;
    }
    const timer = window.setTimeout(() => {
      setAddress((current) => ({
        ...current,
        fullName: authUser.full_name || "",
        email: authUser.email || "",
        phone: authUser.mobile || "",
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, authUser, router]);

  useEffect(() => {
    if (!cartItems.length) return;
    const controller = new AbortController();
    fetch("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", signal: controller.signal, body: JSON.stringify({ items: cartItems.map(({ product, quantity }) => ({ productId: product.id, quantity })) }) })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || "Your cart needs an update."); setQuote(result.quote); setCodEnabled(result.codEnabled !== false); setPaymentEnabled(result.paymentEnabled === true); if (result.paymentEnabled !== true) setPaymentMethod(result.codEnabled === false ? "razorpay" : "cod"); })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to calculate order total."); });
    return () => controller.abort();
  }, [cartItems]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!cartItems.length) { setError("Your bag is empty."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout/orders", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ items: cartItems.map(({ product, quantity }) => ({ productId: product.id, quantity })), paymentMethod, address }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to start checkout.");
      if (result.orderType === "cod") { router.push(`/checkout/success?order=${result.orderId}`); return; }
      const gatewayOrder = result as GatewayOrder;
      if (!(await loadCheckoutScript()) || !window.Razorpay) { router.push(`/checkout/failed?order=${gatewayOrder.orderId}`); return; }
      const checkout = new window.Razorpay({
        key: gatewayOrder.keyId,
        amount: Math.round(gatewayOrder.amount * 100),
        currency: gatewayOrder.currency,
        name: "OMTreasure",
        description: `Order ${gatewayOrder.orderNumber}`,
        order_id: gatewayOrder.gatewayOrderId,
        prefill: gatewayOrder.customer,
        notes: { order_number: gatewayOrder.orderNumber },
        theme: { color: "var(--purple)" },
        handler: async (paymentResponse: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyResponse = await fetch("/api/checkout/verify", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ orderId: gatewayOrder.orderId, ...paymentResponse }) });
          const verified = await verifyResponse.json();
          router.push(`/checkout/${verified.status === "paid" ? "success" : verified.status === "failed" ? "failed" : "pending"}?order=${gatewayOrder.orderId}`);
        },
        modal: { ondismiss: () => router.push(`/checkout/pending?order=${gatewayOrder.orderId}`) },
      });
      checkout.open();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Checkout could not be started."); }
    finally { setBusy(false); }
  }

  if (!cartItems.length) return (
    <main className="min-h-[65vh] bg-[var(--page)] px-5 py-20 text-center">
      <p className="eyebrow">Ready when you are</p><h1 className="serif-display mt-3 text-4xl">Your bag is empty</h1>
      <Link href="/products" className="mt-7 inline-flex rounded-full bg-[var(--purple)] px-6 py-3 text-sm font-semibold text-white">Explore the collection</Link>
    </main>
  );

  return (
    <main className="min-h-screen bg-[var(--page)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/products" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--purple)]">← Continue shopping</Link>
        <header className="mt-5"><p className="eyebrow">Almost yours</p><h1 className="serif-display mt-2 text-4xl sm:text-5xl">Checkout</h1><p className="mt-2 text-sm text-[var(--muted)]">Your order and payment are protected with secure checkout.</p></header>
        <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7">
              <h2 className="serif-display text-2xl">Delivery details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {([["fullName","Full name","text"],["email","Email address","email"],["phone","Mobile number","tel"],["addressLine1","Address line 1","text"],["addressLine2","Address line 2 (optional)","text"],["city","City","text"],["state","State","text"],["postalCode","PIN code","text"],["country","Country","text"]] as const).map(([key,label,type]) => (
                  <label key={key} className={`${key === "addressLine1" || key === "addressLine2" ? "sm:col-span-2" : ""} grid gap-1.5 text-xs font-medium text-[#403A35]`}>
                    {label}<input required={key !== "addressLine2"} type={type} autoComplete={key === "fullName" ? "name" : key === "email" ? "email" : key === "phone" ? "tel" : key === "addressLine1" ? "address-line1" : key === "city" ? "address-level2" : key === "state" ? "address-level1" : key === "postalCode" ? "postal-code" : undefined} value={address[key]} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--page)] px-3 text-sm outline-none focus:border-[var(--purple)]" />
                  </label>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7">
              <h2 className="serif-display text-2xl">Payment</h2>
              <div className="mt-4 grid gap-3">
                <label className={`flex gap-3 rounded-xl border border-[var(--line)] p-4 ${paymentEnabled ? "cursor-pointer" : "opacity-55"}`}><input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === "razorpay"} disabled={!paymentEnabled} onChange={() => setPaymentMethod("razorpay")} className="accent-[var(--purple)]" /><span><strong className="block text-sm">Pay online securely</strong><span className="mt-1 block text-xs text-[var(--muted)]">UPI, Google Pay, PhonePe, cards, net banking and supported wallets via Razorpay.</span>{!paymentEnabled && <span className="mt-1 block text-xs text-[#9d3c33]">Online payment setup is incomplete. Configure Razorpay Test Mode keys to enable it.</span>}</span></label>
                {codEnabled && <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] p-4"><input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="accent-[var(--purple)]" /><span><strong className="block text-sm">Cash on delivery</strong><span className="mt-1 block text-xs text-[var(--muted)]">Pay in cash when your order arrives.</span></span></label>}
              </div>
            </section>
          </div>
          <aside className="h-fit rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7 lg:sticky lg:top-24">
            <h2 className="serif-display text-2xl">Your order</h2>
            <div className="mt-5 divide-y divide-[var(--surface-soft)]">
              {cartItems.map(({ product, quantity }) => <div key={product.id} className="flex items-center gap-3 py-3 first:pt-0"><div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-soft)]">{product.image ? <Image src={product.image} alt="" fill sizes="64px" className="object-cover" /> : null}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.name}</p><p className="mt-1 text-xs text-[var(--muted)]">Qty {quantity} · {formatPrice(product.price)} each</p></div><span className="text-sm font-medium">{formatPrice(product.price * quantity)}</span></div>)}
            </div>
            <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4 text-sm"><div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal</span><span>{formatPrice(quote?.subtotal ?? subtotal)}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">Shipping</span><span>{quote ? quote.shipping ? formatPrice(quote.shipping) : "Complimentary" : "Calculating…"}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">Discount</span><span>{quote ? quote.discount ? `−${formatPrice(quote.discount)}` : "—" : "—"}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">Taxes{quote?.taxRate ? ` (${quote.taxRate}%)` : ""}</span><span>{quote ? formatPrice(quote.tax) : "Calculating…"}</span></div></div>
            <div className="mt-4 flex justify-between border-t border-[var(--line)] pt-4"><span className="font-semibold">Final payable</span><span className="serif-display text-xl">{quote ? formatPrice(quote.total) : "Calculating…"}</span></div>
            {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff2f1] px-3 py-2.5 text-xs text-[#81362e]">{error}</p>}
            <button disabled={busy || !quote || (paymentMethod === "razorpay" && !paymentEnabled) || (paymentMethod === "cod" && !codEnabled)} className="mt-5 min-h-12 w-full rounded-full bg-[var(--purple)] px-5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60">{busy ? "Preparing secure checkout…" : paymentMethod === "cod" ? "Place COD order" : "Pay securely"}</button>
            <p className="mt-3 text-center text-[10px] leading-5 text-[var(--muted)]">Card details, CVV, OTP and UPI PIN are handled by Razorpay and never stored by OMTreasure.</p>
          </aside>
        </form>
      </div>
    </main>
  );
}
