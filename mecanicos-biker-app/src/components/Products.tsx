import { SectionHeader } from "./SectionHeader";
import { ProductsGrid } from "./ProductsGrid";
import { SecondHandSection } from "./SecondHandSection";
import { listProducts } from "@/lib/db";

export function Products() {
  const products = listProducts();

  return (
    <section id="productos" className="bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeader
          eyebrow="Tienda"
          title="Productos en venta"
          desc="Refacciones y accesorios que también instalamos en el taller."
        />
        <ProductsGrid products={products} />
        <SecondHandSection />
      </div>
    </section>
  );
}
