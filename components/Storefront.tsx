"use client";

import Image from "next/image";
import CategoryCard from "@/components/CategoryCard";
import FeaturedProducts from "@/components/FeaturedProducts";
import Footer from "@/components/Footer";
import HeroBanner from "@/components/HeroBanner";
import Navbar from "@/components/Navbar";
import NewArrivals from "@/components/NewArrivals";
import Newsletter from "@/components/Newsletter";
import ShopFavorites from "@/components/ShopFavorites";
import { ProductCatalogProvider } from "@/components/ProductCatalogContext";
import { categories } from "@/lib/category-presentation";
import Icon from "@/components/icons";
import Link from "next/link";

function ThoughtfulGifting() {
  return (
    <section
      id="thoughtful-gifting"
      className="page-shell py-16 sm:py-24"
    >
      <div className="editorial-grain grid overflow-hidden bg-[#F1EBE1] md:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col items-start justify-center px-7 py-10 sm:px-12 sm:py-14 lg:px-16">
          <p className="eyebrow">A little goes a long way</p>
          <h2 className="serif-display mt-3 max-w-[500px] text-4xl leading-[1.05] sm:text-5xl">
            Small joys.
            <br />
            <span className="text-[#1E1B18]">Thoughtfully chosen.</span>
          </h2>
          <p className="mt-4 max-w-[380px] text-sm leading-6 text-[#6E655F]">
            Find something lovely for yourself or someone you love. The best
            gifts often feel like they were picked just for you.
          </p>
          <a
            href="#categories"
            className="mt-6 inline-flex items-center gap-3 border-b border-[#1E1B18] pb-2 text-[10px] font-semibold tracking-[0.12em] text-[#1E1B18]"
          >
            FIND A THOUGHTFUL GIFT
            <Icon name="arrow" className="size-4" />
          </a>
        </div>
        <div className="relative min-h-[260px] md:min-h-[360px]">
          <Image
            src="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=85"
            alt="A thoughtfully wrapped gift beside fresh flowers"
            fill
            sizes="(max-width: 768px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function ShopCategories() {
  return (
    <section id="categories" className="page-shell scroll-mt-8 py-14 sm:py-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Little things, just your style</p>
          <h2 className="serif-display mt-2 text-4xl sm:text-5xl">
            Shop by feeling.
          </h2>
        </div>
        <Link
          href="/products"
          className="inline-flex min-h-10 items-center gap-2 self-start text-xs font-semibold tracking-[0.08em] text-[#1E1B18] transition-colors hover:text-[#B85042] sm:self-auto"
        >
          ALL THE GOOD THINGS
          <Icon name="arrow" className="size-4" />
        </Link>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-9 sm:gap-5 lg:grid-cols-4">
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
          <p className="eyebrow">A slower kind of shopping</p>
          <h2 className="serif-display mt-3 text-4xl leading-[1.08] sm:text-5xl">
            Thoughtful finds for everyday joys.
          </h2>
        </div>
        <div>
          <p className="max-w-[620px] text-base leading-7 text-[#6E655F]">
            All the Good Things is a small, considered corner for pieces that feel
            personal. Take your time, find what speaks to you, and bring home
            something you&apos;ll reach for again.
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
        <ShopFavorites />
        <BrandStory />
        <ThoughtfulGifting />
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
