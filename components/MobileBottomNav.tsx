"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStorefront } from "@/components/StorefrontContext";
import Icon from "@/components/icons";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { cartCount, wishlistCount } = useStorefront();
  const items = [
    { label: "Home", href: "/", icon: "home" as const },
    { label: "Categories", href: "/products", icon: "grid" as const },
    { label: "Wishlist", href: "/wishlist", icon: "heart" as const, count: wishlistCount },
    { label: "Account", href: "/login", icon: "user" as const },
    { label: "Cart", href: "/cart", icon: "bag" as const, count: cartCount },
  ];
  return <nav aria-label="Mobile bottom navigation" className="mobile-bottom-nav">
    {items.map((item) => {
      const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("?")[0]);
      return <Link key={item.label} href={item.href} className={active ? "active" : ""}>
        <span className="bottom-icon"><Icon name={item.icon} />{item.count ? <b>{item.count}</b> : null}</span>
        <span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
