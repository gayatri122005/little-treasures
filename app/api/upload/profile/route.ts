import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import {
  detectProfileImageType,
  getProfileImageFilePath,
  getProfileImageFilename,
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_STORAGE_DIRECTORY,
  PROFILE_IMAGE_UPLOAD_PREFIX,
} from "@/lib/profile-image-storage";

export const runtime = "nodejs";

type ProfileImageRow = RowDataPacket & {
  profile_image: string | null;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Authentication required.", 401);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return errorResponse("Upload an image using a multipart form.", 415);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_PROFILE_IMAGE_BYTES + 64 * 1024
  ) {
    return errorResponse("Profile images must be 5 MB or smaller.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("The image upload could not be read.", 400);
  }

  const uploads = formData.getAll("image");
  if (uploads.length !== 1 || !(uploads[0] instanceof File)) {
    return errorResponse("Choose one profile image to upload.", 400);
  }

  const upload = uploads[0];
  if (upload.size === 0) {
    return errorResponse("The selected image is empty.", 400);
  }
  if (upload.size > MAX_PROFILE_IMAGE_BYTES) {
    return errorResponse("Profile images must be 5 MB or smaller.", 413);
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await upload.arrayBuffer());
  } catch {
    return errorResponse("The selected image could not be read.", 400);
  }
  const detectedType = detectProfileImageType(bytes);
  if (!detectedType || upload.type !== detectedType.mimeType) {
    return errorResponse(
      "Use a valid JPG, PNG, or WebP image file.",
      400,
    );
  }

  const filename = `${randomUUID()}.${detectedType.extension}`;
  const filePath = getProfileImageFilePath(filename);
  const imagePath = `${PROFILE_IMAGE_UPLOAD_PREFIX}${filename}`;
  let fileCreated = false;

  try {
    await mkdir(PROFILE_IMAGE_STORAGE_DIRECTORY, { recursive: true });
    await writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
    fileCreated = true;

    const [users] = await pool.execute<ProfileImageRow[]>(
      "SELECT profile_image FROM users WHERE id = ? LIMIT 1",
      [user.id],
    );
    if (!users[0]) {
      await unlink(filePath);
      return errorResponse("User not found.", 404);
    }

    await pool.execute(
      "UPDATE users SET profile_image = ?, updated_at = NOW() WHERE id = ?",
      [imagePath, user.id],
    );

    const previousFilename = getProfileImageFilename(
      users[0].profile_image,
    );
    let cleanupWarning = false;
    if (previousFilename && previousFilename !== filename) {
      try {
        await unlink(getProfileImageFilePath(previousFilename));
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
          cleanupWarning = true;
          console.error("Previous profile image cleanup failed:", error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      profileImage: imagePath,
      message: cleanupWarning
        ? "Profile image updated, but the previous file could not be removed."
        : "Profile image updated.",
      cleanupWarning,
    });
  } catch (error) {
    if (fileCreated) {
      try {
        await unlink(filePath);
      } catch (cleanupError) {
        console.error("New profile image cleanup failed:", cleanupError);
      }
    }
    console.error("Profile image upload failed:", error);
    return errorResponse("Unable to update the profile image.", 500);
  }
}

