"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HeroBanner() {
  const [slide,setSlide]=useState(0);
  useEffect(()=>{ if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return; const id=window.setInterval(()=>setSlide(v=>(v+1)%3),6500); return()=>window.clearInterval(id); },[]);
  const image=slide===0?"/categories/kids-wear.svg":slide===1?"/categories/home-decor.svg":"/categories/fashion-accessories.svg";
  return <section id="top" className="page-shell hero-wrap"><div className="hero-banner"><div className="hero-copy"><h1>Festive Collection<br/>for Little Ones <span>♥</span></h1><p>Shop Styles <b>•</b> Decor <b>•</b> Accessories</p><Link href="/products" className="purple-button">Shop Now <b>›</b></Link></div><div className="hero-art"><Image src={image} alt="Festive Indian collection" width={760} height={240} priority className="object-cover" /></div><button className="hero-arrow left" onClick={()=>setSlide((slide+2)%3)} aria-label="Previous banner">‹</button><button className="hero-arrow right" onClick={()=>setSlide((slide+1)%3)} aria-label="Next banner">›</button></div><div className="hero-dots">{[0,1,2].map(i=><button key={i} onClick={()=>setSlide(i)} className={slide===i?"active":""} aria-label={`Show banner ${i+1}`} />)}</div></section>;
}
