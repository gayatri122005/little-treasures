"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AccountDropdown from "@/components/AccountDropdown";
import Icon from "@/components/icons";
import { useStorefront } from "@/components/StorefrontContext";
import type { ShopCategory } from "@/lib/catalog-types";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount, wishlistCount, searchTerm, setSearchTerm } = useStorefront();
  const [menu, setMenu] = useState(false);
  const [categories, setCategories] = useState<ShopCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/categories", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: unknown) => {
        if (!cancelled && typeof payload === "object" && payload !== null && "categories" in payload && Array.isArray(payload.categories)) {
          setCategories(payload.categories.map((category) => ({ ...category, imageAlt: `${String(category.name)} category` })) as ShopCategory[]);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    router.push(searchTerm.trim() ? `/products?q=${encodeURIComponent(searchTerm.trim())}` : "/products");
  }

  const searchForm = (
    <form onSubmit={search} className="search-form">
      <Icon name="search" />
      <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search for treasures..." aria-label="Search for treasures" />
    </form>
  );

  return (
    <>
      <div className="promo-bar"><span>Free shipping on orders above ₹999</span><span>Shop with love&nbsp; | &nbsp;OMTreasure</span></div>
      <header className="site-header">
        <div className="header-main page-shell">
          <button type="button" className="mobile-menu-button" onClick={() => setMenu((current) => !current)} aria-label="Open menu"><Icon name={menu ? "close" : "menu"} /></button>
          <Link href="/" className="brand">OMTreasure</Link>
          {searchForm}
          <div className="header-actions">
            <AccountDropdown />
            <Link href="/products?collection=favorites" aria-label={`Wishlist ${wishlistCount} items`} className="header-icon"><Icon name="heart" />{wishlistCount > 0 && <b>{wishlistCount}</b>}</Link>
            <Link href="/cart" aria-label={`Cart ${cartCount} items`} className="header-icon"><Icon name="bag" /><b>{cartCount}</b></Link>
          </div>
        </div>
        <div className="mobile-search page-shell">{searchForm}</div>
        {menu && <div className="mobile-menu">{categories.map((category) => <Link key={category.name} href={`/products?category=${encodeURIComponent(category.name)}`} onClick={() => setMenu(false)}>{category.name}</Link>)}<Link href="/about">About Us</Link><Link href="/contact">Contact Us</Link></div>}
        <nav className="desktop-nav"><Link href="/" className={pathname === "/" ? "active" : ""}>⌂ &nbsp;Home</Link>{categories.map((category) => <Link key={category.name} href={`/products?category=${encodeURIComponent(category.name)}`}>{category.name}</Link>)}</nav>
      </header>
    </>
  );
}
