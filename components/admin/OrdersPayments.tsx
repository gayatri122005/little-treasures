"use client";

import { useCallback, useEffect, useState } from "react";

type AdminOrder = {
  id: number; order_number: string; status: string; order_type: string; payment_status: string;
  total_amount: number | string; currency: string; subtotal_amount: number | string; shipping_amount: number | string;
  discount_amount: number | string; tax_amount: number | string; created_at: string; customer_name: string;
  customer_email: string; customer_mobile: string | null;
  shipping_address_json: string | { fullName?: string; phone?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string; country?: string } | null;
  items: Array<{ product_name: string; quantity: number; price: number | string }>;
  transactions: Array<{ id: number; gateway_order_id: string | null; gateway_payment_id: string | null; payment_method: string; payment_status: string; amount: number | string; failure_description: string | null; attempts: Array<{ gateway_payment_id: string; payment_status: string; method: string | null; failure_description: string | null; created_at: string }> }>;
  refunds: Array<{ id: number; gateway_refund_id: string | null; amount: number | string; status: string; reason: string | null }>;
};

function money(value: unknown) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value ?? 0)); }

export default function OrdersPayments() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [orderType, setOrderType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setNotice("");
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (orderType) params.set("orderType", orderType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const response = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load orders.");
    setOrders(result.orders);
  }, [status, paymentStatus, orderType, from, to]);

  useEffect(() => { const timer = window.setTimeout(() => { void load().catch((error) => setNotice(error instanceof Error ? error.message : "Unable to load orders.")); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function updateStatus(orderId: number, nextStatus: string) {
    setBusy(orderId); setNotice("");
    try {
      const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status: nextStatus }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || "Order status update failed."); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Order status update failed."); }
    finally { setBusy(null); }
  }

  async function syncPayment(orderId: number) {
    setBusy(orderId); setNotice("");
    try {
      const response = await fetch("/api/admin/orders/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || "Payment status refresh failed."); setNotice(`Gateway status: ${result.status}.`); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Payment status refresh failed."); }
    finally { setBusy(null); }
  }

  async function refund(order: AdminOrder) {
    const eligible = order.transactions.find((transaction) => transaction.gateway_payment_id && ["captured", "paid"].includes(transaction.payment_status));
    if (!eligible) { setNotice("This order has no captured Razorpay payment to refund."); return; }
    const value = window.prompt("Refund amount in rupees. Leave blank to refund the remaining captured amount.");
    if (value === null) return;
    const reason = window.prompt("Optional refund reason:") ?? "Admin refund";
    setBusy(order.id); setNotice("");
    try {
      const response = await fetch("/api/admin/refunds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: eligible.id, ...(value.trim() ? { amount: Number(value) } : {}), reason }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || "Refund could not be started."); setNotice(`Refund ${result.refund.gatewayRefundId}: ${result.refund.status}.`); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Refund could not be started."); await load().catch(() => undefined); }
    finally { setBusy(null); }
  }

  async function exportReport() {
    const params = new URLSearchParams(); params.set("format", "csv");
    if (status) params.set("status", status); if (paymentStatus) params.set("paymentStatus", paymentStatus); if (orderType) params.set("orderType", orderType); if (from) params.set("from", from); if (to) params.set("to", to);
    try {
      const response = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Report export failed.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "little-treasures-payment-report.csv"; link.click(); URL.revokeObjectURL(url);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Report export failed."); }
  }

  return (
    <section className="rounded-2xl border border-[#E3D8C9] bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Store operations</p><h1 className="serif-display mt-1 text-3xl sm:text-4xl">Orders &amp; payments</h1><p className="mt-2 text-xs text-[#6E655F]">Review fulfillment, gateway attempts, refunds and COD orders.</p></div><button onClick={exportReport} className="rounded-full border border-[#E3D8C9] px-4 py-2.5 text-xs font-semibold">Export payment report</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[#6E655F]">Order status<select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-10 rounded-lg border border-[#E3D8C9] bg-[#FAF7F2] px-2 text-xs font-normal normal-case text-[#1E1B18]"><option value="">All orders</option>{["pending","processing","shipped","delivered","cancelled"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[#6E655F]">Payment status<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="min-h-10 rounded-lg border border-[#E3D8C9] bg-[#FAF7F2] px-2 text-xs font-normal normal-case text-[#1E1B18]"><option value="">All payments</option>{["pending","authorized","paid","failed","refunded","cod_pending","cod_paid"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[#6E655F]">Order type<select value={orderType} onChange={(event) => setOrderType(event.target.value)} className="min-h-10 rounded-lg border border-[#E3D8C9] bg-[#FAF7F2] px-2 text-xs font-normal normal-case text-[#1E1B18]"><option value="">All methods</option><option value="online">Online</option><option value="cod">Cash on delivery</option></select></label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[#6E655F]">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="min-h-10 rounded-lg border border-[#E3D8C9] bg-[#FAF7F2] px-2 text-xs font-normal normal-case" /></label>
        <label className="grid gap-1 text-[10px] font-semibold uppercase text-[#6E655F]">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="min-h-10 rounded-lg border border-[#E3D8C9] bg-[#FAF7F2] px-2 text-xs font-normal normal-case" /></label>
      </div>
      {notice && <p role="status" className="mt-4 rounded-lg bg-[#F1EBE1] px-3 py-2 text-xs text-[#403A35]">{notice}</p>}
      <div className="mt-5 space-y-3">
        {orders.length === 0 ? <p className="rounded-xl bg-[#FAF7F2] p-8 text-center text-sm text-[#6E655F]">No orders match these filters.</p> : orders.map((order) => {
          let address: Record<string, string> = {};
          try { address = typeof order.shipping_address_json === "string" ? JSON.parse(order.shipping_address_json) : order.shipping_address_json ?? {}; } catch { address = {}; }
          const transaction = order.transactions[0];
          return <article key={order.id} className="rounded-xl border border-[#E3D8C9]">
            <button type="button" onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="grid w-full gap-2 p-4 text-left sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] sm:items-center">
              <span><strong className="block text-sm">{order.order_number}</strong><small className="text-[#6E655F]">{new Date(order.created_at).toLocaleString("en-IN")}</small></span>
              <span className="text-xs">{order.customer_name}<small className="block text-[#6E655F]">{order.customer_email}</small></span>
              <span className="text-xs capitalize">{order.order_type === "cod" ? "Cash on delivery" : transaction?.payment_method ?? "Online"}<small className="block text-[#6E655F]">{order.payment_status.replaceAll("_", " ")}</small></span>
              <strong className="text-sm">{money(order.total_amount)}</strong><span className="text-xs text-[#6E655F]">{expanded === order.id ? "Hide details −" : "Details +"}</span>
            </button>
            {expanded === order.id && <div className="border-t border-[#E3D8C9] bg-[#FAF7F2] p-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <section><h2 className="text-xs font-semibold uppercase tracking-wider">Customer &amp; delivery</h2><p className="mt-2 text-xs leading-5">{order.customer_name}<br />{order.customer_email}<br />{order.customer_mobile}<br />{address.fullName} · {address.phone}<br />{address.addressLine1} {address.addressLine2}<br />{address.city}, {address.state} {address.postalCode}<br />{address.country}</p></section>
                <section><h2 className="text-xs font-semibold uppercase tracking-wider">Items &amp; totals</h2><ul className="mt-2 space-y-1 text-xs">{order.items.map((item, index) => <li key={`${item.product_name}-${index}`}>{item.product_name} × {item.quantity} · {money(Number(item.price) * item.quantity)}</li>)}</ul><div className="mt-3 space-y-1 border-t border-[#E3D8C9] pt-2 text-xs"><p>Subtotal {money(order.subtotal_amount)}</p><p>Shipping {money(order.shipping_amount)}</p><p>Discount −{money(order.discount_amount)}</p><p>Tax {money(order.tax_amount)}</p><strong>Total {money(order.total_amount)}</strong></div></section>
                <section><h2 className="text-xs font-semibold uppercase tracking-wider">Transactions &amp; refunds</h2><ul className="mt-2 space-y-2 text-xs">{order.transactions.map((payment) => <li key={payment.id} className="rounded-lg bg-white p-2"><strong className="capitalize">{payment.payment_status}</strong> · {payment.payment_method} · {money(payment.amount)}<br />Razorpay order: {payment.gateway_order_id ?? "Not created"}<br />Captured transaction: {payment.gateway_payment_id ?? "No successful transaction"}{payment.failure_description && <p className="text-[#9d3c33]">{payment.failure_description}</p>}{payment.attempts.map((attempt) => <p key={attempt.gateway_payment_id} className="mt-1 border-t border-[#F1EBE1] pt-1">{attempt.payment_status} · {attempt.method ?? "Gateway attempt"} · {attempt.gateway_payment_id}{attempt.failure_description ? ` · ${attempt.failure_description}` : ""}</p>)}</li>)}</ul><ul className="mt-2 space-y-1 text-xs">{order.refunds.map((item) => <li key={item.id}>Refund {item.gateway_refund_id ?? "pending"} · {money(item.amount)} · {item.status}</li>)}</ul></section>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#E3D8C9] pt-4">
                <label className="grid gap-1 text-[10px] uppercase text-[#6E655F]">Fulfillment status<select value={order.status} disabled={busy === order.id} onChange={(event) => void updateStatus(order.id, event.target.value)} className="min-h-9 rounded-lg border border-[#E3D8C9] bg-white px-2 text-xs capitalize text-[#1E1B18]">{["pending","processing","shipped","delivered","cancelled"].map((item) => <option key={item}>{item}</option>)}</select></label>
                {order.order_type === "online" && <button type="button" disabled={busy === order.id} onClick={() => void syncPayment(order.id)} className="min-h-9 rounded-full border border-[#E3D8C9] bg-white px-4 text-xs font-medium">Check payment status</button>}
                {order.transactions.some((item) => item.gateway_payment_id && ["captured","paid"].includes(item.payment_status)) && <button type="button" disabled={busy === order.id} onClick={() => void refund(order)} className="min-h-9 rounded-full border border-[#E3D8C9] bg-white px-4 text-xs font-medium">Initiate refund</button>}
              </div>
            </div>}
          </article>;
        })}
      </div>
      <p className="mt-4 text-[10px] text-[#6E655F]">Showing up to 500 matching orders. Export downloads the same filtered report as CSV.</p>
    </section>
  );
}
