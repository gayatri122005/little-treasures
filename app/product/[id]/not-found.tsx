import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="page-shell flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="serif-display text-3xl">We couldn&apos;t find that treasure</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        It may have moved on to a new home.
      </p>
      <Link
        href="/products"
        className="mt-6 rounded-full bg-[var(--ink)] px-6 py-3 text-xs font-semibold tracking-[0.1em] text-white hover:bg-[var(--purple-dark)]"
      >
        EXPLORE THE COLLECTION
      </Link>
    </main>
  );
}