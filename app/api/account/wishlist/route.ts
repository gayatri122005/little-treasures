import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/auth-security";
import pool from "@/lib/db";

const productIdSchema = z.object({ productId: z.coerce.number().int().positive() });

type WishlistRow = RowDataPacket & {
  id: number | string;
  product_name: string;
  category_name: string | null;
  product_type: string | null;
  description: string | null;
  price: string | number;
  stock_quantity: number;
  stock_reserved: number;
  status: "active" | "draft" | "out_of_stock";
  is_featured: number;
  is_new_arrival: number;
  show_on_homepage: number;
  image_path: string | null;
  created_at: Date | string;
};

function imagePath(value: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return `/${value.replace(/^[.\\/]+/, "").replace(/\\/g, "/")}`;
}

function mapProduct(row: WishlistRow) {
  const stock = Math.max(0, Number(row.stock_quantity) - Number(row.stock_reserved));
  return {
    id: String(row.id), name: row.product_name, category: row.category_name,
    productType: row.product_type, description: row.description ?? "", price: Number(row.price),
    stock, status: row.status === "out_of_stock" || stock <= 0 ? "out_of_stock" : "active",
    isFeatured: Boolean(row.is_featured), isNewArrival: Boolean(row.is_new_arrival),
    showOnHomepage: Boolean(row.show_on_homepage), image: imagePath(row.image_path),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

async function readWishlist(userId: number) {
  const [rows] = await pool.execute<WishlistRow[]>(
    `SELECT p.id, p.product_name, c.category_name, p.product_type, p.description, p.price,
            p.stock_quantity, p.stock_reserved, p.status, p.is_featured, p.is_new_arrival,
            p.show_on_homepage, p.created_at,
            (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id
             ORDER BY pi.is_primary DESC, pi.id ASC LIMIT 1) AS image_path
       FROM wishlists w
       INNER JOIN products p ON p.id = w.product_id
       INNER JOIN categories c ON c.id = p.category_id AND c.status = 'active'
      WHERE w.user_id = ? AND p.status <> 'draft'
      ORDER BY w.created_at DESC, w.id DESC`,
    [userId],
  );
  return rows.map(mapProduct);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Please sign in to view your wishlist." }, { status: 401 });
  try {
    return NextResponse.json({ success: true, products: await readWishlist(user.id) });
  } catch (error) {
    console.error("Wishlist read failed:", error);
    return NextResponse.json({ success: false, message: "Your wishlist is temporarily unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return mutateWishlist(request, "add");
}

export async function DELETE(request: Request) {
  return mutateWishlist(request, "remove");
}

async function mutateWishlist(request: Request, action: "add" | "remove") {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, message: "Request origin is not allowed." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "Please sign in to use your wishlist." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = productIdSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: "A valid product is required." }, { status: 400 });
  try {
    if (action === "add") {
      const [availableProducts] = await pool.execute<RowDataPacket[]>(
        `SELECT p.id FROM products p
         INNER JOIN categories c ON c.id = p.category_id AND c.status = 'active'
         WHERE p.id = ? AND p.status <> 'draft' LIMIT 1`,
        [parsed.data.productId],
      );
      if (!availableProducts[0]) return NextResponse.json({ success: false, message: "That product is no longer available." }, { status: 404 });
      await pool.execute(
        `INSERT INTO wishlists (user_id, product_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE product_id = VALUES(product_id)`,
        [user.id, parsed.data.productId],
      );
    } else {
      await pool.execute(`DELETE FROM wishlists WHERE user_id = ? AND product_id = ?`, [user.id, parsed.data.productId]);
    }
    return NextResponse.json({ success: true, products: await readWishlist(user.id) });
  } catch (error) {
    console.error("Wishlist mutation failed:", error);
    return NextResponse.json({ success: false, message: "Your wishlist could not be updated." }, { status: 500 });
  }
}
