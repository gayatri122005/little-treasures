"use client";

import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/catalog-types";
import {
  getCartSnapshot,
  getServerCartSnapshot,
  saveCartSnapshot,
  subscribeToStorefrontStorage,
  type CartItem,
} from "@/lib/storefront-storage";
import { usePathname, useRouter } from "next/navigation";

type StorefrontContextValue = {
  cartItems: CartItem[];
  cartCount: number;
  wishlistIds: string[];
  wishlistProducts: Product[];
  wishlistCount: number;
  wishlistLoading: boolean;
  wishlistError: string | null;
  wishlistNotice: string;
  storageNotice: string;
  searchTerm: string;
  selectedCategory: string | null;
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string | null) => void;
  addToCart: (product: Product, quantity?: number) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  toggleWishlist: (product: Product) => Promise<void>;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function StorefrontProvider({
  children,
  initialSearchTerm = "",
}: {
  children: ReactNode;
  initialSearchTerm?: string;
}) {
  const cartSnapshot = useSyncExternalStore(
    subscribeToStorefrontStorage,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const cartItems = cartSnapshot.items;
  const router = useRouter();
  const pathname = usePathname();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [wishlistNotice, setWishlistNotice] = useState("");
  const [wishlistPendingIds, setWishlistPendingIds] = useState<string[]>([]);
  const [storageWriteNotice, setStorageWriteNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function loadWishlist() {
      setWishlistLoading(true);
      try {
        const response = await fetch("/api/account/wishlist", { credentials: "same-origin", cache: "no-store" });
        const payload = await response.json() as { products?: Product[]; message?: string };
        if (response.status === 401) { setWishlistProducts([]); setWishlistError(null); return; }
        if (!response.ok || !Array.isArray(payload.products)) throw new Error(payload.message ?? "Your wishlist is temporarily unavailable.");
        setWishlistProducts(payload.products); setWishlistError(null);
      } catch (error) { setWishlistError(error instanceof Error ? error.message : "Your wishlist is temporarily unavailable."); }
      finally { setWishlistLoading(false); }
    }
    void loadWishlist();
    const refresh = () => void loadWishlist();
    window.addEventListener("omtreasure:auth-changed", refresh);
    return () => window.removeEventListener("omtreasure:auth-changed", refresh);
  }, []);

  const wishlistIds = wishlistProducts.map((product) => product.id);
  const storageNotice = storageWriteNotice || cartSnapshot.notice;

  const value = useMemo<StorefrontContextValue>(() => {
    function updateCart(update: (current: CartItem[]) => CartItem[]) {
      try {
        saveCartSnapshot(update(getCartSnapshot().items));
        setStorageWriteNotice("");
      } catch (error) {
        console.error("Bag could not be saved:", error);
        setStorageWriteNotice("Your bag could not be saved on this browser.");
      }
    }

    function addToCart(product: Product, quantity = 1) {
      if (product.stock <= 0) return;
      updateCart((current) => {
        const existing = current.find((item) => item.product.id === product.id);
        if (existing) {
          return current.map((item) =>
            item.product.id === product.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + quantity, product.stock),
                }
              : item,
          );
        }
        return [
          ...current,
          { product, quantity: Math.max(1, Math.min(quantity, product.stock)) },
        ];
      });
    }

    function setCartQuantity(productId: string, quantity: number) {
      if (!Number.isInteger(quantity) || quantity < 1) return;
      updateCart((current) =>
        current.map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.max(1, Math.min(quantity, item.product.stock)),
              }
            : item,
        ),
      );
    }

    function removeFromCart(productId: string) {
      updateCart((current) =>
        current.filter((item) => item.product.id !== productId),
      );
    }

    async function toggleWishlist(product: Product) {
      if (wishlistPendingIds.includes(product.id)) return;
      let authenticatedResponse: Response;
      try {
        authenticatedResponse = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
      } catch {
        setWishlistNotice("We could not check your sign-in status. Please try again.");
        return;
      }
      if (!authenticatedResponse.ok) { router.push(`/signin?redirect=${encodeURIComponent(pathname)}`); return; }
      const removing = wishlistProducts.some((item) => item.id === product.id);
      const previous = wishlistProducts;
      setWishlistPendingIds((ids) => [...ids, product.id]);
      setWishlistProducts(removing ? previous.filter((item) => item.id !== product.id) : [...previous, product]);
      try {
        const response = await fetch("/api/account/wishlist", { method: removing ? "DELETE" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id }) });
        const payload = await response.json() as { products?: Product[]; message?: string };
        if (!response.ok || !Array.isArray(payload.products)) throw new Error(payload.message ?? "Your wishlist could not be updated.");
        setWishlistProducts(payload.products); setWishlistNotice(removing ? "Removed from your wishlist." : "Saved to your wishlist.");
        window.setTimeout(() => setWishlistNotice(""), 1800);
      } catch (error) { setWishlistProducts(previous); setWishlistNotice(error instanceof Error ? error.message : "Your wishlist could not be updated."); }
      finally { setWishlistPendingIds((ids) => ids.filter((id) => id !== product.id)); }
    }

    return {
      cartItems,
      cartCount: cartItems.reduce((total, item) => total + item.quantity, 0),
      wishlistIds,
      wishlistProducts,
      wishlistCount: wishlistProducts.length,
      wishlistLoading,
      wishlistError,
      wishlistNotice,
      storageNotice,
      searchTerm,
      selectedCategory,
      setSearchTerm,
      setSelectedCategory,
      addToCart,
      setCartQuantity,
      removeFromCart,
      toggleWishlist,
    };
  }, [
    cartItems,
    wishlistIds,
    wishlistProducts,
    storageNotice,
    searchTerm,
    selectedCategory,
    wishlistLoading,
    wishlistError,
    wishlistNotice,
    wishlistPendingIds,
    router,
    pathname,
  ]);

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error("useStorefront must be used inside StorefrontProvider.");
  }
  return context;
}
