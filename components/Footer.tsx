import Link from "next/link";
import Icon from "@/components/icons";

const groups = [
  { title: "About OmTreasure", links: [["About Us", "/about"], ["Contact Us", "/contact"], ["Our Story", "/about"]] },
  { title: "Customer Service", links: [["Help Center", "/contact"], ["FAQs", "/contact"], ["Shipping Information", "/contact"], ["Cancellation & Returns", "/contact"], ["Order Tracking", "/customer-dashboard#recent-orders"]] },
  { title: "Policies", links: [["Privacy Policy", "/contact"], ["Terms & Conditions", "/contact"], ["Return & Refund Policy", "/contact"], ["Shipping Policy", "/contact"], ["Payment Policy", "/checkout"]] },
  { title: "Shop", links: [["All Products", "/products"], ["New Arrivals", "/products?collection=new-arrivals"], ["Best Sellers", "/products"], ["Featured Collections", "/products?collection=featured"], ["Special Offers", "/products"]] },
];

export default function Footer() {
  return <footer id="footer" className="bg-[var(--ink)] text-[var(--page)]"><div className="page-shell grid grid-cols-2 gap-x-5 gap-y-9 py-10 sm:gap-10 sm:py-14 lg:grid-cols-[1.25fr_repeat(4,1fr)_1.25fr]">
    <div className="col-span-2 lg:col-span-1"><Link href="/#top" className="inline-flex items-center gap-2.5" aria-label="OmTreasure home"><span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-[var(--surface-soft)]"><Icon name="sparkle" className="size-[19px]" /></span><span className="serif-display text-[23px]">OmTreasure</span></Link><p className="mt-4 max-w-[250px] text-sm leading-6 text-white/65">Thoughtful finds for little moments, made for your home and family.</p></div>
    {groups.map((group) => <div key={group.title}><h2 className="text-[10px] font-semibold tracking-[0.16em] text-[var(--surface-soft)]">{group.title.toUpperCase()}</h2><ul className="mt-4 space-y-3">{group.links.map(([label, href]) => <li key={label}><Link href={href} className="text-sm text-white/70 transition-colors hover:text-white">{label}</Link></li>)}</ul></div>)}
    <div><h2 className="text-[10px] font-semibold tracking-[0.16em] text-[var(--surface-soft)]">CONTACT</h2><p className="mt-4 text-sm leading-6 text-white/70">For verified business details and support, visit our contact page.</p><Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-white hover:text-[var(--surface-soft)]">Get in touch <Icon name="arrow" className="size-4" /></Link><p className="mt-5 text-[10px] uppercase tracking-[0.12em] text-white/45">Payments</p><p className="mt-2 text-sm text-white/70">Razorpay · Cash on delivery</p></div>
  </div><div className="border-t border-white/15"><div className="page-shell flex flex-col gap-3 py-4 text-[10px] text-white/50 sm:flex-row sm:items-center sm:justify-between"><p>Copyright © 2026 OmTreasure. All Rights Reserved.</p><div className="flex gap-4"><Link href="/contact" className="hover:text-white">Facebook</Link><Link href="/contact" className="hover:text-white">Instagram</Link><Link href="/contact" className="hover:text-white">YouTube</Link><Link href="/contact" className="hover:text-white">WhatsApp</Link></div></div></div></footer>;
}
