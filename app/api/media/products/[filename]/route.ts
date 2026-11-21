import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { requireAdmin } from "@/lib/auth";
import pool from "@/lib/db";
import {
  getProductMediaFilePath,
  getProductMediaFilename,
  PRODUCT_MEDIA_PREFIX,
} from "@/lib/product-media-storage";

export const runtime = "nodejs";

function notFound() {
  return NextResponse.json(
    { success: false, message: "Product media not found." },
    { status: 404 },
  );
}

function mediaHeaders(mimeType: string, size: number, filename: string) {
  return {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Content-Type": mimeType,
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Length": String(size),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const mediaPath = `${PRODUCT_MEDIA_PREFIX}${filename}`;
  if (!getProductMediaFilename(mediaPath)) {
    return notFound();
  }

  try {
    const admin = await requireAdmin();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.status
       FROM product_images i
       INNER JOIN products p ON p.id = i.product_id
       WHERE i.image_path = ?
       UNION ALL
       SELECT p.status
       FROM product_videos v
       INNER JOIN products p ON p.id = v.product_id
       WHERE v.video_path = ? OR v.thumbnail_path = ?
       LIMIT 1`,
      [mediaPath, mediaPath, mediaPath],
    );
    if (!rows[0] || (!admin && rows[0].status === "draft")) {
      return notFound();
    }

    const filePath = getProductMediaFilePath(filename);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return notFound();
    }

    const extension = filename.split(".").pop()?.toLowerCase();
    const mimeType =
      extension === "webp"
        ? "image/webp"
        : extension === "mp4"
          ? "video/mp4"
          : "video/webm";
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileStat.size}` },
        });
      }

      const suffixLength = match[1] ? null : Number(match[2]);
      const start = match[1]
        ? Number(match[1])
        : Math.max(0, fileStat.size - (suffixLength ?? 0));
      const end = match[2] && match[1]
        ? Math.min(Number(match[2]), fileStat.size - 1)
        : fileStat.size - 1;
      if (start >= fileStat.size || end < start || !Number.isSafeInteger(start + end)) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileStat.size}` },
        });
      }

      const length = end - start + 1;
      const stream = createReadStream(filePath, { start, end });
      const body = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
      return new Response(body, {
        status: 206,
        headers: {
          ...mediaHeaders(mimeType, length, filename),
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
        },
      });
    }

    if (mimeType.startsWith("image/")) {
      const bytes = await readFile(filePath);
      return new Response(new Uint8Array(bytes), {
        headers: mediaHeaders(mimeType, bytes.byteLength, filename),
      });
    }

    const stream = createReadStream(filePath);
    const body = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    return new Response(body, {
      headers: mediaHeaders(mimeType, fileStat.size, filename),
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return notFound();
    }
    console.error("Product media read failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load this product media." },
      { status: 500 },
    );
  }
}
