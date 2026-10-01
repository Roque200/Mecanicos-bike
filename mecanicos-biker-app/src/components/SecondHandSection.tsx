import { listAvailableSecondHandItems } from "@/lib/db";
import { formatMoney, waLink } from "@/lib/whatsapp";

export function SecondHandSection() {
  const items = listAvailableSecondHandItems();
  if (items.length === 0) return null;

  return (
    <div className="mt-16 border-t border-black/5 pt-16">
      <div className="mb-10 text-center">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">Segunda mano</p>
        <h3 className="text-balance text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
          Piezas usadas en buen estado
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted">
          Piezas que nuestros clientes dejaron en consignación al cambiarlas por una nueva.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const message = `Hola, me interesa esta pieza de segunda mano: ${item.name} (${formatMoney(item.price)}). ¿Sigue disponible?`;
          return (
            <div key={item.id} data-testid={`secondhand-${item.id}`} className="flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white">
              <div className="flex h-40 items-center justify-center bg-surface">
                {item.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/uploads/${item.imagePath}`} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[12.5px] text-muted">Sin foto</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-accent">{item.condition}</span>
                <h4 className="text-[15px] font-semibold leading-snug text-[#1d1d1f]">{item.name}</h4>
                <p className="flex-1 text-[13px] leading-relaxed text-muted">{item.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-semibold text-[#1d1d1f]">{formatMoney(item.price)}</span>
                  <a
                    href={waLink(message)}
                    target="_blank"
                    rel="noopener"
                    className="h-8 rounded-full border border-[#1d1d1f]/15 px-3 text-[12.5px] font-semibold text-[#1d1d1f] transition-colors hover:bg-[#1d1d1f] hover:text-white"
                  >
                    Preguntar
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
