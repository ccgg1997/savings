"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Landmark, ShieldCheck } from "lucide-react";
import { captureClientError, notifyError } from "@/lib/client-errors";

type AuthStatus = {
  googleConfigured: boolean;
  secretConfigured: boolean;
  databaseConfigured: boolean;
  ready: boolean;
};

export function LoginCard({ authStatus, authError }: { authStatus: AuthStatus; authError?: string }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authError) notifyError("No pudimos completar el inicio de sesión. El incidente fue registrado.");
  }, [authError]);

  async function handleSignIn() {
    if (!authStatus.ready) {
      notifyError("La autenticación todavía no está configurada en el servidor.");
      return;
    }
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      captureClientError(error, { action: "google_sign_in" });
      notifyError("No pudimos iniciar sesión con Google.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0e4438] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(181,231,200,0.32),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(54,139,112,0.45),_transparent_40%)]" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/15 bg-white/95 p-8 shadow-2xl backdrop-blur sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Landmark className="size-6" aria-hidden="true" /></div>
          <div><p className="text-lg font-bold text-card-foreground">Centro de Finanzas</p><p className="text-xs text-muted-foreground">Control total de tus ingresos y gastos</p></div>
        </div>
        <div className="space-y-2"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Acceso seguro</p><h1 className="text-3xl font-semibold tracking-tight text-card-foreground">Bienvenido de nuevo</h1><p className="text-sm leading-6 text-muted-foreground">Usa tu cuenta de Google para entrar a tu panel financiero.</p></div>
        <button type="button" disabled={loading || !authStatus.ready} onClick={handleSignIn} className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-card-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
          <span className="flex size-6 items-center justify-center rounded-full bg-white text-sm font-bold shadow-sm">G</span>{loading ? "Conectando…" : "Continuar con Google"}
        </button>
        {!authStatus.ready && <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">La autenticación está pendiente de configuración en Vercel. El acceso se habilitará cuando Google OAuth y PostgreSQL estén conectados.</div>}
        <div className="mt-7 flex items-start gap-3 rounded-xl bg-muted p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><p className="text-xs leading-5 text-muted-foreground">Tus credenciales se procesan mediante Google OAuth. Los secretos y la conexión a Notion permanecen en el servidor.</p></div>
      </section>
    </main>
  );
}
