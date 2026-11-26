"use client";
import ProductCard from "@/components/ProductCard";
import { useProductCatalog } from "@/components/ProductCatalogContext";

export default function FeaturedProducts(){ const {products,loading,error,retry}=useProductCatalog(); const visible=products.filter(p=>p.showOnHomepage).slice(0,8); return <section id="featured"><div className="section-title"><span/><h2>Trending Now</h2><span/></div>{loading?<div className="grid">{[1,2,3,4].map(i=><div key={i} className="product-card animate-pulse"><div className="product-image"/><div className="product-info"><div className="h-3 bg-slate-100"/></div></div>)}</div>:error?<div role="alert" className="empty-state">{error}<button onClick={retry}>Try again</button></div>:visible.length?<div className="grid">{visible.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty-state">No trending products are available yet.</div>}</section>; }
