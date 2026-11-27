"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Icon from "@/components/icons";
import { useStorefront } from "@/components/StorefrontContext";
import type { ShopCategory } from "@/lib/catalog-types";

const accountLinks = [
  ["user", "My Profile", "/customer-dashboard#profile-settings"], ["grid", "My Orders", "/customer-dashboard#recent-orders"], ["heart", "My Wishlist", "/products?collection=favorites"], ["bag", "My Cart", "/cart"], ["home", "Saved Addresses", "/customer-dashboard#saved-addresses"], ["shield", "Payment Methods", "/checkout"], ["sparkle", "Coupons & Offers", "/products"], ["bell", "Notifications", "/customer-dashboard#recent-orders"], ["headset", "Help & Support", "/contact"],
] as const;

export default function Navbar() {
  const router = useRouter(); const pathname = usePathname();
  const { cartCount, wishlistCount, searchTerm, setSearchTerm } = useStorefront();
  const [menu, setMenu] = useState(false); const [account, setAccount] = useState(false); const [authenticated, setAuthenticated] = useState<boolean | null>(null); const [categories, setCategories] = useState<ShopCategory[]>([]); const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => { let cancelled = false; void fetch("/api/categories", { cache: "no-store" }).then((r) => r.json()).then((payload: unknown) => { if (!cancelled && typeof payload === "object" && payload !== null && "categories" in payload && Array.isArray(payload.categories)) setCategories(payload.categories.map((category) => ({ ...category, imageAlt: `${String(category.name)} category` })) as ShopCategory[]); }).catch(() => undefined); return () => { cancelled = true; }; }, []);
  useEffect(() => { void fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" }).then((response) => setAuthenticated(response.ok)).catch(() => setAuthenticated(false)); }, []);
  useEffect(() => { if (!account) return; function close(event: MouseEvent) { if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccount(false); } document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, [account]);
  function search(event: FormEvent) { event.preventDefault(); router.push(searchTerm.trim() ? `/products?q=${encodeURIComponent(searchTerm.trim())}` : "/products"); }
  async function logout() { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); setAccount(false); setAuthenticated(false); router.refresh(); }
  const searchForm = <form onSubmit={search} className="search-form"><Icon name="search" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search for treasures..." aria-label="Search for treasures" /></form>;
  const accountHeading = authenticated === null ? "Checking your account…" : authenticated ? "Your account" : "Welcome to OmTreasure";
  return <>
    <div className="promo-bar"><span>Free shipping on orders above ₹999</span><span>Shop with love&nbsp; | &nbsp;OmTreasure</span></div>
    <header className="site-header"><div className="header-main page-shell"><button className="mobile-menu-button" onClick={() => setMenu(!menu)} aria-label="Open menu"><Icon name={menu ? "close" : "menu"} /></button><Link href="/" className="brand">OmTreasure</Link>{searchForm}<div className="header-actions"><div className="account-wrap" ref={accountRef}><button className="account-button" aria-expanded={account} onClick={() => setAccount(!account)}><Icon name="user" /><span>Account</span><small>{account ? "⌃" : "⌄"}</small></button>{account && <div className="account-menu" role="menu"><div className="account-menu-heading"><span>{accountHeading}</span></div>{authenticated === false && <div className="account-guest-actions"><Link href="/signin" onClick={() => setAccount(false)}>Sign in</Link><Link href="/signup" onClick={() => setAccount(false)}>Create account</Link></div>}{authenticated === true && <>{accountLinks.map(([icon, label, href]) => <Link key={label} href={href} role="menuitem" onClick={() => setAccount(false)}><Icon name={icon} /><span>{label}</span></Link>)}<button type="button" className="account-logout" onClick={logout}><Icon name="arrow" /><span>Logout</span></button></>}</div>}</div><Link href="/products?collection=favorites" aria-label={`Wishlist ${wishlistCount} items`} className="header-icon"><Icon name="heart" />{wishlistCount > 0 && <b>{wishlistCount}</b>}</Link><Link href="/cart" aria-label={`Cart ${cartCount} items`} className="header-icon"><Icon name="bag" /><b>{cartCount}</b></Link></div></div><div className="mobile-search page-shell">{searchForm}</div>{menu && <div className="mobile-menu">{categories.map((category) => <Link key={category.name} href={`/products?category=${encodeURIComponent(category.name)}`} onClick={() => setMenu(false)}>{category.name}</Link>)}<Link href="/about">About Us</Link><Link href="/contact">Contact Us</Link></div>}<nav className="desktop-nav"><Link href="/" className={pathname === "/" ? "active" : ""}>⌂ &nbsp;Home</Link>{categories.map((category) => <Link key={category.name} href={`/products?category=${encodeURIComponent(category.name)}`}>{category.name}</Link>)}</nav></header><div className="mobile-category-rail" />
  </>;
}
