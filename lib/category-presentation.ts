import type { ShopCategory } from "@/lib/catalog-types";

export const categories: ShopCategory[] = [
  {
    name: "Home & Decor",
    description: "Toran and decorative doormats",
    image: "/categories/home-decor.svg",
    imageAlt: "Illustration of a decorated doorway and traditional toran",
  },
  {
    name: "Kids Wear",
    description: "Ghagra, frocks and palazzo",
    image: "/categories/kids-wear.svg",
    imageAlt: "Illustration of a girls festive dress",
  },
  {
    name: "Fashion & Hair Accessories",
    description: "Potli bags and hair clips",
    image: "/categories/fashion-accessories.svg",
    imageAlt: "Illustration of a potli bag and decorative hair clip",
  },
];

export function categoryMatches(
  productCategory: string | null,
  selectedCategory: string,
) {
  if (!productCategory) return false;
  const normalize = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  return normalize(productCategory) === normalize(selectedCategory);
}
