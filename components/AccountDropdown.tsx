"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/icons";
import { useStorefront } from "@/components/StorefrontContext";

const accountLinks = [
  ["user", "My Profile", "/customer-dashboard#profile-settings"],
  ["grid", "My Orders", "/customer-dashboard#recent-orders"],
  ["heart", "My Wishlist", "/wishlist"],
  ["bag", "My Cart", "/cart"],
  ["home", "Saved Addresses", "/customer-dashboard#saved-addresses"],
  ["shield", "Payment Methods", "/checkout"],
  ["sparkle", "Coupons & Offers", "/products"],
  ["bell", "Notifications", "/customer-dashboard#recent-orders"],
  ["headset", "Help & Support", "/contact"],
] as const;

export default function AccountDropdown() {
  const router = useRouter();
  const { authUser, authLoading } = useStorefront();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        wrapperRef.current?.querySelector<HTMLButtonElement>(".account-button")?.focus();
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.dispatchEvent(new Event("omtreasure:auth-changed"));
    setOpen(false);
    router.refresh();
  }

  const authenticated = Boolean(authUser);
  const heading = authLoading ? "Checking your account…" : authenticated ? "Your account" : "Welcome to OmTreasure";

  return (
    <div className="account-wrap" ref={wrapperRef}>
      <button
        type="button"
        className="account-button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="account-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="user" /><span>Account</span><small aria-hidden="true">{open ? "⌃" : "⌄"}</small>
      </button>
      {open && (
        <div id="account-menu" className="account-menu" role="menu" onClick={(event) => event.stopPropagation()}>
          <div className="account-menu-heading"><span>{heading}</span></div>
          {!authLoading && !authenticated && (
            <div className="account-guest-actions">
              <Link href="/signin" role="menuitem" onClick={() => setOpen(false)}>Sign in</Link>
              <Link href="/signup" role="menuitem" onClick={() => setOpen(false)}>Create account</Link>
            </div>
          )}
          {!authLoading && authenticated && (
            <>
              {accountLinks.map(([icon, label, href]) => (
                <Link key={label} href={href} role="menuitem" onClick={() => setOpen(false)}>
                  <Icon name={icon} /><span>{label}</span>
                </Link>
              ))}
              <button type="button" className="account-logout" role="menuitem" onClick={() => void logout()}>
                <Icon name="arrow" /><span>Logout</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
