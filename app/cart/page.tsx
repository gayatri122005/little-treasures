import CartPageClient from "@/components/CartPageClient";
import { ProductCatalogProvider } from "@/components/ProductCatalogContext";

export const metadata = {
  title: "Shopping Bag | OMTreasure",
  description: "Review your OMTreasure shopping bag before checkout.",
};

export default function CartPage() {
  return (
    <ProductCatalogProvider>
      <CartPageClient />
    </ProductCatalogProvider>
  );
}
