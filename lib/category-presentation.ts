import type { ShopCategory } from "@/lib/catalog-types";

export const categories: ShopCategory[] = [
  {
    name: "Apparel",
    description: "Soft layers, made to stay",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Friends browsing a thoughtfully curated clothing rack",
  },
  {
    name: "Bags",
    description: "Everyday, beautifully carried",
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85",
    imageAlt: "A classic leather handbag in a warm neutral tone",
  },
  {
    name: "Jewellery",
    description: "The finishing little things",
    image:
      "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Delicate gold jewellery arranged on a soft neutral surface",
  },
  {
    name: "Home & Gifts",
    description: "A little joy for every corner",
    image:
      "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=85",
    imageAlt: "A calm, sunlit living room with warm natural textures",
  },
];

export function categoryMatches(
  productCategory: string | null,
  selectedCategory: string,
) {
  if (!productCategory) {
    return false;
  }

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/jewellery/g, "jewelry")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]/g, "");

  return normalize(productCategory) === normalize(selectedCategory);
}
