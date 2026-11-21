"use client";

import Image from "next/image";
import { useStorefront } from "@/components/StorefrontContext";
import type { ShopCategory } from "@/lib/catalog-types";
import Icon from "@/components/icons";

export default function CategoryCard({ category }: { category: ShopCategory }) {
  const { setSelectedCategory, setSearchTerm } = useStorefront();

  function selectCategory() {
    setSelectedCategory(category.name);
    setSearchTerm("");
    document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={selectCategory}
      className="group min-w-0 text-left"
      aria-label={`Shop ${category.name}`}
    >
      <span className="relative block aspect-[0.9] overflow-hidden rounded-2xl bg-[#F1EBE1] sm:aspect-[0.84]">
        <Image
          src={category.image}
          alt={category.imageAlt}
          fill
          sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 300px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
        <span className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-[#FFFFFF]/95 text-[#1E1B18] shadow-sm transition-transform group-hover:translate-x-0.5 sm:bottom-4 sm:right-4">
            <Icon name="chevron" className="size-4" />
        </span>
      </span>
      <span className="flex items-start justify-between gap-2 px-1 pt-3">
        <span className="min-w-0">
          <span className="block font-serif text-lg leading-tight text-[#1E1B18] sm:text-xl">
            {category.name}
          </span>
          <span className="mt-1 block text-[10px] leading-4 text-[#6E655F] sm:text-xs">
            {category.description}
          </span>
        </span>
      </span>
    </button>
  );
}
