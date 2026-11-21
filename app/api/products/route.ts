import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
  availability: z.enum(["all", "in-stock", "out-of-stock"]).default("all"),
  featured: z.enum(["true", "false"]).optional(),
  newArrival: z.enum(["true", "false"]).optional(),
  home: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "popular", "name-asc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

type ProductRow = RowDataPacket & {
  id: number | string;
  product_name: string;
  category_name: string | null;
  description: string | null;
  price: string | number;
  stock_quantity: number;
  status: "active" | "draft" | "out_of_stock";
  is_featured: number;
  is_new_arrival: number;
  show_on_homepage: number;
  image_path: string | null;
  created_at: Date | string;
};

function normalizeImagePath(value: string | null) {
  if (!value) {
    return null;
  }

  const imagePath = value.trim();
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("/")) {
    return imagePath;
  }

  return `/${imagePath.replace(/^[.\\/]+/, "").replace(/\\/g, "/")}`;
}

function normalizeCategory(value: string) {
  return value
    .toLowerCase()
    .replace(/jewellery/g, "jewelry")
    .replace(/&/g, "and")
    .replace(/\s/g, "");
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    minPrice: searchParams.get("minPrice") ?? undefined,
    maxPrice: searchParams.get("maxPrice") ?? undefined,
    availability: searchParams.get("availability") ?? undefined,
    featured: searchParams.get("featured") ?? undefined,
    newArrival: searchParams.get("newArrival") ?? undefined,
    home: searchParams.get("home") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Invalid product query." },
      { status: 400 },
    );
  }

  const {
    q,
    category,
    minPrice,
    maxPrice,
    availability,
    featured,
    newArrival,
    home,
    sort,
    page,
    limit,
  } = parsed.data;
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return NextResponse.json(
      { success: false, message: "Minimum price cannot exceed maximum price." },
      { status: 400 },
    );
  }

  const filters = ["p.status <> 'draft'"];
  const parameters: Array<string | number> = [];

  if (q) {
    filters.push("(p.product_name LIKE ? OR p.description LIKE ? OR c.category_name LIKE ?)");
    const term = `%${q}%`;
    parameters.push(term, term, term);
  }
  if (category) {
    filters.push(
      "REPLACE(REPLACE(REPLACE(LOWER(c.category_name), 'jewellery', 'jewelry'), '&', 'and'), ' ', '') = ?",
    );
    parameters.push(normalizeCategory(category));
  }
  if (minPrice !== undefined) {
    filters.push("p.price >= ?");
    parameters.push(minPrice);
  }
  if (maxPrice !== undefined) {
    filters.push("p.price <= ?");
    parameters.push(maxPrice);
  }
  if (featured === "true") filters.push("p.is_featured = 1");
  if (newArrival === "true") {
    filters.push("(p.is_new_arrival = 1 OR p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))");
  }
  if (home === "true") filters.push("p.show_on_homepage = 1");
  if (availability === "in-stock") {
    filters.push("p.status = 'active' AND p.stock_quantity > 0");
  } else if (availability === "out-of-stock") {
    filters.push("(p.status = 'out_of_stock' OR p.stock_quantity <= 0)");
  }

  const orderBy = {
    newest: "p.created_at DESC, p.id DESC",
    "price-asc": "p.price ASC, p.id DESC",
    "price-desc": "p.price DESC, p.id DESC",
    popular: "COALESCE(s.total_sold, 0) DESC, p.created_at DESC, p.id DESC",
    "name-asc": "p.product_name ASC, p.id DESC",
  }[sort];
  const whereClause = filters.join(" AND ");
  const offset = (page - 1) * limit;

  try {
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereClause}`,
      parameters,
    );
    const [rows] = await pool.execute<ProductRow[]>(
      `SELECT p.id, p.product_name, c.category_name, p.description, p.price,
              p.stock_quantity, p.status, p.is_featured,
              CASE
                WHEN p.is_new_arrival = 1 OR p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                THEN 1 ELSE 0
              END AS is_new_arrival,
              p.show_on_homepage, p.created_at,
              (SELECT pi.image_path
               FROM product_images pi
               WHERE pi.product_id = p.id
               ORDER BY pi.is_primary DESC, pi.id ASC
               LIMIT 1) AS image_path,
              COALESCE(s.total_sold, 0) AS total_sold
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT oi.product_id, SUM(oi.quantity) AS total_sold
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE o.status <> 'cancelled'
         GROUP BY oi.product_id
       ) s ON s.product_id = p.id
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...parameters, limit, offset],
    );
    const total = Number(countRows[0]?.total ?? 0);

    return NextResponse.json({
      success: true,
      products: rows.map((row) => ({
        id: String(row.id),
        name: row.product_name,
        category: row.category_name,
        description: row.description ?? "",
        price: Number(row.price),
        stock: Number(row.stock_quantity),
        status: row.status === "out_of_stock" || Number(row.stock_quantity) <= 0
          ? "out_of_stock"
          : "active",
        isFeatured: Boolean(row.is_featured),
        isNewArrival: Boolean(row.is_new_arrival),
        showOnHomepage: Boolean(row.show_on_homepage),
        image: normalizeImagePath(row.image_path),
        createdAt: row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      })),
      pagination: {
        page,
        limit,
        total,
        pageCount: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Product catalog query failed:", error);
    return NextResponse.json(
      { success: false, message: "The product collection is temporarily unavailable." },
      { status: 500 },
    );
  }
}
