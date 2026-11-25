"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import Icon from "@/components/icons";
import { useStorefront } from "@/components/StorefrontContext";
import { useProductCatalog } from "@/components/ProductCatalogContext";
import { categories } from "@/lib/category-presentation";

const navLinks = [
  { label: "Home", href: "/#top" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "My Account / Login", href: "/login" },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    cartItems,
    cartCount,
    wishlistProducts,
    wishlistCount,
    storageNotice,
    searchTerm,
    setSearchTerm,
    setCartQuantity,
    removeFromCart,
    toggleWishlist,
    selectedCategory,
  } = useStorefront();
  const { products } = useProductCatalog();
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<{
    id: number;
    full_name: string;
    email: string;
    role: "customer" | "admin";
  } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (!ignore) {
            setUser(null);
          }
          return;
        }

        const result = await response.json();

        if (!ignore) {
          setUser(result.user ?? null);
        }
      } catch {
        if (!ignore) {
          setUser(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  const subtotal = cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const searchSuggestions = searchTerm.trim()
    ? products
        .filter((product) =>
          `${product.name} ${product.category ?? ""}`
            .toLowerCase()
            .includes(searchTerm.trim().toLowerCase()),
        )
        .slice(0, 4)
    : [];
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMobileOpen(false);
    setSearchOpen(false);
    router.push(searchTerm.trim() ? `/products?q=${encodeURIComponent(searchTerm.trim())}` : "/products");
  }

  function chooseSuggestion(productName: string) {
    setSearchTerm(productName);
    setSearchOpen(false);
    setMobileOpen(false);
    router.push(`/products?q=${encodeURIComponent(productName)}`);
  }

  return (
    <>
      <div className="bg-[#E8DCCB] px-4 py-2 text-center text-[9px] font-semibold tracking-[0.14em] text-[#6E655F] sm:text-[10px]">
        THOUGHTFUL LITTLE FINDS, MADE TO BE EXPLORED
      </div>
      {storageNotice && (
        <p
          role="alert"
          className="bg-[#fff2f1] px-4 py-2 text-center text-xs text-[#81362e]"
        >
          {storageNotice}
        </p>
      )}
      <header className="sticky top-0 z-30 border-b border-[#E3D8C9] bg-[#FAF7F2]/95 text-[#1E1B18] shadow-[0_6px_24px_rgba(30,27,24,0.06)] backdrop-blur-md">
        <div className="page-shell flex min-h-[68px] items-center justify-between gap-3 sm:min-h-[68px] sm:gap-5">
          <Link
            href="/#top"
            className="flex shrink-0 items-center gap-2 text-[#1E1B18] sm:gap-2.5"
            aria-label="Little Treasures home"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[#B85042] text-white sm:size-9">
              <Icon name="sparkle" className="size-[17px] sm:size-[19px]" />
            </span>
            <span className="serif-display text-[19px] leading-none sm:text-[23px]">
              Little Treasures
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <form
              onSubmit={handleSearch}
              className="relative hidden h-10 w-[min(24vw,320px)] min-w-[205px] items-center gap-2 rounded-full border border-[#E3D8C9] bg-[#F1EBE1] px-3 md:flex"
              role="search"
            >
              <Icon name="search" className="size-4 shrink-0 text-[#6E655F]" />
              <input
                aria-label="Search products"
                placeholder="Search the collection..."
                role="combobox"
                aria-expanded={searchOpen && searchSuggestions.length > 0}
                aria-controls="desktop-search-suggestions"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onFocus={() => setSearchOpen(true)}
                className="min-w-0 flex-1 bg-transparent text-xs text-[#1E1B18] outline-none placeholder:text-[#6E655F]"
              />
              {searchOpen && searchSuggestions.length > 0 && (
                <ul
                  id="desktop-search-suggestions"
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+10px)] overflow-hidden rounded-lg border border-[#E3D8C9] bg-[#FFFFFF] py-1 text-[#1E1B18] shadow-xl"
                >
                  {searchSuggestions.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected="false"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseSuggestion(product.name)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[#1E1B18] hover:bg-[#F1EBE1]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium">
                            {product.name}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-[#6E655F]">
                            {product.category}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs">
                          {formatPrice(product.price)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </form>
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="hidden size-10 items-center justify-center rounded-full transition-colors hover:bg-[#F1EBE1] md:flex"
              aria-label="Account information"
            >
              <Icon name="user" className="size-[19px]" />
            </button>
            <button
              type="button"
              onClick={() => setWishlistOpen(true)}
              className="relative hidden size-10 items-center justify-center rounded-full transition-colors hover:bg-[#F1EBE1] md:flex"
              aria-label={`Open wishlist, ${wishlistCount} saved items`}
              aria-expanded={wishlistOpen}
            >
              <Icon name="heart" className="size-[19px]" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-[17px] items-center justify-center rounded-full bg-[#B85042] text-[9px] font-semibold text-white">
                  {wishlistCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex min-h-10 items-center justify-center gap-1.5 rounded-full px-2 transition-colors hover:bg-[#F1EBE1]"
              aria-label={`Cart, ${cartCount} items`}
              aria-expanded={cartOpen}
            >
              <Icon name="bag" className="size-[20px]" />
              <span className="hidden text-[11px] font-medium sm:inline">Cart</span>
              <span className="absolute -right-0.5 -top-0.5 flex size-[17px] items-center justify-center rounded-full bg-[#B85042] text-[9px] font-semibold text-white">
                {cartCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-[#F1EBE1] min-[1200px]:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <Icon
                name={mobileOpen ? "close" : "menu"}
                className="size-[20px]"
              />
            </button>
          </div>
        </div>

        <div className="page-shell pb-3 md:hidden">
          <form
            onSubmit={handleSearch}
            className="relative flex h-11 items-center gap-2 rounded-full border border-[#E3D8C9] bg-[#F1EBE1] px-4"
            role="search"
          >
            <Icon name="search" className="size-4 shrink-0 text-[#6E655F]" />
            <input
              aria-label="Search products"
              placeholder="Search the collection..."
              role="combobox"
              aria-expanded={searchOpen && searchSuggestions.length > 0}
              aria-controls="mobile-search-suggestions"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6E655F]"
            />
            {searchOpen && searchSuggestions.length > 0 && (
              <ul
                id="mobile-search-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-lg border border-[#E3D8C9] bg-white py-1 text-[#1E1B18] shadow-xl"
              >
                {searchSuggestions.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseSuggestion(product.name)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#F1EBE1]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">{product.name}</span>
                        <span className="mt-0.5 block text-[10px] text-[#6E655F]">{product.category}</span>
                      </span>
                      <span className="shrink-0 text-xs">{formatPrice(product.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </div>

        {mobileOpen && (
          <div className="border-t border-[#E3D8C9] bg-[#FAF7F2] px-5 pb-5 pt-4 text-[#1E1B18] min-[1200px]:hidden">
            <nav aria-label="Mobile navigation" className="grid gap-1">
              {navLinks.slice(0, 1).map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#F1EBE1] hover:text-[#9A3F33]"
                >
                  {link.label}
                </a>
              ))}
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#F1EBE1] hover:text-[#9A3F33]"
                >
                  {category.name}
                </Link>
              ))}
              {navLinks.slice(1).map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#F1EBE1] hover:text-[#9A3F33]"
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => { setMobileOpen(false); setCartOpen(true); }}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-[#F1EBE1] hover:text-[#9A3F33]"
              >
                Cart ({cartCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setWishlistOpen(true);
                }}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-[#F1EBE1] hover:text-[#9A3F33]"
              >
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="text-xs text-[#B85042]">
                    {wishlistCount} saved
                  </span>
                )}
              </button>
            </nav>
          </div>
        )}
        <nav aria-label="Shop categories" className="hidden border-t border-[#E3D8C9] min-[1200px]:block">
          <div className="page-shell flex min-h-10 items-center justify-center gap-8">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/products?category=${encodeURIComponent(category.name)}`}
                className="py-2 text-[11px] font-medium text-[#6E655F] transition-colors hover:text-[#9A3F33]"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </nav>
        <nav
          aria-label="Browse categories"
          className="border-t border-[#E3D8C9] min-[1200px]:hidden"
        >
          <div className="horizontal-rail page-shell flex gap-2 overflow-x-auto py-2">
            {categories.map((category, index) => {
              const iconName = index === 0 ? "home" : index === 1 ? "shirt" : "sparkle";
              const active = selectedCategory === category.name;
              return (
                <Link
                  key={category.name}
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 min-w-[92px] shrink-0 items-center gap-2 rounded-xl px-2.5 text-[10px] font-medium transition-colors ${active ? "bg-[#E8DCCB] text-[#9A3F33]" : "text-[#6E655F] hover:bg-[#F1EBE1] hover:text-[#1E1B18]"}`}
                >
                  <Icon name={iconName} className="size-5 shrink-0" />
                  <span className="max-w-[82px] leading-tight">{category.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E3D8C9] bg-[#FAF7F2]/95 pb-[env(safe-area-inset-bottom)] text-[#6E655F] shadow-[0_-6px_24px_rgba(30,27,24,0.08)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid min-h-[58px] max-w-xl grid-cols-5">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[9px] font-medium ${pathname === "/" ? "text-[#9A3F33]" : "hover:text-[#1E1B18]"}`}
          >
            <Icon name="home" className="size-5" />
            Home
          </Link>
          <Link
            href="/products"
            aria-current={pathname === "/products" ? "page" : undefined}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[9px] font-medium ${pathname === "/products" ? "text-[#9A3F33]" : "hover:text-[#1E1B18]"}`}
          >
            <Icon name="grid" className="size-5" />
            Categories
          </Link>
          <button
            type="button"
            onClick={() => setWishlistOpen(true)}
            aria-label={`Open wishlist, ${wishlistCount} saved items`}
            aria-pressed={wishlistOpen}
            className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[9px] font-medium ${wishlistOpen ? "text-[#9A3F33]" : "hover:text-[#1E1B18]"}`}
          >
            <Icon name="heart" className="size-5" />
            Wishlist
            {wishlistCount > 0 && (
              <span className="absolute right-[calc(50%-19px)] top-1 flex size-4 items-center justify-center rounded-full bg-[#B85042] text-[8px] text-white">
                {wishlistCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            aria-label="Account information"
            aria-expanded={accountOpen}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[9px] font-medium ${accountOpen ? "text-[#9A3F33]" : "hover:text-[#1E1B18]"}`}
          >
            <Icon name="user" className="size-5" />
            Account
          </button>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Cart, ${cartCount} items`}
            aria-expanded={cartOpen}
            className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[9px] font-medium ${cartOpen ? "text-[#9A3F33]" : "hover:text-[#1E1B18]"}`}
          >
            <Icon name="bag" className="size-5" />
            Cart
            <span className="absolute right-[calc(50%-21px)] top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#B85042] px-1 text-[8px] text-white">
              {cartCount}
            </span>
          </button>
        </div>
      </nav>

      <div className="sr-only" aria-live="polite">
        {searchTerm
          ? `${products.filter((product) => `${product.name} ${product.category ?? ""}`.toLowerCase().includes(searchTerm.toLowerCase())).length} matching products`
          : ""}
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-[#211f1b]/40"
            onClick={() => setCartOpen(false)}
            aria-label="Close shopping bag"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="relative flex h-full w-full max-w-[440px] flex-col bg-[#FAF7F2] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E3D8C9] px-6 py-5">
              <div>
                <p className="eyebrow">Your lovely finds</p>
                <h2 id="cart-title" className="serif-display mt-1 text-2xl">
                  Shopping bag <span className="text-[#6E655F]">({cartCount})</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="flex size-10 items-center justify-center rounded-full hover:bg-[#F1EBE1]"
                aria-label="Close shopping bag"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-[#F1EBE1] text-[#B85042]">
                  <Icon name="bag" className="size-7" />
                </span>
                <h3 className="serif-display text-2xl">Your bag is taking a nap</h3>
                <p className="mt-2 max-w-[260px] text-sm leading-6 text-[#6E655F]">
                  There are so many lovely little things waiting to be found.
                </p>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="mt-6 rounded-full bg-[#B85042] px-6 py-3 text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#9A3F33]"
                >
                  KEEP EXPLORING
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6">
                  {cartItems.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="flex gap-4 border-b border-[#E3D8C9] py-5"
                    >
                      <div className="relative size-[86px] shrink-0 overflow-hidden rounded-lg bg-[#F1EBE1]">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            unoptimized
                            sizes="86px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center">
                            <Icon
                              name="sparkle"
                              className="size-5 text-[#B85042]"
                            />
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {product.category && (
                              <p className="text-[10px] uppercase tracking-[0.12em] text-[#6E655F]">
                                {product.category}
                              </p>
                            )}
                            <h3 className="mt-1 text-sm font-medium">
                              {product.name}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(product.id)}
                            className="text-[11px] text-[#6E655F] underline underline-offset-2 hover:text-[#B85042]"
                            aria-label={`Remove ${product.name} from bag`}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 rounded-full border border-[#E3D8C9] px-2 py-1">
                            <button
                              type="button"
                              onClick={() =>
                                setCartQuantity(product.id, quantity - 1)
                              }
                              disabled={quantity <= 1}
                              aria-label={`Decrease ${product.name} quantity`}
                              className="disabled:opacity-30"
                            >
                              <Icon name="minus" className="size-3.5" />
                            </button>
                            <span className="min-w-3 text-center text-xs">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCartQuantity(product.id, quantity + 1)
                              }
                              disabled={quantity >= product.stock}
                              aria-label={`Increase ${product.name} quantity`}
                              className="disabled:opacity-30"
                            >
                              <Icon name="plus" className="size-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-medium">
                            {formatPrice(product.price * quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#E3D8C9] bg-[#F1EBE1] px-6 py-5">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  <p className="mt-4 text-center text-xs text-[#6E655F]">
                    Your bag is saved on this browser. Secure checkout is ready when you are.
                  </p>
                  <Link href="/checkout" onClick={() => setCartOpen(false)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#B85042] text-sm font-semibold text-white hover:brightness-95">Continue to checkout</Link>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {wishlistOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-[#211f1b]/40"
            onClick={() => setWishlistOpen(false)}
            aria-label="Close wishlist"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wishlist-title"
            className="relative flex h-full w-full max-w-[440px] flex-col bg-[#FAF7F2] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E3D8C9] px-6 py-5">
              <div>
                <p className="eyebrow">Saved for a little later</p>
                <h2 id="wishlist-title" className="serif-display mt-1 text-2xl">
                  Your wishlist ({wishlistCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setWishlistOpen(false)}
                className="flex size-10 items-center justify-center rounded-full hover:bg-[#F1EBE1]"
                aria-label="Close wishlist"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>
            {wishlistProducts.length ? (
              <div className="flex-1 overflow-y-auto px-6">
                {wishlistProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex gap-4 border-b border-[#E3D8C9] py-5"
                  >
                    <div className="relative size-[86px] shrink-0 overflow-hidden rounded-lg bg-[#F1EBE1]">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          unoptimized
                          sizes="86px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center">
                          <Icon
                            name="sparkle"
                            className="size-5 text-[#B85042]"
                          />
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0">
                        {product.category && (
                          <p className="text-[10px] uppercase tracking-[0.12em] text-[#6E655F]">
                            {product.category}
                          </p>
                        )}
                        <h3 className="mt-1 truncate text-sm font-medium">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-sm">{formatPrice(product.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleWishlist(product)}
                        className="text-[11px] text-[#6E655F] underline underline-offset-2 hover:text-[#B85042]"
                        aria-label={`Remove ${product.name} from wishlist`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-[#F1EBE1] text-[#B85042]">
                  <Icon name="heart" className="size-7" />
                </span>
                <h3 className="serif-display text-2xl">
                  Keep the little things you love
                </h3>
                <p className="mt-2 max-w-[270px] text-sm leading-6 text-[#6E655F]">
                  Tap the heart on a piece and it will be waiting here for you.
                </p>
                <button
                  type="button"
                  onClick={() => setWishlistOpen(false)}
                  className="mt-6 rounded-full bg-[#B85042] px-6 py-3 text-xs font-semibold tracking-[0.1em] text-white hover:bg-[#9A3F33]"
                >
                  KEEP EXPLORING
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {accountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211f1b]/40 p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-title"
            className="relative w-full max-w-[390px] rounded-2xl bg-[#FAF7F2] px-7 py-9 text-center shadow-2xl sm:px-10"
          >
            <button
              type="button"
              onClick={() => setAccountOpen(false)}
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full hover:bg-[#F1EBE1]"
              aria-label="Close account menu"
            >
              <Icon name="close" className="size-5" />
            </button>
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#F1EBE1] text-[#B85042]">
              <Icon name="user" className="size-6" />
            </span>
            <p className="eyebrow mt-5">A little note</p>
            <h2 id="account-title" className="serif-display mt-2 text-3xl">
              {user ? (user.role === "admin" ? "Admin account" : "Your account") : "Your account"}
            </h2>

            {!user ? (
              <div className="mt-5 space-y-3 text-left">
                <Link
                  href="/signin"
                  className="block rounded-full bg-[#B85042] px-6 py-3 text-center text-xs font-semibold tracking-[0.12em] text-white hover:bg-[#9A3F33]"
                  onClick={() => setAccountOpen(false)}
                >
                  SIGN IN
                </Link>
                <Link
                  href="/signup"
                  className="block rounded-full border border-[#E3D8C9] bg-white px-6 py-3 text-center text-xs font-semibold tracking-[0.12em] text-[#1E1B18] hover:bg-[#F1EBE1]"
                  onClick={() => setAccountOpen(false)}
                >
                  SIGN UP
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3 text-left">
                {user.role === "admin" ? (
                  <Link
                    href="/admin"
                    className="block rounded-full bg-[#B85042] px-6 py-3 text-center text-xs font-semibold tracking-[0.12em] text-white hover:bg-[#9A3F33]"
                    onClick={() => setAccountOpen(false)}
                  >
                    ADMIN DASHBOARD
                  </Link>
                ) : (
                  <Link
                    href="/customer-dashboard"
                    className="block rounded-full bg-[#B85042] px-6 py-3 text-center text-xs font-semibold tracking-[0.12em] text-white hover:bg-[#9A3F33]"
                    onClick={() => setAccountOpen(false)}
                  >
                    MY ACCOUNT
                  </Link>
                )}

                {user.role === "customer" && (
                  <Link
                    href="/customer-dashboard"
                    className="block rounded-full border border-[#E3D8C9] bg-white px-6 py-3 text-center text-xs font-semibold tracking-[0.12em] text-[#1E1B18] hover:bg-[#F1EBE1]"
                    onClick={() => setAccountOpen(false)}
                  >
                    MY ORDERS
                  </Link>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/auth/logout", {
                      method: "POST",
                      credentials: "same-origin",
                    });
                    setUser(null);
                    setAccountOpen(false);
                    router.refresh();
                  }}
                  className="w-full rounded-full border border-[#E3D8C9] bg-white px-6 py-3 text-xs font-semibold tracking-[0.12em] text-[#1E1B18] hover:bg-[#F1EBE1]"
                >
                  LOGOUT
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
