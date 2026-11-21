import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
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
      <Navbar />
      <ProductDetails productId={id} />
      <Footer />
    </ProductCatalogProvider>
  );
}