import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/icons";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  alternatePrompt: string;
  alternateLink: string;
  alternateHref: string;
  children: ReactNode;
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  alternatePrompt,
  alternateLink,
  alternateHref,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#FFFFFF] px-3 py-4 sm:px-7 sm:py-7">
      <header className="mx-auto flex w-full max-w-[1320px] items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5"
          aria-label="All the Good Things home"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-[#F1EBE1] text-[#B85042]">
            <Icon name="sparkle" className="size-[19px]" />
          </span>
          <span className="serif-display text-[21px] leading-none sm:text-[23px]">
            all the good things
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#6E655F] transition-colors hover:text-[#B85042]"
        >
          <Icon name="arrow" className="size-4 rotate-180" />
          <span className="hidden sm:inline">Back to the shop</span>
          <span className="sm:hidden">Shop</span>
        </Link>
      </header>

      <div className="mx-auto mt-6 grid w-full max-w-[1320px] overflow-hidden rounded-3xl border border-[#E3D8C9] bg-[#FFFFFF] shadow-[0_20px_70px_rgba(54,48,38,0.08)] md:mt-8 md:min-h-[min(760px,calc(100vh-120px))] md:grid-cols-[1fr_0.88fr]">
        <section className="relative hidden min-h-[620px] overflow-hidden bg-[#1E1B18] md:block">
          <Image
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=90"
            alt="Friends finding thoughtful pieces together"
            fill
            priority
            sizes="(max-width: 900px) 0px, 55vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B18]/70 via-[#1E1B18]/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-10 text-white lg:p-14">
            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-[#F1EBE1]">
              <Icon name="sparkle" className="size-4" />
              THOUGHTFUL FINDS, JUST FOR YOU
            </p>
            <h2 className="serif-display mt-4 max-w-[540px] text-5xl leading-[1.05] lg:text-6xl">
              Little things.
              <br />
              Big happy.
            </h2>
            <p className="mt-4 max-w-[380px] text-sm leading-6 text-white/80">
              A lovely little corner for the things you&apos;ll treasure.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12 md:px-10 lg:px-16">
          <div className="w-full max-w-[420px]">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="serif-display mt-2 text-[2.65rem] leading-[1.08] text-[#1E1B18] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-[390px] text-sm leading-6 text-[#6E655F]">
              {description}
            </p>
            <div className="mt-7">{children}</div>
            <p className="mt-6 text-center text-sm text-[#6E655F]">
              {alternatePrompt}{" "}
              <Link
                href={alternateHref}
                className="font-semibold text-[#1E1B18] underline decoration-[#B85042] underline-offset-4 hover:text-[#9A3F33]"
              >
                {alternateLink}
              </Link>
            </p>
            <p className="mt-8 border-t border-[#F1EBE1] pt-5 text-center text-[10px] leading-5 text-[#6E655F]">
              Thoughtfully picked. Made to be loved.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
