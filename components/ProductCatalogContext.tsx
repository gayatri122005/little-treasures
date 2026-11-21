"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  catalogResponseSchema,
  type Product,
} from "@/lib/catalog-types";

type CatalogContextValue = {
  products: Product[];
  newArrivals: Product[];
  featuredProducts: Product[];
  loading: boolean;
  error: string | null;
  retry: () => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function ProductCatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const [popularResponse, newArrivalsResponse, featuredResponse] = await Promise.all([
          fetch("/api/products?limit=48&sort=popular", {
            signal: controller.signal,
          }),
          fetch("/api/products?limit=8&sort=newest&newArrival=true&home=true", {
            signal: controller.signal,
          }),
          fetch("/api/products?limit=8&sort=popular&featured=true&home=true", {
            signal: controller.signal,
          }),
        ]);
        const [popularPayload, newArrivalsPayload, featuredPayload]: unknown[] =
          await Promise.all([
            popularResponse.json(),
            newArrivalsResponse.json(),
            featuredResponse.json(),
          ]);
        const popularResult = catalogResponseSchema.safeParse(popularPayload);
        const newArrivalsResult =
          catalogResponseSchema.safeParse(newArrivalsPayload);
        const featuredResult = catalogResponseSchema.safeParse(featuredPayload);

        if (!popularResponse.ok || !popularResult.success) {
          throw new Error(
            "The product collection is temporarily unavailable.",
          );
        }
        if (!newArrivalsResponse.ok || !newArrivalsResult.success) {
          throw new Error("New arrivals are temporarily unavailable.");
        }
        if (!featuredResponse.ok || !featuredResult.success) {
          throw new Error("Featured products are temporarily unavailable.");
        }

        setProducts(popularResult.data.products);
        setNewArrivals(newArrivalsResult.data.products);
        setFeaturedProducts(featuredResult.data.products);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        setProducts([]);
        setNewArrivals([]);
        setFeaturedProducts([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "The product collection is temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProducts();
    return () => controller.abort();
  }, [attempt]);

  const value = useMemo(
    () => ({ products, newArrivals, featuredProducts, loading, error, retry }),
    [products, newArrivals, featuredProducts, loading, error, retry],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useProductCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useProductCatalog must be used inside ProductCatalogProvider.");
  }
  return context;
}
