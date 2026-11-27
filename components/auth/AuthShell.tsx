import type { ReactNode } from "react";
import Link from "next/link";
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
    <main className="min-h-screen bg-[#FAF7F2] px-3 py-4 sm:px-7 sm:py-7">
      <div className="mx-auto mt-6 grid w-full max-w-[1320px] overflow-hidden rounded-3xl border border-[#E3D8C9] bg-[#FAF7F2] shadow-[0_20px_70px_rgba(54,48,38,0.08)] md:mt-8 md:min-h-[min(760px,calc(100vh-120px))] md:grid-cols-[1fr_0.88fr]">
        <section className="relative hidden min-h-[620px] overflow-hidden bg-[#1E1B18] md:block">
          <div className="absolute inset-0 bg-[url('/categories/kids-wear.svg')] bg-cover bg-center" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B18]/70 via-[#1E1B18]/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-10 text-white lg:p-14">
            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-[#F1EBE1]">
              <Icon name="sparkle" className="size-4" />
              THOUGHTFUL FINDS, JUST FOR YOU
            </p>
            <h2 className="serif-display mt-4 max-w-[540px] text-5xl leading-[1.05] lg:text-6xl">
              OMTreasure moments.
              <br />
              Big happy.
            </h2>
            <p className="mt-4 max-w-[380px] text-sm leading-6 text-white/80">
              A lovely corner for the things you&apos;ll treasure.
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
