import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/auth/LogoutButton";
import Icon from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

async function getAdminStats() {
  const [customerRows] = await pool.query(
    "SELECT COUNT(*) AS total_customers FROM users WHERE role = 'customer'",
  );
  const [productRows] = await pool.query(
    "SELECT COUNT(*) AS total_products FROM products",
  );
  const [orderRows] = await pool.query(
    "SELECT COUNT(*) AS total_orders FROM orders",
  );
  const [revenueRows] = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM payments WHERE payment_status = 'paid'",
  );
  const [recentOrders] = await pool.query(
    "SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at, u.full_name AS customer_name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 5",
  );
  const [latestCustomers] = await pool.query(
    "SELECT id, full_name, email, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC LIMIT 5",
  );
  const [lowStock] = await pool.query(
    "SELECT id, product_name, stock_quantity FROM products WHERE status <> 'draft' AND stock_quantity <= 10 ORDER BY stock_quantity ASC, product_name ASC LIMIT 5",
  );
  const [lowStockCountRows] = await pool.query(
    "SELECT COUNT(*) AS total_low_stock FROM products WHERE status <> 'draft' AND stock_quantity <= 10",
  );

  return {
    totalCustomers: Number((customerRows as Array<{ total_customers?: number }>)[0]?.total_customers ?? 0),
    totalProducts: Number((productRows as Array<{ total_products?: number }>)[0]?.total_products ?? 0),
    totalOrders: Number((orderRows as Array<{ total_orders?: number }>)[0]?.total_orders ?? 0),
    totalRevenue: Number((revenueRows as Array<{ total_revenue?: number }>)[0]?.total_revenue ?? 0),
    lowStockCount: Number((lowStockCountRows as Array<{ total_low_stock?: number }>)[0]?.total_low_stock ?? 0),
    recentOrders: Array.isArray(recentOrders) ? recentOrders : [],
    latestCustomers: Array.isArray(latestCustomers) ? latestCustomers : [],
    lowStockProducts: Array.isArray(lowStock) ? lowStock : [],
  };
}

function formatPrice(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/signin?redirect=/admin");
  }

  const stats = await getAdminStats();
  const recentOrders = (stats.recentOrders as Array<Record<string, unknown>>) ?? [];
  const latestCustomers = (stats.latestCustomers as Array<Record<string, unknown>>) ?? [];
  const lowStockProducts = (stats.lowStockProducts as Array<Record<string, unknown>>) ?? [];
  const metrics = [
    { label: "Customers", value: stats.totalCustomers, detail: "Registered accounts" },
    { label: "Products", value: stats.totalProducts, detail: "In the catalog" },
    { label: "Orders", value: stats.totalOrders, detail: "All-time orders" },
    { label: "Paid revenue", value: formatPrice(stats.totalRevenue), detail: "Confirmed payments" },
    { label: "Low stock", value: stats.lowStockCount, detail: "10 units or fewer" },
  ];

  return (
    <main className="min-h-screen bg-[#FAF7F2] px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E3D8C9] bg-[#FFFFFF] px-4 py-3 sm:px-6">
          <Link href="/admin#overview" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#1E1B18] text-[#F1EBE1]">
              <Icon name="sparkle" className="size-5" />
            </span>
            <span>
              <span className="serif-display block text-xl leading-none text-[#1E1B18]">
                all the good things
              </span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.15em] text-[#6E655F]">
                Admin workspace
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#B85042] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#9A3F33]"
            >
              MANAGE PRODUCTS
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#E3D8C9] px-4 text-xs font-semibold text-[#1E1B18] transition-colors hover:border-[#1E1B18] hover:text-[#1E1B18]"
            >
              VIEW STOREFRONT
            </Link>
            <LogoutButton />
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#E3D8C9] bg-[#FFFFFF] p-4 lg:sticky lg:top-6">
            <p className="px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#6E655F]">
              Workspace
            </p>
            <nav aria-label="Admin dashboard sections" className="flex gap-2 overflow-x-auto lg:grid">
              {[
                ["Overview", "overview"],
                ["Recent orders", "recent-orders"],
                ["Customers", "customers"],
                ["Inventory", "inventory"],
              ].map(([label, id], index) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`flex min-h-10 shrink-0 items-center gap-3 rounded-xl px-3 text-xs font-medium transition-colors ${
                    index === 0
                      ? "bg-[#B85042] text-white"
                      : "text-[#6E655F] hover:bg-[#FFFFFF] hover:text-[#1E1B18]"
                  }`}
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-white/70 text-[9px] text-[#6E655F]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-5 hidden rounded-xl bg-[#1E1B18] p-4 text-white lg:block">
              <Icon name="sparkle" className="size-5 text-[#F1EBE1]" />
              <p className="mt-3 text-xs font-medium">A little more lovely, every day.</p>
              <p className="mt-1 text-[10px] leading-5 text-white/65">
                Your store activity at a glance.
              </p>
            </div>
          </aside>

          <div className="min-w-0">
            <section
              id="overview"
              className="scroll-mt-6 overflow-hidden rounded-2xl bg-[#1E1B18] px-5 py-7 text-white sm:px-8 sm:py-9"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#F1EBE1]">
                Administration · Overview
              </p>
              <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h1 className="serif-display text-4xl sm:text-5xl">
                    Good to see you, {user.full_name.split(" ")[0] || "there"}.
                  </h1>
                  <p className="mt-2 text-sm text-white/70">
                    A clear view of what&apos;s happening across your store.
                  </p>
                </div>
                <span className="inline-flex min-h-9 w-fit items-center gap-2 rounded-full bg-white/10 px-4 text-[10px] font-medium tracking-[0.08em] text-white/85">
                  <span className="size-1.5 rounded-full bg-[#B85042]" />
                  LIVE STORE DATA
                </span>
              </div>
            </section>

            <section
              aria-label="Store statistics"
              className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
            >
              {metrics.map((metric, index) => (
                <article
                  key={metric.label}
                  className={`rounded-2xl border border-[#E3D8C9] p-4 sm:p-5 ${
                    index === 3 ? "bg-[#F1EBE1]" : "bg-[#FFFFFF]"
                  }`}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6E655F]">
                    {metric.label}
                  </p>
                  <p className="serif-display mt-3 break-words text-2xl text-[#1E1B18] sm:text-3xl">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-[#6E655F]">
                    {metric.detail}
                  </p>
                </article>
              ))}
            </section>

            <section
              id="recent-orders"
              className="mt-4 scroll-mt-6 rounded-2xl border border-[#E3D8C9] bg-[#FFFFFF] p-4 sm:p-6"
            >
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="eyebrow">The latest activity</p>
                  <h2 className="serif-display mt-1 text-3xl text-[#1E1B18]">
                    Recent orders
                  </h2>
                </div>
                <span className="text-[10px] text-[#6E655F]">Latest 5 orders</span>
              </div>
              {recentOrders.length === 0 ? (
                <p className="rounded-xl bg-[#FFFFFF] px-4 py-8 text-center text-sm text-[#6E655F]">
                  No recent orders yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[670px] w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E3D8C9] text-[9px] uppercase tracking-[0.12em] text-[#6E655F]">
                        <th className="px-3 py-3 font-semibold">Order</th>
                        <th className="px-3 py-3 font-semibold">Customer</th>
                        <th className="px-3 py-3 font-semibold">Date</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr
                          key={String(order.id)}
                          className="border-b border-[#F1EBE1] last:border-0"
                        >
                          <td className="px-3 py-3 font-medium text-[#1E1B18]">
                            {String(order.order_number ?? "N/A")}
                          </td>
                          <td className="px-3 py-3 text-[#6E655F]">
                            {String(order.customer_name ?? "Customer")}
                          </td>
                          <td className="px-3 py-3 text-[#6E655F]">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex rounded-full bg-[#B85042] px-3 py-1 text-[10px] font-medium capitalize text-[#1E1B18]">
                              {String(order.status ?? "pending")}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-[#1E1B18]">
                            {formatPrice(order.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <section
                id="customers"
                className="scroll-mt-6 rounded-2xl border border-[#E3D8C9] bg-[#FFFFFF] p-4 sm:p-6"
              >
                <div className="mb-4">
                  <p className="eyebrow">Growing community</p>
                  <h2 className="serif-display mt-1 text-3xl text-[#1E1B18]">
                    Latest customers
                  </h2>
                </div>
                {latestCustomers.length === 0 ? (
                  <p className="rounded-xl bg-[#FFFFFF] px-4 py-7 text-sm text-[#6E655F]">
                    No registered customers yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#F1EBE1]">
                    {latestCustomers.map((customer) => (
                      <li
                        key={String(customer.id)}
                        className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#B85042] text-xs font-medium text-[#1E1B18]">
                          {String(customer.full_name ?? "C")
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0] ?? "")
                            .join("")
                            .toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[#1E1B18]">
                            {String(customer.full_name ?? "Customer")}
                          </span>
                          <span className="block truncate text-xs text-[#6E655F]">
                            {String(customer.email ?? "")}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-[10px] text-[#6E655F] sm:block">
                          {formatDate(customer.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                id="inventory"
                className="scroll-mt-6 rounded-2xl border border-[#E3D8C9] bg-[#FFFFFF] p-4 sm:p-6"
              >
                <div className="mb-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="eyebrow">Needs a little attention</p>
                    <h2 className="serif-display mt-1 text-3xl text-[#1E1B18]">
                      Low stock
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#F1EBE1] px-3 py-1 text-[10px] font-semibold text-[#6E655F]">
                    {stats.lowStockCount} items
                  </span>
                </div>
                {lowStockProducts.length === 0 ? (
                  <p className="rounded-xl bg-[#FFFFFF] px-4 py-7 text-sm text-[#6E655F]">
                    Nothing is running low right now.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#F1EBE1]">
                    {lowStockProducts.map((product) => (
                      <li
                        key={String(product.id)}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-[#1E1B18]">
                          {String(product.product_name ?? "Product")}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${
                            Number(product.stock_quantity ?? 0) <= 3
                              ? "bg-[#f7e9e6] text-[#9b5545]"
                              : "bg-[#F1EBE1] text-[#6E655F]"
                          }`}
                        >
                          {Number(product.stock_quantity ?? 0)} left
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {stats.lowStockCount > lowStockProducts.length && (
                  <p className="mt-4 text-[10px] text-[#6E655F]">
                    Showing the 5 lowest-stock products.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
