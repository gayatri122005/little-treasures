"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Icon from "@/components/icons";
import { useStorefront } from "@/components/StorefrontContext";
import { useProductCatalog } from "@/components/ProductCatalogContext";
import { categoryMatches } from "@/lib/category-presentation";

export default function ShopFavorites() {
  const { searchTerm, selectedCategory } = useStorefront();
  const { featuredProducts, newArrivals, loading } = useProductCatalog();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const newArrivalIds = new Set(newArrivals.map((product) => product.id));
  const visibleProducts = featuredProducts.filter((product) => {
    if (newArrivalIds.has(product.id)) return false;
    const matchesSearch =
      !normalizedSearch ||
      `${product.name} ${product.category ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesCategory =
      !selectedCategory || categoryMatches(product.category, selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <section
      id="favorites"
      className="page-shell scroll-mt-8 py-14 sm:py-20"
      aria-labelledby="favorites-title"
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Picked with care</p>
          <h2 id="favorites-title" className="serif-display mt-2 text-4xl sm:text-5xl">
            Shop our favorites.
          </h2>
          <p className="mt-3 max-w-[440px] text-sm leading-6 text-[var(--muted)]">
            A few pieces our team has chosen to put in the spotlight.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex min-h-10 items-center gap-2 self-start text-xs font-semibold tracking-[0.08em] text-[var(--ink)] transition-colors hover:text-[var(--purple-dark)] sm:self-auto"
        >
          EXPLORE THE COLLECTION
          <Icon name="arrow" className="size-4" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} aria-hidden="true" className="animate-pulse">
              <div className="aspect-[0.82] rounded-2xl bg-[var(--surface-soft)]" />
              <div className="mt-4 h-3 w-1/3 rounded bg-[var(--surface-soft)]" />
              <div className="mt-2 h-4 w-2/3 rounded bg-[var(--surface-soft)]" />
            </div>
          ))}
        </div>
      ) : visibleProducts.length ? (
        <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
          {visibleProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-7 flex min-h-48 flex-col items-center justify-center rounded-2xl bg-[var(--surface-soft)] px-6 text-center">
          <Icon name="heart" className="size-7 text-[var(--purple)]" />
          <p className="serif-display mt-3 text-2xl">Our favorites are taking shape</p>
          <p className="mt-1 max-w-md text-sm leading-6 text-[var(--muted)]">
            Browse the collection while our team picks a few special pieces for this space.
          </p>
        </div>
      )}
    </section>
  );
}
