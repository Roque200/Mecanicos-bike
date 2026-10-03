// Sin este archivo, Next.js no muestra nada al navegar entre secciones del
// panel (todas son force-dynamic y esperan a la base de datos) — el clic se
// siente "colgado" hasta que termina el fetch. Con loading.tsx, Next muestra
// esto de inmediato mientras carga la página de destino.
export default function AdminPanelLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-accent" />
    </div>
  );
}
