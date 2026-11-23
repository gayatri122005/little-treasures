import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { orderEmailText, sendOrderEmail } from "@/lib/order-notifications";

export async function confirmCapturedPayment(gatewayOrderId: string, gatewayPaymentId: string, gatewayMethod?: string) {
  const connection = await pool.getConnection();
  let customerEmail = "";
  let orderNumber = "";
  let totalAmount = "0.00";
  let changed = false;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & {
      id: number; order_id: number; gateway_payment_id: string | null; payment_status: string;
      order_number: string; user_id: number; total_amount: string; stock_committed: number;
      reservation_expires_at: Date | null; payment_email: string;
    })[]>(
      `SELECT p.id, p.order_id, p.gateway_payment_id, p.payment_status, o.order_number, o.user_id,
              o.total_amount, o.stock_committed, o.reservation_expires_at,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address_json, '$.email')), u.email) AS payment_email
       FROM payments p JOIN orders o ON o.id = p.order_id JOIN users u ON u.id = o.user_id
       WHERE p.gateway_order_id = ? AND p.gateway = 'razorpay' LIMIT 1 FOR UPDATE`, [gatewayOrderId],
    );
    const payment = rows[0];
    if (!payment) { await connection.rollback(); return { confirmed: false, reason: "payment_not_found" }; }
    if (payment.gateway_payment_id && payment.gateway_payment_id !== gatewayPaymentId) {
      await connection.rollback(); return { confirmed: false, reason: "payment_id_mismatch" };
    }
    if (payment.payment_status === "captured" || payment.payment_status === "paid") {
      await connection.commit(); return { confirmed: true, orderId: Number(payment.order_id), orderNumber: payment.order_number, alreadyConfirmed: true };
    }
    const [items] = await connection.execute<(RowDataPacket & { product_id: number; quantity: number })[]>(
      "SELECT product_id, quantity FROM order_items WHERE order_id = ? ORDER BY product_id FOR UPDATE", [payment.order_id],
    );
    if (!payment.stock_committed) {
      for (const item of items) {
        const [result] = await connection.execute<ResultSetHeader>(
          "UPDATE products SET stock_quantity = stock_quantity - ?, stock_reserved = GREATEST(0, stock_reserved - ?) WHERE id = ? AND stock_quantity >= ? AND stock_reserved >= ?",
          [item.quantity, item.quantity, item.product_id, item.quantity, item.quantity],
        );
        if (result.affectedRows !== 1) {
          await connection.rollback(); return { confirmed: false, reason: "inventory_conflict" };
        }
      }
    }
    await connection.execute("UPDATE orders SET status = 'processing', payment_status = 'paid', stock_committed = 1, reservation_expires_at = NULL WHERE id = ?", [payment.order_id]);
    await connection.execute(
      `INSERT INTO payment_attempts (payment_id, gateway_payment_id, payment_status, method)
       VALUES (?, ?, 'captured', ?) ON DUPLICATE KEY UPDATE payment_status = 'captured', method = VALUES(method), updated_at = NOW()`, [payment.id, gatewayPaymentId, gatewayMethod ?? null],
    );
    await connection.execute("UPDATE payments SET gateway_payment_id = ?, payment_method = COALESCE(?, payment_method), payment_status = 'captured', paid_at = COALESCE(paid_at, NOW()), updated_at = NOW() WHERE id = ?", [gatewayPaymentId, gatewayMethod ?? null, payment.id]);
    await connection.commit();
    changed = true;
    customerEmail = payment.payment_email;
    orderNumber = payment.order_number;
    totalAmount = String(payment.total_amount);
  } catch (error) {
    try { await connection.rollback(); } catch { /* already rolled back */ }
    throw error;
  } finally { connection.release(); }

  if (changed && customerEmail) {
    const formattedAmount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(totalAmount));
    void sendOrderEmail({ to: customerEmail, ...orderEmailText(orderNumber, "paid and confirmed", formattedAmount) });
  }
  return { confirmed: true, orderNumber };
}

export async function failPayment(gatewayOrderId: string, paymentId: string | null, code?: string | null, description?: string | null, gatewayMethod?: string) {
  const connection = await pool.getConnection();
  let failureEmail = "";
  let failureNumber = "";
  let failureAmount = "0.00";
  let notify = false;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { id: number; order_id: number; payment_status: string; email: string; order_number: string; total_amount: string })[]>(
      `SELECT p.id, p.order_id, p.payment_status, COALESCE(JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address_json, '$.email')), u.email) AS email, o.order_number, o.total_amount
       FROM payments p JOIN orders o ON o.id = p.order_id JOIN users u ON u.id = o.user_id
       WHERE p.gateway_order_id = ? LIMIT 1 FOR UPDATE`, [gatewayOrderId],
    );
    const payment = rows[0];
    if (!payment || payment.payment_status === "captured" || payment.payment_status === "paid") {
      await connection.commit(); return;
    }
    if (paymentId) await connection.execute(
      `INSERT INTO payment_attempts (payment_id, gateway_payment_id, payment_status, method, failure_code, failure_description)
       VALUES (?, ?, 'failed', ?, ?, ?) ON DUPLICATE KEY UPDATE payment_status = 'failed', method = VALUES(method), failure_code = VALUES(failure_code), failure_description = VALUES(failure_description)`,
      [payment.id, paymentId, gatewayMethod ?? null, code?.slice(0, 120) ?? null, description?.slice(0, 500) ?? null],
    );
    await connection.execute("UPDATE payments SET payment_status = 'failed', failure_code = ?, failure_description = ? WHERE id = ? AND payment_status <> 'captured'", [code?.slice(0, 120) ?? null, description?.slice(0, 500) ?? null, payment.id]);
    await connection.commit();
    notify = payment.payment_status !== "failed";
    failureEmail = payment.email;
    failureNumber = payment.order_number;
    failureAmount = payment.total_amount;
  } catch (error) {
    try { await connection.rollback(); } catch { /* already rolled back */ }
    throw error;
  } finally { connection.release(); }
  if (notify && failureEmail) {
    const formatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(failureAmount));
    void sendOrderEmail({ to: failureEmail, ...orderEmailText(failureNumber, "payment attempt failed", formatted) });
  }
}
