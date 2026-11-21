import { redirect } from "next/navigation";
import ProductManagement from "@/components/admin/ProductManagement";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/signin?redirect=/admin/products");
  }

  return <ProductManagement />;
}
