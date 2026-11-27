import Link from "next/link";
import { redirect } from "next/navigation";
import OrdersPayments from "@/components/admin/OrdersPayments";
import LogoutButton from "@/components/auth/LogoutButton";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function AdminOrdersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/signin?redirect=/admin/orders");
  return <main className="min-h-screen bg-[var(--page)] px-3 py-5 sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto max-w-[1440px]"><header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 sm:px-6"><Link href="/admin" className="serif-display text-xl">OMTreasure · Admin</Link><div className="flex items-center gap-2"><Link href="/admin/products" className="rounded-full border border-[var(--line)] px-4 py-2.5 text-xs font-semibold">Manage products</Link><LogoutButton /></div></header><OrdersPayments /></div></main>;
}
