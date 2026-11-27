"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import Icon from "@/components/icons";
import { PRODUCT_CATEGORIES, PRODUCT_TYPES_BY_CATEGORY, type ProductCategory } from "@/lib/product-categories";

type ImageFit = "cover" | "contain";
type ImagePosition =
  | "centre"
  | "north"
  | "south"
  | "east"
  | "west"
  | "north east"
  | "north west"
  | "south east"
  | "south west";

const adminProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  productType: z.string().nullable(),
  description: z.string(),
  price: z.number(),
  stock: z.number(),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  showOnHomepage: z.boolean(),
  status: z.enum(["active", "draft", "out_of_stock"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  images: z.array(z.object({
    id: z.string(),
    path: z.string(),
    isPrimary: z.boolean(),
    mimeType: z.string(),
    fileSize: z.number(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    aspectRatio: z.number().nullable(),
    fit: z.enum(["cover", "contain"]),
    positionX: z.number(),
    positionY: z.number(),
  })),
  videos: z.array(z.object({
    id: z.string(),
    path: z.string(),
    thumbnail: z.string().nullable(),
    mimeType: z.string(),
    fileSize: z.number(),
  })),
});

type AdminProduct = z.infer<typeof adminProductSchema>;

type DraftImage = {
  key: string;
  id?: string;
  file?: File;
  src: string;
  name: string;
  primary: boolean;
  width: string;
  height: string;
  fit: ImageFit;
  position: ImagePosition;
};

type DraftVideo = {
  key: string;
  id?: string;
  file?: File;
  src: string;
  name: string;
  thumbnail: string | null;
  thumbnailImageKey: string | null;
};

type ProductFormState = {
  id?: string;
  name: string;
  category: string;
  productType: string;
  description: string;
  price: string;
  stock: string;
  isPublished: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  showOnHomepage: boolean;
  images: DraftImage[];
  videos: DraftVideo[];
};

const initialForm: ProductFormState = {
  name: "",
  category: PRODUCT_CATEGORIES[0],
  productType: PRODUCT_TYPES_BY_CATEGORY[PRODUCT_CATEGORIES[0]][0],
  description: "",
  price: "",
  stock: "0",
  isPublished: false,
  isFeatured: false,
  isNewArrival: true,
  showOnHomepage: true,
  images: [],
  videos: [],
};

const positions: Array<{ value: ImagePosition; label: string }> = [
  { value: "centre", label: "Center" },
  { value: "north", label: "Top" },
  { value: "south", label: "Bottom" },
  { value: "west", label: "Left" },
  { value: "east", label: "Right" },
  { value: "north west", label: "Top left" },
  { value: "north east", label: "Top right" },
  { value: "south west", label: "Bottom left" },
  { value: "south east", label: "Bottom right" },
];

function positionFromCoordinates(x: number, y: number): ImagePosition {
  if (y <= 5 && x <= 5) return "north west";
  if (y <= 5 && x >= 95) return "north east";
  if (y >= 95 && x <= 5) return "south west";
  if (y >= 95 && x >= 95) return "south east";
  if (y <= 5) return "north";
  if (y >= 95) return "south";
  if (x <= 5) return "west";
  if (x >= 95) return "east";
  return "centre";
}

function positionStyle(position: ImagePosition) {
  return position
    .replace("centre", "center")
    .replace("north", "top")
    .replace("south", "bottom")
    .replace("east", "right")
    .replace("west", "left");
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function createImageDraft(file: File): DraftImage {
  return {
    key: crypto.randomUUID(),
    file,
    src: URL.createObjectURL(file),
    name: file.name,
    primary: false,
    width: "1600",
    height: "2000",
    fit: "cover",
    position: "centre",
  };
}

function createVideoDraft(file: File): DraftVideo {
  return {
    key: crypto.randomUUID(),
    file,
    src: URL.createObjectURL(file),
    name: file.name,
    thumbnail: null,
    thumbnailImageKey: null,
  };
}

function responseMessage(payload: unknown, fallback: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }
  return fallback;
}

function productTypesForCategory(category: string) {
  return PRODUCT_TYPES_BY_CATEGORY[category as ProductCategory] ?? ["General"];
}

export default function ProductManagement() {
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [categories, setCategories] = useState<string[]>([...PRODUCT_CATEGORIES]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const previewUrls = useRef(new Set<string>());

  const loadProducts = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(
        `/api/admin/products?category=${encodeURIComponent(category)}`,
        { cache: "no-store", signal },
      );
      const payload: unknown = await response.json();
      const result = z.object({
        success: z.literal(true),
        categories: z.array(z.string()),
        products: z.array(adminProductSchema),
      }).safeParse(payload);
      if (!response.ok || !result.success) {
        throw new Error(responseMessage(payload, "Unable to load products."));
      }
      setListError("");
      setProducts(result.data.products);
      setCategories(result.data.categories);
    } catch (loadError) {
      if (signal?.aborted) return;
      setProducts([]);
      setListError(
        loadError instanceof Error ? loadError.message : "Unable to load products.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => void loadProducts(controller.signal),
      0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadProducts]);

  useEffect(
    () => () => {
      for (const preview of previewUrls.current) URL.revokeObjectURL(preview);
      previewUrls.current.clear();
    },
    [],
  );

  function trackImage(file: File) {
    const image = createImageDraft(file);
    previewUrls.current.add(image.src);
    return image;
  }

  function trackVideo(file: File) {
    const video = createVideoDraft(file);
    previewUrls.current.add(video.src);
    return video;
  }

  function releasePreview(source: string) {
    if (source.startsWith("blob:") && previewUrls.current.delete(source)) {
      URL.revokeObjectURL(source);
    }
  }

  function resetForm() {
    for (const image of form.images) releasePreview(image.src);
    for (const video of form.videos) releasePreview(video.src);
    setForm(initialForm);
    setFormOpen(false);
    setError("");
    setUploadProgress(0);
  }

  function openNewProduct() {
    setNotice("");
    setError("");
    setForm({ ...initialForm, category });
    setFormOpen(true);
  }

  function openEditProduct(product: AdminProduct) {
    setNotice("");
    setError("");
    const images = product.images.map((image) => ({
      key: `image-${image.id}`,
      id: image.id,
      src: image.path,
      name: image.path.split("/").pop() ?? "Product image",
      primary: image.isPrimary,
      width: image.width === null ? "" : String(image.width),
      height: image.height === null ? "" : String(image.height),
      fit: image.fit,
      position: positionFromCoordinates(image.positionX, image.positionY),
    }));
    setForm({
      id: product.id,
      name: product.name,
      category: product.category ?? category,
      productType: product.productType ?? productTypesForCategory(product.category ?? category)[0],
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      isPublished: product.isPublished,
      isFeatured: product.isFeatured,
      isNewArrival: product.isNewArrival,
      showOnHomepage: product.showOnHomepage,
      images,
      videos: product.videos.map((video) => {
        const thumbnailImage = images.find(
          (image) => image.src === video.thumbnail,
        );
        return {
          key: `video-${video.id}`,
          id: video.id,
          src: video.path,
          name: video.path.split("/").pop() ?? "Product video",
          thumbnail: video.thumbnail,
          thumbnailImageKey: thumbnailImage?.key ?? null,
        };
      }),
    });
    setFormOpen(true);
  }

  function addImageFiles(files: FileList | null) {
    if (!files?.length) return;
    const incoming = Array.from(files);
    if (form.images.length + incoming.length > 8) {
      setError("A product can have up to 8 images.");
      return;
    }
    if (incoming.some((file) => file.size > 8 * 1024 * 1024)) {
      setError("Each image must be 8 MB or smaller.");
      return;
    }
    setError("");
    const added = incoming.map(trackImage);
    setForm((current) => {
      const images = [...current.images, ...added];
      return images.some((image) => image.primary)
        ? { ...current, images }
        : {
            ...current,
            images: images.map((image, index) => ({
              ...image,
              primary: index === 0,
            })),
          };
    });
  }

  function addVideoFiles(files: FileList | null) {
    if (!files?.length) return;
    const incoming = Array.from(files);
    if (form.videos.length + incoming.length > 2) {
      setError("A product can have up to 2 videos.");
      return;
    }
    if (incoming.some((file) => file.size > 40 * 1024 * 1024)) {
      setError("Each video must be 40 MB or smaller.");
      return;
    }
    setError("");
    const added = incoming.map(trackVideo);
    setForm((current) => ({
      ...current,
      videos: [...current.videos, ...added],
    }));
  }

  function removeImage(key: string) {
    const removed = form.images.find((image) => image.key === key);
    if (removed) releasePreview(removed.src);
    setForm((current) => {
      let images = current.images.filter((image) => image.key !== key);
      if (removed?.primary && images.length > 0) {
        images = images.map((image, index) => ({
          ...image,
          primary: index === 0,
        }));
      }
      return {
        ...current,
        images,
        videos: current.videos.map((video) =>
          video.thumbnailImageKey === key
            ? { ...video, thumbnailImageKey: null }
            : video,
        ),
      };
    });
  }

  function removeVideo(key: string) {
    const removed = form.videos.find((video) => video.key === key);
    if (removed) releasePreview(removed.src);
    setForm((current) => ({
      ...current,
      videos: current.videos.filter((video) => video.key !== key),
    }));
  }

  function buildSubmission(
    product: ProductFormState,
    isPublished = product.isPublished,
  ) {
    const formData = new FormData();
    let imageUploadIndex = 0;
    const imageDescriptors = product.images.map((image) => {
      const settings = {
        primary: image.primary,
        width: image.width.trim() ? Number(image.width) : null,
        height: image.height.trim() ? Number(image.height) : null,
        fit: image.fit,
        position: image.position,
      };
      if (image.file) {
        formData.append("image", image.file, image.file.name);
        return { ...settings, uploadIndex: imageUploadIndex++ };
      }
      return { ...settings, id: image.id };
    });
    let videoUploadIndex = 0;
    const videoDescriptors = product.videos.map((video) => {
      const thumbnailImageIndex = video.thumbnailImageKey
        ? product.images.findIndex((image) => image.key === video.thumbnailImageKey)
        : null;
      const thumbnail = thumbnailImageIndex !== null && thumbnailImageIndex >= 0
        ? thumbnailImageIndex
        : null;
      if (video.file) {
        formData.append("video", video.file, video.file.name);
        return {
          uploadIndex: videoUploadIndex++,
          thumbnailImageIndex: thumbnail,
        };
      }
      return {
        id: video.id,
        thumbnailImageIndex: thumbnail,
      };
    });
    formData.set(
      "product",
      JSON.stringify({
        id: product.id,
        name: product.name,
        category: product.category,
        productType: product.productType,
        description: product.description,
        price: Number(product.price),
        stock: Number(product.stock),
        isPublished,
        isFeatured: product.isFeatured,
        isNewArrival: product.isNewArrival,
        showOnHomepage: product.showOnHomepage,
        images: imageDescriptors,
        videos: videoDescriptors,
      }),
    );
    return formData;
  }

  function sendProduct(
    formData: FormData,
    productId: string | undefined,
    onProgress: (progress: number) => void,
  ) {
    return new Promise<{ success: boolean; message: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(productId ? "PATCH" : "POST", "/api/admin/products");
      if (productId) xhr.setRequestHeader("x-product-id", productId);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      };
      xhr.onerror = () => reject(new Error("The product upload could not be completed."));
      xhr.onload = () => {
        let payload: unknown;
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          reject(new Error("The server returned an invalid response."));
          return;
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(responseMessage(payload, "Unable to save product.")));
          return;
        }
        resolve({
          success: true,
          message: responseMessage(payload, "Product saved successfully."),
        });
      };
      xhr.send(formData);
    });
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.name.trim()) {
      setError("Enter a product name.");
      return;
    }
    if (!form.price.trim() || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      setError("Enter a valid product price.");
      return;
    }
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      setError("Stock must be a whole number of 0 or more.");
      return;
    }
    if (form.images.some(
      (image) =>
        (image.width.trim() && !image.height.trim()) ||
        (!image.width.trim() && image.height.trim()) ||
        (image.width.trim() &&
          (Number(image.width) < 100 ||
            Number(image.width) > 3000 ||
            Number(image.height) < 100 ||
            Number(image.height) > 3000)),
    )) {
      setError("Image dimensions must be provided together and between 100 and 3000 pixels.");
      return;
    }
    setSaving(true);
    setListError("");
    setLoading(true);
    setUploadProgress(0);
    try {
      const result = await sendProduct(
        buildSubmission(form),
        form.id,
        setUploadProgress,
      );
      setUploadProgress(100);
      setNotice(result.message);
      resetForm();
      await loadProducts();
    } catch (saveError) {
      setLoading(false);
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(product: AdminProduct) {
    setNotice("");
    setListError("");
    setLoading(true);
    try {
      const response = await sendProduct(
        buildSubmission({
          ...initialForm,
          id: product.id,
          name: product.name,
          category: product.category ?? category,
          productType: product.productType ?? productTypesForCategory(product.category ?? category)[0],
          description: product.description,
          price: String(product.price),
          stock: String(product.stock),
          isPublished: product.isPublished,
          isFeatured: product.isFeatured,
          isNewArrival: product.isNewArrival,
          showOnHomepage: product.showOnHomepage,
          images: product.images.map((image) => ({
            key: `image-${image.id}`,
            id: image.id,
            src: image.path,
            name: image.path.split("/").pop() ?? "Product image",
            primary: image.isPrimary,
            width: image.width === null ? "" : String(image.width),
            height: image.height === null ? "" : String(image.height),
            fit: image.fit,
            position: positionFromCoordinates(image.positionX, image.positionY),
          })),
          videos: product.videos.map((video) => {
            const image = product.images.find((candidate) => candidate.path === video.thumbnail);
            return {
              key: `video-${video.id}`,
              id: video.id,
              src: video.path,
              name: video.path.split("/").pop() ?? "Product video",
              thumbnail: video.thumbnail,
              thumbnailImageKey: image ? `image-${image.id}` : null,
            };
          }),
        }, !product.isPublished),
        product.id,
        () => {},
      );
      setNotice(response.message);
      await loadProducts();
    } catch (publishError) {
      setLoading(false);
      setListError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to update publishing status.",
      );
    }
  }

  async function deleteProduct(product: AdminProduct) {
    if (!window.confirm(`Delete “${product.name}” and its associated media?`)) return;
    setNotice("");
    setListError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(responseMessage(payload, "Unable to delete product."));
      }
      setNotice(responseMessage(payload, "Product deleted."));
      await loadProducts();
    } catch (deleteError) {
      setLoading(false);
      setListError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete product.",
      );
    }
  }

  const categoryCount = products.length;

  return (
    <main className="min-h-screen bg-[var(--surface-soft)] px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[var(--muted)]">
              Admin workspace / catalog
            </p>
            <h1 className="serif-display mt-2 text-4xl text-[var(--ink)] sm:text-5xl">
              Product & media management
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Manage the catalog, product imagery, videos, publishing, and stock.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 text-xs font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
            >
              ADMIN OVERVIEW
            </a>
            <button
              type="button"
              onClick={openNewProduct}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--purple)] px-5 text-xs font-semibold tracking-[0.05em] text-white hover:bg-[var(--purple-dark)]"
            >
              <Icon name="plus" className="size-4" />
              ADD PRODUCT
            </button>
          </div>
        </header>

        <nav
          aria-label="Product categories"
          className="mt-7 flex gap-2 overflow-x-auto border-b border-[var(--line)] pb-3"
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setCategory(item);
                setLoading(true);
                setNotice("");
                setListError("");
              }}
              aria-pressed={category === item}
              className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-semibold transition-colors ${
                category === item
                  ? "bg-[var(--purple)] text-white"
                  : "bg-white text-[var(--muted)] hover:bg-[var(--line)]"
              }`}
            >
              {item}
            </button>
          ))}
          <span className="ml-auto hidden self-center text-xs text-[var(--muted)] sm:block">
            {categoryCount} {categoryCount === 1 ? "product" : "products"}
          </span>
        </nav>

        {(notice || listError) && (
          <div
            role={listError ? "alert" : "status"}
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              listError
                ? "border border-[#E8C8C0] bg-[#FAEFEC] text-[#873F30]"
                : "border border-[#E4C9B2] bg-[#F5E9E1] text-[#7C3A31]"
            }`}
          >
            {listError || notice}
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-6">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                Category inventory
              </p>
              <h2 className="serif-display mt-1 text-2xl text-[var(--ink)]">
                {category}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setListError("");
                void loadProducts();
              }}
              disabled={loading}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--line)] px-3 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-50"
            >
              <Icon name="refresh" className="size-3.5" />
              REFRESH
            </button>
          </div>
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-[var(--muted)]" aria-busy="true">
              Loading category products…
            </div>
          ) : listError ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-[#873F30]">{listError}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setListError("");
                  void loadProducts();
                }}
                className="mt-3 text-xs font-semibold underline underline-offset-4"
              >
                TRY AGAIN
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Icon name="sparkle" className="mx-auto size-7 text-[var(--purple)]" />
              <p className="serif-display mt-3 text-2xl text-[var(--ink)]">
                Nothing here just yet
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Add the first {category.toLowerCase()} product to your catalog.
              </p>
              <button
                type="button"
                onClick={openNewProduct}
                className="mt-5 rounded-full bg-[var(--purple)] px-5 py-3 text-[10px] font-semibold tracking-[0.1em] text-white hover:bg-[var(--purple-dark)]"
              >
                ADD FIRST PRODUCT
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="bg-[var(--surface-soft)] text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    <th className="px-4 py-3 font-semibold sm:px-6">Product</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-soft)]">
                            {product.images[0] ? (
                              <Image
                                src={product.images.find((image) => image.isPrimary)?.path ?? product.images[0].path}
                                alt=""
                                fill
                                unoptimized
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex size-full items-center justify-center">
                                <Icon name="sparkle" className="size-5 text-[var(--purple)]" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[280px] truncate text-sm font-medium text-[var(--ink)]">
                              {product.name}
                            </p>
                            <p className="mt-1 text-[10px] text-[var(--muted)]">
                              {product.isFeatured ? "Featured · " : ""}
                              {product.isNewArrival ? "New arrival · " : ""}
                              {product.images.length} {product.images.length === 1 ? "image" : "images"}
                              {product.videos.length > 0
                                ? ` · ${product.videos.length} ${product.videos.length === 1 ? "video" : "videos"}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--ink)]">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--ink)]">
                        {product.stock} units
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[9px] font-semibold ${
                            product.status === "draft"
                              ? "bg-[var(--surface-soft)] text-[var(--muted)]"
                              : product.status === "out_of_stock"
                                ? "bg-[#FAEFEC] text-[#873F30]"
                                : "bg-[#F5E9E1] text-[#7C3A31]"
                          }`}
                        >
                          {product.status === "draft"
                            ? "UNPUBLISHED"
                            : product.status === "out_of_stock"
                              ? "OUT OF STOCK"
                              : "PUBLISHED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void togglePublished(product)}
                            className="min-h-9 rounded-full border border-[var(--line)] px-3 text-[9px] font-semibold text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                          >
                            {product.isPublished ? "UNPUBLISH" : "PUBLISH"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditProduct(product)}
                            className="min-h-9 rounded-full bg-[var(--purple)] px-3 text-[9px] font-semibold text-white hover:bg-[var(--purple-dark)]"
                          >
                            EDIT
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteProduct(product)}
                            aria-label={`Delete ${product.name}`}
                            className="flex size-9 items-center justify-center rounded-full border border-[#E8C8C0] text-[#873F30] hover:bg-[#FAEFEC]"
                          >
                            <Icon name="trash" className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--ink)]/65 p-3 sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-editor-title"
            className="mx-auto my-2 max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-6"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-7">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                  {form.id ? "Edit catalog item" : "New catalog item"}
                </p>
                <h2 id="product-editor-title" className="serif-display mt-1 text-3xl text-[var(--ink)]">
                  {form.id ? "Update product" : "Add a product"}
                </h2>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={resetForm}
                aria-label="Close product editor"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
              >
                <Icon name="close" className="size-5" />
              </button>
            </header>

            <form onSubmit={submitProduct} className="max-h-[calc(100vh-160px)] overflow-y-auto">
              <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-[var(--ink)] sm:col-span-2">
                      Product name
                      <input
                        required
                        maxLength={160}
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm font-normal outline-none focus:border-[var(--ink)]"
                        placeholder="e.g. Handmade Toran or Girls Frock"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[var(--ink)]">
                      Category
                      <select
                        value={form.category}
                        onChange={(event) => {
                          const nextCategory = event.target.value;
                          setForm((current) => ({ ...current, category: nextCategory, productType: productTypesForCategory(nextCategory)[0] }));
                        }}
                        className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-normal"
                      >
                        {categories.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-[var(--ink)]">
                      Product type
                      <select
                        value={form.productType}
                        onChange={(event) => setForm((current) => ({ ...current, productType: event.target.value }))}
                        className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-normal"
                      >
                        {productTypesForCategory(form.category).map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-[var(--ink)]">
                      Price (₹)
                      <input
                        required
                        type="number"
                        min="0"
                        max="99999999.99"
                        step="0.01"
                        value={form.price}
                        onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                        className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm font-normal"
                        placeholder="0.00"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[var(--ink)]">
                      Available stock
                      <input
                        required
                        type="number"
                        min="0"
                        max="10000000"
                        step="1"
                        value={form.stock}
                        onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                        className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] px-3 text-sm font-normal"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[var(--ink)] sm:col-span-2">
                      Description
                      <textarea
                        maxLength={10000}
                        rows={5}
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        className="mt-2 w-full resize-y rounded-xl border border-[var(--line)] px-3 py-3 text-sm font-normal leading-6"
                        placeholder="Tell customers what makes this product special."
                      />
                    </label>
                  </div>

                  <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-[var(--line)] px-4 py-3">
                    <span>
                      <span className="block text-sm font-semibold text-[var(--ink)]">
                        Publish product
                      </span>
                      <span className="mt-1 block text-[10px] text-[var(--muted)]">
                        Published products appear in the customer collection.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
                      className="size-5 accent-[var(--purple)]"
                    />
                  </label>

                  <fieldset className="space-y-2 rounded-xl border border-[var(--line)] p-4">
                    <legend className="px-1 text-xs font-semibold text-[var(--ink)]">
                      Homepage placement
                    </legend>
                    <label className="flex items-center justify-between gap-3 text-xs">
                      <span>
                        <span className="block font-medium text-[var(--ink)]">Show on homepage</span>
                        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                          Keep this product in the homepage collection.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={form.showOnHomepage}
                        onChange={(event) => setForm((current) => ({ ...current, showOnHomepage: event.target.checked }))}
                        className="size-5 accent-[var(--purple)]"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 text-xs">
                      <span>
                        <span className="block font-medium text-[var(--ink)]">Just arrived</span>
                        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                          Include this product in the new arrivals section.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={form.isNewArrival}
                        onChange={(event) => setForm((current) => ({ ...current, isNewArrival: event.target.checked }))}
                        className="size-5 accent-[var(--purple)]"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 text-xs">
                      <span>
                        <span className="block font-medium text-[var(--ink)]">Shop our favorites</span>
                        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                          Feature this product in the favorites section.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))}
                        className="size-5 accent-[var(--purple)]"
                      />
                    </label>
                  </fieldset>
                </div>

                <div className="space-y-5">
                  <section>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink)]">
                          Product images
                        </h3>
                        <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                          JPG, JPEG, PNG, WebP · up to 8 MB each · max 8
                        </p>
                      </div>
                      <label className="cursor-pointer rounded-full border border-[var(--line)] px-3 py-2 text-[9px] font-semibold text-[var(--ink)] hover:border-[var(--ink)]">
                        ADD IMAGES
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          multiple
                          className="sr-only"
                          onChange={(event) => {
                            addImageFiles(event.target.files);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {form.images.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-xs text-[var(--muted)]">
                        Add one or more product photos to preview them here.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {form.images.map((image) => (
                          <article key={image.key} className="rounded-xl border border-[var(--line)] p-3">
                            <div className="flex gap-3">
                              <div className="relative aspect-[0.8] w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-soft)]">
                                <Image
                                  src={image.src}
                                  alt={image.name}
                                  fill
                                  unoptimized
                                  sizes="80px"
                                  className="object-cover"
                                  style={{
                                    objectFit: image.fit,
                                    objectPosition: positionStyle(image.position),
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[11px] font-medium text-[var(--ink)]">
                                  {image.name}
                                </p>
                                {image.file && (
                                  <p className="mt-1 text-[9px] text-[var(--muted)]">
                                    {formatFileSize(image.file.size)}
                                  </p>
                                )}
                                <label className="mt-2 inline-flex items-center gap-2 text-[10px] font-medium text-[#7C3A31]">
                                  <input
                                    type="radio"
                                    name="primary-product-image"
                                    checked={image.primary}
                                    onChange={() => setForm((current) => ({
                                      ...current,
                                      images: current.images.map((item) => ({
                                        ...item,
                                        primary: item.key === image.key,
                                      })),
                                    }))}
                                    className="accent-[var(--purple)]"
                                  />
                                  Primary image
                                </label>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(image.key)}
                                aria-label={`Remove ${image.name}`}
                                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#873F30] hover:bg-[#FAEFEC]"
                              >
                                <Icon name="trash" className="size-4" />
                              </button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <label className="text-[9px] font-medium text-[var(--muted)]">
                                Width (px)
                                <input
                                  type="number"
                                  min="100"
                                  max="3000"
                                  value={image.width}
                                  onChange={(event) => setForm((current) => ({
                                    ...current,
                                    images: current.images.map((item) =>
                                      item.key === image.key ? { ...item, width: event.target.value } : item,
                                    ),
                                  }))}
                                  className="mt-1 min-h-9 w-full rounded-lg border border-[var(--line)] px-2 text-xs text-[var(--ink)]"
                                  placeholder="Auto"
                                />
                              </label>
                              <label className="text-[9px] font-medium text-[var(--muted)]">
                                Height (px)
                                <input
                                  type="number"
                                  min="100"
                                  max="3000"
                                  value={image.height}
                                  onChange={(event) => setForm((current) => ({
                                    ...current,
                                    images: current.images.map((item) =>
                                      item.key === image.key ? { ...item, height: event.target.value } : item,
                                    ),
                                  }))}
                                  className="mt-1 min-h-9 w-full rounded-lg border border-[var(--line)] px-2 text-xs text-[var(--ink)]"
                                  placeholder="Auto"
                                />
                              </label>
                              <label className="text-[9px] font-medium text-[var(--muted)]">
                                Aspect / resize
                                <select
                                  value={image.fit}
                                  onChange={(event) => setForm((current) => ({
                                    ...current,
                                    images: current.images.map((item) =>
                                      item.key === image.key
                                        ? { ...item, fit: event.target.value as ImageFit }
                                        : item,
                                    ),
                                  }))}
                                  className="mt-1 min-h-9 w-full rounded-lg border border-[var(--line)] bg-white px-2 text-xs text-[var(--ink)]"
                                >
                                  <option value="cover">Crop to fill</option>
                                  <option value="contain">Fit inside</option>
                                </select>
                              </label>
                              <label className="text-[9px] font-medium text-[var(--muted)]">
                                Image position
                                <select
                                  value={image.position}
                                  onChange={(event) => setForm((current) => ({
                                    ...current,
                                    images: current.images.map((item) =>
                                      item.key === image.key
                                        ? { ...item, position: event.target.value as ImagePosition }
                                        : item,
                                    ),
                                  }))}
                                  className="mt-1 min-h-9 w-full rounded-lg border border-[var(--line)] bg-white px-2 text-xs text-[var(--ink)]"
                                >
                                  {positions.map((position) => (
                                    <option key={position.value} value={position.value}>
                                      {position.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink)]">
                          Product videos
                        </h3>
                        <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                          MP4, WebM · up to 40 MB each · max 2
                        </p>
                      </div>
                      <label className="cursor-pointer rounded-full border border-[var(--line)] px-3 py-2 text-[9px] font-semibold text-[var(--ink)] hover:border-[var(--ink)]">
                        ADD VIDEO
                        <input
                          type="file"
                          accept="video/mp4,video/webm,.mp4,.webm"
                          multiple
                          className="sr-only"
                          onChange={(event) => {
                            addVideoFiles(event.target.files);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {form.videos.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {form.videos.map((video) => (
                          <article key={video.key} className="rounded-xl border border-[var(--line)] p-3">
                            <div className="flex gap-3">
                              <video
                                src={video.src}
                                controls
                                playsInline
                                preload="metadata"
                                poster={video.thumbnail ?? undefined}
                                className="aspect-video w-28 shrink-0 rounded-lg bg-[var(--ink)] object-contain"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[10px] font-medium text-[var(--ink)]">
                                  {video.name}
                                </p>
                                {video.file && (
                                  <p className="mt-1 text-[9px] text-[var(--muted)]">
                                    {formatFileSize(video.file.size)}
                                  </p>
                                )}
                                <label className="mt-2 block text-[9px] font-medium text-[var(--muted)]">
                                  Video thumbnail
                                  <select
                                    value={video.thumbnailImageKey ?? ""}
                                    onChange={(event) => setForm((current) => ({
                                      ...current,
                                      videos: current.videos.map((item) =>
                                        item.key === video.key
                                          ? { ...item, thumbnailImageKey: event.target.value || null }
                                          : item,
                                      ),
                                    }))}
                                    className="mt-1 min-h-9 w-full rounded-lg border border-[var(--line)] bg-white px-2 text-[10px] text-[var(--ink)]"
                                  >
                                    <option value="">
                                      {video.thumbnail ? "Keep current thumbnail" : "No thumbnail"}
                                    </option>
                                    {form.images.map((image, index) => (
                                      <option key={image.key} value={image.key}>
                                        Image {index + 1}{image.primary ? " · Primary" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeVideo(video.key)}
                                aria-label={`Remove ${video.name}`}
                                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#873F30] hover:bg-[#FAEFEC]"
                              >
                                <Icon name="trash" className="size-4" />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>

              {error && (
                <p role="alert" className="mx-5 mb-4 rounded-xl border border-[#E8C8C0] bg-[#FAEFEC] px-4 py-3 text-sm text-[#873F30] sm:mx-7">
                  {error}
                </p>
              )}
              {saving && (
                <div className="px-5 pb-4 sm:px-7" aria-live="polite">
                  <div className="mb-1 flex justify-between text-[10px] text-[var(--muted)]">
                    <span>Saving product and media…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
                    <div
                      className="h-full rounded-full bg-[var(--purple)] transition-[width]"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-[var(--line)] bg-white px-5 py-4 sm:px-7">
                <button
                  type="button"
                  disabled={saving}
                  onClick={resetForm}
                  className="min-h-11 rounded-full border border-[var(--line)] px-5 text-xs font-semibold text-[var(--muted)] disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 rounded-full bg-[var(--ink)] px-6 text-xs font-semibold tracking-[0.05em] text-white hover:bg-[var(--purple-dark)] disabled:cursor-wait disabled:opacity-60"
                >
                  {saving ? "SAVING…" : form.id ? "SAVE CHANGES" : "SAVE PRODUCT"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
