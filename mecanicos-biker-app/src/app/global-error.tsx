"use client";

// Último recurso, si falla el propio layout raíz: no carga los estilos del
// sitio, así que lleva los suyos en línea.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f7", color: "#1d1d1f" }}>
        <title>Algo salió mal · Mecánicos Bike</title>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, background: "#fff", borderRadius: 24, padding: 32, textAlign: "center" }}>
            <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>No pudimos cargar el sitio</h1>
            <p style={{ color: "#6e6e73", fontSize: 15, lineHeight: 1.5, margin: "0 0 24px" }}>
              Puede ser un problema momentáneo de conexión. Intenta de nuevo en unos segundos.
            </p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ height: 44, padding: "0 24px", border: 0, borderRadius: 999, background: "#f9670c", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              Intentar de nuevo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
