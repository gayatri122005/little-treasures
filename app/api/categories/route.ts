import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

type CategoryRow = RowDataPacket & { id: number|string; category_name: string; slug: string; description: string|null; image_path: string|null; status: "active"|"inactive"; created_at: Date|string; updated_at: Date|string; product_count: number|string };
function mapCategory(row: CategoryRow) { return { id: String(row.id), name: row.category_name, slug: row.slug, description: row.description ?? "", image: row.image_path, status: row.status, productCount: Number(row.product_count ?? 0), createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at), updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at) }; }

export async function GET() {
  try {
    const [rows] = await pool.execute<CategoryRow[]>(`SELECT c.id, c.category_name, c.slug, c.description, c.image_path, c.status, c.created_at, c.updated_at, COUNT(CASE WHEN p.status <> 'draft' THEN p.id END) AS product_count FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id, c.category_name, c.slug, c.description, c.image_path, c.status, c.created_at, c.updated_at ORDER BY c.category_name ASC`);
    return NextResponse.json({ success: true, categories: rows.filter((row) => row.status === "active").map(mapCategory) });
  } catch (error) { console.error("Category catalog query failed:", error); return NextResponse.json({ success: false, message: "Categories are temporarily unavailable." }, { status: 500 }); }
}
