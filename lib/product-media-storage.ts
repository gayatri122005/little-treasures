import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";
import {
  detectProfileImageType,
} from "@/lib/profile-image-storage";

export const PRODUCT_MEDIA_PREFIX = "/api/media/products/";
export const PRODUCT_MEDIA_DIRECTORY = path.resolve(
  process.cwd(),
  "storage",
  "product-media",
);
export const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_PRODUCT_VIDEO_BYTES = 40 * 1024 * 1024;
export const MAX_PRODUCT_UPLOAD_BYTES = 145 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 8;
export const MAX_PRODUCT_VIDEOS = 2;

export type ImageFit = "cover" | "contain";
export type ImagePosition =
  | "centre"
  | "north"
  | "south"
  | "east"
  | "west"
  | "north east"
  | "north west"
  | "south east"
  | "south west";

const filenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|mp4|webm)$/i;

const positionCoordinates: Record<ImagePosition, [number, number]> = {
  centre: [50, 50],
  north: [50, 0],
  south: [50, 100],
  east: [100, 50],
  west: [0, 50],
  "north east": [100, 0],
  "north west": [0, 0],
  "south east": [100, 100],
  "south west": [0, 100],
};

const sharpPositions: Record<ImagePosition, keyof typeof sharp.gravity> = {
  centre: "centre",
  north: "north",
  south: "south",
  east: "east",
  west: "west",
  "north east": "northeast",
  "north west": "northwest",
  "south east": "southeast",
  "south west": "southwest",
};

export function getProductMediaFilename(mediaPath: string | null) {
  if (!mediaPath?.startsWith(PRODUCT_MEDIA_PREFIX)) {
    return null;
  }

  const filename = mediaPath.slice(PRODUCT_MEDIA_PREFIX.length);
  return filenamePattern.test(filename) ? filename : null;
}

export function getProductMediaFilePath(filename: string) {
  if (!filenamePattern.test(filename)) {
    throw new Error("Invalid generated product media filename.");
  }

  return path.join(PRODUCT_MEDIA_DIRECTORY, filename);
}

export async function persistProductImage(
  bytes: Uint8Array,
  declaredMimeType: string,
  originalName: string,
  dimensions: { width: number | null; height: number | null },
  fit: ImageFit,
  position: ImagePosition,
) {
  const detectedType = detectProfileImageType(bytes);
  const extension = originalName.split(".").pop()?.toLowerCase();
  const expectedExtension =
    detectedType?.mimeType === "image/jpeg"
      ? ["jpg", "jpeg"]
      : detectedType?.mimeType === "image/png"
        ? ["png"]
        : detectedType?.mimeType === "image/webp"
          ? ["webp"]
          : [];

  if (
    !detectedType ||
    declaredMimeType !== detectedType.mimeType ||
    !extension ||
    !expectedExtension.includes(extension)
  ) {
    throw new Error("Use a valid JPG, JPEG, PNG, or WebP image file.");
  }

  const source = sharp(bytes, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  }).rotate();
  const metadata = await source.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("The selected image has invalid dimensions.");
  }

  const transformer =
    dimensions.width !== null && dimensions.height !== null
      ? source.resize({
          width: dimensions.width,
          height: dimensions.height,
          fit,
          position: sharpPositions[position],
          background: { r: 255, g: 255, b: 255, alpha: 0 },
          withoutEnlargement: true,
        })
      : source.resize({
          width: 2000,
          height: 2000,
          fit: "inside",
          withoutEnlargement: true,
        });
  const { data, info } = await transformer
    .webp({ quality: 88, effort: 5 })
    .toBuffer({ resolveWithObject: true });

  const filename = `${randomUUID()}.webp`;
  await mkdir(PRODUCT_MEDIA_DIRECTORY, { recursive: true });
  await writeFile(getProductMediaFilePath(filename), data, {
    flag: "wx",
    mode: 0o600,
  });

  return {
    filename,
    path: `${PRODUCT_MEDIA_PREFIX}${filename}`,
    mimeType: "image/webp",
    fileSize: data.byteLength,
    width: info.width,
    height: info.height,
    aspectRatio: Number((info.width / info.height).toFixed(6)),
    positionX: positionCoordinates[position][0],
    positionY: positionCoordinates[position][1],
    fit,
  };
}

export async function persistProductVideo(
  bytes: Uint8Array,
  declaredMimeType: string,
  originalName: string,
) {
  const extension = originalName.split(".").pop()?.toLowerCase();
  const isMp4 =
    extension === "mp4" &&
    declaredMimeType === "video/mp4" &&
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  const isWebm =
    extension === "webm" &&
    declaredMimeType === "video/webm" &&
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3;

  if (!isMp4 && !isWebm) {
    throw new Error("Use a valid MP4 or WebM video file.");
  }

  const mimeType = isMp4 ? "video/mp4" : "video/webm";
  const filename = `${randomUUID()}.${isMp4 ? "mp4" : "webm"}`;
  await mkdir(PRODUCT_MEDIA_DIRECTORY, { recursive: true });
  await writeFile(getProductMediaFilePath(filename), bytes, {
    flag: "wx",
    mode: 0o600,
  });

  return {
    filename,
    path: `${PRODUCT_MEDIA_PREFIX}${filename}`,
    mimeType,
    fileSize: bytes.byteLength,
  };
}

export async function removeProductMediaFiles(filenames: string[]) {
  let failed = false;
  for (const filename of new Set(filenames)) {
    try {
      await unlink(getProductMediaFilePath(filename));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        continue;
      }
      failed = true;
      console.error("Product media cleanup failed:", error);
    }
  }
  return failed;
}
