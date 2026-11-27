import ProductListing from "@/components/ProductListing";
import { ProductCatalogProvider } from "@/components/ProductCatalogContext";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
  }>;
}) {
  const { q, category } = await searchParams;
  const initialSearchTerm = typeof q === "string" ? q : "";
  const initialCategory = typeof category === "string" ? category : "";

  return (
    <ProductCatalogProvider>
      <ProductListing
        initialSearchTerm={initialSearchTerm}
        initialCategory={initialCategory}
      />
    </ProductCatalogProvider>
  );
}
