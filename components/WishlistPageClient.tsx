"use client";

import Link from "next/link";
import { useStorefront } from "@/components/StorefrontContext";
import ProductCard from "@/components/ProductCard";
import Icon from "@/components/icons";

export default function WishlistPageClient() {
  const { wishlistProducts, wishlistLoading, wishlistError } = useStorefront();
  return (
    <main className="page-shell min-h-[65vh] py-8 pb-32 sm:py-12 md:pb-12">
      <p className="eyebrow">Saved for later</p>
      <h1 className="serif-display mt-2 text-4xl sm:text-5xl">My wishlist</h1>
      {wishlistLoading ? <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="animate-pulse"><div className="aspect-[0.82] rounded-2xl bg-[var(--surface-soft)]" /><div className="mt-3 h-4 w-2/3 rounded bg-[var(--surface-soft)]" /></div>)}</div> : wishlistError ? <div role="alert" className="mt-8 rounded-2xl bg-[var(--surface-soft)] px-6 py-12 text-center"><h2 className="serif-display text-2xl">We couldn&apos;t open your wishlist</h2><p className="mt-2 text-sm text-[var(--muted)]">{wishlistError}</p></div> : wishlistProducts.length ? <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{wishlistProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-2xl bg-[var(--surface-soft)] px-6 text-center"><Icon name="heart" className="size-8 text-[var(--purple)]" /><h2 className="serif-display mt-4 text-2xl">Your wishlist is waiting for treasures!</h2><p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Explore our collection and save your favourite products here.</p><Link href="/products" className="mt-6 rounded-full bg-[var(--ink)] px-6 py-3 text-xs font-semibold tracking-[0.1em] text-white">CONTINUE SHOPPING</Link></div>}
    </main>
  );
}
