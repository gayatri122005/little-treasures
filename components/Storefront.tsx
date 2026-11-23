"use client";

import CategoryCard from "@/components/CategoryCard";
import FeaturedProducts from "@/components/FeaturedProducts";
import Footer from "@/components/Footer";
import HeroBanner from "@/components/HeroBanner";
import Navbar from "@/components/Navbar";
import NewArrivals from "@/components/NewArrivals";
import Newsletter from "@/components/Newsletter";
import { ProductCatalogProvider } from "@/components/ProductCatalogContext";
import { categories } from "@/lib/category-presentation";
import Icon from "@/components/icons";
import Link from "next/link";

function ShopCategories() {
  return (
    <section id="categories" className="page-shell scroll-mt-8 py-14 sm:py-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Little things, just your style</p>
          <h2 className="serif-display mt-2 text-4xl sm:text-5xl">
            Shop the collections.
          </h2>
        </div>
        <Link
          href="/products"
          className="inline-flex min-h-10 items-center gap-2 self-start text-xs font-semibold tracking-[0.08em] text-[#1E1B18] transition-colors hover:text-[#B85042] sm:self-auto"
        >
          VIEW COLLECTIONS
          <Icon name="arrow" className="size-4" />
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-9 sm:grid-cols-3 sm:gap-5">
        {categories.map((category) => (
          <CategoryCard key={category.name} category={category} />
        ))}
      </div>
    </section>
  );
}

function BrandStory() {
  return (
    <section id="story" className="page-shell py-16 sm:py-24">
      <div className="grid gap-8 border-y border-[#E3D8C9] py-10 md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-16 md:py-14">
        <div>
          <p className="eyebrow">Why choose Little Treasures</p>
          <h2 className="serif-display mt-3 text-4xl leading-[1.08] sm:text-5xl">
            Three collections, one easy place to browse.
          </h2>
        </div>
        <div>
          <p className="max-w-[620px] text-base leading-7 text-[#6E655F]">
            Browse Home & Decor, Kids Wear, and Fashion & Hair Accessories.
            Product details show the information available for each item.
          </p>
          <a
            href="#categories"
            className="mt-5 inline-flex items-center gap-3 text-xs font-semibold tracking-[0.1em] text-[#1E1B18] hover:text-[#B85042]"
          >
            TAKE A LOOK AROUND
            <Icon name="arrow" className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function StorefrontContent() {
  return (
    <>
      <Navbar />
      <main>
        <HeroBanner />
        <ShopCategories />
        <NewArrivals />
        <FeaturedProducts />
        <BrandStory />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}

export default function Storefront() {
  return (
    <ProductCatalogProvider>
      <StorefrontContent />
    </ProductCatalogProvider>
  );
}
