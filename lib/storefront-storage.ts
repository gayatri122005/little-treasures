"use client";

import { z } from "zod";
import { productSchema, type Product } from "@/lib/catalog-types";

export type CartItem = {
  product: Product;
  quantity: number;
};

export type CartSnapshot = {
  items: CartItem[];
  notice: string;
};

export type WishlistSnapshot = {
  products: Product[];
  notice: string;
};

const cartStorageKey = "little-treasures.cart.v1";
const wishlistStorageKey = "little-treasures.wishlist.v1";
const storageEventName = "little-treasures:storage";

const cartStorageSchema = z.array(
  z.object({
    product: productSchema,
    quantity: z.number().int().positive(),
  }),
);
const wishlistStorageSchema = z.array(productSchema);

const emptyCartSnapshot: CartSnapshot = { items: [], notice: "" };
const emptyWishlistSnapshot: WishlistSnapshot = { products: [], notice: "" };
const unavailableCartSnapshot: CartSnapshot = {
  items: [],
  notice: "Your saved bag is unavailable because browser storage could not be read.",
};
const unavailableWishlistSnapshot: WishlistSnapshot = {
  products: [],
  notice: "Your saved wishlist is unavailable because browser storage could not be read.",
};

let lastCartValue: string | null | undefined;
let cartSnapshot = emptyCartSnapshot;
let lastWishlistValue: string | null | undefined;
let wishlistSnapshot = emptyWishlistSnapshot;

function readCartSnapshot(): CartSnapshot {
  if (typeof window === "undefined") return emptyCartSnapshot;

  let saved: string | null;
  try {
    saved = window.localStorage.getItem(cartStorageKey);
  } catch {
    return unavailableCartSnapshot;
  }
  if (lastCartValue === saved) return cartSnapshot;

  lastCartValue = saved;
  if (!saved) {
    cartSnapshot = emptyCartSnapshot;
    return cartSnapshot;
  }

  try {
    const parsed = cartStorageSchema.safeParse(JSON.parse(saved));
    if (!parsed.success) throw new Error("Saved cart data is invalid.");
    cartSnapshot = {
      items: parsed.data
        .filter(({ product }) => product.stock > 0)
        .map(({ product, quantity }) => ({
          product,
          quantity: Math.min(quantity, product.stock),
        })),
      notice: "",
    };
  } catch (error) {
    console.error("Saved cart could not be restored:", error);
    cartSnapshot = {
      items: [],
      notice: "Your saved bag could not be restored and has been cleared.",
    };
  }
  return cartSnapshot;
}

function readWishlistSnapshot(): WishlistSnapshot {
  if (typeof window === "undefined") return emptyWishlistSnapshot;

  let saved: string | null;
  try {
    saved = window.localStorage.getItem(wishlistStorageKey);
  } catch {
    return unavailableWishlistSnapshot;
  }
  if (lastWishlistValue === saved) return wishlistSnapshot;

  lastWishlistValue = saved;
  if (!saved) {
    wishlistSnapshot = emptyWishlistSnapshot;
    return wishlistSnapshot;
  }

  try {
    const parsed = wishlistStorageSchema.safeParse(JSON.parse(saved));
    if (!parsed.success) throw new Error("Saved wishlist data is invalid.");
    wishlistSnapshot = {
      products: parsed.data.filter(
        (product, index, products) =>
          products.findIndex((item) => item.id === product.id) === index,
      ),
      notice: "",
    };
  } catch (error) {
    console.error("Saved wishlist could not be restored:", error);
    wishlistSnapshot = {
      products: [],
      notice: "Your saved wishlist could not be restored and has been cleared.",
    };
  }
  return wishlistSnapshot;
}

function notifyStorageSubscribers() {
  window.dispatchEvent(new Event(storageEventName));
}

export function subscribeToStorefrontStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(storageEventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(storageEventName, callback);
  };
}

export function getCartSnapshot() {
  return readCartSnapshot();
}

export function getWishlistSnapshot() {
  return readWishlistSnapshot();
}

export function getServerCartSnapshot() {
  return emptyCartSnapshot;
}

export function getServerWishlistSnapshot() {
  return emptyWishlistSnapshot;
}

export function saveCartSnapshot(items: CartItem[]) {
  const serialized = JSON.stringify(items);
  window.localStorage.setItem(cartStorageKey, serialized);
  lastCartValue = serialized;
  cartSnapshot = { items, notice: "" };
  notifyStorageSubscribers();
}

export function saveWishlistSnapshot(products: Product[]) {
  const serialized = JSON.stringify(products);
  window.localStorage.setItem(wishlistStorageKey, serialized);
  lastWishlistValue = serialized;
  wishlistSnapshot = { products, notice: "" };
  notifyStorageSubscribers();
}
