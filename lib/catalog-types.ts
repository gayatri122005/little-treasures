import { z } from "zod";

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  productType: z.string().nullable().optional(),
  description: z.string(),
  price: z.number(),
  stock: z.number(),
  status: z.enum(["active", "out_of_stock"]),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  showOnHomepage: z.boolean().default(true),
  image: z.string().nullable(),
  createdAt: z.string(),
});

export const catalogResponseSchema = z.object({
  success: z.literal(true),
  products: z.array(productSchema),
});

export const paginatedCatalogResponseSchema = catalogResponseSchema.extend({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pageCount: z.number(),
  }),
});

export const productVideoSchema = z.object({
  src: z.string(),
  thumbnail: z.string().nullable(),
});

export const productDetailResponseSchema = z.object({
  success: z.literal(true),
  product: productSchema.extend({
    images: z.array(z.string()),
    videos: z.array(productVideoSchema),
  }),
});

export type Product = {
  id: string;
  name: string;
  category: string | null;
  productType?: string | null;
  price: number;
  description: string;
  image: string | null;
  stock: number;
  status: "active" | "out_of_stock";
  isFeatured: boolean;
  isNewArrival: boolean;
  showOnHomepage: boolean;
  createdAt: string;
};

export type ShopCategory = {
  name: string;
  description: string;
  image: string;
  imageAlt: string;
};

export type ProductVideo = z.infer<typeof productVideoSchema>;
