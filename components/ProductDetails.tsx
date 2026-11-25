"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/icons";
import ProductCard from "@/components/ProductCard";
import { useStorefront } from "@/components/StorefrontContext";
import { useProductCatalog } from "@/components/ProductCatalogContext";
import { categoryMatches } from "@/lib/category-presentation";
import {
  productDetailResponseSchema,
  type Product,
  type ProductVideo,
} from "@/lib/catalog-types";

type ProductDetailsData = Product & {
  images: string[];
  videos: ProductVideo[];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);
}

export default function ProductDetails({ productId }: { productId: string }) {
  const router = useRouter();
  const { addToCart, wishlistIds, toggleWishlist } = useStorefront();
  const { products: catalogProducts } = useProductCatalog();
  const [product, setProduct] = useState<ProductDetailsData | null>(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [desktopImageOpen, setDesktopImageOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const response = await fetch(
          `/api/products/${encodeURIComponent(productId)}`,
          { signal: controller.signal },
        );
        const payload: unknown = await response.json();
        const result = productDetailResponseSchema.safeParse(payload);
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok || !result.success) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "message" in payload &&
            typeof payload.message === "string"
              ? payload.message
              : "This product is temporarily unavailable.";
          throw new Error(message);
        }

        setProduct(result.data.product);
        setSelectedImage(
          result.data.product.images[0] ?? result.data.product.image ?? "",
        );
        setSelectedVideo(null);
        setImageZoomed(false);
        setQuantity(1);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "This product is temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadProduct();
    return () => controller.abort();
  }, [productId]);

  if (loading) {
    return (
      <main
        className="page-shell grid min-h-[65vh] gap-8 py-10 lg:grid-cols-2 lg:py-16"
        aria-busy="true"
        aria-label="Loading product"
      >
        <div className="mx-auto aspect-[4/5] w-full max-w-[550px] animate-pulse rounded-2xl bg-[#F1EBE1]" />
        <div className="space-y-4 py-8">
          <div className="h-3 w-1/4 animate-pulse bg-[#F1EBE1]" />
          <div className="h-10 w-3/4 animate-pulse bg-[#F1EBE1]" />
          <div className="h-6 w-1/3 animate-pulse bg-[#F1EBE1]" />
          <div className="mt-8 h-24 animate-pulse bg-[#F1EBE1]" />
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="page-shell flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
        <Icon name="sparkle" className="size-8 text-[#B85042]" />
        <h1 className="serif-display mt-4 text-3xl">We couldn&apos;t find that treasure</h1>
        <p className="mt-2 text-sm text-[#6E655F]">
          It may have moved on to a new home.
        </p>
        <Link
          href="/products"
          className="mt-6 rounded-full bg-[#1E1B18] px-6 py-3 text-xs font-semibold tracking-[0.1em] text-white hover:bg-[#0A2B26]"
        >
          EXPLORE THE COLLECTION
        </Link>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="page-shell flex min-h-[65vh] flex-col items-center justify-center px-5 py-16 text-center">
        <h1 className="serif-display text-3xl">This little treasure is unavailable</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#6E655F]">
          {error ?? "We couldn’t load this product just now. Please try again later."}
        </p>
        <Link
          href="/products"
          className="mt-6 rounded-full bg-[#1E1B18] px-6 py-3 text-xs font-semibold tracking-[0.1em] text-white hover:bg-[#0A2B26]"
        >
          BACK TO THE COLLECTION
        </Link>
      </main>
    );
  }

  const images = product.images.length
    ? product.images
    : product.image
      ? [product.image]
      : [];
  const activeVideo =
    product.videos.find((video) => video.src === selectedVideo) ?? null;
  const available = product.stock > 0;
  const isWishlisted = wishlistIds.includes(product.id);
  const productCategory = product.category;
  const relatedProducts = productCategory
    ? catalogProducts
        .filter(
          (item) =>
            item.id !== product.id &&
            categoryMatches(item.category, productCategory),
        )
        .slice(0, 4)
    : [];

  function addProductToCart(productToAdd: ProductDetailsData) {
    addToCart(productToAdd, quantity);
    setNotice(`${quantity} ${quantity === 1 ? "item" : "items"} added to your bag.`);
  }

  function buyNow(productToBuy: ProductDetailsData) {
    addProductToCart(productToBuy);
    router.push("/checkout");
  }

  return (
    <main className="page-shell min-h-[65vh] pb-36 pt-8 sm:py-12 md:pb-12">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center text-xs text-[#6E655F]"
      >
        <Link href="/" className="hover:text-[#B85042]">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-[#B85042]">
          Collection
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#1E1B18]">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(350px,0.82fr)] lg:gap-10 xl:gap-14">
        <div className="mx-auto min-w-0 w-full max-w-[680px] lg:sticky lg:top-28 lg:self-start">
          {activeVideo ? (
            <video
              key={activeVideo.src}
              controls
              playsInline
              preload="metadata"
              poster={activeVideo.thumbnail ?? undefined}
              className="hidden aspect-[4/5] w-full rounded-xl bg-[#1E1B18] object-contain lg:block"
            >
              <source src={activeVideo.src} />
              Your browser does not support product video playback.
            </video>
          ) : images.length > 1 ? (
            <div className="hidden grid-cols-2 gap-2 lg:grid xl:gap-3" aria-label="Product image gallery">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-desktop-${index}`}
                  onClick={() => {
                    setSelectedImage(image);
                    setDesktopImageOpen(true);
                  }}
                  aria-label={`View product image ${index + 1} larger`}
                  className="group relative aspect-[0.88] overflow-hidden rounded-xl bg-[#F1EBE1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B85042]"
                >
                  <Image
                    src={image}
                    alt={`${product.name}, view ${index + 1}`}
                    fill
                    unoptimized
                    loading="eager"
                    sizes="(max-width: 1279px) 42vw, 36vw"
                    className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                  <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" />
                </button>
              ))}
            </div>
          ) : null}
          <div className={`product-gallery-main group relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#F1EBE1] ${images.length > 1 || activeVideo ? "lg:hidden" : ""}`}>
            {activeVideo ? (
              <video
                key={activeVideo.src}
                controls
                playsInline
                preload="metadata"
                poster={activeVideo.thumbnail ?? undefined}
                className="size-full bg-[#1f2522] object-contain"
              >
                <source src={activeVideo.src} />
                Your browser does not support product video playback.
              </video>
            ) : selectedImage ? (
              <>
                <Image
                  src={selectedImage}
                  alt={product.name}
                  fill
                  loading="eager"
                  unoptimized
                  sizes="(max-width: 1023px) 100vw, 50vw"
                  className={`object-contain transition-transform duration-300 ${imageZoomed ? "scale-150" : "scale-100"}`}
                />
                <button
                  type="button"
                  onClick={() => setImageZoomed((zoomed) => !zoomed)}
                  aria-label={
                    imageZoomed
                      ? "Reset product image zoom"
                      : "Zoom product image"
                  }
                  aria-pressed={imageZoomed}
                  className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-[#FAF7F2]/95 text-[#1E1B18] shadow-sm transition-colors hover:bg-white"
                >
                  <Icon name="search" className="size-4" />
                </button>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[#6E655F]">
                <Icon name="sparkle" className="size-8 text-[#B85042]" />
                <span className="text-xs">Image coming soon</span>
              </div>
            )}
          </div>

          {images.length + product.videos.length > 1 && (
            <div
              aria-label="Product media thumbnails"
              className={`mt-3 flex gap-2 overflow-x-auto pb-2 ${images.length > 1 && product.videos.length === 0 ? "lg:hidden" : ""}`}
            >
              {images.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  onClick={() => {
                    setSelectedImage(image);
                    setSelectedVideo(null);
                    setImageZoomed(false);
                  }}
                  aria-label={`View product image ${index + 1}`}
                  aria-pressed={selectedVideo === null && selectedImage === image}
                  className={`relative aspect-[4/5] w-[62px] shrink-0 overflow-hidden rounded-lg border-2 bg-[#F1EBE1] transition-colors sm:w-[72px] ${
                    selectedVideo === null && selectedImage === image
                      ? "border-[#1E1B18]"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    unoptimized
                    sizes="68px"
                    className="object-contain"
                  />
                </button>
              ))}
              {product.videos.map((video, index) => (
                <button
                  type="button"
                  key={`${video.src}-${index}`}
                  onClick={() => {
                    setSelectedVideo(video.src);
                    setImageZoomed(false);
                  }}
                  aria-label={`Play product video ${index + 1}`}
                  aria-pressed={selectedVideo === video.src}
                  className={`relative flex aspect-[4/5] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-[#1E1B18] text-white transition-colors sm:w-[72px] ${
                    selectedVideo === video.src
                      ? "border-[#1E1B18]"
                      : "border-transparent"
                  }`}
                >
                  {video.thumbnail && (
                    <Image
                      src={video.thumbnail}
                      alt=""
                      fill
                      unoptimized
                      sizes="66px"
                      className="object-cover opacity-65"
                    />
                  )}
                  <Icon name="play" className="relative z-10 size-5" />
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="flex min-w-0 w-full flex-col items-start self-start rounded-2xl border border-[#E3D8C9] bg-[#F1EBE1] p-5 sm:p-7 lg:sticky lg:top-28 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
          <p className="eyebrow">{product.category}</p>
          {product.productType && <p className="mt-2 text-xs text-[#6E655F]">{product.productType}</p>}
          <h1 className="serif-display mt-3 text-4xl leading-[1.05] sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-5 text-2xl font-medium text-[#1E1B18]">{formatPrice(product.price)}</p>
          {(product.isNewArrival || product.isFeatured) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.isNewArrival && (
                <span className="rounded-full bg-[#E8DCCB] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9A3F33]">
                  Just arrived
                </span>
              )}
              {product.isFeatured && (
                <span className="rounded-full bg-[#E8DCCB] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6E655F]">
                  Our favorite
                </span>
              )}
            </div>
          )}
          <p
            className={`mt-3 text-xs ${
              available ? "rounded-full bg-[#E8DCCB] px-3 py-1.5 text-[#6E655F]" : "rounded-full bg-[#E8DCCB] px-3 py-1.5 text-[#9A3F33]"
            }`}
          >
            {available ? `${product.stock} available` : "Currently unavailable"}
          </p>
          <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#6E655F]">
            {product.description || "No description has been added for this product yet."}
          </p>

          <div className="mt-6 flex w-full flex-wrap items-center gap-4">
            <div className="flex h-12 items-center rounded-full border border-[#E3D8C9] bg-[#FAF7F2]">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                disabled={!available || quantity <= 1}
                aria-label="Decrease quantity"
                className="flex size-11 items-center justify-center disabled:opacity-40"
              >
                <Icon name="minus" className="size-4" />
              </button>
              <span className="min-w-8 text-center text-sm" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) => Math.min(product.stock, current + 1))
                }
                disabled={!available || quantity >= product.stock}
                aria-label="Increase quantity"
                className="flex size-11 items-center justify-center disabled:opacity-40"
              >
                <Icon name="plus" className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => addProductToCart(product)}
              disabled={!available}
              className="hidden min-h-12 flex-1 rounded-full bg-[#B85042] px-6 text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#9A3F33] disabled:cursor-not-allowed disabled:opacity-50 md:flex md:items-center md:justify-center"
            >
              {available ? "ADD TO BAG" : "SOLD OUT"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => buyNow(product)}
            disabled={!available}
            className="mt-3 hidden min-h-12 w-full rounded-full border border-[#1E1B18] bg-[#FAF7F2] px-6 text-xs font-semibold tracking-[0.12em] text-[#1E1B18] transition-colors hover:bg-[#1E1B18] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:block"
          >
            BUY NOW
          </button>
          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            aria-pressed={isWishlisted}
            className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[#6E655F] transition-colors hover:text-[#9A3F33]"
          >
            <Icon
              name="heart"
              className={`size-4 ${isWishlisted ? "fill-[#B85042] text-[#1E1B18]" : ""}`}
            />
            {isWishlisted ? "SAVED TO WISHLIST" : "SAVE TO WISHLIST"}
          </button>
          <p className="mt-3 min-h-5 text-xs text-[#1E1B18]" aria-live="polite">
            {notice}
          </p>
        </section>
      </div>

      {desktopImageOpen && selectedImage && (
        <div className="fixed inset-0 z-[60] hidden items-center justify-center bg-[#1E1B18]/85 p-8 lg:flex" role="dialog" aria-modal="true" aria-label="Enlarged product image">
          <button type="button" className="absolute inset-0 cursor-zoom-out" onClick={() => setDesktopImageOpen(false)} aria-label="Dismiss enlarged image preview" />
          <div className="relative z-10 h-[min(86vh,900px)] w-[min(84vw,1100px)]">
            <Image src={selectedImage} alt={product.name} fill unoptimized sizes="84vw" className="object-contain" />
          </div>
          <button type="button" onClick={() => setDesktopImageOpen(false)} aria-label="Close enlarged image" className="absolute right-5 top-5 z-20 flex size-11 items-center justify-center rounded-full bg-[#FAF7F2] text-[#1E1B18] shadow-lg">
            <Icon name="close" className="size-5" />
          </button>
        </div>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-16 border-t border-[#E3D8C9] pt-10">
          <p className="eyebrow">A few more to love</p>
          <h2 className="serif-display mt-2 text-3xl">More in {product.category}</h2>
          <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      )}
      <div className="fixed inset-x-0 bottom-[calc(3.625rem+env(safe-area-inset-bottom))] z-30 border-t border-[#E3D8C9] bg-[#FAF7F2]/95 px-3 py-2 shadow-[0_-6px_24px_rgba(30,27,24,0.08)] backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => addProductToCart(product)}
            disabled={!available}
            className="min-h-11 rounded-lg border border-[#B85042] bg-[#FAF7F2] px-3 text-[10px] font-semibold tracking-[0.08em] text-[#9A3F33] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {available ? "ADD TO BAG" : "SOLD OUT"}
          </button>
          <button
            type="button"
            onClick={() => buyNow(product)}
            disabled={!available}
            className="min-h-11 rounded-lg bg-[#B85042] px-3 text-[10px] font-semibold tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            BUY NOW
          </button>
        </div>
      </div>
    </main>
  );
}
