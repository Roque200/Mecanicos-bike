import { SectionHeader } from "./SectionHeader";

const VALUES = [
  {
    n: "01",
    title: "Profesionalismo",
    desc: "Realizamos cada trabajo con responsabilidad, conocimientos técnicos y compromiso con la calidad.",
  },
  {
    n: "02",
    title: "Honestidad",
    desc: "Ofrecemos diagnósticos transparentes, recomendaciones reales y presupuestos justos para nuestros clientes.",
  },
  {
    n: "03",
    title: "Pasión por el ciclismo",
    desc: "Nuestra pasión por las bicicletas es el motor que nos impulsa a mejorar y ofrecer lo mejor de nosotros.",
  },
  {
    n: "04",
    title: "Calidad",
    desc: "Buscamos la excelencia en cada mantenimiento, reparación y servicio realizado.",
  },
  {
    n: "05",
    title: "Innovación",
    desc: "Nos mantenemos en constante actualización, capacitación y aprendizaje sobre nuevas tecnologías y componentes.",
  },
  {
    n: "06",
    title: "Trabajo en equipo",
    desc: "Creemos que la unión, el respeto y la colaboración son fundamentales para alcanzar nuestros objetivos.",
  },
  {
    n: "07",
    title: "Compromiso",
    desc: "Nos comprometemos con cada bicicleta y con cada persona que deposita su confianza en nosotros.",
  },
  {
    n: "08",
    title: "Confianza",
    desc: "Construimos relaciones duraderas con nuestros clientes mediante resultados, atención y transparencia.",
  },
  {
    n: "09",
    title: "Responsabilidad",
    desc: "Trabajamos pensando en la seguridad del ciclista y el correcto funcionamiento de su bicicleta.",
  },
  {
    n: "10",
    title: "Crecimiento constante",
    desc: "Creemos que nunca dejamos de aprender. Cada reto representa una oportunidad para mejorar como profesionales y como empresa.",
  },
];

export function AboutUs() {
  return (
    <section id="nosotros" className="bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeader eyebrow="Quiénes somos" title="Misión y visión" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:p-10">
            <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">Misión</p>
            <p className="text-[14.5px] leading-relaxed text-[#1d1d1f]/75">
              En Mecánicos Bike Service Center tenemos como misión ofrecer servicios profesionales de
              mantenimiento, reparación y optimización de bicicletas, brindando soluciones de calidad
              mediante conocimientos técnicos, experiencia y capacitación constante.
            </p>
            <p className="mt-4 text-[14.5px] leading-relaxed text-[#1d1d1f]/75">
              Somos un equipo conformado por dos hermanos e ingenieros apasionados por el ciclismo,
              comprometidos con ofrecer atención personalizada, honestidad y confianza a cada cliente.
            </p>
            <p className="mt-4 text-[14.5px] leading-relaxed text-[#1d1d1f]/75">
              Nos especializamos en mecánica integral de bicicletas, mantenimiento de suspensiones y
              componentes de diferentes marcas, trabajando con herramientas adecuadas, procedimientos
              técnicos y estándares de calidad para garantizar el mejor funcionamiento y seguridad de cada
              bicicleta.
            </p>
          </div>

          <div className="rounded-3xl bg-[#1d1d1f] p-8 text-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:p-10">
            <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">Visión</p>
            <p className="text-[14.5px] leading-relaxed text-white/70">
              Ser un centro de servicio líder y referente en el sector ciclista a nivel regional y
              nacional, reconocido por nuestra calidad técnica, profesionalismo, innovación y compromiso
              con nuestros clientes.
            </p>
            <p className="mt-4 text-[14.5px] leading-relaxed text-white/70">
              Buscamos crecer constantemente como empresa, ampliar nuestras instalaciones, fortalecer
              nuestras certificaciones y consolidarnos como un centro especializado y autorizado en el
              mantenimiento de las principales marcas del ciclismo.
            </p>
            <p className="mt-4 text-[14.5px] leading-relaxed text-white/70">
              Queremos construir una empresa que trascienda generaciones, impulsando el desarrollo del
              ciclismo y demostrando que la pasión, la preparación profesional y el trabajo en equipo
              pueden transformar un pequeño emprendimiento en una gran historia de éxito.
            </p>
          </div>
        </div>

        <div className="mt-20 sm:mt-28">
          <SectionHeader eyebrow="Lo que nos define" title="Nuestros valores" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {VALUES.map((v) => (
              <div
                key={v.n}
                className="group rounded-2xl border border-black/5 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/20 hover:shadow-lg"
              >
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white transition-transform duration-300 group-hover:scale-110">
                  {v.n}
                </span>
                <h3 className="mb-1.5 text-[14.5px] font-semibold text-[#1d1d1f]">{v.title}</h3>
                <p className="text-[12.5px] leading-relaxed text-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
