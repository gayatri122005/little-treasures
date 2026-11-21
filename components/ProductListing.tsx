"use client";

import { useEffect, useState, type FormEvent } from "react";
import ProductCard from "@/components/ProductCard";
import { useStorefront } from "@/components/StorefrontContext";
import {
  paginatedCatalogResponseSchema,
  type Product,
} from "@/lib/catalog-types";
import { categories, categoryMatches } from "@/lib/category-presentation";
import Icon from "@/components/icons";

const pageSize = 12;

export default function ProductListing({
  initialSearchTerm,
  initialCategory,
}: {
  initialSearchTerm: string;
  initialCategory: string;
}) {
  const { searchTerm, setSearchTerm, selectedCategory, setSelectedCategory } =
    useStorefront();
  const [products, setProducts] = useState<Product[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");
  const [availability, setAvailability] = useState("all");
  const [collectionTag, setCollectionTag] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
    setSelectedCategory(initialCategory || null);
  }, [initialSearchTerm, initialCategory, setSearchTerm, setSelectedCategory]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sort,
      });
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      if (selectedCategory) params.set("category", selectedCategory);
      if (appliedMinPrice) params.set("minPrice", appliedMinPrice);
      if (appliedMaxPrice) params.set("maxPrice", appliedMaxPrice);
      if (availability !== "all") params.set("availability", availability);
      if (collectionTag === "new-arrivals") params.set("newArrival", "true");
      if (collectionTag === "favorites") params.set("featured", "true");

      try {
        const response = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        const result = paginatedCatalogResponseSchema.safeParse(payload);
        if (!response.ok || !result.success) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "message" in payload &&
            typeof payload.message === "string"
              ? payload.message
              : "The product collection is temporarily unavailable.";
          throw new Error(message);
        }

        setProducts(result.data.products);
        setPageCount(result.data.pagination.pageCount);
        setTotal(result.data.pagination.total);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setProducts([]);
        setPageCount(0);
        setTotal(0);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "The product collection is temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    searchTerm,
    selectedCategory,
    appliedMinPrice,
    appliedMaxPrice,
    availability,
    collectionTag,
    sort,
    page,
    requestVersion,
  ]);

  function applyPriceFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextMinPrice = minPrice.trim();
    const nextMaxPrice = maxPrice.trim();
    if (
      (nextMinPrice && !Number.isFinite(Number(nextMinPrice))) ||
      (nextMaxPrice && !Number.isFinite(Number(nextMaxPrice))) ||
      (nextMinPrice && Number(nextMinPrice) < 0) ||
      (nextMaxPrice && Number(nextMaxPrice) < 0) ||
      (nextMinPrice &&
        nextMaxPrice &&
        Number(nextMinPrice) > Number(nextMaxPrice))
    ) {
      setError("Enter a valid price range. The minimum cannot exceed the maximum.");
      return;
    }

    setAppliedMinPrice(nextMinPrice);
    setAppliedMaxPrice(nextMaxPrice);
    setPage(1);
    setError(null);
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedCategory(null);
    setMinPrice("");
    setMaxPrice("");
    setAppliedMinPrice("");
    setAppliedMaxPrice("");
    setAvailability("all");
    setCollectionTag("all");
    setSort("newest");
    setPage(1);
  }

  const selectedCategoryInfo = selectedCategory
    ? categories.find((category) => categoryMatches(category.name, selectedCategory))
    : null;

  return (
    <main className="page-shell min-h-[65vh] py-6 sm:py-10">
      <header className="relative overflow-hidden rounded-3xl bg-[#F1EBE1] px-5 py-8 sm:px-10 sm:py-11">
        <p className="eyebrow">Take your time, find your thing</p>
        <h1 className="serif-display mt-2 text-4xl sm:text-5xl">
          {selectedCategory ?? "All the good things"}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#6E655F]">
          {selectedCategoryInfo?.description ??
            "Thoughtful finds from all four collections. Search, filter, and take a closer look at anything that catches your eye."}
        </p>
        <span className="pointer-events-none absolute -right-4 -top-8 hidden size-44 rounded-full border border-white/60 sm:block" />
        <span className="pointer-events-none absolute -right-1 -top-1 hidden size-32 rounded-full border border-white/60 sm:block" />
      </header>

      <div className="grid gap-6 py-6 sm:py-8 lg:grid-cols-[250px_1fr] lg:gap-8">
        <aside className="h-fit space-y-6 rounded-2xl border border-[#E3D8C9] bg-[#FFFFFF] p-4 sm:p-5 lg:sticky lg:top-28">
          <div>
            <label
              htmlFor="catalog-search"
              className="text-xs font-semibold tracking-[0.08em]"
            >
              SEARCH THE COLLECTION
            </label>
            <div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-[#E3D8C9] bg-white px-3">
              <Icon name="search" className="size-4 text-[#6E655F]" />
              <input
                id="catalog-search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="What are you looking for?"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6E655F]"
              />
            </div>
          </div>

          <fieldset>
            <legend className="text-xs font-semibold tracking-[0.08em]">
              CATEGORY
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setPage(1);
                }}
                aria-pressed={!selectedCategory}
                className={`min-h-10 px-3 text-left text-sm transition-colors ${
                  !selectedCategory
                    ? "rounded-lg bg-[#1E1B18] text-white"
                    : "rounded-lg bg-[#FFFFFF] text-[#6E655F] hover:bg-[#F1EBE1]"
                }`}
              >
                All categories
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.name}
                  onClick={() => {
                    setSelectedCategory(category.name);
                    setPage(1);
                  }}
                  aria-pressed={selectedCategory === category.name}
                  className={`min-h-10 px-3 text-left text-sm transition-colors ${
                    selectedCategory === category.name
                      ? "rounded-lg bg-[#1E1B18] text-white"
                      : "rounded-lg bg-[#FFFFFF] text-[#6E655F] hover:bg-[#F1EBE1]"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </fieldset>

          <label
            htmlFor="collection-tag-filter"
            className="block text-xs font-semibold tracking-[0.08em]"
          >
            COLLECTION
            <select
              id="collection-tag-filter"
              value={collectionTag}
              onChange={(event) => {
                setCollectionTag(event.target.value);
                setPage(1);
              }}
              className="mt-3 min-h-10 w-full rounded-lg border border-[#E3D8C9] bg-white px-3 text-sm font-normal tracking-normal"
            >
              <option value="all">All products</option>
              <option value="new-arrivals">Just arrived</option>
              <option value="favorites">Shop our favorites</option>
            </select>
          </label>

          <form onSubmit={applyPriceFilter}>
            <p className="text-xs font-semibold tracking-[0.08em]">
              PRICE RANGE (₹)
            </p>
            <div className="mt-3 flex items-center gap-2">
              <label className="sr-only" htmlFor="minimum-price">
                Minimum price
              </label>
              <input
                id="minimum-price"
                type="number"
                min="0"
                step="1"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Min"
                className="h-10 min-w-0 w-full rounded-lg border border-[#E3D8C9] bg-white px-3 text-sm"
              />
              <span className="text-[#6E655F]">–</span>
              <label className="sr-only" htmlFor="maximum-price">
                Maximum price
              </label>
              <input
                id="maximum-price"
                type="number"
                min="0"
                step="1"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Max"
                className="h-10 min-w-0 w-full rounded-lg border border-[#E3D8C9] bg-white px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              className="mt-3 min-h-10 w-full rounded-lg border border-[#1E1B18] text-xs font-semibold tracking-[0.08em] text-[#1E1B18] transition-colors hover:bg-[#1E1B18] hover:text-white"
            >
              APPLY PRICE
            </button>
          </form>

          <label
            htmlFor="availability-filter"
            className="block text-xs font-semibold tracking-[0.08em]"
          >
            AVAILABILITY
            <select
              id="availability-filter"
              value={availability}
              onChange={(event) => {
                setAvailability(event.target.value);
                setPage(1);
              }}
              className="mt-3 min-h-10 w-full rounded-lg border border-[#E3D8C9] bg-white px-3 text-sm font-normal tracking-normal"
            >
              <option value="all">All products</option>
              <option value="in-stock">In stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
          </label>

          {(searchTerm ||
            selectedCategory ||
            appliedMinPrice ||
            appliedMaxPrice ||
            availability !== "all" ||
            collectionTag !== "all") && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[#B85042] underline underline-offset-4"
            >
              CLEAR ALL FILTERS
            </button>
          )}
        </aside>

        <section aria-label="Product results">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#6E655F]" aria-live="polite">
              {loading
                ? "Finding your good things…"
                : `${total} ${total === 1 ? "piece" : "pieces"}`}
            </p>
            <label className="flex items-center gap-2 text-xs text-[#6E655F]">
              SORT BY
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                className="min-h-10 rounded-lg border border-[#E3D8C9] bg-white px-3 text-xs text-[#1E1B18]"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="popular">Most popular</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4"
              aria-busy="true"
              aria-label="Loading products"
            >
              {Array.from({ length: pageSize }, (_, index) => (
                <div key={index} aria-hidden="true" className="animate-pulse">
                  <div className="aspect-[0.82] rounded-2xl bg-[#F1EBE1]" />
                  <div className="mt-4 h-3 w-1/3 rounded bg-[#F1EBE1]" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-[#F1EBE1]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="bg-[#F1EBE1] px-6 py-12 text-center">
              <h2 className="serif-display text-2xl">
                The collection is taking a moment
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6E655F]">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setRequestVersion((version) => version + 1)}
                className="mt-5 rounded-full bg-[#1E1B18] px-5 py-3 text-[10px] font-semibold tracking-[0.12em] text-white hover:bg-[#0A2B26]"
              >
                TRY AGAIN
              </button>
            </div>
          ) : products.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 xl:grid-cols-4 xl:gap-x-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {pageCount > 1 && (
                <nav
                  aria-label="Product pages"
                  className="mt-10 flex items-center justify-center gap-3"
                >
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="min-h-10 rounded-full border border-[#E3D8C9] bg-white px-5 text-xs transition-colors hover:border-[#1E1B18] disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[#6E655F]">
                    Page {page} of {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => setPage((current) => current + 1)}
                    className="min-h-10 rounded-full border border-[#E3D8C9] bg-white px-5 text-xs transition-colors hover:border-[#1E1B18] disabled:opacity-40"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="bg-[#F1EBE1] px-6 py-12 text-center">
              <Icon name="search" className="mx-auto size-7 text-[#B85042]" />
              <h2 className="serif-display mt-3 text-2xl">
                Nothing found just yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6E655F]">
                Try another search or clear a filter to explore the collection.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-xs font-semibold text-[#1E1B18] underline underline-offset-4"
              >
                CLEAR FILTERS
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}