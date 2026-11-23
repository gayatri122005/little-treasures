import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";

import LogoutButton from "@/components/auth/LogoutButton";
import CustomerAddressBook from "@/components/customer/CustomerAddressBook";
import CustomerPasswordForm from "@/components/customer/CustomerPasswordForm";
import CustomerProfileForm from "@/components/customer/CustomerProfileForm";
import { savedAddressColumns, serializeSavedAddress, type SavedAddress } from "@/lib/addresses";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

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

type CustomerProfileRow = RowDataPacket & {
  full_name: string;
  email: string;
  mobile: string | null;
  profile_image: string | null;
};

async function getDashboardData(userId: number) {
  const [[profiles], [orders], [addresses]] = await Promise.all([
    pool.execute<CustomerProfileRow[]>(
      "SELECT full_name, email, mobile, profile_image FROM users WHERE id = ? AND role = 'customer' LIMIT 1",
      [userId],
    ),
    pool.execute<RowDataPacket[]>(
      "SELECT id, order_number, status, order_type, payment_status, total_amount, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
      [userId],
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT ${savedAddressColumns} FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC, id DESC`,
      [userId],
    ),
  ]);

  return {
    profile: profiles[0] ?? null,
    orders,
    addresses: addresses.map((address) => serializeSavedAddress(address)),
  };
}

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "customer") {
    redirect("/signin?redirect=/customer-dashboard");
  }

  const data = await getDashboardData(user.id);
  if (!data.profile) {
    redirect("/signin?redirect=/customer-dashboard");
  }
  const orders = data.orders as Array<Record<string, unknown>>;
  const addresses = data.addresses as SavedAddress[];

  return (
    <main className="min-h-screen bg-[#FAF7F2] px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-[#1E1B18] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
          <div>
            <p className="eyebrow eyebrow-on-dark">Your Little Treasures account</p>
            <h1 className="serif-display mt-2 text-4xl text-white sm:text-5xl">
              Welcome back, {data.profile.full_name.split(" ")[0] || "friend"}.
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#B85042] px-5 text-xs font-semibold tracking-[0.08em] text-white transition-colors hover:brightness-95"
            >
              BACK TO SHOP
            </Link>
            <LogoutButton />
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <a
            href="#profile-settings"
            className="group rounded-2xl border border-[#E3D8C9] bg-[#FAF7F2] p-5 transition-shadow hover:shadow-md sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#B85042] text-sm font-medium text-white">
                {data.profile.profile_image ? (
                  <Image
                    src={data.profile.profile_image}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="size-full object-cover"
                  />
                ) : (
                  data.profile.full_name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0] ?? "")
                    .join("")
                    .toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E655F]">
                  Your profile
                </p>
                <h2 className="mt-1 truncate text-sm font-semibold text-[#1E1B18]">
                  {data.profile.full_name || "Your details"}
                </h2>
              </div>
            </div>
            <p className="mt-4 truncate text-sm text-[#6E655F]">{data.profile.email}</p>
            <p className="mt-1 text-xs text-[#6E655F]">
              {data.profile.mobile || "Add a mobile number"}
            </p>
          </a>
          <a
            href="#recent-orders"
            className="rounded-2xl border border-[#E3D8C9] bg-[#FAF7F2] p-5 transition-shadow hover:shadow-md sm:p-6"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E655F]">
              Recent orders
            </p>
            <p className="serif-display mt-3 text-4xl text-[#1E1B18]">{data.orders.length}</p>
            <p className="mt-2 text-sm text-[#6E655F]">Your latest purchases</p>
          </a>
          <a
            href="#saved-addresses"
            className="rounded-2xl border border-[#E3D8C9] bg-[#FAF7F2] p-5 transition-shadow hover:shadow-md sm:p-6"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E655F]">
              Saved addresses
            </p>
            <p className="serif-display mt-3 text-4xl text-[#1E1B18]">{addresses.length}</p>
            <p className="mt-2 text-sm text-[#6E655F]">Ready for your next order</p>
          </a>
        </section>

        <nav
          aria-label="Account sections"
          className="mt-6 flex gap-2 overflow-x-auto rounded-full border border-[#E3D8C9] bg-[#FAF7F2] p-2"
        >
          {[
            ["Profile", "profile-settings"],
            ["Addresses", "saved-addresses"],
            ["Security", "account-security"],
            ["Orders", "recent-orders"],
          ].map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              className="min-h-9 shrink-0 rounded-full px-4 py-2 text-xs font-medium text-[#6E655F] transition-colors hover:bg-[#B85042] hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <section id="profile-settings" className="mt-5 scroll-mt-24">
          <CustomerProfileForm
            initialProfile={{
              full_name: data.profile.full_name,
              email: data.profile.email,
              mobile: data.profile.mobile,
              profile_image: data.profile.profile_image,
            }}
          />
        </section>

        <section id="account-security" className="mt-5 scroll-mt-24">
          <CustomerPasswordForm />
        </section>

        <section id="saved-addresses" className="mt-5 scroll-mt-24">
          <CustomerAddressBook initialAddresses={addresses} />
        </section>

        <section
          id="recent-orders"
          className="mt-5 scroll-mt-24 rounded-2xl border border-[#E3D8C9] bg-[#FAF7F2] p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Your purchases</p>
              <h2 className="serif-display mt-1 text-3xl text-[#1E1B18]">Recent orders</h2>
            </div>
            <span className="text-xs text-[#6E655F]">Latest account activity</span>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-[#6E655F]">No orders have been placed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[620px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E3D8C9] text-[10px] uppercase tracking-[0.1em] text-[#6E655F]">
                    <th className="px-2 py-3 font-semibold">Order</th>
                    <th className="px-2 py-3 font-semibold">Status</th>
                    <th className="px-2 py-3 font-semibold">Payment</th>
                    <th className="px-2 py-3 font-semibold">Amount</th>
                    <th className="px-2 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={String(order.id)} className="border-b border-[#F1EBE1] last:border-0">
                      <td className="px-2 py-3 font-medium text-[#1E1B18]">{String(order.order_number ?? "N/A")}</td>
                      <td className="px-2 py-3 capitalize text-[#6E655F]">{String(order.status ?? "pending")}</td>
                      <td className="px-2 py-3 capitalize text-[#6E655F]">{String(order.payment_status ?? "pending").replaceAll("_", " ")}</td>
                      <td className="px-2 py-3 font-medium text-[#1E1B18]">{formatPrice(order.total_amount)}</td>
                      <td className="px-2 py-3 text-[#6E655F]">{formatDate(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
