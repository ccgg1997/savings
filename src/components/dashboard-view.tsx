"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  Maximize2,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import type { DashboardData } from "@/lib/notion";
import type { AppSettingsData } from "@/lib/settings";
import { apiFetch } from "@/lib/api";
import { captureClientError, notifySuccess } from "@/lib/client-errors";
import { TransactionDescriptionPopover } from "@/components/transaction-description-popover";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const updatedFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

function money(value: number) {
  return currency.format(value);
}

function compact(value: number) {
  return `$${compactCurrency.format(value)}`;
}

function formatShortDate(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return `${day}-${month}-${year.slice(-2)}`;
}

function formatUpdatedAt(value: string) {
  return updatedFormatter.format(new Date(value)).replace(/\s/g, " ");
}

type SummaryMetricProps = {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: "budget" | "income" | "expense" | "balance";
  className?: string;
};

const summaryTones = {
  budget: "bg-secondary text-secondary-foreground",
  income: "bg-positive/10 text-positive",
  expense: "bg-negative/10 text-negative",
  balance: "bg-primary/10 text-primary",
};

function SummaryMetric({ label, value, icon: Icon, tone, className = "" }: SummaryMetricProps) {
  return (
    <div className={`flex min-w-0 items-center gap-3 border-border/80 px-3 py-3 sm:px-5 ${className}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${summaryTones[tone]}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-base font-bold tracking-tight text-card-foreground sm:text-lg">{value}</p>
      </div>
    </div>
  );
}

function Panel({ title, description, action, children, className = "" }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-border/90 bg-card shadow-[0_10px_35px_rgba(25,48,40,0.045)] ${className}`}>
      <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-card-foreground sm:text-base">{title}</h2>
          {description ? <p className="mt-1 text-[10px] leading-4 text-muted-foreground sm:text-[11px]">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ExpenseOverview({ divisions, expenses, income }: { divisions: DashboardData["expenseDivisions"]; expenses: number; income: number }) {
  const spentPercentage = income ? (expenses / income) * 100 : 0;
  const available = income - expenses;
  const availablePercentage = income ? (available / income) * 100 : 0;

  return (
    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
      <div className="relative overflow-hidden rounded-2xl bg-surface-dark p-4 text-surface-dark-foreground">
        <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-orange-400/15 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-white/45">Ingresos del periodo</p>
            <p className="mt-1 text-lg font-bold tracking-tight">{money(income)}</p>
          </div>
          <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${Math.min(spentPercentage, 100)}%, color-mix(in oklch, white 10%, transparent) 0)` }}>
            <span className="flex size-12 items-center justify-center rounded-full bg-surface-dark text-xs font-bold">{Math.round(spentPercentage)}%</span>
          </div>
        </div>
        <div className="relative mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-3">
          <p className="text-[9px] font-semibold text-white/45">Te has gastado</p>
          <p className="text-sm font-bold">{money(expenses)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {divisions.map((item) => (
          <Link
            key={item.label}
            href={`/movimientos?division=${encodeURIComponent(item.label)}&type=expense`}
            aria-label={`Ver movimientos de la división ${item.label}`}
            className="group block w-full transform-gpu rounded-xl text-left transition-[transform,background-color] duration-150 ease-out hover:bg-muted/60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 motion-reduce:transform-none"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]">
              <span className="flex min-w-0 items-center gap-2 font-semibold text-card-foreground">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 font-bold text-card-foreground">{money(item.amount)} <span className="ml-1 font-medium text-muted-foreground">{Math.round(item.percentage)}%</span><ChevronRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(item.percentage, 2), 100)}%`, backgroundColor: item.color }} />
            </div>
          </Link>
        ))}
        {divisions.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No hay divisiones para mostrar.</p> : null}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground">Disponible después de gastos</p>
          <p className="mt-1 text-[9px] font-medium text-muted-foreground">{Math.round(availablePercentage)}% de tus ingresos</p>
        </div>
        <p className={`shrink-0 text-lg font-bold tracking-tight ${available < 0 ? "text-negative" : "text-positive"}`}>{money(available)}</p>
      </div>
    </div>
  );
}

function CategoryCarousel({ categories }: { categories: DashboardData["expenseCategories"] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);
  const pages = Array.from({ length: Math.ceil(categories.length / 2) }, (_, index) => categories.slice(index * 2, index * 2 + 2));

  useEffect(() => {
    setActivePage(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [categories.length]);

  function goToPage(page: number) {
    if (!pages.length) return;
    const nextPage = (page + pages.length) % pages.length;
    const track = trackRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pageWidth = (track?.firstElementChild as HTMLElement | null)?.offsetWidth ?? track?.clientWidth ?? 0;
    setActivePage(nextPage);
    track?.scrollTo({ left: pageWidth * nextPage, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function updateActivePage() {
    const track = trackRef.current;
    const pageWidth = (track?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    if (!track || !pageWidth) return;
    const nextPage = Math.max(0, Math.min(pages.length - 1, Math.round(track.scrollLeft / pageWidth)));
    setActivePage(nextPage);
  }

  if (!categories.length) {
    return <div className="mx-5 mb-5 rounded-xl bg-muted p-8 text-center text-xs text-muted-foreground sm:mx-6 sm:mb-6">No hay categorías para mostrar.</div>;
  }

  return (
    <div className="pb-5 sm:pb-6">
      <div
        ref={trackRef}
        onScroll={updateActivePage}
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-5 sm:px-6"
        tabIndex={0}
        aria-label="Carrusel de gastos por categoría; muestra dos tarjetas por página"
      >
        {pages.map((page, pageIndex) => (
          <div key={page.map((item) => item.label).join("-")} className="grid w-full shrink-0 snap-start grid-cols-2 gap-3 pr-3 last:pr-0" aria-label={`Página ${pageIndex + 1} de ${pages.length}`}>
            {page.map((item) => (
              <Link
                key={item.label}
                href={`/movimientos?category=${encodeURIComponent(item.label)}&type=expense`}
                aria-label={`Ver movimientos de la categoría ${item.label}`}
                className="group relative min-h-32 min-w-0 transform-gpu overflow-hidden rounded-2xl p-4 text-white transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
                style={{ backgroundColor: item.color }}
              >
                <div className="pointer-events-none absolute -bottom-10 -right-8 size-28 rounded-full bg-white/12 transition-transform duration-500 group-hover:scale-125" />
                <div className="relative flex h-full min-w-0 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm"><ReceiptText className="size-4" aria-hidden="true" /></span>
                    <span className="rounded-full bg-black/10 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">{Math.round(item.percentage)}%</span>
                  </div>
                  <div className="mt-5 min-w-0">
                    <p className="truncate text-xs font-semibold text-white/75">{item.label}</p>
                    <p className="mt-1 truncate text-base font-bold tracking-tight sm:text-lg">{money(item.amount)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3 px-5 sm:px-6">
        <button type="button" onClick={() => goToPage(activePage - 1)} className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30" aria-label="Ver categorías anteriores">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2" role="group" aria-label="Páginas del carrusel">
          {pages.map((_, index) => (
            <button key={index} type="button" onClick={() => goToPage(index)} className={`size-2.5 rounded-full transition ${index === activePage ? "scale-110 bg-primary" : "bg-border hover:bg-muted-foreground/50"}`} aria-label={`Ir a la página ${index + 1}`} aria-current={index === activePage ? "page" : undefined} />
          ))}
        </div>
        <button type="button" onClick={() => goToPage(activePage + 1)} className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30" aria-label={activePage === pages.length - 1 ? "Volver a las primeras categorías" : "Ver más categorías"}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-center text-[9px] font-medium text-muted-foreground" aria-live="polite">{activePage + 1} de {pages.length}</p>
    </div>
  );
}

function CompactMovement({ row }: { row: DashboardData["recentTransactions"][number] }) {
  return <div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5"><p className="truncate font-bold text-card-foreground">{row.description}</p><TransactionDescriptionPopover description={row.description} /></div><div className="mt-1 flex min-w-0 items-center gap-1.5"><span className="shrink-0 text-[9px] font-semibold text-muted-foreground">{row.type === "income" ? "Ingreso" : "Gasto"}</span><span className="max-w-[105px] truncate rounded-full bg-secondary px-1.5 py-0.5 text-[8px] font-bold text-secondary-foreground">{row.division}</span><span className="max-w-[105px] truncate rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground">{row.category}</span></div></div>;
}

function Transactions({ rows }: { rows: DashboardData["recentTransactions"] }) {
  if (rows.length === 0) return <p className="px-6 pb-8 pt-3 text-center text-xs text-muted-foreground">No hay transacciones para mostrar.</p>;

  return (
    <div className="px-4 pb-4 sm:px-6 sm:pb-5">
      <div className="mb-2 flex items-center justify-between text-[9px] font-semibold text-muted-foreground sm:hidden">
        <span>Tabla de movimientos</span>
        <span>Desliza para ver más →</span>
      </div>
      <div className="scrollbar-subtle overflow-x-auto overscroll-x-contain rounded-xl border border-border sm:rounded-none sm:border-0" tabIndex={0} aria-label="Tabla de transacciones recientes; desplázate horizontalmente para ver todas las columnas">
        <table className="w-full min-w-[560px] table-fixed text-left text-[11px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:bg-transparent">
              <th className="w-[34%] px-3 py-3 sm:px-0 sm:pr-3">Movimiento</th>
              <th className="w-[24%] px-3 py-3 text-right sm:px-0">Monto</th>
              <th className="w-[19%] px-3 py-3 sm:px-0">Fecha</th>
              <th className="w-[23%] px-3 py-3 sm:px-0">Cuenta</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row) => (
              <tr key={row.id} className="group border-b border-border/55 last:border-0 hover:bg-muted/25">
                <td className="px-3 py-3 sm:px-0 sm:pr-3">
                  <CompactMovement row={row} />
                </td>
                <td className={`truncate px-3 py-3 text-right font-bold tabular-nums sm:px-0 ${row.type === "income" ? "text-emerald-600" : "text-card-foreground"}`}>{row.type === "income" ? "+" : "−"}{money(row.amount)}</td>
                <td className="truncate px-3 py-3 tabular-nums text-muted-foreground sm:px-0">{formatShortDate(row.date)}</td>
                <td className="truncate px-3 py-3 text-muted-foreground sm:px-0">{row.account}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardView({ initialData, settings }: { initialData: DashboardData; settings: AppSettingsData }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(initialData.period);

  async function refresh() {
    setRefreshing(true);
    try {
      const next = await apiFetch<DashboardData>("/api/dashboard");
      setData(next);
      setPeriod(next.period);
      notifySuccess("Dashboard actualizado.");
    } catch (error) {
      captureClientError(error, { action: "refresh_dashboard" });
    } finally {
      setRefreshing(false);
    }
  }

  const density = settings.compactMode ? "space-y-4" : "space-y-6";

  return (
    <div className={density}>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{settings.dashboardTitle}</h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Una lectura clara de tus ingresos, gastos y capacidad de ahorro.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[11px] font-bold text-card-foreground shadow-sm transition hover:border-muted-foreground/35">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            <span className="sr-only">Periodo</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent pr-1 outline-none"><option>{period}</option></select>
          </label>
          <button type="button" onClick={refresh} disabled={refreshing} className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[11px] font-bold text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted disabled:pointer-events-none disabled:opacity-55">
            <RefreshCw className={`size-4 text-primary ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"><Clock3 className="size-3" aria-hidden="true" />Actualizado {formatUpdatedAt(data.updatedAt)}</span>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-border/90 bg-card shadow-[0_8px_24px_rgba(25,48,40,0.04)]" aria-label="Resumen financiero">
        <div className="grid grid-cols-2 sm:min-w-[640px] sm:grid-cols-4">
          <SummaryMetric label="Ingreso total" value={compact(data.metrics.totalIncome)} icon={Wallet} tone="income" />
          <SummaryMetric className="border-l" label="Gastos totales" value={compact(data.metrics.totalExpenses)} icon={ReceiptText} tone="expense" />
          <SummaryMetric className="border-t sm:border-l sm:border-t-0" label="Disponible" value={compact(data.metrics.savings)} icon={PiggyBank} tone="balance" />
          <SummaryMetric className="border-l border-t sm:border-t-0" label="Presupuesto" value={data.budget === null ? "Sin definir" : compact(data.budget)} icon={Target} tone="budget" />
        </div>
      </section>

      <Panel title="Gastos por división" description="Cuánto representa cada división frente a tus ingresos" action={<Layers3 className="size-4 text-primary" aria-hidden="true" />}>
        <ExpenseOverview divisions={data.expenseDivisions} expenses={data.metrics.totalExpenses} income={data.metrics.totalIncome} />
      </Panel>

      <Panel title="Gastos por categoría" description="Dónde se concentra tu dinero este periodo">
        <CategoryCarousel categories={data.expenseCategories} />
      </Panel>

      <Panel title="Transacciones recientes" description="Tus últimos movimientos registrados" action={<div className="flex items-center gap-2"><span className="hidden rounded-full bg-muted px-2.5 py-1 text-[9px] font-bold text-muted-foreground sm:inline-flex">{data.recentTransactions.length} movimientos</span><Link href="/movimientos" className="inline-flex h-9 items-center gap-2 rounded-xl bg-surface-dark px-3 text-[10px] font-bold text-surface-dark-foreground transition hover:bg-slate-800">Ver movimientos<Maximize2 className="size-3.5" aria-hidden="true" /></Link></div>}>
        <Transactions rows={data.recentTransactions} />
      </Panel>

      <footer className="flex flex-col justify-between gap-2 border-t border-border/70 pt-4 text-[10px] text-muted-foreground sm:flex-row sm:items-center">
        <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />Información procesada de forma segura en el servidor</span>
        <span>{data.source === "notion" ? "Sincronizado con Notion" : "Vista con datos de demostración"}</span>
      </footer>
    </div>
  );
}
