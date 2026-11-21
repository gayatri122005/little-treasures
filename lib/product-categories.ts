export const PRODUCT_CATEGORIES = [
  "Apparel",
  "Bags",
  "Jewellery",
  "Home & Gifts",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
