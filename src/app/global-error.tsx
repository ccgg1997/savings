"use client";

import { useEffect } from "react";
import { captureClientError } from "@/lib/client-errors";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureClientError(error, { digest: error.digest, boundary: "global" }); }, [error]);
  return <html lang="es"><body><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif" }}><section style={{ maxWidth: 420, textAlign: "center" }}><h1>Algo salió mal</h1><p>El incidente fue registrado. Intenta cargar la aplicación de nuevo.</p><button type="button" onClick={() => reset()}>Recargar</button></section></main></body></html>;
}

