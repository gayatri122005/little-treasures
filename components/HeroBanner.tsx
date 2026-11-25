"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import Icon from "@/components/icons";

const slides = [
  {
    category: "Home & Decor",
    title: "Beautiful details for your home.",
    description: "Explore toran and decorative doormats chosen for warm, welcoming spaces.",
    image: "/categories/home-decor.svg",
    alt: "Illustration of a decorated doorway and traditional toran",
  },
  {
    category: "Kids Wear",
    title: "Little outfits for big moments.",
    description: "Find ghagra, frocks, and palazzo styles for the little ones you love.",
    image: "/categories/kids-wear.svg",
    alt: "Illustration of a girl's festive dress",
  },
  {
    category: "Fashion & Hair Accessories",
    title: "Finishing touches with a little charm.",
    description: "Browse potli bags and hair clips for thoughtful everyday details.",
    image: "/categories/fashion-accessories.svg",
    alt: "Illustration of a potli bag and decorative hair clip",
  },
];

const motionPreference = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const media = window.matchMedia(motionPreference);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getMotionPreference() {
  return window.matchMedia(motionPreference).matches;
}

function getServerMotionPreference() {
  return true;
}

export default function HeroBanner() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    getServerMotionPreference,
  );
  const slide = slides[activeSlide];

  useEffect(() => {
    if (!autoRotate || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [autoRotate, prefersReducedMotion]);

  function changeSlide(direction: -1 | 1) {
    setActiveSlide((current) => (current + direction + slides.length) % slides.length);
  }

  return (
    <section className="page-shell pb-6 pt-4 sm:pb-9 sm:pt-5" id="top">
      <div
        className="relative isolate grid overflow-hidden rounded-[1.25rem] bg-[#1E1B18] shadow-[0_18px_48px_rgba(30,27,24,0.1)] md:min-h-[360px] md:grid-cols-[0.9fr_1.1fr] lg:min-h-[420px]"
        aria-roledescription="carousel"
        aria-label="Explore Little Treasures collections"
      >
        <div className="order-2 flex flex-col items-start justify-center px-5 pb-7 pt-1 text-[#FAF7F2] sm:px-9 sm:pb-9 md:order-1 md:px-10 md:py-10 lg:px-14">
          <p className="mb-4 flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-[#F1EBE1] sm:text-[11px]">
            <Icon name="sparkle" className="size-4" />
            {slide.category.toUpperCase()}
          </p>
          <h1
            key={slide.title}
            className="serif-display max-w-[560px] text-[clamp(2.35rem,5.2vw,4.7rem)] leading-[0.98]"
            aria-live={autoRotate ? "off" : "polite"}
          >
            {slide.title}
          </h1>
          <p className="mt-4 max-w-[390px] text-sm leading-6 text-white/75 sm:mt-5 sm:text-[15px] sm:leading-7">
            {slide.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-7">
            <Link
              href={`/products?category=${encodeURIComponent(slide.category)}`}
              className="inline-flex min-h-11 items-center gap-3 rounded-full bg-[#B85042] px-5 text-[10px] font-semibold tracking-[0.09em] text-white transition-colors hover:bg-[#9A3F33] sm:min-h-12 sm:px-6 sm:text-xs"
            >
              SHOP {slide.category.toUpperCase()}
              <Icon name="arrow" className="size-4" />
            </Link>
            <Link
              href="/#categories"
              className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-medium text-white/85 transition-colors hover:text-white"
            >
              All collections
              <Icon name="chevron" className="size-4" />
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-2 border-t border-white/20 pt-4 text-[10px] text-white/70 sm:mt-7 sm:pt-5 sm:text-xs">
            <Icon name="heart" className="size-4 text-[#F1EBE1]" />
            Thoughtfully picked for little moments.
          </div>
        </div>

        <div className="relative order-1 min-h-[210px] overflow-hidden sm:min-h-[250px] md:order-2 md:min-h-full">
          <Image
            key={slide.image}
            src={slide.image}
            alt={slide.alt}
            fill
            loading="eager"
            sizes="(max-width: 767px) 100vw, 58vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B18]/50 via-transparent to-[#1E1B18]/5 md:bg-gradient-to-r md:from-[#1E1B18]/10 md:to-transparent" />
          <span className="absolute bottom-3 left-3 rounded-full border border-white/50 bg-[#FAF7F2]/95 px-3 py-2 text-[9px] font-semibold tracking-[0.08em] text-[#1E1B18] shadow-lg sm:bottom-6 sm:left-6 sm:px-4 sm:text-[10px]">
            {slide.category.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3" aria-label="Banner controls">
        <div className="flex items-center gap-1.5" role="group" aria-label="Choose a collection slide">
          {slides.map((item, index) => (
            <button
              key={item.category}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show ${item.category} slide`}
              aria-current={activeSlide === index ? "true" : undefined}
              className={`min-h-10 rounded-full px-3 text-[9px] font-medium transition-colors sm:text-[10px] ${activeSlide === index ? "bg-[#1E1B18] text-white" : "text-[#6E655F] hover:bg-[#E8DCCB]"}`}
            >
              <span className="hidden sm:inline">{item.category}</span>
              <span className="sm:hidden">{index + 1}</span>
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => changeSlide(-1)}
            aria-label="Previous collection slide"
            className="flex size-10 items-center justify-center rounded-full border border-[#E3D8C9] text-[#1E1B18] transition-colors hover:bg-[#E8DCCB]"
          >
            <Icon name="arrow" className="size-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => changeSlide(1)}
            aria-label="Next collection slide"
            className="flex size-10 items-center justify-center rounded-full border border-[#E3D8C9] text-[#1E1B18] transition-colors hover:bg-[#E8DCCB]"
          >
            <Icon name="arrow" className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate((enabled) => !enabled)}
            aria-pressed={!autoRotate || prefersReducedMotion}
            aria-label={prefersReducedMotion ? "Banner rotation paused by motion preference" : autoRotate ? "Pause banner rotation" : "Resume banner rotation"}
            disabled={prefersReducedMotion}
            className="min-h-10 rounded-full px-2 text-[9px] font-medium text-[#6E655F] hover:bg-[#E8DCCB] sm:px-3 sm:text-[10px]"
          >
            {prefersReducedMotion ? "Paused" : autoRotate ? "Pause" : "Play"}
          </button>
        </div>
      </div>
    </section>
  );
}
