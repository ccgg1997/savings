"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  ChartNoAxesCombined,
  Eye,
  EyeOff,
  KeyRound,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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

  const fieldClass = "h-12 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/75 hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/10";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-3 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 right-0 size-96 rounded-full bg-amber-200/25 blur-3xl" />

      <section className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border/80 bg-card shadow-[0_28px_90px_rgba(25,48,40,0.14)] lg:min-h-[710px] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="finance-grid relative hidden overflow-hidden bg-surface-dark p-10 text-surface-dark-foreground lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-8 size-96 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-surface-dark shadow-lg shadow-black/20">
              <Landmark className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">Centro de Finanzas</p>
              <p className="text-xs text-white/50">Inteligencia para tu dinero</p>
            </div>
          </div>

          <div className="relative my-10 max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 backdrop-blur">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Tus finanzas, finalmente claras
            </div>
            <h1 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-5xl">
              Convierte cada movimiento en una mejor decisión.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/58">
              Entiende lo que ingresa, controla lo que gastas y sigue el progreso de tus metas desde un solo lugar.
            </p>

            <div className="mt-9 rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/20 backdrop-blur-md xl:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Balance del mes</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">$1.300.000</p>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">+25,4%</span>
              </div>

              <div className="mt-5 grid grid-cols-12 items-end gap-2" aria-hidden="true">
                {[42, 56, 48, 68, 59, 78, 65, 84, 70, 88, 75, 94].map((height, index) => (
                  <div key={index} className="flex h-20 items-end rounded-full bg-white/5">
                    <span
                      className={`w-full rounded-full ${index > 8 ? "bg-emerald-400" : "bg-white/25"}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
                <PreviewStat label="Ingresos" value="$3,45 M" tone="text-emerald-300" />
                <PreviewStat label="Gastos" value="$2,15 M" tone="text-orange-300" />
                <PreviewStat label="Ahorro" value="37,7%" tone="text-blue-300" />
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between gap-4 text-[11px] text-white/45">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-300" aria-hidden="true" />Acceso protegido</span>
            <span>Datos sincronizados de forma segura</span>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 xl:px-14">
          <div className="mb-9 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-surface-dark text-surface-dark-foreground">
                <Landmark className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-card-foreground">Centro de Finanzas</p>
                <p className="text-[11px] text-muted-foreground">Inteligencia para tu dinero</p>
              </div>
            </div>
            <LockKeyhole className="size-5 text-primary" aria-hidden="true" />
          </div>

          <div className="mb-8">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <ChartNoAxesCombined className="size-6" aria-hidden="true" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Bienvenido de nuevo</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-card-foreground">Inicia sesión</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Accede a tu panorama financiero y continúa donde lo dejaste.</p>
          </div>

          <form onSubmit={handleCredentials} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-xs font-bold text-card-foreground">Correo electrónico</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3.5 top-4 size-4 text-muted-foreground" aria-hidden="true" />
                <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} placeholder="nombre@correo.com" />
              </span>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold text-card-foreground">Contraseña</span>
              <span className="relative block">
                <KeyRound className="pointer-events-none absolute left-3.5 top-4 size-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${fieldClass} pr-12`}
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading !== null || !authStatus.credentialsConfigured}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-dark px-4 text-sm font-bold text-surface-dark-foreground shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl disabled:pointer-events-none disabled:opacity-55"
            >
              {loading === "credentials" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              {loading === "credentials" ? "Verificando…" : "Entrar a mi cuenta"}
              {loading !== "credentials" ? <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /> : null}
            </button>
          </form>

          {authStatus.googleConfigured ? (
            <>
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">o continúa con</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                disabled={loading !== null}
                onClick={handleGoogle}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-card px-4 text-sm font-bold text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted disabled:pointer-events-none disabled:opacity-55"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600 shadow-sm ring-1 ring-slate-200">G</span>
                {loading === "google" ? "Conectando…" : "Continuar con Google"}
              </button>
            </>
          ) : null}

          {!authStatus.ready ? (
            <div role="status" className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900">
              <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>La autenticación está pendiente de configuración en el servidor.</span>
            </div>
          ) : null}

          <p className="mt-7 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-muted-foreground">
            <LockKeyhole className="size-3.5 text-primary" aria-hidden="true" />
            Solo pueden ingresar cuentas previamente autorizadas.
          </p>
        </div>
      </section>
    </main>
  );
}

function PreviewStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className="text-[9px] text-white/35">{label}</p>
      <p className={`mt-1 text-xs font-bold ${tone}`}>{value}</p>
    </div>
  );
}
