import type { Metadata } from "next";
import { ProductCatalogProvider } from "@/components/ProductCatalogContext";

export const metadata: Metadata = {
  title: "About Us | OMTreasure",
  description: "Explore OMTreasure collections for home decor, kids wear, and accessories.",
};

export default function AboutPage() {
  return (
    <ProductCatalogProvider>
      <main className="page-shell min-h-[65vh] py-12 sm:py-20">
        <p className="eyebrow">About OMTreasure</p>
        <h1 className="serif-display mt-3 max-w-3xl text-4xl leading-tight sm:text-6xl">
          Beautiful finds for every little moment.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[#6E655F]">
          OMTreasure brings together three product collections: Home &amp; Decor,
          Kids Wear, and Fashion &amp; Hair Accessories. Browse the products and
          details currently available in each collection.
        </p>
      </main>
    </ProductCatalogProvider>
  );
}
