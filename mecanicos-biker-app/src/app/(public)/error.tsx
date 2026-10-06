"use client";

import { ErrorView } from "@/components/ErrorView";

// Dentro del sitio público: la barra de navegación y el pie siguen visibles.
export default function PublicError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={error} retry={retry} />;
}
