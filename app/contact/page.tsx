import type { Metadata } from "next";
import Link from "next/link";
import { ProductCatalogProvider } from "@/components/ProductCatalogContext";

export const metadata: Metadata = {
  title: "Contact Us | OMTreasure",
  description: "Account and order information for OMTreasure customers.",
};

export default function ContactPage() {
  return (
    <ProductCatalogProvider>
      <main className="page-shell min-h-[65vh] py-12 sm:py-20">
        <p className="eyebrow">Contact Us</p>
        <h1 className="serif-display mt-3 text-4xl sm:text-6xl">How can we help?</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[#6E655F]">
          Contact details have not been provided for this store. You can sign in
          to review your account, saved addresses, and order history.
        </p>
        <Link href="/login" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#B85042] px-6 text-sm font-semibold text-white hover:bg-[#9A3F33]">
          My Account / Login
        </Link>
      </main>
    </ProductCatalogProvider>
  );
}
