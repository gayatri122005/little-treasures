import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="page-shell flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="serif-display text-3xl">We couldn&apos;t find that treasure</h1>
      <p className="mt-2 text-sm text-[#6E655F]">
        It may have moved on to a new home.
      </p>
      <Link
        href="/products"
        className="mt-6 rounded-full bg-[#1E1B18] px-6 py-3 text-xs font-semibold tracking-[0.1em] text-white hover:bg-[#9A3F33]"
      >
        EXPLORE THE COLLECTION
      </Link>
    </main>
  );
}