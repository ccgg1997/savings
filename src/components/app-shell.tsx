"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, LayoutDashboard, LogOut, Menu, ReceiptText, ShieldCheck, UsersRound, WalletCards, X } from "lucide-react";
import type { Session } from "next-auth";
import { captureClientError, notifyError } from "@/lib/client-errors";
import type { AppSettingsData } from "@/lib/settings";

export function AppShell({ children, session, settings }: { children: React.ReactNode; session: Session; settings: AppSettingsData }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const isAdmin = session.user.role === "ADMIN";
  const navItems = [
    { href: "/dashboard", label: "Resumen", description: "Tu panorama financiero", icon: LayoutDashboard },
    { href: "/movimientos", label: "Movimientos", description: "Ingresos, gastos y filtros", icon: ReceiptText },
  ];
  if (isAdmin) navItems.push({ href: "/admin", label: "Administración", description: "Usuarios y apariencia", icon: UsersRound });

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!mobileMenuRef.current?.contains(event.target as Node)) setMobileMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  async function handleSignOut() {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      captureClientError(error, { action: "sign_out" });
      notifyError("No pudimos cerrar tu sesión.");
    }
  }

  const userName = session.user.name ?? "Usuario";
  const userInitial = (session.user.name ?? session.user.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-dvh bg-background" data-accent={settings.accent.toLowerCase()}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden bg-surface-dark text-surface-dark-foreground lg:flex">
        <div className="finance-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="pointer-events-none absolute -left-24 top-1/3 size-64 rounded-full bg-primary/15 blur-3xl" />

        <Link href="/dashboard" className="relative flex items-center gap-3 border-b border-white/8 px-6 py-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-surface-dark shadow-lg shadow-black/20">
            <WalletCards className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight">{settings.brandName}</span>
            <span className="mt-0.5 block truncate text-[10px] text-white/42">Control financiero personal</span>
          </span>
        </Link>

        <div className="relative flex flex-1 flex-col px-4 py-7">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/32">Espacio personal</p>
          <nav className="mt-3 space-y-1.5" aria-label="Navegación principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${active ? "bg-white text-surface-dark shadow-lg shadow-black/15" : "text-white/58 hover:bg-white/7 hover:text-white"}`}
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-secondary text-secondary-foreground" : "bg-white/6 text-white/65 group-hover:bg-white/10"}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold">{item.label}</span>
                    <span className={`mt-0.5 block truncate text-[9px] ${active ? "text-slate-500" : "text-white/32"}`}>{item.description}</span>
                  </span>
                  <ChevronRight className={`size-3.5 ${active ? "text-primary" : "text-white/20"}`} aria-hidden="true" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/8 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/12 text-emerald-300">
                <ShieldCheck className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-white/80">Entorno protegido</p>
                <p className="mt-1 text-[9px] leading-4 text-white/35">Tu información se procesa de forma segura en el servidor.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/8 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.045] p-2.5">
            <UserAvatar image={session.user.image} initial={userInitial} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-white/85">{userName}</p>
              <p className="mt-0.5 truncate text-[9px] text-white/35">{isAdmin ? "Administrador" : session.user.email}</p>
            </div>
            <button type="button" onClick={handleSignOut} className="flex size-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/8 hover:text-white" title="Cerrar sesión">
              <LogOut className="size-4" aria-hidden="true" />
              <span className="sr-only">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      <header ref={mobileMenuRef} className="sticky top-0 z-20 border-b border-border/80 bg-card/90 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-dark text-surface-dark-foreground">
              <WalletCards className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-bold text-card-foreground">{settings.brandName}</span>
          </Link>
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mobileMenuOpen ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {mobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-navigation" className="absolute inset-x-0 top-full border-b border-border bg-card p-3 shadow-xl shadow-foreground/10 sm:px-6">
            <nav className="space-y-1" aria-label="Navegación principal">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? "bg-secondary text-secondary-foreground" : "text-card-foreground hover:bg-muted"}`}
                  >
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className={`mt-0.5 block truncate text-xs ${active ? "text-secondary-foreground/70" : "text-muted-foreground"}`}>{item.description}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-3 flex items-center gap-3 border-t border-border px-3 pt-3">
              <UserAvatar image={session.user.image} initial={userInitial} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-card-foreground">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">{isAdmin ? "Administrador" : session.user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Cerrar sesión"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="sr-only">Cerrar sesión</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto min-h-dvh max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 xl:px-10">{children}</main>
      </div>
    </div>
  );
}

function UserAvatar({ image, initial, compact = false }: { image?: string | null; initial: string; compact?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary font-bold text-secondary-foreground ring-1 ring-white/10 ${compact ? "size-8 text-[10px]" : "size-9 text-xs"}`}>
      {image ? <img src={image} alt="" className="size-full object-cover" /> : initial}
    </span>
  );
}
