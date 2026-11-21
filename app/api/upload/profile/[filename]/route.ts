import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getCurrentUser } from "@/lib/auth";
import pool from "@/lib/db";
import {
  getProfileImageFilePath,
  getProfileImageFilename,
  PROFILE_IMAGE_UPLOAD_PREFIX,
} from "@/lib/profile-image-storage";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Authentication required.", 401);
  }

  const { filename } = await params;
  const imagePath = `${PROFILE_IMAGE_UPLOAD_PREFIX}${filename}`;
  if (!getProfileImageFilename(imagePath)) {
    return errorResponse("Profile image not found.", 404);
  }

  try {
    const [users] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE id = ? AND profile_image = ? LIMIT 1",
      [user.id, imagePath],
    );
    if (!users[0]) {
      return errorResponse("Profile image not found.", 404);
    }

    const bytes = await readFile(getProfileImageFilePath(filename));
    const extension = filename.split(".").pop()?.toLowerCase();
    const mimeType =
      extension === "jpg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : "image/webp";

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="profile.${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return errorResponse("Profile image not found.", 404);
    }
    console.error("Profile image read failed:", error);
    return errorResponse("Unable to load the profile image.", 500);
  }
}
