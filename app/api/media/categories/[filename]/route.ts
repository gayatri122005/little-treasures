import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { categoryMediaDirectory } from "@/lib/category-media-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  const safeName = path.basename(filename);
  if (safeName !== filename || !/^[a-zA-Z0-9._-]+$/.test(safeName)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(categoryMediaDirectory(), safeName));
    const type = safeName.endsWith(".svg") ? "image/svg+xml" : "image/webp";
    return new NextResponse(data, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch { return new NextResponse("Not found", { status: 404 }); }
}
