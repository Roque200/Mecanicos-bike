import { SectionHeader } from "./SectionHeader";
import { ProductsGrid } from "./ProductsGrid";
import { listProducts, listAvailableSecondHandItems } from "@/lib/db";

export function Products() {
  const products = listProducts();
  const secondHand = listAvailableSecondHandItems();

  return (
    <section id="productos" className="bg-surface pb-24 pt-32 sm:pb-32 sm:pt-40">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeader
          eyebrow="Tienda"
          title="Productos en venta"
          desc="Refacciones y accesorios que también instalamos en el taller."
        />
        <ProductsGrid products={products} secondHand={secondHand} />
      </div>
    </section>
  );
}
