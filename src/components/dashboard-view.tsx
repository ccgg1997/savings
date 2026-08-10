"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Layers3,
  Maximize2,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import type { DashboardData } from "@/lib/notion";
import type { AppSettingsData } from "@/lib/settings";
import { apiFetch } from "@/lib/api";
import { captureClientError, notifySuccess } from "@/lib/client-errors";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" });
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

function formatUpdatedAt(value: string) {
  return updatedFormatter.format(new Date(value)).replace(/\s/g, " ");
}

function percentChange(current: number, previous: number) {
  return previous ? ((current - previous) / Math.abs(previous)) * 100 : null;
}

type MetricCardProps = {
  label: string;
  helper: string;
  value: string;
  delta: number | null;
  inverse?: boolean;
  icon: typeof Wallet;
  tone: "emerald" | "orange" | "blue" | "violet";
  featured?: boolean;
};

const metricTones = {
  emerald: "bg-emerald-500/12 text-emerald-600",
  orange: "bg-orange-500/12 text-orange-600",
  blue: "bg-blue-500/12 text-blue-600",
  violet: "bg-violet-500/12 text-violet-600",
};

function MetricCard({ label, helper, value, delta, inverse = false, icon: Icon, tone, featured = false }: MetricCardProps) {
  const positive = delta !== null && (inverse ? delta <= 0 : delta >= 0);
  const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <article className={`group relative overflow-hidden rounded-2xl border p-5 shadow-[0_10px_30px_rgba(25,48,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(25,48,40,0.09)] ${featured ? "border-slate-700 bg-surface-dark text-surface-dark-foreground" : "border-border/90 bg-card text-card-foreground"}`}>
      {featured ? <div className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-emerald-400/12 blur-2xl" /> : null}
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-semibold ${featured ? "text-white/48" : "text-muted-foreground"}`}>{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] xl:text-[1.7rem]">{value}</p>
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${featured ? "bg-white/10 text-emerald-300" : metricTones[tone]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <div className="relative mt-5 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${delta === null ? featured ? "bg-white/8 text-white/45" : "bg-muted text-muted-foreground" : positive ? "bg-emerald-500/12 text-emerald-600" : "bg-red-500/12 text-red-600"}`}>
          {delta === null ? null : <DeltaIcon className="size-3" aria-hidden="true" />}
          {delta === null ? "Periodo actual" : `${Math.abs(delta).toFixed(1)}%`}
        </span>
        <span className={`truncate text-[9px] ${featured ? "text-white/35" : "text-muted-foreground"}`}>{helper}</span>
      </div>
    </article>
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

function CashFlowChart({ data }: { data: DashboardData["monthlyTrend"] }) {
  const gradientId = useId().replace(/:/g, "");
  const max = Math.max(...data.flatMap((item) => [item.income, item.expenses]), 1);
  const width = 780;
  const height = 290;
  const left = 66;
  const right = 758;
  const top = 22;
  const bottom = 238;
  const chartHeight = bottom - top;
  const groupWidth = (right - left) / Math.max(data.length, 1);
  const barWidth = Math.min(22, groupWidth * 0.2);
  const x = (index: number) => left + groupWidth * index + groupWidth / 2;
  const y = (value: number) => bottom - (Math.max(value, 0) / max) * chartHeight;
  const savings = data.map((item) => Math.max(item.income - item.expenses, 0));
  const savingsPoints = savings.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const areaPath = data.length ? `M ${x(0)} ${bottom} L ${savings.map((value, index) => `${x(index)} ${y(value)}`).join(" L ")} L ${x(data.length - 1)} ${bottom} Z` : "";

  return (
    <div className="px-3 pb-4 sm:px-5 sm:pb-5">
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2 px-2 text-[10px] font-medium text-muted-foreground">
        <Legend color="bg-emerald-500" label="Ingresos" />
        <Legend color="bg-orange-400" label="Gastos" />
        <Legend color="bg-primary" label="Ahorro neto" line />
      </div>
      <div className="h-64 w-full sm:h-72">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="size-full overflow-visible" role="img" aria-label="Comparación mensual de ingresos, gastos y ahorro">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const lineY = bottom - chartHeight * ratio;
            return (
              <g key={ratio}>
                <line x1={left} x2={right} y1={lineY} y2={lineY} stroke="currentColor" className="text-border/75" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
                <text x="4" y={lineY + 4} className="fill-muted-foreground text-[9px]">{compact(max * ratio)}</text>
              </g>
            );
          })}

          {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}

          {data.map((item, index) => (
            <g key={`${item.label}-${index}`}>
              <rect x={x(index) - barWidth - 2} y={y(item.income)} width={barWidth} height={bottom - y(item.income)} rx="5" className="fill-emerald-500/80">
                <title>{`${item.label}: ingresos ${money(item.income)}`}</title>
              </rect>
              <rect x={x(index) + 2} y={y(item.expenses)} width={barWidth} height={bottom - y(item.expenses)} rx="5" className="fill-orange-400/80">
                <title>{`${item.label}: gastos ${money(item.expenses)}`}</title>
              </rect>
              <text x={x(index)} y="270" textAnchor="middle" className="fill-muted-foreground text-[10px] font-semibold capitalize">{item.label}</text>
            </g>
          ))}

          <polyline points={savingsPoints} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {savings.map((value, index) => (
            <circle key={`saving-${index}`} cx={x(index)} cy={y(value)} r="4" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke">
              <title>{`${data[index].label}: ahorro ${money(value)}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
}

function Legend({ color, label, line = false }: { color: string; label: string; line?: boolean }) {
  return <span className="flex items-center gap-2"><span className={`${line ? "h-0.5 w-4 rounded-full" : "size-2 rounded-full"} ${color}`} />{label}</span>;
}

function ExpenseOverview({ divisions, expenses, budget, onSelect }: { divisions: DashboardData["expenseDivisions"]; expenses: number; budget: number | null; onSelect: (division: string) => void }) {
  const main = divisions[0];
  const budgetProgress = budget ? Math.min((expenses / budget) * 100, 100) : null;
  const remaining = budget ? budget - expenses : null;

  return (
    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
      <div className="relative overflow-hidden rounded-2xl bg-surface-dark p-4 text-surface-dark-foreground">
        <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-orange-400/15 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-white/45">{budget ? "Presupuesto mensual" : "Principal división"}</p>
            <p className="mt-1 text-lg font-bold tracking-tight">{budget ? money(budget) : main?.label ?? "Sin datos"}</p>
            <p className={`mt-2 text-[10px] font-semibold ${remaining !== null && remaining < 0 ? "text-red-300" : "text-emerald-300"}`}>
              {budget && remaining !== null ? `${remaining >= 0 ? money(remaining) : money(Math.abs(remaining))} ${remaining >= 0 ? "disponibles" : "por encima"}` : main ? `${main.percentage.toFixed(0)}% del gasto total` : "Aún no hay movimientos"}
            </p>
          </div>
          <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${budgetProgress ?? main?.percentage ?? 0}%, color-mix(in oklch, white 10%, transparent) 0)` }}>
            <span className="flex size-12 items-center justify-center rounded-full bg-surface-dark text-xs font-bold">{Math.round(budgetProgress ?? main?.percentage ?? 0)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {divisions.slice(0, 5).map((item) => (
          <button key={item.label} type="button" onClick={() => onSelect(item.label)} className="group block w-full rounded-xl text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]">
              <span className="flex min-w-0 items-center gap-2 font-semibold text-card-foreground">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 font-bold text-card-foreground">{money(item.amount)} <span className="ml-1 font-medium text-muted-foreground">{Math.round(item.percentage)}%</span><ChevronRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full transition-all" style={{ width: `${Math.max(item.percentage, 2)}%`, backgroundColor: item.color }} />
            </div>
          </button>
        ))}
        {divisions.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No hay divisiones para mostrar.</p> : null}
      </div>
    </div>
  );
}

function CategoryMosaic({ categories }: { categories: DashboardData["expenseCategories"] }) {
  const spans = ["sm:col-span-2", "sm:col-span-2", "sm:col-span-2", "sm:col-span-3", "sm:col-span-3", "sm:col-span-2"];
  return (
    <div className="grid gap-3 px-5 pb-5 sm:grid-cols-6 sm:px-6 sm:pb-6">
      {categories.slice(0, 6).map((item, index) => (
        <article key={item.label} className={`group relative min-h-32 overflow-hidden rounded-2xl p-4 text-white ${spans[index] ?? "sm:col-span-2"}`} style={{ backgroundColor: item.color }}>
          <div className="pointer-events-none absolute -bottom-10 -right-8 size-28 rounded-full bg-white/12 transition-transform duration-500 group-hover:scale-125" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm"><ReceiptText className="size-4" aria-hidden="true" /></span>
              <span className="rounded-full bg-black/10 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">{Math.round(item.percentage)}%</span>
            </div>
            <div className="mt-5">
              <p className="truncate text-xs font-semibold text-white/75">{item.label}</p>
              <p className="mt-1 truncate text-lg font-bold tracking-tight">{money(item.amount)}</p>
            </div>
          </div>
        </article>
      ))}
      {categories.length === 0 ? <div className="col-span-full rounded-xl bg-muted p-8 text-center text-xs text-muted-foreground">No hay categorías para mostrar.</div> : null}
    </div>
  );
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
        <table className="w-full min-w-[780px] table-fixed text-left text-[11px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:bg-transparent">
              <th className="sticky left-0 z-20 w-[28%] bg-muted px-3 py-3 sm:static sm:bg-transparent sm:px-0 sm:pr-3">Movimiento</th>
              <th className="w-[13%] px-3 py-3 sm:px-0">Fecha</th>
              <th className="w-[16%] px-3 py-3 sm:px-0">División</th>
              <th className="w-[16%] px-3 py-3 sm:px-0">Categoría</th>
              <th className="w-[14%] px-3 py-3 sm:px-0">Cuenta</th>
              <th className="w-[13%] px-3 py-3 text-right sm:px-0">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row) => (
              <tr key={row.id} className="group border-b border-border/55 last:border-0 hover:bg-muted/25">
                <td className="sticky left-0 z-10 bg-card px-3 py-3 transition group-hover:bg-muted sm:static sm:px-0 sm:pr-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${row.type === "income" ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"}`}>
                      {row.type === "income" ? <ArrowDownRight className="size-4" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0"><p className="truncate font-bold text-card-foreground">{row.description}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{row.type === "income" ? "Ingreso recibido" : "Pago realizado"}</p></div>
                  </div>
                </td>
                <td className="truncate px-3 py-3 text-muted-foreground sm:px-0">{dateFormatter.format(new Date(`${row.date}T12:00:00`))}</td>
                <td className="truncate px-3 py-3 sm:px-0"><span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">{row.division}</span></td>
                <td className="truncate px-3 py-3 sm:px-0"><span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">{row.category}</span></td>
                <td className="truncate px-3 py-3 text-muted-foreground sm:px-0">{row.account}</td>
                <td className={`truncate px-3 py-3 text-right font-bold sm:px-0 ${row.type === "income" ? "text-emerald-600" : "text-card-foreground"}`}>{row.type === "income" ? "+" : "−"}{money(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DivisionDetailModal({ division, rows, onClose }: { division: DashboardData["expenseDivisions"][number]; rows: DashboardData["recentTransactions"]; onClose: () => void }) {
  const records = rows.filter((row) => row.type === "expense" && row.division === division.label);
  useBodyScrollLock(true);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch overflow-hidden overscroll-none bg-slate-950/55 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="division-detail-title" className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-card shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-3xl sm:border sm:border-border">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Detalle por división</p>
            <h2 id="division-detail-title" className="mt-1 text-xl font-bold tracking-tight text-card-foreground">{division.label}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {records.length} {records.length === 1 ? "registro" : "registros"} · {division.categories.length} {division.categories.length === 1 ? "categoría" : "categorías"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30">
            <X className="size-4" aria-hidden="true" /><span className="sr-only">Cerrar</span>
          </button>
        </div>

        <div className="scrollbar-subtle min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <div className="rounded-2xl bg-surface-dark p-4 text-surface-dark-foreground sm:p-5">
              <p className="text-[10px] font-semibold text-white/45">Total de la división</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{money(division.amount)}</p>
              <p className="mt-3 text-[10px] font-semibold text-emerald-300">{division.percentage.toFixed(1)}% del gasto total</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {division.categories.map((category) => (
                <div key={category.label} className="rounded-xl border border-border bg-background/65 p-3">
                  <div className="flex items-center justify-between gap-3"><span className="truncate text-[10px] font-bold text-card-foreground">{category.label}</span><span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-secondary-foreground">{Math.round(category.percentage)}%</span></div>
                  <p className="mt-2 text-sm font-bold text-card-foreground">{money(category.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3"><h3 className="text-xs font-bold text-card-foreground">Movimientos de {division.label}</h3><span className="text-[9px] font-semibold text-muted-foreground sm:hidden">Desliza →</span></div>
            {records.length ? (
              <div className="scrollbar-subtle mt-3 overflow-x-auto overscroll-x-contain rounded-2xl border border-border" tabIndex={0} aria-label={`Movimientos de ${division.label}; desplázate horizontalmente para ver todas las columnas`}>
                <table className="w-full min-w-[650px] text-left text-[11px]">
                  <thead><tr className="border-b border-border bg-muted/45 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><th className="px-4 py-3">Movimiento</th><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Categoría</th><th className="px-3 py-3">Cuenta</th><th className="px-4 py-3 text-right">Monto</th></tr></thead>
                  <tbody>{records.map((row) => <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25"><td className="px-4 py-3 font-bold text-card-foreground">{row.description}</td><td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{dateFormatter.format(new Date(`${row.date}T12:00:00`))}</td><td className="px-3 py-3"><span className="inline-flex rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">{row.category}</span></td><td className="px-3 py-3"><span className="inline-flex rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">{row.account}</span></td><td className="whitespace-nowrap px-4 py-3 text-right font-bold text-card-foreground">−{money(row.amount)}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="mt-3 rounded-2xl border border-border p-6 text-center text-xs text-muted-foreground">No hay registros para esta división.</p>}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-card p-4 sm:flex sm:justify-end sm:px-6">
          <Link href={`/movimientos?division=${encodeURIComponent(division.label)}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-dark px-4 text-xs font-bold text-surface-dark-foreground transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-auto">Abrir movimientos filtrados<Maximize2 className="size-3.5" aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}

export function DashboardView({ initialData, settings }: { initialData: DashboardData; settings: AppSettingsData }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(initialData.period);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

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

  const current = data.monthlyTrend.at(-1) ?? { income: 0, expenses: 0 };
  const previous = data.monthlyTrend.at(-2) ?? { income: 0, expenses: 0 };
  const currentSavings = current.income - current.expenses;
  const previousSavings = previous.income - previous.expenses;
  const currentRate = current.income ? (currentSavings / current.income) * 100 : 0;
  const previousRate = previous.income ? (previousSavings / previous.income) * 100 : 0;
  const density = settings.compactMode ? "space-y-4" : "space-y-6";
  const divisionDetail = data.expenseDivisions.find((item) => item.label === selectedDivision);

  return (
    <div className={density}>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground"><Sparkles className="size-3" aria-hidden="true" />Panorama de {period}</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"><Clock3 className="size-3" aria-hidden="true" />Actualizado {formatUpdatedAt(data.updatedAt)}</span>
          </div>
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
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores financieros">
        <MetricCard label="Ingresos totales" helper="vs. mes anterior" value={compact(data.metrics.totalIncome)} delta={percentChange(current.income, previous.income)} icon={Wallet} tone="emerald" featured />
        <MetricCard label="Gastos acumulados" helper="vs. mes anterior" value={compact(data.metrics.totalExpenses)} delta={percentChange(current.expenses, previous.expenses)} inverse icon={ReceiptText} tone="orange" />
        <MetricCard label="Ahorro logrado" helper="balance disponible" value={compact(data.metrics.savings)} delta={percentChange(currentSavings, previousSavings)} icon={PiggyBank} tone="blue" />
        <MetricCard label="Tasa de ahorro" helper="de tus ingresos" value={`${data.metrics.savingsRate.toFixed(1)}%`} delta={previousRate ? currentRate - previousRate : null} icon={Target} tone="violet" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(310px,0.75fr)]">
        <Panel title="Flujo de efectivo" description="Evolución de los últimos seis meses" action={<span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold text-emerald-700 sm:inline-flex"><TrendingUp className="size-3" aria-hidden="true" />Tendencia mensual</span>}>
          <CashFlowChart data={data.monthlyTrend} />
        </Panel>
        <Panel title="Gastos por división" description="Selecciona una división para ver sus categorías y registros" action={<Layers3 className="size-4 text-primary" aria-hidden="true" />}>
          <ExpenseOverview divisions={data.expenseDivisions} expenses={data.metrics.totalExpenses} budget={data.budget} onSelect={setSelectedDivision} />
        </Panel>
      </div>

      <Panel title="Gastos por categoría" description="Dónde se concentra tu dinero este periodo">
        <CategoryMosaic categories={data.expenseCategories} />
      </Panel>

      <Panel title="Transacciones recientes" description="Tus últimos movimientos registrados" action={<div className="flex items-center gap-2"><span className="hidden rounded-full bg-muted px-2.5 py-1 text-[9px] font-bold text-muted-foreground sm:inline-flex">{data.recentTransactions.length} movimientos</span><Link href="/movimientos" className="inline-flex h-9 items-center gap-2 rounded-xl bg-surface-dark px-3 text-[10px] font-bold text-surface-dark-foreground transition hover:bg-slate-800">Ver movimientos<Maximize2 className="size-3.5" aria-hidden="true" /></Link></div>}>
        <Transactions rows={data.recentTransactions} />
      </Panel>

      <footer className="flex flex-col justify-between gap-2 border-t border-border/70 pt-4 text-[10px] text-muted-foreground sm:flex-row sm:items-center">
        <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />Información procesada de forma segura en el servidor</span>
        <span>{data.source === "notion" ? "Sincronizado con Notion" : "Vista con datos de demostración"}</span>
      </footer>

      {divisionDetail ? <DivisionDetailModal division={divisionDetail} rows={data.recentTransactions} onClose={() => setSelectedDivision(null)} /> : null}
    </div>
  );
}
