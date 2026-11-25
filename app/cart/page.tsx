import CartPageClient from "@/components/CartPageClient";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ProductCatalogProvider } from "@/components/ProductCatalogContext";

export const metadata = {
  title: "Shopping Bag | Little Treasures",
  description: "Review your Little Treasures shopping bag before checkout.",
};

export default function CartPage() {
  return (
    <ProductCatalogProvider>
      <Navbar />
      <CartPageClient />
      <Footer />
    </ProductCatalogProvider>
  );
}
