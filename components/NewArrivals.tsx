"use client";

import ProductCard from "@/components/ProductCard";
import { useStorefront } from "@/components/StorefrontContext";
import { useProductCatalog } from "@/components/ProductCatalogContext";
import { categoryMatches } from "@/lib/category-presentation";
import Icon from "@/components/icons";
import { useRef } from "react";

export default function NewArrivals() {
  const { searchTerm, selectedCategory } = useStorefront();
  const { newArrivals, loading } = useProductCatalog();
  const railRef = useRef<HTMLDivElement>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  function scrollArrivals(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: "smooth" });
  }
  const visibleProducts = newArrivals.filter((product) => {
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
      id="new-arrivals"
      className="editorial-grain scroll-mt-8 bg-[#1E1B18] py-12 text-white sm:py-16"
    >
      <div className="page-shell">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow eyebrow-on-dark">Fresh from the collection</p>
            <h2 className="serif-display mt-2 text-4xl sm:text-5xl">
              Just arrived
            </h2>
          </div>
          <div className="flex items-end justify-between gap-4 sm:justify-end">
            <p className="max-w-[360px] text-sm leading-6 text-white/70">
              A first look at recently added pieces from across the collection.
            </p>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollArrivals(-1)}
                aria-label="Scroll new arrivals left"
                className="flex size-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
              >
                <Icon name="arrow" className="size-4 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => scrollArrivals(1)}
                aria-label="Scroll new arrivals right"
                className="flex size-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
              >
                <Icon name="arrow" className="size-4" />
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <div
            className="horizontal-rail mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
            aria-label="Loading new arrivals"
            aria-busy="true"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} aria-hidden="true" className="w-[72vw] max-w-[260px] min-w-[190px] shrink-0 snap-start animate-pulse sm:w-[240px]">
                <div className="aspect-[0.79] bg-white/10" />
                <div className="mt-4 h-3 w-1/3 bg-white/10" />
                <div className="mt-2 h-4 w-2/3 bg-white/10" />
              </div>
            ))}
          </div>
        ) : visibleProducts.length ? (
          <div
            ref={railRef}
            className="horizontal-rail mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 sm:gap-5"
            aria-label="Recently added products"
          >
            {visibleProducts.slice(0, 12).map((product) => (
              <div key={product.id} className="w-[72vw] max-w-[260px] min-w-[190px] shrink-0 snap-start sm:w-[240px]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-8 bg-white/10 p-8 text-center text-sm text-white/80">
            No new arrivals are featured just yet. Check back soon or explore
            the full collection.
          </p>
        )}
      </div>
    </section>
  );
}
