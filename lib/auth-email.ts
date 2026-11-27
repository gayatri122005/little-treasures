import "server-only";

type AuthEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type AuthEmailResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "delivery_failed" };

export function authEmailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM || process.env.ORDER_EMAIL_FROM;
  const baseUrl = process.env.AUTH_BASE_URL;

  if (!apiKey || !from || !baseUrl) return null;

  try {
    const parsed = new URL(baseUrl);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return null;
    }
    return { apiKey, from, baseUrl: parsed.origin };
  } catch {
    return null;
  }
}

export async function sendAuthEmail(message: AuthEmail): Promise<AuthEmailResult> {
  const config = authEmailConfiguration();
  if (!config) return { sent: false, reason: "not_configured" };

  try {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) return { sent: true };
      await response.body?.cancel().catch(() => undefined);
      console.error("Authentication email delivery failed with provider status:", response.status);
      if (response.status < 500 || attempt === 2) break;
    }
    return { sent: false, reason: "delivery_failed" };
  } catch {
    console.error("Authentication email delivery failed: provider unavailable.");
    return { sent: false, reason: "delivery_failed" };
  }
}

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}
