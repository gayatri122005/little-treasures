"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/catalog-types";
import Icon from "@/components/icons";
import { useStorefront } from "@/components/StorefrontContext";

const money = (value:number) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(value);
export default function ProductCard({ product }: { product: Product; layout?: "grid" | "feature" }) {
  const { addToCart, wishlistIds, toggleWishlist } = useStorefront(); const [added,setAdded]=useState(false); const favorite=wishlistIds.includes(product.id);
  function add(){ if(!product.stock)return; addToCart(product); setAdded(true); window.setTimeout(()=>setAdded(false),1200); }
  return <article className="product-card group">
    <div className="product-image"><Link href={`/product/${encodeURIComponent(product.id)}`} aria-label={`View ${product.name}`}>{product.image ? <Image src={product.image} alt={product.name} width={500} height={500} unoptimized className="object-contain" /> : <span className="image-fallback">OmTreasure</span>}</Link><button type="button" className="wishlist-button" onClick={()=>toggleWishlist(product)} aria-label={favorite?`Remove ${product.name} from wishlist`:`Add ${product.name} to wishlist`}><Icon name="heart" className={favorite?"fill-[#5B168F] text-[#5B168F]":""}/></button></div>
    <div className="product-info"><Link href={`/product/${encodeURIComponent(product.id)}`} className="product-name">{product.name}</Link><div className="price-row"><strong>{money(product.price)}</strong>{product.isNewArrival && <span className="new-label">NEW</span>}</div><small>{product.stock > 0 ? "In stock" : "Out of stock"}</small><button type="button" onClick={add} disabled={!product.stock} className="add-button"><Icon name="bag" />{product.stock ? (added ? "Added" : "Add to Cart") : "Sold Out"}</button></div>
  </article>;
}
