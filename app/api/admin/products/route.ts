import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import pool from "@/lib/db";
import {
  getProductMediaFilename,
  getProductMediaFilePath,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_UPLOAD_BYTES,
  MAX_PRODUCT_VIDEOS,
  MAX_PRODUCT_VIDEO_BYTES,
  persistProductImage,
  persistProductVideo,
  removeProductMediaFiles,
  type ImageFit,
} from "@/lib/product-media-storage";

export const runtime = "nodejs";

const positionSchema = z.enum([
  "centre",
  "north",
  "south",
  "east",
  "west",
  "north east",
  "north west",
  "south east",
  "south west",
]);
const imageSettingsSchema = z
  .object({
    primary: z.boolean(),
    width: z.number().int().min(100).max(3000).nullable(),
    height: z.number().int().min(100).max(3000).nullable(),
    fit: z.enum(["cover", "contain"]),
    position: positionSchema,
  })
  .refine((image) => (image.width === null) === (image.height === null), {
    message: "Image width and height must be set together.",
  });
const imageDescriptorSchema = z.union([
  imageSettingsSchema.extend({
    id: z.string().regex(/^\d+$/),
  }),
  imageSettingsSchema.extend({
    uploadIndex: z.number().int().min(0).max(MAX_PRODUCT_IMAGES - 1),
  }),
]);
const videoDescriptorSchema = z.union([
  z.object({
    id: z.string().regex(/^\d+$/),
    thumbnailImageIndex: z.number().int().min(0).max(MAX_PRODUCT_IMAGES - 1).nullable(),
  }),
  z.object({
    uploadIndex: z.number().int().min(0).max(MAX_PRODUCT_VIDEOS - 1),
    thumbnailImageIndex: z.number().int().min(0).max(MAX_PRODUCT_IMAGES - 1).nullable(),
  }),
]);
const productSchema = z.object({
  id: z.string().regex(/^\d+$/).optional(),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(120),
  productType: z.string().trim().min(1).max(80),
  description: z.string().trim().max(10000),
  price: z.number().finite().min(0).max(99999999.99),
  stock: z.number().int().min(0).max(10000000),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  showOnHomepage: z.boolean(),
  images: z.array(imageDescriptorSchema).max(MAX_PRODUCT_IMAGES),
  videos: z.array(videoDescriptorSchema).max(MAX_PRODUCT_VIDEOS),
}).superRefine((product, context) => {
  const primaryCount = product.images.filter((image) => image.primary).length;
  if (product.images.length > 0 && primaryCount !== 1) {
    context.addIssue({
      code: "custom",
      message: "Choose exactly one primary product image.",
      path: ["images"],
    });
  }
  const imageIds = product.images.flatMap((image) =>
    "id" in image ? [image.id] : [],
  );
  const videoIds = product.videos.flatMap((video) =>
    "id" in video ? [video.id] : [],
  );
  if (new Set(imageIds).size !== imageIds.length) {
    context.addIssue({
      code: "custom",
      message: "A product image cannot be listed more than once.",
      path: ["images"],
    });
  }
  if (new Set(videoIds).size !== videoIds.length) {
    context.addIssue({
      code: "custom",
      message: "A product video cannot be listed more than once.",
      path: ["videos"],
    });
  }
});

type ProductInput = z.infer<typeof productSchema>;
type ImageDescriptor = ProductInput["images"][number];
type VideoDescriptor = ProductInput["videos"][number];

type ImageRow = RowDataPacket & {
  id: number | string;
  product_id?: number | string;
  image_path: string;
  is_primary: number;
  mime_type: string;
  file_size: number | string;
  width: number | null;
  height: number | null;
  aspect_ratio: number | string | null;
  fit: ImageFit;
  position_x: number | string;
  position_y: number | string;
};

type VideoRow = RowDataPacket & {
  id: number | string;
  product_id?: number | string;
  video_path: string;
  thumbnail_path: string | null;
  mime_type: string;
  file_size: number | string;
};

type ProductRow = RowDataPacket & {
  id: number | string;
  product_name: string;
  category_name: string | null;
  product_type: string | null;
  description: string | null;
  price: number | string;
  stock_quantity: number;
  status: "active" | "draft" | "out_of_stock";
  is_featured: number;
  is_new_arrival: number;
  show_on_homepage: number;
  created_at: Date | string;
  updated_at: Date | string;
};

class ProductRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (
    (!origin || origin === new URL(request.url).origin) &&
    fetchSite !== "cross-site"
  );
}

async function getAdmin() {
  const user = await requireAdmin();
  return user;
}

function getImageFile(files: FormDataEntryValue[], index: number) {
  const file = files[index];
  if (!(file instanceof File)) {
    throw new ProductRequestError("An uploaded product image is missing.", 400);
  }
  if (file.size === 0) {
    throw new ProductRequestError("An uploaded product image is empty.", 400);
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new ProductRequestError("Product images must be 8 MB or smaller.", 413);
  }
  return file;
}

function getVideoFile(files: FormDataEntryValue[], index: number) {
  const file = files[index];
  if (!(file instanceof File)) {
    throw new ProductRequestError("An uploaded product video is missing.", 400);
  }
  if (file.size === 0) {
    throw new ProductRequestError("An uploaded product video is empty.", 400);
  }
  if (file.size > MAX_PRODUCT_VIDEO_BYTES) {
    throw new ProductRequestError("Product videos must be 40 MB or smaller.", 413);
  }
  return file;
}

function validateUploadIndexes(
  descriptors: Array<{ id?: string; uploadIndex?: number }>,
  files: FormDataEntryValue[],
  label: string,
) {
  const indexes = descriptors
    .map((descriptor) => descriptor.uploadIndex)
    .filter((index): index is number => index !== undefined)
    .sort((left, right) => left - right);
  if (
    indexes.length !== files.length ||
    indexes.some((index, position) => index !== position)
  ) {
    throw new ProductRequestError(`The ${label} upload list is invalid.`, 400);
  }
}

async function getExistingMedia(
  connection: PoolConnection,
  productId: string,
) {
  const [images] = await connection.execute<ImageRow[]>(
    `SELECT id, image_path, is_primary, mime_type, file_size, width, height,
            aspect_ratio, fit, position_x, position_y
     FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC FOR UPDATE`,
    [productId],
  );
  const [videos] = await connection.execute<VideoRow[]>(
    `SELECT id, video_path, thumbnail_path, mime_type, file_size
     FROM product_videos WHERE product_id = ? ORDER BY id ASC FOR UPDATE`,
    [productId],
  );
  return { images, videos };
}

async function saveProduct(request: Request, productId?: string) {
  const newlyCreatedFiles: string[] = [];
  let connection: PoolConnection | undefined;
  let committed = false;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
      return errorResponse("Submit product details as a multipart form.", 415);
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_PRODUCT_UPLOAD_BYTES) {
      return errorResponse("The total product upload exceeds 145 MB.", 413);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ProductRequestError("The product upload could not be read.", 400);
    }
    const productValue = formData.get("product");
    if (typeof productValue !== "string" || productValue.length > 64 * 1024) {
      return errorResponse("Valid product details are required.", 400);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(productValue);
    } catch {
      return errorResponse("Product details must contain valid JSON.", 400);
    }
    const parsedProduct = productSchema.safeParse(parsedJson);
    if (!parsedProduct.success) {
      return errorResponse(
        parsedProduct.error.issues[0]?.message ?? "Product details are invalid.",
        400,
      );
    }
    const product = parsedProduct.data;
    if (productId && product.id !== productId) {
      return errorResponse("The product identifier does not match the request.", 400);
    }
    if (!productId && product.id) {
      return errorResponse("A new product cannot include an existing identifier.", 400);
    }

    const imageFiles = formData.getAll("image");
    const videoFiles = formData.getAll("video");
    validateUploadIndexes(product.images, imageFiles, "image");
    validateUploadIndexes(product.videos, videoFiles, "video");
    const uploadBytes = [...imageFiles, ...videoFiles].reduce(
      (total, entry) => total + (entry instanceof File ? entry.size : 0),
      0,
    );
    if (uploadBytes > MAX_PRODUCT_UPLOAD_BYTES) {
      return errorResponse("The total product upload exceeds 145 MB.", 413);
    }
    for (let index = 0; index < imageFiles.length; index += 1) {
      getImageFile(imageFiles, index);
    }
    for (let index = 0; index < videoFiles.length; index += 1) {
      getVideoFile(videoFiles, index);
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    let existingImages: ImageRow[] = [];
    let existingVideos: VideoRow[] = [];
    if (productId) {
      const [products] = await connection.execute<(RowDataPacket & { id: number; stock_reserved: number })[]>(
        "SELECT id, stock_reserved FROM products WHERE id = ? LIMIT 1 FOR UPDATE",
        [productId],
      );
      if (!products[0]) {
        throw new ProductRequestError("Product not found.", 404);
      }
      if (product.stock < Number(products[0].stock_reserved)) {
        throw new ProductRequestError("On-hand stock cannot be lower than units reserved for customer payments.", 409);
      }
      const existing = await getExistingMedia(connection, productId);
      existingImages = existing.images;
      existingVideos = existing.videos;
    }

    const existingImageById = new Map(
      existingImages.map((image) => [String(image.id), image]),
    );
    const existingVideoById = new Map(
      existingVideos.map((video) => [String(video.id), video]),
    );
    const submittedImageIds = product.images
      .filter((image): image is Extract<ImageDescriptor, { id: string }> => "id" in image)
      .map((image) => image.id);
    const submittedVideoIds = product.videos
      .filter((video): video is Extract<VideoDescriptor, { id: string }> => "id" in video)
      .map((video) => video.id);
    if (
      submittedImageIds.some((id) => !existingImageById.has(id)) ||
      submittedVideoIds.some((id) => !existingVideoById.has(id))
    ) {
      throw new ProductRequestError(
        "Product media no longer matches this product. Reload and try again.",
        409,
      );
    }

    const imageResults: Array<{
      descriptor: ImageDescriptor;
      path: string;
      mimeType: string;
      fileSize: number;
      width: number;
      height: number;
      aspectRatio: number;
      positionX: number;
      positionY: number;
      fit: ImageFit;
      changed: boolean;
    }> = [];
    for (const descriptor of product.images) {
      if ("uploadIndex" in descriptor) {
        const file = getImageFile(imageFiles, descriptor.uploadIndex);
        const media = await persistProductImage(
          new Uint8Array(await file.arrayBuffer()),
          file.type,
          file.name,
          { width: descriptor.width, height: descriptor.height },
          descriptor.fit,
          descriptor.position,
        );
        newlyCreatedFiles.push(media.filename);
        imageResults.push({
          descriptor,
          ...media,
          changed: true,
        });
        continue;
      }

      const existing = existingImageById.get(descriptor.id);
      if (!existing) {
        throw new ProductRequestError("Product image not found.", 409);
      }
      const positionX = descriptor.position.includes("west")
        ? 0
        : descriptor.position.includes("east")
          ? 100
          : descriptor.position === "west"
            ? 0
            : descriptor.position === "east"
              ? 100
              : 50;
      const positionY = descriptor.position.startsWith("north")
        ? 0
        : descriptor.position.startsWith("south")
          ? 100
          : descriptor.position === "north"
            ? 0
            : descriptor.position === "south"
              ? 100
              : 50;
      const settingsChanged =
        descriptor.width !== (existing.width === null ? null : Number(existing.width)) ||
        descriptor.height !== (existing.height === null ? null : Number(existing.height)) ||
        descriptor.fit !== existing.fit ||
        positionX !== Number(existing.position_x) ||
        positionY !== Number(existing.position_y);

      if (!settingsChanged) {
        imageResults.push({
          descriptor,
          path: existing.image_path,
          mimeType: existing.mime_type,
          fileSize: Number(existing.file_size),
          width: Number(existing.width ?? 0),
          height: Number(existing.height ?? 0),
          aspectRatio: Number(existing.aspect_ratio ?? 0),
          positionX,
          positionY,
          fit: descriptor.fit,
          changed: false,
        });
        continue;
      }

      const filename = getProductMediaFilename(existing.image_path);
      if (!filename) {
        throw new ProductRequestError(
          "Replace this legacy image before changing its crop or dimensions.",
          400,
        );
      }
      const bytes = await readFile(getProductMediaFilePath(filename));
      const media = await persistProductImage(
        new Uint8Array(bytes),
        "image/webp",
        filename,
        { width: descriptor.width, height: descriptor.height },
        descriptor.fit,
        descriptor.position,
      );
      newlyCreatedFiles.push(media.filename);
      imageResults.push({
        descriptor,
        ...media,
        changed: true,
      });
    }

    const videoResults: Array<{
      descriptor: VideoDescriptor;
      path: string;
      mimeType: string;
      fileSize: number;
      oldThumbnailPath: string | null;
    }> = [];
    for (const descriptor of product.videos) {
      if ("uploadIndex" in descriptor) {
        const file = getVideoFile(videoFiles, descriptor.uploadIndex);
        const media = await persistProductVideo(
          new Uint8Array(await file.arrayBuffer()),
          file.type,
          file.name,
        );
        newlyCreatedFiles.push(media.filename);
        videoResults.push({
          descriptor,
          ...media,
          oldThumbnailPath: null,
        });
      } else {
        const existing = existingVideoById.get(descriptor.id);
        if (!existing) {
          throw new ProductRequestError("Product video not found.", 409);
        }
        videoResults.push({
          descriptor,
          path: existing.video_path,
          mimeType: existing.mime_type,
          fileSize: Number(existing.file_size),
          oldThumbnailPath: existing.thumbnail_path,
        });
      }
    }

    const [categoryRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM categories WHERE category_name = ? LIMIT 1",
      [product.category],
    );
    const categoryId = categoryRows[0]?.id;
    if (!categoryId) {
      throw new ProductRequestError(
        "Product categories are missing. Run scripts/product-media-migration.sql first.",
        500,
      );
    }

    const status = product.isPublished
      ? product.stock > 0
        ? "active"
        : "out_of_stock"
      : "draft";
    let savedProductId = productId;
    if (productId) {
      await connection.execute(
        `UPDATE products
         SET category_id = ?, product_type = ?, product_name = ?, description = ?, price = ?,
             stock_quantity = ?, status = ?, is_featured = ?, is_new_arrival = ?,
             show_on_homepage = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          categoryId,
          product.productType,
          product.name,
          product.description,
          product.price,
          product.stock,
          status,
          product.isFeatured ? 1 : 0,
          product.isNewArrival ? 1 : 0,
          product.showOnHomepage ? 1 : 0,
          productId,
        ],
      );
    } else {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO products
           (category_id, product_type, product_name, description, price, stock_quantity, status,
            is_featured, is_new_arrival, show_on_homepage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          categoryId,
          product.productType,
          product.name,
          product.description,
          product.price,
          product.stock,
          status,
          product.isFeatured ? 1 : 0,
          product.isNewArrival ? 1 : 0,
          product.showOnHomepage ? 1 : 0,
        ],
      );
      savedProductId = String(result.insertId);
    }
    if (!savedProductId) {
      throw new Error("The product was not assigned a database identifier.");
    }
    const savedId = savedProductId;

    const retainedImageIds = new Set(submittedImageIds);
    const removedImageRows = existingImages.filter(
      (image) => !retainedImageIds.has(String(image.id)),
    );
    if (removedImageRows.length > 0) {
      const placeholders = removedImageRows.map(() => "?").join(", ");
      await connection.execute(
        `DELETE FROM product_images WHERE product_id = ? AND id IN (${placeholders})`,
        [savedId, ...removedImageRows.map((image) => image.id)],
      );
    }

    for (const image of imageResults) {
      if ("id" in image.descriptor) {
        await connection.execute(
          `UPDATE product_images
           SET image_path = ?, is_primary = ?, mime_type = ?, file_size = ?,
               width = ?, height = ?, aspect_ratio = ?, fit = ?,
               position_x = ?, position_y = ?
           WHERE id = ? AND product_id = ?`,
          [
            image.path,
            image.descriptor.primary ? 1 : 0,
            image.mimeType,
            image.fileSize,
            image.width || null,
            image.height || null,
            image.aspectRatio || null,
            image.fit,
            image.positionX,
            image.positionY,
            image.descriptor.id,
            savedId,
          ],
        );
      } else {
        await connection.execute(
          `INSERT INTO product_images
             (product_id, image_path, is_primary, mime_type, file_size, width,
              height, aspect_ratio, fit, position_x, position_y)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            savedId,
            image.path,
            image.descriptor.primary ? 1 : 0,
            image.mimeType,
            image.fileSize,
            image.width || null,
            image.height || null,
            image.aspectRatio || null,
            image.fit,
            image.positionX,
            image.positionY,
          ],
        );
      }
    }

    const retainedVideoIds = new Set(submittedVideoIds);
    const removedVideoRows = existingVideos.filter(
      (video) => !retainedVideoIds.has(String(video.id)),
    );
    if (removedVideoRows.length > 0) {
      const placeholders = removedVideoRows.map(() => "?").join(", ");
      await connection.execute(
        `DELETE FROM product_videos WHERE product_id = ? AND id IN (${placeholders})`,
        [savedId, ...removedVideoRows.map((video) => video.id)],
      );
    }

    for (const video of videoResults) {
      const selectedThumbnailIndex = video.descriptor.thumbnailImageIndex;
      const selectedThumbnail =
        selectedThumbnailIndex === null || selectedThumbnailIndex === undefined
          ? null
          : imageResults[selectedThumbnailIndex]?.path ?? null;
      const existingThumbnail =
        "id" in video.descriptor
          ? existingVideoById.get(video.descriptor.id)?.thumbnail_path ?? null
          : null;
      const replacedThumbnailImage = existingImages.find(
        (image) => image.image_path === existingThumbnail,
      );
      const replacementThumbnailPath = replacedThumbnailImage
        ? imageResults.find(
            (image) =>
              "id" in image.descriptor &&
              image.descriptor.id === String(replacedThumbnailImage.id),
          )?.path
        : null;
      const existingThumbnailIsRemovedImage = removedImageRows.some(
        (image) => image.image_path === existingThumbnail,
      );
      const thumbnailPath =
        selectedThumbnail ??
        replacementThumbnailPath ??
        (existingThumbnailIsRemovedImage ? null : existingThumbnail);

      if ("id" in video.descriptor) {
        await connection.execute(
          `UPDATE product_videos
           SET video_path = ?, thumbnail_path = ?, mime_type = ?, file_size = ?
           WHERE id = ? AND product_id = ?`,
          [
            video.path,
            thumbnailPath,
            video.mimeType,
            video.fileSize,
            video.descriptor.id,
            savedId,
          ],
        );
      } else {
        await connection.execute(
          `INSERT INTO product_videos
             (product_id, video_path, thumbnail_path, mime_type, file_size)
           VALUES (?, ?, ?, ?, ?)`,
          [
            savedId,
            video.path,
            thumbnailPath,
            video.mimeType,
            video.fileSize,
          ],
        );
      }
    }

    const removedFiles = [
      ...removedImageRows.map((image) => getProductMediaFilename(image.image_path)),
      ...removedVideoRows.flatMap((video) => [
        getProductMediaFilename(video.video_path),
      ]),
      ...imageResults
        .filter((image) => image.changed && "id" in image.descriptor)
        .map((image) =>
          getProductMediaFilename(
            "id" in image.descriptor
              ? existingImageById.get(image.descriptor.id)?.image_path ?? null
              : null,
          ),
        ),
    ].filter((filename): filename is string => filename !== null);

    await connection.commit();
    committed = true;
    const cleanupWarning = await removeProductMediaFiles(removedFiles);
    return NextResponse.json({
      success: true,
      productId: savedProductId,
      message: cleanupWarning
        ? "Product saved, but some replaced media files could not be removed."
        : "Product saved successfully.",
      cleanupWarning,
    });
  } catch (error) {
    if (connection && !committed) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Product transaction rollback failed:", rollbackError);
      }
    }
    if (!committed) {
      const cleanupWarning = await removeProductMediaFiles(newlyCreatedFiles);
      if (cleanupWarning) {
        console.error("Some uncommitted product media files could not be removed.");
      }
    }
    if (error instanceof ProductRequestError) {
      return errorResponse(error.message, error.status);
    }
    if (error instanceof Error && error.message.includes("Input file")) {
      return errorResponse("One of the uploaded images is invalid or damaged.", 400);
    }
    console.error("Product save failed:", error);
    return errorResponse("Unable to save this product right now.", 500);
  } finally {
    connection?.release();
  }
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return errorResponse("Administrator access required.", 403);
  }

  const category = new URL(request.url).searchParams.get("category");
  try {
    const parameters: string[] = [];
    const categoryFilter = category ? "AND c.category_name = ?" : "";
    if (category) parameters.push(category);
    const [products] = await pool.execute<ProductRow[]>(
      `SELECT p.id, p.product_name, p.product_type, c.category_name, p.description, p.price,
              p.stock_quantity, p.status, p.is_featured, p.is_new_arrival,
              p.show_on_homepage, p.created_at, p.updated_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE c.id IS NOT NULL ${categoryFilter}
       ORDER BY p.updated_at DESC, p.id DESC
       LIMIT 500`,
      parameters,
    );
    const productIds = products.map((product) => product.id);
    let images: ImageRow[] = [];
    let videos: VideoRow[] = [];
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(", ");
      const [imageRows] = await pool.execute<ImageRow[]>(
        `SELECT id, product_id, image_path, is_primary, mime_type, file_size,
                width, height, aspect_ratio, fit, position_x, position_y
         FROM product_images WHERE product_id IN (${placeholders})
         ORDER BY is_primary DESC, id ASC`,
        productIds,
      );
      const [videoRows] = await pool.execute<VideoRow[]>(
        `SELECT id, product_id, video_path, thumbnail_path, mime_type, file_size
         FROM product_videos WHERE product_id IN (${placeholders})
         ORDER BY id ASC`,
        productIds,
      );
      images = imageRows;
      videos = videoRows;
    }
    const imagesByProduct = new Map<string, ImageRow[]>();
    const videosByProduct = new Map<string, VideoRow[]>();
    for (const image of images) {
      const key = String(image.product_id);
      imagesByProduct.set(key, [...(imagesByProduct.get(key) ?? []), image]);
    }
    for (const video of videos) {
      const key = String(video.product_id);
      videosByProduct.set(key, [...(videosByProduct.get(key) ?? []), video]);
    }

    const [categoryRows] = await pool.execute<(RowDataPacket & { category_name: string })[]>(
      "SELECT category_name FROM categories ORDER BY category_name ASC",
    );

    return NextResponse.json({
      success: true,
      categories: categoryRows.map((row) => row.category_name),
      products: products.map((product) => ({
        id: String(product.id),
        name: product.product_name,
        category: product.category_name,
        productType: product.product_type,
        description: product.description ?? "",
        price: Number(product.price),
        stock: Number(product.stock_quantity),
        isPublished: product.status !== "draft",
        isFeatured: Boolean(product.is_featured),
        isNewArrival: Boolean(product.is_new_arrival),
        showOnHomepage: Boolean(product.show_on_homepage),
        status: product.status,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        images: (imagesByProduct.get(String(product.id)) ?? []).map((image) => ({
          id: String(image.id),
          path: image.image_path,
          isPrimary: Boolean(image.is_primary),
          mimeType: image.mime_type,
          fileSize: Number(image.file_size),
          width: image.width === null ? null : Number(image.width),
          height: image.height === null ? null : Number(image.height),
          aspectRatio: image.aspect_ratio === null ? null : Number(image.aspect_ratio),
          fit: image.fit,
          positionX: Number(image.position_x),
          positionY: Number(image.position_y),
        })),
        videos: (videosByProduct.get(String(product.id)) ?? []).map((video) => ({
          id: String(video.id),
          path: video.video_path,
          thumbnail: video.thumbnail_path,
          mimeType: video.mime_type,
          fileSize: Number(video.file_size),
        })),
      })),
    });
  } catch (error) {
    console.error("Admin product list query failed:", error);
    return errorResponse("Unable to load products right now.", 500);
  }
}

export async function POST(request: Request) {
  if (!(await getAdmin())) {
    return errorResponse("Administrator access required.", 403);
  }
  if (!isSameOrigin(request)) {
    return errorResponse("Cross-origin product changes are not allowed.", 403);
  }
  return saveProduct(request);
}

export async function PATCH(request: Request) {
  if (!(await getAdmin())) {
    return errorResponse("Administrator access required.", 403);
  }
  if (!isSameOrigin(request)) {
    return errorResponse("Cross-origin product changes are not allowed.", 403);
  }
  const productValue = request.headers.get("x-product-id");
  if (!productValue || !/^\d+$/.test(productValue)) {
    return errorResponse("A valid product identifier is required.", 400);
  }
  return saveProduct(request, productValue);
}

export async function DELETE(request: Request) {
  if (!(await getAdmin())) {
    return errorResponse("Administrator access required.", 403);
  }
  if (!isSameOrigin(request)) {
    return errorResponse("Cross-origin product changes are not allowed.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("A valid product identifier is required.", 400);
  }
  const parsed = z.object({ id: z.string().regex(/^\d+$/) }).safeParse(body);
  if (!parsed.success) {
    return errorResponse("A valid product identifier is required.", 400);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [products] = await connection.execute<ProductRow[]>(
      "SELECT id FROM products WHERE id = ? LIMIT 1 FOR UPDATE",
      [parsed.data.id],
    );
    if (!products[0]) {
      await connection.rollback();
      return errorResponse("Product not found.", 404);
    }
    const [orders] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM order_items WHERE product_id = ? LIMIT 1",
      [parsed.data.id],
    );
    if (orders.length > 0) {
      await connection.rollback();
      return errorResponse(
        "This product has order history and cannot be deleted. Unpublish it instead.",
        409,
      );
    }
    const { images, videos } = await getExistingMedia(connection, parsed.data.id);
    await connection.execute("DELETE FROM products WHERE id = ?", [parsed.data.id]);
    await connection.commit();

    const mediaFilenames = [
      ...images.map((image) => getProductMediaFilename(image.image_path)),
      ...videos.flatMap((video) => [
        getProductMediaFilename(video.video_path),
        getProductMediaFilename(video.thumbnail_path),
      ]),
    ].filter((filename): filename is string => filename !== null);
    const cleanupWarning = await removeProductMediaFiles(mediaFilenames);
    return NextResponse.json({
      success: true,
      message: cleanupWarning
        ? "Product deleted, but some media files could not be removed."
        : "Product and its media were deleted.",
      cleanupWarning,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Product deletion rollback failed:", rollbackError);
    }
    console.error("Product deletion failed:", error);
    return errorResponse("Unable to delete this product right now.", 500);
  } finally {
    connection.release();
  }
}
