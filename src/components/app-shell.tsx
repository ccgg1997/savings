"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BarChart3, LogOut, Settings, ShieldCheck, Users, Wallet } from "lucide-react";
import type { Session } from "next-auth";
import { captureClientError, notifyError } from "@/lib/client-errors";
import type { AppSettingsData } from "@/lib/settings";

export function AppShell({ children, session, settings }: { children: React.ReactNode; session: Session; settings: AppSettingsData }) {
  const pathname = usePathname();
  const isAdmin = session.user.role === "ADMIN";
  const navItems = [{ href: "/dashboard", label: "Resumen", icon: BarChart3 }];
  if (isAdmin) navItems.push({ href: "/admin", label: "Administración", icon: Users });

  async function handleSignOut() {
    try { await signOut({ callbackUrl: "/login" }); } catch (error) { captureClientError(error, { action: "sign_out" }); notifyError("No pudimos cerrar tu sesión."); }
  }

  return (
    <div className="min-h-screen bg-background" data-accent={settings.accent.toLowerCase()}>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0e4438] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><Wallet className="size-5" aria-hidden="true" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold sm:text-base">{settings.brandName}</p><p className="hidden text-[10px] text-white/70 sm:block">Control total de tus ingresos y gastos</p></div></Link>
          <div className="flex items-center gap-2 sm:gap-4"><nav className="hidden items-center gap-1 md:flex">{navItems.map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon className="size-4" aria-hidden="true" />{item.label}</Link>; })}</nav><div className="hidden h-8 w-px bg-white/15 sm:block" /><div className="flex items-center gap-2"><div className="hidden text-right sm:block"><p className="text-xs font-semibold">{session.user.name ?? "Usuario"}</p><p className="text-[10px] text-white/65">{isAdmin ? "Administrador" : "Usuario"}</p></div><div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[#b5e7c8] text-sm font-bold text-[#0e4438]">{session.user.image ? <img src={session.user.image} alt="" className="size-full object-cover" /> : (session.user.name ?? "U").slice(0, 1).toUpperCase()}</div><button type="button" onClick={handleSignOut} className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white" title="Cerrar sesión"><LogOut className="size-4" aria-hidden="true" /><span className="sr-only">Cerrar sesión</span></button></div></div>
        </div>
        <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-auto px-4 pb-3 md:hidden sm:px-6 lg:px-10">{navItems.map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${active ? "bg-white/15 text-white" : "text-white/70"}`}><Icon className="size-4" aria-hidden="true" />{item.label}</Link>; })}</nav>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      <footer className="mx-auto flex max-w-[1500px] items-center justify-between px-4 pb-6 text-[11px] text-muted-foreground sm:px-6 lg:px-10"><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />Datos protegidos y procesados en servidor</span><span className="hidden items-center gap-1.5 sm:flex"><Settings className="size-3.5" aria-hidden="true" />{settings.compactMode ? "Vista compacta" : "Vista estándar"}</span></footer>
    </div>
  );
}

