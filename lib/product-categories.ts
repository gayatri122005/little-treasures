export const PRODUCT_CATEGORIES = [
  "Home & Decor",
  "Kids Wear",
  "Fashion & Hair Accessories",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_TYPES_BY_CATEGORY: Record<ProductCategory, readonly string[]> = {
  "Home & Decor": ["Toran", "Doormats"],
  "Kids Wear": ["Ghagra", "Frocks", "Palazzo"],
  "Fashion & Hair Accessories": ["Potli Bags", "Hair Clips"],
};

export const PRODUCT_TYPES = PRODUCT_CATEGORIES.flatMap(
  (category) => PRODUCT_TYPES_BY_CATEGORY[category],
);
