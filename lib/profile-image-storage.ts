import path from "node:path";

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_UPLOAD_PREFIX = "/api/upload/profile/";
export const PROFILE_IMAGE_STORAGE_DIRECTORY = path.resolve(
  process.cwd(),
  "storage",
  "profile-images",
);

const filenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export function getProfileImageFilename(imagePath: string | null) {
  if (!imagePath?.startsWith(PROFILE_IMAGE_UPLOAD_PREFIX)) {
    return null;
  }

  const filename = imagePath.slice(PROFILE_IMAGE_UPLOAD_PREFIX.length);
  return filenamePattern.test(filename) ? filename : null;
}

export function getProfileImageFilePath(filename: string) {
  if (!filenamePattern.test(filename)) {
    throw new Error("Invalid generated profile image filename.");
  }

  return path.join(PROFILE_IMAGE_STORAGE_DIRECTORY, filename);
}

export function detectProfileImageType(bytes: Uint8Array) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { mimeType: "image/jpeg", extension: "jpg" } as const;
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png" } as const;
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" } as const;
  }

  return null;
}
