// La portada y la tienda son force-dynamic (dependen de datos que cambian
// desde el panel). Sin loading.tsx, Next no muestra nada hasta que esos
// fetches terminan — este archivo da feedback inmediato al navegar.
export default function PublicLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-accent" />
    </div>
  );
}
