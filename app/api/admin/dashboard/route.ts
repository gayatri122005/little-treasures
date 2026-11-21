import { NextResponse } from "next/server";

import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Admin access is required.",
      },
      { status: 403 },
    );
  }

  try {
    const [customerRows] = await pool.query(
      "SELECT COUNT(*) AS total_customers FROM users WHERE role = 'customer'",
    );
    const [productRows] = await pool.query(
      "SELECT COUNT(*) AS total_products FROM products",
    );
    const [orderRows] = await pool.query(
      "SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders",
    );
    const [recentOrders] = await pool.query(
      "SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at, u.full_name AS customer_name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 5",
    );
    const [latestCustomers] = await pool.query(
      "SELECT id, full_name, email, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC LIMIT 5",
    );
    const [lowStock] = await pool.query(
      "SELECT id, product_name, stock_quantity FROM products WHERE stock_quantity <= 10 ORDER BY stock_quantity ASC LIMIT 5",
    );

    const stats = {
      totalCustomers: Number((customerRows as Array<{ total_customers?: number }>)[0]?.total_customers ?? 0),
      totalProducts: Number((productRows as Array<{ total_products?: number }>)[0]?.total_products ?? 0),
      totalOrders: Number((orderRows as Array<{ total_orders?: number }>)[0]?.total_orders ?? 0),
      totalRevenue: Number((orderRows as Array<{ total_revenue?: number }>)[0]?.total_revenue ?? 0),
      recentOrders: Array.isArray(recentOrders) ? recentOrders : [],
      latestCustomers: Array.isArray(latestCustomers) ? latestCustomers : [],
      lowStockProducts: Array.isArray(lowStock) ? lowStock : [],
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Admin dashboard failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load the dashboard right now.",
      },
      { status: 500 },
    );
  }
}
