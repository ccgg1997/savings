"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, CircleDollarSign, Download, RefreshCw, TrendingUp } from "lucide-react";
import type { DashboardData } from "@/lib/notion";
import type { AppSettingsData } from "@/lib/settings";
import { apiFetch } from "@/lib/api";
import { captureClientError, notifyError } from "@/lib/client-errors";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

function money(value: number) { return currency.format(value); }
function compact(value: number) { return `$${compactCurrency.format(value)}`; }

function MetricCard({ label, value, helper, icon, tone }: { label: string; value: string; helper: string; icon: React.ReactNode; tone: "blue" | "red" | "green" | "purple" }) {
  const styles = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600", green: "bg-emerald-50 text-emerald-600", purple: "bg-violet-50 text-violet-600" };
  return <article className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_16px_rgb(17_63_50/5%)] sm:p-5"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-muted-foreground">{label}</p><span className={`flex size-8 items-center justify-center rounded-lg ${styles[tone]}`}>{icon}</span></div><p className="mt-4 text-2xl font-bold tracking-tight text-card-foreground sm:text-[1.7rem]">{value}</p><p className="mt-2 text-[11px] text-muted-foreground">{helper}</p></article>;
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-card p-4 shadow-[0_4px_16px_rgb(17_63_50/5%)] sm:p-5 ${className}`}><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-card-foreground">{title}</h2><button type="button" className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-card-foreground" title={`Más opciones para ${title}`}><span className="sr-only">Más opciones</span><ChevronDown className="size-4" aria-hidden="true" /></button></div>{children}</section>;
}

function Donut({ data }: { data: DashboardData["expenseCategories"] }) {
  let offset = 0;
  const gradient = data.map((entry) => { const start = offset; offset += entry.percentage; return `${entry.color} ${start}% ${offset}%`; }).join(", ");
  return <div className="flex flex-col items-center gap-6 sm:flex-row"><div className="relative size-40 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient || "#cbd5e1 0 100%"})` }}><div className="absolute inset-[28px] flex flex-col items-center justify-center rounded-full bg-card"><span className="text-xs font-bold text-card-foreground">{compact(data.reduce((sum, item) => sum + item.amount, 0))}</span><span className="text-[10px] text-muted-foreground">Total gastos</span></div></div><div className="w-full space-y-3">{data.map((entry) => <div key={entry.label} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-muted-foreground"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /> <span className="truncate">{entry.label}</span></span><span className="shrink-0 font-semibold text-card-foreground">{compact(entry.amount)} <span className="font-normal text-muted-foreground">({Math.round(entry.percentage)}%)</span></span></div>)}</div></div>;
}

function TrendChart({ data }: { data: DashboardData["monthlyTrend"] }) {
  const max = Math.max(...data.flatMap((entry) => [entry.income, entry.expenses]), 1);
  const points = (key: "income" | "expenses") => data.map((entry, index) => `${data.length === 1 ? 50 : (index / (data.length - 1)) * 100},${100 - (entry[key] / max) * 84}`).join(" ");
  return <div><div className="relative h-52 overflow-hidden rounded-xl bg-[linear-gradient(to_bottom,rgba(77,168,122,0.08),transparent)]"><div className="absolute inset-x-0 top-1/4 border-t border-dashed border-border" /><div className="absolute inset-x-0 top-2/4 border-t border-dashed border-border" /><div className="absolute inset-x-0 top-3/4 border-t border-dashed border-border" /><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full px-2 py-3"><polyline points={points("income")} fill="none" stroke="#31956b" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /><polyline points={points("expenses")} fill="none" stroke="#e24f4f" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />{data.map((entry, index) => <g key={entry.label}><circle cx={data.length === 1 ? 50 : (index / (data.length - 1)) * 100} cy={100 - (entry.income / max) * 84} r="1.8" fill="#31956b" vectorEffect="non-scaling-stroke" /><circle cx={data.length === 1 ? 50 : (index / (data.length - 1)) * 100} cy={100 - (entry.expenses / max) * 84} r="1.8" fill="#e24f4f" vectorEffect="non-scaling-stroke" /></g>)}</svg><div className="absolute bottom-2 left-0 right-0 flex justify-between px-3 text-[10px] text-muted-foreground">{data.map((entry) => <span key={entry.label}>{entry.label}</span>)}</div></div><div className="mt-3 flex justify-center gap-5 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#31956b]" />Ingresos</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#e24f4f]" />Gastos</span></div></div>;
}

function SimpleTable({ headers, rows, total }: { headers: string[]; rows: Array<string[]>; total: string[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[360px] text-left text-xs"><thead><tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">{headers.map((header) => <th key={header} className="pb-3 font-semibold">{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.join("-")} className="border-b border-border/70 last:border-0"><td className="py-3 font-medium text-card-foreground">{row[0]}</td><td className="py-3 text-right font-semibold text-card-foreground">{row[1]}</td><td className="py-3 text-right text-muted-foreground">{row[2]}</td></tr>)}</tbody><tfoot><tr><td className="pt-3 font-bold text-card-foreground">Total</td>{total.slice(1).map((value) => <td key={value} className="pt-3 text-right font-bold text-card-foreground">{value}</td>)}</tr></tfoot></table></div>;
}

export function DashboardView({ initialData, settings }: { initialData: DashboardData; settings: AppSettingsData }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(initialData.period);

  async function refresh() {
    setRefreshing(true);
    try { const next = await apiFetch<DashboardData>("/api/dashboard"); setData(next); setPeriod(next.period); }
    catch (error) { captureClientError(error, { action: "refresh_dashboard" }); }
    finally { setRefreshing(false); }
  }

  const categoryRows = data.expenseCategories.map((entry) => [entry.label, money(entry.amount), `${Math.round(entry.percentage)}%`]);
  const incomeRows = data.incomeSources.map((entry) => [entry.label, money(entry.amount), `${Math.round(entry.percentage)}%`]);
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{settings.dashboardTitle}</p>{data.source === "demo" && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">Modo demo</span>}</div><h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Tu dinero, más claro.</h1><p className="mt-1 text-sm text-muted-foreground">Una lectura rápida de tu salud financiera.</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground"><CalendarDays className="size-4 text-primary" aria-hidden="true" /><select value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent outline-none"><option>{period}</option></select></label><button type="button" onClick={refresh} disabled={refreshing} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />Actualizar</button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Ingresos totales" value={money(data.metrics.totalIncome)} helper="En el periodo seleccionado" icon={<ArrowUpRight className="size-4" aria-hidden="true" />} tone="blue" /><MetricCard label="Gastos totales" value={money(data.metrics.totalExpenses)} helper="En el periodo seleccionado" icon={<ArrowDownRight className="size-4" aria-hidden="true" />} tone="red" /><MetricCard label="Ahorro" value={money(data.metrics.savings)} helper="Ingresos menos gastos" icon={<CircleDollarSign className="size-4" aria-hidden="true" />} tone="green" /><MetricCard label="Ahorro %" value={`${data.metrics.savingsRate.toFixed(1)}%`} helper="De tus ingresos totales" icon={<TrendingUp className="size-4" aria-hidden="true" />} tone="purple" /></div>
    <div className="grid gap-4 xl:grid-cols-2"><Card title="Distribución de gastos"><Donut data={data.expenseCategories} /></Card><Card title="Tendencia mensual"><TrendChart data={data.monthlyTrend} /></Card></div>
    <div className="grid gap-4 xl:grid-cols-2"><Card title="Ingresos por fuente"><SimpleTable headers={["Fuente", "Monto", "%"]} rows={incomeRows} total={["Total", money(data.metrics.totalIncome), "100%"]} /></Card><Card title="Gastos por categoría"><SimpleTable headers={["Categoría", "Monto", "%"]} rows={categoryRows} total={["Total", money(data.metrics.totalExpenses), "100%"]} /></Card></div>
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-bold text-card-foreground">Fuente de datos: {data.source === "notion" ? "Notion conectado" : "Datos de demostración"}</p><p className="mt-1 text-xs text-muted-foreground">Última actualización: {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.updatedAt))}</p></div><button type="button" className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"><Download className="size-4" aria-hidden="true" />Exportar resumen</button></div>
  </div>;
}

