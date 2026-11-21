"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/catalog-types";
import {
  getCartSnapshot,
  getServerCartSnapshot,
  getServerWishlistSnapshot,
  getWishlistSnapshot,
  saveCartSnapshot,
  saveWishlistSnapshot,
  subscribeToStorefrontStorage,
  type CartItem,
} from "@/lib/storefront-storage";

type StorefrontContextValue = {
  cartItems: CartItem[];
  cartCount: number;
  wishlistIds: string[];
  wishlistProducts: Product[];
  wishlistCount: number;
  storageNotice: string;
  searchTerm: string;
  selectedCategory: string | null;
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string | null) => void;
  addToCart: (product: Product, quantity?: number) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  toggleWishlist: (product: Product) => void;
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
  const wishlistSnapshot = useSyncExternalStore(
    subscribeToStorefrontStorage,
    getWishlistSnapshot,
    getServerWishlistSnapshot,
  );
  const cartItems = cartSnapshot.items;
  const wishlistProducts = wishlistSnapshot.products;
  const [storageWriteNotice, setStorageWriteNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const wishlistIds = wishlistProducts.map((product) => product.id);
  const storageNotice =
    storageWriteNotice || cartSnapshot.notice || wishlistSnapshot.notice;

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

    function updateWishlist(update: (current: Product[]) => Product[]) {
      try {
        saveWishlistSnapshot(update(getWishlistSnapshot().products));
        setStorageWriteNotice("");
      } catch (error) {
        console.error("Wishlist could not be saved:", error);
        setStorageWriteNotice("Your wishlist could not be saved on this browser.");
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

    function toggleWishlist(product: Product) {
      updateWishlist((current) =>
        current.some((item) => item.id === product.id)
          ? current.filter((item) => item.id !== product.id)
          : [...current, product],
      );
    }

    return {
      cartItems,
      cartCount: cartItems.reduce((total, item) => total + item.quantity, 0),
      wishlistIds,
      wishlistProducts,
      wishlistCount: wishlistProducts.length,
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
