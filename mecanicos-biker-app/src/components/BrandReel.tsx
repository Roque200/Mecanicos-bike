// Cinta de logos de las marcas con las que trabaja el taller, corriendo de
// fondo detrás del calendario y el formulario de citas. Es solo decoración
// (aria-hidden): las marcas no aportan nada a quien usa lector de pantalla.

type Brand = { name: string; src: string; width: number; height: number };

// width/height = tamaño en pantalla (proporción del archivo original).
const BRANDS: Brand[] = [
  { name: "Shimano", src: "/brands/shimano.png", width: 139, height: 22 },
  { name: "SRAM", src: "/brands/sram.png", width: 134, height: 24 },
  { name: "Fox", src: "/brands/fox.png", width: 73, height: 51 },
  { name: "RockShox", src: "/brands/rockshox.png", width: 52, height: 61 },
  { name: "Marzocchi", src: "/brands/marzocchi.png", width: 101, height: 55 },
  { name: "SR Suntour", src: "/brands/srsuntour.png", width: 176, height: 27 },
  { name: "Lefty", src: "/brands/lefty.png", width: 126, height: 78 },
  { name: "Manitou", src: "/brands/manitou.png", width: 106, height: 41 },
];

// Cada fila arranca en otra marca y corre a otra velocidad/dirección, para
// que no se vean tres filas iguales.
const ROWS = [
  { offset: 0, className: "animate-brand-reel" },
  { offset: 3, className: "animate-brand-reel-reverse" },
  { offset: 6, className: "animate-brand-reel-slow" },
];

function rotate<T>(list: T[], by: number) {
  return [...list.slice(by), ...list.slice(0, by)];
}

function BrandList({ brands }: { brands: Brand[] }) {
  return (
    <ul className="flex shrink-0 items-center gap-16 pr-16 sm:gap-24 sm:pr-24">
      {brands.map((brand) => (
        <li key={brand.name} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.src} alt="" width={brand.width} height={brand.height} loading="lazy" decoding="async" draggable={false} />
        </li>
      ))}
    </ul>
  );
}

export function BrandReel() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-1/2 flex w-screen -translate-x-1/2 select-none flex-col justify-around overflow-hidden opacity-25 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
    >
      {ROWS.map((row) => {
        const brands = rotate(BRANDS, row.offset);
        return (
          // La lista va dos veces: al recorrer la mitad, la segunda copia
          // queda justo donde empezó la primera y el ciclo no se nota.
          <div key={row.offset} className={`flex w-max ${row.className}`}>
            <BrandList brands={brands} />
            <BrandList brands={brands} />
          </div>
        );
      })}
    </div>
  );
}
