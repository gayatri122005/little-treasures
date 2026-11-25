"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/catalog-types";
import Icon from "@/components/icons";
import { useStorefront } from "@/components/StorefrontContext";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);
}

export default function ProductCard({
  product,
  layout = "grid",
}: {
  product: Product;
  layout?: "grid" | "feature";
}) {
  const { addToCart, wishlistIds, toggleWishlist } = useStorefront();
  const [added, setAdded] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const favorite = wishlistIds.includes(product.id);

  function handleAdd() {
    if (product.stock <= 0) return;
    addToCart(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1300);
  }

  return (
    <>
      <article className={`product-card group min-w-0 overflow-hidden rounded-2xl border border-[#E3D8C9] bg-[#F1EBE1] transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(30,27,24,0.09)] ${layout === "feature" ? "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""}`}>
      <div className={`product-image relative aspect-[4/5] overflow-hidden bg-[#E8DCCB] ${layout === "feature" ? "sm:aspect-auto sm:min-h-[360px]" : ""}`}>
        {product.image ? (
          <Link
            href={`/product/${encodeURIComponent(product.id)}`}
            aria-label={`View ${product.name}`}
            className="absolute inset-0"
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              loading={layout === "feature" ? "eager" : "lazy"}
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 280px"
              className="object-contain"
            />
          </Link>
        ) : (
          <Link
            href={`/product/${encodeURIComponent(product.id)}`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#6E655F]"
            aria-label={`View ${product.name}`}
          >
            <Icon name="sparkle" className="size-7 text-[#B85042]" />
            <span className="text-[10px] uppercase tracking-[0.12em]">
              Image coming soon
            </span>
          </Link>
        )}
        {product.status === "out_of_stock" && (
          <span className="absolute left-3 top-14 rounded-full bg-[#FAF7F2]/95 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6E655F] shadow-sm">
            Out of stock
          </span>
        )}
        {(product.isNewArrival || product.isFeatured) && (
          <div className="absolute left-3 top-[52px] flex flex-wrap gap-1">
            {product.isNewArrival && (
              <span className="rounded-full bg-[#FAF7F2]/95 px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#9A3F33] shadow-sm">
                Just arrived
              </span>
            )}
            {product.isFeatured && (
              <span className="rounded-full bg-[#FAF7F2]/95 px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#6E655F] shadow-sm">
                Our favorite
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setQuickViewOpen(true)}
          aria-label={`Quick view ${product.name}`}
          className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full bg-[#FAF7F2]/95 shadow-sm transition-colors hover:bg-[#F1EBE1]"
        >
          <Icon name="search" className="size-4 text-[#1E1B18]" />
        </button>
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={
            favorite
              ? `Remove ${product.name} from favorites`
              : `Add ${product.name} to favorites`
          }
          aria-pressed={favorite}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-[#FAF7F2]/95 shadow-sm transition-transform hover:scale-105"
        >
          <Icon
            name="heart"
            className={`size-[17px] ${
              favorite ? "fill-[#B85042] text-[#1E1B18]" : "text-[#6E655F]"
            }`}
          />
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={product.stock <= 0}
          className="absolute bottom-3 left-3 right-3 hidden min-h-10 items-center justify-center gap-2 rounded-full bg-[#B85042] px-2 text-[10px] font-semibold tracking-[0.1em] text-white shadow-md transition-all hover:bg-[#9A3F33] disabled:cursor-not-allowed disabled:opacity-65 sm:flex sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100"
        >
          <Icon
            name={added ? "sparkle" : "plus"}
            className="size-4"
          />
          {product.stock <= 0
            ? "SOLD OUT"
            : added
              ? "ADDED TO YOUR BAG"
              : "ADD TO BAG"}
        </button>
      </div>
      <div className={`px-3 pb-3.5 pt-3 sm:px-4 sm:pb-4 ${layout === "feature" ? "sm:flex sm:flex-col sm:justify-center sm:p-8 lg:p-12" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {product.category && (
              <p className="text-[9px] uppercase tracking-[0.14em] text-[#6E655F]">
                {product.category}
              </p>
            )}
            <h3 className="mt-1 min-h-10 text-[13px] font-medium leading-5 text-[#1E1B18] sm:text-sm">
              <Link
                href={`/product/${encodeURIComponent(product.id)}`}
                className="transition-colors hover:text-[#B85042]"
              >
                {product.name}
              </Link>
            </h3>
          </div>
          <p className="shrink-0 pt-3 text-[12px] font-semibold text-[#1E1B18] sm:text-sm">
            {formatPrice(product.price)}
          </p>
        </div>
        <div className="mt-1 text-[10px] text-[#6E655F]">
          {product.stock > 0 ? `${product.stock} available` : "Currently unavailable"}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={product.stock <= 0}
          className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#B85042] text-[10px] font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#9A3F33] disabled:cursor-not-allowed disabled:opacity-55 sm:hidden"
        >
          <Icon name={added ? "sparkle" : "plus"} className="size-4" />
          {product.stock <= 0
            ? "SOLD OUT"
            : added
              ? "ADDED TO BAG"
              : "ADD TO BAG"}
        </button>
      </div>
      </article>
      {quickViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211f1b]/50 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setQuickViewOpen(false)}
            aria-label="Close quick view"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`quick-view-title-${product.id}`}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuickViewOpen(false);
            }}
            tabIndex={-1}
            className="relative grid max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#FAF7F2] shadow-2xl sm:grid-cols-2"
          >
            <div className="relative aspect-square bg-[#F1EBE1] sm:aspect-auto sm:min-h-[380px]">
              {product.image && (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-contain"
                />
              )}
            </div>
            <div className="flex flex-col items-start p-6 sm:p-8">
              <button
                type="button"
                onClick={() => setQuickViewOpen(false)}
                aria-label="Close quick view"
                className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full bg-white/95 text-[#1E1B18] shadow-sm hover:bg-[#F1EBE1]"
              >
                <Icon name="close" className="size-5" />
              </button>
              <p className="eyebrow">{product.category}</p>
              <h2
                id={`quick-view-title-${product.id}`}
                className="serif-display mt-3 pr-7 text-3xl"
              >
                {product.name}
              </h2>
              <p className="mt-4 text-xl font-semibold text-[#1E1B18]">
                {formatPrice(product.price)}
              </p>
              <p className="mt-3 text-xs text-[#6E655F]">
                {product.stock > 0
                  ? `${product.stock} available`
                  : "Currently unavailable"}
              </p>
              <p className="mt-5 line-clamp-5 text-sm leading-6 text-[#6E655F]">
                {product.description || "No description has been added for this product yet."}
              </p>
              <button
                type="button"
                onClick={() => {
                  handleAdd();
                  setQuickViewOpen(false);
                }}
                disabled={product.stock <= 0}
                className="mt-7 min-h-12 w-full rounded-full bg-[#B85042] px-5 text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#9A3F33] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {product.stock > 0 ? "ADD TO BAG" : "SOLD OUT"}
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                aria-pressed={favorite}
                className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[#6E655F] hover:text-[#9A3F33]"
              >
                <Icon
                  name="heart"
                  className={`size-4 ${favorite ? "fill-[#B85042] text-[#1E1B18]" : ""}`}
                />
                {favorite ? "SAVED TO WISHLIST" : "SAVE TO WISHLIST"}
              </button>
              <Link
                href={`/product/${encodeURIComponent(product.id)}`}
                onClick={() => setQuickViewOpen(false)}
                className="mt-auto pt-5 text-xs font-semibold tracking-[0.08em] text-[#1E1B18] underline underline-offset-4 hover:text-[#9A3F33]"
              >
                VIEW FULL DETAILS
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
