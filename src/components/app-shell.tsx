"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BarChart3, LogOut, ShieldCheck, Users, WalletCards } from "lucide-react";
import type { Session } from "next-auth";
import { captureClientError, notifyError } from "@/lib/client-errors";
import type { AppSettingsData } from "@/lib/settings";

export function AppShell({ children, session, settings }: { children: React.ReactNode; session: Session; settings: AppSettingsData }) {
  const pathname = usePathname();
  const isAdmin = session.user.role === "ADMIN";
  const isDashboard = pathname === "/dashboard";
  const navItems = [{ href: "/dashboard", label: "Resumen", icon: BarChart3 }];
  if (isAdmin) navItems.push({ href: "/admin", label: "Usuarios", icon: Users });

  async function handleSignOut() {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      captureClientError(error, { action: "sign_out" });
      notifyError("No pudimos cerrar tu sesión.");
    }
  }

  return (
    <div className={`min-h-dvh border-l-[5px] border-surface-dark bg-background ${isDashboard ? "lg:h-dvh lg:overflow-hidden" : ""}`} data-accent={settings.accent.toLowerCase()}>
      <header className="z-20 h-14 border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-dark text-surface-dark-foreground"><WalletCards className="size-4" aria-hidden="true" /></span><span className="min-w-0"><span className="block truncate text-sm font-bold text-card-foreground">{settings.brandName}</span><span className="hidden text-[10px] text-muted-foreground sm:block">Visión ejecutiva de tus finanzas</span></span></Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="flex items-center gap-1" aria-label="Navegación principal">{navItems.map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition sm:px-3 ${active ? "bg-surface-dark text-surface-dark-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" aria-hidden="true" /><span className="hidden sm:inline">{item.label}</span></Link>; })}</nav>
            <div className="hidden h-7 w-px bg-border sm:block" />
            <div className="flex items-center gap-2"><div className="hidden max-w-52 text-right md:block"><p className="truncate text-[11px] font-bold uppercase text-card-foreground">{session.user.name ?? "Usuario"}</p><p className="text-[10px] text-muted-foreground">{isAdmin ? "Administrador" : "Usuario"}</p></div><div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-bold text-primary">{session.user.image ? <img src={session.user.image} alt="" className="size-full object-cover" /> : (session.user.name ?? session.user.email ?? "U").slice(0, 1).toUpperCase()}</div><button type="button" onClick={handleSignOut} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Cerrar sesión"><LogOut className="size-4" aria-hidden="true" /><span className="sr-only">Cerrar sesión</span></button></div>
          </div>
        </div>
      </header>
      <main className={`mx-auto max-w-[1600px] px-3 sm:px-5 lg:px-6 ${isDashboard ? "py-2.5 lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden" : "py-6 lg:py-7"}`}>{children}</main>
      {!isDashboard && <footer className="mx-auto flex max-w-[1600px] items-center px-3 pb-5 text-[11px] text-muted-foreground sm:px-5 lg:px-6"><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />Datos protegidos y procesados en servidor</span></footer>}
    </div>
  );
}
