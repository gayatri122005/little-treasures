import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import CategoryManagement from "@/components/admin/CategoryManagement";

export const dynamic = "force-dynamic";
export default async function AdminCategoriesPage() { const user=await getCurrentUser(); if(!user||user.role!=="admin")redirect("/signin?redirect=/admin/categories"); return <CategoryManagement/>; }
