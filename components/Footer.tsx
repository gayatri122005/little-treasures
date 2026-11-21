import Link from "next/link";
import Icon from "@/components/icons";

const footerLinks = [
  {
    title: "Come on in",
    links: [
      { label: "Shop favorites", href: "/#favorites" },
      { label: "New arrivals", href: "/#new-arrivals" },
      { label: "Shop categories", href: "/#categories" },
    ],
  },
  {
    title: "A little more",
    links: [
      { label: "Our story", href: "/#story" },
      { label: "Thoughtful gifting", href: "/#thoughtful-gifting" },
      { label: "Newsletter", href: "/#newsletter" },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="footer" className="bg-[#1E1B18] text-[#FFFFFF]">
      <div className="page-shell grid gap-10 py-12 sm:grid-cols-2 sm:py-14 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div>
          <Link
            href="/#top"
            className="inline-flex items-center gap-2.5"
            aria-label="All the Good Things home"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-[#F1EBE1]">
              <Icon name="sparkle" className="size-[19px]" />
            </span>
            <span className="serif-display text-[23px]">all the good things</span>
          </Link>
          <p className="mt-4 max-w-[290px] text-sm leading-6 text-white/65">
            Thoughtful little finds for the moments that make a life. Picked
            with care, and always with you in mind.
          </p>
        </div>
        {footerLinks.map((group) => (
          <div key={group.title}>
            <h2 className="text-[10px] font-semibold tracking-[0.16em] text-[#F1EBE1]">
              {group.title.toUpperCase()}
            </h2>
            <ul className="mt-4 space-y-3">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="text-[10px] font-semibold tracking-[0.16em] text-[#F1EBE1]">
            THE LITTLE PROMISE
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/70">
            Thoughtfully picked. Made to be loved. A little joy, delivered.
          </p>
          <Link
            href="/#newsletter"
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-white hover:text-[#F1EBE1]"
          >
            Get the occasional little note
            <Icon name="arrow" className="size-4" />
          </Link>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="page-shell flex flex-col gap-2 py-4 text-[10px] text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>All the Good Things. Made with care.</p>
          <p>Thoughtful finds for little moments.</p>
        </div>
      </div>
    </footer>
  );
}
