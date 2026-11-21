"use client";

import ProductCard from "@/components/ProductCard";
import { useStorefront } from "@/components/StorefrontContext";
import { useProductCatalog } from "@/components/ProductCatalogContext";
import { categoryMatches } from "@/lib/category-presentation";

export default function NewArrivals() {
  const { searchTerm, selectedCategory } = useStorefront();
  const { newArrivals, loading } = useProductCatalog();
  const normalizedSearch = searchTerm.trim().toLowerCase();
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
      className="editorial-grain scroll-mt-8 bg-[#1E1B18] py-14 text-white sm:py-20"
    >
      <div className="page-shell">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow eyebrow-on-dark">Fresh from the collection</p>
            <h2 className="serif-display mt-2 text-4xl sm:text-5xl">
              Just arrived
            </h2>
          </div>
          <p className="max-w-[360px] text-sm leading-6 text-white/70">
            A first look at the latest pieces added to the store. Older pieces
            can also be highlighted here by the team.
          </p>
        </div>
        {loading ? (
          <div
            className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6"
            aria-label="Loading new arrivals"
            aria-busy="true"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} aria-hidden="true" className="animate-pulse">
                <div className="aspect-[0.79] bg-white/10" />
                <div className="mt-4 h-3 w-1/3 bg-white/10" />
                <div className="mt-2 h-4 w-2/3 bg-white/10" />
              </div>
            ))}
          </div>
        ) : visibleProducts.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
            {visibleProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
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
