import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/icons";

export default function HeroBanner() {
  return (
    <section className="page-shell pb-12 pt-5 sm:pb-16 sm:pt-8" id="top">
      <div className="relative isolate grid overflow-hidden rounded-[1.5rem] bg-[#1E1B18] shadow-[0_24px_70px_rgba(30,27,24,0.12)] md:min-h-[510px] md:grid-cols-[0.88fr_1.12fr] lg:min-h-[590px]">
        <div className="order-2 flex flex-col items-start justify-center px-6 pb-8 pt-2 text-[#FAF7F2] sm:px-10 sm:pb-11 md:order-1 md:px-12 md:py-12 lg:px-[4.5rem]">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-[#F1EBE1] sm:text-[11px]">
            <Icon name="sparkle" className="size-4" />
            A LITTLE SOMETHING LOVELY
          </p>
          <h1 className="serif-display max-w-[560px] text-[clamp(2.8rem,5.7vw,5.3rem)] leading-[0.98]">
            Little Treasures
            <br />
            <span className="text-[#B85042]">Beautiful finds for every little moment.</span>
          </h1>
          <p className="mt-5 max-w-[390px] text-sm leading-7 text-white/75 sm:text-[15px]">
            Discover beautiful home decorations, adorable kids&apos; outfits, and
            charming fashion accessories for your special moments.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center gap-4 rounded-full bg-[#B85042] px-6 text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#9A3F33]"
            >
              SHOP THE COLLECTION
              <Icon name="arrow" className="size-4" />
            </Link>
            <Link
              href="/#categories"
              className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-medium text-white/85 transition-colors hover:text-white"
            >
              Explore collections
              <Icon name="chevron" className="size-4" />
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-3 border-t border-white/20 pt-5 text-xs text-white/70">
            <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-[#F1EBE1]">
              <Icon name="heart" className="size-4" />
            </span>
            Carefully chosen. Always a little personal.
          </div>
        </div>

        <div className="relative order-1 min-h-[275px] overflow-hidden md:order-2 md:min-h-full">
          <Image
            src="/categories/home-decor.svg"
            alt="Illustration of a decorated doorway and traditional toran"
            fill
            loading="eager"
            sizes="(max-width: 768px) 100vw, 58vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B18]/50 via-transparent to-[#1E1B18]/5 md:bg-gradient-to-r md:from-[#1E1B18]/10 md:to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full border border-white/50 bg-[#FAF7F2]/95 px-4 py-2.5 text-[#1E1B18] shadow-lg sm:bottom-7 sm:left-7">
            <Icon name="sparkle" className="size-4 text-[#B85042]" />
            <span className="text-[10px] font-semibold tracking-[0.1em]">
              HOME & DECOR · KIDS WEAR · ACCESSORIES
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
