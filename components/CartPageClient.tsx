"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/icons";
import { useStorefront } from "@/components/StorefrontContext";
import ProductImage from "@/components/ProductImage";

type Quote = {
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
  taxRate: number;
  currency: "INR";
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);
}

export default function CartPageClient() {
  const {
    cartItems,
    cartCount,
    setCartQuantity,
    removeFromCart,
    toggleWishlist,
  } = useStorefront();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quotedCartKey, setQuotedCartKey] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const cartKey = cartItems.map(({ product, quantity }) => `${product.id}:${quantity}`).join("|");
  const currentQuote = quotedCartKey === cartKey ? quote : null;
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cartItems],
  );

  useEffect(() => {
    if (!cartItems.length) return;

    const controller = new AbortController();
    fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      signal: controller.signal,
      body: JSON.stringify({
        items: cartItems.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to confirm your order total.");
        setQuote(result.quote as Quote);
        setQuotedCartKey(cartKey);
        setQuoteMessage("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setQuote(null);
        setQuoteMessage(
          error instanceof Error && error.message === "Authentication required."
            ? "Sign in at checkout to confirm delivery and tax details."
            : error instanceof Error
              ? error.message
              : "Your final total will be confirmed at checkout.",
        );
      });

    return () => controller.abort();
  }, [cartItems, cartKey]);

  if (!cartItems.length) {
    return (
      <main className="page-shell flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
        <span className="om-empty-icon">
          <Icon name="bag" className="size-7" />
        </span>
        <p className="eyebrow mt-5">Ready when you are</p>
        <h1 className="serif-display mt-2 text-4xl">Your bag is empty</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
          Explore the collections and add a little something you love.
        </p>
        <Link href="/products" className="om-primary-button mt-6">
          Explore the collection
        </Link>
      </main>
    );
  }

  return (
    <main className="page-shell min-h-[65vh] pb-12 pt-6 sm:pt-9">
      <Link href="/products" className="inline-flex min-h-9 items-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--purple)]">
        <Icon name="arrow" className="size-4 rotate-180" /> Continue shopping
      </Link>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-5">
        <div>
          <p className="eyebrow">Your lovely finds</p>
          <h1 className="serif-display mt-1 text-4xl sm:text-5xl">Shopping bag</h1>
        </div>
        <p className="pb-1 text-sm text-[var(--muted)]">{cartCount} {cartCount === 1 ? "item" : "items"}</p>
      </header>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-7">
        <section aria-label="Items in your bag" className="om-card divide-y divide-[var(--line)] px-4 sm:px-6">
          {cartItems.map(({ product, quantity }) => (
            <article key={product.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 py-5 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5">
              <Link href={`/product/${encodeURIComponent(product.id)}`} aria-label={`View ${product.name}`} className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--surface-soft)]">
                <ProductImage src={product.image} alt={product.name} fill unoptimized sizes="112px" className="object-contain p-2" />
              </Link>
              <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  {product.category && <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">{product.category}</p>}
                  <h2 className="mt-1 text-sm font-medium leading-5 sm:text-base">
                    <Link href={`/product/${encodeURIComponent(product.id)}`} className="hover:text-[var(--purple)]">{product.name}</Link>
                  </h2>
                  <p className="mt-2 text-xs text-[var(--muted)]">{formatPrice(product.price)} each</p>
                  {product.stock <= 0 ? (
                    <p className="om-error-text mt-2 text-xs font-medium">Currently unavailable. Remove this item to continue.</p>
                  ) : product.stock <= 3 ? (
                    <p className="mt-2 text-xs text-[var(--purple)]">Only {product.stock} left</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="om-quantity-control" aria-label={`Quantity ${quantity}`}>
                      <button type="button" onClick={() => setCartQuantity(product.id, quantity - 1)} disabled={quantity <= 1} aria-label={`Decrease ${product.name} quantity`} className="flex size-9 items-center justify-center disabled:opacity-35"><Icon name="minus" className="size-3.5" /></button>
                      <span className="min-w-7 text-center text-xs" aria-live="polite">{quantity}</span>
                      <button type="button" onClick={() => setCartQuantity(product.id, quantity + 1)} disabled={quantity >= product.stock} aria-label={`Increase ${product.name} quantity`} className="flex size-9 items-center justify-center disabled:opacity-35"><Icon name="plus" className="size-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => { toggleWishlist(product); removeFromCart(product.id); }} className="om-text-action">Save for later</button>
                    <button type="button" onClick={() => removeFromCart(product.id)} className="om-text-action">Remove product</button>
                    <Link href="/checkout" className="min-h-9 inline-flex items-center text-xs font-semibold text-[var(--purple)] hover:text-[var(--purple-dark)]">Buy now</Link>
                  </div>
                </div>
                <p className="text-sm font-semibold sm:pt-1">{formatPrice(product.price * quantity)}</p>
              </div>
            </article>
          ))}
        </section>

        <aside className="om-card h-fit p-5 sm:p-6 lg:sticky lg:top-28">
          <h2 className="serif-display text-2xl">Price details</h2>
          <div className="mt-5 space-y-3 border-b border-[var(--line)] pb-4 text-sm">
            <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Total product price</span><span>{formatPrice(currentQuote?.subtotal ?? subtotal)}</span></div>
            {currentQuote ? (
              <>
                <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Delivery</span><span>{currentQuote.shipping ? formatPrice(currentQuote.shipping) : "Complimentary"}</span></div>
                {currentQuote.discount > 0 && <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Discount</span><span className="text-[var(--success)]">−{formatPrice(currentQuote.discount)}</span></div>}
                <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Taxes{currentQuote.taxRate ? ` (${currentQuote.taxRate}%)` : ""}</span><span>{formatPrice(currentQuote.tax)}</span></div>
              </>
            ) : (
              <div className="flex justify-between gap-3"><span className="text-[var(--muted)]">Delivery & taxes</span><span className="text-right text-xs text-[var(--muted)]">Calculated at checkout</span></div>
            )}
          </div>
          <div className="mt-4 flex items-start justify-between gap-3">
            <span className="font-semibold">{currentQuote ? "Total" : "Items subtotal"}</span>
            <span className="serif-display text-xl font-semibold">{formatPrice(currentQuote?.total ?? subtotal)}</span>
          </div>
          {quoteMessage && <p className="mt-3 text-xs leading-5 text-[var(--muted)]" role="status">{quoteMessage}</p>}
          <Link href="/checkout" className="om-primary-button mt-5 w-full">Continue to checkout</Link>
          <p className="mt-3 text-center text-[10px] leading-5 text-[var(--muted)]">The final amount is verified from current product prices and stock at checkout.</p>
        </aside>
      </div>
    </main>
  );
}
