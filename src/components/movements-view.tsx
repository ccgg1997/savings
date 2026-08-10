"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FilterX,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import type {
  TransactionFormOptions,
  TransactionInput,
  TransactionOptionCapabilities,
  TransactionOptionCapability,
  TransactionOptionField,
  TransactionRecord,
  TransactionsData,
  TransactionType,
} from "@/lib/notion";
import { apiFetch } from "@/lib/api";
import { captureClientError, notifySuccess } from "@/lib/client-errors";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { TransactionDescriptionPopover } from "@/components/transaction-description-popover";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

type EditorState = { mode: "create"; type: TransactionType } | { mode: "edit"; transaction: TransactionRecord };
type TransactionDraft = Omit<TransactionInput, "amount"> & { amount: string };
type OptionMutationResult = { options: string[]; moved: number };

function money(value: number) {
  return currency.format(value);
}

function formatShortDate(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return `${day}-${month}-${year.slice(-2)}`;
}

function getMonthOptions(transactions: TransactionRecord[]) {
  return [...new Set(transactions.map((item) => item.date.slice(0, 7)).filter(Boolean))].sort().reverse();
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return `${monthNames[Math.max(0, Number(month) - 1)] ?? value} ${year}`;
}

function emptyDraft(type: TransactionType): TransactionDraft {
  return {
    type,
    description: "",
    date: today(),
    amount: "",
    account: "",
    category: "",
    division: "",
  };
}

function draftFromTransaction(transaction: TransactionRecord): TransactionDraft {
  return { ...transaction, amount: String(transaction.amount) };
}

export function MovementsView({ initialData, initialDivision, initialCategory, initialType }: { initialData: TransactionsData; initialDivision?: string; initialCategory?: string; initialType?: TransactionType }) {
  const [transactions, setTransactions] = useState(initialData.transactions);
  const [category, setCategory] = useState(initialCategory && initialData.categories.includes(initialCategory) ? initialCategory : "all");
  const [division, setDivision] = useState(initialDivision && initialData.divisions.includes(initialDivision) ? initialDivision : "all");
  const [type, setType] = useState<"all" | TransactionType>(initialType ?? "all");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(() => getMonthOptions(initialData.transactions)[0] ?? "all");
  const [formOptions, setFormOptions] = useState(initialData.formOptions);
  const [optionCapabilities, setOptionCapabilities] = useState(initialData.optionCapabilities);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<TransactionRecord | null>(null);
  const [managingOptions, setManagingOptions] = useState(false);

  const categories = useMemo(() => [...new Set(transactions.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "es")), [transactions]);
  const divisions = useMemo(() => [...new Set(transactions.map((item) => item.division))].sort((a, b) => a.localeCompare(b, "es")), [transactions]);
  const months = useMemo(() => getMonthOptions(transactions), [transactions]);
  const latestMonth = months[0] ?? "all";
  const monthTransactions = useMemo(() => transactions.filter((item) => month === "all" || item.date.startsWith(`${month}-`)), [transactions, month]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return monthTransactions.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (category !== "all" && item.category !== category) return false;
      if (division !== "all" && item.division !== division) return false;
      if (query && ![item.description, item.account, item.category, item.division].some((value) => value.toLocaleLowerCase("es").includes(query))) return false;
      return true;
    });
  }, [monthTransactions, type, category, division, search]);

  const totals = useMemo(() => {
    const income = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, balance: income - expense };
  }, [monthTransactions]);

  const filtersActive = month !== latestMonth || category !== "all" || division !== "all" || type !== "all" || search.length > 0;
  const writable = initialData.source === "notion";

  function clearFilters() {
    setMonth(latestMonth);
    setCategory("all");
    setDivision("all");
    setType("all");
    setSearch("");
  }

  function handleSaved(transaction: TransactionRecord) {
    setTransactions((current) => {
      const exists = current.some((item) => item.id === transaction.id);
      const next = exists ? current.map((item) => item.id === transaction.id ? transaction : item) : [transaction, ...current];
      return next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    setEditor(null);
  }

  function handleDeleted(id: string) {
    setTransactions((current) => current.filter((item) => item.id !== id));
    setDeleting(null);
  }

  async function refreshFromNotion() {
    const data = await apiFetch<TransactionsData>("/api/transactions");
    setTransactions(data.transactions);
    setFormOptions(data.formOptions);
    setOptionCapabilities(data.optionCapabilities);
    return data.updatedAt;
  }

  function handleOptionsChanged(type: TransactionType, field: TransactionOptionField, options: string[], currentName?: string, replacement?: string) {
    const optionKey = field === "category" ? "categories" : "divisions";
    setFormOptions((current) => ({
      ...current,
      [type]: { ...current[type], [optionKey]: options },
    }));
    if (!currentName || !replacement) return;
    setTransactions((current) => current.map((transaction) => {
      if (transaction.type !== type || transaction[field] !== currentName) return transaction;
      return { ...transaction, [field]: replacement };
    }));
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground"><WalletCards className="size-3" aria-hidden="true" />Centro de movimientos</span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${writable ? "text-emerald-700" : "text-amber-700"}`}><span className={`size-1.5 rounded-full ${writable ? "bg-emerald-500" : "bg-amber-500"}`} />{writable ? "Notion conectado" : "Datos de demostración"}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">Movimientos</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">Consulta, filtra y administra los ingresos y gastos sincronizados con tus bases de Notion.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setManagingOptions(true)} disabled={!writable} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted disabled:pointer-events-none disabled:opacity-45"><Settings2 className="size-4" aria-hidden="true" />Divisiones y categorías</button>
          <button type="button" onClick={() => setEditor({ mode: "create", type: "income" })} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100"><ArrowDownLeft className="size-4" aria-hidden="true" />Nuevo ingreso</button>
          <button type="button" onClick={() => setEditor({ mode: "create", type: "expense" })} className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface-dark px-4 text-xs font-bold text-surface-dark-foreground shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800"><Plus className="size-4" aria-hidden="true" />Nuevo gasto</button>
        </div>
      </header>

      <section className="hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de movimientos">
        <SummaryCard icon={ReceiptText} label="Movimientos" value={String(monthTransactions.length)} helper="registros del periodo" tone="neutral" />
        <SummaryCard icon={ArrowDownLeft} label="Ingresos" value={money(totals.income)} helper="total acumulado" tone="income" />
        <SummaryCard icon={ArrowUpRight} label="Gastos" value={money(totals.expense)} helper="total acumulado" tone="expense" />
        <SummaryCard icon={CircleDollarSign} label="Balance" value={money(totals.balance)} helper="ingresos menos gastos" tone="featured" />
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border/90 bg-card shadow-[0_10px_35px_rgba(25,48,40,0.045)]">
        <div className="border-b border-border/80 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-base font-bold tracking-tight text-card-foreground">Todos los movimientos</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Filtra por mes, división o categoría.</p>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 xl:max-w-5xl xl:grid-cols-[1.2fr_0.9fr_1fr_1fr_auto]">
              <label className="relative col-span-2 block xl:col-span-1">
                <span className="sr-only">Buscar movimientos</span>
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar movimiento…" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20" />
              </label>
              <MonthFilter value={month} onChange={setMonth} options={months} />
              <FilterSelect label="División" value={division} onChange={setDivision} options={divisions} />
              <FilterSelect label="Categoría" value={category} onChange={setCategory} options={categories} />
              <button type="button" onClick={clearFilters} disabled={!filtersActive} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"><FilterX className="size-4" aria-hidden="true" /><span className="sm:hidden xl:inline">Limpiar</span></button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "income", "expense"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setType(value)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition ${type === value ? "bg-surface-dark text-surface-dark-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{value === "all" ? "Todos" : value === "income" ? "Ingresos" : "Gastos"}</button>
            ))}
            <span className="ml-auto text-[10px] font-semibold text-muted-foreground">{filtered.length} de {monthTransactions.length}</span>
          </div>
        </div>

        <MovementList rows={filtered} writable={writable} onEdit={(transaction) => setEditor({ mode: "edit", transaction })} onDelete={setDeleting} />
      </section>

      {editor ? <TransactionEditor state={editor} formOptions={formOptions} writable={writable} onClose={() => setEditor(null)} onSaved={handleSaved} /> : null}
      {deleting ? <DeleteTransactionDialog transaction={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} /> : null}
      {managingOptions ? <OptionsManager formOptions={formOptions} capabilities={optionCapabilities} transactions={transactions} updatedAt={initialData.updatedAt} onClose={() => setManagingOptions(false)} onOptionsChanged={handleOptionsChanged} onRefresh={refreshFromNotion} /> : null}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, helper, tone }: { icon: typeof ReceiptText; label: string; value: string; helper: string; tone: "neutral" | "income" | "expense" | "featured" }) {
  const styles = {
    neutral: "border-border bg-card text-card-foreground",
    income: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    expense: "border-orange-200 bg-orange-50/70 text-orange-950",
    featured: "border-slate-700 bg-surface-dark text-surface-dark-foreground",
  };
  const icons = {
    neutral: "bg-muted text-foreground",
    income: "bg-emerald-500/12 text-emerald-700",
    expense: "bg-orange-500/12 text-orange-700",
    featured: "bg-white/10 text-emerald-300",
  };
  return <article className={`rounded-2xl border p-5 shadow-[0_10px_30px_rgba(25,48,40,0.045)] ${styles[tone]}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-semibold ${tone === "featured" ? "text-white/45" : "text-muted-foreground"}`}>{label}</p><p className="mt-2 truncate text-xl font-bold tracking-tight">{value}</p></div><span className={`flex size-10 items-center justify-center rounded-xl ${icons[tone]}`}><Icon className="size-5" aria-hidden="true" /></span></div><p className={`mt-4 text-[9px] ${tone === "featured" ? "text-white/35" : "text-muted-foreground"}`}>{helper}</p></article>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="relative block"><span className="pointer-events-none absolute left-3 top-1.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 pb-1 pt-3 text-[11px] font-bold text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"><option value="all">Todas</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /></label>;
}

function MonthFilter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="relative block"><span className="pointer-events-none absolute left-3 top-1.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Mes</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 pb-1 pt-3 text-[11px] font-bold capitalize text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"><option value="all">Todos los meses</option>{options.map((option) => <option key={option} value={option}>{formatMonth(option)}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /></label>;
}

function MovementList({ rows, writable, onEdit, onDelete }: { rows: TransactionRecord[]; writable: boolean; onEdit: (row: TransactionRecord) => void; onDelete: (row: TransactionRecord) => void }) {
  if (!rows.length) return <div className="p-10 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Search className="size-5" aria-hidden="true" /></span><p className="mt-3 text-sm font-bold text-card-foreground">No encontramos movimientos</p><p className="mt-1 text-xs text-muted-foreground">Prueba otra combinación de mes, división y categoría.</p></div>;
  return (
    <div className="border-t border-border/70">
      <div className="divide-y divide-border/70 md:hidden" aria-label="Lista de movimientos">
        {rows.map((row) => (
          <article key={row.id} className="p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-card-foreground">{row.description}</p>
                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${row.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{row.type === "income" ? "Ingreso" : "Gasto"}</span>
                  <span className="max-w-[125px] truncate rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-secondary-foreground">{row.division}</span>
                  <span className="max-w-[125px] truncate rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">{row.category}</span>
                </div>
              </div>
              <p className={`shrink-0 whitespace-nowrap text-sm font-bold tabular-nums ${row.type === "income" ? "text-emerald-700" : "text-card-foreground"}`}>{row.type === "income" ? "+" : "−"}{money(row.amount)}</p>
            </div>
            <div className="mt-3 flex min-w-0 items-end justify-between gap-3">
              <dl className="grid min-w-0 flex-1 grid-cols-2 gap-3 text-[10px]">
                <div className="min-w-0"><dt className="font-semibold text-muted-foreground">Fecha</dt><dd className="mt-0.5 truncate font-bold tabular-nums text-card-foreground">{formatShortDate(row.date)}</dd></div>
                <div className="min-w-0"><dt className="font-semibold text-muted-foreground">Cuenta</dt><dd className="mt-0.5 truncate font-bold text-card-foreground">{row.account}</dd></div>
              </dl>
              <div className="flex shrink-0 gap-1">
                <button type="button" disabled={!writable} onClick={() => onEdit(row)} className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-30" aria-label={`Editar ${row.description}`}><Pencil className="size-3.5" aria-hidden="true" /></button>
                <button type="button" disabled={!writable} onClick={() => onDelete(row)} className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-30" aria-label={`Eliminar ${row.description}`}><Trash2 className="size-3.5" aria-hidden="true" /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="scrollbar-subtle hidden overflow-x-auto overscroll-x-contain md:block" tabIndex={0} aria-label="Tabla completa de movimientos; desplázate horizontalmente para ver todas las columnas">
        <table className="w-full min-w-[650px] text-left text-[11px]">
          <thead><tr className="border-b border-border bg-muted/45 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground"><th className="w-[190px] px-4 py-3 sm:px-5">Movimiento</th><th className="w-[130px] px-3 py-3 text-right">Monto</th><th className="w-[95px] px-3 py-3">Fecha</th><th className="w-[120px] px-3 py-3">Cuenta</th><th className="w-[105px] px-4 py-3 text-right sm:px-5">Acciones</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="group border-b border-border/60 last:border-0 hover:bg-muted/25"><td className="px-4 py-3 sm:px-5"><MovementIdentity row={row} /></td><td className={`whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums ${row.type === "income" ? "text-emerald-700" : "text-card-foreground"}`}>{row.type === "income" ? "+" : "−"}{money(row.amount)}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">{formatShortDate(row.date)}</td><td className="px-3 py-3"><span className="inline-flex max-w-[110px] truncate rounded-full border border-border bg-card px-2.5 py-1 font-semibold text-muted-foreground">{row.account}</span></td><td className="px-4 py-3 sm:px-5"><div className="flex justify-end gap-1"><button type="button" disabled={!writable} onClick={() => onEdit(row)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-30" title="Editar movimiento"><Pencil className="size-3.5" aria-hidden="true" /><span className="sr-only">Editar</span></button><button type="button" disabled={!writable} onClick={() => onDelete(row)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-30" title="Eliminar movimiento"><Trash2 className="size-3.5" aria-hidden="true" /><span className="sr-only">Eliminar</span></button></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function MovementIdentity({ row }: { row: TransactionRecord }) {
  return <div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5"><p className="truncate font-bold text-card-foreground">{row.description}</p><TransactionDescriptionPopover description={row.description} /></div><div className="mt-1 flex min-w-0 items-center gap-1.5"><span className="shrink-0 text-[9px] font-semibold text-muted-foreground">{row.type === "income" ? "Ingreso" : "Gasto"}</span><span className="max-w-[105px] truncate rounded-full bg-secondary px-1.5 py-0.5 text-[8px] font-bold text-secondary-foreground">{row.division}</span><span className="max-w-[105px] truncate rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground">{row.category}</span></div></div>;
}

function TransactionEditor({ state, formOptions, writable, onClose, onSaved }: { state: EditorState; formOptions: Record<TransactionType, TransactionFormOptions>; writable: boolean; onClose: () => void; onSaved: (transaction: TransactionRecord) => void }) {
  const existing = state.mode === "edit" ? state.transaction : null;
  const [draft, setDraft] = useState<TransactionDraft>(state.mode === "edit" ? draftFromTransaction(state.transaction) : emptyDraft(state.type));
  const [saving, setSaving] = useState(false);
  const activeOptions = formOptions[draft.type];
  const optionsReady = activeOptions.accounts.length > 0 && activeOptions.categories.length > 0 && activeOptions.divisions.length > 0;
  useBodyScrollLock(true);

  function changeType(nextType: TransactionType) {
    const nextOptions = formOptions[nextType];
    setDraft((current) => ({
      ...emptyDraft(nextType),
      description: current.description,
      amount: current.amount,
      date: current.date,
      account: nextOptions.accounts.includes(current.account) ? current.account : "",
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writable) return;
    setSaving(true);
    try {
      const input: TransactionInput = { ...draft, amount: Number(draft.amount) };
      const response = existing
        ? await apiFetch<{ transaction: TransactionRecord }>(`/api/transactions/${existing.id}`, { method: "PATCH", body: JSON.stringify(input) })
        : await apiFetch<{ transaction: TransactionRecord }>("/api/transactions", { method: "POST", body: JSON.stringify(input) });
      onSaved(response.transaction);
      notifySuccess(existing ? "Movimiento actualizado en Notion." : `${draft.type === "income" ? "Ingreso" : "Gasto"} agregado a Notion.`);
    } catch (error) {
      captureClientError(error, { action: existing ? "update_transaction" : "create_transaction", transactionId: existing?.id });
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-55";
  const selectClass = `${fieldClass} appearance-none pr-9`;
  return <div className="fixed inset-0 z-50 flex items-stretch overflow-hidden overscroll-none bg-slate-950/55 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="transaction-editor-title" className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-card shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-3xl sm:border sm:border-border"><div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-card px-5 py-5 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Sincronización con Notion</p><h2 id="transaction-editor-title" className="mt-1 text-xl font-bold tracking-tight text-card-foreground">{existing ? "Editar movimiento" : draft.type === "income" ? "Nuevo ingreso" : "Nuevo gasto"}</h2></div><button type="button" onClick={onClose} disabled={saving} className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"><X className="size-4" aria-hidden="true" /><span className="sr-only">Cerrar</span></button></div><form onSubmit={submit} className="scrollbar-subtle min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6"><fieldset disabled={Boolean(existing)}><legend className="text-xs font-bold text-card-foreground">Tipo de movimiento</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => changeType("income")} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${draft.type === "income" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border text-muted-foreground hover:bg-muted"}`}><ArrowDownLeft className="size-4" aria-hidden="true" />Ingreso</button><button type="button" onClick={() => changeType("expense")} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${draft.type === "expense" ? "border-orange-300 bg-orange-50 text-orange-700" : "border-border text-muted-foreground hover:bg-muted"}`}><ArrowUpRight className="size-4" aria-hidden="true" />Gasto</button></div></fieldset><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold text-card-foreground">Descripción</span><input required minLength={2} maxLength={160} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={fieldClass} placeholder="Ej. Mercado semanal" /></label><label className="space-y-1.5"><span className="text-xs font-bold text-card-foreground">Monto</span><input required type="number" min="1" step="any" inputMode="decimal" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} className={fieldClass} placeholder="0" /></label><label className="space-y-1.5"><span className="text-xs font-bold text-card-foreground">Fecha</span><input required type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className={fieldClass} /></label><NotionSelect label="División" value={draft.division} options={activeOptions.divisions} onChange={(value) => setDraft({ ...draft, division: value })} className={selectClass} /><NotionSelect label="Categoría" value={draft.category} options={activeOptions.categories} onChange={(value) => setDraft({ ...draft, category: value })} className={selectClass} /><NotionSelect label="Cuenta" value={draft.account} options={activeOptions.accounts} onChange={(value) => setDraft({ ...draft, account: value })} className={selectClass} fullWidth /></div>{!writable ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Conecta las bases de ingresos y gastos de Notion para guardar movimientos reales.</div> : !optionsReady ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Agrega opciones o registros para División, Categoría y Cuenta en la base de {draft.type === "income" ? "ingresos" : "gastos"} de Notion.</div> : <div className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-[11px] leading-5 text-secondary-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Las opciones se cargaron desde Notion. El movimiento se guardará en la base de {draft.type === "income" ? "ingresos" : "gastos"}.</div>}<div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50">Cancelar</button><button type="submit" disabled={saving || !writable || !optionsReady} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-surface-dark px-5 text-xs font-bold text-surface-dark-foreground transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{saving ? "Guardando…" : !writable ? "Notion no conectado" : !optionsReady ? "Faltan opciones en Notion" : existing ? "Guardar cambios" : "Agregar movimiento"}</button></div></form></section></div>;
}

function NotionSelect({ label, value, options, onChange, className, fullWidth = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; className: string; fullWidth?: boolean }) {
  const available = value && !options.includes(value) ? [value, ...options] : options;
  return <label className={`relative space-y-1.5 ${fullWidth ? "sm:col-span-2" : ""}`}><span className="text-xs font-bold text-card-foreground">{label}</span><span className="relative block"><select required value={value} onChange={(event) => onChange(event.target.value)} disabled={available.length === 0} className={className}><option value="" disabled>{available.length ? `Selecciona ${label.toLocaleLowerCase("es")}` : `Sin opciones de ${label.toLocaleLowerCase("es")}`}</option>{available.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /></span></label>;
}

function OptionsManager({ formOptions, capabilities, transactions, updatedAt, onClose, onOptionsChanged, onRefresh }: {
  formOptions: Record<TransactionType, TransactionFormOptions>;
  capabilities: TransactionOptionCapabilities;
  transactions: TransactionRecord[];
  updatedAt: string;
  onClose: () => void;
  onOptionsChanged: (type: TransactionType, field: TransactionOptionField, options: string[], currentName?: string, replacement?: string) => void;
  onRefresh: () => Promise<string>;
}) {
  const [activeType, setActiveType] = useState<TransactionType>("expense");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(updatedAt);
  useBodyScrollLock(true);

  async function synchronize() {
    setSyncing(true);
    try {
      const nextUpdatedAt = await onRefresh();
      setLastSync(nextUpdatedAt);
      notifySuccess("Opciones actualizadas desde Notion.");
    } catch (error) {
      captureClientError(error, { action: "refresh_transaction_options" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch overflow-hidden overscroll-none bg-slate-950/55 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="options-manager-title" className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-card shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-3xl sm:border sm:border-border">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Opciones sincronizadas</p>
            <h2 id="options-manager-title" className="mt-1 text-xl font-bold tracking-tight text-card-foreground">Divisiones y categorías</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Cada cambio se guarda directamente en la base de Notion seleccionada.</p>
          </div>
          <button type="button" onClick={onClose} disabled={syncing} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"><X className="size-4" aria-hidden="true" /><span className="sr-only">Cerrar</span></button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1 sm:w-72">
              {(["income", "expense"] as const).map((type) => (
                <button key={type} type="button" onClick={() => setActiveType(type)} className={`h-9 rounded-lg text-xs font-bold transition ${activeType === type ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {type === "income" ? "Ingresos" : "Gastos"}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <p className="text-[10px] text-muted-foreground">Última sincronización: {new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(new Date(lastSync))}</p>
              <button type="button" onClick={synchronize} disabled={syncing} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[10px] font-bold text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"><RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />{syncing ? "Sincronizando…" : "Sincronizar"}</button>
            </div>
          </div>

          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
            <div className="mb-5 rounded-xl bg-secondary p-3 text-[11px] leading-5 text-secondary-foreground">
              Estás administrando las opciones de <strong>{activeType === "income" ? "Ingresos" : "Gastos"}</strong>. Las listas de la otra base no se modificarán.
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <ManagedOptionSection
                key={`${activeType}-division`}
                type={activeType}
                field="division"
                options={formOptions[activeType].divisions}
                capability={capabilities[activeType].division}
                transactions={transactions}
                onChanged={(options, currentName, replacement) => onOptionsChanged(activeType, "division", options, currentName, replacement)}
              />
              <ManagedOptionSection
                key={`${activeType}-category`}
                type={activeType}
                field="category"
                options={formOptions[activeType].categories}
                capability={capabilities[activeType].category}
                transactions={transactions}
                onChanged={(options, currentName, replacement) => onOptionsChanged(activeType, "category", options, currentName, replacement)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ManagedOptionSection({ type, field, options, capability, transactions, onChanged }: {
  type: TransactionType;
  field: TransactionOptionField;
  options: string[];
  capability: TransactionOptionCapability;
  transactions: TransactionRecord[];
  onChanged: (options: string[], currentName?: string, replacement?: string) => void;
}) {
  const label = field === "division" ? "Divisiones" : "Categorías";
  const singular = field === "division" ? "división" : "categoría";
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nextName, setNextName] = useState("");
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [replacement, setReplacement] = useState("");
  const [busy, setBusy] = useState<"create" | "rename" | "delete" | null>(null);
  const fieldClass = "h-10 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-55";
  const usageCount = deletingName ? transactions.filter((transaction) => transaction.type === type && transaction[field] === deletingName).length : 0;
  const replacements = deletingName ? options.filter((option) => option !== deletingName) : [];

  async function createOption(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    try {
      const result = await apiFetch<OptionMutationResult>("/api/transaction-options", { method: "POST", body: JSON.stringify({ type, field, name: newName }) });
      onChanged(result.options);
      setNewName("");
      notifySuccess(`${singular[0].toLocaleUpperCase("es")}${singular.slice(1)} creada en Notion.`);
    } catch (error) {
      captureClientError(error, { action: "create_transaction_option", type, field });
    } finally {
      setBusy(null);
    }
  }

  async function renameOption(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingName) return;
    setBusy("rename");
    try {
      const result = await apiFetch<OptionMutationResult>("/api/transaction-options", { method: "PATCH", body: JSON.stringify({ type, field, currentName: editingName, nextName }) });
      onChanged(result.options, editingName, nextName);
      setEditingName(null);
      setNextName("");
      notifySuccess(result.moved ? `Opción renombrada y ${result.moved} movimiento${result.moved === 1 ? "" : "s"} actualizado${result.moved === 1 ? "" : "s"}.` : "Opción renombrada en Notion.");
    } catch (error) {
      captureClientError(error, { action: "rename_transaction_option", type, field, currentName: editingName });
    } finally {
      setBusy(null);
    }
  }

  async function deleteOption() {
    if (!deletingName) return;
    setBusy("delete");
    try {
      const result = await apiFetch<OptionMutationResult>("/api/transaction-options", { method: "DELETE", body: JSON.stringify({ type, field, name: deletingName, ...(replacement ? { replacement } : {}) }) });
      onChanged(result.options, deletingName, replacement || undefined);
      setDeletingName(null);
      setReplacement("");
      notifySuccess(result.moved ? `Opción eliminada y ${result.moved} movimiento${result.moved === 1 ? "" : "s"} reasignado${result.moved === 1 ? "" : "s"}.` : "Opción eliminada de Notion.");
    } catch (error) {
      captureClientError(error, { action: "delete_transaction_option", type, field, name: deletingName });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby={`${type}-${field}-title`}>
      <div>
        <h3 id={`${type}-${field}-title`} className="text-sm font-bold text-card-foreground">{label}</h3>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
          {capability.propertyName ? `Propiedad “${capability.propertyName}” en Notion.` : "La propiedad se creará como Selección en Notion."}
        </p>
      </div>

      {!capability.editable ? (
        <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
          Esta propiedad es de tipo <strong>{capability.propertyType ?? "no compatible"}</strong>. Cámbiala en Notion a Selección o Selección múltiple para habilitar el CRUD.
        </div>
      ) : (
        <form onSubmit={createOption} className="mt-4 flex gap-2">
          <label className="min-w-0 flex-1"><span className="sr-only">Nueva {singular}</span><input required maxLength={100} value={newName} onChange={(event) => setNewName(event.target.value)} disabled={Boolean(busy)} className={fieldClass} placeholder={`Nueva ${singular}`} /></label>
          <button type="submit" disabled={Boolean(busy) || !newName.trim()} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-surface-dark px-3 text-[10px] font-bold text-surface-dark-foreground transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-45">{busy === "create" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}Agregar</button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {options.map((option) => {
          const isEditing = editingName === option;
          const isDeleting = deletingName === option;
          return (
            <div key={option} className="overflow-hidden rounded-xl border border-border bg-background">
              {isEditing ? (
                <form onSubmit={renameOption} className="flex gap-2 p-2">
                  <label className="min-w-0 flex-1"><span className="sr-only">Nuevo nombre para {option}</span><input required autoFocus maxLength={100} value={nextName} onChange={(event) => setNextName(event.target.value)} disabled={Boolean(busy)} className={fieldClass} /></label>
                  <button type="submit" disabled={Boolean(busy) || !nextName.trim() || nextName.trim() === option} className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-45" aria-label={`Guardar nuevo nombre de ${option}`}>{busy === "rename" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}</button>
                  <button type="button" onClick={() => { setEditingName(null); setNextName(""); }} disabled={Boolean(busy)} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-45" aria-label="Cancelar edición"><X className="size-4" aria-hidden="true" /></button>
                </form>
              ) : (
                <div className="flex min-w-0 items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-card-foreground">{option}</span>
                  <button type="button" onClick={() => { setEditingName(option); setNextName(option); setDeletingName(null); setReplacement(""); }} disabled={!capability.editable || Boolean(busy)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35" aria-label={`Renombrar ${option}`}><Pencil className="size-3.5" aria-hidden="true" /></button>
                  <button type="button" onClick={() => { setDeletingName(option); setReplacement(""); setEditingName(null); setNextName(""); }} disabled={!capability.editable || Boolean(busy)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-35" aria-label={`Eliminar ${option}`}><Trash2 className="size-3.5" aria-hidden="true" /></button>
                </div>
              )}

              {isDeleting ? (
                <div className="border-t border-border bg-red-50/60 p-3" role="group" aria-label={`Confirmar eliminación de ${option}`}>
                  <p className="text-[11px] font-bold text-red-800">¿Eliminar “{option}”?</p>
                  {usageCount > 0 ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-[10px] leading-4 text-red-700">La usan {usageCount} {usageCount === 1 ? "movimiento" : "movimientos"}. Elige dónde reasignarlos antes de eliminar.</p>
                      <label className="relative block"><span className="sr-only">Opción de reemplazo</span><select required value={replacement} onChange={(event) => setReplacement(event.target.value)} disabled={Boolean(busy)} className={`${fieldClass} appearance-none pr-9`}><option value="" disabled>Selecciona un reemplazo</option>{replacements.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /></label>
                    </div>
                  ) : <p className="mt-1 text-[10px] leading-4 text-red-700">No hay movimientos visibles usando esta opción.</p>}
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => { setDeletingName(null); setReplacement(""); }} disabled={Boolean(busy)} className="h-9 rounded-xl border border-border bg-card px-3 text-[10px] font-bold text-foreground transition hover:bg-muted disabled:opacity-45">Cancelar</button>
                    <button type="button" onClick={deleteOption} disabled={Boolean(busy) || (usageCount > 0 && !replacement) || (usageCount > 0 && replacements.length === 0)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3 text-[10px] font-bold text-white transition hover:bg-red-700 disabled:pointer-events-none disabled:opacity-45">{busy === "delete" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}Eliminar</button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {options.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-center text-[11px] text-muted-foreground">No hay {label.toLocaleLowerCase("es")} en esta base de Notion.</p> : null}
      </div>
    </section>
  );
}

function DeleteTransactionDialog({ transaction, onClose, onDeleted }: { transaction: TransactionRecord; onClose: () => void; onDeleted: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  useBodyScrollLock(true);
  async function confirm() {
    setLoading(true);
    try {
      const response = await apiFetch<{ deletedId: string }>(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      onDeleted(response.deletedId);
      notifySuccess("Movimiento archivado en Notion.");
    } catch (error) {
      captureClientError(error, { action: "delete_transaction", transactionId: transaction.id });
    } finally {
      setLoading(false);
    }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-transaction-title" className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"><span className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 className="size-5" aria-hidden="true" /></span><h2 id="delete-transaction-title" className="mt-4 text-lg font-bold text-card-foreground">¿Eliminar este movimiento?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground"><strong className="text-card-foreground">{transaction.description}</strong> por {money(transaction.amount)} se archivará en Notion y dejará de aparecer en los totales.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={loading} className="h-10 rounded-xl border border-border px-4 text-xs font-bold hover:bg-muted disabled:opacity-50">Cancelar</button><button type="button" onClick={confirm} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">{loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{loading ? "Eliminando…" : "Eliminar"}</button></div></section></div>;
}
