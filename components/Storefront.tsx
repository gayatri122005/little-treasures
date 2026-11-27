"use client";

import Image from "next/image";
import CategoryCard from "@/components/CategoryCard";
import FeaturedProducts from "@/components/FeaturedProducts";
import HeroBanner from "@/components/HeroBanner";
import NewArrivals from "@/components/NewArrivals";
import MobileBottomNav from "@/components/MobileBottomNav";
import Icon from "@/components/icons";
import { ProductCatalogProvider } from "@/components/ProductCatalogContext";
import { useProductCatalog } from "@/components/ProductCatalogContext";

function ShopCategories({ categories, mobile = false }: { categories: Parameters<typeof CategoryCard>[0]["category"][]; mobile?: boolean }) {
  return <section id={mobile ? "mobile-categories" : "categories"} className="page-shell category-section"><div className="section-title"><span /><h2>Shop by Category</h2><span /></div><div className="category-grid">{categories.map((category) => <CategoryCard key={category.id ?? category.name} category={category} />)}</div></section>;
}

function HomePromo() {
  return <section className="page-shell home-promo"><div><h2>Add Charm to Your Home</h2><p>With Traditional Toran &amp; Door Mats</p><a href="/products?category=Home%20%26%20Decor">Explore Now <span>›</span></a></div><div className="promo-art"><Image src="/categories/home-decor.svg" alt="Traditional toran and home decor" width={680} height={120} /></div></section>;
}

function Benefits() {
  const items = [["truck", "Free Shipping", "On Orders Above ₹999"], ["shield", "Secure Payments", "Shop with Confidence"], ["rotate", "Easy Returns", "Hassle-Free"], ["headset", "24/7 Support", "We're Here to Help"]] as const;
  return <section className="benefits page-shell">{items.map(([icon, title, copy]) => <div key={title}><Icon name={icon} /><div><strong>{title}</strong><small>{copy}</small></div></div>)}</section>;
}

function StorefrontContent() {
  const { categories } = useProductCatalog();
  return <><div className="mobile-only-categories"><ShopCategories categories={categories} mobile /></div><main><HeroBanner /><div className="desktop-only-categories"><ShopCategories categories={categories} /></div><HomePromo /><FeaturedProducts /><NewArrivals /><Benefits /></main><MobileBottomNav /></>;
}

export default function Storefront() {
  return <ProductCatalogProvider><StorefrontContent /></ProductCatalogProvider>;
}
