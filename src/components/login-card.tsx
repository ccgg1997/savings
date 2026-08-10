"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KeyRound, Landmark, Mail, ShieldCheck } from "lucide-react";
import { captureClientError, notifyError } from "@/lib/client-errors";

type AuthStatus = {
  googleConfigured: boolean;
  credentialsConfigured: boolean;
  secretConfigured: boolean;
  databaseConfigured: boolean;
  ready: boolean;
};

export function LoginCard({ authStatus, authError }: { authStatus: AuthStatus; authError?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"credentials" | "google" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (authError) notifyError("No pudimos completar el inicio de sesión. Verifica tu acceso e inténtalo de nuevo.");
  }, [authError]);

  async function handleCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authStatus.credentialsConfigured) {
      notifyError("El acceso con contraseña todavía no está disponible.");
      return;
    }
    setLoading("credentials");
    try {
      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
      if (!result?.ok) {
        notifyError("Correo, contraseña o permiso de acceso incorrectos.");
        return;
      }
      router.replace(result.url ?? "/dashboard");
      router.refresh();
    } catch (error) {
      captureClientError(error, { action: "credentials_sign_in" });
      notifyError("No pudimos iniciar sesión.");
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    if (!authStatus.googleConfigured) {
      notifyError("Google OAuth todavía no está configurado.");
      return;
    }
    setLoading("google");
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      captureClientError(error, { action: "google_sign_in" });
      notifyError("No pudimos iniciar sesión con Google.");
      setLoading(null);
    }
  }

  const fieldClass = "h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_oklch,var(--primary)_42%,transparent),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.2),_transparent_38%)]" />
      <section className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl md:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden flex-col justify-between bg-primary p-9 text-primary-foreground md:flex">
          <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-white/15"><Landmark className="size-6" aria-hidden="true" /></div><div><p className="font-bold">Centro de Finanzas</p><p className="text-xs text-white/70">Visión ejecutiva de tus finanzas</p></div></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Acceso controlado</p><h1 className="mt-3 text-3xl font-bold leading-tight">Tu información financiera, solo para las personas autorizadas.</h1><p className="mt-4 text-sm leading-6 text-white/75">El administrador puede crear cuentas, habilitar Google, asignar roles y revocar accesos inmediatamente.</p></div>
          <div className="flex items-center gap-2 text-xs text-white/70"><ShieldCheck className="size-4" aria-hidden="true" />Contraseñas cifradas y secretos en servidor</div>
        </div>

        <div className="p-6 sm:p-9">
          <div className="mb-6 flex items-center gap-3 md:hidden"><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Landmark className="size-5" aria-hidden="true" /></div><div><p className="font-bold text-card-foreground">Centro de Finanzas</p><p className="text-xs text-muted-foreground">Acceso seguro</p></div></div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Bienvenido</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground">Inicia sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">Usa la cuenta creada por el administrador o continúa con Google.</p>

          <form onSubmit={handleCredentials} className="mt-6 space-y-4">
            <label className="block space-y-1.5"><span className="text-xs font-semibold text-card-foreground">Correo</span><span className="relative block"><Mail className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} placeholder="nombre@correo.com" /></span></label>
            <label className="block space-y-1.5"><span className="text-xs font-semibold text-card-foreground">Contraseña</span><span className="relative block"><KeyRound className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} placeholder="Tu contraseña" /></span></label>
            <button type="submit" disabled={loading !== null || !authStatus.credentialsConfigured} className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55">{loading === "credentials" ? "Verificando…" : "Entrar con correo"}</button>
          </form>

          {authStatus.googleConfigured && <><div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">o</span><span className="h-px flex-1 bg-border" /></div><button type="button" disabled={loading !== null} onClick={handleGoogle} className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-card-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-55"><span className="flex size-6 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600 shadow-sm">G</span>{loading === "google" ? "Conectando…" : "Continuar con Google"}</button></>}
          {!authStatus.ready && <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">La autenticación está pendiente de configuración en el servidor.</div>}
          <p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground">Solo pueden ingresar correos activos creados previamente por un administrador.</p>
        </div>
      </section>
    </main>
  );
}
