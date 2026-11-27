import "server-only";

type Notification = { to: string; subject: string; text: string; html: string };

export async function sendOrderEmail(message: Notification) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, skipped: true };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, ...message }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Order email delivery failed:", response.status);
      return { sent: false, skipped: false };
    }
    return { sent: true, skipped: false };
  } catch {
    console.error("Order email delivery failed: provider could not be reached.");
    return { sent: false, skipped: false };
  }
}

export function orderEmailText(orderNumber: string, status: string, amount: string) {
  const subject = `OMTreasure order ${orderNumber}: ${status}`;
  const text = `Your order ${orderNumber} is ${status}. Order total: ${amount}. Visit your account to view order details.`;
  const html = `<p>Your order <strong>${escapeHtml(orderNumber)}</strong> is ${escapeHtml(status)}.</p><p>Order total: ${escapeHtml(amount)}</p><p>Visit your OMTreasure account to view order details.</p>`;
  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
