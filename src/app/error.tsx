"use client";

import { useEffect } from "react";
import { captureClientError, notifyError } from "@/lib/client-errors";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureClientError(error, { digest: error.digest, boundary: "route" }); notifyError("La página encontró un problema."); }, [error]);
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Centro de Finanzas</p><h1 className="mt-3 text-2xl font-semibold text-card-foreground">No pudimos mostrar esta página</h1><p className="mt-3 text-sm text-muted-foreground">El error fue registrado de forma segura.</p><button type="button" onClick={() => reset()} className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Intentar de nuevo</button></section></main>;
}

