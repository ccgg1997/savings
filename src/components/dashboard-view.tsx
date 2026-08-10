"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, RefreshCw } from "lucide-react";
import type { DashboardData } from "@/lib/notion";
import type { AppSettingsData } from "@/lib/settings";
import { apiFetch } from "@/lib/api";
import { captureClientError, notifySuccess } from "@/lib/client-errors";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const shortCurrency = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

function money(value: number) { return currency.format(value); }
function compact(value: number) { return `$${shortCurrency.format(value)}`; }
function percentChange(current: number, previous: number) { return previous ? ((current - previous) / Math.abs(previous)) * 100 : null; }

function MetricCard({ label, value, delta, inverse = false }: { label: string; value: string; delta: number | null; inverse?: boolean }) {
  const positive = delta !== null && (inverse ? delta <= 0 : delta >= 0);
  return <article className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-700/70 bg-surface-dark px-4 py-3 text-surface-dark-foreground shadow-sm"><p className="truncate text-[10px] font-semibold text-white/65">{label}</p><p className="truncate text-xl font-bold tracking-tight xl:text-2xl">{value}</p><p className={`flex items-center gap-1 text-[10px] font-semibold ${delta === null ? "text-white/55" : positive ? "text-emerald-300" : "text-red-300"}`}>{delta === null ? "Periodo seleccionado" : <>{positive ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />}{Math.abs(delta).toFixed(1)}% vs. mes anterior</>}</p></article>;
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`min-h-0 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm ${className}`}><h2 className="mb-2 text-xs font-bold text-card-foreground">{title}</h2>{children}</section>;
}

function CashFlowChart({ data }: { data: DashboardData["monthlyTrend"] }) {
  const max = Math.max(...data.flatMap((item) => [item.income, item.expenses, item.income - item.expenses]), 1);
  const width = 620;
  const height = 168;
  const top = 12;
  const bottom = 142;
  const chartHeight = bottom - top;
  const groupWidth = 540 / Math.max(data.length, 1);
  const barWidth = Math.min(22, groupWidth * 0.23);
  const x = (index: number) => 62 + groupWidth * index + groupWidth / 2;
  const y = (value: number) => bottom - (Math.max(value, 0) / max) * chartHeight;
  const savingsPoints = data.map((item, index) => `${x(index)},${y(item.income - item.expenses)}`).join(" ");

  return <div className="h-[calc(100%-1.25rem)] min-h-32"><div className="mb-1 flex justify-center gap-4 text-[9px] text-muted-foreground"><Legend color="bg-emerald-500" label="Ingresos" /><Legend color="bg-red-400" label="Gastos" /><Legend color="bg-amber-500" label="Ahorro" /></div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-[calc(100%-1rem)] min-h-28 w-full" role="img" aria-label="Flujo de efectivo de los últimos seis meses">{[0, 0.33, 0.66, 1].map((ratio) => { const lineY = bottom - chartHeight * ratio; return <g key={ratio}><line x1="52" x2="610" y1={lineY} y2={lineY} stroke="currentColor" className="text-border" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" /><text x="2" y={lineY + 3} className="fill-muted-foreground text-[9px]">{compact(max * ratio)}</text></g>; })}{data.map((item, index) => <g key={`${item.label}-${index}`}><rect x={x(index) - barWidth - 1} y={y(item.income)} width={barWidth} height={bottom - y(item.income)} rx="2" className="fill-emerald-500/75" /><rect x={x(index) + 1} y={y(item.expenses)} width={barWidth} height={bottom - y(item.expenses)} rx="2" className="fill-red-400/75" /><text x={x(index)} y="162" textAnchor="middle" className="fill-muted-foreground text-[9px] capitalize">{item.label}</text></g>)}<polyline points={savingsPoints} fill="none" className="stroke-amber-500" strokeWidth="2" vectorEffect="non-scaling-stroke" />{data.map((item, index) => <circle key={`saving-${index}`} cx={x(index)} cy={y(item.income - item.expenses)} r="2.7" className="fill-amber-500" />)}</svg></div>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`size-2 rounded-sm ${color}`} />{label}</span>;
}

function ExpenseDivision({ categories }: { categories: DashboardData["expenseCategories"] }) {
  const visible = categories.slice(0, 6);
  return <div className="space-y-2.5">{visible.map((item) => <div key={item.label} className="grid grid-cols-[72px_1fr_32px] items-center gap-2 text-[10px]"><span className="truncate text-muted-foreground">{item.label}</span><span className="h-2 overflow-hidden rounded-sm bg-muted"><span className="block h-full rounded-sm" style={{ width: `${Math.max(item.percentage, 2)}%`, backgroundColor: item.color }} /></span><span className="text-right font-bold text-card-foreground">{Math.round(item.percentage)}%</span></div>)}</div>;
}

function CategoryTreemap({ categories }: { categories: DashboardData["expenseCategories"] }) {
  return <div className="flex h-[calc(100%-1.25rem)] min-h-14 overflow-hidden rounded-lg">{categories.slice(0, 6).map((item) => <div key={item.label} className="flex min-w-16 flex-col justify-center border-r border-white/30 px-2 text-white last:border-0" style={{ flexBasis: `${Math.max(item.percentage, 9)}%`, backgroundColor: item.color }}><span className="truncate text-[10px] font-semibold">{item.label}</span><span className="truncate text-xs font-bold">{compact(item.amount)}</span><span className="text-[9px] text-white/85">{Math.round(item.percentage)}%</span></div>)}</div>;
}

function Transactions({ rows }: { rows: DashboardData["recentTransactions"] }) {
  return <div className="h-[calc(100%-1.25rem)] overflow-hidden"><table className="w-full table-fixed text-left text-[10px]"><thead><tr className="border-b border-border bg-muted/45 text-[9px] uppercase tracking-wide text-muted-foreground"><th className="w-[12%] px-2 py-1.5">Tipo</th><th className="w-[25%] py-1.5">Descripción</th><th className="w-[15%] py-1.5">Fecha</th><th className="w-[18%] py-1.5">Monto</th><th className="w-[15%] py-1.5">Cuenta</th><th className="w-[15%] py-1.5">Categoría</th></tr></thead><tbody>{rows.slice(0, 4).map((row) => <tr key={row.id} className="border-b border-border/65 last:border-0"><td className="px-2 py-1.5"><span className={`inline-flex items-center gap-1 font-semibold ${row.type === "income" ? "text-emerald-600" : "text-orange-600"}`}><span className={`size-1.5 rounded-full ${row.type === "income" ? "bg-emerald-500" : "bg-orange-500"}`} />{row.type === "income" ? "Ingreso" : "Gasto"}</span></td><td className="truncate py-1.5 font-medium text-card-foreground">{row.description}</td><td className="truncate py-1.5 text-muted-foreground">{dateFormatter.format(new Date(row.date))}</td><td className={`truncate py-1.5 font-bold ${row.type === "income" ? "text-emerald-600" : "text-red-500"}`}>{row.type === "income" ? "+" : "−"}{money(row.amount)}</td><td className="truncate py-1.5 text-muted-foreground">{row.account}</td><td className="truncate py-1.5 text-muted-foreground">{row.category}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No hay transacciones para mostrar.</p>}</div>;
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

  const current = data.monthlyTrend.at(-1) ?? { income: 0, expenses: 0 };
  const previous = data.monthlyTrend.at(-2) ?? { income: 0, expenses: 0 };
  const currentSavings = current.income - current.expenses;
  const previousSavings = previous.income - previous.expenses;
  const currentRate = current.income ? (currentSavings / current.income) * 100 : 0;
  const previousRate = previous.income ? (previousSavings / previous.income) * 100 : 0;

  return <div className="grid gap-2.5 lg:h-full lg:min-h-0 lg:grid-rows-[auto_78px_minmax(0,1.45fr)_92px_minmax(0,1fr)]">
    <div className="flex items-end justify-between gap-3"><div><h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{settings.dashboardTitle}</h1><p className="text-[11px] text-muted-foreground">Visión ejecutiva de tus finanzas · {data.source === "notion" ? "Notion conectado" : "Datos de demostración"}</p></div><div className="flex items-center gap-2"><label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[11px] font-semibold text-card-foreground"><CalendarDays className="size-3.5 text-primary" aria-hidden="true" /><select value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent outline-none"><option>{period}</option></select></label><button type="button" onClick={refresh} disabled={refreshing} className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[11px] font-semibold text-card-foreground transition hover:bg-muted disabled:opacity-55"><RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" /><span className="hidden sm:inline">Actualizar</span></button></div></div>
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"><MetricCard label="Ingresos" value={compact(data.metrics.totalIncome)} delta={percentChange(current.income, previous.income)} /><MetricCard label="Gastos" value={compact(data.metrics.totalExpenses)} delta={percentChange(current.expenses, previous.expenses)} inverse /><MetricCard label="Ahorro" value={compact(data.metrics.savings)} delta={percentChange(currentSavings, previousSavings)} /><MetricCard label="% Ahorro" value={`${data.metrics.savingsRate.toFixed(1)}%`} delta={previousRate ? currentRate - previousRate : null} /></div>
    <div className="grid min-h-0 gap-2.5 lg:grid-cols-[1.55fr_0.85fr]"><Panel title="Flujo de efectivo"><CashFlowChart data={data.monthlyTrend} /></Panel><Panel title="Gastos por división"><ExpenseDivision categories={data.expenseCategories} /></Panel></div>
    <Panel title="Gastos por categoría"><CategoryTreemap categories={data.expenseCategories} /></Panel>
    <Panel title="Transacciones recientes"><Transactions rows={data.recentTransactions} /></Panel>
  </div>;
}
