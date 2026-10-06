"use client";

import { ErrorView } from "@/components/ErrorView";

// Dentro del panel: el menú lateral sigue visible.
export default function PanelError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={error} retry={retry} homeHref="/admin/dashboard" homeLabel="Ir al resumen" />;
}
