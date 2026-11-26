import Image from "next/image";
import Link from "next/link";
import type { ShopCategory } from "@/lib/catalog-types";

export default function CategoryCard({ category }: { category: ShopCategory }) {
  return <Link href={`/products?category=${encodeURIComponent(category.name)}`} className="category-card" aria-label={`Shop ${category.name}`}>
    <Image src={category.image ?? "/categories/home-decor.svg"} alt={category.imageAlt} width={260} height={150} />
    <span className="category-card-content"><h3>{category.name}</h3><p>{category.description}</p><span className="purple-button">Shop Now <b>›</b></span></span>
  </Link>;
}
