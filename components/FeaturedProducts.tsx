"use client";

import ProductCard from "@/components/ProductCard";
import { useStorefront } from "@/components/StorefrontContext";
import { useProductCatalog } from "@/components/ProductCatalogContext";
import { categories, categoryMatches } from "@/lib/category-presentation";
import Icon from "@/components/icons";

function ProductSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="aspect-[0.79] bg-[#F1EBE1]" />
      <div className="mt-4 h-3 w-1/3 bg-[#F1EBE1]" />
      <div className="mt-2 h-4 w-2/3 bg-[#F1EBE1]" />
      <div className="mt-3 h-3 w-1/4 bg-[#F1EBE1]" />
    </div>
  );
}

export default function FeaturedProducts() {
  const {
    searchTerm,
    selectedCategory,
    setSelectedCategory,
    setSearchTerm,
  } = useStorefront();
  const { products, loading, error, retry } = useProductCatalog();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchingProducts = products.filter((product) => {
    const matchesSearch =
      !normalizedSearch ||
      `${product.name} ${product.category ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesCategory =
      !selectedCategory || categoryMatches(product.category, selectedCategory);
    return matchesSearch && matchesCategory;
  });
  const hasFilters = Boolean(normalizedSearch || selectedCategory);
  const homepageProducts = products.filter((product) => product.showOnHomepage);
  const byCategory = categories
    .map((category) =>
      homepageProducts.find((product) =>
        categoryMatches(product.category, category.name),
      ),
    )
    .filter((product): product is (typeof products)[number] => Boolean(product));
  const visibleProducts = hasFilters
    ? matchingProducts
    : [...byCategory, ...homepageProducts.filter((product) => !byCategory.includes(product))]
        .slice(0, 4);

  return (
    <section id="featured" className="page-shell scroll-mt-8 py-14 sm:py-20">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">A thoughtful collection</p>
          <h2 className="serif-display mt-2 text-4xl sm:text-5xl">
            {normalizedSearch
              ? "Your little finds"
              : selectedCategory ?? "Shop all collections"}
          </h2>
          <p className="mt-3 max-w-[440px] text-sm leading-6 text-[#6E655F]">
            {normalizedSearch
              ? `A little look at what we found for “${searchTerm.trim()}”.`
              : selectedCategory
                ? `A closer look at our ${selectedCategory.toLowerCase()} collection.`
                : "Featured pieces from Home & Decor, Kids Wear, and Fashion & Hair Accessories."}
          </p>
        </div>
        <a
          href="/products"
          className="inline-flex min-h-10 items-center gap-2 self-start text-xs font-semibold tracking-[0.08em] text-[#1E1B18] hover:text-[#9A3F33] sm:self-auto"
        >
          VIEW THE FULL COLLECTION
          <Icon name="arrow" className="size-4" />
        </a>
      </div>

      <div className="mt-7 flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory(null);
            setSearchTerm("");
          }}
          aria-pressed={selectedCategory === null && !normalizedSearch}
          className={`min-h-9 shrink-0 rounded-full border px-4 text-[10px] font-medium tracking-[0.08em] transition-colors ${
            selectedCategory === null && !normalizedSearch
              ? "border-[#1E1B18] bg-[#1E1B18] text-white"
              : "border-[#E3D8C9] text-[#6E655F] hover:border-[#B85042]"
          }`}
        >
          ALL COLLECTIONS
        </button>
        {categories.map((category) => (
          <button
            key={category.name}
            type="button"
            onClick={() => setSelectedCategory(category.name)}
            aria-pressed={selectedCategory === category.name}
            className={`min-h-9 shrink-0 rounded-full border px-4 text-[10px] font-medium tracking-[0.08em] transition-colors ${
              selectedCategory === category.name
                ? "border-[#1E1B18] bg-[#1E1B18] text-white"
                : "border-[#E3D8C9] text-[#6E655F] hover:border-[#B85042]"
            }`}
          >
            {category.name.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6"
          aria-label="Loading products"
          aria-busy="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <ProductSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <div
          className="mt-6 flex min-h-56 flex-col items-center justify-center bg-[#F1EBE1] px-6 text-center"
          role="alert"
        >
          <p className="serif-display text-2xl">The collection is taking a moment</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#6E655F]">
            {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-5 rounded-full bg-[#1E1B18] px-5 py-3 text-[10px] font-semibold tracking-[0.12em] text-white hover:bg-[#0A2B26]"
          >
            TRY AGAIN
          </button>
        </div>
      ) : visibleProducts.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex min-h-56 flex-col items-center justify-center bg-[#F1EBE1] px-6 text-center">
          <Icon name="search" className="size-7 text-[#B85042]" />
          <p className="serif-display mt-3 text-2xl">
        {hasFilters
          ? "Nothing found just yet"
          : products.length
            ? "More lovely finds are on their way"
            : "A collection in the making"}
          </p>
          <p className="mt-1 max-w-md text-sm leading-6 text-[#6E655F]">
        {hasFilters
              ? "Try another search or choose a different category."
          : "Explore the latest arrivals and our team’s favorites while we put together this collection."}
          </p>
          {(normalizedSearch || selectedCategory) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory(null);
              }}
              className="mt-4 text-xs font-semibold text-[#1E1B18] underline underline-offset-4"
            >
              CLEAR FILTERS
            </button>
          )}
        </div>
      )}
    </section>
  );
}
