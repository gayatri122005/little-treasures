import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

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
  created_at: Date | string;
};

type ProductImageRow = RowDataPacket & {
  image_path: string;
};

type ProductVideoRow = RowDataPacket & {
  video_path: string;
  thumbnail_path: string | null;
};

function normalizeImagePath(value: string) {
  const imagePath = value.trim();
  if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith("/")) {
    return imagePath;
  }

  return `/${imagePath.replace(/^[.\\/]+/, "").replace(/\\/g, "/")}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { success: false, message: "Product not found." },
      { status: 404 },
    );
  }

  try {
    const [rows] = await pool.execute<ProductRow[]>(
      `SELECT p.id, p.product_name, c.category_name, p.description, p.price,
              p.stock_quantity, p.status, p.is_featured,
              CASE
                WHEN p.is_new_arrival = 1 OR p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                THEN 1 ELSE 0
              END AS is_new_arrival,
              p.show_on_homepage, p.created_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? AND p.status <> 'draft'
       LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 },
      );
    }

    const [imageRows] = await pool.execute<ProductImageRow[]>(
      `SELECT image_path
       FROM product_images
       WHERE product_id = ?
       ORDER BY is_primary DESC, id ASC`,
      [id],
    );
    const images = imageRows.map((image) =>
      normalizeImagePath(image.image_path),
    );
    const [videoRows] = await pool.execute<ProductVideoRow[]>(
      `SELECT video_path, thumbnail_path
       FROM product_videos
       WHERE product_id = ?
       ORDER BY id ASC`,
      [id],
    );
    const videos = videoRows.map((video) => ({
      src: normalizeImagePath(video.video_path),
      thumbnail: video.thumbnail_path
        ? normalizeImagePath(video.thumbnail_path)
        : null,
    }));

    return NextResponse.json({
      success: true,
      product: {
        id: String(row.id),
        name: row.product_name,
        category: row.category_name,
        description: row.description ?? "",
        price: Number(row.price),
        stock: Number(row.stock_quantity),
        status:
          row.status === "out_of_stock" || Number(row.stock_quantity) <= 0
            ? "out_of_stock"
            : "active",
        isFeatured: Boolean(row.is_featured),
        isNewArrival: Boolean(row.is_new_arrival),
        showOnHomepage: Boolean(row.show_on_homepage),
        image: images[0] ?? null,
        images,
        videos,
        createdAt:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : String(row.created_at),
      },
    });
  } catch (error) {
    console.error("Product detail query failed:", error);
    return NextResponse.json(
      { success: false, message: "The product is temporarily unavailable." },
      { status: 500 },
    );
  }
}
