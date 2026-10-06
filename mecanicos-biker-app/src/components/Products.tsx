import { SectionHeader } from "./SectionHeader";
import { ProductsGrid } from "./ProductsGrid";
import { listProducts, listAvailableSecondHandItems } from "@/lib/db";

export async function Products() {
  const [products, secondHand] = await Promise.all([listProducts(), listAvailableSecondHandItems()]);

  return (
    <section id="productos" className="bg-surface pb-24 pt-32 sm:pb-32 sm:pt-40">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeader
          as="h1"
          eyebrow="Tienda"
          title="Productos en venta"
          desc="Refacciones y accesorios que también instalamos en el taller."
        />
        <ProductsGrid products={products} secondHand={secondHand} />
      </div>
    </section>
  );
}
