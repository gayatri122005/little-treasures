"use client";
import ProductCard from "@/components/ProductCard";
import { useProductCatalog } from "@/components/ProductCatalogContext";

export default function NewArrivals(){ const {newArrivals,loading}=useProductCatalog(); const visible=newArrivals.slice(0,8); return <section id="new-arrivals"><div className="section-title"><span/><h2>New Arrivals</h2><span/></div>{loading?<div className="grid">{[1,2,3,4].map(i=><div key={i} className="product-card animate-pulse"><div className="product-image"/></div>)}</div>:visible.length?<div>{visible.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty-state">No new arrivals are featured just yet.</div>}</section>; }
