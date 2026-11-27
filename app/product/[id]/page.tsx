import ProductDetails from "@/components/ProductDetails";
import { ProductCatalogProvider } from "@/components/ProductCatalogContext";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProductCatalogProvider>
      <ProductDetails productId={id} />
    </ProductCatalogProvider>
  );
}
