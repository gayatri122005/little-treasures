import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const MAX_CATEGORY_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

export function categoryMediaDirectory() {
  return path.join(process.cwd(), "storage", "category-media");
}

export async function persistCategoryImage(bytes: Uint8Array, mimeType: string, originalName: string) {
  if (!allowedTypes.has(mimeType.toLowerCase())) throw new Error("Category images must be JPG, PNG, WebP, or SVG files.");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_CATEGORY_IMAGE_BYTES) throw new Error("Category images must be 8 MB or smaller.");
  const extension = mimeType === "image/svg+xml" ? ".svg" : ".webp";
  const filename = `${randomUUID()}-${path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "") || "category"}${extension}`;
  const directory = categoryMediaDirectory();
  await mkdir(directory, { recursive: true });
  const output = path.join(directory, filename);
  if (mimeType === "image/svg+xml") await writeFile(output, bytes);
  else await sharp(bytes).rotate().resize({ width: 1600, height: 1000, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toFile(output);
  return `/api/media/categories/${encodeURIComponent(filename)}`;
}

export function categoryMediaFilename(imagePath: string | null) {
  if (!imagePath) return null;
  const match = imagePath.match(/\/api\/media\/categories\/([^/?#]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}
